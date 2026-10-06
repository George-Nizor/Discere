import type { JourneyStageType } from "@discere/contracts";

/**
 * XP for finishing a stage, awarded once per stage.
 *
 * Answers and due recall responses earn their own rewards. Visiting or advancing a screen
 * earns nothing. Completion adds a small, once-only reward after the server verifies the
 * lesson's required answers, interactions, and recall cards.
 */
export const XP_AWARDS: Partial<Record<JourneyStageType, number>> = {
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
export function levelProgress(xp: number): {
  level: number;
  fraction: number;
  nextLevelXp: number;
} {
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

/**
 * An XP boost is an item, earned from chests and new levels and switched on by hand. While it
 * runs, every reward for learning work pays half as much again. Chest XP is never boosted.
 */
export const XP_BOOST = { multiplier: 1.5, minutes: 30 } as const;
export function boostBonus(amount: number): number {
  return Math.round(amount * (XP_BOOST.multiplier - 1));
}
