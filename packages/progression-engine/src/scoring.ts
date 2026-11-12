import type { TutoringMode } from "@discere/contracts";
export interface AttemptEvidenceInput {
  correct: boolean;
  mode: TutoringMode;
  hintsUsed: number;
  answerRevealed: boolean;
  transferCorrect?: boolean;
  difficulty?: number;
  /**
   * Marked responses the learner already gave to this question, on any attempt, before this
   * one. Absent means this is the first.
   */
  priorTries?: number;
  /** True when an earlier attempt at this question was made in Direct mode. */
  usedDirect?: boolean;
  /** True when the learner has already answered this question correctly. */
  alreadySolved?: boolean;
}
/**
 * How a correct answer was earned. `independent` is the first marked response, right, with no
 * help before it. `recovered` is right after one or more misses and no help. `assisted` used a
 * hint, the tutor or Direct mode. `revealed` came after the worked answer had been shown.
 * `practice` is a correct answer to a question already solved, which earns nothing new.
 * `none` is a wrong answer.
 */
export type AttemptCredit =
  | "independent"
  | "recovered"
  | "assisted"
  | "revealed"
  | "practice"
  | "none";
export interface AttemptEvidenceResult {
  xp: number;
  masteryEvidence: number;
  independent: boolean;
  credit: AttemptCredit;
}
const MODE_WEIGHT: Record<TutoringMode, number> = {
  coach: 1,
  assisted: 0.82,
  direct: 0.45,
  exam: 1.08,
};

/** The share of XP a correct answer keeps on its first, second and third marked try. */
const TRY_XP = [1, 0.6, 0.4];
const LATER_TRY_XP = 0.25;
/** The share of mastery evidence it keeps. A second try is still mostly the learner's own work. */
const TRY_MASTERY = [1, 0.75, 0.6];
const LATER_TRY_MASTERY = 0.5;

function priorTries(input: AttemptEvidenceInput): number {
  return Math.max(0, Math.floor(input.priorTries ?? 0));
}
function usedDirect(input: AttemptEvidenceInput): boolean {
  return input.mode === "direct" || input.usedDirect === true;
}

/**
 * XP pays for correct work, and pays most for work done alone and right first time. A wrong
 * answer earns nothing (the day still counts for the streak, and the mistake still schedules its
 * review). Each hint takes a quarter off, Direct mode keeps half, and each earlier miss lowers
 * the award: 60% on the second try, 40% on the third, a quarter after that. An answer typed
 * after the worked answer was shown keeps at most a quarter. Earlier versions added XP for every
 * hint taken, which made help the most rewarding route through a question.
 */
export function attemptXp(input: AttemptEvidenceInput): number {
  if (!input.correct) return 0;
  const difficulty = Math.max(0.5, Math.min(2, input.difficulty ?? 1));
  const hintFactor = Math.max(0.4, 1 - input.hintsUsed * 0.25);
  const tryFactor = TRY_XP[priorTries(input)] ?? LATER_TRY_XP;
  const creditFactor = input.answerRevealed ? Math.min(0.25, tryFactor) : tryFactor;
  const modeFactor = usedDirect(input) ? 0.5 : 1;
  return Math.max(1, Math.round(20 * difficulty * hintFactor * creditFactor * modeFactor));
}

/** Names how a correct answer was earned. A reveal outranks every other kind of help. */
export function attemptCredit(input: AttemptEvidenceInput): AttemptCredit {
  if (!input.correct) return "none";
  if (input.alreadySolved) return "practice";
  if (input.answerRevealed) return "revealed";
  if (usedDirect(input) || input.hintsUsed > 0) return "assisted";
  return priorTries(input) > 0 ? "recovered" : "independent";
}

export function scoreAttempt(input: AttemptEvidenceInput): AttemptEvidenceResult {
  const credit = attemptCredit(input);
  const revealPenalty = input.answerRevealed ? 0.25 : 1;
  const hintPenalty = Math.max(0.45, 1 - input.hintsUsed * 0.12);
  const tryPenalty = TRY_MASTERY[priorTries(input)] ?? LATER_TRY_MASTERY;
  const modeWeight = usedDirect(input) ? MODE_WEIGHT.direct : (MODE_WEIGHT[input.mode] ?? 1);
  const transferRecovery = input.answerRevealed && input.transferCorrect ? 0.25 : 0;
  const masteryEvidence = Math.max(
    0,
    Math.min(
      1,
      (input.correct ? 1 : 0) * modeWeight * hintPenalty * revealPenalty * tryPenalty +
        transferRecovery,
    ),
  );
  return { xp: attemptXp(input), masteryEvidence, independent: credit === "independent", credit };
}

/** Mastery after a correct answer. Helped or late work adds less, and it never takes any away. */
export function raiseMastery(current: number, evidence: number): number {
  const bounded = Math.max(0, Math.min(1, current));
  return Math.max(bounded, updateMastery(bounded, evidence));
}

export function updateMastery(current: number, evidence: number, learningRate = 0.28): number {
  const boundedCurrent = Math.max(0, Math.min(1, current));
  const boundedEvidence = Math.max(0, Math.min(1, evidence));
  return boundedCurrent + (boundedEvidence - boundedCurrent) * learningRate;
}
