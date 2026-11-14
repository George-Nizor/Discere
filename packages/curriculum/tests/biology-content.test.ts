import { assessTextAnswer } from "@discere/assessment-engine";
import type { Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { unchangedChecks, unchangedKeys } from "./helpers/unchanged-keys.js";

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
function verify(
  q: { answerAuthority: Question["answerAuthority"]; choices?: Question["choices"] },
  expected: number | string,
) {
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

const lessons = unchangedKeys("biology-cells-to-ecosystems", "bio");
const keyedChecks = unchangedChecks("biology-cells-to-ecosystems");

// The tables describe the course as first published. A key is checked here while the live bundle
// still holds it; a question rewritten since is recomputed by biology-cells-to-ecosystems-v2.test.ts.
describe("reviewed Biology course", () => {
  for (const [i, l] of lessons.entries()) {
    it(l.id + " still has its independently reviewed teaching and recall answers", () => {
      l.questions.forEach((q, j) => {
        if (q) verify(q, answers[i]![j]!);
      });
      l.cards.forEach((card, j) => {
        if (card) verify({ answerAuthority: card.answerAuthority }, recall[i]![j]!);
      });
    });
  }
  it("still has its independently reviewed answers to the fresh problems in each check", () => {
    keyedChecks.forEach((check, i) => {
      check.items.forEach((item, j) => {
        if (item) verify(item.question, checkAnswers[i]![j]!);
      });
    });
  });
});
