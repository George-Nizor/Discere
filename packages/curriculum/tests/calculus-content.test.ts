import { describe, expect, it } from "vitest";
import { unchangedChecks, unchangedKeys } from "./helpers/unchanged-keys.js";

// Recomputed from the authored problem statements, without importing the graph engine.
const answers = [
  [2 + 3, 3 + 3, null, 4 + 4, 5 + 5, null],
  [2, 5, null, 2 * 2 + 4, 3 * -1 + 7, null],
  [(3 ** 2 - 1 ** 2) / (3 - 1), 4 + 0, null, 2 * 3, (5 ** 2 - 2 ** 2) / (5 - 2), null],
  [3 * 2 ** 2, 4 * 1, null, -2 * 1, 6 * 2 ** 2 - 5, null],
  [2 * (2 * 1 + 1) * 2, 2 * (3 - 1) * -1, null, 3 * (1 + 2) ** 2, 3 * (2 * 2 - 1) ** 2 * 2, null],
  [2 * 2 + 2, 6 * 1, null, 2 * 3, 12 * 2 - 6, null],
  [
    6 / 2,
    6 * 3 - 3 ** 2,
    null,
    Math.max((-1) ** 2, 0, 2 ** 2),
    Math.max(0, 8 * 4 - 4 ** 2, 8 * 6 - 6 ** 2),
    null,
  ],
  [3, 2 ** 3, null, 2 ** 3 + 2 * 2 + 1, 2 * 3 ** 2 + 3 * 3 + 2, null],
  [2 * (0 + 2), 1 + 2 + 3 + 4, null, 2 * (1 + 3), 1 ** 2 + 2 ** 2, null],
  [-2 * 3, -2 + 2, null, -6, -1 / 2 + 9 / 2, null],
  [3 ** 2 - 1 ** 2, 2 ** 2 + 2, null, 2 ** 2 + 1, 2 ** 3 - 1 ** 3, null],
  [2 ** 2 + 3 * 2, 7 + 2 ** 2 + 3 * 2, null, 1.5 * 2 ** 2 + 2 * 2, 5 + 1.5 * 2 ** 2 - 2 * 2, null],
];
const recall = [
  [6 + 6, -3 + 8],
  [-4, 2 * 3 - 1],
  [(6 ** 2 - 3 ** 2) / (6 - 3), 8 + 0],
  [9 * 1 ** 2 + 2, -4 * 3],
  [2 * (4 + 1) * 4, 2 * (5 - 2) * -2],
  [6 * 2 - 5, 6 * 3],
  [10 / 2, Math.max(9, 0, 1)],
  [3 * 2 ** 2 + 2, 3 ** 2 + 5 * 3 - 1],
  [2 * (0 + 2 + 4), 1 + 3 + 5],
  [-3 * (5 - 1), 2 ** 2 - (-1) ** 2],
  [2 * 3 ** 2 + 2 * 3 - (2 * 1 ** 2 + 2 * 1), 3 * 4 + 2],
  [4 + 2 ** 2 / 2 + 2 * 2, 2 * 2 ** 2 - 3 * 2],
];
const checkAnswers = [
  [
    1 + 1,
    3 * 2 + 7,
    (2 ** 2 - 0) / 2,
    12 * 1 ** 2 - 1,
    2 * (2 + 3) * 2,
    12 * 1,
    Math.max(0, 4 * 2 - 2 ** 2, 4 * 3 - 3 ** 2),
    2 * 2 ** 2 - 2,
    2 * (0 + 4),
    -4 * 3,
    2 * 2 ** 3,
    9 + 3 ** 2,
  ],
  [
    -2 - 2,
    2 * -2 + 6,
    (2 ** 2 - 1 ** 2) / (2 - 1),
    9 * 2 ** 2 + 8 * 2,
    2 * (3 * 2 - 2) * 3,
    18 * 2,
    12 * 6 - 6 ** 2,
    2 ** 3 - 2 + 4,
    1 + 2 + 3,
    1 ** 2 - (-2) ** 2,
    2 * 3 ** 2 + 3,
    6 + 2 ** 2 / 2 + 3 * 2,
  ],
  [
    -3 - 3,
    4 * 1 + 1,
    (2 * 3 ** 2 - 2 * 2 ** 2) / (3 - 2),
    8 * 1 ** 3 - 3,
    3 * (1 - 0) ** 2 * -2,
    4 * 3 + 5,
    6 * 2 - 2 ** 2,
    2 ** 2 + 2 - 3,
    0.5 ** 2 + 1.5 ** 2,
    3 ** 2 / 2 - 3,
    2 ** 3 + 2 * 2,
    4 + 2 ** 2 - 3 * 2,
  ],
];

const lessons = unchangedKeys("calculus-change-and-accumulation", "cal");
const keyedChecks = unchangedChecks("calculus-change-and-accumulation");

// The tables describe the course as first published. A key is checked here while the live bundle
// still holds it; a question rewritten since is recomputed by calculus-change-and-accumulation-v2.test.ts.
describe("reviewed calculus problem keys", () => {
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
