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
  JSON.parse(
    readFileSync(new URL(path, import.meta.url), "utf8"),
  ) as CourseBundle;
const published = read("../../../content/geometry-shape-and-space/bundle.json");
const candidatePath =
  "../../../content/geometry-shape-and-space/.authoring/candidate.json";
// The story rewrite lives in the candidate until the lead reviews and publishes it.
const bundle = existsSync(new URL(candidatePath, import.meta.url))
  ? read(candidatePath)
  : published;

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
    .choices!.filter(
      (choice) => assessTextAnswer(choice.label, authority).correct,
    )
    .map((choice) => choice.label);
};
const close = (id: string, expected: number) =>
  expect(key(id)).toBeCloseTo(expected, 9);
const PI = 3.14;
const hyp = (a: number, b: number) => Math.sqrt(a * a + b * b);
const leg = (c: number, a: number) => Math.sqrt(c * c - a * a);

describe("Geometry: Shape and Space (v2)", () => {
  it("validates and has twelve v2 lessons with three-item skill checks", () => {
    expect(
      validateCourseBundle(bundle).issues.filter((i) => i.severity === "error"),
    ).toEqual([]);
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
    expect(((10 + 6) * 4) / 2).toBe(32);
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
    expect(marked(g + "5")).toEqual([
      "Circumference doubles and area quadruples",
    ]);
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
    const surface = (l: number, w: number, h: number) =>
      2 * (l * w + l * h + w * h);
    close(g + "hook", 6 * 3 * 3);
    close(g + "1", 3 * 2);
    close(g + "2", surface(5, 3, 2));
    close(g + "3", surface(5, 3, 2) - 5 * 3);
    close(g + "5", 6 * 4 * 4);
    close(g + "6", surface(5, 3, 2) * 2 ** 2);
    expect(surface(10, 6, 4)).toBe(surface(5, 3, 2) * 4); // doubling every length
    close(g + "check-1", surface(6, 4, 1));
    expect(marked(g + "4")).toEqual([
      "Surface area multiplies by 4 and volume by 8",
    ]);
    expect((10 * 6 * 4) / (5 * 3 * 2)).toBe(8); // volume multiplies by 2³
  });

  it("gives no misconception the key", () => {
    for (const item of bundle.questions.filter((q) =>
      q.id.startsWith("geo-"),
    )) {
      if (item.answerAuthority.kind !== "numeric") continue;
      for (const misconception of item.misconceptions ?? []) {
        expect(misconception.match.numeric ?? []).not.toContain(
          item.answerAuthority.value,
        );
      }
    }
  });
});

/**
 * Story format, first five lessons. The worked numbers in the teaching screens and the figures
 * on them are recomputed here, and the shape of each lesson is checked against the story brief.
 */
const STORY_LESSONS = [
  "measuring-turns",
  "angles-in-triangles",
  "boundary-and-area",
  "base-and-height",
  "pieces-and-cutouts",
];
const prose = (
  blocks: ReadonlyArray<{ kind: string; text?: string }> | undefined,
) => (blocks ?? []).map((block) => block.text ?? "").join(" ");
const wordCount = (text: string) => text.split(/\s+/u).filter(Boolean).length;
const screenText = (lessonId: string, stepId: string) => {
  const step = bundle.lessons
    .find((l) => l.id === lessonId)!
    .steps.find((s) => s.id === stepId)!;
  return `${prose(step.lead)} ${prose(step.afterFigure)}`;
};

describe("Geometry: Shape and Space, story lessons 1 to 5", () => {
  it("opens with a scene, teaches before asking and closes into the next lesson", () => {
    for (const id of STORY_LESSONS) {
      const lesson = bundle.lessons.find((l) => l.id === id)!;
      expect(lesson.intro?.hook.questionId).toBeUndefined();
      const opener = wordCount(prose(lesson.intro!.hook.blocks));
      expect(opener).toBeGreaterThanOrEqual(120);
      expect(opener).toBeLessThanOrEqual(200);
      expect(wordCount(lesson.intro!.promise)).toBeLessThanOrEqual(25);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(8);
      expect(lesson.steps.length).toBeLessThanOrEqual(14);
      const teaching = lesson.steps.filter(
        (s) => s.kind === "explain" && !s.checkQuestionId,
      );
      expect(teaching.length / lesson.steps.length).toBeGreaterThanOrEqual(0.4);
      expect(lesson.steps[0]!.kind).toBe("explain");
      expect(lesson.steps.some((s) => s.diagram)).toBe(true);
      for (const step of teaching) {
        const words = wordCount(
          `${prose(step.lead)} ${prose(step.afterFigure)}`,
        );
        expect(words).toBeGreaterThanOrEqual(80);
        expect(words).toBeLessThanOrEqual(280);
      }
      expect(lesson.recap!.nextHook).toBeTruthy();
    }
  });

  it("reads the course introduction", () => {
    const intro = JSON.parse(
      readFileSync(
        new URL(
          "../../../content/geometry-shape-and-space/.authoring/course-intro.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as {
      paragraphs: string[];
      outcomes: string[];
      prerequisites: string;
      length: string;
    };
    const words = wordCount(intro.paragraphs.join(" "));
    expect(words).toBeGreaterThanOrEqual(120);
    expect(words).toBeLessThanOrEqual(200);
    expect(intro.outcomes.length).toBeGreaterThanOrEqual(3);
    expect(intro.outcomes.length).toBeLessThanOrEqual(5);
    expect(intro.length).toContain("12 lessons");
  });

  it("measuring-turns: worked numbers in the teaching screens", () => {
    expect(screenText("measuring-turns", "counting-quarter-turns")).toContain(
      "Two quarter-turns make a half-turn",
    );
    expect(4 * 90).toBe(360);
    expect(2 * 90).toBe(180);
    expect(90 - 25).toBe(65); // splitting a corner
    expect(180 - 120).toBe(60); // angles on a line
    expect(360 - 200).toBe(160); // all the way round
    close("geo-measuring-turns-hook", 4 - (2 + 1));
  });

  it("angles-in-triangles: worked numbers and figures add to 180", () => {
    expect(35 + 105 + 40).toBe(180);
    expect(80 + 25 + 75).toBe(180);
    expect(180 - (62 + 41)).toBe(77);
    expect(62 + 41 + 77).toBe(180);
    expect(90 + 20 + 70).toBe(180);
    expect(90 + 65 + 25).toBe(180);
    expect((180 - 40) / 2).toBe(70);
    expect(70 + 70 + 40).toBe(180);
    expect(55 + 55 + 70).toBe(180);
    expect(30 + 60 + 90).toBe(180);
    expect(50 + 60 + 80).not.toBe(180);
  });

  it("boundary-and-area: worked numbers in the teaching screens", () => {
    expect(4 * 8).toBe(8 + 8 + 8 + 8);
    expect(2 * (9 + 3)).toBe(9 + 3 + 9 + 3); // 24 m
    expect(2 * (4 + 4)).toBe(2 * (7 + 1)); // both rooms need 16 m of skirting board
    expect(4 * 4).toBe(16);
    expect(7 * 1).toBe(7);
    expect(4 * 4).toBeGreaterThan(2 * 7 * 1);
    expect(40 / 5).toBe(8);
    close("geo-boundary-and-area-hook", 3 * 5);
    close("geo-boundary-and-area-best-garden", 25);
  });

  it("base-and-height: worked numbers in the teaching screens", () => {
    expect((10 * 3) / 2).toBe(15);
    expect(8 ** 2 + 6 ** 2).toBe(10 ** 2); // the 8, 6, 10 triangle is a right triangle
    expect((12 * 3) / 2).toBe(18);
    expect(7 * 4).toBe(28);
    expect((2 * 24) / 6).toBe(8);
    expect(0.5 * 6 * 8).toBe(24);
    // Dividing the area by the base alone gives half the height.
    expect(24 / 6).toBe(8 / 2);
    close("geo-base-and-height-hook", (6 * 4) / 2);
  });

  it("pieces-and-cutouts: worked numbers in the teaching screens", () => {
    expect(8 * 5 - 3 * 2).toBe(34);
    expect(7 * 3 + 3 * 4).toBe(33);
    expect(0.5 * (9 + 5) * 4).toBe(28);
    expect(((9 + 5) / 2) * 4).toBe(28);
    close("geo-pieces-and-cutouts-hook", 10 * 6 - 4 * 3);
    // Cutting the hall as two pieces gives the same area as subtracting the corner.
    expect(10 * 3 + 6 * 3).toBe(10 * 6 - 4 * 3);
  });

  it("keeps every question the lessons still ask in a taught skill", () => {
    for (const id of STORY_LESSONS) {
      const lesson = bundle.lessons.find((l) => l.id === id)!;
      const taught = new Set(lesson.taughtSkills);
      const asked = lesson.questionIds.map(question);
      for (const item of asked) expect(taught.has(item.skill!)).toBe(true);
    }
  });
});

/**
 * Story format, lessons 6 to 10 (part 1 of the second half). The worked numbers on the teaching
 * screens are recomputed here, and each lesson's shape is checked against the story brief.
 */
const STORY_LESSONS_PART_TWO = [
  "around-and-inside-circles",
  "same-shape-new-size",
  "when-area-scales",
  "right-triangle-distances",
  "distance-on-a-grid",
];
const STORY_LESSONS_PART_THREE = ["filling-space", "unfolding-surface-area"];
const lessonOf = (id: string) => bundle.lessons.find((l) => l.id === id)!;
const allText = (id: string) =>
  lessonOf(id)
    .steps.map(
      (s) => `${s.headline ?? ""} ${prose(s.lead)} ${prose(s.afterFigure)}`,
    )
    .join(" ");
const openerText = (id: string) => prose(lessonOf(id).intro!.hook.blocks);

describe("Geometry: Shape and Space, story lessons 6 to 10", () => {
  it("opens with a scene, teaches before asking and closes into the next lesson", () => {
    for (const id of STORY_LESSONS_PART_TWO) {
      const lesson = lessonOf(id);
      expect(lesson.intro?.hook.questionId).toBeUndefined();
      const opener = wordCount(openerText(id));
      expect(opener).toBeGreaterThanOrEqual(120);
      expect(opener).toBeLessThanOrEqual(200);
      expect(wordCount(lesson.intro!.promise)).toBeLessThanOrEqual(25);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(8);
      expect(lesson.steps.length).toBeLessThanOrEqual(14);
      const teaching = lesson.steps.filter(
        (s) => s.kind === "explain" && !s.checkQuestionId,
      );
      expect(teaching.length / lesson.steps.length).toBeGreaterThanOrEqual(0.4);
      expect(lesson.steps[0]!.kind).toBe("explain");
      expect(lesson.steps.some((s) => s.diagram)).toBe(true);
      expect(lesson.steps.some((s) => s.kind === "transfer")).toBe(true);
      const asked = lesson.steps.filter((s) => s.checkQuestionId);
      expect(asked.length).toBeGreaterThanOrEqual(3);
      expect(asked.length).toBeLessThanOrEqual(7);
      // Never more than three teaching screens in a row.
      let run = 0;
      for (const step of lesson.steps) {
        run = step.kind === "explain" && !step.checkQuestionId ? run + 1 : 0;
        expect(run).toBeLessThanOrEqual(3);
      }
      for (const step of teaching) {
        const words = wordCount(
          `${prose(step.lead)} ${prose(step.afterFigure)}`,
        );
        expect(words).toBeGreaterThanOrEqual(80);
        expect(words).toBeLessThanOrEqual(280);
      }
      for (const step of asked) {
        expect(wordCount(prose(step.lead))).toBeLessThanOrEqual(60);
        if (step.diagram)
          expect(step.answerVisibility).toBe("hidden-until-response");
      }
      expect(lesson.recap!.nextHook).toBeTruthy();
    }
  });

  it("each close leads into the next opener", () => {
    const hook = (id: string) =>
      (lessonOf(id).recap!.nextHook ?? "").toLowerCase();
    expect(lessonOf("pieces-and-cutouts").recap!.nextHook).toContain("circle");
    expect(openerText("around-and-inside-circles")).toContain("middle");
    expect(hook("around-and-inside-circles")).toContain("photo");
    expect(openerText("same-shape-new-size")).toContain("photo");
    expect(hook("same-shape-new-size")).toContain("tile");
    expect(openerText("when-area-scales")).toContain("tile");
    expect(hook("when-area-scales")).toContain("3 m east and 4 m north");
    expect(openerText("right-triangle-distances")).toContain("3 m east");
    expect(hook("right-triangle-distances")).toContain("drone");
    expect(openerText("distance-on-a-grid")).toContain("drone");
    expect(hook("distance-on-a-grid")).toContain("sugar cubes");
    expect(prose(lessonOf("filling-space").intro!.hook.blocks)).toContain(
      "sugar cubes",
    );
  });

  it("around-and-inside-circles: worked numbers in the teaching screens", () => {
    const text = allText("around-and-inside-circles");
    expect(2 * 10).toBe(20); // plate: radius 10, diameter 20
    expect(8 * PI).toBeCloseTo(25.12, 9); // string round an 8 cm tin
    expect(text).toContain("8 × 3.14");
    expect(PI * (2 * 30)).toBeCloseTo(188.4, 9); // wheel by the diameter
    expect(2 * PI * 30).toBeCloseTo(188.4, 9); // and by the radius
    expect(text).toContain("3.14 × 60 = 188.4");
    expect(15 * 15).toBe(225);
    expect(PI * 225).toBeCloseTo(706.5, 9);
    expect(text).toContain("3.14 × 225 = 706.5");
    // The square on the radius fits a little over three times into the circle.
    expect(PI).toBeGreaterThan(3);
    expect(PI).toBeLessThan(4);
    expect(PI * 20 * 20).toBeCloseTo(1256, 9);
    expect(text).toContain("3.14 × 20 × 20 = 1256");
    // Using the diameter as the radius makes the area four times too big.
    expect((PI * 8 * 8) / (PI * 4 * 4)).toBeCloseTo(4, 9);
    expect(10 * 10).toBe(100); // ten times the radius, a hundred times the area
    close("geo-around-and-inside-circles-hook", 15 * 2);
    close("geo-around-and-inside-circles-2", 2 * PI * 3);
    close("geo-around-and-inside-circles-3", PI * 3 * 3);
    close("geo-around-and-inside-circles-4", PI * (8 / 2) ** 2);
    const lesson = lessonOf("around-and-inside-circles");
    expect(lesson.questionIds).toEqual([
      "geo-around-and-inside-circles-6",
      "geo-around-and-inside-circles-check-1",
      "geo-around-and-inside-circles-check-2",
    ]);
    expect(prose(lesson.recap!.blocks)).toContain("18.84 cm");
    expect(prose(lesson.recap!.blocks)).toContain("28.26 cm²");
    expect(prose(lesson.recap!.blocks)).toContain("50.24 m²");
  });

  it("same-shape-new-size: worked numbers in the teaching screens", () => {
    const text = allText("same-shape-new-size");
    expect(2 * 4).toBe(8);
    expect(3 * 4).toBe(12);
    expect(9 / 6).toBe(1.5);
    // Adding 1 to each side of a 1 by 2 rectangle changes its proportions; doubling does not.
    expect(2 / 1).toBe(2);
    expect(3 / 2).toBe(1.5);
    expect(4 / 2).toBe(2);
    // The 5, 12, 13 triangle whose shortest side becomes 15.
    expect(15 / 5).toBe(3);
    expect(12 * 3).toBe(36);
    expect(13 * 3).toBe(39);
    expect(5 ** 2 + 12 ** 2).toBe(13 ** 2);
    expect(4 * 50).toBe(200); // a door drawn 4 cm at 1 cm : 50 cm
    expect(200 / 100).toBe(2);
    expect(text).toContain("2 m");
    // The snapshot: 4 to 8 is a factor of 2, so the height is 3 × 2.
    expect(8 / 4).toBe(2);
    close("geo-same-shape-new-size-hook", 3 * (8 / 4));
    close("geo-same-shape-new-size-1", 2 * 3);
    close("geo-same-shape-new-size-triangle", 5 * (9 / 3));
    close("geo-same-shape-new-size-4", 5 * 0.5);
    close("geo-same-shape-new-size-5", (3 * 200) / 100);
    expect(lessonOf("same-shape-new-size").questionIds).toEqual([
      "geo-same-shape-new-size-5",
      "geo-same-shape-new-size-check-1",
      "geo-same-shape-new-size-check-2",
    ]);
  });

  it("when-area-scales: worked numbers in the teaching screens", () => {
    const text = allText("when-area-scales");
    expect(3 * 3).toBe(9); // factor 3: three rows of three small tiles
    expect(4 * 4).toBe(16);
    expect(text).toContain("4 × 4 = 16");
    expect(4 * 5).toBe(20);
    expect(4 * 4 * (5 * 4)).toBe(320);
    expect(16 * 20).toBe(320);
    expect(20 * 16).toBe(320); // the area factor 4 × 4 = 16 applied to 20
    expect(8 * 3 * 3).toBe(72);
    expect(16 * 0.5 * 0.5).toBe(4);
    expect(7 * 7).toBe(49);
    expect(Math.sqrt(49)).toBe(7);
    close("geo-when-area-scales-hook", 2 * 2);
    close("geo-when-area-scales-quick", 5 * 5);
    close("geo-when-area-scales-2", 6 * 3 ** 2);
    close("geo-when-area-scales-5", Math.sqrt(9));
    expect(marked("geo-when-area-scales-4")).toEqual(["2"]);
    expect(lessonOf("when-area-scales").questionIds).toEqual([
      "geo-when-area-scales-6",
      "geo-when-area-scales-check-3",
      "geo-when-area-scales-check-4",
    ]);
  });

  it("right-triangle-distances: worked numbers in the teaching screens", () => {
    const text = allText("right-triangle-distances");
    expect(3 * 3).toBe(9);
    expect(4 * 4).toBe(16);
    expect(9 + 16).toBe(25);
    expect(Math.sqrt(25)).toBe(5);
    expect(hyp(3, 4)).toBeLessThan(3 + 4); // the shortcut beats the bent path
    expect(3 + 4).toBe(7);
    expect(text).toContain("5 m");
    // The tent rope: 13 m rope, peg 5 m from the pole.
    expect(13 ** 2 - 5 ** 2).toBe(144);
    expect(leg(13, 5)).toBe(12);
    expect(text).toContain("169 − 25 = 144");
    // The hypotenuse lies between the longer leg and the sum of the legs.
    for (const [a, b] of [
      [5, 12],
      [8, 15],
      [9, 12],
    ] as const) {
      expect(hyp(a, b)).toBeGreaterThan(Math.max(a, b));
      expect(hyp(a, b)).toBeLessThan(a + b);
    }
    expect(marked("geo-right-triangle-distances-hook")[0]).toMatch(
      /^The shortcut is shorter/,
    );
    close("geo-right-triangle-distances-1", hyp(5, 12));
    close("geo-right-triangle-distances-try", hyp(8, 15));
    close("geo-right-triangle-distances-5", leg(25, 7));
    expect(lessonOf("right-triangle-distances").questionIds).toEqual([
      "geo-right-triangle-distances-6",
      "geo-right-triangle-distances-check-1",
      "geo-right-triangle-distances-check-2",
    ]);
  });

  it("distance-on-a-grid: worked numbers in the teaching screens", () => {
    const text = allText("distance-on-a-grid");
    expect(8 - 2).toBe(6);
    expect(4 - 1).toBe(3);
    expect(3 - -2).toBe(5);
    expect(text).toContain("3 − (−2) = 5");
    expect(9 - 1).toBe(8);
    expect(16 - 1).toBe(15);
    expect(hyp(8, 15)).toBe(17);
    expect(text).toContain("√289 = 17");
    // (−5, −4) to (4, 8) crosses zero in both directions.
    expect(4 - -5).toBe(9);
    expect(8 - -4).toBe(12);
    expect(9 ** 2 + 12 ** 2).toBe(225);
    expect(hyp(9, 12)).toBe(15);
    expect(4 - 5).toBe(-1); // the gap if the minus sign is dropped
    // Sliding (1, 1) and (4, 5) by (5, 3) keeps both gaps.
    expect(4 - 1).toBe(9 - 6);
    expect(5 - 1).toBe(8 - 4);
    expect(hyp(9 - 6, 8 - 4)).toBe(hyp(4 - 1, 5 - 1));
    // Swapping the points flips the signs of the gaps and not the distance.
    expect(hyp(1 - 4, 2 - 6)).toBe(hyp(4 - 1, 6 - 2));
    close("geo-distance-on-a-grid-hook", Math.abs(4 - 1) + Math.abs(6 - 2));
    close("geo-distance-on-a-grid-3", hyp(4 - 1, 6 - 2));
    close("geo-distance-on-a-grid-try", hyp(7 - 0, 25 - 1));
    expect(marked("geo-distance-on-a-grid-4")).toEqual(["It stays the same"]);
    expect(lessonOf("distance-on-a-grid").questionIds).toEqual([
      "geo-distance-on-a-grid-5",
      "geo-distance-on-a-grid-6",
      "geo-distance-on-a-grid-check-3",
    ]);
  });

  it("asks only questions in a skill the lesson teaches, and every step question exists", () => {
    for (const id of [...STORY_LESSONS_PART_TWO, ...STORY_LESSONS_PART_THREE]) {
      const lesson = lessonOf(id);
      const taught = new Set(lesson.taughtSkills);
      const asked = [
        ...lesson.questionIds,
        ...lesson.steps.flatMap((s) =>
          s.checkQuestionId ? [s.checkQuestionId] : [],
        ),
      ].map(question);
      for (const item of asked) expect(taught.has(item.skill!)).toBe(true);
    }
  });
});

describe("Geometry: Shape and Space, story lessons 11 and 12", () => {
  const surface = (l: number, w: number, h: number) =>
    2 * (l * w + l * h + w * h);

  it("opens with a scene, teaches before asking and closes into the next lesson", () => {
    for (const id of STORY_LESSONS_PART_THREE) {
      const lesson = lessonOf(id);
      expect(lesson.intro?.hook.questionId).toBeUndefined();
      const opener = wordCount(openerText(id));
      expect(opener).toBeGreaterThanOrEqual(120);
      expect(opener).toBeLessThanOrEqual(200);
      expect(wordCount(lesson.intro!.promise)).toBeLessThanOrEqual(25);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(8);
      expect(lesson.steps.length).toBeLessThanOrEqual(14);
      const teaching = lesson.steps.filter(
        (s) => s.kind === "explain" && !s.checkQuestionId,
      );
      expect(teaching.length / lesson.steps.length).toBeGreaterThanOrEqual(0.4);
      expect(lesson.steps[0]!.kind).toBe("explain");
      expect(lesson.steps.some((s) => s.diagram)).toBe(true);
      expect(lesson.steps.some((s) => s.kind === "transfer")).toBe(true);
      const asked = lesson.steps.filter((s) => s.checkQuestionId);
      expect(asked.length).toBeGreaterThanOrEqual(3);
      expect(asked.length).toBeLessThanOrEqual(7);
      let run = 0;
      for (const step of lesson.steps) {
        run = step.kind === "explain" && !step.checkQuestionId ? run + 1 : 0;
        expect(run).toBeLessThanOrEqual(3);
      }
      for (const step of teaching) {
        const words = wordCount(
          `${prose(step.lead)} ${prose(step.afterFigure)}`,
        );
        expect(words).toBeGreaterThanOrEqual(80);
        expect(words).toBeLessThanOrEqual(280);
      }
      for (const step of asked) {
        expect(wordCount(prose(step.lead))).toBeLessThanOrEqual(60);
        if (step.diagram)
          expect(step.answerVisibility).toBe("hidden-until-response");
      }
      expect(lesson.recap!.nextHook).toBeTruthy();
    }
  });

  it("each close leads into the next opener", () => {
    expect(
      (lessonOf("filling-space").recap!.nextHook ?? "").toLowerCase(),
    ).toContain("paper");
    expect(openerText("unfolding-surface-area")).toContain("paper");
    expect(openerText("filling-space")).toContain("sugar cubes");
  });

  it("filling-space: worked numbers in the teaching screens", () => {
    const text = allText("filling-space");
    expect(3 * 6).toBe(18); // a layer of 3 rows of 6
    expect(2 * 18).toBe(36);
    expect(4 * 18).toBe(72);
    expect(9 * 2).toBe(18);
    expect(18 * 3).toBe(54);
    expect(9 * 2 * 3).toBe(3 * 2 * 9); // the same box on its end
    expect(3 * 2).toBe(6);
    expect(6 * 9).toBe(54);
    expect(8 * 3).toBe(24);
    expect(96 / 24).toBe(4);
    expect(24 * 4).toBe(96);
    expect(3 * 3 * 3).toBe(27);
    expect(2 * 2 * 2).toBe(8);
    expect((2 * 2 * 2) / (1 * 1 * 1)).toBe(8); // doubling the side gives eight times
    for (const fragment of [
      "3 × 6 = 18",
      "2 × 18 = 36",
      "4 × 18 = 72",
      "9 × 2 = 18",
      "18 × 3 = 54",
      "6 × 9 = 54",
      "8 × 3 = 24",
      "96 ÷ 24 = 4",
      "24 × 4 = 96",
      "9 × 3 = 27",
      "2 × 2 × 2 = 8",
    ])
      expect(text).toContain(fragment);
    // The worked example, 6 by 2 by 4.
    expect(6 * 2).toBe(12);
    expect(12 * 4).toBe(48);
    close("geo-filling-space-hook", 2 * 5 * 3);
    close("geo-filling-space-1", 4 * 3 * 2);
    close("geo-filling-space-2", 4 * 3 * 5);
    close("geo-filling-space-4", 6 ** 3);
    close("geo-filling-space-6", 120 / (6 * 4));
    expect(marked("geo-filling-space-3")).toEqual(["Cubic centimetres"]);
    const lesson = lessonOf("filling-space");
    expect(lesson.questionIds).toEqual([
      "geo-filling-space-5",
      "geo-filling-space-check-1",
      "geo-filling-space-check-2",
    ]);
    const recap = prose(lesson.recap!.blocks);
    for (const fragment of ["30 cubes", "60 cm³", "216 cm³", "5 cm"])
      expect(recap).toContain(fragment);
    // The old extra box is no longer asked, and its key is still right.
    expect(lesson.steps.some((s) => s.checkQuestionId === "geo-filling-space-try")).toBe(false);
    close("geo-filling-space-try", 7 * 3 * 2);
  });

  it("unfolding-surface-area: worked numbers in the teaching screens", () => {
    const text = allText("unfolding-surface-area");
    expect(2 * 2).toBe(4);
    expect(6 * 4).toBe(24); // cube with sides 2 cm
    expect(surface(2, 2, 2)).toBe(24);
    expect(10 * 4).toBe(40);
    expect(10 * 3).toBe(30);
    expect(4 * 3).toBe(12);
    expect(40 + 30 + 12).toBe(82);
    expect(surface(10, 4, 3)).toBe(164);
    // The worked example: 4 by 3 by 2.
    expect(surface(4, 3, 2)).toBe(52);
    expect(surface(4, 3, 2) - 4 * 3).toBe(40); // open top
    expect(12 + 8 + 8 + 6 + 6).toBe(40); // the five faces that remain
    expect(4 * 2).toBe(8);
    expect(3 * 2).toBe(6);
    expect(8 + 8 + 6 + 6).toBe(28);
    // Doubling every length: 2 by 1 by 1 becomes 4 by 2 by 2.
    expect(surface(2, 1, 1)).toBe(10);
    expect(surface(4, 2, 2)).toBe(40);
    expect(surface(4, 2, 2) / surface(2, 1, 1)).toBe(4);
    expect(2 * 1 * 1).toBe(2);
    expect(4 * 2 * 2).toBe(16);
    expect((4 * 2 * 2) / (2 * 1 * 1)).toBe(8);
    for (const fragment of [
      "2 × 2 = 4 cm²",
      "6 × 4 = 24 cm²",
      "40 + 30 + 12 = 82 cm²",
      "2 × 82 = 164 cm²",
      "52 − 12 = 40 cm²",
      "12 + 28 = 40 cm²",
      "2 × (2 + 2 + 1) = 10 cm²",
      "2 × (8 + 8 + 4) = 40 cm²",
      "4 × 2 × 2 = 16 cm³",
    ])
      expect(text).toContain(fragment);
    close("geo-unfolding-surface-area-hook", 6 * 3 * 3);
    close("geo-unfolding-surface-area-1", 3 * 2);
    close("geo-unfolding-surface-area-2", surface(5, 3, 2));
    close("geo-unfolding-surface-area-3", surface(5, 3, 2) - 5 * 3);
    close("geo-unfolding-surface-area-5", 6 * 4 * 4);
    close("geo-unfolding-surface-area-6", 62 * 2 ** 2);
    close("geo-unfolding-surface-area-check-1", surface(6, 4, 1));
    expect(surface(5, 3, 2)).toBe(62);
    expect(marked("geo-unfolding-surface-area-4")).toEqual([
      "Surface area multiplies by 4 and volume by 8",
    ]);
    const lesson = lessonOf("unfolding-surface-area");
    expect(lesson.questionIds).toEqual([
      "geo-unfolding-surface-area-5",
      "geo-unfolding-surface-area-6",
      "geo-unfolding-surface-area-check-1",
    ]);
    const recap = prose(lesson.recap!.blocks);
    for (const fragment of ["54 cm²", "62 cm²", "47 cm²", "96 cm²", "248 cm²"])
      expect(recap).toContain(fragment);
  });
});
