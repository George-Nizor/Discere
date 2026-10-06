import type { StudyStatistics } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { activityBuckets } from "./activity.js";
const metrics = { answers: 0, correct: 0, reviews: 0, lessons: 0, studyDays: 0, xp: 0 };
function statistics(
  from: string,
  to: string,
  period: StudyStatistics["period"],
  days: StudyStatistics["days"] = [],
): StudyStatistics {
  return {
    period,
    from,
    to,
    today: to,
    timeZone: "Australia/Sydney",
    totals: metrics,
    accuracy: null,
    days,
    week: { from, to, totals: metrics },
  };
}
describe("activity chart periods", () => {
  it("draws real empty days between sparse recorded answers without inventing activity", () => {
    const days = [{ date: "2026-09-30", answers: 2, correct: 1, reviews: 1, lessons: 0, xp: 0 }];
    const values = activityBuckets(statistics("2026-09-28", "2026-10-02", "week", days));
    expect(values).toHaveLength(5);
    expect(values.map((value) => value.answers)).toEqual([0, 0, 2, 0, 0]);
    expect(values.map((value) => value.reviews)).toEqual([0, 0, 1, 0, 0]);
  });
  it("keeps month weeks inside the selected calendar month across Sunday and Monday", () => {
    const days = [
      { date: "2026-10-04", answers: 1, correct: 1, reviews: 0, lessons: 0, xp: 0 },
      { date: "2026-10-05", answers: 2, correct: 0, reviews: 1, lessons: 0, xp: 0 },
    ];
    const values = activityBuckets(statistics("2026-10-01", "2026-10-06", "month", days));
    expect(values.map((value) => [value.from, value.to, value.answers])).toEqual([
      ["2026-10-01", "2026-10-04", 1],
      ["2026-10-05", "2026-10-06", 2],
    ]);
  });
  it("labels months with their year so they never read as dates", () => {
    const values = activityBuckets(statistics("2025-09-01", "2026-10-06", "all"));
    expect(values[0]?.label).toBe("Sep ’25");
    expect(values.at(-1)?.label).toBe("Oct ’26");
  });
  it("keeps leap-month boundaries and sparse year totals correct", () => {
    const days = [{ date: "2024-02-29", answers: 3, correct: 2, reviews: 2, lessons: 1, xp: 0 }];
    const values = activityBuckets(statistics("2024-01-01", "2024-03-02", "year", days));
    expect(values).toHaveLength(3);
    expect(values[1]).toMatchObject({
      from: "2024-02-01",
      to: "2024-02-29",
      answers: 3,
      reviews: 2,
    });
    expect(values[2]).toMatchObject({ from: "2024-03-01", to: "2024-03-02", answers: 0 });
  });
  it("bounds long history by larger year groups while preserving every answer and review", () => {
    const days = [
      { date: "1970-01-05", answers: 2, correct: 0, reviews: 1, lessons: 0, xp: 0 },
      { date: "2026-10-02", answers: 3, correct: 1, reviews: 2, lessons: 0, xp: 0 },
    ];
    const values = activityBuckets(statistics("1970-01-05", "2026-10-02", "all", days));
    expect(values.length).toBeLessThanOrEqual(18);
    expect(values.reduce((total, value) => total + value.answers, 0)).toBe(5);
    expect(values.reduce((total, value) => total + value.reviews, 0)).toBe(3);
    expect(values[0]?.from).toBe("1970-01-05");
    expect(values.at(-1)?.to).toBe("2026-10-02");
  });
});
