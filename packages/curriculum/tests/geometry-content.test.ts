import { describe, expect, it } from "vitest";
import { unchangedChecks, unchangedKeys } from "./helpers/unchanged-keys.js";

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

const lessons = unchangedKeys("geometry-shape-and-space", "geo");
const keyedChecks = unchangedChecks("geometry-shape-and-space");

// The tables describe the course as first published. A key is checked here while the live bundle
// still holds it; a question rewritten since is recomputed by geometry-shape-and-space-v2.test.ts.
describe("independent Geometry content review", () => {
  it.each(lessons)(
    "recomputes the numerical questions still keyed as first published in $id",
    (lesson) => {
      const values = expected[lesson.id]!;
      expect(values).toHaveLength(6);
      lesson.questions.forEach((q, i) => {
        if (!q) return;
        if (q.answerAuthority.kind === "numeric") {
          expect(values[i]).not.toBeNull();
          expect(q.answerAuthority.value).toBeCloseTo(values[i]!, 9);
        } else expect(values[i]).toBeNull();
      });
    },
  );
  it.each(lessons)("recomputes the recall keys still keyed as first published in $id", (lesson) => {
    lesson.cards.forEach((card, i) => {
      if (!card) return;
      expect(card.answerAuthority.kind).toBe("numeric");
      if (card.answerAuthority.kind === "numeric")
        expect(card.answerAuthority.value).toBeCloseTo(recall[lesson.id]![i]!, 9);
    });
  });
  it.each(keyedChecks)(
    "recomputes the fresh problems still keyed as first published in $id",
    (check) => {
      check.items.forEach((item, i) => {
        if (!item) return;
        const a = item.question.answerAuthority;
        expect(a.kind).toBe("numeric");
        if (a.kind === "numeric") expect(a.value).toBeCloseTo(checkValues[check.id]![i]!, 9);
      });
    },
  );
});
