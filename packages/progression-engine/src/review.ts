import type { Question } from "@discere/contracts";
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from "ts-fsrs";
import type { Card, FSRS, Grade } from "ts-fsrs";

export type ReviewEvidence = "independent" | "assisted";
export type ReviewOutcome = "correct" | "incorrect";
export type ReviewRating = "again" | "hard" | "good" | "easy";
/** The FSRS memory phase a card is in, stored as a word rather than an enum ordinal. */
export type ReviewPhase = "new" | "learning" | "review" | "relearning";

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
  /** FSRS memory state. Stability is the retrievable half-life in days. */
  stability: number;
  /** FSRS item difficulty, between 1 and 10. */
  difficulty: number;
  lapses: number;
  phase: ReviewPhase;
  /** Position in the FSRS learning or relearning step ladder. */
  learningStep: number;
  elapsedDays: number;
  scheduledDays: number;
}

export interface ReviewResult {
  outcome: ReviewOutcome;
  evidence: ReviewEvidence;
  reviewedAt: string;
  /** The learner's own recall rating. Absent means the outcome alone decides the grade. */
  rating?: ReviewRating;
}

const PHASE_BY_STATE: Record<State, ReviewPhase> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};
const STATE_BY_PHASE: Record<ReviewPhase, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};
const GRADE_BY_RATING: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * One scheduler for the whole workspace. Fuzz is off so a given card, grade, and timestamp
 * always produce the same next due date, which is what the scheduling tests assert.
 */
const scheduler: FSRS = fsrs(generatorParameters({ enable_fuzz: false }));

function parseTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new RangeError(`Invalid review timestamp '${value}'.`);
  return timestamp;
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
  const timestamp = parseTimestamp(now);
  if (!cardId.trim()) throw new Error("A review state needs a card ID.");
  const empty = createEmptyCard(new Date(timestamp));
  return {
    cardId,
    dueAt: new Date(timestamp).toISOString(),
    intervalDays: 0,
    repetition: 0,
    lastOutcome: null,
    lastEvidence: null,
    independentReviews: 0,
    assistedReviews: 0,
    lastReviewedAt: null,
    stability: empty.stability,
    difficulty: empty.difficulty,
    lapses: empty.lapses,
    phase: PHASE_BY_STATE[empty.state],
    learningStep: empty.learning_steps,
    elapsedDays: empty.elapsed_days,
    scheduledDays: empty.scheduled_days,
  };
}

/**
 * The grade FSRS receives. Incorrect work is always Again. Assisted recall is never allowed
 * past Hard, because the learner did not retrieve the card unaided and the schedule should not
 * behave as though they had.
 */
export function gradeForResult(result: ReviewResult): Grade {
  if (result.outcome === "incorrect") return Rating.Again;
  const requested = result.rating ? GRADE_BY_RATING[result.rating] : undefined;
  if (result.evidence === "assisted") {
    return requested !== undefined && requested < Rating.Hard ? requested : Rating.Hard;
  }
  return requested ?? Rating.Good;
}

function toCard(state: ReviewState): Card {
  return {
    due: new Date(parseTimestamp(state.dueAt)),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningStep,
    reps: state.repetition,
    lapses: state.lapses,
    state: STATE_BY_PHASE[state.phase],
    ...(state.lastReviewedAt === null
      ? {}
      : { last_review: new Date(parseTimestamp(state.lastReviewedAt)) }),
  };
}

/** Days between two instants, rounded so a stored interval is stable across a round trip. */
function intervalDaysBetween(from: number, to: number): number {
  return Math.max(0, Math.round(((to - from) / MILLISECONDS_PER_DAY) * 100_000) / 100_000);
}

/**
 * Schedule the next review with FSRS. The learner's rating and whether the recall was
 * independent both reach the scheduler through one grade, and the evidence counters stay
 * separate so the interface can still say how a card was earned.
 */
export function scheduleReview(state: ReviewState, result: ReviewResult): ReviewState {
  const reviewedAt = parseTimestamp(result.reviewedAt);
  const independentReviews = state.independentReviews + (result.evidence === "independent" ? 1 : 0);
  const assistedReviews = state.assistedReviews + (result.evidence === "assisted" ? 1 : 0);
  const next = scheduler.next(toCard(state), new Date(reviewedAt), gradeForResult(result)).card;
  const dueAt = next.due.toISOString();
  return {
    cardId: state.cardId,
    dueAt,
    intervalDays: intervalDaysBetween(reviewedAt, next.due.getTime()),
    repetition: next.reps,
    lastOutcome: result.outcome,
    lastEvidence: result.evidence,
    independentReviews,
    assistedReviews,
    lastReviewedAt: new Date(reviewedAt).toISOString(),
    stability: next.stability,
    difficulty: next.difficulty,
    lapses: next.lapses,
    phase: PHASE_BY_STATE[next.state],
    learningStep: next.learning_steps,
    elapsedDays: next.elapsed_days,
    scheduledDays: next.scheduled_days,
  };
}

export function queueDueReviews(states: ReviewState[], now: string): ReviewState[] {
  parseTimestamp(now);
  return states
    .filter((state) => parseTimestamp(state.dueAt) <= parseTimestamp(now))
    .sort(
      (left, right) =>
        left.dueAt.localeCompare(right.dueAt) ||
        left.repetition - right.repetition ||
        left.cardId.localeCompare(right.cardId),
    );
}
