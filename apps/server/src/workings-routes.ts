import { randomUUID } from "node:crypto";
import type { NotebookPage, TutorIssue, WorkingsReviewResponse } from "@discere/contracts";
import {
  TutorEnvelopeBaseSchema,
  TutoringModeSchema,
  WorkingsReviewDraftSchema,
  WorkingsReviewGenerateRequestSchema,
  WorkingsReviewRequestSchema,
} from "@discere/contracts";
import {
  buildCompanionPacket,
  TutorProviderError,
  type TutorRequest,
} from "@discere/tutor-providers";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  answerBoundaryFor,
  buildWorkingsReviewPayload,
  validateWorkingsReview,
} from "./companion.js";
import type { ContentRepository } from "./content.js";
import type { DiscereStore } from "./db/store.js";
import { HttpError } from "./errors.js";
import { getNotebookPage } from "./notebook.js";
import { createTutorRuntime, type TutorRuntime, tutorProviderHttpError } from "./tutor-provider.js";

export interface WorkingsRouteDependencies {
  content: ContentRepository;
  store: DiscereStore;
  runtime?: TutorRuntime;
}

const WORKINGS_REVIEW_SCHEMA = z.toJSONSchema(WorkingsReviewDraftSchema);
/** A PNG always starts with these eight bytes. */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
/** An exported notebook page is a few hundred kilobytes; the route allows generous headroom. */
const IMAGE_BODY_LIMIT_BYTES = 12 * 1024 * 1024;
const PACKET_MESSAGE =
  "This provider cannot look at an image. Copy the packet into ChatGPT, attach the exported PNG, and import the reply.";

const WorkingsImportBodySchema = z
  .object({
    text: z.string().min(2).max(500_000),
    mode: TutoringModeSchema,
    lessonId: z.string().min(1).max(200),
    expectedRequestId: z.string().uuid(),
  })
  .strict();

function learnerLesson(content: ContentRepository, lessonId: string) {
  const lesson = content.getLesson(lessonId);
  if (!lesson) throw new HttpError(404, "Lesson not found.", "LESSON_NOT_FOUND");
  return lesson;
}

/** A review of an empty page would be a review of nothing, so it is refused before it starts. */
function assertNotebookHasWorkings(notebook: NotebookPage): void {
  if (
    notebook.updatedAt === null ||
    (notebook.strokes.length === 0 && notebook.note.trim().length === 0)
  ) {
    throw new HttpError(409, "Save some workings before preparing a review.", "NOTEBOOK_EMPTY");
  }
}

/** Decodes the exported page and refuses anything that is not really a PNG. */
function decodePng(base64: string): Buffer {
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0 || !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new HttpError(400, "The attached workings image is not a PNG.", "IMAGE_NOT_PNG");
  }
  return bytes;
}

export async function registerWorkingsReviewRoutes(
  app: FastifyInstance,
  dependencies: WorkingsRouteDependencies,
): Promise<void> {
  const { content, store } = dependencies;
  const runtime = dependencies.runtime ?? createTutorRuntime();
  // A generation outlives its request, so shutdown cancels it rather than leaving the CLI
  // running against a closed workspace.
  const abort = new AbortController();
  app.addHook("onClose", async () => abort.abort());

  app.post("/api/tutor/workings/packets", async (request) => {
    const body = WorkingsReviewRequestSchema.parse(request.body);
    if (body.mode === "exam") {
      throw new HttpError(
        403,
        "Workings review is unavailable in Exam mode.",
        "EXAM_GUARDRAIL",
      );
    }

    const lesson = learnerLesson(content, body.lessonId);
    const notebook = getNotebookPage(store.database, body.lessonId);
    assertNotebookHasWorkings(notebook);

    const requestId = randomUUID();
    const packet = buildCompanionPacket({
      operation: "workings_review",
      requestId,
      payload: buildWorkingsReviewPayload(lesson, body, notebook),
    });
    return {
      ...packet,
      requestId,
      operation: "workings_review" as const,
      expectedFilename: `discere-${body.lessonId}-workings.png`,
    };
  });

  /**
   * The whole workings review in one request, for a provider that can look at the image
   * itself. The generated reply passes through the same `validateWorkingsReview` gate the
   * pasted companion reply uses, so neither path can accept a review the other would refuse.
   */
  app.post(
    "/api/tutor/workings/review",
    { bodyLimit: IMAGE_BODY_LIMIT_BYTES },
    async (request): Promise<WorkingsReviewResponse> => {
      const body = WorkingsReviewGenerateRequestSchema.parse(request.body);
      if (body.mode === "exam") {
        throw new HttpError(
          403,
          "Workings review is unavailable in Exam mode.",
          "EXAM_GUARDRAIL",
        );
      }
      const lesson = learnerLesson(content, body.lessonId);
      const question = content.getQuestion(lesson.question.id);
      if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
      const notebook = getNotebookPage(store.database, body.lessonId);
      assertNotebookHasWorkings(notebook);
      const image = decodePng(body.image.base64);

      const requestId = randomUUID();
      const expectedFilename = `discere-${body.lessonId}-workings.png`;
      const tutorRequest: TutorRequest<unknown> = {
        operation: "workings_review",
        requestId,
        payload: buildWorkingsReviewPayload(
          lesson,
          { lessonId: body.lessonId, reviewQuestion: body.reviewQuestion, mode: body.mode },
          notebook,
        ),
      };

      if (!runtime.provider.generatesInProcess) {
        const packet = buildCompanionPacket(tutorRequest);
        return {
          status: "packet_required",
          provider: runtime.id,
          operation: "workings_review",
          requestId,
          packet: { filename: packet.filename, text: packet.text },
          expectedFilename,
          message: PACKET_MESSAGE,
        };
      }

      const answerBoundary = answerBoundaryFor(question, body.mode);
      let generated: Awaited<ReturnType<typeof runtime.provider.generate>>;
      try {
        generated = await runtime.provider.generate(tutorRequest, {
          systemPrompt: "assessor",
          outputSchema: WORKINGS_REVIEW_SCHEMA,
          parsePayload: (value) => WorkingsReviewDraftSchema.parse(value),
          lintTargets: [
            {
              path: "feedback",
              context: "feedback",
              ...(answerBoundary === undefined ? {} : { hiddenAnswer: answerBoundary }),
            },
            {
              path: "nextStep",
              context: "hint",
              ...(answerBoundary === undefined ? {} : { hiddenAnswer: answerBoundary }),
            },
          ],
          images: [{ filename: expectedFilename, data: image }],
          timeoutMs: runtime.assessTimeoutMs,
          signal: abort.signal,
        });
      } catch (error) {
        if (error instanceof TutorProviderError) throw tutorProviderHttpError(error);
        throw error;
      }

      const review = WorkingsReviewDraftSchema.parse(generated.payload);
      const issues: TutorIssue[] = validateWorkingsReview({
        review,
        mode: body.mode,
        lesson,
        question,
      });
      return {
        status: "answered",
        provider: runtime.id,
        operation: "workings_review",
        requestId,
        accepted: issues.every((issue) => issue.severity !== "hard"),
        issues,
        review,
      };
    },
  );

  app.post("/api/tutor/workings/import", async (request) => {
    const body = WorkingsImportBodySchema.parse(request.body);
    if (body.mode === "exam") {
      throw new HttpError(
        403,
        "Workings review is unavailable in Exam mode.",
        "EXAM_GUARDRAIL",
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(body.text) as unknown;
    } catch {
      throw new HttpError(
        400,
        "The workings-review response is not valid JSON.",
        "COMPANION_JSON_INVALID",
      );
    }

    const envelope = TutorEnvelopeBaseSchema.parse(raw);
    if (envelope.operation !== "workings_review") {
      throw new HttpError(
        400,
        "The response is not a workings review.",
        "COMPANION_OPERATION_MISMATCH",
      );
    }
    if (envelope.requestId !== body.expectedRequestId) {
      throw new HttpError(
        409,
        "This response belongs to a different workings-review request.",
        "COMPANION_REQUEST_MISMATCH",
      );
    }

    const lesson = learnerLesson(content, body.lessonId);
    const question = content.getQuestion(lesson.question.id);
    if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
    const review = WorkingsReviewDraftSchema.parse(envelope.payload);
    const issues = validateWorkingsReview({
      review,
      mode: body.mode,
      lesson,
      question,
    });

    return {
      accepted: issues.every((issue) => issue.severity !== "hard"),
      operation: envelope.operation,
      requestId: envelope.requestId,
      issues,
      review,
    };
  });
}
