import { readFileSync } from "node:fs";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * Probability and Statistics, v2 lessons. Every numeric key is recomputed here from the data the
 * item describes, not read back from the authority it checks. The candidate is the converted
 * course awaiting review.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/probability-statistics/.authoring/candidate.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;

const question = (id: string): Question => {
  const found = bundle.questions.find((item) => item.id === id);
  if (!found) throw new Error(`missing question ${id}`);
  return found;
};
const key = (id: string): number => {
  const authority = question(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const acceptedChoice = (id: string): string[] => {
  const item = question(id);
  if (item.answerAuthority.kind !== "text") throw new Error(`${id} is not a choice`);
  const accepted = item.answerAuthority.acceptedIdeas;
  return (item.choices ?? []).filter((c) => accepted.includes(c.label)).map((c) => c.id);
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const grid = (sides: number) => range(sides).flatMap((a) => range(sides).map((b) => [a, b] as const));
const six = grid(6);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length / 2;
  return s.length % 2 ? s[(s.length - 1) / 2]! : (s[m - 1]! + s[m]!) / 2;
};
const variance = (xs: number[]) => mean(xs.map((x) => (x - mean(xs)) ** 2));
const sd = (xs: number[]) => Math.sqrt(variance(xs));
const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

describe("Probability and Statistics v2", () => {
  it("validates with no errors and every lesson has the v2 anatomy", () => {
    const validation = validateCourseBundle(bundle);
    expect(validation.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro, lesson.id).toBeDefined();
      expect(lesson.recap, lesson.id).toBeDefined();
      expect(lesson.questionIds, lesson.id).toHaveLength(3);
      expect(lesson.steps.some((s) => s.kind === "transfer"), lesson.id).toBe(true);
    }
  });

  it("counting-outcomes: keys match the dice and coin arithmetic", () => {
    const p = "stats-counting-outcomes-";
    const total = (pairs: ReadonlyArray<readonly number[]>, f: (s: number) => boolean) =>
      pairs.filter(([a, b]) => f(a! + b!)).length;
    expect(key(p + "hook")).toBe(2 * 2);
    expect(key(p + "1")).toBe(six.length);
    near(key(p + "3"), total(six, (s) => s >= 10) / 36);
    near(key(p + "4"), total(six, (s) => s < 10) / 36);
    near(key(p + "5"), total(grid(4), (s) => s === 5) / 16);
    near(key(p + "7"), total(six, (s) => s !== 12) / 36);
    expect(key(p + "8")).toBe(total(six, (s) => s === 8));
    near(key(p + "9"), total(six, (s) => s === 8) / 36);
    near(key(p + "10"), ["HH", "HT", "TH", "TT"].filter((r) => r.split("H").length === 2).length / 4);
    expect(acceptedChoice(p + "2")).toEqual(["b"]);
    expect(acceptedChoice(p + "6")).toEqual(["a"]);
  });

  it("when-the-condition-changes: keys count inside the restricted grid", () => {
    const p = "stats-when-the-condition-changes-";
    const cond = (given: (a: number) => boolean, event: (a: number, b: number) => boolean) => {
      const rows = six.filter(([a]) => given(a));
      return { possible: rows.length, hits: rows.filter(([a, b]) => event(a, b)).length };
    };
    expect(key(p + "hook")).toBe(["HH", "HT", "TH", "TT"].filter((r) => r.includes("H")).length);
    expect(key(p + "1")).toBe(cond((a) => a <= 2, () => true).possible);
    expect(key(p + "8")).toBe(cond((a) => a <= 2, (_a, b) => b <= 3).hits);
    const q2 = cond((a) => a <= 2, (_a, b) => b <= 3);
    near(key(p + "2"), q2.hits / q2.possible);
    const q3 = cond((a) => a <= 2, (a, b) => a + b >= 7);
    near(key(p + "3"), q3.hits / q3.possible);
    const q4 = cond((a) => a === 1, (a, b) => a + b === 7);
    near(key(p + "4"), q4.hits / q4.possible);
    const q5 = cond((a) => a === 1, (a, b) => a + b >= 5);
    near(key(p + "5"), q5.hits / q5.possible);
    const q9 = cond((a) => a >= 5, (a, b) => a + b >= 10);
    near(key(p + "9"), q9.hits / q9.possible);
    expect(key(p + "10")).toBe(range(6).filter((x) => x % 2 === 0).length);
    // Worked example (not a question): second roll at most 4 given first at most 2.
    const w = cond((a) => a <= 2, (_a, b) => b <= 4);
    expect([w.hits, w.possible]).toEqual([8, 12]);
    expect(acceptedChoice(p + "6")).toEqual(["b"]);
    expect(acceptedChoice(p + "7")).toEqual(["a"]);
  });

  it("independent-repetitions: products agree with counting", () => {
    const p = "stats-independent-repetitions-";
    expect(key(p + "hook")).toBe(2 * 6);
    const both = (limit: number) => six.filter(([a, b]) => a <= limit && b <= limit).length / 36;
    near(key(p + "1"), both(3));
    near(key(p + "1"), (3 / 6) * (3 / 6));
    near(key(p + "2"), both(2));
    near(key(p + "7"), 2 / 6);
    near(key(p + "8"), (1 / 2) * (2 / 6));
    near(key(p + "9"), 0.5 ** 3);
    near(key(p + "10"), (1 / 2) * (3 / 6));
    near(key(p + "5"), 0.5 * 0.5);
    near(key(p + "4"), six.filter(([a, b]) => a > 3 || b > 3).length / 36);
    expect(both(4)).toBeCloseTo(4 / 9, 9);
    expect(acceptedChoice(p + "3")).toEqual(["b"]);
    expect(acceptedChoice(p + "6")).toEqual(["b"]);
    expect(acceptedChoice(p + "11")).toEqual(["a"]);
  });

  it("centre-and-outliers: means and medians", () => {
    const p = "stats-centre-and-outliers-";
    expect(key(p + "2")).toBe(mean([2, 4, 4, 5, 5]));
    expect(key(p + "3")).toBe(median([2, 4, 4, 5, 25]));
    expect(key(p + "4")).toBe(median([10, 2, 6, 4]));
    expect(key(p + "5")).toBe(mean([1, 3, 3, 5, 18]));
    expect(key(p + "8")).toBe(4 + 6);
    expect(key(p + "9")).toBe(median([180, 190, 200, 210, 720]));
    expect(key(p + "10")).toBe(median([1, 3, 3, 5, 18]));
    expect(key(p + "11")).toBe(median([1, 2, 9]));
    // Predict: swapping a 5 for 25 raises the mean (4 to 8) and leaves the median at 4.
    expect(mean([2, 4, 4, 5, 25])).toBe(8);
    expect(median([2, 4, 4, 5, 25])).toBe(median([2, 4, 4, 5, 5]));
    expect(acceptedChoice(p + "1")).toEqual(["b"]);
    expect(acceptedChoice(p + "6")).toEqual(["c"]);
    expect(acceptedChoice(p + "7")).toEqual(["a"]);
  });

  it("same-centre-different-spread: range, variance and standard deviation", () => {
    const p = "stats-same-centre-different-spread-";
    expect(key(p + "hook")).toBe(spread([0, 0, 20, 20]));
    expect(key(p + "2")).toBe(spread([2, 2, 6, 6]));
    expect(key(p + "3")).toBe(sd([2, 2, 6, 6]));
    expect(key(p + "4")).toBe(variance([0, 0, 8, 8]));
    expect(key(p + "5")).toBe(spread([3, 4, 4, 7, 13]));
    expect(key(p + "8")).toBe([2, 2, 6, 6].map((x) => (x - 4) ** 2).reduce((a, b) => a + b, 0));
    expect(key(p + "9")).toBe(variance([2, 2, 6, 6]));
    expect(key(p + "10")).toBe(sd([0, 0, 20, 20]));
    expect(key(p + "11")).toBe(sd([3, 3, 9, 9]));
    expect(key(p + "12")).toBe(mean([2, 4, 6]));
    // Worked example: variance of 1, 1, 1, 9 is 12.
    expect(variance([1, 1, 1, 9])).toBe(12);
    expect(mean([4, 4, 4, 4])).toBe(mean([2, 2, 6, 6]));
    expect(acceptedChoice(p + "1")).toEqual(["a"]);
    expect(acceptedChoice(p + "6")).toEqual(["b"]);
    expect(acceptedChoice(p + "7")).toEqual(["a"]);
  });

  it("samples-and-populations: population and sample means", () => {
    const p = "stats-samples-and-populations-";
    const pop = (a: number, b: number) => [...Array(6).fill(a), ...Array(6).fill(b)] as number[];
    expect(key(p + "hook")).toBe(mean(Array(6).fill(2)));
    expect(key(p + "1")).toBe(pop(2, 8).length);
    expect(key(p + "2")).toBe(mean(pop(2, 8)));
    expect(key(p + "4")).toBe(mean(pop(4, 10)));
    expect(key(p + "7")).toBe(200);
    expect(key(p + "9")).toBe(pop(2, 8).reduce((a, b) => a + b, 0));
    expect(key(p + "10")).toBe(mean([2, 2, 2, 8, 8, 8]));
    expect(key(p + "11")).toBe(mean([3, 3, 3, 3, 9, 9, 9, 9]));
    // Worked example: five 2s and five 6s.
    expect(mean([...Array(5).fill(2), ...Array(5).fill(6)])).toBe(4);
    expect(acceptedChoice(p + "3")).toEqual(["b"]);
    expect(acceptedChoice(p + "5")).toEqual(["b"]);
    expect(acceptedChoice(p + "6")).toEqual(["b"]);
    expect(acceptedChoice(p + "8")).toEqual(["a"]);
  });

  it("never lets a misconception match the key", () => {
    for (const item of bundle.questions) {
      if (item.answerAuthority.kind !== "numeric") continue;
      const value = item.answerAuthority.value;
      for (const m of item.misconceptions ?? [])
        for (const n of m.match.numeric ?? []) expect(Math.abs(n - value), item.id).toBeGreaterThan(1e-6);
    }
  });
});
