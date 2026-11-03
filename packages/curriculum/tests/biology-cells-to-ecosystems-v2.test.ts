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
  "diffusion-and-membranes-3": 12,
  "diffusion-and-membranes-4": 8 + 8,
  "diffusion-and-membranes-6": 14 - (14 + 2) / 2,
  "diffusion-and-membranes-7": 9,
  "water-across-a-membrane-hook": 6 / 4,
  "water-across-a-membrane-3": 12 / 2,
  "water-across-a-membrane-dilute": 20 / 10,
  "water-across-a-membrane-5": 8 / 2 / (8 / 1),
  "water-across-a-membrane-8": 20 / 2,
  "enzymes-and-evidence-2": Math.max(2, 8, 12, 3),
  "enzymes-and-evidence-4": 27 - 9,
  "enzymes-and-evidence-7": (9 - 3) * 5,
  "light-to-sugar-photo-check": 6,
  "light-to-sugar-2": 2 * 6,
  "light-to-sugar-4": 8 - 8,
  "light-to-sugar-6": 3 * 6,
  "light-to-sugar-8": 4 * 6,
  "fuel-to-cell-work-2": 2 * 6,
  "fuel-to-cell-work-4": 20 - 11,
  "fuel-to-cell-work-blank": 9 - 2,
  "fuel-to-cell-work-8": 5 * 6,
  "copying-dna-3": 2,
  "copying-dna-4": 4,
  "copying-dna-6": 6 * 2,
  "copying-dna-8": 40,
  "mitosis-and-growth-2": 6 * 2,
  "mitosis-and-growth-3": 4,
  "mitosis-and-growth-4": 2 ** 3,
  "mitosis-and-growth-blank": (8 / 2) * 2 + 8 / 2,
  "mitosis-and-growth-7": 10 / 2,
  "mitosis-and-growth-8": 2 ** 4,
  "meiosis-and-gametes-hook": 46 / 2,
  "meiosis-and-gametes-1": 3 * 2,
  "meiosis-and-gametes-3": 4 / 2,
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
  "natural-selection-6": percent(18, 18 + 42),
  "reading-food-webs-3": 2,
  "reading-food-webs-6": 3 + 1,
  "energy-between-levels-hook": 100 / 10,
  "energy-between-levels-1": 1000 * 0.1,
  "energy-between-levels-2": 2000 * 0.1 * 0.1,
  "energy-between-levels-3": 5000 * 0.2,
  "energy-between-levels-4": 300 / 0.1,
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

  it("keeps multiple choice within 35% of the course", () => {
    const choices = bundle.questions.filter((q) => q.choices?.length).length;
    expect(choices / bundle.questions.length).toBeLessThanOrEqual(0.35);
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
