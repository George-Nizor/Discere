import type { StudyStatistics } from "@discere/contracts";
import { offsetStudyDay } from "@discere/progression-engine";

export function displayDate(date: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...options,
  }).format(new Date(date + "T12:00:00Z"));
}
export interface ActivityBucket {
  id: string;
  from: string;
  to: string;
  label: string;
  answers: number;
  reviews: number;
}
export function activityBuckets(stats: StudyStatistics): ActivityBucket[] {
  const monthly = stats.period === "all" || stats.period === "year";
  const months =
    (Number(stats.to.slice(0, 4)) - Number(stats.from.slice(0, 4))) * 12 +
    Number(stats.to.slice(5, 7)) -
    Number(stats.from.slice(5, 7)) +
    1;
  const yearly = monthly && months > 24;
  const stepYears = Math.max(
    1,
    Math.ceil((Number(stats.to.slice(0, 4)) - Number(stats.from.slice(0, 4)) + 1) / 18),
  );
  const bucketId = (date: string) => {
    if (yearly)
      return String(
        Number(stats.from.slice(0, 4)) +
          Math.floor((Number(date.slice(0, 4)) - Number(stats.from.slice(0, 4))) / stepYears) *
            stepYears,
      );
    if (monthly) return date.slice(0, 7);
    if (stats.period === "month") {
      const weekday = (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
      return offsetStudyDay(date, -weekday);
    }
    return date;
  };
  const buckets = new Map<string, ActivityBucket>();
  // Sparse recorded dates are expanded into real empty periods, including an honest empty account.
  let cursor = stats.from;
  while (cursor <= stats.to) {
    const id = bucketId(cursor);
    const existing = buckets.get(id);
    if (existing) existing.to = cursor;
    else
      buckets.set(id, {
        id,
        from: cursor,
        to: cursor,
        label: yearly
          ? stepYears > 1
            ? id + "–" + Math.min(Number(id) + stepYears - 1, Number(stats.to.slice(0, 4)))
            : id
          : monthly
            ? // "Oct ’26" reads as a month of a year; "Oct 26" read as the 26th of October.
              displayDate(cursor, { month: "short", day: undefined }) + " ’" + cursor.slice(2, 4)
            : displayDate(cursor, { month: "short", day: "numeric" }),
        answers: 0,
        reviews: 0,
      });
    // Skip entire months / years when the chart groups them, rather than iterating years of days.
    if (yearly) {
      const next = String(Number(id) + stepYears) + "-01-01";
      buckets.get(id)!.to = next <= stats.to ? offsetStudyDay(next, -1) : stats.to;
      cursor = next;
    } else if (monthly) {
      const year = Number(cursor.slice(0, 4)),
        month = Number(cursor.slice(5, 7));
      const next =
        String(year + Number(month === 12)) +
        "-" +
        String(month === 12 ? 1 : month + 1).padStart(2, "0") +
        "-01";
      buckets.get(id)!.to = next <= stats.to ? offsetStudyDay(next, -1) : stats.to;
      cursor = next;
    } else cursor = offsetStudyDay(cursor, 1);
  }
  for (const day of stats.days) {
    const bucket = buckets.get(bucketId(day.date));
    if (bucket) {
      bucket.answers += day.answers;
      bucket.reviews += day.reviews;
    }
  }
  return [...buckets.values()];
}
