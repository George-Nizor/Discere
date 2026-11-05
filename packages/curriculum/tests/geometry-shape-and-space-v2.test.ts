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
// The story rewrite lives in the candidate until the lead reviews and publishes it.
const bundle = published;

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
// The re-authored openers run from about 85 to 135 words and the promises up to 30.
const OPENER_WORDS = { min: 80, max: 200 };
const PROMISE_WORDS_MAX = 30;
const prose = (blocks: ReadonlyArray<{ kind: string; text?: string }> | undefined) =>
  (blocks ?? []).map((block) => block.text ?? "").join(" ");
const wordCount = (text: string) => text.split(/\s+/u).filter(Boolean).length;
const screenText = (lessonId: string, stepId: string) => {
  const step = bundle.lessons.find((l) => l.id === lessonId)!.steps.find((s) => s.id === stepId)!;
  return `${prose(step.lead)} ${prose(step.afterFigure)}`;
};

describe("Geometry: Shape and Space, story lessons 1 to 5", () => {
  it("opens with a scene, teaches before asking and closes into the next lesson", () => {
    for (const id of STORY_LESSONS) {
      const lesson = bundle.lessons.find((l) => l.id === id)!;
      expect(lesson.intro?.hook.questionId).toBeUndefined();
      const opener = wordCount(prose(lesson.intro!.hook.blocks));
      expect(opener).toBeGreaterThanOrEqual(OPENER_WORDS.min);
      expect(opener).toBeLessThanOrEqual(OPENER_WORDS.max);
      expect(wordCount(lesson.intro!.promise)).toBeLessThanOrEqual(PROMISE_WORDS_MAX);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(8);
      expect(lesson.steps.length).toBeLessThanOrEqual(14);
      const teaching = lesson.steps.filter((s) => s.kind === "explain" && !s.checkQuestionId);
      expect(teaching.length / lesson.steps.length).toBeGreaterThanOrEqual(0.4);
      expect(lesson.steps.some((s) => s.diagram)).toBe(true);
      for (const step of teaching) {
        const words = wordCount(`${prose(step.lead)} ${prose(step.afterFigure)}`);
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
    // The quarter-turn screen counts turns in quarters; the old "Two quarter-turns make a
    // half-turn" sentence is now "a half-turn, which is two quarter-turns".
    const quarters = screenText("measuring-turns", "quarter-turns");
    expect(quarters).toContain("which is two quarter-turns");
    expect(quarters).toContain("four quarter-turns always make a whole turn");
    expect(4 * 90).toBe(360);
    expect(360 / 2).toBe(180);
    expect(360 / 4).toBe(90);
    // "divides exactly by every whole number from 1 to 10 except 7"
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((n) => 360 % n !== 0)).toEqual([7]);
    const text = allText("measuring-turns");
    expect(text).toContain("360 equal parts");
    expect(90 - 25).toBe(65); // splitting a corner
    expect(90 - 70).toBe(20);
    expect(180 - 120).toBe(60); // angles on a line
    expect(180 - 50).toBe(130);
    expect(360 - 200).toBe(160); // all the way round
    for (const fragment of [
      "90° − 25° = 65°",
      "90° − 70° = 20°",
      "180° − 120° = 60°",
      "180° − 50° = 130°",
      "360° − 200° = 160°",
    ])
      expect(text).toContain(fragment);
    close("geo-measuring-turns-hook", 4 - (2 + 1));
  });

  it("angles-in-triangles: worked numbers and figures add to 180", () => {
    const text = allText("angles-in-triangles");
    expect(35 + 105 + 40).toBe(180);
    expect(80 + 25 + 75).toBe(180);
    expect(62 + 41).toBe(103);
    expect(180 - (62 + 41)).toBe(77);
    expect(62 + 41 + 77).toBe(180);
    expect(180 - 90).toBe(90); // the two acute angles of a right triangle
    expect(180 - 90 - 20).toBe(70);
    expect(90 + 20 + 70).toBe(180);
    expect(180 - 90 - 65).toBe(25);
    expect(90 + 65 + 25).toBe(180);
    expect(180 - 40).toBe(140); // isosceles with an odd angle of 40
    expect(140 / 2).toBe(70);
    expect(70 + 70 + 40).toBe(180);
    expect(180 - 80).toBe(100); // and with an odd angle of 80
    expect(100 / 2).toBe(50);
    expect(50 + 50 + 80).toBe(180);
    expect(30 + 60 + 90).toBe(180); // can three angles make a triangle
    expect(50 + 60 + 80).toBe(190);
    expect(190 - 180).toBe(10); // runs 10° past the line
    expect(40 + 60 + 70).toBe(170);
    expect(180 - 170).toBe(10); // leaves a gap of 10°
    for (const fragment of [
      "35° + 105° + 40° = 180°",
      "80° + 25° + 75° = 180°",
      "62° + 41° = 103°",
      "180° − 103° = 77°",
      "180° − 90° = 90°",
      "180° − 90° − 20° = 70°",
      "90° and 65° leave 25°",
      "180° − 40° = 140°",
      "140° ÷ 2 = 70°",
      "they share 100° and each is 50°",
      "50°, 60° and 80° totals 190°",
      "40°, 60° and 70° totals 170°",
    ])
      expect(text).toContain(fragment);
  });

  it("boundary-and-area: worked numbers in the teaching screens", () => {
    const text = allText("boundary-and-area");
    expect(5 * 8).toBe(40); // 5 rows of 8 unit squares
    expect(2 * 9).toBe(18);
    expect(9 + 4 + 9 + 4).toBe(2 * (9 + 4)); // 26 units of skirting
    expect(2 * (9 + 4)).toBe(26);
    expect(2 * (7 + 4)).toBe(22);
    // Both rooms of the same-fence figure have a perimeter of 16.
    expect(2 * (4 + 4)).toBe(16);
    expect(2 * (7 + 1)).toBe(16);
    expect(4 * 4).toBe(16);
    expect(7 * 1).toBe(7);
    expect(4 * 4).toBeGreaterThan(2 * 7 * 1); // more than twice the floor
    expect(4 * 4).toBe(8 * 2); // equal areas of 16, different perimeters
    expect(2 * (8 + 2)).toBe(20);
    // The 8 m by 3 m room measured both ways.
    expect(8 + 3 + 8 + 3).toBe(22);
    expect(8 * 3).toBe(24);
    expect(40 / 5).toBe(8);
    expect(8 * 5).toBe(40);
    for (const fragment of [
      "5 × 8 = 40",
      "2 rows of 9, which is 18",
      "9 + 4 + 9 + 4 = 26",
      "7 + 4 + 7 + 4 = 22",
      "perimeter of 16 units",
      "4 × 4 = 16",
      "7 × 1 = 7",
      "perimeters of 16 and 20 units",
      "8 + 3 + 8 + 3 = 22 metres",
      "8 × 3 = 24",
      "40 ÷ 5 = 8 tiles",
      "8 × 5 = 40",
    ])
      expect(text).toContain(fragment);
    close("geo-boundary-and-area-hook", 3 * 5);
    close("geo-boundary-and-area-best-garden", 25);
  });

  it("base-and-height: worked numbers in the teaching screens", () => {
    const text = allText("base-and-height");
    expect(10 * 3).toBe(30);
    expect((10 * 3) / 2).toBe(15);
    expect(12 * 3).toBe(36);
    expect((12 * 3) / 2).toBe(18);
    expect(7 * 4).toBe(28);
    expect(2 * 24).toBe(48);
    expect(48 / 6).toBe(8);
    expect((6 * 8) / 2).toBe(24);
    // Dividing the area by the base alone gives half the height.
    expect(24 / 6).toBe(8 / 2);
    for (const fragment of [
      "10 × 3 = 30",
      "30 ÷ 2 = 15 square units",
      "12 × 3 = 36",
      "the triangle has area 18 square units",
      "both cover 28 square units",
      "2 × 24 = 48",
      "48 ÷ 6 = 8 cm",
      "6 × 8 ÷ 2 = 24",
    ])
      expect(text).toContain(fragment);
    close("geo-base-and-height-hook", (6 * 4) / 2);
  });

  it("pieces-and-cutouts: worked numbers in the teaching screens", () => {
    const text = allText("pieces-and-cutouts");
    expect(8 * 5 - 3 * 2).toBe(34);
    expect(8 * 5 - 3 * 3).toBe(31);
    expect(3 * 4 + 7 * 3).toBe(33);
    expect(7 * 7 - 4 * 4).toBe(33); // the same L, by subtraction
    expect(((9 + 5) / 2) * 4).toBe(28);
    expect(0.5 * (9 + 5) * 4).toBe(28);
    expect((9 + 5) * 4).toBe(56);
    expect(((8 + 4) * 4) / 2).toBe(24);
    expect((9 + 5) / 2).toBe(7); // the line halfway up
    expect(7 * 4).toBe(28);
    for (const fragment of [
      "8 × 5 = 40",
      "3 × 2 = 6",
      "40 − 6 = 34",
      "3 × 3 = 9",
      "40 − 9 = 31",
      "3 × 4 = 12",
      "7 × 3 = 21",
      "49 − 16 = 33",
      "9 + 5 = 14",
      "14 × 4 = 56",
      "8 + 4 = 12",
      "12 × 4 = 48",
      "7 wide and 4 high covers 28 square centimetres",
    ])
      expect(text).toContain(fragment);
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
    .steps.map((s) => `${s.headline ?? ""} ${prose(s.lead)} ${prose(s.afterFigure)}`)
    .join(" ");
const openerText = (id: string) => prose(lessonOf(id).intro!.hook.blocks);

describe("Geometry: Shape and Space, story lessons 6 to 10", () => {
  it("opens with a scene, teaches before asking and closes into the next lesson", () => {
    for (const id of STORY_LESSONS_PART_TWO) {
      const lesson = lessonOf(id);
      expect(lesson.intro?.hook.questionId).toBeUndefined();
      const opener = wordCount(openerText(id));
      expect(opener).toBeGreaterThanOrEqual(OPENER_WORDS.min);
      expect(opener).toBeLessThanOrEqual(OPENER_WORDS.max);
      expect(wordCount(lesson.intro!.promise)).toBeLessThanOrEqual(PROMISE_WORDS_MAX);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(8);
      expect(lesson.steps.length).toBeLessThanOrEqual(14);
      const teaching = lesson.steps.filter((s) => s.kind === "explain" && !s.checkQuestionId);
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
        const words = wordCount(`${prose(step.lead)} ${prose(step.afterFigure)}`);
        expect(words).toBeGreaterThanOrEqual(80);
        expect(words).toBeLessThanOrEqual(280);
      }
      for (const step of asked) {
        expect(wordCount(prose(step.lead))).toBeLessThanOrEqual(60);
        if (step.diagram) expect(step.answerVisibility).toBe("hidden-until-response");
      }
      expect(lesson.recap!.nextHook).toBeTruthy();
    }
  });

  it("each close leads into the next opener", () => {
    const hook = (id: string) => (lessonOf(id).recap!.nextHook ?? "").toLowerCase();
    const opener = (id: string) => openerText(id).toLowerCase();
    // [lesson, word its closing hook names, next lesson, word that lesson's opener picks up]
    const bridges: ReadonlyArray<readonly [string, string, string, string]> = [
      ["measuring-turns", "triangle", "angles-in-triangles", "triangle"],
      ["angles-in-triangles", "inside", "boundary-and-area", "inside"],
      ["boundary-and-area", "triangle", "base-and-height", "triangle"],
      ["base-and-height", "rectangles", "pieces-and-cutouts", "rectangles"],
      ["pieces-and-cutouts", "circle", "around-and-inside-circles", "circle"],
      ["around-and-inside-circles", "length", "same-shape-new-size", "length"],
      ["same-shape-new-size", "area", "when-area-scales", "area"],
      ["when-area-scales", "side", "right-triangle-distances", "side"],
      ["right-triangle-distances", "straight-line", "distance-on-a-grid", "straight-line"],
      ["distance-on-a-grid", "box", "filling-space", "box"],
      ["filling-space", "flat", "unfolding-surface-area", "flat"],
    ];
    expect(bridges.map(([from]) => from)).toEqual(
      bundle.lessons.slice(0, -1).map((lesson) => lesson.id),
    );
    bridges.forEach(([from, hookWord, to, openerWord], index) => {
      expect(bundle.lessons[index + 1]!.id).toBe(to);
      expect(hook(from), `${from} close`).toContain(hookWord);
      expect(opener(to), `${to} opener`).toContain(openerWord);
    });
    // The course ends here, so the last lesson deliberately has no next hook.
    expect(bundle.lessons.at(-1)!.recap!.nextHook).toBeUndefined();
  });

  it("around-and-inside-circles: worked numbers in the teaching screens", () => {
    const text = allText("around-and-inside-circles");
    const two = (n: number) => n.toFixed(2);
    expect(2 * 9).toBe(18); // radius 9 gives diameter 18, radius 6 gives 12
    expect(2 * 6).toBe(12);
    expect(text).toContain("radius 9 units has a diameter of 18");
    expect(text).toContain("radius 6 has a diameter of 12");
    // Three diameters fit round the rim with about 0.14 of a diameter left over.
    expect(PI - 3).toBeCloseTo(0.14, 9);
    // Archimedes' bounds, 3 10/71 and 3 1/7, enclose pi.
    expect(3 + 10 / 71).toBeLessThan(Math.PI);
    expect(3 + 1 / 7).toBeGreaterThan(Math.PI);
    expect(text).toContain("3 10/71 and 3 1/7");
    // Circumference of the radius-7 circle, and the half-circle slip.
    expect(2 * PI * 7).toBeCloseTo(43.96, 9);
    expect(PI * 7 * 2).toBeCloseTo(2 * PI * 7, 9);
    expect(PI * 7).toBeCloseTo((2 * PI * 7) / 2, 9);
    expect(text).toContain(`2 × 3.14 × 7 = ${two(2 * PI * 7)} units`);
    // Area of the radius-6 circle.
    expect(6 * 6).toBe(36);
    expect(PI * 36).toBeCloseTo(113.04, 9);
    expect(text).toContain(`3.14 × 6 × 6 = 3.14 × 36 = ${two(PI * 36)}`);
    // The 14 cm circle: circumference by the diameter, area by the halved diameter.
    expect(PI * 14).toBeCloseTo(43.96, 9);
    expect(text).toContain(`3.14 × 14 = ${two(PI * 14)} cm`);
    expect(14 / 2).toBe(7);
    expect(7 * 7).toBe(49);
    expect(PI * 49).toBeCloseTo(153.86, 9);
    expect(text).toContain(`3.14 × 7 × 7 = 3.14 × 49 = ${two(PI * 49)} cm²`);
    // Using the diameter as the radius makes the area four times too big.
    expect(PI * 14 * 14).toBeCloseTo(615.44, 9);
    expect((PI * 14 * 14) / (PI * 7 * 7)).toBeCloseTo(4, 9);
    expect(text).toContain(`3.14 × 14 × 14 = ${two(PI * 14 * 14)} cm²`);
    expect(text).toContain("four times too large");
    // Tripling the radius from 7 to 21: circumference ×3, area ×9.
    expect(2 * PI * 21).toBeCloseTo(131.88, 9);
    expect((2 * PI * 21) / (2 * PI * 7)).toBeCloseTo(3, 9);
    expect(21 * 21).toBe(441);
    expect(PI * 441).toBeCloseTo(1384.74, 9);
    expect((PI * 21 * 21) / (PI * 7 * 7)).toBeCloseTo(9, 9);
    expect(text).toContain(`2 × 3.14 × 21 = ${two(2 * PI * 21)} cm`);
    expect(text).toContain(`3.14 × 21 × 21 = 3.14 × 441 = ${two(PI * 441)} cm²`);
    expect(text).toContain("3 times the 43.96 cm");
    expect(text).toContain("9 times the 153.86 cm²");
    close("geo-around-and-inside-circles-hook", 15 * 2);
    close("geo-around-and-inside-circles-2", 2 * PI * 3);
    close("geo-around-and-inside-circles-3", PI * 3 * 3);
    close("geo-around-and-inside-circles-4", PI * (8 / 2) ** 2);
    const lesson = lessonOf("around-and-inside-circles");
    expect(lesson.questionIds).toEqual([
      "geo-around-and-inside-circles-check-1",
      "geo-around-and-inside-circles-check-2",
      "geo-around-and-inside-circles-6",
    ]);
    // The old recap quoted 18.84 cm, 28.26 cm² and 50.24 m²; the new recap states the rules
    // those worked numbers illustrated, and they are recomputed above.
    const recap = prose(lesson.recap!.blocks);
    for (const fragment of [
      "twice the radius",
      "π times the diameter, or 2 × π × r",
      "3.14",
      "π × r × r",
      "halved before it is squared",
      "the factor squared",
    ])
      expect(recap).toContain(fragment);
  });

  it("same-shape-new-size: worked numbers in the teaching screens", () => {
    const text = allText("same-shape-new-size");
    // The 5 by 4 rectangle and its enlargements.
    expect(5 * 2).toBe(10);
    expect(4 * 2).toBe(8);
    expect(5 * 4).toBe(20);
    expect(4 * 4).toBe(16);
    expect(8 / 10).toBe(0.8);
    expect(16 / 20).toBe(0.8);
    // Adding 3 to each side of a 3 by 6 rectangle changes its proportions; doubling does not.
    expect(6 / 3).toBe(2);
    expect(6 * 2).toBe(12);
    expect(12 / 6).toBe(2);
    expect(3 + 3).toBe(6);
    expect(6 + 3).toBe(9);
    expect(9 / 6).toBe(1.5);
    // The 2, 3, 4 triangle whose shortest side becomes 6.
    expect(6 / 2).toBe(3);
    expect(3 * 3).toBe(9);
    expect(4 * 3).toBe(12);
    // The shadow measurement: 60 m against 3 m, so a 2 m stick means a 40 m tower.
    expect(60 / 3).toBe(20);
    expect(2 * 20).toBe(40);
    // Reductions and the scale drawing.
    expect(12 * 0.25).toBe(3);
    expect(8 * 50).toBe(400);
    expect(400 / 100).toBe(4); // 400 cm is 4 m
    for (const fragment of [
      "5 × 2 = 10",
      "8 ÷ 10 and 16 ÷ 20 are both 0.8",
      "6 by 12",
      "6 by 9",
      "one and a half times",
      "6 ÷ 2 = 3",
      "3 × 3 = 9",
      "4 × 3 = 12",
      "60 ÷ 3 = 20",
      "2 × 20 = 40 metres",
      "12 × 0.25 = 3",
      "8 × 50 = 400 cm long, which is 4 m",
    ])
      expect(text).toContain(fragment);
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
    // The 2 cm tile enlarged by 6, and by 7.
    expect(2 * 2).toBe(4);
    expect(6 * 2).toBe(12);
    expect(12 * 12).toBe(144);
    expect(6 * 6).toBe(36);
    expect(144 / 4).toBe(36);
    expect(7 * 7).toBe(49);
    expect(7 * 2).toBe(14);
    expect(14 * 14).toBe(196);
    expect(196 / 4).toBe(49);
    // The 4 by 5 rectangle under a scale factor k.
    expect(4 * 5).toBe(20);
    for (const k of [6, 8]) expect(k * 4 * (k * 5)).toBe(k * k * 20);
    expect(6 * 6 * 20).toBe(720);
    expect(8 * 8).toBe(64);
    expect(64 * 20).toBe(1280);
    // The 40 m² plot, enlarged by 6 and halved.
    expect(6 ** 2).toBe(36);
    expect(40 * 36).toBe(1440);
    expect(0.5 * 0.5).toBe(0.25);
    expect(40 * 0.25).toBe(10);
    expect(40 * 6).toBe(240);
    expect(1440 / 240).toBe(6); // "a sixth of the true value"
    // Working back from an area factor.
    expect(Math.sqrt(64)).toBe(8);
    expect(Math.sqrt(144)).toBe(12);
    expect(8 * 8).toBe(64);
    for (const fragment of [
      "2 × 2 = 4 cm²",
      "6 × 2 = 12 cm",
      "12 × 12 = 144 cm²",
      "6 × 6 = 36 small ones",
      "144 ÷ 4 = 36",
      "7 × 7 = 49",
      "196 cm², which is 49 times 4",
      "4 × 5 = 20 square units",
      "(k × 4) × (k × 5) = k × k × 20",
      "6 × 6 = 36 and the area is 36 × 20 = 720",
      "k = 8 gives an area factor of 64 and an area of 1280",
      "6² = 36, so its area is 40 × 36 = 1440 m²",
      "40 ÷ 4 = 10 m²",
      "240 m² for the enlarged plot, a sixth of the true value",
      "√64 = 8 and √144 = 12",
      "8 × 8 = 64",
    ])
      expect(text).toContain(fragment);
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
    // The bent path against the shortcut, for legs 2 and 5 and for legs 4 and 6.
    expect(2 + 5).toBe(7);
    expect(4 + 6).toBe(10);
    expect(hyp(3, 4)).toBeLessThan(3 + 4); // the shortcut beats the bent path
    // The 3, 4, 5 triangle.
    expect(3 * 3).toBe(9);
    expect(4 * 4).toBe(16);
    expect(9 + 16).toBe(25);
    expect(5 * 5).toBe(25);
    expect(Math.sqrt(25)).toBe(5);
    // Legs 4 and 6.
    expect(4 ** 2 + 6 ** 2).toBe(52);
    expect(Math.sqrt(52)).toBeCloseTo(7.2, 1);
    // The 9, 40, 41 triangle, found two ways.
    expect(9 ** 2).toBe(81);
    expect(40 ** 2).toBe(1600);
    expect(81 + 1600).toBe(1681);
    expect(Math.sqrt(1681)).toBe(41);
    expect(9 + 40).toBe(49); // adding the legs directly
    expect(41 ** 2 - 9 ** 2).toBe(1600);
    expect(Math.sqrt(1600)).toBe(40);
    expect(leg(41, 9)).toBe(40);
    // The old tent-rope example (169 − 25 = 144) is gone; the missing-leg example above
    // is its equivalent, with a leg that must come out shorter than the hypotenuse.
    expect(leg(41, 9)).toBeLessThan(41);
    for (const fragment of [
      "2 + 5 = 7",
      "4 + 6 = 10",
      "3 × 3 = 9",
      "4 × 4 = 16",
      "Together they make 25",
      "5 × 5 = 25",
      "16 + 36 = 52",
      "√52, which is about 7.2",
      "9² + 40² = 81 + 1600 = 1681",
      "√1681 = 41 centimetres",
      "adding the legs directly gives 49",
      "41² − 9² = 1681 − 81 = 1600",
      "√1600 = 40",
    ])
      expect(text).toContain(fragment);
    // The hypotenuse lies between the longer leg and the sum of the legs.
    for (const [a, b] of [
      [5, 12],
      [8, 15],
      [9, 12],
      [9, 40],
      [4, 6],
    ] as const) {
      expect(hyp(a, b)).toBeGreaterThan(Math.max(a, b));
      expect(hyp(a, b)).toBeLessThan(a + b);
    }
    expect(marked("geo-right-triangle-distances-hook")[0]).toMatch(/^The shortcut is shorter/);
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
    // A (2, 1) to B (8, 4), and the second view with x from −2 to 3.
    expect(8 - 2).toBe(6);
    expect(4 - 1).toBe(3);
    expect(6 + 3).toBe(9);
    expect(3 - -2).toBe(5);
    expect(5 + 3).toBe(8);
    // A (−2, −3) to B (7, 9): differences 9 and 12.
    expect(7 - -2).toBe(9);
    expect(9 - -3).toBe(12);
    expect(9 ** 2).toBe(81);
    expect(12 ** 2).toBe(144);
    expect(81 + 144).toBe(225);
    expect(hyp(9, 12)).toBe(15);
    expect(9 + 12).toBe(21);
    expect(hyp(6, 3)).toBeCloseTo(6.7, 1); // √45
    expect(6 ** 2 + 3 ** 2).toBe(45);
    // (−5, −6) to (3, 9) crosses zero in both directions.
    expect(3 - -5).toBe(8);
    expect(9 - -6).toBe(15);
    expect(8 ** 2 + 15 ** 2).toBe(289);
    expect(8 ** 2).toBe(64);
    expect(15 ** 2).toBe(225);
    expect(hyp(8, 15)).toBe(17);
    expect((-8) ** 2).toBe(8 ** 2);
    // Sliding (0, 0) to (3, 4) by (6, −2) puts its ends at (6, −2) and (9, 2).
    expect(hyp(3, 4)).toBe(5);
    expect(0 + 6).toBe(6);
    expect(0 - 2).toBe(-2);
    expect(3 + 6).toBe(9);
    expect(4 - 2).toBe(2);
    expect(9 - 6).toBe(3);
    expect(2 - -2).toBe(4);
    expect(hyp(9 - 6, 2 - -2)).toBe(hyp(3 - 0, 4 - 0));
    // Swapping the points flips the signs of the gaps and not the distance.
    expect(hyp(1 - 4, 2 - 6)).toBe(hyp(4 - 1, 6 - 2));
    for (const fragment of [
      "8 − 2 = 6",
      "4 − 1 = 3",
      "6 + 3 = 9",
      "3 − (−2) = 5",
      "5 + 3 = 8",
      "7 − (−2) = 9 across and 9 − (−3) = 12 up",
      "which add to 225",
      "√225 = 15 units",
      "9 + 12 = 21",
      "√45, about 6.7",
      "3 − (−5) = 8",
      "9 − (−6) = 15",
      "√(64 + 225) = √289 = 17 units",
      "(−8)² = 64",
      "(6, −2) and (9, 2)",
      "9 − 6 = 3 across and 2 − (−2) = 4 up",
    ])
      expect(text).toContain(fragment);
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
        ...lesson.steps.flatMap((s) => (s.checkQuestionId ? [s.checkQuestionId] : [])),
      ].map(question);
      for (const item of asked) expect(taught.has(item.skill!)).toBe(true);
    }
  });
});

describe("Geometry: Shape and Space, story lessons 11 and 12", () => {
  const surface = (l: number, w: number, h: number) => 2 * (l * w + l * h + w * h);

  it("opens with a scene, teaches before asking and closes into the next lesson", () => {
    for (const id of STORY_LESSONS_PART_THREE) {
      const lesson = lessonOf(id);
      expect(lesson.intro?.hook.questionId).toBeUndefined();
      const opener = wordCount(openerText(id));
      expect(opener).toBeGreaterThanOrEqual(OPENER_WORDS.min);
      expect(opener).toBeLessThanOrEqual(OPENER_WORDS.max);
      expect(wordCount(lesson.intro!.promise)).toBeLessThanOrEqual(PROMISE_WORDS_MAX);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(8);
      expect(lesson.steps.length).toBeLessThanOrEqual(14);
      const teaching = lesson.steps.filter((s) => s.kind === "explain" && !s.checkQuestionId);
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
        const words = wordCount(`${prose(step.lead)} ${prose(step.afterFigure)}`);
        expect(words).toBeGreaterThanOrEqual(80);
        expect(words).toBeLessThanOrEqual(280);
      }
      for (const step of asked) {
        expect(wordCount(prose(step.lead))).toBeLessThanOrEqual(60);
        if (step.diagram) expect(step.answerVisibility).toBe("hidden-until-response");
      }
      if (lesson.id === bundle.lessons.at(-1)!.id) expect(lesson.recap!.nextHook).toBeUndefined();
      else expect(lesson.recap!.nextHook).toBeTruthy();
    }
  });

  it("each close leads into the next opener", () => {
    // Lesson 11 closes into lesson 12; the full chain is checked with lessons 6 to 10 above.
    expect((lessonOf("filling-space").recap!.nextHook ?? "").toLowerCase()).toContain("flat");
    expect(openerText("unfolding-surface-area").toLowerCase()).toContain("flat");
    expect(openerText("filling-space").toLowerCase()).toContain("box");
    // The course ends with lesson 12, which deliberately has no next hook.
    expect(lessonOf("unfolding-surface-area").recap!.nextHook).toBeUndefined();
  });

  it("filling-space: worked numbers in the teaching screens", () => {
    const text = allText("filling-space");
    // The 6 by 3 by 2 box, filled in layers (the old text wrote the layer as 3 × 6).
    expect(6 * 3).toBe(18);
    expect(3 * 6).toBe(18);
    expect(18 * 2).toBe(36);
    expect(18 * 4).toBe(72);
    // The same box on its largest face and on its end.
    expect(9 * 2).toBe(18);
    expect(18 * 3).toBe(54);
    expect(3 * 2).toBe(6);
    expect(6 * 9).toBe(54);
    expect(9 * 2 * 3).toBe(3 * 2 * 9);
    // A 10 cm cube holds a litre.
    expect(10 * 10 * 10).toBe(1000);
    // Finding a height from a volume, on a 7 by 2 base.
    expect(7 * 2).toBe(14);
    expect(56 / 14).toBe(4);
    expect(84 / 14).toBe(6);
    expect(14 * 4).toBe(56);
    // Cubes of edge 2 and 3.
    expect(2 * 2 * 2).toBe(8);
    expect(3 * 3 * 3).toBe(27);
    expect((2 * 2 * 2) / (1 * 1 * 1)).toBe(8); // doubling the side gives eight times
    for (const fragment of [
      "6 × 3 = 18 cubes",
      "18 × 2 = 36 cubes",
      "18 × 4 = 72",
      "9 × 2 = 18",
      "18 × 3 = 54",
      "6 × 9 = 54",
      "10 × 10 × 10 = 1000 cm³",
      "7 × 2 = 14",
      "56 ÷ 14 = 4 cm",
      "84 ÷ 14 = 6 cm",
      "14 × 4 = 56",
      "2 × 2 × 2 = 8",
      "3 × 3 × 3 = 27",
    ])
      expect(text).toContain(fragment);
    // The faded example's base and height: 4 by 3, five units high.
    expect(4 * 3 * 5).toBe(60);
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
    // The old recap quoted 30 cubes, 60 cm³, 216 cm³ and 5 cm; the new recap states the rules
    // those numbers illustrated (layers, base area times height, a cube's three factors,
    // cubic units, and dividing back), and the numbers are recomputed above.
    const recap = prose(lesson.recap!.blocks);
    for (const fragment of [
      "layers of unit cubes",
      "base area times the height",
      "multiplied by itself three times",
      "cubic units such as cm³",
      "dividing the volume by the base area gives the height",
    ])
      expect(recap).toContain(fragment);
    // The old extra box is no longer asked, and its key is still right.
    expect(lesson.steps.some((s) => s.checkQuestionId === "geo-filling-space-try")).toBe(false);
    close("geo-filling-space-try", 7 * 3 * 2);
  });

  it("unfolding-surface-area: worked numbers in the teaching screens", () => {
    const text = allText("unfolding-surface-area");
    // Cubes of edge 2 and 7 (the old text quoted cm²; the new text uses square units).
    expect(2 * 2).toBe(4);
    expect(6 * 4).toBe(24);
    expect(surface(2, 2, 2)).toBe(24);
    expect(7 * 7).toBe(49);
    expect(6 * 49).toBe(294);
    expect(surface(7, 7, 7)).toBe(294);
    expect(2 * 2 * 2).toBe(8); // volume of the edge-2 cube
    // The pencil case, 10 by 4 by 3, and the flat tin, 10 by 4 by 1.
    expect(10 * 4).toBe(40);
    expect(10 * 3).toBe(30);
    expect(4 * 3).toBe(12);
    expect(40 + 30 + 12).toBe(82);
    expect(2 * 82).toBe(164);
    expect(surface(10, 4, 3)).toBe(164);
    expect(10 * 1).toBe(10);
    expect(4 * 1).toBe(4);
    expect(40 + 10 + 4).toBe(54);
    expect(surface(10, 4, 1)).toBe(108);
    // The worked example, 4 by 3 by 2, with and without its lid.
    expect(4 * 3).toBe(12);
    expect(4 * 2).toBe(8);
    expect(3 * 2).toBe(6);
    expect(12 + 8 + 6).toBe(26);
    expect(surface(4, 3, 2)).toBe(52);
    expect(surface(4, 3, 2) - 4 * 3).toBe(40); // open top
    expect(12 + 8 + 8 + 6 + 6).toBe(40); // the five faces that remain
    // Tripling every length: 2 by 1 by 1 becomes 6 by 3 by 3.
    expect(2 + 2 + 1).toBe(5);
    expect(surface(2, 1, 1)).toBe(10);
    expect(2 * 3).toBe(6);
    expect(1 * 3).toBe(3);
    expect(6 * 3).toBe(18);
    expect(3 * 3).toBe(9);
    expect(18 + 18 + 9).toBe(45);
    expect(surface(6, 3, 3)).toBe(90);
    expect(surface(6, 3, 3) / surface(2, 1, 1)).toBe(9); // 3²
    expect(2 * 1 * 1).toBe(2);
    expect(6 * 3 * 3).toBe(54);
    expect((6 * 3 * 3) / (2 * 1 * 1)).toBe(27); // 3³
    expect(3 ** 2).toBe(9);
    expect(3 ** 3).toBe(27);
    for (const fragment of [
      "2 × 2 = 4 square units",
      "6 × 4 = 24 square units",
      "7 × 7 = 49",
      "6 × 49 = 294 square units",
      "10 × 4 = 40",
      "10 × 3 = 30",
      "4 × 3 = 12",
      "They add to 82",
      "2 × 82 = 164 square units",
      "40, 10 and 4, which add to 54",
      "108 square units",
      "52 − 12 = 40 square units",
      "2 × (2 + 2 + 1) = 10 square units",
      "2 × 1 × 1 = 2 cubic units",
      "2 × (18 + 18 + 9) = 90",
      "6 × 3 × 3 = 54",
      "3² = 9 while 3³ = 27",
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
    expect(surface(10, 6, 4)).toBe(surface(5, 3, 2) * 4); // doubling every length
    expect(marked("geo-unfolding-surface-area-4")).toEqual([
      "Surface area multiplies by 4 and volume by 8",
    ]);
    const lesson = lessonOf("unfolding-surface-area");
    expect(lesson.questionIds).toEqual([
      "geo-unfolding-surface-area-5",
      "geo-unfolding-surface-area-6",
      "geo-unfolding-surface-area-check-1",
    ]);
    // The old recap quoted 54 cm², 62 cm², 47 cm², 96 cm² and 248 cm²; the new recap states
    // the rules behind them, and the worked numbers are recomputed above.
    const recap = prose(lesson.recap!.blocks);
    for (const fragment of [
      "three equal pairs",
      "twice the sum of the three different face areas",
      "loses one face's area",
      "the factor squared",
      "the factor cubed",
    ])
      expect(recap).toContain(fragment);
  });
});
