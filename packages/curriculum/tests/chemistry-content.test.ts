import { describe, expect, it } from "vitest";
import { unchangedChecks, unchangedKeys } from "./helpers/unchanged-keys.js";

// Recomputed from the authored problem statements, without importing the graph engine.
const answers = [
  [8, null, 7, 13, null, 9 + 10],
  [6 + 7, 35 - 17, null, (12 + 14) / 2, 18 - 8, null],
  [11 - 10, 8 - 10, null, 13 - 10, 9 - 10, null],
  [8 - 2, 10 - 2, null, 2, 3, null],
  [2 / 1, (3 * 2) / 3, null, 2 / 2, 2 / 1, null],
  [1 * 2, 2 * 2, null, 3 * 2, 1 * 2, null],
  [3 * 1, 2 * 3, null, 5 * 3, 4 * 2, null],
  [2 * 1 + 16, 12 + 2 * 16, null, 24 + 2 * 35.5, 14 + 3 * 1, null],
  [2 * 18, null, 22 / 44, 2 * 3, 3 * 16, null],
  [2 / 2, (2 + 2) / 2, null, (2 * 3) / 2, 2, null],
  [2 * 2, 3 * 2, null, 2 * 2, (4 * 2) / 2, null],
  [Math.min(6 / 2, 1) * 2, Math.min(4, 3 / 3) * 2, null, Math.min(3, 4 / 2) * 2, 6 - 2, null],
];
const recall = [
  [15, 16],
  [22 - 10, 0.25 * 10 + 0.75 * 12],
  [7 - 10, 16 - 18],
  [5, 17 - 2 - 8],
  [2 / 1, 3 / 1],
  [2 * 2, 4 * 2],
  [6 * 2, 3 * (1 + 4)],
  [2 * 27 + 3 * 16, 23 + 35.5],
  [51 / 17, 0.75 * 32],
  [(6 * 2) / 2, (3 * 2 + 6) / 2],
  [(6 * 2) / 3, 8 / 2],
  [Math.min(5 / 2, 1) * 2, 9 - 2 * 3],
];
const checkAnswers = [
  [
    17,
    23 - 11,
    12 - 11,
    16 - 2 - 8,
    3 * 2,
    2 * 2 * 2,
    4 * 3,
    12 + 4,
    88 / 44,
    4 / 2,
    4 * 2,
    Math.min(3 / 2, 3) * 2,
  ],
  [
    14,
    12 + 13,
    15 - 18,
    14 - 2 - 8,
    2 / 2,
    3 * 2,
    4 * 4,
    24 + 16,
    0.5 * 18,
    (4 * 3) / 2,
    (10 * 3) / 2,
    3 - 6 / 3,
  ],
  [
    10 + 3,
    (20 + 22) / 2,
    17 + 1,
    7 - 2,
    (4 * 3) / 2,
    3 * 2 + 2 * 2,
    3 * 3,
    40 + 2 * 35.5,
    2.5 * 17,
    4 / 2,
    7 / 2,
    7 - 2 * 2,
  ],
];

const lessons = unchangedKeys("chemistry-atoms-to-reactions", "chem");
const keyedChecks = unchangedChecks("chemistry-atoms-to-reactions");

// The tables describe the course as first published. A key is checked here while the live bundle
// still holds it; a question rewritten since is recomputed by chemistry-atoms-to-reactions-v2.test.ts.
describe("reviewed chemistry problem keys", () => {
  for (const [i, lesson] of lessons.entries()) {
    it(lesson.id + " still has its independently calculated lesson and recall keys", () => {
      lesson.questions.forEach((q, j) => {
        if (!q) return;
        if (q.answerAuthority.kind === "numeric")
          expect(q.answerAuthority.value).toBeCloseTo(answers[i]![j]!, 8);
        else expect(answers[i]![j]).toBeNull();
      });
      lesson.cards.forEach((c, j) => {
        if (!c) return;
        expect(c.answerAuthority.kind).toBe("numeric");
        if (c.answerAuthority.kind === "numeric")
          expect(c.answerAuthority.value).toBeCloseTo(recall[i]![j]!, 8);
      });
    });
  }
  it("still has its independent numeric keys for the fresh problems in each check", () => {
    keyedChecks.forEach((check, i) => {
      check.items.forEach((item, j) => {
        if (!item) return;
        expect(item.question.answerAuthority.kind).toBe("numeric");
        if (item.question.answerAuthority.kind === "numeric")
          expect(item.question.answerAuthority.value).toBeCloseTo(checkAnswers[i]![j]!, 8);
      });
    });
  });
});
