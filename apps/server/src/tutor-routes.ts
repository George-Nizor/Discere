import { randomUUID } from "node:crypto";
import type {
  EssayAssessmentDraft,
  EssayAssessmentResponse,
  EssayStage,
  LessonResponse,
  Question,
  TutorAskResponse,
  TutorIssue,
  TutoringMode,
} from "@discere/contracts";
import {
  EssayAssessmentDraftSchema,
  EssayAssessRequestSchema,
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
  acceptTutorReply,
  answerBoundaryFor,
  buildEssayAssessmentPayload,
  buildTutorReplyPayload,
  validateEssayAssessment,
} from "./companion.js";
import type { ContentRepository } from "./content.js";
import type { DiscereStore, EssayAssessmentRow } from "./db/store.js";
import { HttpError } from "./errors.js";
import { createTutorRuntime, type TutorRuntime, tutorProviderHttpError } from "./tutor-provider.js";

export interface TutorRouteDependencies {
  content: ContentRepository;
  store: DiscereStore;
  runtime?: TutorRuntime;
}

const EssayParamsSchema = z.object({ essayId: z.string().min(1).max(240) }).strict();
const TUTOR_REPLY_SCHEMA = z.toJSONSchema(TutorReplyDraftSchema);
const ESSAY_ASSESSMENT_SCHEMA = z.toJSONSchema(EssayAssessmentDraftSchema);

const PACKET_MESSAGE =
  "This provider cannot answer in place. Copy the packet into ChatGPT and import the reply.";

function wordCount(content: string): number {
  const trimmed = content.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function assessmentResponse(
  row: EssayAssessmentRow,
  packet: CompanionPacket | null,
): EssayAssessmentResponse {
  return {
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

export async function registerTutorRoutes(
  app: FastifyInstance,
  dependencies: TutorRouteDependencies,
): Promise<void> {
  const { content, store } = dependencies;
  const runtime = dependencies.runtime ?? createTutorRuntime();
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

  app.post("/api/tutor/ask", async (request): Promise<TutorAskResponse> => {
    const body = TutorAskRequestSchema.parse(request.body);
    if (body.mode === "exam") {
      throw new HttpError(403, "ChatGPT assistance is unavailable in Exam mode.", "EXAM_GUARDRAIL");
    }
    const { lesson, question } = lessonAndQuestion(body.lessonId);
    const requestId = randomUUID();
    const tutorRequest: TutorRequest<unknown> = {
      operation: "tutor_reply",
      requestId,
      payload: buildTutorReplyPayload(
        lesson,
        { question: body.question, mode: body.mode },
        body.conceptIds,
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
        ],
        timeoutMs: runtime.askTimeoutMs,
        ...(body.sessionId === undefined ? {} : { sessionId: body.sessionId }),
        signal: abort.signal,
      });
    } catch (error) {
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
    mode: Exclude<TutoringMode, "exam">;
    lesson: LessonResponse;
    question: Question;
  }): void {
    const answerBoundary = answerBoundaryFor(input.question, input.mode);
    const job = (async () => {
      try {
        const generated = await runtime.provider.generate(input.tutorRequest, {
          systemPrompt: "assessor",
          outputSchema: ESSAY_ASSESSMENT_SCHEMA,
          parsePayload: (value) => EssayAssessmentDraftSchema.parse(value),
          lintTargets: [
            {
              path: "summary",
              context: "assessment",
              ...(answerBoundary === undefined ? {} : { hiddenAnswer: answerBoundary }),
            },
            {
              path: "nextStep",
              context: "hint",
              ...(answerBoundary === undefined ? {} : { hiddenAnswer: answerBoundary }),
            },
          ],
          timeoutMs: runtime.assessTimeoutMs,
          signal: abort.signal,
        });
        const assessment = EssayAssessmentDraftSchema.parse(generated.payload);
        const issues = validateEssayAssessment({
          assessment,
          mode: input.mode,
          lesson: input.lesson,
          question: input.question,
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
        const failure =
          error instanceof TutorProviderError
            ? { code: error.code, message: error.message }
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

  app.post("/api/essays/:essayId/assess", async (request) => {
    const { essayId } = EssayParamsSchema.parse(request.params);
    const body = EssayAssessRequestSchema.parse(request.body ?? {});
    const mode = body.mode ?? "direct";
    if (mode === "exam") {
      throw new HttpError(403, "Assessment is unavailable in Exam mode.", "EXAM_GUARDRAIL");
    }
    const { stage, lesson } = essayStage(essayId);
    const { question } = lessonAndQuestion(lesson.lesson.id);
    const draft = store.getEssayDraft(essayId);
    if (!draft.submitted) {
      throw new HttpError(
        409,
        "Submit the teach-back before asking for an assessment.",
        "ESSAY_NOT_SUBMITTED",
      );
    }
    const existing = store.getEssayAssessment(essayId);
    if (existing?.status === "pending") return assessmentResponse(existing, null);

    const requestId = randomUUID();
    const tutorRequest: TutorRequest<unknown> = {
      operation: "assess_response",
      requestId,
      payload: buildEssayAssessmentPayload(
        lesson,
        stage,
        { content: draft.content, wordCount: wordCount(draft.content) },
        mode,
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
      return assessmentResponse(row, packet);
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
    startAssessment({ essayId, requestId, tutorRequest, mode, lesson, question });
    return assessmentResponse(row, null);
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
    return assessmentResponse(row, null);
  });
}
