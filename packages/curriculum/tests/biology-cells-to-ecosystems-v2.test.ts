import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { lessonQuestionRefs } from "../src/index.js";

/**
 * Biology: from cells to ecosystems, v2 conversion. Every numeric key is recomputed here from the
 * arithmetic the item describes, not read back from the authority it is checking.
 *
 * The first eight lessons (inside-a-cell to mitosis-and-growth) are written as story lessons:
 * teaching screens with no question, then practice. Their prose also does arithmetic (the two
 * rooms, the concentration of a side after water crosses, the beakers, the carbon count, the
 * cells in a tissue), so the numbers in the text are recomputed here too and checked against what
 * the screens say.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL(
      "../../../content/biology-cells-to-ecosystems/bundle.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as CourseBundle;
const byId = new Map<string, Question>(bundle.questions.map((q) => [q.id, q]));
const numericKey = (id: string): number => {
  const authority = byId.get(id)!.answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};

const complement = (strand: string) =>
  [...strand].map((base) => ({ A: "T", T: "A", C: "G", G: "C" })[base]).join("");
const differences = (a: string, b: string) => [...a].filter((base, i) => base !== b[i]).length;
const percent = (part: number, whole: number) => (part / whole) * 100;

type Blocks = ReadonlyArray<{ kind: string; text?: string }> | undefined;
const proseOf = (blocks: Blocks) => (blocks ?? []).map((block) => block.text ?? "").join(" ");
const wordCount = (text: string) => text.split(/\s+/u).filter(Boolean).length;
const storyIds = [
  "inside-a-cell",
  "diffusion-and-membranes",
  "water-across-a-membrane",
  "enzymes-and-evidence",
  "light-to-sugar",
  "fuel-to-cell-work",
  "copying-dna",
  "mitosis-and-growth",
];
// Part 2 of the biology rewrite: the inheritance, evolution and food web lessons.
storyIds.push(
  "meiosis-and-gametes",
  "predicting-inheritance",
  "mutation-and-variation",
  "natural-selection",
  "reading-food-webs",
);
// Part 3: energy through a food chain, limits to growth and what counts as evidence.
storyIds.push("energy-between-levels", "population-limits", "ecological-evidence");
const lessonById = (id: string) => bundle.lessons.find((lesson) => lesson.id === id)!;
const teachingOnly = (step: { kind: string; checkQuestionId: string }) =>
  step.kind === "explain" && !step.checkQuestionId;
const isStory = (lesson: { steps: Array<{ kind: string; checkQuestionId: string }> }) =>
  lesson.steps.some(teachingOnly);
/** Everything a learner reads in one lesson, in order, for checks on the text itself. */
const lessonProse = (id: string) => {
  const lesson = lessonById(id);
  return [
    proseOf(lesson.intro?.hook.blocks),
    ...lesson.steps.map((step) =>
      [step.headline ?? "", proseOf(step.lead), proseOf(step.afterFigure)].join(" "),
    ),
    proseOf(lesson.recap?.blocks),
    lesson.recap?.nextHook ?? "",
  ].join(" ");
};
const stepProse = (lessonId: string, stepId: string) => {
  const step = lessonById(lessonId).steps.find((item) => item.id === stepId)!;
  return [proseOf(step.lead), proseOf(step.afterFigure)].join(" ");
};

/** The two rooms of diffusion-and-membranes: each minute a quarter of a room's people cross. */
const roomsAfter = (left: number, right: number, minutes: number) => {
  const rows = [{ left, right, net: 0 }];
  for (let minute = 0; minute < minutes; minute++) {
    const last = rows[rows.length - 1]!;
    const net = last.left / 4 - last.right / 4;
    rows.push({ left: last.left - net, right: last.right + net, net });
  }
  return rows;
};

const expected: Record<string, number> = {
  // Inside a cell has no numeric items.
  "diffusion-and-membranes-hook": (20 + 4) / 2,
  "diffusion-and-membranes-2": (10 + 6) / 2,
  // Items 3 and 7 are choices now; they are recomputed in "recomputes the converted items" below.
  "diffusion-and-membranes-4": 8 + 8,
  // 4-v2: 9 on the left and 5 on the right, 14 in all; with 8 on the left the right holds 14 − 8.
  "diffusion-and-membranes-4-v2": 9 + 5 - 8,
  "diffusion-and-membranes-6": 14 - (14 + 2) / 2,
  "water-across-a-membrane-hook": 6 / 4,
  "water-across-a-membrane-3": 12 / 2,
  "water-across-a-membrane-dilute": 20 / 10,
  "water-across-a-membrane-5": 8 / 2 / (8 / 1),
  "water-across-a-membrane-8": 20 / 2,
  "enzymes-and-evidence-2": Math.max(2, 8, 12, 3),
  "enzymes-and-evidence-4": 27 - 9,
  "enzymes-and-evidence-7": (9 - 3) * 5,
  "light-to-sugar-photo-check": 6,
  "light-to-sugar-4": 8 - 8,
  "light-to-sugar-6": 3 * 6,
  "light-to-sugar-8": 4 * 6,
  "fuel-to-cell-work-2": 2 * 6,
  "fuel-to-cell-work-4": 20 - 11,
  "fuel-to-cell-work-blank": 9 - 2,
  "fuel-to-cell-work-8": 5 * 6,
  "copying-dna-3": 2,
  // 3-v2: one molecule is copied to two, and each of those two is copied again.
  "copying-dna-3-v2": [1].flatMap((molecule) => [molecule, molecule]).flatMap((molecule) => [molecule, molecule]).length,
  // Item 4 is a choice now: recomputed below.
  "copying-dna-6": 6 * 2,
  "copying-dna-8": 40,
  // 8-v2: the new strand pairs G with C, so its G count is the template's C count.
  "copying-dna-8-v2": [...complement("A".repeat(10) + "T".repeat(6) + "C".repeat(8) + "G".repeat(12))].filter(
    (base) => base === "G",
  ).length,
  "mitosis-and-growth-2": 6 * 2,
  // Item 3 is a choice now: recomputed below.
  "mitosis-and-growth-4": 2 ** 3,
  "mitosis-and-growth-blank": (8 / 2) * 2 + 8 / 2,
  "mitosis-and-growth-7": 10 / 2,
  "mitosis-and-growth-8": 2 ** 4,
  "meiosis-and-gametes-1": 3 * 2,
  "meiosis-and-gametes-3": 4 / 2,
  // 6-v2: each of 4 homologous pairs can go either way into a gamete, so 2 × 2 × 2 × 2 combinations.
  "meiosis-and-gametes-6-v2": [1, 2, 3, 4].reduce((combinations) => combinations * 2, 1),
  "meiosis-and-gametes-7": 23 * 2,
  "meiosis-and-gametes-9": 12 / 2,
  "predicting-inheritance-2": percent(1, 4),
  "predicting-inheritance-5": percent(2, 4),
  "predicting-inheritance-7": percent(3, 4),
  "mutation-and-variation-2": differences("AATG", "AACG"),
  "mutation-and-variation-7": 600,
  "mutation-and-variation-9": differences("ACGTAC", "TCGAAG"),
  "natural-selection-1": percent(10, 10 + 30),
  "natural-selection-3": percent(30, 50) - percent(15, 50),
  "natural-selection-env-b": percent(8, 40),
  "natural-selection-env-b-v2": percent(6, 40),
  "natural-selection-6": percent(18, 18 + 42),
  "reading-food-webs-3": 2,
  "reading-food-webs-6": 3 + 1,
  "energy-between-levels-1": 1000 * 0.1,
  "energy-between-levels-2": 2000 * 0.1 * 0.1,
  "energy-between-levels-3": 5000 * 0.2,
  "energy-between-levels-4": 300 / 0.1,
  // 5-v2: 1200 kJ of the 8000 kJ reaches the herbivores, as a percentage.
  "energy-between-levels-5-v2": percent(1200, 8000),
  "energy-between-levels-6": 8000 * 0.1 ** 3,
  "energy-between-levels-7": 50 / 0.1,
  "energy-between-levels-8": 6000 * 0.1 * 0.1,
  "population-limits-hook": [0, 1, 2, 3, 4, 5, 6].find((day) => 2 ** day > 20)!,
  "population-limits-3": 12 - 12,
  "population-limits-5": 70 + 16 - 9,
  "population-limits-7": 120 + 30 - 45,
  "population-limits-8": 6 * 2 ** 4,
  "ecological-evidence-hook": 19 - 4 - (22 - 12),
  "ecological-evidence-5": 9 - 6,
  "ecological-evidence-7": (7 + 9 + 11) / 3,
  "ecological-evidence-mean": (3 + 6 + 12) / 3,
};

const v2Lessons = bundle.lessons.filter((lesson) => lesson.intro);
const prefixed = (id: string) => `bio-${id}`;

describe("Biology: from cells to ecosystems (v2)", () => {
  it("converts all sixteen lessons to the v2 anatomy", () => {
    expect(v2Lessons).toHaveLength(16);
    for (const lesson of v2Lessons) {
      expect(lesson.recap).toBeDefined();
      expect(lesson.questionIds).toHaveLength(3);
      // A story lesson runs 8 to 12 screens; the lessons not yet rewritten keep 5 to 7.
      expect(lesson.steps.length).toBeGreaterThanOrEqual(isStory(lesson) ? 8 : 5);
      expect(lesson.steps.length).toBeLessThanOrEqual(isStory(lesson) ? 12 : 7);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
    }
  });

  it("labels every membrane case in the story lessons with its own numbers", () => {
    for (const id of storyIds)
      for (const step of lessonById(id).steps) {
        if (step.diagram?.type !== "biology_explorer") continue;
        for (const item of step.diagram.cases) {
          const label = /^(\d+) left, (\d+) right$/u.exec(item.label);
          if (label && item.model.kind === "membrane") {
            expect(Number(label[1]), `${id}/${step.id}`).toBe(item.model.left);
            expect(Number(label[2]), `${id}/${step.id}`).toBe(item.model.right);
          }
        }
      }
  });

  it("has numeric keys that match the arithmetic each item describes", () => {
    for (const [id, value] of Object.entries(expected))
      expect(numericKey(prefixed(id)), id).toBeCloseTo(value, 9);
  });

  it("recomputes the converted items from their givens", () => {
    const choice = (id: string) => {
      const item = byId.get(prefixed(id))!;
      const authority = item.answerAuthority;
      if (authority.kind !== "text" || !item.choices) throw new Error(`${id} is not a choice item`);
      const marked = item.choices.filter((c) => assessTextAnswer(c.label, authority).correct);
      expect(marked, id).toHaveLength(1);
      return { item, marked: marked[0]! };
    };
    // A barrier that blocks the solute leaves the left side as it started; an open one would even
    // the sides out to the mean of the two.
    const barrier = (id: string, left: number, right: number, what: string) => {
      const { item, marked } = choice(id);
      const evenedOut = (left + right) / 2;
      expect(item.prompt).toContain(`${left}`);
      expect(item.prompt).toContain(`${right}`);
      expect(marked.label).toBe(`It stays at ${left} units, because ${what}`);
      expect(item.choices!.map((c) => c.label)).toContain(
        id.endsWith("-3")
          ? `It falls towards ${evenedOut} units, as the sides even out`
          : `It falls to ${evenedOut} units, because the dye spreads out evenly`,
      );
    };
    barrier("diffusion-and-membranes-3", 12, 4, "nothing can cross");
    expect(choice("diffusion-and-membranes-3").item.choices!.map((c) => c.label)).toContain(
      "It falls to 4 units, to match the right side",
    );
    barrier("diffusion-and-membranes-7", 9, 3, "the dye cannot cross");
    expect(choice("diffusion-and-membranes-3").marked.id).toBe("b");
    expect(choice("diffusion-and-membranes-7").marked.id).toBe("a");
    // 4-v2: the slips are the left value, the original right value and the whole system.
    expect(
      byId.get("bio-diffusion-and-membranes-4-v2")!.misconceptions!.flatMap((m) => m.match.numeric ?? []),
    ).toEqual([8, 5, 9 + 5]);
    // Copying: 4 chromosomes become 4 chromosomes of 2 chromatids each, so 8 DNA molecules.
    const chromosomes = 4;
    const chromatidsEach = 2;
    expect(choice("copying-dna-4").marked.label).toBe(
      `${chromosomes} chromosomes and ${chromosomes * chromatidsEach} DNA molecules`,
    );
    expect(choice("copying-dna-4").item.choices!.map((c) => c.label)).toContain(
      `${chromosomes * chromatidsEach} chromosomes and ${chromosomes * chromatidsEach} DNA molecules`,
    );
    // Normal mitosis hands each daughter a complete set, the same 4 chromosomes the parent had.
    expect(choice("mitosis-and-growth-3").marked.label).toBe(`A complete set of ${chromosomes} chromosomes`);
    expect(choice("mitosis-and-growth-3").item.choices!.map((c) => c.label)).toEqual([
      `Half of the set, which is ${chromosomes / 2} chromosomes`,
      `A complete set of ${chromosomes} chromosomes`,
      `A set of ${chromosomes * chromatidsEach} chromosomes, one for each chromatid`,
    ]);
    // 8-v2's slips are the template's own counts of G, A and T.
    expect(byId.get("bio-copying-dna-8-v2")!.misconceptions!.flatMap((m) => m.match.numeric ?? [])).toEqual([
      12,
      10,
      6,
    ]);
    // The optimum is the temperature with the highest rate among those offered.
    const rates: Record<number, number> = { 20: 4, 30: 10, 45: 7, 60: 2 };
    const fastest = Object.entries(rates).sort(([, a], [, b]) => b - a)[0]![0];
    expect(choice("enzymes-and-evidence-optimum").marked.label).toBe(`${fastest}°C`);
    expect(choice("enzymes-and-evidence-optimum").item.choices!.map((c) => c.label)).toEqual(
      Object.keys(rates).map((t) => `${t}°C`),
    );
    // 5-v2's slips: the fraction, the ratio the wrong way round and the energy lost.
    expect(
      byId.get("bio-energy-between-levels-5-v2")!.misconceptions!.flatMap((m) => m.match.numeric ?? []),
    ).toEqual([1200 / 8000, Math.round((8000 / 1200) * 10) / 10, 100 - percent(1200, 8000)]);
    expect(
      byId.get("bio-natural-selection-env-b-v2")!.misconceptions!.flatMap((m) => m.match.numeric ?? []),
    ).toEqual([6, 100 - percent(6, 40), percent(20, 40)]);
    // Water goes to the side with the more concentrated solute: left 6 in volume 2 (3 a unit)
    // against right 8 in volume 4 (2 a unit).
    const sides = { left: 6 / 2, right: 8 / 4 };
    expect(sides.left).toBeGreaterThan(sides.right);
    expect(choice("water-across-a-membrane-7-v2").marked.label).toBe(
      `The ${sides.left > sides.right ? "left" : "right"} side, because its solute is more concentrated`,
    );
    // A gene of 600 bases that has 599 after a mutation has lost one base: a deletion.
    const change = 599 - 600;
    expect(choice("mutation-and-variation-7-v2").marked.label).toBe(
      change < 0 ? "A deletion" : change > 0 ? "An insertion" : "A substitution",
    );
    // Five survivors out of twenty, eight of the twenty brown. If the fire picked survivors at random
    // the chance of three or more brown among five is about 30%, so chance alone could explain 60% brown.
    const choose = (n: number, k: number): number =>
      k === 0 ? 1 : (choose(n, k - 1) * (n - k + 1)) / k;
    const atLeastThreeBrown = [3, 4, 5].reduce(
      (total, k) => total + (choose(8, k) * choose(12, 5 - k)) / choose(20, 5),
      0,
    );
    expect(atLeastThreeBrown).toBeCloseTo(4592 / 15504, 9);
    expect(atLeastThreeBrown).toBeGreaterThan(0.05);
    expect(choice("natural-selection-4-v2").marked.label).toBe("Either chance or selection could explain it");
    // Logistic growth: above the carrying capacity the growth term is negative, so deaths exceed births.
    const growth = (n: number, capacity: number, rate: number) => rate * n * (1 - n / capacity);
    expect(growth(400, 250, 0.5)).toBeLessThan(0);
    expect(choice("population-limits-4-v2").marked.label).toBe(
      `${growth(400, 250, 0.5) < 0 ? "Deaths exceed births" : "Births exceed deaths"}, so the population falls towards 250`,
    );
    // 1,300 animals against a capacity of 1,000 is above the capacity, which an overshoot explains.
    expect(1300).toBeGreaterThan(1000);
    expect(choice("population-limits-6-v2").marked.label).toBe(
      "The population may have overshot a capacity that did not change",
    );
    // The lessons ask the v2 versions of the items that were replaced.
    const asked = (lessonId: string) => {
      const lesson = lessonById(lessonId);
      return [
        ...lesson.questionIds,
        ...lesson.steps.flatMap((step) => [
          step.checkQuestionId,
          ...(step.workedSteps ?? []).flatMap((line) => [line.blank?.questionId, line.selfExplain?.questionId]),
        ]),
      ];
    };
    for (const [lessonId, ids] of Object.entries({
      "diffusion-and-membranes": ["diffusion-and-membranes-4-v2"],
      "water-across-a-membrane": ["water-across-a-membrane-6-v2", "water-across-a-membrane-7-v2"],
      "copying-dna": ["copying-dna-3-v2", "copying-dna-8-v2"],
      "meiosis-and-gametes": ["meiosis-and-gametes-6-v2"],
      "mutation-and-variation": ["mutation-and-variation-4-v2", "mutation-and-variation-7-v2"],
      "natural-selection": ["natural-selection-4-v2", "natural-selection-env-b-v2"],
      "energy-between-levels": ["energy-between-levels-5-v2"],
      "population-limits": ["population-limits-4-v2", "population-limits-6-v2"],
      "ecological-evidence": ["ecological-evidence-4-v2"],
    }))
      for (const id of ids) expect(asked(lessonId), id).toContain(prefixed(id));
  });

  it("recomputes the sequence keys from base pairing", () => {
    const accepted = (id: string) => {
      const authority = byId.get(prefixed(id))!.answerAuthority;
      if (authority.kind !== "text") throw new Error("not text");
      return authority.acceptedIdeas;
    };
    expect(accepted("copying-dna-2")).toEqual([complement("AAGC")]);
    expect(accepted("copying-dna-7")).toEqual([complement("ATGC")]);
  });

  it("marks exactly one choice correct on every multiple-choice item", () => {
    for (const q of bundle.questions.filter((item) => item.choices?.length)) {
      const authority = q.answerAuthority;
      if (authority.kind !== "text") throw new Error("choice item without a text authority");
      const correct = q.choices!.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(correct, q.id).toHaveLength(1);
    }
  });

  it("gives every misconception a distinct wrong value, never the key", () => {
    for (const q of bundle.questions) {
      for (const misconception of q.misconceptions ?? []) {
        if (q.answerAuthority.kind === "numeric")
          expect(misconception.match.numeric ?? [], q.id).not.toContain(q.answerAuthority.value);
      }
    }
  });
});
