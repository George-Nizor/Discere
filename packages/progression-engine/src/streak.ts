const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** The UTC calendar day an instant belongs to. Every stored timestamp is UTC ISO 8601. */
export function activityDay(timestamp: string): string {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) throw new RangeError(`Invalid activity timestamp '${timestamp}'.`);
  return new Date(parsed).toISOString().slice(0, 10);
}

function dayOffset(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + days * MILLISECONDS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

/**
 * Consecutive days of real study, counted back from today. A day counts when the learner did
 * anything the workspace records: an attempt, a transfer, or a rated review.
 *
 * Today with no work yet does not break a streak that was alive yesterday, so the number the
 * home screen shows is the same all day rather than resetting at midnight and returning after
 * the first answer.
 */
export function computeStreakDays(activityTimestamps: readonly string[], now: string): number {
  const today = activityDay(now);
  const days = new Set<string>();
  for (const timestamp of activityTimestamps) {
    if (!timestamp) continue;
    const day = activityDay(timestamp);
    // A clock that moved backwards must not invent future study days.
    if (day <= today) days.add(day);
  }
  if (days.size === 0) return 0;

  const start = days.has(today) ? today : dayOffset(today, -1);
  if (!days.has(start)) return 0;
  let streak = 0;
  let cursor = start;
  while (days.has(cursor)) {
    streak += 1;
    cursor = dayOffset(cursor, -1);
  }
  return streak;
}
