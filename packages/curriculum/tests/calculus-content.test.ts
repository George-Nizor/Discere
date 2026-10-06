import { describe, expect, it } from "vitest";
import { CalculusDiagramSchema, CalculusModelSchema } from "@discere/contracts";
import { calculusLessons as lessons } from "../../../content/calculus-change-and-accumulation/authoring/lessons.js";
import { calculusChecks as checks } from "../../../content/calculus-change-and-accumulation/authoring/course-checks.js";
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
describe("reviewed calculus problem keys", () => {
  for (const [i, lesson] of lessons.entries()) {
    it(lesson.id + " has independently calculated lesson and recall keys", () => {
      expect(lesson.questions).toHaveLength(6);
      expect(lesson.beats).toHaveLength(4);
      lesson.questions.forEach((q, j) => {
        if (q.answerAuthority.kind === "numeric") {
          expect(q.answerAuthority.value).toBeCloseTo(answers[i]![j]!, 8);
          expect(q.hints).toHaveLength(3);
        } else expect(answers[i]![j]).toBeNull();
      });
      lesson.cards.forEach((c, j) => {
        expect(c.answerAuthority.kind).toBe("numeric");
        if (c.answerAuthority.kind === "numeric")
          expect(c.answerAuthority.value).toBeCloseTo(recall[i]![j]!, 8);
      });
    });
    it(lesson.id + " has bounded, distinct graph comparisons", () => {
      for (const beat of lesson.beats) {
        expect(CalculusDiagramSchema.safeParse(beat.diagram).success).toBe(true);
        expect(JSON.stringify(beat.diagram.cases[0]!.model)).not.toBe(
          JSON.stringify(beat.diagram.cases[1]!.model),
        );
      }
    });
  }
  it("has fresh checks with complete lesson coverage and independent numeric keys", () => {
    expect(checks).toHaveLength(3);
    checks.forEach((check, i) => {
      expect(check.items.map((item) => item.lessonId)).toEqual(lessons.map((l) => l.id));
      check.items.forEach((item, j) => {
        expect(item.question.answerAuthority.kind).toBe("numeric");
        if (item.question.answerAuthority.kind === "numeric")
          expect(item.question.answerAuthority.value).toBeCloseTo(checkAnswers[i]![j]!, 8);
        if (item.visual.type === "calculus")
          expect(CalculusModelSchema.safeParse(item.visual.model).success).toBe(true);
      });
    });
  });
  it("does not reuse any lesson, recall or assessment prompt", () => {
    const prompts = [
      ...lessons.flatMap((l) => [
        ...l.questions.map((q) => q.prompt),
        ...l.cards.map((c) => c.front),
      ]),
      ...checks.flatMap((c) => c.items.map((i) => i.question.prompt)),
    ];
    expect(new Set(prompts).size).toBe(prompts.length);
  });
  it("requires all lessons before the mixed check and seven days after it for transfer", () => {
    expect(checks[1]!.requiredLessonIds).toEqual(lessons.map((l) => l.id));
    expect(checks[2]!.afterCheckId).toBe(checks[1]!.id);
    expect(checks[2]!.delayDays).toBe(7);
  });
});

import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadCourseBundle, assertEditorialApproval, validateCourseBundle } from "../src/index.js";
it("ships the exact reviewed calculus questions, diagrams, recall and independent checks", async () => {
  const root = path.resolve(
    import.meta.dirname,
    "../../../content/calculus-change-and-accumulation",
  );
  const bundle = await loadCourseBundle(path.join(root, "bundle.json"));
  const review = JSON.parse(await readFile(path.join(root, "review/publication.json"), "utf8"));
  const validation = validateCourseBundle(bundle);
  expect(validation.issues).toEqual([]);
  expect(() => assertEditorialApproval(bundle, review, validation)).not.toThrow();
  for (const lesson of lessons) {
    lesson.questions.forEach((q, i) =>
      expect(
        bundle.questions.find((item) => item.id === "cal-" + lesson.id + "-" + (i + 1)),
      ).toMatchObject(q),
    );
    lesson.cards.forEach((c, i) =>
      expect(
        bundle.flashcards.find((item) => item.id === "cal-" + lesson.id + "-card-" + (i + 1)),
      ).toMatchObject(c),
    );
    expect(bundle.lessons.find((l) => l.id === lesson.id)!.steps.map((s) => s.diagram)).toEqual(
      lesson.beats.map((b) => b.diagram),
    );
  }
  expect(bundle.courseChecks).toEqual(checks);
});
