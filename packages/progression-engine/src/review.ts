import type { Question } from "@discere/contracts";

export type ReviewEvidence = "independent" | "assisted";
export type ReviewOutcome = "correct" | "incorrect";

export interface ReviewedQuestion {
  question: Question;
  reviewedAt: string;
}

export interface Flashcard {
  id: string;
  questionId: string;
  conceptIds: string[];
  front: string;
  back: string;
  sourceIds: string[];
  reviewedAt: string;
}

export interface ReviewState {
  cardId: string;
  dueAt: string;
  intervalDays: number;
  repetition: number;
  lastOutcome: ReviewOutcome | null;
  lastEvidence: ReviewEvidence | null;
  independentReviews: number;
  assistedReviews: number;
  lastReviewedAt: string | null;
}

export interface ReviewResult {
  outcome: ReviewOutcome;
  evidence: ReviewEvidence;
  reviewedAt: string;
}

const INDEPENDENT_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;
const ASSISTED_INTERVALS_DAYS = [0.25, 1, 3, 7, 14] as const;
const INCORRECT_INTERVAL_DAYS = 0.25;

function parseTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new RangeError(`Invalid review timestamp '${value}'.`);
  return timestamp;
}

function addDays(timestamp: string, days: number): string {
  return new Date(parseTimestamp(timestamp) + days * 24 * 60 * 60 * 1000).toISOString();
}

function answerText(question: Question): string {
  return question.answerAuthority.kind === "numeric"
    ? question.answerAuthority.workedAnswer
    : question.answerAuthority.exampleAnswer;
}

/**
 * Create a flashcard only after the question has passed curriculum review.
 * The back of a card is answer-bearing and must stay behind a server-authorized
 * review flow; it is deliberately not part of learner-safe lesson payloads.
 */
export function createFlashcardFromReviewedQuestion(input: ReviewedQuestion): Flashcard {
  if (!input.reviewedAt || !Number.isFinite(parseTimestamp(input.reviewedAt))) {
    throw new RangeError("A reviewed flashcard needs a valid review timestamp.");
  }
  if (input.question.sourceIds.length === 0) {
    throw new Error("A reviewed flashcard needs at least one source ID.");
  }
  return {
    id: `flashcard:${input.question.id}`,
    questionId: input.question.id,
    conceptIds: [...input.question.conceptIds],
    front: input.question.prompt,
    back: answerText(input.question),
    sourceIds: [...input.question.sourceIds],
    reviewedAt: input.reviewedAt,
  };
}

export function createReviewState(cardId: string, now: string): ReviewState {
  parseTimestamp(now);
  if (!cardId.trim()) throw new Error("A review state needs a card ID.");
  return {
    cardId,
    dueAt: now,
    intervalDays: 0,
    repetition: 0,
    lastOutcome: null,
    lastEvidence: null,
    independentReviews: 0,
    assistedReviews: 0,
    lastReviewedAt: null,
  };
}

/**
 * Schedule the next review with explainable Leitner-like intervals.
 * Independent success advances the interval. Assisted success is recorded
 * separately and keeps the card on a shorter interval until independent work
 * demonstrates retention. Incorrect work returns the card to relearning.
 */
export function scheduleReview(state: ReviewState, result: ReviewResult): ReviewState {
  parseTimestamp(result.reviewedAt);
  const independentReviews = state.independentReviews + (result.evidence === "independent" ? 1 : 0);
  const assistedReviews = state.assistedReviews + (result.evidence === "assisted" ? 1 : 0);

  if (result.outcome === "incorrect") {
    return {
      ...state,
      dueAt: addDays(result.reviewedAt, INCORRECT_INTERVAL_DAYS),
      intervalDays: INCORRECT_INTERVAL_DAYS,
      repetition: 0,
      lastOutcome: result.outcome,
      lastEvidence: result.evidence,
      independentReviews,
      assistedReviews,
      lastReviewedAt: result.reviewedAt,
    };
  }

  const repetition = result.evidence === "independent" ? state.repetition + 1 : state.repetition;
  const intervals = result.evidence === "independent" ? INDEPENDENT_INTERVALS_DAYS : ASSISTED_INTERVALS_DAYS;
  const intervalDays = intervals[Math.min(repetition, intervals.length) - 1] ?? intervals[0];
  return {
    ...state,
    dueAt: addDays(result.reviewedAt, intervalDays),
    intervalDays,
    repetition,
    lastOutcome: result.outcome,
    lastEvidence: result.evidence,
    independentReviews,
    assistedReviews,
    lastReviewedAt: result.reviewedAt,
  };
}

export function queueDueReviews(states: ReviewState[], now: string): ReviewState[] {
  parseTimestamp(now);
  return states
    .filter((state) => parseTimestamp(state.dueAt) <= parseTimestamp(now))
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt) || left.repetition - right.repetition || left.cardId.localeCompare(right.cardId));
}
