import { describe, expect, it } from "vitest";
import { activityDay, computeStreakDays } from "../src/index.js";

const now = "2026-08-19T09:30:00.000Z";

describe("study streak", () => {
  it("counts nothing when there is no recorded activity", () => {
    expect(computeStreakDays([], now)).toBe(0);
  });

  it("counts consecutive days of recorded work, ending today", () => {
    const activity = [
      "2026-08-17T20:00:00.000Z",
      "2026-08-18T07:15:00.000Z",
      "2026-08-19T09:00:00.000Z",
    ];
    expect(computeStreakDays(activity, now)).toBe(3);
  });

  it("counts several events on one day once", () => {
    const activity = [
      "2026-08-19T09:00:00.000Z",
      "2026-08-19T09:05:00.000Z",
      "2026-08-19T09:10:00.000Z",
    ];
    expect(computeStreakDays(activity, now)).toBe(1);
  });

  it("keeps yesterday's streak alive before today's first answer", () => {
    const activity = ["2026-08-17T20:00:00.000Z", "2026-08-18T07:15:00.000Z"];
    expect(computeStreakDays(activity, now)).toBe(2);
  });

  it("breaks when a day was missed", () => {
    // 14, 15, and 18 August, with 16 and 17 empty: only 18 August still counts.
    const activity = [
      "2026-08-14T20:00:00.000Z",
      "2026-08-15T20:00:00.000Z",
      "2026-08-18T07:15:00.000Z",
    ];
    expect(computeStreakDays(activity, now)).toBe(1);
  });

  it("reports nothing once two whole days have passed", () => {
    expect(computeStreakDays(["2026-08-16T20:00:00.000Z"], now)).toBe(0);
  });

  it("ignores a timestamp from the future rather than counting it", () => {
    expect(computeStreakDays(["2026-09-01T00:00:00.000Z"], now)).toBe(0);
  });

  it("names the UTC day an instant belongs to", () => {
    expect(activityDay("2026-08-19T23:59:59.000Z")).toBe("2026-08-19");
    expect(() => activityDay("not a date")).toThrow(RangeError);
  });
});
