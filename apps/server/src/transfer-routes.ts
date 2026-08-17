import type { FastifyInstance } from "fastify";
import { TransferSubmitRequestSchema } from "@discere/contracts";
import { z } from "zod";
import type { ContentRepository } from "./content.js";
import type { DiscereStore } from "./db/store.js";
import { HttpError } from "./errors.js";
import {
  CURRENT_TRANSFER_CHALLENGE,
  ensureTransferSchema,
  getTransferRecord,
  saveTransferResponse,
} from "./transfer.js";

export interface TransferRouteDependencies {
  content: ContentRepository;
  store: DiscereStore;
}

const AttemptParamsSchema = z.object({ attemptId: z.string().uuid() }).strict();

function revealedAttempt(store: DiscereStore, attemptId: string) {
  const attempt = store.getAttempt(attemptId);
  if (!attempt) throw new HttpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
  if (!attempt.answerRevealed) {
    throw new HttpError(
      403,
      "The transfer challenge becomes available after the worked answer is revealed.",
      "TRANSFER_LOCKED",
    );
  }
  return attempt;
}

export async function registerTransferRoutes(
  app: FastifyInstance,
  dependencies: TransferRouteDependencies,
): Promise<void> {
  const { content, store } = dependencies;
  ensureTransferSchema(store.database);

  app.get("/api/attempts/:attemptId/transfer", async (request) => {
    const { attemptId } = AttemptParamsSchema.parse(request.params);
    revealedAttempt(store, attemptId);
    const record = getTransferRecord(store.database, attemptId);
    return {
      challenge: CURRENT_TRANSFER_CHALLENGE,
      completed: record?.correct ?? false,
      lastCorrect: record?.correct ?? null,
      feedback: record?.feedback ?? null,
    };
  });

  app.post("/api/attempts/:attemptId/transfer", async (request) => {
    const { attemptId } = AttemptParamsSchema.parse(request.params);
    const body = TransferSubmitRequestSchema.parse(request.body);
    if (body.transferId !== CURRENT_TRANSFER_CHALLENGE.id) {
      throw new HttpError(
        409,
        "The transfer challenge does not match this lesson.",
        "TRANSFER_MISMATCH",
      );
    }
    const attempt = revealedAttempt(store, attemptId);
    const existing = getTransferRecord(store.database, attemptId);
    if (existing?.correct) {
      throw new HttpError(
        409,
        "The transfer challenge is already complete.",
        "TRANSFER_COMPLETE",
      );
    }
    const question = content.getQuestion(attempt.questionId);
    if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
    return saveTransferResponse({
      store,
      attemptId,
      response: body.response,
      question,
    });
  });
}
