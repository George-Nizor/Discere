import { randomUUID } from "node:crypto";
import type {
  CapabilitiesResponse,
  EssayAssessmentDraft,
  EssayAssessmentResponse,
  EssayStage,
  EssayVersionResponse,
  LessonResponse,
  Question,
  TutorAskResponse,
  TutorIssue,
  TutoringMode,
  TutorProbeResponse,
  TutorStatus,
} from "@discere/contracts";
import {
  EssayAssessmentReplySchema,
  EssayAssessRequestSchema,
  parseEssayAssessmentReply,
  TutorAskRequestSchema,
  TutorReplyDraftSchema,
} from "@discere/contracts";
import {
  buildCompanionPacket,
  type CompanionPacket,
  TutorProviderError,
  type TutorRequest,
} from "@discere/tutor-providers";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  capabilities,
  clearTutorSignInFailure,
  recordTutorSignInFailure,
  signInLikely,
} from "./capabilities.js";
import {
  acceptTutorReply,
  answerBoundaryFor,
  buildEssayAssessmentPayload,
  buildTutorReplyPayload,
  matchCriteria,
  tutorFigureFor,
  type PreviousEssayVersion,
  validateEssayAssessment,
} from "./companion.js";
import type { ContentRepository } from "./content.js";
import type { DiscereStore, EssayAssessmentRow } from "./db/store.js";
import { HttpError } from "./errors.js";
import { createTutorRuntime, type TutorRuntime, tutorProviderHttpError } from "./tutor-provider.js";
import { buildTutorStatus } from "./tutor-status.js";

export interface TutorRouteDependencies {
  content: ContentRepository;
  store: DiscereStore;
  runtime?: TutorRuntime;
}

const EssayParamsSchema = z.object({ essayId: z.string().min(1).max(240) }).strict();
const TUTOR_REPLY_SCHEMA = z.toJSONSchema(TutorReplyDraftSchema);
const EssayVersionParamsSchema = z
  .object({ essayId: z.string().min(1).max(240), version: z.coerce.number().int().positive() })
  .strict();
const ESSAY_ASSESSMENT_SCHEMA = z.toJSONSchema(EssayAssessmentReplySchema);

/** Added to a failed assessment when the provider's error reads as a sign-in fault. */
const SIGN_IN_HINT =
  "The tutor's sign-in has probably expired. Sign in to it again, then ask for the assessment.";

const PACKET_MESSAGE =
  "This provider cannot answer in place. Copy the packet into ChatGPT and import the reply.";

function wordCount(content: string): number {
  const trimmed = content.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function assessmentResponse(
  row: EssayAssessmentRow,
  packet: CompanionPacket | null,
  version: number,
): EssayAssessmentResponse {
  return {
    version,
    essayId: row.essayId,
    status: row.status as EssayAssessmentResponse["status"],
    provider: row.provider as EssayAssessmentResponse["provider"],
    requestId: row.requestId,
    accepted: row.accepted,
    assessment: row.assessmentJson
      ? (JSON.parse(row.assessmentJson) as EssayAssessmentDraft)
      : null,
    issues: JSON.parse(row.issuesJson) as TutorIssue[],
    error:
      row.errorCode && row.errorMessage ? { code: row.errorCode, message: row.errorMessage } : null,
    packet: packet ? { filename: packet.filename, text: packet.text } : null,
    updatedAt: row.updatedAt,
  };
}

export const ASSESSMENT_INTERRUPTED_CODE = "ASSESSMENT_INTERRUPTED";

/**
 * An assessment runs inside the server process, so a row still marked `pending` when the
 * server starts belongs to a run that died with the previous process. Nothing will ever
 * finish it, and the assess route answers a pending row with itself, so the learner could
 * never ask again. Marking it failed lets the next request start a new run.
 */
export function resetInterruptedAssessments(store: DiscereStore): number {
  return store.database
    .prepare(
      "UPDATE essay_assessments SET status = 'failed', accepted = 0, error_code = ?, error_message = ?, updated_at = ? WHERE status = 'pending'",
    )
    .run(
      ASSESSMENT_INTERRUPTED_CODE,
      "Discere stopped before this assessment finished. Ask for it again.",
      new Date().toISOString(),
    ).changes;
}

export async function registerTutorRoutes(
  app: FastifyInstance,
  dependencies: TutorRouteDependencies,
): Promise<void> {
  const { content, store } = dependencies;
  const runtime = dependencies.runtime ?? createTutorRuntime();
  const interrupted = resetInterruptedAssessments(store);
  if (interrupted > 0) {
    app.log.warn(`Marked ${interrupted} interrupted essay assessment(s) as failed.`);
  }
  // A generation outlives its request. The server tracks the work so shutdown waits for it
  // instead of writing to a closed database.
  const running = new Map<string, Promise<void>>();
  const abort = new AbortController();

  app.addHook("onClose", async () => {
    abort.abort();
    await Promise.allSettled([...running.values()]);
  });

  function lessonAndQuestion(lessonId: string): { lesson: LessonResponse; question: Question } {
    const lesson = content.getLesson(lessonId);
    if (!lesson) throw new HttpError(404, "Lesson not found.", "LESSON_NOT_FOUND");
    const question = content.getQuestion(lesson.question.id);
    if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
    return { lesson, question };
  }

  /** The essay stage and the lesson that sets it, found wherever the essay lives. */
  function essayStage(essayId: string): { stage: EssayStage; lesson: LessonResponse } {
    const topic = content.getEssay(essayId);
    const lessonId = topic
      ? content.bundle(topic.courseId)?.lessons.find((item) => item.essayId === essayId)?.id
      : undefined;
    const journey = topic && lessonId ? content.getJourney(topic.courseId, lessonId) : undefined;
    const stage = journey?.stages.find((item) => item.type === "essay" && item.essayId === essayId);
    if (!lessonId || stage?.type !== "essay")
      throw new HttpError(404, "Essay not found.", "ESSAY_NOT_FOUND");
    return { stage, lesson: lessonAndQuestion(lessonId).lesson };
  }

  /** Read-only, so the settings screen can poll it without touching the subscription. */
  app.get("/api/tutor/status", async (): Promise<TutorStatus> => buildTutorStatus(runtime));

  /**
   * Deliberately a live generation: the owner asked for proof the OpenAI link works, and only
   * a real round trip is proof. It runs the same provider, schema and prompt builder as a
   * tutor question, and stops before the acceptance gate — a probe reports whether the link
   * answered, not whether the answer was good enough to show a learner.
   */
  app.post("/api/tutor/probe", async (): Promise<TutorProbeResponse> => {
    if (!runtime.provider.generatesInProcess) {
      return {
        ok: false,
        durationMs: 0,
        message: `The ${runtime.id} provider answers by copy and paste, so there is no link to test.`,
      };
    }
    const lesson = content.currentLesson();
    const probeRequest: TutorRequest<unknown> = {
      operation: "tutor_reply",
      requestId: randomUUID(),
      payload: buildTutorReplyPayload(
        lesson,
        { question: "Reply with one short sentence confirming you received this.", mode: "coach" },
        undefined,
      ),
    };
    const startedAt = Date.now();
    try {
      await runtime.provider.generate(probeRequest, {
        outputSchema: TUTOR_REPLY_SCHEMA,
        parsePayload: (value) => TutorReplyDraftSchema.parse(value),
        timeoutMs: runtime.askTimeoutMs,
        signal: abort.signal,
      });
    } catch (error) {
      const duration = Date.now() - startedAt;
      if (error instanceof TutorProviderError) {
        const http = tutorProviderHttpError(error);
        return {
          ok: false,
          durationMs: duration,
          message: http.detail ? `${error.message} ${http.detail}` : error.message,
        };
      }
      throw error;
    }
    return {
      ok: true,
      durationMs: Date.now() - startedAt,
      message: `${runtime.provider.label} answered.`,
    };
  });

  /**
   * What this installation can generate, and what still works when it cannot.
   *
   * Separate from `/api/tutor/status`, which reports the health of one provider in detail for the
   * settings screen. This answers a different question that several parts of the interface ask
   * before they draw a control: is this feature here at all.
   */
  app.get(
    "/api/capabilities",
    async (): Promise<CapabilitiesResponse> => ({
      capabilities: capabilities(runtime.id),
    }),
  );

  app.post("/api/tutor/ask", async (request): Promise<TutorAskResponse> => {
    const body = TutorAskRequestSchema.parse(request.body);
    if (body.mode === "exam") {
      throw new HttpError(403, "ChatGPT assistance is unavailable in Exam mode.", "EXAM_GUARDRAIL");
    }
    let { lesson, question } = lessonAndQuestion(body.lessonId);
    ({ lesson, question } = genericTutorContext(
      content,
      store,
      lesson,
      body.mode,
      body.questionId,
      body.attemptId,
    ));
    const focusConceptIds = body.conceptIds;
    const requestId = randomUUID();
    const tutorRequest: TutorRequest<unknown> = {
      operation: "tutor_reply",
      requestId,
      payload: buildTutorReplyPayload(
        lesson,
        { question: body.question, mode: body.mode },
        focusConceptIds,
        body.intent === "show" ? { figure: tutorFigureFor(lesson, question.id) } : undefined,
      ),
    };

    if (!runtime.provider.generatesInProcess) {
      const packet = buildCompanionPacket(tutorRequest);
      return {
        status: "packet_required",
        provider: runtime.id,
        operation: "tutor_reply",
        requestId,
        packet: { filename: packet.filename, text: packet.text },
        message: PACKET_MESSAGE,
      };
    }

    const answerBoundary = answerBoundaryFor(question, body.mode);
    let generated: Awaited<ReturnType<typeof runtime.provider.generate>>;
    try {
      generated = await runtime.provider.generate(tutorRequest, {
        outputSchema: TUTOR_REPLY_SCHEMA,
        parsePayload: (value) => TutorReplyDraftSchema.parse(value),
        lintTargets: [
          {
            path: "answer",
            context: "feedback",
            ...(answerBoundary === undefined ? {} : { hiddenAnswer: answerBoundary }),
          },
          {
            path: "followUpQuestion",
            context: "question",
            ...(answerBoundary === undefined ? {} : { hiddenAnswer: answerBoundary }),
          },
          // Each walkthrough step is learner-facing prose under the same answer boundary. A
          // step that is absent reads as nothing and is skipped.
          ...Array.from({ length: 8 }, (_, index) => ({
            path: `walkthrough.${index}.text`,
            context: "feedback" as const,
            ...(answerBoundary === undefined ? {} : { hiddenAnswer: answerBoundary }),
          })),
        ],
        timeoutMs: runtime.askTimeoutMs,
        ...(body.sessionId === undefined ? {} : { sessionId: body.sessionId }),
        signal: abort.signal,
      });
    } catch (error) {
      if (error instanceof TutorProviderError && signInLikely(error))
        recordTutorSignInFailure(runtime.id);
      if (error instanceof TutorProviderError) throw tutorProviderHttpError(error);
      throw error;
    }

    // The generated reply re-enters through the same gate the pasted companion reply uses.
    const acceptance = acceptTutorReply({
      envelope: {
        protocolVersion: generated.protocolVersion,
        operation: generated.operation,
        requestId: generated.requestId,
        generatedAt: generated.generatedAt,
        payload: generated.payload,
      },
      expectedRequestId: requestId,
      mode: body.mode,
      lesson,
      question,
      store,
      attemptId: body.attemptId,
    });
    return {
      status: "answered",
      provider: runtime.id,
      operation: "tutor_reply",
      requestId: acceptance.requestId,
      accepted: acceptance.accepted,
      issues: acceptance.issues,
      reply: acceptance.reply,
      sessionId: generated.sessionId ?? null,
    };
  });

  function startAssessment(input: {
    essayId: string;
    requestId: string;
    tutorRequest: TutorRequest<unknown>;
    lesson: LessonResponse;
    successCriteria: readonly string[];
  }): void {
    const job = (async () => {
      try {
        const generated = await runtime.provider.generate(input.tutorRequest, {
          systemPrompt: "assessor",
          outputSchema: ESSAY_ASSESSMENT_SCHEMA,
          // Lenient about the per-criterion results: a reply without usable ones still carries
          // a verdict worth showing.
          parsePayload: (value) => parseEssayAssessmentReply(value),
          // A writing task has no answer to withhold. The lesson's first question does, but an
          // assessment of a thesis has to be free to say "thesis". The evidence for a criterion
          // is mostly the learner's own words, so it is not held to the tutor's style rules.
          lintTargets: [
            { path: "summary", context: "assessment" },
            { path: "nextStep", context: "hint" },
          ],
          timeoutMs: runtime.assessTimeoutMs,
          signal: abort.signal,
        });
        clearTutorSignInFailure();
        const { criteria: replied, ...verdict } = parseEssayAssessmentReply(generated.payload);
        const criteria = matchCriteria(replied, input.successCriteria);
        const assessment: EssayAssessmentDraft = criteria ? { ...verdict, criteria } : verdict;
        const issues = validateEssayAssessment({ assessment, lesson: input.lesson });
        if (!criteria && input.successCriteria.length > 0)
          issues.push({
            field: "criteria",
            code: "CRITERIA_NOT_MATCHED",
            severity: "warning",
            message:
              "The tutor did not give a result for each line of the task's list, so only the overall assessment is shown.",
          });
        store.saveEssayAssessment({
          essayId: input.essayId,
          requestId: input.requestId,
          status: "ready",
          provider: runtime.id,
          accepted: issues.every((issue) => issue.severity !== "hard"),
          assessmentJson: JSON.stringify(assessment),
          issuesJson: JSON.stringify(issues),
          errorCode: null,
          errorMessage: null,
        });
      } catch (error) {
        const signIn = error instanceof TutorProviderError && signInLikely(error);
        if (signIn) recordTutorSignInFailure(runtime.id);
        const failure =
          error instanceof TutorProviderError
            ? {
                code: error.code,
                message:
                  signIn && !/sign|log ?in/iu.test(error.message)
                    ? `${error.message} ${SIGN_IN_HINT}`
                    : error.message,
              }
            : {
                code: "TUTOR_PROVIDER_FAILED",
                message:
                  error instanceof Error ? error.message : "The assessment could not be produced.",
              };
        try {
          store.saveEssayAssessment({
            essayId: input.essayId,
            requestId: input.requestId,
            status: "failed",
            provider: runtime.id,
            accepted: false,
            assessmentJson: null,
            issuesJson: "[]",
            errorCode: failure.code,
            errorMessage: failure.message,
          });
        } catch {
          // The database closed while the generation was still running.
        }
      } finally {
        running.delete(input.essayId);
      }
    })();
    running.set(input.essayId, job);
  }

  /** The version a revision replaces, as the tutor is shown it. */
  function previousVersion(essayId: string): PreviousEssayVersion | undefined {
    const earlier = store.listEssayVersions(essayId).at(-1);
    if (!earlier) return undefined;
    const row = earlier.assessment;
    const told =
      row?.status === "ready" && row.assessmentJson
        ? (JSON.parse(row.assessmentJson) as EssayAssessmentDraft)
        : null;
    return {
      version: earlier.version,
      submission: earlier.content,
      feedback: told
        ? {
            assessment: told.assessment,
            summary: told.summary,
            firstMeaningfulError: told.firstMeaningfulError,
            nextStep: told.nextStep,
            ...(told.criteria ? { criteria: told.criteria } : {}),
          }
        : null,
    };
  }

  app.post("/api/essays/:essayId/assess", async (request) => {
    const { essayId } = EssayParamsSchema.parse(request.params);
    const body = EssayAssessRequestSchema.parse(request.body ?? {});
    const mode = body.mode ?? "direct";
    if (mode === "exam") {
      throw new HttpError(403, "Assessment is unavailable in Exam mode.", "EXAM_GUARDRAIL");
    }
    const { stage, lesson } = essayStage(essayId);
    const draft = store.getEssayDraft(essayId);
    if (!draft.submitted) {
      throw new HttpError(
        409,
        "Submit your writing before asking for an assessment.",
        "ESSAY_NOT_SUBMITTED",
      );
    }
    const version = store.essayVersionNumber(essayId);
    const existing = store.getEssayAssessment(essayId);
    // One assessment per submitted version. A version that has its assessment keeps it, and a
    // new one is asked for by revising.
    if (existing?.status === "pending" || existing?.status === "ready")
      return assessmentResponse(existing, null, version);

    const requestId = randomUUID();
    const tutorRequest: TutorRequest<unknown> = {
      operation: "assess_response",
      requestId,
      payload: buildEssayAssessmentPayload(
        lesson,
        stage,
        { content: draft.content, wordCount: wordCount(draft.content) },
        mode,
        previousVersion(essayId),
      ),
    };

    if (!runtime.provider.generatesInProcess) {
      const packet = buildCompanionPacket(tutorRequest);
      const row = store.saveEssayAssessment({
        essayId,
        requestId,
        status: "packet_required",
        provider: runtime.id,
        accepted: false,
        assessmentJson: null,
        issuesJson: "[]",
        errorCode: null,
        errorMessage: PACKET_MESSAGE,
      });
      return assessmentResponse(row, packet, version);
    }

    const row = store.saveEssayAssessment({
      essayId,
      requestId,
      status: "pending",
      provider: runtime.id,
      accepted: false,
      assessmentJson: null,
      issuesJson: "[]",
      errorCode: null,
      errorMessage: null,
    });
    startAssessment({
      essayId,
      requestId,
      tutorRequest,
      lesson,
      successCriteria: stage.successCriteria,
    });
    return assessmentResponse(row, null, version);
  });

  app.get("/api/essays/:essayId/assessment", async (request) => {
    const { essayId } = EssayParamsSchema.parse(request.params);
    essayStage(essayId);
    const row = store.getEssayAssessment(essayId);
    if (!row) {
      throw new HttpError(
        404,
        "No assessment has been requested for this essay.",
        "ESSAY_ASSESSMENT_NOT_FOUND",
      );
    }
    return assessmentResponse(row, null, store.essayVersionNumber(essayId));
  });

  /**
   * Opens submitted writing for another version. The submitted text and its assessment are kept
   * as an earlier version first, so revising never loses what was written or said about it.
   */
  app.post("/api/essays/:essayId/revise", async (request) => {
    const { essayId } = EssayParamsSchema.parse(request.params);
    essayStage(essayId);
    if (store.getEssayAssessment(essayId)?.status === "pending" || running.has(essayId))
      throw new HttpError(
        409,
        "The tutor is still reading this version. Revise it once the assessment has arrived.",
        "ESSAY_ASSESSMENT_PENDING",
      );
    const draft = store.reviseEssay(essayId);
    if (!draft)
      throw new HttpError(
        409,
        "Submit your writing before revising it.",
        "ESSAY_NOT_SUBMITTED",
      );
    const earlier = store.listEssayVersions(essayId);
    return {
      ...draft,
      wordCount: wordCount(draft.content),
      version: earlier.length + 1,
      earlierVersions: earlier.map((entry) => ({
        version: entry.version,
        wordCount: wordCount(entry.content),
        submittedAt: entry.submittedAt,
        assessed: entry.assessment?.status === "ready",
      })),
    };
  });

  app.get("/api/essays/:essayId/versions/:version", async (request): Promise<EssayVersionResponse> => {
    const { essayId, version } = EssayVersionParamsSchema.parse(request.params);
    essayStage(essayId);
    const found = store.listEssayVersions(essayId).find((entry) => entry.version === version);
    if (!found)
      throw new HttpError(404, "That version was not found.", "ESSAY_VERSION_NOT_FOUND");
    return {
      essayId,
      version: found.version,
      content: found.content,
      wordCount: wordCount(found.content),
      submittedAt: found.submittedAt,
      assessment: found.assessment ? assessmentResponse(found.assessment, null, version) : null,
    };
  });
}
import { genericTutorContext } from "./generic-tutor-context.js";
