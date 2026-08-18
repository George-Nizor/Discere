import type { Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import {
  createFlashcardFromReviewedQuestion,
  createReviewState,
  gradeForResult,
  queueDueReviews,
  scheduleReview,
} from "../src/index.js";

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

/** Every reviewed-at value is supplied, so the schedule below never reads the wall clock. */
function review(
  state: ReturnType<typeof createReviewState>,
  at: string,
  rating: "again" | "hard" | "good" | "easy",
  evidence: "independent" | "assisted" = "independent",
) {
  return scheduleReview(state, {
    outcome: rating === "again" ? "incorrect" : "correct",
    evidence,
    rating,
    reviewedAt: at,
  });
}

describe("FSRS review scheduling", () => {
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

  it("starts a card with no memory state and nothing to show for it", () => {
    expect(createReviewState("card-1", reviewedAt)).toMatchObject({
      cardId: "card-1",
      dueAt: reviewedAt,
      stability: 0,
      difficulty: 0,
      lapses: 0,
      phase: "new",
      repetition: 0,
    });
  });

  it("moves a card through the learning steps and then to real intervals", () => {
    const first = review(createReviewState("card-1", reviewedAt), reviewedAt, "good");
    expect(first).toMatchObject({ repetition: 1, phase: "learning", lapses: 0 });
    expect(first.dueAt).toBe("2026-08-17T00:10:00.000Z");
    expect(first.stability).toBeGreaterThan(0);

    const second = review(first, "2026-08-17T00:10:00.000Z", "good");
    expect(second).toMatchObject({ repetition: 2, phase: "review", scheduledDays: 2 });
    expect(second.dueAt).toBe("2026-08-19T00:10:00.000Z");

    const third = review(second, "2026-08-21T00:00:00.000Z", "good");
    expect(third.phase).toBe("review");
    // Stability grows with each successful recall, which is what lengthens the interval.
    expect(third.stability).toBeGreaterThan(second.stability);
    expect(third.intervalDays).toBeGreaterThan(second.intervalDays);
  });

  it("is deterministic: the same card, grade, and instant give the same schedule", () => {
    const base = createReviewState("card-1", reviewedAt);
    expect(review(base, reviewedAt, "good")).toEqual(review(base, reviewedAt, "good"));
  });

  it("keeps assisted recall from earning more than a hard grade", () => {
    const state = review(createReviewState("card-1", reviewedAt), reviewedAt, "good");
    const assistedEasy = review(state, "2026-08-17T00:10:00.000Z", "easy", "assisted");
    const independentHard = review(state, "2026-08-17T00:10:00.000Z", "hard");
    expect(assistedEasy.dueAt).toBe(independentHard.dueAt);
    expect(assistedEasy).toMatchObject({ assistedReviews: 1, independentReviews: 1 });
    expect(gradeForResult({ outcome: "correct", evidence: "assisted", rating: "easy", reviewedAt }))
      .toBe(2);
  });

  it("records a lapse and returns the card to relearning when recall fails", () => {
    let state = review(createReviewState("card-1", reviewedAt), reviewedAt, "good");
    state = review(state, "2026-08-17T00:10:00.000Z", "good");
    const lapsed = review(state, "2026-08-19T00:10:00.000Z", "again");
    expect(lapsed).toMatchObject({ lapses: 1, phase: "relearning", lastOutcome: "incorrect" });
    // The evidence history survives a lapse; only the schedule is reset.
    expect(lapsed.independentReviews).toBe(3);
    expect(lapsed.difficulty).toBeGreaterThan(state.difficulty);
  });

  it("queues due cards in deterministic priority order", () => {
    const due = [
      { ...createReviewState("card-b", reviewedAt), dueAt: "2026-08-16T00:00:00.000Z", repetition: 2 },
      { ...createReviewState("card-a", reviewedAt), dueAt: "2026-08-16T00:00:00.000Z", repetition: 1 },
      { ...createReviewState("card-c", reviewedAt), dueAt: "2026-08-18T00:00:00.000Z" },
    ];
    expect(queueDueReviews(due, "2026-08-17T00:00:00.000Z").map((state) => state.cardId)).toEqual([
      "card-a",
      "card-b",
    ]);
  });
});
