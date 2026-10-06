import { existsSync, readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * Geometry: Shape and Space, v2 rewrite. Every numeric key is recomputed here from the arithmetic
 * the item describes, not read back from the authority it is checking. The migrated lessons live
 * in the candidate until the course is published, and in bundle.json afterwards.
 */
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as CourseBundle;
const published = read("../../../content/geometry-shape-and-space/bundle.json");
const candidatePath = "../../../content/geometry-shape-and-space/.authoring/candidate.json";
const bundle =
  published.lessons.every((lesson) => lesson.intro) ||
  !existsSync(new URL(candidatePath, import.meta.url))
    ? published
    : read(candidatePath);

const question = (id: string): Question => {
  const found = bundle.questions.find((item) => item.id === id);
  if (!found) throw new Error(`missing question ${id}`);
  return found;
};
const key = (id: string) => {
  const authority = question(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const marked = (id: string) => {
  const item = question(id);
  if (item.answerAuthority.kind !== "text") throw new Error("not a choice");
  const authority = item.answerAuthority;
  return item
    .choices!.filter((choice) => assessTextAnswer(choice.label, authority).correct)
    .map((choice) => choice.label);
};
const close = (id: string, expected: number) => expect(key(id)).toBeCloseTo(expected, 9);
const PI = 3.14;
const hyp = (a: number, b: number) => Math.sqrt(a * a + b * b);
const leg = (c: number, a: number) => Math.sqrt(c * c - a * a);

describe("Geometry: Shape and Space (v2)", () => {
  it("validates and has twelve v2 lessons with three-item skill checks", () => {
    expect(validateCourseBundle(bundle).issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(bundle.lessons).toHaveLength(12);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro).toBeDefined();
      expect(lesson.recap).toBeDefined();
      expect(lesson.questionIds).toHaveLength(3);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
    }
  });

  it("measuring-turns: turns in a corner, on a line and round a point", () => {
    const g = "geo-measuring-turns-";
    close(g + "hook", 4 - (2 + 1)); // half-turn = 2 quarters, plus 1; a whole turn is 4
    close(g + "right-angle", 360 / 4);
    close(g + "1", 90 - 35);
    close(g + "2", 180 - 68);
    close(g + "3", 360 - 140);
    close(g + "5", 90 - 27);
    close(g + "check-3", 360 - (100 + 150));
    expect(marked(g + "6")).toEqual(["72° and 108°"]);
    expect(72 + 108).toBe(180);
    expect(42 + 48 === 180 || 95 + 95 === 180).toBe(false);
  });

  it("angles-in-triangles: the angles add to 180", () => {
    const g = "geo-angles-in-triangles-";
    close(g + "hook", 180 - (70 + 50));
    close(g + "quick", 180 - (100 + 30));
    close(g + "1", 180 - (48 + 67));
    close(g + "2", 180 - 90 - 32);
    close(g + "3", (180 - 44) / 2);
    close(g + "5", 180 - (39 + 86));
    close(g + "check-3", (180 - 90) / 2);
    expect(marked(g + "6")).toEqual(["40°, 60°, 80°"]);
    expect(40 + 60 + 80).toBe(180);
    expect(60 + 70 + 80 === 180 || 90 + 90 + 10 === 180).toBe(false);
    expect(marked(g + "4")[0]).toMatch(/^No/);
    expect(90 + 90).toBe(180);
  });

  it("boundary-and-area: perimeter and area of rectangles", () => {
    const g = "geo-boundary-and-area-";
    close(g + "hook", 3 * 5);
    expect(2 * (6 + 4)).toBe(2 * (8 + 2)); // same perimeter, different areas
    expect(6 * 4).not.toBe(8 * 2);
    close(g + "2", 2 * (6 + 4));
    close(g + "3", 6 * 4);
    close(g + "4", 7 * 3);
    // 20 m of fence: length + width = 10; best whole-number rectangle.
    const best = Math.max(...[1, 2, 3, 4, 5].map((w) => w * (10 - w)));
    close(g + "best-garden", best);
    close(g + "5", 54 / 6);
    close(g + "check-3", 2 * (12 + 5));
    expect(marked(g + "6")).toEqual(["Square metres"]);
  });

  it("base-and-height: triangle and parallelogram areas", () => {
    const g = "geo-base-and-height-";
    close(g + "hook", (6 * 4) / 2);
    close(g + "1", (8 * 5) / 2);
    close(g + "3", 8 * 5);
    close(g + "4", (7 * 6) / 2);
    close(g + "flag", (2 * 30) / 10);
    close(g + "5", (2 * 42) / 12);
    close(g + "check-3", 9 * 6);
    expect(marked(g + "quick")).toEqual(["12 cm"]);
    expect(marked(g + "2")).toEqual(["It stays the same"]);
  });

  it("pieces-and-cutouts: add pieces, subtract cutouts, trapezoids", () => {
    const g = "geo-pieces-and-cutouts-";
    close(g + "hook", 10 * 6 - 4 * 3);
    close(g + "1", 9 * 7 - 3 * 2);
    close(g + "4", 12 * 8 - 5 * 3);
    close(g + "patio", 6 * 2 + 2 * 5);
    close(g + "3", ((10 + 6) / 2) * 4);
    close(g + "5", ((13 + 7) / 2) * 5);
    close(g + "check-3", 15 * 10 - 6 * 5);
    expect(marked(g + "6")).toEqual(["Twice"]);
    // A trapezoid is half the parallelogram two copies make.
    expect(marked(g + "quick-half")).toEqual(["It is half"]);
    expect((10 + 6) * 4 / 2).toBe(32);
  });

  it("around-and-inside-circles: radius, diameter, circumference, area", () => {
    const g = "geo-around-and-inside-circles-";
    close(g + "hook", 15 * 2);
    close(g + "1", 2 * 3);
    close(g + "quick", PI * 2);
    close(g + "2", 2 * PI * 3);
    close(g + "3", PI * 3 * 3);
    close(g + "4", PI * (8 / 2) ** 2);
    close(g + "check-1", PI * (10 / 2) ** 2);
    close(g + "check-2", PI * 20);
    // Doubling the radius doubles the circumference and quadruples the area.
    expect((2 * PI * 6) / (2 * PI * 3)).toBeCloseTo(2, 9);
    expect((PI * 36) / (PI * 9)).toBeCloseTo(4, 9);
    expect(marked(g + "5")).toEqual(["Circumference doubles and area quadruples"]);
    expect(marked(g + "6")).toEqual(["Its circumference"]);
  });

  it("same-shape-new-size: one scale factor on every length", () => {
    const g = "geo-same-shape-new-size-";
    close(g + "hook", 3 * (8 / 4));
    close(g + "1", 2 * 3);
    close(g + "2", 3 * 3);
    close(g + "triangle", 5 * (9 / 3));
    close(g + "4", 5 * 0.5);
    close(g + "5", (3 * 200) / 100);
    close(g + "check-1", 6 * 1.5);
    close(g + "check-2", 7 * (12 / 4));
    expect(marked(g + "3")).toEqual(["Double every side length"]);
    // 2 × 6 and 3 × 4 have equal areas and are not similar (2/6 ≠ 3/4).
    expect(2 * 6).toBe(3 * 4);
    expect(2 / 6).not.toBeCloseTo(3 / 4, 9);
  });

  it("when-area-scales: the area factor is the length factor squared", () => {
    const g = "geo-when-area-scales-";
    close(g + "hook", 2 * 2);
    close(g + "quick", 5 * 5);
    close(g + "1", 3 * 2 * 2 * 2);
    close(g + "2", 6 * 3 ** 2);
    close(g + "3", 14 * 4 ** 2);
    close(g + "5", Math.sqrt(9));
    close(g + "6", 20 * 0.5 ** 2);
    close(g + "check-3", 3 * 10 ** 2);
    close(g + "check-4", Math.sqrt(16));
    // Only the width doubles: (2w) × h = 2 × (w × h).
    expect(marked(g + "4")).toEqual(["2"]);
    expect((2 * 5 * 3) / (5 * 3)).toBe(2);
  });

  it("right-triangle-distances: a² + b² = c²", () => {
    const g = "geo-right-triangle-distances-";
    expect(marked(g + "hook")[0]).toMatch(/^The shortcut is shorter/);
    expect(hyp(3, 4)).toBeLessThan(3 + 4);
    close(g + "1", hyp(5, 12));
    close(g + "3", hyp(6, 8));
    close(g + "try", hyp(8, 15));
    close(g + "5", leg(25, 7));
    close(g + "6", hyp(9, 12));
    close(g + "check-1", hyp(20, 21));
    close(g + "check-2", leg(10, 6));
    expect(marked(g + "2")).toEqual(["The side opposite the right angle"]);
    expect(marked(g + "4")).toEqual(["√(c² − a²)"]);
  });

  it("distance-on-a-grid: coordinate differences as legs", () => {
    const g = "geo-distance-on-a-grid-";
    close(g + "hook", Math.abs(4 - 1) + Math.abs(6 - 2));
    close(g + "1", Math.abs(4 - 1));
    close(g + "2", Math.abs(6 - 2));
    close(g + "3", hyp(4 - 1, 6 - 2));
    close(g + "try", hyp(7 - 0, 25 - 1));
    close(g + "5", hyp(5 - -3, 7 - 1));
    close(g + "6", hyp(2 - -3, 8 - -4));
    close(g + "check-3", hyp(12, 16));
    expect(marked(g + "4")).toEqual(["It stays the same"]);
    // Translating both points leaves both differences, and so the distance, unchanged.
    expect(hyp(6 - 3, 7 - 3)).toBe(hyp(4 - 1, 6 - 2));
  });

  it("filling-space: volume of boxes and cubes", () => {
    const g = "geo-filling-space-";
    close(g + "hook", 5 * 2 * 3);
    close(g + "1", 4 * 3 * 2);
    close(g + "2", 4 * 3 * 5);
    close(g + "try", 7 * 3 * 2);
    close(g + "6", 120 / (6 * 4));
    close(g + "4", 6 ** 3);
    close(g + "5", 8 * 5 * 4);
    close(g + "check-1", 5 ** 3);
    close(g + "check-2", 90 / (10 * 3));
    expect(marked(g + "3")).toEqual(["Cubic centimetres"]);
  });

  it("unfolding-surface-area: faces of a box, with and without a lid", () => {
    const g = "geo-unfolding-surface-area-";
    const surface = (l: number, w: number, h: number) => 2 * (l * w + l * h + w * h);
    close(g + "hook", 6 * 3 * 3);
    close(g + "1", 3 * 2);
    close(g + "2", surface(5, 3, 2));
    close(g + "3", surface(5, 3, 2) - 5 * 3);
    close(g + "5", 6 * 4 * 4);
    close(g + "6", surface(5, 3, 2) * 2 ** 2);
    expect(surface(10, 6, 4)).toBe(surface(5, 3, 2) * 4); // doubling every length
    close(g + "check-1", surface(6, 4, 1));
    expect(marked(g + "4")).toEqual(["Surface area multiplies by 4 and volume by 8"]);
    expect((10 * 6 * 4) / (5 * 3 * 2)).toBe(8); // volume multiplies by 2³
  });

  it("gives no misconception the key", () => {
    for (const item of bundle.questions.filter((q) => q.id.startsWith("geo-"))) {
      if (item.answerAuthority.kind !== "numeric") continue;
      for (const misconception of item.misconceptions ?? []) {
        expect(misconception.match.numeric ?? []).not.toContain(item.answerAuthority.value);
      }
    }
  });
});
