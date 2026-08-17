import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  TutorEnvelopeBaseSchema,
  TutoringModeSchema,
  WorkingsReviewDraftSchema,
  WorkingsReviewRequestSchema,
} from "@discere/contracts";
import { buildCompanionPacket } from "@discere/tutor-providers";
import { z } from "zod";
import { buildWorkingsReviewPayload, validateWorkingsReview } from "./companion.js";
import type { ContentRepository } from "./content.js";
import type { DiscereStore } from "./db/store.js";
import { HttpError } from "./errors.js";
import { getNotebookPage } from "./notebook.js";

export interface WorkingsRouteDependencies {
  content: ContentRepository;
  store: DiscereStore;
}

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

export async function registerWorkingsReviewRoutes(
  app: FastifyInstance,
  dependencies: WorkingsRouteDependencies,
): Promise<void> {
  const { content, store } = dependencies;

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
    if (
      notebook.updatedAt === null ||
      (notebook.strokes.length === 0 && notebook.note.trim().length === 0)
    ) {
      throw new HttpError(
        409,
        "Save some workings before preparing a review.",
        "NOTEBOOK_EMPTY",
      );
    }

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
