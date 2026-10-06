import { describe, it, expect } from "vitest";
import { BiologyDiagramSchema } from "@discere/contracts";
import { assessTextAnswer } from "@discere/assessment-engine";
import { biologyLessons as lessons } from "../../../content/biology-cells-to-ecosystems/authoring/lessons.js";
import { biologyChecks as checks } from "../../../content/biology-cells-to-ecosystems/authoring/course-checks.js";
// Expected responses reviewed directly from the question statements; no biological model functions imported.
const answers: (number | string)[][] = [
  ["plasma membrane", "@2", "@1", "cell wall", "@2", "@3"],
  ["@1", (10 + 6) / 2, "@2", 8 + 8, "@2", 14 - (14 + 2) / 2],
  ["right", "@3", 12 / 2, "@1", 8 / 2 / (8 / 1), "@2"],
  ["activation energy", 12, "enzyme", 27 - 9, "@1", "@2"],
  ["carbon dioxide", 2 * 6, "@1", 8 - 8, "@1", 3 * 6],
  ["ATP", 2 * 6, "respiration", 20 - 11, "@2", "@2"],
  ["thymine", "TTCG", 2, 4, "@1", 6 * 2],
  ["mitosis", 6 * 2, 4, 2 ** 3, "sister chromatids", "@2"],
  [3 * 2, "homologous chromosomes", 4 / 2, 3 + 3, 0, "@1"],
  ["heterozygous", (1 / 4) * 100, "@1", "@2", (2 / 4) * 100, "dominant"],
  ["substitution", 1, "gamete", "@2", "@3", 2],
  [(10 / 40) * 100, "natural selection", ((30 - 15) / 50) * 100, "@2", "@1", (18 / 60) * 100],
  ["@2", "algae", 2, "heat", "@2", 4],
  [1000 * 0.1, 2000 * 0.1 * 0.1, 5000 * 0.2, 300 / 0.1, "@2", 8000 * 0.1 ** 3],
  [10 * 2 ** 3, "carrying capacity", 12 - 12, "@1", 70 + 16 - 9, "@2"],
  ["@1", 16 - 10, "random assignment", "@2", 9 - 6, "@1"],
];
const recall: (number | string)[][] = [
  ["nucleus", "chloroplast"],
  [(18 + 6) / 2, "diffusion"],
  ["osmosis", 15 / 3],
  ["activation energy", 35 - 11],
  ["carbon dioxide", 5 * 6],
  ["ATP", 4 * 6],
  ["cytosine", 10 * 2],
  [8, 3 * 2 ** 2],
  [10 / 2, "haploid"],
  [100, "heterozygous"],
  ["mutation", 2],
  [(27 / 90) * 100, "genetic drift"],
  ["primary producer", "decomposer"],
  [4000 * 0.2 ** 2, 75 / 0.15],
  [45 + 13 - 8, "carrying capacity"],
  [19 - 8 - (15 - 8), "random assignment"],
];
const checkAnswers: (number | string)[][] = [
  [
    "@1",
    (16 + 8) / 2,
    "@2",
    "@1",
    "@2",
    5 * 6,
    "@1",
    6,
    4,
    0,
    "@1",
    "@1",
    "@2",
    6000 * 0.15 ** 2,
    "@1",
    15 - 6 - (10 - 6),
  ],
  [
    "@1",
    17 - (17 + 7) / 2,
    18 / 3,
    "@1",
    4 * 6,
    "@1",
    8 * 2,
    5 * 2,
    "@1",
    (3 / 4) * 100,
    "@1",
    ((36 - 12) / 60) * 100,
    "@1",
    180 / 0.2,
    120 + 25 - 17,
    "@1",
  ],
  [
    "@1",
    "@1",
    "@1",
    (42 - 12) / 6,
    "@1",
    (32 - 20) / 4,
    "@1",
    2 * 2 ** 4,
    7 + 7,
    (2 / 4) * 100,
    "@1",
    "@1",
    3,
    12000 * 0.05 ** 2,
    "@1",
    24 - 9 - (20 - 11),
  ],
];
function verify(q: (typeof lessons)[number]["questions"][number], expected: number | string) {
  const a = q.answerAuthority;
  if (typeof expected === "number") {
    expect(a.kind).toBe("numeric");
    if (a.kind === "numeric") expect(a.value).toBeCloseTo(expected, 8);
  } else {
    expect(a.kind).toBe("text");
    if (a.kind !== "text") throw Error("Expected text");
    const answer = expected.startsWith("@")
      ? q.choices![Number(expected.slice(1)) - 1]!.label
      : expected;
    expect(assessTextAnswer(answer, a).correct, answer).toBe(true);
    if (q.choices)
      expect(q.choices.filter((o) => assessTextAnswer(o.label, a).correct)).toHaveLength(1);
    for (const alias of a.acceptedAlternatives ?? [])
      expect(assessTextAnswer(alias, a).correct, alias).toBe(true);
    expect(assessTextAnswer("unrelated response", a).correct).toBe(false);
  }
}
describe("reviewed Biology course", () => {
  for (const [i, l] of lessons.entries()) {
    it(l.id + " has independently reviewed teaching and recall answers", () => {
      expect(l.questions).toHaveLength(6);
      expect(l.beats).toHaveLength(4);
      l.questions.forEach((q, j) => {
        verify(q, answers[i]![j]!);
        if (q.answerAuthority.kind === "numeric") expect(q.hints).toHaveLength(3);
      });
      l.cards.forEach((c, j) =>
        verify(
          {
            prompt: c.front,
            responseType: c.answerAuthority.kind === "numeric" ? "numeric" : "short_text",
            difficulty: 1,
            hints: [],
            answerAuthority: c.answerAuthority,
          },
          recall[i]![j]!,
        ),
      );
    });
    it(l.id + " pairs distinct bounded models in every beat", () => {
      l.beats.forEach((b) => {
        expect(BiologyDiagramSchema.safeParse(b.diagram).success).toBe(true);
        expect(b.diagram.cases[0]!.model).not.toEqual(b.diagram.cases[1]!.model);
      });
    });
  }
  it("gives every concept a fresh item in each independent check", () => {
    expect(checks).toHaveLength(3);
    checks.forEach((check, i) => {
      expect(check.items.map((a) => a.lessonId)).toEqual(lessons.map((l) => l.id));
      check.items.forEach((item, j) => verify(item.question, checkAnswers[i]![j]!));
    });
  });
  it("does not reuse teaching, recall or assessment prompts", () => {
    const p = [
      ...lessons.flatMap((l) => [
        ...l.questions.map((q) => q.prompt),
        ...l.cards.map((c) => c.front),
      ]),
      ...checks.flatMap((c) => c.items.map((i) => i.question.prompt)),
    ];
    expect(new Set(p).size).toBe(p.length);
  });
  it("requires the complete sequence and a real seven-day delay", () => {
    expect(checks[1]!.requiredLessonIds).toEqual(lessons.map((l) => l.id));
    expect(checks[2]!.afterCheckId).toBe(checks[1]!.id);
    expect(checks[2]!.delayDays).toBe(7);
  });
});
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadCourseBundle, assertEditorialApproval, validateCourseBundle } from "../src/index.js";
it.skipIf(process.env["DISCERE_BIOLOGY_CANDIDATE"] === "1")(
  "ships the exact reviewed biology questions, diagrams, recall and independent checks",
  async () => {
    const root = path.resolve(import.meta.dirname, "../../../content/biology-cells-to-ecosystems");
    const bundle = await loadCourseBundle(path.join(root, "bundle.json"));
    const review = JSON.parse(await readFile(path.join(root, "review/publication.json"), "utf8"));
    const validation = validateCourseBundle(bundle);
    expect(validation.issues).toEqual([]);
    expect(() => assertEditorialApproval(bundle, review, validation)).not.toThrow();
    for (const lesson of lessons) {
      lesson.questions.forEach((q, i) =>
        expect(
          bundle.questions.find((item) => item.id === "bio-" + lesson.id + "-" + (i + 1)),
        ).toMatchObject(q),
      );
      lesson.cards.forEach((c, i) =>
        expect(
          bundle.flashcards.find((item) => item.id === "bio-" + lesson.id + "-card-" + (i + 1)),
        ).toMatchObject(c),
      );
      expect(bundle.lessons.find((l) => l.id === lesson.id)!.steps.map((s) => s.diagram)).toEqual(
        lesson.beats.map((b) => b.diagram),
      );
    }
    expect(bundle.courseChecks).toEqual(checks);
  },
);
