import { describe, expect, it } from "vitest";
import { unchangedChecks, unchangedKeys } from "./helpers/unchanged-keys.js";

// These calculations come from the problem statements, independently of the simulation engine.
const expected: Record<string, Array<number | null>> = {
  "measuring-motion": [9 - 2, (7 - 1) * 2, null, 8 + (8 - 3), -4 - 5, null],
  "speed-and-direction": [18 / 6, -12 / 3, 0 / 5, null, 42 / 7, null],
  "reading-motion-graphs": [(14 - 2) / 3, null, (2 - 10) / 4, 2 / 6, (15 - 3) / (4 - 1), null],
  "changing-velocity": [(10 - 2) / 4, (-2 - -8) / 3, null, (6 - 6) / 4, (-3 - 9) / 4, null],
  "predicting-a-motion": [
    3 + 2 * 4,
    3 * 4 + 0.5 * 2 * 4 ** 2,
    null,
    ((12 + 0) / 2) * 4,
    5 + 2 * 4 + 0.5 * 4 ** 2,
    null,
  ],
  "falling-and-rising": [
    -10 * 2,
    45 - 0.5 * 10 * 2 ** 2,
    -10,
    null,
    30 * 2 - 0.5 * 10 * 2 ** 2,
    null,
  ],
  "balanced-forces": [14 - 6, null, 9 - 9, 8 - 20, 7 + 11 - 5, null],
  "force-mass-acceleration": [(18 - 6) / 3, null, 24 / 2, (4 - 12) / 4, 4 * 3, null],
  "weight-and-support": [3 * 10, null, 4 * 10, 4 * (10 + 2), 7 * 9.8, null],
  "pairs-of-forces": [10, 10 / 5, -10 / 2, null, 18 / 6, null],
  "friction-and-motion": [12, 0.5 * 4 * 10, 0.3 * 4 * 10, (24 - 12) / 4, null, null],
  "work-by-a-force": [15 * 4, -6 * 5, 0, 10 * 7, null, null],
  "energy-of-motion": [
    0.5 * 2 * 3 ** 2,
    2 ** 2,
    null,
    0.5 * 2 * (5 ** 2 - 3 ** 2),
    0.5 * 4 * 5 ** 2,
    null,
  ],
  "lifting-and-falling-energy": [
    3 * 10 * (5 - 1),
    null,
    2 * 10 * (3 - 8),
    2 * 10 * (8 - 3),
    4 * 10 * 1.5,
    null,
  ],
  "keeping-energy-account": [
    2 * 10 * 10,
    2 * 10 * 10 - 40,
    null,
    Math.sqrt((2 * 100) / 2),
    12 + 90 - 18,
    null,
  ],
  "power-and-efficiency": [
    1200 / 4,
    (1200 / 2000) * 100,
    2000 - 1200,
    null,
    (350 / 500) * 100,
    null,
  ],
  "momentum-and-impulse": [3 * 4, 6 * 3, (3 * 4 + 18) / 3, null, (0 - 4 * 6) / 3, null],
  "carts-that-stick": [
    (2 * 6 + 4 * 0) / 6,
    (2 * 6 + 4 * -3) / 6,
    0.5 * 2 * 6 ** 2 - 0.5 * 6 * 2 ** 2,
    null,
    (3 * 4 + 1 * 0) / 4,
    null,
  ],
};
const recall: Record<string, number[]> = {
  "measuring-motion": [6 - -3, 10 - 2 + (10 - 5)],
  "speed-and-direction": [35 / 5, -24 / 8],
  "reading-motion-graphs": [(9 - -3) / 4, (-4 - 8) / 3],
  "changing-velocity": [(16 - 4) / 6, (-3 - -12) / 3],
  "predicting-a-motion": [0.5 * 3 * 4 ** 2, 14 - 2 * 5],
  "falling-and-rising": [10 * 3, 16 / 8],
  "balanced-forces": [5 - 17, 14],
  "force-mass-acceleration": [35 / 5, 6 * 2],
  "weight-and-support": [5 * 10, 3 * (10 - 2)],
  "pairs-of-forces": [27, -28 / 4],
  "friction-and-motion": [0.2 * 5 * 10, 9],
  "work-by-a-force": [8 * 9, -5 * 6],
  "energy-of-motion": [0.5 * 6 * 4 ** 2, 63 - 18],
  "lifting-and-falling-energy": [5 * 10 * 2, 2 * 10 * 4],
  "keeping-energy-account": [20 + 150 - 35, Math.sqrt((2 * 72) / 4)],
  "power-and-efficiency": [900 / 6, (540 / 720) * 100],
  "momentum-and-impulse": [4 * -5, 5 * 2],
  "carts-that-stick": [(2 * 8) / (2 + 6), (4 * 5 + 2 * -4) / (4 + 2)],
};

const checkValues: Record<string, number[]> = {
  "starting-point": [
    7 - -4,
    28 / 4,
    (3 - 12) / 3,
    (-2 - -10) / 4,
    2 * 4 + 0.5 * 3 * 4 ** 2,
    80 - 0.5 * 10 * 3 ** 2,
    19 - 7,
    (25 - 5) / 5,
    6 * 10,
    12 / 4,
    0.2 * 5 * 10,
    -7 * 4,
    0.5 * 3 * 6 ** 2,
    4 * 10 * (7 - 2),
    3 * 10 * 6 - 30,
    (630 / 900) * 100,
    6 * 4,
    (3 * 5) / (3 + 2),
  ],
  "mixed-challenge": [
    0.5 * 4 * 3 ** 2 + 4 * 10 * 5 - 28,
    6 + 0 + 9,
    5 * (10 - 2),
    0,
    (-15 - 3) / 6,
    (4 * 5 + 2 * -1) / 6,
    18,
    2 + 4 * 3 + 0.5 * 2 * 3 ** 2,
    3 * 10 * (9 - 2),
    -24 / 4,
    (-4 - 8) / 6,
    1200 / 6,
    11 + 5,
    (5 * 3 - 10 * 2) / 5,
    24 * 2 - 0.5 * 8 * 2 ** 2,
    (42 - 12) / 6,
    0.5 * 2 * (8 ** 2 - 5 ** 2),
    7 - 23,
  ],
  "later-applications": [
    9 + 6,
    (45 + 15) / (3 + 3),
    (10 - -6) / 4,
    (9 - -3) / 4,
    ((15 + 0) / 2) * 5,
    -4 * 3,
    16 - 9,
    (80 - 24) / 8,
    6 * (9 + 3),
    18 / 9,
    0.25 * 8 * 10,
    32 * 2.5,
    0.5 * 0.5 * 12 ** 2,
    2 * 8 * (6 - 1),
    Math.sqrt((2 * (2 * 10 * 6 - 20)) / 2),
    2400 - 1800,
    -12 * 2,
    (5 * 4 + 3 * -4) / (5 + 3),
  ],
};

const lessons = unchangedKeys("physics-motion-and-forces", "phys");
const keyedChecks = unchangedChecks("physics-motion-and-forces");

// The tables describe the course as first published. A key is checked here while the live bundle
// still holds it; a question rewritten since is recomputed by physics-motion-and-forces-v2.test.ts.
describe("independent Physics content review", () => {
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
