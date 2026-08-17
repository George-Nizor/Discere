import { describe, expect, it } from "vitest";
import type { Question } from "@discere/contracts";
import { createFlashcardFromReviewedQuestion, createReviewState, queueDueReviews, scheduleReview } from "../src/index.js";

const reviewedAt = "2026-08-17T00:00:00.000Z";
const question: Question = {
  id: "calculate-current-5v-100ohm",
  conceptIds: ["current", "ohms-law"],
  prompt: "Calculate the current.",
  responseType: "numeric",
  difficulty: 1,
  hints: ["Use Ohm's law."],
  answerAuthority: {
    kind: "numeric",
    value: 0.05,
    unit: "A",
    absoluteTolerance: 0.000001,
    relativeTolerance: 0.02,
    workedAnswer: "I = 5 V / 100 Ω = 0.05 A.",
  },
  sourceIds: ["openstax-physics-electricity"],
};

describe("deterministic review scheduling", () => {
  it("creates an answer-bearing card only from reviewed, sourced content", () => {
    expect(createFlashcardFromReviewedQuestion({ question, reviewedAt })).toEqual({
      id: "flashcard:calculate-current-5v-100ohm",
      questionId: question.id,
      conceptIds: ["current", "ohms-law"],
      front: "Calculate the current.",
      back: "I = 5 V / 100 Ω = 0.05 A.",
      sourceIds: ["openstax-physics-electricity"],
      reviewedAt,
    });
  });

  it("advances independent success through spaced intervals", () => {
    const first = scheduleReview(createReviewState("card-1", reviewedAt), {
      outcome: "correct",
      evidence: "independent",
      reviewedAt,
    });
    const second = scheduleReview(first, {
      outcome: "correct",
      evidence: "independent",
      reviewedAt: "2026-08-18T00:00:00.000Z",
    });
    expect(first).toMatchObject({ intervalDays: 1, repetition: 1, independentReviews: 1, assistedReviews: 0 });
    expect(second).toMatchObject({ intervalDays: 3, repetition: 2, independentReviews: 2, assistedReviews: 0 });
    expect(second.dueAt).toBe("2026-08-21T00:00:00.000Z");
  });

  it("keeps assisted evidence separate and on a shorter interval", () => {
    const state = scheduleReview(createReviewState("card-1", reviewedAt), {
      outcome: "correct",
      evidence: "assisted",
      reviewedAt,
    });
    expect(state).toMatchObject({ intervalDays: 0.25, repetition: 0, independentReviews: 0, assistedReviews: 1 });
    expect(state.dueAt).toBe("2026-08-17T06:00:00.000Z");
  });

  it("returns incorrect work to relearning without erasing evidence history", () => {
    const state = scheduleReview(createReviewState("card-1", reviewedAt), {
      outcome: "incorrect",
      evidence: "independent",
      reviewedAt,
    });
    expect(state).toMatchObject({ intervalDays: 0.25, repetition: 0, lastOutcome: "incorrect", independentReviews: 1 });
  });

  it("queues due cards in deterministic priority order", () => {
    const due = [
      { ...createReviewState("card-b", reviewedAt), dueAt: "2026-08-16T00:00:00.000Z", repetition: 2 },
      { ...createReviewState("card-a", reviewedAt), dueAt: "2026-08-16T00:00:00.000Z", repetition: 1 },
      { ...createReviewState("card-c", reviewedAt), dueAt: "2026-08-18T00:00:00.000Z" },
    ];
    expect(queueDueReviews(due, "2026-08-17T00:00:00.000Z").map((state) => state.cardId)).toEqual(["card-a", "card-b"]);
  });
});
