import type { StudyDay } from "@discere/contracts";

export function localStudyDay(timestamp: string, timeZone: string): string {
  const instant = new Date(timestamp);
  if (!Number.isFinite(instant.getTime())) throw new RangeError("Invalid study timestamp.");
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const read = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${read("year")}-${read("month")}-${read("day")}`;
}
/** Calendar arithmetic is done on date labels, never on a local instant across a DST boundary. */
export function offsetStudyDay(day: string, offset: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
}
export interface StudyEvent {
  key: string;
  kind: "answer" | "stage" | "review" | "transfer" | "reward" | "recovery";
  referenceId: string;
  occurredAt: string;
  updatedAt: string;
  xp: number;
  correct: boolean;
  independent: boolean;
  qualifying: boolean;
}

export function studyDays(
  events: readonly StudyEvent[],
  now: string,
  timeZone: string,
): StudyDay[] {
  const today = localStudyDay(now, timeZone);
  const byDate = new Map<string, { day: StudyDay; answers: Set<string>; reviews: Set<string> }>();
  for (const event of events) {
    if (event.occurredAt > now) continue;
    const date = localStudyDay(event.occurredAt, timeZone);
    if (date > today) continue;
    let group = byDate.get(date);
    if (!group) {
      group = {
        day: {
          date,
          answers: 0,
          reviews: 0,
          lessons: 0,
          xp: 0,
          qualified: false,
          protected: false,
        },
        answers: new Set(),
        reviews: new Set(),
      };
      byDate.set(date, group);
    }
    group.day.xp += event.xp;
    if (event.kind === "answer" && event.qualifying) group.answers.add(event.referenceId);
    if (event.kind === "review" && event.qualifying) group.reviews.add(event.referenceId);
    if (event.kind === "stage" && event.key.endsWith(":completion")) group.day.lessons += 1;
    if (
      event.qualifying &&
      (event.kind === "answer" || event.kind === "transfer" || event.kind === "stage")
    )
      group.day.qualified = true;
    group.day.answers = group.answers.size;
    group.day.reviews = group.reviews.size;
    if (group.reviews.size >= 3) group.day.qualified = true;
  }
  return [...byDate.values()].map(({ day }) => day).sort((a, b) => a.date.localeCompare(b.date));
}

export function streakLength(dates: ReadonlySet<string>, today: string): number {
  let cursor = dates.has(today) ? today : offsetStudyDay(today, -1);
  let count = 0;
  while (dates.has(cursor)) {
    count += 1;
    cursor = offsetStudyDay(cursor, -1);
  }
  return count;
}
export function longestStudyStreak(dates: ReadonlySet<string>): number {
  let best = 0,
    run = 0,
    previous = "";
  for (const day of [...dates].sort()) {
    run = previous && offsetStudyDay(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

/** Spend only when the available charges can bridge the whole gap to real study. Never spend on today. */
export function recoverStudyStreak(
  realDates: ReadonlySet<string>,
  protectedDates: ReadonlySet<string>,
  today: string,
  charges: number,
): { dates: string[]; remaining: number } {
  const dates = new Set([...realDates, ...protectedDates]);
  const recovered: string[] = [];
  let cursor = realDates.has(today) ? today : offsetStudyDay(today, -1);
  while (dates.has(cursor)) cursor = offsetStudyDay(cursor, -1);
  if (cursor < offsetStudyDay(today, -2)) return { dates: [], remaining: charges };
  const missing: string[] = [];
  while (!dates.has(cursor) && missing.length < charges) {
    missing.push(cursor);
    cursor = offsetStudyDay(cursor, -1);
  }
  if (missing.length && dates.has(cursor)) recovered.push(...missing);
  return { dates: recovered, remaining: charges - recovered.length };
}
