import type { TutoringMode } from "@discere/contracts";
export interface AttemptEvidenceInput { correct: boolean; mode: TutoringMode; hintsUsed: number; answerRevealed: boolean; transferCorrect?: boolean; difficulty?: number; }
export interface AttemptEvidenceResult { xp: number; masteryEvidence: number; independent: boolean; }
const MODE_WEIGHT: Record<TutoringMode, number> = { coach: 1, assisted: 0.82, direct: 0.45, exam: 1.08 };

export function scoreAttempt(input: AttemptEvidenceInput): AttemptEvidenceResult {
  const difficulty = Math.max(0.5, Math.min(2, input.difficulty ?? 1));
  const independent = input.mode !== "direct" && input.hintsUsed === 0 && !input.answerRevealed;
  const baseXp = input.correct ? 20 : 6;
  const persistenceXp = Math.min(6, input.hintsUsed * 2);
  const revealPenalty = input.answerRevealed ? 0.25 : 1;
  const hintPenalty = Math.max(0.45, 1 - input.hintsUsed * 0.12);
  const transferRecovery = input.answerRevealed && input.transferCorrect ? 0.25 : 0;
  const masteryEvidence = Math.max(0, Math.min(1, (input.correct ? 1 : 0) * (MODE_WEIGHT[input.mode] ?? 1) * hintPenalty * revealPenalty + transferRecovery));
  return { xp: Math.max(1, Math.round((baseXp + persistenceXp) * difficulty)), masteryEvidence, independent };
}

export function updateMastery(current: number, evidence: number, learningRate = 0.28): number {
  const boundedCurrent = Math.max(0, Math.min(1, current));
  const boundedEvidence = Math.max(0, Math.min(1, evidence));
  return boundedCurrent + (boundedEvidence - boundedCurrent) * learningRate;
}
