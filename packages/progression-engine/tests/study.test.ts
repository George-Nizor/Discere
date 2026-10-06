import { describe, expect, it } from "vitest";
import {
  localStudyDay,
  offsetStudyDay,
  studyDays,
  streakLength,
  longestStudyStreak,
  recoverStudyStreak,
  type StudyEvent,
} from "../src/study.js";

const event = (overrides: Partial<StudyEvent> = {}): StudyEvent => ({
  key: "answer:a",
  kind: "answer",
  referenceId: "q1",
  occurredAt: "2026-10-03T14:30:00.000Z",
  updatedAt: "2026-10-03T14:30:00.000Z",
  xp: 0,
  correct: true,
  independent: true,
  qualifying: true,
  ...overrides,
});
describe("local study calendar", () => {
  it("uses the learner's date at midnight and across daylight saving", () => {
    expect(localStudyDay("2026-10-03T13:59:00.000Z", "Australia/Sydney")).toBe("2026-10-03");
    expect(localStudyDay("2026-10-03T14:00:00.000Z", "Australia/Sydney")).toBe("2026-10-04");
    expect(localStudyDay("2026-10-04T13:00:00.000Z", "Australia/Sydney")).toBe("2026-10-05");
    expect(offsetStudyDay("2026-10-04", 1)).toBe("2026-10-05");
    expect(offsetStudyDay("2028-03-01", -1)).toBe("2028-02-29");
    expect(() => localStudyDay("bad", "UTC")).toThrow();
  });
  it("counts a question once per date, ignores future events, and separates XP from habit evidence", () => {
    const days = studyDays(
      [
        event(),
        event({ key: "answer:b" }),
        event({ kind: "reward", key: "reward:1", qualifying: false, xp: 20 }),
        event({ occurredAt: "2027-01-01T00:00:00.000Z" }),
      ],
      "2026-10-03T15:00:00.000Z",
      "Australia/Sydney",
    );
    expect(days).toEqual([
      {
        date: "2026-10-04",
        answers: 1,
        reviews: 0,
        lessons: 0,
        xp: 20,
        qualified: true,
        protected: false,
      },
    ]);
    expect(
      studyDays(
        [event({ kind: "reward", qualifying: false, xp: 20 })],
        "2026-10-03T15:00:00.000Z",
        "UTC",
      )[0]?.qualified,
    ).toBe(false);
  });
  it("requires three different due recall cards for a recall-only study day", () => {
    const reviews = ["a", "b", "c"].map((referenceId) => event({ kind: "review", referenceId }));
    expect(
      studyDays([reviews[0]!, reviews[0]!, reviews[1]!], "2026-10-03T15:00:00.000Z", "UTC")[0]
        ?.qualified,
    ).toBe(false);
    expect(studyDays(reviews, "2026-10-03T15:00:00.000Z", "UTC")[0]?.qualified).toBe(true);
  });
});
describe("earned streak protection", () => {
  it("keeps yesterday's streak available before today's practice", () => {
    const dates = new Set(["2026-09-28", "2026-09-29"]);
    expect(streakLength(dates, "2026-09-30")).toBe(2);
    expect(longestStudyStreak(new Set([...dates, "2026-09-25"]))).toBe(2);
  });
  it("spends a charge only when it bridges to actual study and never protects today", () => {
    expect(recoverStudyStreak(new Set(["2026-09-28"]), new Set(), "2026-09-30", 1)).toEqual({
      dates: ["2026-09-29"],
      remaining: 0,
    });
    expect(recoverStudyStreak(new Set(["2026-09-27"]), new Set(), "2026-09-30", 1)).toEqual({
      dates: [],
      remaining: 1,
    });
    expect(recoverStudyStreak(new Set(), new Set(), "2026-09-30", 2)).toEqual({
      dates: [],
      remaining: 2,
    });
    expect(
      recoverStudyStreak(new Set(["2026-09-29", "2026-09-30"]), new Set(), "2026-09-30", 2),
    ).toEqual({ dates: [], remaining: 2 });
  });
  it("does not heal an old gap using charges earned much later", () => {
    const real = new Set([
      "2026-09-20",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
    ]);
    expect(recoverStudyStreak(real, new Set(), "2026-09-30", 2)).toEqual({
      dates: [],
      remaining: 2,
    });
  });
});
