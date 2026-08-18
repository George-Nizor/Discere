export interface CourseQueueEntry {
  cardId: string;
  courseId: string;
  dueAt: string;
  repetition: number;
  /** Registration order, so two equally due cards keep the order the course authored them in. */
  sequence?: number;
}

function byDueThenCard(left: CourseQueueEntry, right: CourseQueueEntry): number {
  return (
    left.dueAt.localeCompare(right.dueAt) ||
    left.repetition - right.repetition ||
    (left.sequence ?? 0) - (right.sequence ?? 0) ||
    left.cardId.localeCompare(right.cardId)
  );
}

/**
 * Order due cards so a learner studying several courses meets all of them, instead of
 * clearing whichever course happened to be registered first.
 *
 * Courses take turns. Within one turn the course that was worked longest ago goes first, so
 * the queue recovered between two requests continues the rotation rather than restarting it:
 * rating a card updates that course's recency, which sends the next card to another course.
 * Inside a course the usual due order applies.
 */
export function interleaveByCourse(
  entries: readonly CourseQueueEntry[],
  courseRecency: ReadonlyMap<string, string | null> = new Map(),
): CourseQueueEntry[] {
  const remaining = new Map<string, CourseQueueEntry[]>();
  for (const entry of entries) {
    const existing = remaining.get(entry.courseId);
    if (existing) existing.push(entry);
    else remaining.set(entry.courseId, [entry]);
  }
  for (const cards of remaining.values()) cards.sort(byDueThenCard);

  const served = new Map<string, number>();
  // A course never reviewed sorts before every timestamp, so an untouched course starts first.
  const recency = (courseId: string): string => courseRecency.get(courseId) ?? "";
  const ordered: CourseQueueEntry[] = [];

  while (remaining.size > 0) {
    let chosen: string | undefined;
    for (const [courseId, cards] of remaining) {
      if (chosen === undefined) {
        chosen = courseId;
        continue;
      }
      const bestCards = remaining.get(chosen);
      const best = bestCards?.[0];
      const candidate = cards[0];
      if (!best || !candidate) continue;
      const difference =
        (served.get(courseId) ?? 0) - (served.get(chosen) ?? 0) ||
        recency(courseId).localeCompare(recency(chosen)) ||
        candidate.dueAt.localeCompare(best.dueAt) ||
        courseId.localeCompare(chosen);
      if (difference < 0) chosen = courseId;
    }
    if (chosen === undefined) break;
    const cards = remaining.get(chosen);
    const next = cards?.shift();
    if (next) ordered.push(next);
    if (!cards || cards.length === 0) remaining.delete(chosen);
    served.set(chosen, (served.get(chosen) ?? 0) + 1);
  }
  return ordered;
}
