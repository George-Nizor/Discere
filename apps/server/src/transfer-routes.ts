import { TransferSubmitRequestSchema } from "@discere/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ContentRepository } from "./content.js";
import type { DiscereStore } from "./db/store.js";
import { HttpError } from "./errors.js";
import { getTransferRecord, saveTransferResponse, transferChallengeFor } from "./transfer.js";

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

  function transferChallenge(questionId: string) {
    const question = content.getQuestion(questionId);
    if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
    const challenge = transferChallengeFor(question);
    if (!challenge) {
      throw new HttpError(
        404,
        "This question has no transfer challenge.",
        "TRANSFER_NOT_AVAILABLE",
      );
    }
    return challenge;
  }

  app.get("/api/attempts/:attemptId/transfer", async (request) => {
    const { attemptId } = AttemptParamsSchema.parse(request.params);
    const attempt = revealedAttempt(store, attemptId);
    const challenge = transferChallenge(attempt.questionId);
    const record = getTransferRecord(store.database, attemptId);
    return {
      challenge,
      completed: record?.correct ?? false,
      lastCorrect: record?.correct ?? null,
      feedback: record?.feedback ?? null,
    };
  });

  app.post("/api/attempts/:attemptId/transfer", async (request) => {
    const { attemptId } = AttemptParamsSchema.parse(request.params);
    const body = TransferSubmitRequestSchema.parse(request.body);
    const attempt = revealedAttempt(store, attemptId);
    if (body.transferId !== transferChallenge(attempt.questionId).id) {
      throw new HttpError(
        409,
        "The transfer challenge does not match this question.",
        "TRANSFER_MISMATCH",
      );
    }
    const existing = getTransferRecord(store.database, attemptId);
    if (existing?.correct) {
      throw new HttpError(409, "The transfer challenge is already complete.", "TRANSFER_COMPLETE");
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
