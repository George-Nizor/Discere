import type { TutoringMode } from "@discere/contracts";
export interface AttemptEvidenceInput {
  correct: boolean;
  mode: TutoringMode;
  hintsUsed: number;
  answerRevealed: boolean;
  transferCorrect?: boolean;
  difficulty?: number;
}
export interface AttemptEvidenceResult {
  xp: number;
  masteryEvidence: number;
  independent: boolean;
}
const MODE_WEIGHT: Record<TutoringMode, number> = {
  coach: 1,
  assisted: 0.82,
  direct: 0.45,
  exam: 1.08,
};

/**
 * XP pays for correct work, and pays most for work done alone. A wrong answer earns nothing (the
 * day still counts for the streak, and the mistake still schedules its review), each hint takes a
 * quarter off, a revealed answer keeps a quarter, and Direct mode keeps half. Earlier versions
 * added XP for every hint taken, which made help the most rewarding route through a question.
 */
export function attemptXp(input: AttemptEvidenceInput): number {
  if (!input.correct) return 0;
  const difficulty = Math.max(0.5, Math.min(2, input.difficulty ?? 1));
  const hintFactor = Math.max(0.4, 1 - input.hintsUsed * 0.25);
  const revealFactor = input.answerRevealed ? 0.25 : 1;
  const modeFactor = input.mode === "direct" ? 0.5 : 1;
  return Math.max(1, Math.round(20 * difficulty * hintFactor * revealFactor * modeFactor));
}

export function scoreAttempt(input: AttemptEvidenceInput): AttemptEvidenceResult {
  const independent = input.mode !== "direct" && input.hintsUsed === 0 && !input.answerRevealed;
  const revealPenalty = input.answerRevealed ? 0.25 : 1;
  const hintPenalty = Math.max(0.45, 1 - input.hintsUsed * 0.12);
  const transferRecovery = input.answerRevealed && input.transferCorrect ? 0.25 : 0;
  const masteryEvidence = Math.max(
    0,
    Math.min(
      1,
      (input.correct ? 1 : 0) * (MODE_WEIGHT[input.mode] ?? 1) * hintPenalty * revealPenalty +
        transferRecovery,
    ),
  );
  return { xp: attemptXp(input), masteryEvidence, independent };
}

export function updateMastery(current: number, evidence: number, learningRate = 0.28): number {
  const boundedCurrent = Math.max(0, Math.min(1, current));
  const boundedEvidence = Math.max(0, Math.min(1, evidence));
  return boundedCurrent + (boundedEvidence - boundedCurrent) * learningRate;
}
