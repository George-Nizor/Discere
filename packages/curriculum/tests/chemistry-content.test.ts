import { describe, expect, it } from "vitest";
import { ChemistryDiagramSchema, ChemistryModelSchema } from "@discere/contracts";
import { chemistryLessons as lessons } from "../../../content/chemistry-atoms-to-reactions/authoring/lessons.js";
import { chemistryChecks as checks } from "../../../content/chemistry-atoms-to-reactions/authoring/course-checks.js";
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
describe("reviewed chemistry problem keys", () => {
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
        expect(ChemistryDiagramSchema.safeParse(beat.diagram).success).toBe(true);
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
        if (item.visual.type === "chemistry")
          expect(ChemistryModelSchema.safeParse(item.visual.model).success).toBe(true);
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
it.skipIf(process.env["DISCERE_CHEMISTRY_CANDIDATE"] === "1")(
  "ships the exact reviewed chemistry questions, diagrams, recall and independent checks",
  async () => {
    const root = path.resolve(import.meta.dirname, "../../../content/chemistry-atoms-to-reactions");
    const bundle = await loadCourseBundle(path.join(root, "bundle.json"));
    const review = JSON.parse(await readFile(path.join(root, "review/publication.json"), "utf8"));
    const validation = validateCourseBundle(bundle);
    expect(validation.issues).toEqual([]);
    expect(() => assertEditorialApproval(bundle, review, validation)).not.toThrow();
    for (const lesson of lessons) {
      lesson.questions.forEach((q, i) =>
        expect(
          bundle.questions.find((item) => item.id === "chem-" + lesson.id + "-" + (i + 1)),
        ).toMatchObject(q),
      );
      lesson.cards.forEach((c, i) =>
        expect(
          bundle.flashcards.find((item) => item.id === "chem-" + lesson.id + "-card-" + (i + 1)),
        ).toMatchObject(c),
      );
      expect(bundle.lessons.find((l) => l.id === lesson.id)!.steps.map((s) => s.diagram)).toEqual(
        lesson.beats.map((b) => b.diagram),
      );
    }
    expect(bundle.courseChecks).toEqual(checks);
  },
);
