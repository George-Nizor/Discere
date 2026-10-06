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
