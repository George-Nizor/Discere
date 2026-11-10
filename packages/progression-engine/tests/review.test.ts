import type { Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import {
  createFlashcardFromReviewedQuestion,
  createReviewState,
  gradeForResult,
  questionCardId,
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

  it("keeps assisted recall from earning more than a hard grade once a card is in review", () => {
    let state = review(createReviewState("card-1", reviewedAt), reviewedAt, "good");
    state = review(state, "2026-08-17T00:10:00.000Z", "good");
    expect(state.phase).toBe("review");
    const assistedEasy = review(state, "2026-08-19T00:10:00.000Z", "easy", "assisted");
    const independentHard = review(state, "2026-08-19T00:10:00.000Z", "hard");
    const independentGood = review(state, "2026-08-19T00:10:00.000Z", "good");
    expect(assistedEasy.dueAt).toBe(independentHard.dueAt);
    expect(assistedEasy.intervalDays).toBeLessThan(independentGood.intervalDays);
    expect(assistedEasy).toMatchObject({ assistedReviews: 1, independentReviews: 2 });
    const result = {
      outcome: "correct",
      evidence: "assisted",
      rating: "easy",
      reviewedAt,
    } as const;
    expect(gradeForResult(result)).toBe(2);
    expect(gradeForResult(result, "review")).toBe(2);
  });

  it("lets assisted recall pass a learning step as Good and no higher", () => {
    const result = { outcome: "correct", evidence: "assisted", reviewedAt } as const;
    for (const phase of ["new", "learning", "relearning"] as const) {
      expect(gradeForResult({ ...result, rating: "easy" }, phase)).toBe(3);
      expect(gradeForResult({ ...result, rating: "good" }, phase)).toBe(3);
      expect(gradeForResult(result, phase)).toBe(3);
      // The learner may still say the card was hard, and a miss is always Again.
      expect(gradeForResult({ ...result, rating: "hard" }, phase)).toBe(2);
      expect(gradeForResult({ ...result, outcome: "incorrect", rating: "good" }, phase)).toBe(1);
    }
  });

  it("graduates a card that is always revealed without a typed answer", () => {
    // Each review happens the moment the card falls due and is rated Good.
    const run = (evidence: "independent" | "assisted", reviews: number) => {
      let state = createReviewState("card-1", reviewedAt);
      const history = [];
      for (let index = 0; index < reviews; index += 1) {
        state = review(state, state.dueAt, "good", evidence);
        history.push(state);
      }
      return history;
    };
    const assisted = run("assisted", 6);
    const unaided = run("independent", 6);
    // Under the old Hard cap this card stayed in the learning phase, due again within minutes,
    // however many times it was reviewed.
    expect(assisted[1]).toMatchObject({ phase: "review", assistedReviews: 2 });
    expect(assisted[1]!.intervalDays).toBeGreaterThanOrEqual(1);
    expect(assisted.slice(1).every((state) => state.phase === "review")).toBe(true);
    expect(assisted.at(-1)).toMatchObject({ assistedReviews: 6, independentReviews: 0 });
    // The learning steps are the same for both. Once in review, help earns shorter intervals.
    expect(assisted[1]!.intervalDays).toBe(unaided[1]!.intervalDays);
    for (let index = 2; index < 6; index += 1) {
      expect(assisted[index]!.intervalDays).toBeGreaterThan(assisted[index - 1]!.intervalDays);
      expect(assisted[index]!.intervalDays).toBeLessThan(unaided[index]!.intervalDays);
    }
  });

  it("lets an assisted card leave relearning after a lapse", () => {
    let state = review(createReviewState("card-1", reviewedAt), reviewedAt, "good");
    state = review(state, state.dueAt, "good");
    state = review(state, state.dueAt, "again");
    expect(state.phase).toBe("relearning");
    state = review(state, state.dueAt, "good", "assisted");
    expect(state.phase).toBe("review");
  });

  it("puts a choice question's options on the front of its card", () => {
    const card = createFlashcardFromReviewedQuestion({
      question: {
        ...question,
        responseType: "short_text",
        prompt: "Which unit measures current?",
        choices: [
          { id: "a", label: "Ampere" },
          { id: "b", label: "Volt" },
        ],
      },
      reviewedAt,
    });
    expect(card.front).toBe("Which unit measures current?\nOptions:\nAmpere\nVolt");
    expect(card.id).toBe(questionCardId(question.id));
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
      {
        ...createReviewState("card-b", reviewedAt),
        dueAt: "2026-08-16T00:00:00.000Z",
        repetition: 2,
      },
      {
        ...createReviewState("card-a", reviewedAt),
        dueAt: "2026-08-16T00:00:00.000Z",
        repetition: 1,
      },
      { ...createReviewState("card-c", reviewedAt), dueAt: "2026-08-18T00:00:00.000Z" },
    ];
    expect(queueDueReviews(due, "2026-08-17T00:00:00.000Z").map((state) => state.cardId)).toEqual([
      "card-a",
      "card-b",
    ]);
  });
});
