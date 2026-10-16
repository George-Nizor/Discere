import { existsSync, readFileSync } from "node:fs";
import type { CourseBundle } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * Calculus: Change and Accumulation, v2 lessons. Every numeric key is recomputed here from the
 * arithmetic the item describes, not read back from the authority it is checking.
 */
const root = "../../../content/calculus-change-and-accumulation/";
const path = existsSync(new URL(`${root}.authoring/candidate.json`, import.meta.url))
  ? `${root}.authoring/candidate.json`
  : `${root}bundle.json`;
const bundle = JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as CourseBundle;

const f = (x: number) => x;
const best = (values: number[], pick: (...n: number[]) => number) => pick(...values);

/** question id (without the "cal-" prefix) to the value its arithmetic gives. */
const expected: Record<string, number> = {
  // 1. approaching-a-value
  "approaching-a-value-1": 2 + 3,
  "approaching-a-value-2": 3 + 3,
  "approaching-a-value-4": 4 + 4,
  "approaching-a-value-5": 5 + 5,
  "approaching-a-value-7": (3.1 ** 2 - 9) / (3.1 - 3),
  "approaching-a-value-9": 2 * 3 - 1,
  "approaching-a-value-10": 2 + 1,
  // 2. two-sides-and-continuity
  "two-sides-and-continuity-1": 2,
  "two-sides-and-continuity-2": 5,
  "two-sides-and-continuity-4": 2 * 2 + 4,
  "two-sides-and-continuity-5": 3 * -1 + 7,
  "two-sides-and-continuity-7": 3,
  "two-sides-and-continuity-10": 9,
  "two-sides-and-continuity-11": 4,
  // 3. from-secant-to-tangent
  "from-secant-to-tangent-1": (3 ** 2 - 1 ** 2) / (3 - 1),
  "from-secant-to-tangent-2": 2 * 2,
  "from-secant-to-tangent-4": 2 * 3,
  "from-secant-to-tangent-5": (5 ** 2 - 2 ** 2) / (5 - 2),
  "from-secant-to-tangent-7": (100 - 40) / (2.5 - 1),
  "from-secant-to-tangent-9": 2 * 5,
  "from-secant-to-tangent-10": 10 / 2,
  "from-secant-to-tangent-11": (2 ** 2 - 1 ** 2) / (2 - 1),
  // 4. rules-for-rates
  "rules-for-rates-1": 3 * 2 ** 2,
  "rules-for-rates-2": 4 * 1,
  "rules-for-rates-4": -2 * 1,
  "rules-for-rates-5": 6 * 2 ** 2 - 5,
  "rules-for-rates-7": 2 * 7,
  "rules-for-rates-9": 6 / 2,
  "rules-for-rates-10": 5 * 2 ** 4,
  "rules-for-rates-11": 10 * 3,
  // 5. a-rate-inside-a-rate
  "a-rate-inside-a-rate-1": 2 * (2 * 1 + 1) * 2,
  "a-rate-inside-a-rate-2": 2 * (3 - 1) * -1,
  "a-rate-inside-a-rate-4": 3 * (1 + 2) ** 2,
  "a-rate-inside-a-rate-5": 3 * (2 * 2 - 1) ** 2 * 2,
  "a-rate-inside-a-rate-7": 1 * 3 * 2,
  "a-rate-inside-a-rate-9": 2 * (3 * 2) * 3,
  "a-rate-inside-a-rate-10": 6 * 5,
  // 6. position-velocity-acceleration
  "position-velocity-acceleration-1": 2 * 2 + 2,
  "position-velocity-acceleration-2": 6 * 1,
  "position-velocity-acceleration-4": 2 * 3,
  "position-velocity-acceleration-5": 12 * 2 - 6,
  "position-velocity-acceleration-7": (16 - 10) / (5 - 2),
  "position-velocity-acceleration-9": 2 * 1 - 6,
  "position-velocity-acceleration-10": 10 * 2,
  "position-velocity-acceleration-11": 2 * 2 - 10,
  // 7. when-a-curve-turns
  "when-a-curve-turns-1": 6 / 2,
  "when-a-curve-turns-2": 6 * 3 - 3 ** 2,
  "when-a-curve-turns-4": best([(-1) ** 2, 0 ** 2, 2 ** 2], Math.max),
  "when-a-curve-turns-5": best([0, 8 * 4 - 4 ** 2, 8 * 6 - 6 ** 2], Math.max),
  "when-a-curve-turns-7": [0, 1, 2, 3, 4, 5, 6, 7].reduce(
    (top, t) => (10 * t - t * t > 10 * top - top * top ? t : top),
    0,
  ),
  "when-a-curve-turns-9": best([0 ** 2 - 6 * 0, 3 ** 2 - 6 * 3, 5 ** 2 - 6 * 5], Math.min),
  "when-a-curve-turns-10": 8 / 2,
  "when-a-curve-turns-11": 2 * 3 + 1,
  // 8. undoing-a-derivative
  "undoing-a-derivative-1": 3,
  "undoing-a-derivative-2": 2 ** 3,
  "undoing-a-derivative-4": 2 ** 3 + 2 * 2 + 1,
  "undoing-a-derivative-5": 2 * 3 ** 2 + 3 * 3 + 2,
  "undoing-a-derivative-7": 4 * 3 + 10,
  "undoing-a-derivative-9": 2 * 3 ** 2 + 50,
  "undoing-a-derivative-10": 2 * 2 ** 3,
  // 9. rectangles-that-refine
  "rectangles-that-refine-1": 2 * (f(0) + f(2)),
  "rectangles-that-refine-2": 1 * (1 + 2 + 3 + 4),
  "rectangles-that-refine-4": 2 * (f(1) + f(3)),
  "rectangles-that-refine-5": 1 * (1 ** 2 + 2 ** 2),
  "rectangles-that-refine-7": 3 * 2 + 2 * 4,
  "rectangles-that-refine-9": 2 * (0 ** 2 + 2 ** 2 + 4 ** 2),
  "rectangles-that-refine-10": 0.5 * 6,
  // 10. area-with-a-sign
  "area-with-a-sign-1": -2 * 3,
  "area-with-a-sign-2": -(0.5 * 2 * 2) + 0.5 * 2 * 2,
  "area-with-a-sign-4": -6,
  "area-with-a-sign-5": -(0.5 * 1 * 1) + 0.5 * 3 * 3,
  "area-with-a-sign-7": 3 * 4 - 2 * 3,
  "area-with-a-sign-9": 5 * 2 - 3 * 5,
  "area-with-a-sign-10": -4 * 2,
  "area-with-a-sign-11": -9,
  // 11. the-two-ideas-connect
  "the-two-ideas-connect-1": 3 ** 2 - 1 ** 2,
  "the-two-ideas-connect-2": 2 ** 2 + 2 - 0,
  "the-two-ideas-connect-4": 2 ** 2 + 1,
  "the-two-ideas-connect-5": 2 ** 3 - 1 ** 3,
  "the-two-ideas-connect-7": 0.5 * 3 * (2 * 3),
  "the-two-ideas-connect-9": 3 * 3 ** 2 - 3 * 1 ** 2,
  "the-two-ideas-connect-10": 2 * 3 ** 2 - 2 * 0 ** 2,
  "the-two-ideas-connect-11": 3 * 4,
  // 12. from-rate-to-amount
  "from-rate-to-amount-1": 2 ** 2 + 3 * 2,
  "from-rate-to-amount-2": 7 + (2 ** 2 + 3 * 2),
  "from-rate-to-amount-4": 1.5 * 2 ** 2 + 2 * 2,
  "from-rate-to-amount-5": 5 + (1.5 * 2 ** 2 - 2 * 2),
  "from-rate-to-amount-7": 30 + 5 * 4,
  "from-rate-to-amount-9": 40 + (4 ** 2 - 6 * 4),
  "from-rate-to-amount-10": 3 * 5,
  "from-rate-to-amount-11": 7 - 4,
};

const lessons = [
  "approaching-a-value",
  "two-sides-and-continuity",
  "from-secant-to-tangent",
  "rules-for-rates",
  "a-rate-inside-a-rate",
  "position-velocity-acceleration",
  "when-a-curve-turns",
  "undoing-a-derivative",
  "rectangles-that-refine",
  "area-with-a-sign",
  "the-two-ideas-connect",
  "from-rate-to-amount",
];

describe("Calculus: Change and Accumulation (v2 lessons)", () => {
  it("validates with no errors, and every lesson is v2 with a three-item skill check", () => {
    const validation = validateCourseBundle(bundle);
    expect(validation.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(bundle.lessons.map((lesson) => lesson.id)).toEqual(lessons);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro).toBeDefined();
      expect(lesson.recap).toBeDefined();
      expect(lesson.questionIds).toHaveLength(3);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
    }
  });

  it("has numeric keys that match the arithmetic each item describes", () => {
    const numeric = bundle.questions.filter((q) => q.answerAuthority.kind === "numeric");
    for (const question of numeric) {
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") continue;
      const id = question.id.replace(/^cal-/, "");
      expect(expected[id], `no recomputed key for ${id}`).toBeDefined();
      expect(authority.value, id).toBeCloseTo(expected[id]!, 6);
    }
    expect(numeric.map((q) => q.id.replace(/^cal-/, "")).sort()).toEqual(
      Object.keys(expected).sort(),
    );
  });

  it("marks exactly one choice as correct on every choice item", () => {
    for (const question of bundle.questions) {
      const authority = question.answerAuthority;
      if (authority.kind !== "text" || !question.choices) continue;
      const labels = question.choices.map((choice) => choice.label);
      expect(labels.filter((label) => authority.acceptedIdeas.includes(label))).toHaveLength(1);
    }
  });

  it("never lets a misconception match the key", () => {
    for (const question of bundle.questions) {
      const authority = question.answerAuthority;
      for (const misconception of question.misconceptions ?? []) {
        if (authority.kind === "numeric")
          expect(misconception.match.numeric ?? [], question.id).not.toContain(authority.value);
        else {
          const right = question.choices?.find((c) => authority.acceptedIdeas.includes(c.label));
          expect(misconception.match.choiceIds ?? [], question.id).not.toContain(right?.id);
        }
      }
    }
  });
});

/** All twelve lessons are in the story format. These checks recompute the numbers in their prose. */
const storyLessons = lessons.slice(0, 12);
const slope = (fn: (x: number) => number, x: number, h = 1e-5) => (fn(x + h) - fn(x - h)) / (2 * h);

describe("Story lessons 1 to 12", () => {
  it("open without a question, teach before asking, and carry a figure", () => {
    for (const id of storyLessons) {
      const lesson = bundle.lessons.find((item) => item.id === id)!;
      expect(lesson.intro?.hook.questionId, id).toBeUndefined();
      const teaching = lesson.steps.filter(
        (step) => step.kind === "explain" && !step.checkQuestionId,
      );
      expect(lesson.steps.length, id).toBeGreaterThanOrEqual(8);
      expect(lesson.steps.length, id).toBeLessThanOrEqual(14);
      expect(teaching.length / lesson.steps.length, id).toBeGreaterThanOrEqual(0.4);
      expect(lesson.steps[0]!.kind, id).toBe("explain");
      expect(lesson.steps.some((step) => step.diagram), id).toBe(true);
      expect(lesson.recap?.nextHook, id).toBeTruthy();
    }
  });

  it("gives the numbers quoted in lesson 1's prose", () => {
    const gap = (x: number) => (x ** 2 - 4) / (x - 2);
    for (const [x, y] of [[1.5, 3.5], [1.9, 3.9], [1.99, 3.99], [2.5, 4.5], [2.1, 4.1], [2.01, 4.01], [3, 5], [1, 3]] as const)
      expect(gap(x), `x = ${x}`).toBeCloseTo(y, 6);
    for (const [x, y] of [[4.1, 5.9], [4.01, 5.99], [4.001, 5.999]] as const)
      expect(10 - x).toBeCloseTo(y, 9);
    expect(((x: number) => (x ** 2 - x) / x)(0.001)).toBeCloseTo(0.001 - 1, 9);
    expect((0 ** 2 - 4) / (0 - 2) + 0).toBeCloseTo(2, 9); // x + 2 at 0 is 2
    expect(1 + 4).toBe(5); // x + 4 near 1 heads for 5
  });

  it("gives the numbers quoted in lesson 2's prose", () => {
    expect(19.99 + 0.01).toBeCloseTo(20, 9);
    expect(3 + 1).toBe(4); // y = x + 1 at x = 3
    expect(3 * 2 + 1).toBe(7); // g(2) repaired
    expect((1 + -2) / 2).toBeCloseTo(-0.5, 9); // the average that is not a limit
  });

  it("gives the numbers quoted in lesson 3's prose", () => {
    expect((50 - 20) / (5 - 2)).toBe(10);
    expect((4 - 0) / (2 - 0)).toBe(2);
    const sq = (x: number) => x * x;
    for (const [h, s] of [[1, 3], [0.5, 2.5], [0.1, 2.1]] as const)
      expect((sq(1 + h) - sq(1)) / h, `h = ${h}`).toBeCloseTo(s, 9);
    for (const x of [-1, 1, 2, 3, 5]) expect(slope(sq, x)).toBeCloseTo(2 * x, 5);
    expect((sq(4) - sq(3)) / (4 - 3)).toBe(7);
  });

  it("gives the numbers quoted in lesson 4's prose", () => {
    const sq = (x: number) => x * x;
    for (const x of [1, 2, 3, 5, 7]) expect(slope(sq, x), `x = ${x}`).toBeCloseTo(2 * x, 5);
    expect(slope((x) => x ** 3, 2)).toBeCloseTo(12, 4);
    expect(slope((x) => x ** 4, 2)).toBeCloseTo(32, 3);
    expect(slope((x) => x ** 5, 2)).toBeCloseTo(80, 2);
    const quad = (x: number) => x ** 2 + 4 * x;
    expect(slope(quad, 0)).toBeCloseTo(4, 5);
    expect(slope(quad, -3)).toBeCloseTo(-2, 5);
    expect(slope(quad, -2)).toBeCloseTo(0, 5);
    expect(slope((x) => 3 * x ** 2 + 5 * x - 4, 1.5)).toBeCloseTo(6 * 1.5 + 5, 5);
    expect(slope((x) => x ** 2 + 3, 1)).toBeCloseTo(slope(sq, 1), 6);
  });

  it("gives the numbers quoted in lesson 5's prose", () => {
    expect(15 * 1.2).toBeCloseTo(18, 9);
    expect(slope((x) => (4 * x + 5) ** 2, 0)).toBeCloseTo(40, 4);
    expect(slope((x) => (x + 5) ** 2, 0)).toBeCloseTo(10, 4);
    expect(slope((x) => (4 - x) ** 2, 1)).toBeCloseTo(-6, 4);
    expect(slope((x) => (4 - x) ** 2, 5)).toBeCloseTo(2, 4);
    expect(slope((x) => (4 - x) ** 2, 4)).toBeCloseTo(0, 4);
    expect(slope((x) => (4 * x - 3) ** 2, 1)).toBeCloseTo(8, 4);
    expect(slope((x) => (3 * x + 1) ** 2, 0.5)).toBeCloseTo(6 * (3 * 0.5 + 1), 4);
    expect(2 * 10 * 2).toBe(40); // mould patch: dA/ds = 2s at s = 10, ds/dt = 2
  });

  it("matches the derivative keys by differentiating numerically", () => {
    const key = (id: string) => {
      const authority = bundle.questions.find((q) => q.id === `cal-${id}`)!.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(id);
      return authority.value;
    };
    expect(key("rules-for-rates-1")).toBeCloseTo(slope((x) => x ** 3, 2), 4);
    expect(key("rules-for-rates-2")).toBeCloseTo(slope((x) => 2 * x ** 2 + 5, 1), 4);
    expect(key("rules-for-rates-4")).toBeCloseTo(slope((x) => 4 - x ** 2, 1), 4);
    expect(key("rules-for-rates-5")).toBeCloseTo(slope((x) => 2 * x ** 3 - 5 * x + 9, 2), 3);
    expect(key("rules-for-rates-9")).toBeCloseTo(3, 9);
    expect(slope((x) => x ** 2 - 6 * x, key("rules-for-rates-9"))).toBeCloseTo(0, 4);
    expect(key("a-rate-inside-a-rate-1")).toBeCloseTo(slope((x) => (2 * x + 1) ** 2, 1), 4);
    expect(key("a-rate-inside-a-rate-2")).toBeCloseTo(slope((x) => (3 - x) ** 2, 1), 4);
    expect(key("a-rate-inside-a-rate-4")).toBeCloseTo(slope((x) => (x + 2) ** 3, 1), 3);
    expect(key("a-rate-inside-a-rate-5")).toBeCloseTo(slope((x) => (2 * x - 1) ** 3, 2), 3);
    expect(key("a-rate-inside-a-rate-9")).toBeCloseTo(slope((t) => (3 * t) ** 2, 2), 3);
    expect(key("from-secant-to-tangent-4")).toBeCloseTo(slope((x) => x ** 2, 3), 4);
    expect(key("from-secant-to-tangent-10")).toBeCloseTo(5, 9);
    expect(slope((x) => x ** 2, key("from-secant-to-tangent-10"))).toBeCloseTo(10, 4);
  });
});

/** Simpson's rule, for checking the area and antiderivative keys without using the keys. */
const integral = (fn: (x: number) => number, a: number, b: number, n = 2000) => {
  const h = (b - a) / n;
  let total = fn(a) + fn(b);
  for (let i = 1; i < n; i += 1) total += fn(a + i * h) * (i % 2 === 0 ? 2 : 4);
  return (total * h) / 3;
};
const second = (fn: (x: number) => number, x: number, h = 1e-3) =>
  (fn(x + h) - 2 * fn(x) + fn(x - h)) / (h * h);
/** A rectangle sum over [a, b] with n equal strips, sampled at the left, right or middle. */
const rectangleSum = (
  fn: (x: number) => number,
  a: number,
  b: number,
  n: number,
  method: "left" | "right" | "midpoint",
) => {
  const width = (b - a) / n;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const edge = method === "left" ? 0 : method === "right" ? 1 : 0.5;
    total += fn(a + (i + edge) * width) * width;
  }
  return total;
};
const keyOf = (id: string) => {
  const authority = bundle.questions.find((q) => q.id === `cal-${id}`)!.answerAuthority;
  if (authority.kind !== "numeric") throw new Error(id);
  return authority.value;
};

describe("Story lessons 6 to 12", () => {
  it("only teaches with steps whose prose is the right length, and uses every question it keeps", () => {
    const words = (blocks: { kind: string; text?: string }[] | undefined) =>
      (blocks ?? []).reduce(
        (sum, block) => sum + (block.kind === "paragraph" ? block.text!.split(/\s+/).length : 0),
        0,
      );
    for (const id of lessons.slice(5, 12)) {
      const lesson = bundle.lessons.find((item) => item.id === id)!;
      expect(words(lesson.intro!.hook.blocks), id).toBeGreaterThanOrEqual(120);
      expect(words(lesson.intro!.hook.blocks), id).toBeLessThanOrEqual(200);
      expect(lesson.intro!.promise.split(/\s+/).length, id).toBeLessThanOrEqual(25);
      let run = 0;
      for (const step of lesson.steps) {
        const teaching = step.kind === "explain" && !step.checkQuestionId;
        run = teaching ? run + 1 : 0;
        expect(run, `${id}/${step.id}`).toBeLessThanOrEqual(3);
        if (teaching) {
          const total = words(step.lead) + words(step.afterFigure);
          expect(total, `${id}/${step.id}`).toBeGreaterThanOrEqual(100);
          expect(total, `${id}/${step.id}`).toBeLessThanOrEqual(250);
        } else expect(words(step.lead), `${id}/${step.id}`).toBeLessThanOrEqual(60);
      }
      const asked = lesson.steps.filter(
        (step) =>
          step.checkQuestionId ||
          (step.workedSteps ?? []).some((line) => line.blank || line.selfExplain),
      );
      expect(asked.length, id).toBeGreaterThanOrEqual(3);
      expect(asked.length, id).toBeLessThanOrEqual(7);
    }
  });

  it("gives the numbers quoted in lesson 6's prose", () => {
    expect((35 - 20) / (20 - 10)).toBeCloseTo(1.5, 9);
    expect((16 - 10) / (5 - 2)).toBe(2); // the lift
    const car = (t: number) => 4 * t * t;
    expect(slope(car, 1)).toBeCloseTo(8, 4);
    expect(slope(car, 3)).toBeCloseTo(24, 4);
    expect(second(car, 2)).toBeCloseTo(8, 3);
    const toy = (t: number) => t * t - 8 * t;
    expect(slope(toy, 1)).toBeCloseTo(-6, 4);
    expect(slope(toy, 4)).toBeCloseTo(0, 4);
    expect(slope(toy, 5)).toBeCloseTo(2, 4);
    const stone = (t: number) => 2 * t * t;
    expect((stone(3) - stone(1)) / (3 - 1)).toBe(8);
    expect(slope(stone, 1)).toBeCloseTo(4, 4);
    expect(slope(stone, 3)).toBeCloseTo(12, 4);
    expect((9 - 1) / (3 - 1)).toBe(4); // t² between 1 s and 3 s
    expect(slope((t) => t * t, 3)).toBeCloseTo(6, 4);
    const worked = (t: number) => 3 * t * t - t;
    expect(slope(worked, 2)).toBeCloseTo(11, 4);
    expect(second(worked, 2)).toBeCloseTo(6, 3);
    expect(slope((t) => t * t - 10 * t, 2)).toBeCloseTo(-6, 4);
  });

  it("matches lesson 6's keys by differentiating numerically", () => {
    expect(keyOf("position-velocity-acceleration-1")).toBeCloseTo(slope((t) => t * t + 2 * t, 2), 4);
    expect(keyOf("position-velocity-acceleration-2")).toBeCloseTo(second((t) => t ** 3, 1), 2);
    expect(keyOf("position-velocity-acceleration-4")).toBeCloseTo(slope((t) => t * t, 3), 4);
    expect(keyOf("position-velocity-acceleration-5")).toBeCloseTo(
      second((t) => 2 * t ** 3 - 3 * t * t, 2),
      2,
    );
    expect(keyOf("position-velocity-acceleration-9")).toBeCloseTo(slope((t) => t * t - 6 * t, 1), 4);
    expect(keyOf("position-velocity-acceleration-11")).toBeCloseTo(
      slope((t) => t * t - 10 * t, 2),
      4,
    );
  });

  it("gives the numbers quoted in lesson 7's prose", () => {
    const heights = [0, 1, 2, 3, 4, 5, 6, 7].map((t) => 10 * t - t * t);
    expect(heights).toEqual([0, 9, 16, 21, 24, 25, 24, 21]);
    expect(heights.indexOf(Math.max(...heights))).toBe(5);
    expect(10 - 2 * 5).toBe(0);
    const hill = (x: number) => 4 * x - x * x;
    expect(slope(hill, 1)).toBeCloseTo(2, 4);
    expect(slope(hill, 2)).toBeCloseTo(0, 4);
    expect(slope(hill, 3)).toBeCloseTo(-2, 4);
    const peak = (x: number) => 12 * x - x * x;
    expect(slope(peak, 6)).toBeCloseTo(0, 4);
    expect(peak(6)).toBe(36);
    const dip = (x: number) => x * x - 2 * x;
    expect(slope(dip, 0)).toBeCloseTo(-2, 4);
    expect(slope(dip, 1)).toBeCloseTo(0, 4);
    expect(slope(dip, 2)).toBeCloseTo(2, 4);
    expect(slope((x) => x ** 3, -0.5)).toBeGreaterThan(0);
    expect(slope((x) => x ** 3, 0.5)).toBeGreaterThan(0);
    const edge = (x: number) => x * x - 4 * x;
    expect([edge(0), edge(2), edge(5)]).toEqual([0, -4, 5]);
    expect(slope(edge, 2)).toBeCloseTo(0, 4);
    expect(2 * 3 + 1).toBe(7);
  });

  it("matches lesson 7's keys by searching the curve", () => {
    const top = (fn: (x: number) => number, a: number, b: number, pick: "max" | "min") => {
      let best = fn(a);
      for (let i = 0; i <= 6000; i += 1) {
        const value = fn(a + ((b - a) * i) / 6000);
        best = pick === "max" ? Math.max(best, value) : Math.min(best, value);
      }
      return best;
    };
    expect(keyOf("when-a-curve-turns-1")).toBeCloseTo(3, 9);
    expect(slope((x) => 6 * x - x * x, keyOf("when-a-curve-turns-1"))).toBeCloseTo(0, 4);
    expect(keyOf("when-a-curve-turns-4")).toBeCloseTo(top((x) => x * x, -1, 2, "max"), 3);
    expect(keyOf("when-a-curve-turns-5")).toBeCloseTo(top((x) => 8 * x - x * x, 0, 6, "max"), 3);
    expect(keyOf("when-a-curve-turns-9")).toBeCloseTo(top((x) => x * x - 6 * x, 0, 5, "min"), 3);
    expect(keyOf("when-a-curve-turns-11")).toBeCloseTo(top((x) => 2 * x + 1, 0, 3, "max"), 3);
  });

  it("gives the numbers quoted in lesson 8's prose", () => {
    expect(20 + 5 * 6).toBe(50);
    expect(slope((t) => 20 + 5 * t, 3)).toBeCloseTo(5, 4);
    expect(slope((x) => 3 * x * x + 4, 2)).toBeCloseTo(slope((x) => 3 * x * x - 9, 2), 6);
    expect(slope((x) => 3 * x * x, 2)).toBeCloseTo(12, 4); // 6x at 2
    expect(5 - 3 * 1 ** 2).toBe(2); // C from F(1) = 5
    expect(slope((x) => x ** 5, 1.5)).toBeCloseTo(5 * 1.5 ** 4, 3); // the antiderivative of 5x⁴ is x⁵
    expect(slope((x) => (x ** 3) / 3, 2)).toBeCloseTo(4, 4); // the antiderivative of x² is x³ ÷ 3
    expect(slope((x) => 4 * x ** 3, 1.5)).toBeCloseTo(12 * 1.5 ** 2, 3);
    expect(slope((x) => 2 * x, 3)).toBeCloseTo(2, 6); // a plain 2 undoes to 2x
    expect(integral((x) => 12 * x * x, 0, 1) + 1).toBeCloseTo(5, 6);
    expect(integral((x) => 3 * x * x + 2, 0, 2) + 1).toBeCloseTo(13, 6);
  });

  it("matches lesson 8's keys by integrating numerically", () => {
    expect(keyOf("undoing-a-derivative-1")).toBeCloseTo(3 - 0 ** 2, 9);
    expect(keyOf("undoing-a-derivative-2")).toBeCloseTo(integral((x) => 3 * x * x, 0, 2), 6);
    expect(keyOf("undoing-a-derivative-4")).toBeCloseTo(1 + integral((x) => 3 * x * x + 2, 0, 2), 6);
    expect(keyOf("undoing-a-derivative-5")).toBeCloseTo(2 + integral((x) => 4 * x + 3, 0, 3), 6);
    expect(keyOf("undoing-a-derivative-7")).toBeCloseTo(10 + integral(() => 4, 0, 3), 6);
    expect(keyOf("undoing-a-derivative-9")).toBeCloseTo(50 + integral((t) => 4 * t, 0, 3), 6);
  });

  it("gives the numbers quoted in lesson 9's prose", () => {
    expect(3 * 4).toBe(12);
    expect(3 * 2 + 2 * 4).toBe(14);
    const tap = (t: number) => 2 * t;
    expect(rectangleSum(tap, 0, 3, 3, "left")).toBeCloseTo(6, 9);
    expect(rectangleSum(tap, 0, 3, 3, "right")).toBeCloseTo(12, 9);
    expect(integral(tap, 0, 3)).toBeCloseTo(9, 6);
    expect(0.5 * 3 * 6).toBe(9);
    expect(rectangleSum(tap, 0, 3, 6, "left")).toBeCloseTo(7.5, 9);
    expect(rectangleSum(tap, 0, 3, 6, "right")).toBeCloseTo(10.5, 9);
    expect(rectangleSum(tap, 0, 3, 6, "midpoint")).toBeCloseTo(9, 9);
    expect(rectangleSum(tap, 0, 3, 3, "right") - rectangleSum(tap, 0, 3, 3, "left")).toBeCloseTo(6, 9);
    expect(rectangleSum(tap, 0, 3, 6, "right") - rectangleSum(tap, 0, 3, 6, "left")).toBeCloseTo(3, 9);
    expect(rectangleSum((x) => x, 0, 3, 3, "left")).toBeCloseTo(3, 9); // the worked example
    expect(rectangleSum((x) => x, 0, 4, 2, "left")).toBeCloseTo(4, 9);
    expect(rectangleSum((x) => x, 0, 4, 4, "right")).toBeCloseTo(10, 9);
    expect(rectangleSum((x) => x, 0, 4, 2, "midpoint")).toBeCloseTo(8, 9);
  });

  it("matches lesson 9's keys by summing rectangles", () => {
    expect(keyOf("rectangles-that-refine-1")).toBeCloseTo(rectangleSum((x) => x, 0, 4, 2, "left"), 9);
    expect(keyOf("rectangles-that-refine-2")).toBeCloseTo(rectangleSum((x) => x, 0, 4, 4, "right"), 9);
    expect(keyOf("rectangles-that-refine-4")).toBeCloseTo(
      rectangleSum((x) => x, 0, 4, 2, "midpoint"),
      9,
    );
    expect(keyOf("rectangles-that-refine-5")).toBeCloseTo(
      rectangleSum((x) => x * x, 0, 2, 2, "right"),
      9,
    );
    expect(keyOf("rectangles-that-refine-7")).toBeCloseTo(2 * 3 + 4 * 2, 9);
    expect(keyOf("rectangles-that-refine-9")).toBeCloseTo(
      rectangleSum((x) => x * x, 0, 6, 3, "left"),
      9,
    );
  });

  it("gives the numbers quoted in lesson 10's prose", () => {
    expect(5 * 2 - 3 * 4).toBe(-2); // the sink
    expect(4 * -3).toBe(-12);
    expect(3 * 4 - 2 * 3).toBe(6); // the bath
    expect(integral((x) => x, -1, 2)).toBeCloseTo(1.5, 6);
    expect(-0.5 * 1 * 1 + 0.5 * 2 * 2).toBeCloseTo(1.5, 9);
    expect(0.5 + 2).toBe(2.5); // total area of x on [-1, 2]
    expect(integral((x) => Math.abs(x), -1, 2)).toBeCloseTo(2.5, 6);
    expect(integral((x) => x, -3, 1)).toBeCloseTo(-4, 6);
    expect(-0.5 * 3 * 3 + 0.5 * 1 * 1).toBeCloseTo(-4, 9);
    expect(integral((x) => x, -2, 2)).toBeCloseTo(0, 6);
    expect(integral((x) => Math.abs(x), -2, 2)).toBeCloseTo(4, 6);
    expect(integral(() => 2.5, 0, 4)).toBeCloseTo(-integral(() => 2.5, 4, 0), 6); // swapping the bounds flips the sign
  });

  it("matches lesson 10's keys by integrating numerically", () => {
    expect(keyOf("area-with-a-sign-1")).toBeCloseTo(integral(() => -2, 0, 3), 6);
    expect(keyOf("area-with-a-sign-2")).toBeCloseTo(integral((x) => x, -2, 2), 6);
    expect(keyOf("area-with-a-sign-4")).toBeCloseTo(-integral(() => 3, 1, 3), 6);
    expect(keyOf("area-with-a-sign-5")).toBeCloseTo(integral((x) => x, -1, 3), 6);
    expect(keyOf("area-with-a-sign-7")).toBeCloseTo(integral(() => 3, 0, 4) + integral(() => -2, 0, 3), 6);
    expect(keyOf("area-with-a-sign-9")).toBeCloseTo(integral(() => 5, 0, 2) + integral(() => -3, 0, 5), 6);
  });

  it("gives the numbers quoted in lesson 11's prose", () => {
    const tap = (x: number) => 2 * x;
    expect(0.5 * 2 * 4).toBe(4); // first two minutes
    expect(0.5 * 1 * 2).toBe(1);
    expect(integral(tap, 0, 2)).toBeCloseTo(4, 6);
    expect(integral(tap, 0, 3)).toBeCloseTo(9, 6);
    for (const x of [1, 2, 3]) expect(integral(tap, 0, x), `A(${x})`).toBeCloseTo(x * x, 6);
    expect(0.5 * 2 * (2 * 2)).toBe(2 ** 2); // the triangle up to x has base x and height 2x, so x² (here x = 2)
    expect(slope((x) => x * x, 2)).toBeCloseTo(4, 4);
    expect(slope((x) => x * x, 3)).toBeCloseTo(6, 4); // the rate at minute 3
    expect(9 - 4).toBe(5); // minute 2 to minute 3
    expect(integral(tap, 2, 3)).toBeCloseTo(5, 6);
    expect(((4 + 6) / 2) * 1).toBe(5);
    expect(integral((x) => 4 * x + 3, 1, 2)).toBeCloseTo(9, 6);
    expect(2 * 2 ** 2 + 3 * 2).toBe(14);
    expect(2 * 1 ** 2 + 3 * 1).toBe(5);
    expect(integral((x) => 2 * x + 1, 0, 2)).toBeCloseTo(6, 6);
    expect(integral(tap, 1, 3)).toBeCloseTo(8, 6);
    expect(3 ** 2 + 4 - (1 ** 2 + 4)).toBe(8); // G = x² + 4 gives the same difference
    expect(slope((x) => x * x + 4, 2)).toBeCloseTo(slope((x) => x * x, 2), 6);
  });

  it("matches lesson 11's keys by integrating and differentiating numerically", () => {
    expect(keyOf("the-two-ideas-connect-1")).toBeCloseTo(integral((x) => 2 * x, 1, 3), 6);
    expect(keyOf("the-two-ideas-connect-2")).toBeCloseTo(integral((x) => 2 * x + 1, 0, 2), 6);
    expect(keyOf("the-two-ideas-connect-4")).toBeCloseTo(
      slope((x) => integral((t) => t * t + 1, 0, x), 2, 1e-3),
      3,
    );
    expect(keyOf("the-two-ideas-connect-5")).toBeCloseTo(integral((x) => 3 * x * x, 1, 2), 6);
    expect(keyOf("the-two-ideas-connect-7")).toBeCloseTo(integral((x) => 2 * x, 0, 3), 6);
    expect(keyOf("the-two-ideas-connect-9")).toBeCloseTo(integral((t) => 6 * t, 1, 3), 6);
    expect(keyOf("the-two-ideas-connect-10")).toBeCloseTo(integral((x) => 4 * x, 0, 3), 6);
    expect(keyOf("the-two-ideas-connect-11")).toBeCloseTo(
      slope((x) => integral((t) => 3 * t, 0, x), 4, 1e-3),
      3,
    );
  });

  it("gives the numbers quoted in lesson 12's prose", () => {
    expect(4 * 6).toBe(24);
    expect(10 + 4 * 6).toBe(34);
    expect(integral(() => 4, 0, 6)).toBeCloseTo(24, 6);
    expect(integral((t) => 2 * t + 1, 0, 3)).toBeCloseTo(12, 6);
    expect(3 ** 2 + 3).toBe(12);
    expect(((1 + 7) / 2) * 3).toBe(12); // the trapezoid check
    expect(integral((t) => 4 * t + 1, 0, 3)).toBeCloseTo(21, 6);
    expect(2 * 3 ** 2 + 3).toBe(21);
    expect(integral((t) => 4 * t, 0, 3)).toBeCloseTo(18, 6);
    expect(8 + 18).toBe(26);
    expect(9 - 4).toBe(5);
    expect(integral((t) => 2 * t - 3, 0, 2)).toBeCloseTo(-2, 6);
    expect(2 ** 2 - 3 * 2).toBe(-2);
    expect(integral((t) => 2 * t - 3, 0, 1.5)).toBeCloseTo(-2.25, 6);
    expect(integral((t) => 2 * t - 3, 1.5, 2)).toBeCloseTo(0.25, 6);
    const v = (t: number) => 4 - 2 * t;
    expect(v(2)).toBe(0);
    expect(v(3)).toBe(-2);
    expect(integral(v, 0, 3)).toBeCloseTo(3, 6);
    expect(4 * 3 - 3 ** 2).toBe(3);
    expect(integral(v, 0, 2)).toBeCloseTo(4, 6);
    expect(integral(v, 2, 3)).toBeCloseTo(-1, 6);
    expect(integral((t) => Math.abs(v(t)), 0, 3)).toBeCloseTo(5, 6);
  });

  it("matches lesson 12's keys by integrating numerically", () => {
    expect(keyOf("from-rate-to-amount-1")).toBeCloseTo(integral((t) => 2 * t + 3, 0, 2), 6);
    expect(keyOf("from-rate-to-amount-2")).toBeCloseTo(7 + integral((t) => 2 * t + 3, 0, 2), 6);
    expect(keyOf("from-rate-to-amount-4")).toBeCloseTo(integral((t) => 3 * t + 4 - 2, 0, 2), 6);
    expect(keyOf("from-rate-to-amount-5")).toBeCloseTo(5 + integral((t) => 3 * t - 2, 0, 2), 6);
    expect(keyOf("from-rate-to-amount-7")).toBeCloseTo(30 + integral(() => 5, 0, 4), 6);
    expect(keyOf("from-rate-to-amount-9")).toBeCloseTo(40 + integral((t) => 2 * t - 6, 0, 4), 6);
    expect(keyOf("from-rate-to-amount-10")).toBeCloseTo(integral(() => 3, 0, 5), 6);
    expect(keyOf("from-rate-to-amount-11")).toBeCloseTo(7 - 4, 9);
    // displacement and distance for v(t) = 2t − 2 on [0, 2]
    expect(integral((t) => 2 * t - 2, 0, 2)).toBeCloseTo(0, 6);
    expect(integral((t) => Math.abs(2 * t - 2), 0, 2)).toBeCloseTo(2, 4);
  });
});
