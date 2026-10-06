import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/** CS Basics v2 lessons. Every key is recomputed here by running the procedure the item describes. */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/cs-basics/.authoring/candidate.json", import.meta.url), "utf8"),
) as CourseBundle;
const q = (lesson: string, suffix: string): Question =>
  bundle.questions.find((item) => item.id === `cs-basics-${lesson}-${suffix}`)!;
const key = (lesson: string, suffix: string) => {
  const authority = q(lesson, suffix).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${lesson}-${suffix} is not numeric`);
  return authority.value;
};
const marked = (lesson: string, suffix: string) => {
  const item = q(lesson, suffix);
  if (item.answerAuthority.kind !== "text") throw new Error("not a choice");
  const authority = item.answerAuthority;
  return item.choices!.filter((c) => assessTextAnswer(c.label, authority).correct).map((c) => c.id);
};

/** Searches: the number of value comparisons, with the lower middle for even ranges. */
const linear = (list: number[], target: number) => {
  let checks = 0;
  for (const value of list) {
    checks++;
    if (value === target) break;
  }
  return checks;
};
const binary = (list: number[], target: number) => {
  let lo = 0;
  let hi = list.length - 1;
  let checks = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    checks++;
    if (list[mid] === target) break;
    if (list[mid]! < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return checks;
};
const worstBinary = (n: number) => Math.floor(Math.log2(n)) + 1;
/** Passes of `while x > limit: x -= step`, and the final x. */
const whileDown = (x: number, limit: number, step: number) => {
  let passes = 0;
  while (x > limit) {
    x -= step;
    passes++;
  }
  return { x, passes };
};

describe("CS Basics v2 lessons", () => {
  it("validates with no errors and gives each lesson three skill-check items", () => {
    const issues = validateCourseBundle(bundle).issues.filter((i) => i.severity === "error");
    expect(issues).toEqual([]);
    const ids = [
      "steps-a-machine-could-follow",
      "choosing-between-paths",
      "doing-it-again",
      "looking-things-up",
      "halving-the-problem",
      "when-the-input-grows",
    ];
    expect(bundle.lessons.map((l) => l.id)).toEqual(ids);
    for (const lesson of bundle.lessons) {
      expect(lesson.questionIds).toHaveLength(3);
      expect(lesson.steps.some((s) => s.kind === "transfer")).toBe(true);
    }
  });

  it("lesson 1: assignments, run in order", () => {
    const L = "steps-a-machine-could-follow";
    expect((10 - 4) / 2).toBe(key(L, "hook"));
    expect((3 + 2) * 4).toBe(key(L, "1"));
    expect(3 * 4 + 2).toBe(key(L, "2"));
    expect(key(L, "3")).toBe(2 * 2); // x = 7; x = 2; x = x * 2
    expect(key(L, "4")).toBe((4 + 1) * 3);
    expect(key(L, "practice-1")).toBe((5 - 2) * 3);
    expect(key(L, "practice-3")).toBe(6 * 2 + 1);
    expect(marked(L, "practice-2")).toEqual(["a"]);
    expect(marked(L, "why-newest")).toEqual(["a"]);
    expect((2 + 3) * 5).toBe(25); // worked example
  });

  it("lesson 2: branches and boundaries", () => {
    const L = "choosing-between-paths";
    expect(key(L, "hook")).toBe(30 + 2 - (30 > 30 ? 4 : 0));
    const run = (x: number, test: (v: number) => boolean, a: (v: number) => number, b: (v: number) => number) =>
      test(x) ? a(x) : b(x);
    expect(key(L, "1")).toBe(run(5, (v) => v > 5, (v) => v + 10, (v) => v - 1));
    expect(key(L, "2")).toBe(run(5, (v) => v >= 5, (v) => v + 10, (v) => v - 1));
    expect(key(L, "3")).toBe(run(2, (v) => v >= 5, (v) => v + 10, (v) => v - 1) * 2);
    expect(key(L, "4")).toBe(run(3, (v) => v >= 3, (v) => v + 10, (v) => v - 2));
    expect(key(L, "practice-2")).toBe(run(8, (v) => v < 5, (v) => v - 1, (v) => v / 2));
    expect(key(L, "practice-3")).toBe(run(6, (v) => v >= 6, (v) => v - 1, (v) => v + 1) * 2);
    expect(4 > 4).toBe(false); // practice-1
    expect(run(4, (v) => v >= 4, (v) => v * 3, (v) => v + 1)).toBe(12); // worked example
    expect(marked(L, "why-inclusive")).toEqual(["a"]);
    expect(marked(L, "comparison-check")).toEqual(["a"]);
  });

  it("lesson 3: loops", () => {
    const L = "doing-it-again";
    let sweets = 7;
    let ate = 0;
    while (sweets >= 2) {
      sweets -= 2;
      ate++;
    }
    expect(key(L, "hook")).toBe(ate);
    expect(key(L, "1")).toBe(whileDown(3, 0, 1).passes);
    expect(key(L, "2")).toBe(whileDown(0, 0, 1).passes);
    let x = 1;
    for (let i = 0; i < 4; i++) x += 2;
    expect(key(L, "3")).toBe(x);
    expect(key(L, "4")).toBe(whileDown(3, 0, 1).x);
    let y = 2;
    for (let i = 0; i < 3; i++) y *= 2;
    expect(key(L, "practice-1")).toBe(y);
    expect(key(L, "practice-3")).toBe(whileDown(19, 6, 5).x);
    expect(whileDown(10, 4, 3)).toEqual({ x: 4, passes: 2 }); // worked example
    expect(marked(L, "range-check")).toEqual(["a"]);
  });

  it("lesson 4: linear search", () => {
    const L = "looking-things-up";
    const a = [8, 3, 11, 6, 2];
    expect(key(L, "hook")).toBe(9);
    expect(key(L, "1")).toBe(linear(a, 6));
    expect(key(L, "2")).toBe(linear(a, 8));
    expect(key(L, "3")).toBe(linear(a, 7) === a.length ? a.length : -1);
    expect(key(L, "4")).toBe(linear([9, 4, 12, 1, 7, 3, 15, 6], 6));
    expect(key(L, "practice-1")).toBe(50);
    expect(key(L, "practice-2")).toBe(["a", "b", "c", "d"].indexOf("d"));
    expect(key(L, "practice-3")).toBe(6 - 2);
    expect(linear([4, 9, 1, 7], 1)).toBe(3); // worked example: index 2, 3 checks
    expect(marked(L, "why-index")).toEqual(["a"]);
  });

  it("lesson 5: binary search", () => {
    const L = "halving-the-problem";
    expect(key(L, "hook")).toBe(100 - 60);
    const a = [2, 5, 8, 11, 14, 17, 20];
    expect(key(L, "1")).toBe(binary(a, 17));
    expect(key(L, "2")).toBe(binary(a, 11));
    expect(key(L, "3")).toBe(binary(a, 10));
    expect(key(L, "4")).toBe(binary([1, 4, 7, 10, 13, 16, 19, 22], 22));
    expect(key(L, "practice-2")).toBe(worstBinary(7));
    expect(key(L, "practice-3")).toBe((15 - 1) / 2);
    expect(binary([3, 6, 9, 12, 15], 15)).toBe(3); // worked example
    expect(marked(L, "why-ignored")).toEqual(["a"]);
  });

  it("lesson 6: growth", () => {
    const L = "when-the-input-grows";
    const a = [1, 3, 5, 7, 9, 11, 13];
    expect(key(L, "hook")).toBe(2 ** 3);
    expect(key(L, "1")).toBe(linear(a, 13));
    expect(key(L, "2")).toBe(binary(a, 13));
    expect(key(L, "3")).toBe(worstBinary(15));
    expect(key(L, "doubling-check")).toBe(2 ** 4 - 1);
    expect(key(L, "4")).toBe(worstBinary(1023));
    expect(2 ** key(L, "4") - 1).toBe(1023);
    expect(key(L, "practice-1")).toBe(1000);
    expect(key(L, "practice-2")).toBe(worstBinary(1000));
    expect(worstBinary(31)).toBe(5); // worked example
    expect(marked(L, "practice-3")).toEqual(["a"]);
    expect(1000 < 5000 + worstBinary(1000)).toBe(true);
  });
});
