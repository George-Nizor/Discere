import type { JourneyStageType } from "@discere/contracts";

/**
 * XP for finishing a stage, awarded once per stage.
 *
 * Quiz and essay stages are absent on purpose. Answering a question already earns XP through
 * `scoreAttempt`, weighted by mode, hints, and whether the answer was revealed — paying again
 * for reaching the end of the same stage would count one piece of work twice and would reward
 * revealing the answer as much as knowing it. The stages listed here have no attempt behind
 * them, so without this they would be worth nothing at all.
 */
export const XP_AWARDS: Partial<Record<JourneyStageType, number>> = {
  explainer: 10,
  interactive_visual: 10,
  review: 10,
  completion: 20,
};

export function stageCompletionXp(stageType: JourneyStageType): number {
  return XP_AWARDS[stageType] ?? 0;
}

/**
 * A level is a display of accumulated XP, never a gate. The square root keeps early levels
 * close together and later ones far apart, so the number moves at the start and still means
 * something after a hundred lessons.
 */
export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100));
}

/** XP still needed for the next level, and how far through the current one the learner is. */
export function levelProgress(xp: number): { level: number; fraction: number; nextLevelXp: number } {
  const level = levelForXp(xp);
  const currentFloor = level * level * 100;
  const nextLevelXp = (level + 1) * (level + 1) * 100;
  const span = nextLevelXp - currentFloor;
  return {
    level,
    fraction: span === 0 ? 0 : Math.max(0, Math.min(1, (Math.max(0, xp) - currentFloor) / span)),
    nextLevelXp,
  };
}
