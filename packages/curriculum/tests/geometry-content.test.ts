import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadCourseBundle, assertEditorialApproval, validateCourseBundle } from "../src/index.js";
import { geometryLessons } from "../../../content/geometry-shape-and-space/authoring/lessons.js";
import { geometryChecks } from "../../../content/geometry-shape-and-space/authoring/course-checks.js";
import { GeometryDiagramSchema } from "@discere/contracts";
import { historicalBundle } from "./helpers/published-history.js";
import { CourseBundleSchema } from "@discere/contracts";
// Recompute authored answers from the stated problems, without calling the drawing engine.
const hyp = (a: number, b: number) => Math.sqrt(a * a + b * b);
const surface = (l: number, w: number, h: number) => l * w + l * w + l * h + l * h + w * h + w * h;
const expected: Record<string, Array<number | null>> = {
  "measuring-turns": [90 - 35, 180 - 68, 360 - 140, null, 90 - 27, null],
  "angles-in-triangles": [180 - 48 - 67, 90 - 32, (180 - 44) / 2, null, 180 - 39 - 86, null],
  "boundary-and-area": [null, 6 + 4 + 6 + 4, 6 * 4, 7 * 3, 54 / 6, null],
  "base-and-height": [(8 * 5) / 2, null, 8 * 5, (7 * 6) / 2, (2 * 42) / 12, null],
  "pieces-and-cutouts": [
    9 * 7 - 3 * 2,
    null,
    ((10 + 6) * 4) / 2,
    12 * 8 - 5 * 3,
    ((13 + 7) * 5) / 2,
    null,
  ],
  "around-and-inside-circles": [3 + 3, 2 * 3.14 * 3, 3.14 * 3 * 3, 3.14 * (8 / 2) ** 2, null, null],
  "same-shape-new-size": [2 * 3, 3 * 3, null, 5 * 0.5, (3 * 200) / 100, null],
  "when-area-scales": [3 * 2 * (2 * 2), 6 * 3 ** 2, 14 * 4 ** 2, null, Math.sqrt(9), 20 * 0.5 ** 2],
  "right-triangle-distances": [
    hyp(5, 12),
    null,
    hyp(6, 8),
    null,
    Math.sqrt(25 ** 2 - 7 ** 2),
    hyp(9, 12),
  ],
  "distance-on-a-grid": [
    Math.abs(4 - 1),
    Math.abs(6 - 2),
    hyp(4 - 1, 6 - 2),
    null,
    hyp(5 - -3, 7 - 1),
    hyp(2 - -3, 8 - -4),
  ],
  "filling-space": [4 * 3 * 2, 4 * 3 * 5, null, 6 ** 3, 8 * 5 * 4, 120 / (6 * 4)],
  "unfolding-surface-area": [
    2 + 2 + 2,
    surface(5, 3, 2),
    surface(5, 3, 2) - 5 * 3,
    null,
    6 * 4 ** 2,
    62 * 2 ** 2,
  ],
};
const recall: Record<string, number[]> = {
  "measuring-turns": [180 - 137, 360 - 235],
  "angles-in-triangles": [180 - 57 - 74, (180 - 34) / 2],
  "boundary-and-area": [2 * (9 + 5), 11 * 4],
  "base-and-height": [(9 * 8) / 2, 11 * 3],
  "pieces-and-cutouts": [8 * 6 - 2 * 3, ((9 + 5) * 3) / 2],
  "around-and-inside-circles": [3.14 * 10, 3.14 * 2 ** 2],
  "same-shape-new-size": [14 / 4, 18 * 0.25],
  "when-area-scales": [5 ** 2, 36 / 3 ** 2],
  "right-triangle-distances": [hyp(20, 21), Math.sqrt(13 ** 2 - 5 ** 2)],
  "distance-on-a-grid": [hyp(10 - -2, 8 - 3), hyp(8, 7 - 1)],
  "filling-space": [7 * 3 * 2, 3 ** 3],
  "unfolding-surface-area": [surface(6, 2, 3), 6 * 5 ** 2],
};
const checkValues: Record<string, number[]> = {
  "starting-point": [
    180 - 143,
    180 - 52 - 71,
    8 * 3,
    (9 * 4) / 2,
    10 * 7 - 2 * 3,
    2 * 3.14 * 4,
    6 * 1.5,
    2 * 5 * 3 ** 2,
    hyp(12, 16),
    hyp(1 - -2, 4),
    7 * 2 * 4,
    6 * 3 ** 2,
  ],
  "mixed-challenge": [
    360 - 212,
    2 * (12 + 5),
    ((12 + 8) * 3) / 2,
    7 * 0.5,
    hyp(10, 24),
    9 * 4 * 2,
    180 - 31 - 93,
    9 * 4,
    3.14 * 2.5 ** 2,
    5 * 4 * 1.5 ** 2,
    hyp(1 - -4, 9 - -3),
    surface(6, 4, 2),
  ],
  "later-transfer": [
    90 - 28,
    180 - 46 - 79,
    2 * (11 + 6),
    (14 * 9) / 2,
    14 * 9 - 4 * 2,
    2 * 3.14 * 7,
    8 * 2.5,
    4 * 3 * 0.5 ** 2,
    hyp(15, 20),
    hyp(8 - -4, 6 - -3),
    6 * 5 * 3,
    surface(8, 3, 2),
  ],
};
describe("independent Geometry content review", () => {
  it("ships the reviewed candidate, exact cover and independently checked authoring", async () => {
    const root = path.resolve(import.meta.dirname, "../../../content/geometry-shape-and-space");
    // The authoring source describes the lessons as first published. A course rewritten to v2
    // keeps that bundle in review/history (helpers/published-history.ts); approval is on the current one.
    const current = await loadCourseBundle(path.join(root, "bundle.json"));
    const bundle = CourseBundleSchema.parse(historicalBundle("geometry-shape-and-space"));
    const review = JSON.parse(await readFile(path.join(root, "review/publication.json"), "utf8"));
    expect(() =>
      assertEditorialApproval(current, review, validateCourseBundle(current)),
    ).not.toThrow();
    for (const lesson of geometryLessons) {
      lesson.questions.forEach((q, i) =>
        expect(
          bundle.questions.find((item) => item.id === "geo-" + lesson.id + "-" + (i + 1)),
        ).toMatchObject(q),
      );
      lesson.cards.forEach((c, i) =>
        expect(
          bundle.flashcards.find((item) => item.id === "geo-" + lesson.id + "-card-" + (i + 1)),
        ).toMatchObject(c),
      );
      const shipped = bundle.lessons.find((item) => item.id === lesson.id)!;
      expect(shipped.steps.map((s) => s.diagram)).toEqual(lesson.beats.map((b) => b.diagram));
    }
    expect(bundle.courseChecks).toEqual(geometryChecks);
  });
  it.each(geometryLessons)("recomputes all numerical questions in $id", (lesson) => {
    expect(lesson.questions).toHaveLength(6);
    const values = expected[lesson.id]!;
    expect(values).toHaveLength(6);
    lesson.questions.forEach((q, i) => {
      if (q.answerAuthority.kind === "numeric") {
        expect(values[i]).not.toBeNull();
        expect(q.answerAuthority.value).toBeCloseTo(values[i]!, 9);
        expect(q.hints).toHaveLength(3);
      } else expect(values[i]).toBeNull();
    });
  });
  it.each(geometryLessons)("checks both fresh recall keys and all diagrams in $id", (lesson) => {
    expect(lesson.cards).toHaveLength(2);
    expect(lesson.beats).toHaveLength(4);
    lesson.cards.forEach((card, i) => {
      expect(card.answerAuthority.kind).toBe("numeric");
      if (card.answerAuthority.kind === "numeric")
        expect(card.answerAuthority.value).toBeCloseTo(recall[lesson.id]![i]!, 9);
      expect(lesson.questions.some((q) => q.prompt === card.front)).toBe(false);
    });
    for (const beat of lesson.beats)
      expect(GeometryDiagramSchema.safeParse(beat.diagram).success).toBe(true);
  });
  it.each(geometryChecks)("recomputes every fresh problem in $id", (check) => {
    expect(check.items).toHaveLength(12);
    expect(new Set(check.items.map((i) => i.lessonId)).size).toBe(12);
    check.items.forEach((item, i) => {
      const a = item.question.answerAuthority;
      expect(a.kind).toBe("numeric");
      if (a.kind === "numeric") expect(a.value).toBeCloseTo(checkValues[check.id]![i]!, 9);
    });
  });
  it("keeps independent checks distinct from teaching and requires a delayed final application", () => {
    const prompts = [
      ...geometryLessons.flatMap((l) => l.questions.map((q) => q.prompt)),
      ...geometryChecks.flatMap((c) => c.items.map((i) => i.question.prompt)),
    ];
    expect(new Set(prompts).size).toBe(prompts.length);
    expect(geometryChecks[0]!.requiredLessonIds).toEqual([]);
    for (const c of geometryChecks.slice(1)) expect(c.requiredLessonIds).toHaveLength(12);
    expect(geometryChecks[2]).toMatchObject({ afterCheckId: "mixed-challenge", delayDays: 7 });
  });
});
