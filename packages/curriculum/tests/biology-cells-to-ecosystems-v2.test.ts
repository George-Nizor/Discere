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
      "../../../content/biology-cells-to-ecosystems/.authoring/candidate.json",
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

  it("writes the first eight lessons as story lessons", () => {
    for (const id of storyIds) {
      const lesson = lessonById(id);
      expect(isStory(lesson), id).toBe(true);
      expect(lesson.intro?.hook.questionId, `${id} opens with a question`).toBeUndefined();
      const opener = wordCount(proseOf(lesson.intro?.hook.blocks));
      expect(opener, `${id} opener`).toBeGreaterThanOrEqual(120);
      expect(opener, `${id} opener`).toBeLessThanOrEqual(200);
      expect(wordCount(lesson.intro!.promise)).toBeLessThanOrEqual(25);
      expect(lesson.intro!.estimatedMinutes).toBe(12);
      const teaching = lesson.steps.filter(teachingOnly);
      expect(teaching.length / lesson.steps.length, `${id} teaching share`).toBeGreaterThanOrEqual(
        0.4,
      );
      const questions = lesson.steps.filter((step) => step.checkQuestionId);
      expect(questions.length, `${id} question screens`).toBeGreaterThanOrEqual(3);
      expect(questions.length, `${id} question screens`).toBeLessThanOrEqual(6);
      expect(
        lesson.steps.some((step) => step.diagram),
        `${id} has a figure`,
      ).toBe(true);
      let run = 0;
      for (const step of lesson.steps) {
        run = teachingOnly(step) ? run + 1 : 0;
        expect(run, `${id} teaching run at ${step.id}`).toBeLessThanOrEqual(3);
      }
      for (const step of teaching) {
        const words = wordCount(stepProse(id, step.id));
        expect(words, `${id}/${step.id}`).toBeGreaterThanOrEqual(80);
        expect(words, `${id}/${step.id}`).toBeLessThanOrEqual(250);
        expect(step.headline, `${id}/${step.id}`).toBeTruthy();
      }
      for (const step of questions)
        expect(wordCount(proseOf(step.lead)), `${id}/${step.id} lead`).toBeLessThanOrEqual(60);
      expect(lesson.recap?.nextHook, `${id} nextHook`).toBeTruthy();
    }
  });

  it("keeps the story lessons free of questions in prose and of em dashes", () => {
    for (const id of storyIds) {
      const text = lessonProse(id);
      expect(text, id).not.toMatch(/\?/u);
      expect(text, id).not.toMatch(/[—–]/u);
    }
  });

  it("chains each story lesson into the next", () => {
    // The recap's nextHook names what the next opener starts from.
    expect(lessonById("inside-a-cell").recap?.nextHook).toMatch(/two rooms and an open door/u);
    expect(proseOf(lessonById("diffusion-and-membranes").intro?.hook.blocks)).toMatch(
      /two rooms of equal size/u,
    );
    expect(lessonById("diffusion-and-membranes").recap?.nextHook).toMatch(/water/u);
    expect(proseOf(lessonById("water-across-a-membrane").intro?.hook.blocks)).toMatch(
      /passes water and stops a solute/u,
    );
    expect(lessonById("water-across-a-membrane").recap?.nextHook).toMatch(/two beakers/u);
    expect(proseOf(lessonById("enzymes-and-evidence").intro?.hook.blocks)).toMatch(
      /Two beakers stand side by side/u,
    );
    expect(lessonById("enzymes-and-evidence").recap?.nextHook).toMatch(/sapling/u);
    expect(proseOf(lessonById("light-to-sugar").intro?.hook.blocks)).toMatch(/sapling/u);
    expect(lessonById("light-to-sugar").recap?.nextHook).toMatch(/candle/u);
    expect(proseOf(lessonById("fuel-to-cell-work").intro?.hook.blocks)).toMatch(/A candle burns/u);
    expect(lessonById("fuel-to-cell-work").recap?.nextHook).toMatch(/zip/u);
    expect(proseOf(lessonById("copying-dna").intro?.hook.blocks)).toMatch(/Think of a zip/u);
    expect(lessonById("copying-dna").recap?.nextHook).toMatch(/worksheet/u);
    expect(proseOf(lessonById("mitosis-and-growth").intro?.hook.blocks)).toMatch(/worksheet/u);
    expect(lessonById("mitosis-and-growth").recap?.nextHook).toMatch(/46 chromosomes/u);
  });

  it("recomputes the beakers and the control comparison in enzymes-and-evidence", () => {
    const opener = proseOf(lessonById("enzymes-and-evidence").intro?.hook.blocks);
    expect(opener).toContain("Beaker A makes 4 units");
    expect(opener).toContain("makes 12 units every minute");
    const beakers = stepProse("enzymes-and-evidence", "the-push-a-reaction-needs");
    expect(12 / 4).toBe(3);
    expect(beakers).toContain("three times as fast");
    // The figure's two beakers run at 4 and 12 units a minute for three minutes.
    const figure = lessonById("enzymes-and-evidence").steps.find(
      (step) => step.id === "the-push-a-reaction-needs",
    )!.diagram;
    const series = figure?.type === "biology_explorer" ? figure.cases.map((c) => c.model) : [];
    expect(series.map((m) => (m.kind === "series" ? m.points[3]![1] / m.points[3]![0] : 0))).toEqual([
      4, 12,
    ]);
    // Reading a table of rates: B's largest rate is its last; C peaks at 25 °C and falls by 40 °C.
    const b = [1, 3, 7, 11];
    const c = [3, 9, 5, 1];
    const temps = [10, 25, 40, 55];
    expect(temps[b.indexOf(Math.max(...b))]).toBe(55);
    expect(temps[c.indexOf(Math.max(...c))]).toBe(25);
    expect(c[2]!).toBeLessThan(Math.max(...c));
    const reading = stepProse("enzymes-and-evidence", "reading-a-table-of-rates");
    expect(reading).toContain(`rates at 10, 25, 40 and 55°C are ${b.slice(0, -1).join(", ")} and ${b.at(-1)} units a minute`);
    expect(reading).toContain(`largest rate is ${Math.max(...b)}, at 55°C`);
    // The teaching figure for the busy-sites screen levels off for a fixed enzyme.
    const sites = lessonById("enzymes-and-evidence").steps.find(
      (step) => step.id === "a-limited-number-of-sites",
    )!.diagram;
    const fixed = sites?.type === "biology_explorer" ? sites.cases[0]!.model : undefined;
    const rates = fixed?.kind === "series" ? fixed.points.map((p) => p[1]) : [];
    expect(rates[3]! - rates[2]!).toBeLessThan(rates[2]! - rates[1]!);
    // Subtracting a control: 20 − 8 = 12, and a gap of 8 − 5 = 3 a minute over 4 minutes is 12.
    const fair = stepProse("enzymes-and-evidence", "testing-fairly");
    expect(fair).toContain(`the enzyme accounts for the extra ${20 - 8}`);
    expect(fair).toContain(`differ by ${8 - 5} units a minute, so after four minutes the gap is ${(8 - 5) * 4} units`);
  });

  it("recomputes the tree and the carbon count in light-to-sugar", () => {
    const opener = proseOf(lessonById("light-to-sugar").intro?.hook.blocks);
    expect(opener).toContain("weighs 2 kg");
    expect(opener).toContain(`the tree weighs 77 kg, which is ${77 - 2} kg more`);
    expect(opener).toContain("lost only 60 grams");
    // 75 kg is 75,000 g, over a thousand times the soil's 60 g.
    expect((77 - 2) * 1000 / 60).toBeGreaterThan(1000);
    expect(stepProse("light-to-sugar", "where-the-75-kg-came-from")).toContain(
      "gained 75 kilograms, over a thousand times as much",
    );
    const counting = stepProse("light-to-sugar", "counting-the-carbon");
    expect(counting).toContain(`5 × 6 = ${5 * 6} carbon atoms, so it takes in ${5 * 6} CO₂`);
    expect(counting).toContain(`${5 * 6} water molecules and release ${5 * 6} oxygen molecules`);
    // The equation 6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂ balances for carbon, hydrogen and oxygen.
    expect(6 * 1).toBe(6);
    expect(6 * 2).toBe(12);
    expect(6 * 2 + 6 * 1).toBe(6 * 1 + 6 * 2);
    // The less-CO₂ curve flattens, the other keeps climbing.
    const flat = lessonById("light-to-sugar").steps.find((step) => step.id === "what-limits-the-rate")!
      .diagram;
    const [less, more] = flat?.type === "biology_explorer" ? flat.cases.map((c) => c.model) : [];
    const last = (m: typeof less) => (m?.kind === "series" ? m.points.map((p) => p[1]) : []);
    expect(last(less).at(-1)).toBe(last(less).at(-2));
    expect(last(more).at(-1)!).toBeGreaterThan(last(more).at(-2)!);
  });

  it("recomputes the carbon and oxygen counts in fuel-to-cell-work", () => {
    const carbon = stepProse("fuel-to-cell-work", "following-the-carbon");
    expect(carbon).toContain(`Three glucose molecules hold 3 × 6 = ${3 * 6} carbon atoms`);
    expect(carbon).toContain(`produces ${3 * 6} CO₂ molecules`);
    // Respiration balances for oxygen atoms: 6 + 6 × 2 on the left, 6 × 2 + 6 on the right.
    expect(6 + 6 * 2).toBe(6 * 2 + 6);
    // The jar in the teaching figure: organisms lose 24 − 18, the blank loses 24 − 23.
    const jar = lessonById("fuel-to-cell-work").steps.find(
      (step) => step.id === "measuring-respiration",
    )!.diagram;
    const [organisms, blank] = jar?.type === "biology_explorer" ? jar.cases.map((c) => c.model) : [];
    const used = (m: typeof organisms) =>
      m?.kind === "series" ? m.points[0]![1] - m.points[m.points.length - 1]![1] : NaN;
    expect(used(organisms)).toBe(6);
    expect(used(blank)).toBe(1);
    const text = stepProse("fuel-to-cell-work", "measuring-respiration");
    expect(text).toContain(`the organisms themselves used 6 − 1 = ${used(organisms) - used(blank)}`);
    expect(text).toContain("loses 6 units of oxygen in three minutes and the blank loses 1");
  });

  it("recomputes the copying and chromosome counts in copying-dna and mitosis-and-growth", () => {
    expect(complement("GATC")).toBe("CTAG");
    expect(stepProse("copying-dna", "one-strand-fixes-the-other")).toContain(
      `so the partner reads ${complement("GATC")}`,
    );
    // Two chromosomes, each with two chromatids, hold four DNA molecules.
    expect(stepProse("copying-dna", "chromosomes-and-their-copies")).toContain(
      `each now holds two DNA molecules, ${["zero", "one", "two", "three", "four"][2 * 2]} in all`,
    );
    const copied = lessonById("copying-dna").steps.find(
      (step) => step.id === "chromosomes-and-their-copies",
    )!.diagram;
    expect(copied?.type === "biology_explorer" ? copied.cases.map((c) => c.model) : []).toEqual([
      { kind: "division", process: "mitosis", pairs: 1, phase: 0 },
      { kind: "division", process: "mitosis", pairs: 1, phase: 1 },
    ]);
    const counting = stepProse("mitosis-and-growth", "counting-dna-after-copying");
    expect(counting).toContain(`3 × 2 = ${3 * 2} DNA molecules`);
    expect(counting).toContain(`8 ÷ 2 = ${8 / 2} chromosomes`);
    // The tissue of 6 cells where a third divide: 2 become 4, 4 stay, so 8 cells; all dividing gives 12.
    const tissue = stepProse("mitosis-and-growth", "division-on-demand");
    const dividing = 6 / 3;
    expect(tissue).toContain(`${dividing} cells that divide become ${dividing * 2}`);
    expect(tissue).toContain(`${6 - dividing} do not divide, so the tissue now holds ${dividing * 2} + ${6 - dividing} = ${dividing * 2 + 6 - dividing} cells`);
    expect(tissue).toContain(`grown by ${dividing}`);
    expect(tissue).toContain(`doubling to ${6 * 2}`);
    expect(stepProse("mitosis-and-growth", "a-doubling-each-round")).toContain(
      `giving ${2 * 2} cells`,
    );
  });

  it("recomputes the two-rooms walkthrough in diffusion-and-membranes", () => {
    const rows = roomsAfter(20, 4, 3);
    expect(rows.map((row) => [row.left, row.right])).toEqual([
      [20, 4],
      [16, 8],
      [14, 10],
      [13, 11],
    ]);
    // A quarter of each room crosses: 5 and 1, then 4 and 2.
    expect(20 / 4).toBe(5);
    expect(4 / 4).toBe(1);
    expect(16 / 4).toBe(4);
    expect(8 / 4).toBe(2);
    // The net movement halves each minute because the gap halves.
    expect(rows[1]!.net).toBe(4);
    expect(rows[2]!.net).toBe(2);
    expect(rows[3]!.net).toBe(1);
    expect(rows[2]!.left - rows[2]!.right).toBe((rows[1]!.left - rows[1]!.right) / 2);
    const text = stepProse("diffusion-and-membranes", "two-rooms-and-an-open-door");
    expect(text).toContain(`a quarter of the 20 people on the left (${20 / 4} people)`);
    expect(text).toContain(`a quarter of the 4 people on the right (${4 / 4} person)`);
    expect(text).toContain(`difference between the two crossings is ${20 / 4 - 4 / 4} people`);
    expect(text).toContain(`The rooms now hold ${rows[1]!.left} and ${rows[1]!.right}`);
    expect(text).toContain(
      `A quarter of ${rows[1]!.left} is ${rows[1]!.left / 4} and a quarter of ${rows[1]!.right} is ${rows[1]!.right / 4}`,
    );
    expect(text).toContain(
      `the net movement falls to ${rows[2]!.net} people and the rooms hold ${rows[2]!.left} and ${rows[2]!.right}`,
    );
    // Where the crowd settles is the opener's key: half of the 24 people.
    expect(numericKey("bio-diffusion-and-membranes-hook")).toBe((20 + 4) / 2);
    // At 12 and 12 a quarter of a room is 3 people, crossing each way.
    const settled = roomsAfter(12, 12, 1);
    expect(settled[1]).toEqual({ left: 12, right: 12, net: 0 });
    expect(stepProse("diffusion-and-membranes", "why-nothing-seems-to-change")).toContain(
      `A quarter of each room, which is ${12 / 4} people`,
    );
  });

  it("recomputes the equal-share example in diffusion-and-membranes", () => {
    const share = (a: number, b: number) => (a + b) / 2;
    const text = stepProse("diffusion-and-membranes", "where-the-sides-settle");
    expect(text).toContain(
      `The total is ${9 + 3}, so at equilibrium each side holds ${share(9, 3)}`,
    );
    expect(text).toContain(
      `falls from 9 to ${share(9, 3)}, so ${9 - share(9, 3)} units must cross`,
    );
    expect(text).toContain(`The second one also has a total of ${2 + 10}`);
    expect(share(2, 10)).toBe(share(9, 3));
    expect(text).toContain(`it settles at ${share(2, 10)} on each side too`);
    // The figure cases carry the numbers the text uses.
    const cases = lessonById("diffusion-and-membranes").steps.find(
      (step) => step.id === "where-the-sides-settle",
    )!.diagram;
    expect(cases?.type).toBe("biology_explorer");
    const models = cases?.type === "biology_explorer" ? cases.cases.map((c) => c.model) : [];
    expect(models).toEqual([
      { kind: "membrane", left: 9, right: 3, permits: "solute" },
      { kind: "membrane", left: 2, right: 10, permits: "solute" },
    ]);
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

  it("recomputes the concentrations worked through in water-across-a-membrane", () => {
    const concentration = (amount: number, volume: number) => amount / volume;
    const squash = stepProse("water-across-a-membrane", "how-strong-a-solution-is");
    expect(squash).toContain(
      `2 spoonfuls in 1 litre, which is ${concentration(2, 1)} spoonfuls per litre`,
    );
    expect(squash).toContain(
      `2 spoonfuls in 2 litres, which is ${concentration(2, 2)} spoonful per litre`,
    );
    const numbers = stepProse("water-across-a-membrane", "following-the-numbers");
    expect(numbers).toContain(`6 ÷ 2 = ${concentration(6, 2)} units per volume`);
    expect(numbers).toContain(`6 ÷ 3 = ${concentration(6, 3)}`);
    expect(concentration(6, 3)).toBeLessThan(concentration(6, 2));
    expect(numbers).toContain(`12 units in volume 3, a concentration of ${concentration(12, 3)}`);
    expect(numbers).toContain(`12 ÷ 2 = ${concentration(12, 2)}`);
    expect(concentration(12, 2)).toBeGreaterThan(concentration(12, 3));
    // Doubling the volume halves the concentration; halving it doubles it.
    expect(concentration(10, 2 * 4) / concentration(10, 4)).toBe(0.5);
    expect(concentration(10, 4 / 2) / concentration(10, 4)).toBe(2);
    // The jug and the opening question both keep the syrup fixed.
    expect(concentration(6, 4)).toBe(1.5);
  });

  it("chains the inheritance, evolution and food web lessons into one another", () => {
    expect(lessonById("mitosis-and-growth").recap?.nextHook).toMatch(/46 chromosomes/u);
    expect(proseOf(lessonById("meiosis-and-gametes").intro?.hook.blocks)).toMatch(/46 chromosomes/u);
    expect(lessonById("meiosis-and-gametes").recap?.nextHook).toMatch(/coin/u);
    expect(proseOf(lessonById("predicting-inheritance").intro?.hook.blocks)).toMatch(/coin/u);
    expect(lessonById("predicting-inheritance").recap?.nextHook).toMatch(/scribe/u);
    expect(proseOf(lessonById("mutation-and-variation").intro?.hook.blocks)).toMatch(/scribe/u);
    expect(lessonById("mutation-and-variation").recap?.nextHook).toMatch(/beetles/u);
    expect(proseOf(lessonById("natural-selection").intro?.hook.blocks)).toMatch(/beetles/u);
    expect(lessonById("natural-selection").recap?.nextHook).toMatch(/pond/u);
    expect(proseOf(lessonById("reading-food-webs").intro?.hook.blocks)).toMatch(/pond/u);
    expect(lessonById("reading-food-webs").recap?.nextHook).toMatch(/heat/u);
    expect(proseOf(lessonById("energy-between-levels").intro?.hook.blocks)).toMatch(/heat/u);
    expect(lessonById("energy-between-levels").recap?.nextHook).toMatch(/water lilies/u);
    expect(proseOf(lessonById("population-limits").intro?.hook.blocks)).toMatch(/lilies/u);
    expect(lessonById("population-limits").recap?.nextHook).toMatch(/fertiliser/u);
    expect(proseOf(lessonById("ecological-evidence").intro?.hook.blocks)).toMatch(/fertiliser/u);
  });

  it("recomputes the energy passed up the pond chain in energy-between-levels", () => {
    // 4000 kJ in the algae, a tenth passed on at each of three steps.
    const tidy = (value: number) => Math.round(value * 1e9) / 1e9;
    const pond = [4000, 4000 * 0.1, 4000 * 0.1 * 0.1, 4000 * 0.1 ** 3].map(tidy);
    expect(pond).toEqual([4000, 400, 40, 4]);
    const chain = stepProse("energy-between-levels", "up-the-chain");
    expect(chain).toContain(`4000 × 0.1 = ${pond[1]} kJ`);
    expect(chain).toContain(`${pond[1]} × 0.1 = ${pond[2]} kJ`);
    expect(chain).toContain(`${pond[2]} × 0.1 = ${pond[3]} kJ`);
    expect(chain).toContain(`4000 × 0.1 × 0.1 = ${pond[2]} kJ`);
    expect(pond[2]! / pond[0]!).toBeCloseTo(1 / 100, 12);
    // The cow gained a tenth of its grain.
    expect(10 / 100).toBe(0.1);
    // A stated 20% against 10% from 3000 kJ, over one step and over two.
    const stated = stepProse("energy-between-levels", "a-stated-efficiency");
    expect(3000 * 0.1).toBe(300);
    expect(3000 * 0.2).toBe(600);
    expect(3000 * 0.2 ** 2).toBeCloseTo(120, 9);
    expect(3000 * 0.1 ** 2).toBeCloseTo(30, 9);
    expect(stated).toContain("passes on 300 kJ");
    expect(stated).toContain("passes on 600 kJ");
    expect(stated).toContain("30 kJ and the 20% chain holds 120 kJ, four times as much");
    expect(120 / 30).toBeCloseTo(4, 9);
    // Working backwards: 25 kJ at the top needs 250 kJ, then 2500 kJ.
    const back = stepProse("energy-between-levels", "working-backwards");
    expect(25 / 0.1).toBeCloseTo(250, 9);
    expect(250 / 0.1).toBeCloseTo(2500, 9);
    expect(back).toContain("25 ÷ 0.10 = 250 kJ");
    expect(back).toContain("250 ÷ 0.10 = 2500 kJ");
  });

  it("recomputes the lily patch and the births and deaths in population-limits", () => {
    const doubling = [0, 1, 2, 3].map((day) => 2 ** day);
    expect(doubling).toEqual([1, 2, 4, 8]);
    // The questions' doubling: the first day past the 20 square metre pond is day 5.
    expect([0, 1, 2, 3, 4, 5, 6].map((day) => 2 ** day)).toEqual([1, 2, 4, 8, 16, 32, 64]);
    // The patch in the real pond adds 1, 2, 4, then 5, 4, 2 and settles near 20.
    const real = [1, 2, 4, 8, 13, 17, 19];
    const added = real.slice(1).map((area, i) => area - real[i]!);
    expect(added).toEqual([1, 2, 4, 5, 4, 2]);
    const limit = stepProse("population-limits", "the-limit-of-the-pond");
    expect(limit).toContain(`the patch adds ${added.slice(3).join(", ").replace(/, (\d+)$/u, " and $1")}`);
    expect(limit).toContain("pond's area of 20 square metres");
    expect(Math.max(...real)).toBeLessThan(20);
    // Filling in half the pond halves the limit to 10.
    expect(20 / 2).toBe(10);
    const half = [1, 2, 4, 7, 9, 10, 10];
    expect(Math.max(...half)).toBe(20 / 2);
    expect(stepProse("population-limits", "when-the-limit-moves")).toContain(
      "levels off near 10 instead",
    );
    // The worked population: 50 with 12 births and 7 deaths.
    const births = stepProse("population-limits", "births-and-deaths");
    expect(births).toContain(`12 − 7 = ${12 - 7}`);
    expect(births).toContain(`50 + ${12 - 7} = ${50 + 12 - 7}`);
    // The doubling step names the first three days' gains.
    expect(stepProse("population-limits", "doubling-every-day")).toContain(
      `Today it covers 1 square metre. After one day it covers ${2 ** 1}, after two days ${2 ** 2} and after three days ${2 ** 3}`,
    );
  });

  it("recomputes the plant measurements worked through in ecological-evidence", () => {
    // Seedlings P and Q: Q ends taller, P grows more.
    const growthP = 15 - 6;
    const growthQ = 17 - 10;
    expect(growthP).toBe(9);
    expect(growthQ).toBe(7);
    expect(17).toBeGreaterThan(15);
    expect(growthP).toBeGreaterThan(growthQ);
    const baseline = stepProse("ecological-evidence", "where-each-plant-starts");
    expect(baseline).toContain(`P grew 15 − 6 = ${growthP} cm and Q grew 17 − 10 = ${growthQ} cm`);
    // The gardener's plants: B ends taller, A grows 5 cm more.
    expect(22).toBeGreaterThan(19);
    expect(19 - 4 - (22 - 12)).toBe(numericKey("bio-ecological-evidence-hook"));
    // Treated 12 cm against control 8 cm.
    const group = stepProse("ecological-evidence", "a-control-and-a-fair-draw");
    expect(group).toContain(`12 − 8 = ${12 - 8} cm`);
    expect(18 - 6).toBe(12);
    expect(14 - 6).toBe(8);
    // The plotted groups for the practice difference grow 9 cm and 6 cm.
    expect(14 - 5).toBe(9);
    expect(11 - 5).toBe(6);
    expect(9 - 6).toBe(numericKey("bio-ecological-evidence-5"));
    // Two sets of three pots share a mean of 8 and differ in spread.
    const wide = [5, 8, 11];
    const tight = [7, 8, 9];
    const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(mean(wide)).toBe(8);
    expect(mean(tight)).toBe(8);
    expect(Math.max(...wide) - Math.min(...wide)).toBeGreaterThan(
      Math.max(...tight) - Math.min(...tight),
    );
    const pots = stepProse("ecological-evidence", "many-pots");
    expect(pots).toContain("(5 + 8 + 11) ÷ 3 = 8 cm");
    expect(pots).toContain("7, 8 and 9 cm also have a mean of 8 cm");
    expect(mean([3, 6, 12])).toBe(numericKey("bio-ecological-evidence-mean"));
    // The frog survey: shaded ponds hold fewer frogs at every reed cover.
    const sunny = [4, 7, 10, 13];
    const shaded = [1, 2, 3, 4];
    expect(shaded.every((frogs, i) => frogs < sunny[i]!)).toBe(true);
  });

  it("recomputes the chromosome counts worked through in meiosis-and-gametes", () => {
    const opener = proseOf(lessonById("meiosis-and-gametes").intro?.hook.blocks);
    expect(opener).toContain(`46 + 46 = ${46 + 46}`);
    expect(opener).toContain(`would hold ${(46 + 46) * 2}`);
    expect(stepProse("meiosis-and-gametes", "two-sets-of-chromosomes")).toContain(
      `23 pairs make 23 × 2 = ${23 * 2} chromosomes`,
    );
    // The three-pair cell: 6 chromosomes, then 3 in each of two cells, then 3 in each of four.
    const pairs = 3;
    const afterFirst = stepProse("meiosis-and-gametes", "copy-once-divide-twice");
    expect(afterFirst).toContain(`${pairs} chromosomes, down from ${pairs * 2}`);
    expect(afterFirst).toContain(`each cell holds ${pairs * 2} DNA molecules`);
    const afterSecond = stepProse("meiosis-and-gametes", "the-second-division");
    expect(afterSecond).toContain(`${pairs} × 2 = ${pairs * 2} chromosomes`);
    expect(afterSecond).toContain(`each cell holds ${pairs} DNA molecules`);
    const phases = (id: string) => {
      const figure = lessonById("meiosis-and-gametes").steps.find((step) => step.id === id)!.diagram;
      return figure?.type === "biology_explorer"
        ? figure.cases.map((c) => (c.model.kind === "division" ? c.model.phase : -1))
        : [];
    };
    // Phase 2 is two cells and phase 3 is four; the chromosomes per cell halve once, at the first division.
    expect(phases("copy-once-divide-twice")).toEqual([1, 2]);
    expect(phases("the-second-division")).toEqual([2, 3]);
    // Shuffling: each pair splits two ways, so 3 pairs give 2³ and 23 pairs give over 8 million.
    const shuffle = stepProse("meiosis-and-gametes", "why-no-two-gametes-are-alike");
    expect(shuffle).toContain(`2 × 2 × 2 = ${2 ** 3}`);
    expect(2 ** 23).toBeGreaterThan(8_000_000);
    expect(shuffle).toContain("over 8 million");
  });

  it("recomputes the Punnett squares worked through in predicting-inheritance", () => {
    const square = (first: string, second: string) =>
      [...first].flatMap((a) => [...second].map((b) => [a, b].sort().join("")));
    const aaAa = square("Aa", "Aa");
    expect(aaAa.sort()).toEqual(["AA", "Aa", "Aa", "aa"]);
    expect(aaAa.filter((g) => g === "Aa")).toHaveLength(2);
    // AA × Aa: every box holds an A, and half of the boxes are Aa.
    const dominantCross = square("AA", "Aa");
    expect(dominantCross.every((g) => g.includes("A"))).toBe(true);
    expect(dominantCross.filter((g) => g === "Aa")).toHaveLength(dominantCross.length / 2);
    const phenotype = stepProse("predicting-inheritance", "what-shows-in-the-plant");
    expect(phenotype).toContain("Every box of the square holds at least one A");
    expect(phenotype).toContain("half of them are Aa");
    // Aa × aa gives two aa boxes in four.
    expect(square("Aa", "aa").filter((g) => g === "aa")).toHaveLength(2);
    // Aa × Aa: 3 of 4 boxes show the dominant phenotype, 1 of 4 is aa.
    expect(aaAa.filter((g) => g.includes("A")).length / aaAa.length).toBe(0.75);
    expect(stepProse("predicting-inheritance", "a-chance-for-each-child")).toContain(
      `${percent(1, aaAa.length)}% chance of being aa`,
    );
    const opener = proseOf(lessonById("predicting-inheritance").intro?.hook.blocks);
    expect(opener).toContain("four outcomes");
    expect(2 * 2).toBe(4);
  });

  it("recomputes the scribe and the sequence comparisons in mutation-and-variation", () => {
    expect(stepProse("mutation-and-variation", "a-change-in-the-bases")).toContain(
      `500 ÷ 100 = ${500 / 100} slips`,
    );
    expect(proseOf(lessonById("mutation-and-variation").intro?.hook.blocks)).toContain("500 words");
    // ACGT against AGGT differs at one position, the second.
    expect(differences("ACGT", "AGGT")).toBe(1);
    expect([..."ACGT"].findIndex((base, i) => base !== "AGGT"[i])).toBe(1);
    expect(stepProse("mutation-and-variation", "spotting-the-changed-base")).toContain(
      "Exactly one position differs",
    );
    const figure = lessonById("mutation-and-variation").steps.find(
      (step) => step.id === "spotting-the-changed-base",
    )!.diagram;
    expect(figure?.type === "biology_explorer" ? figure.cases.map((c) => c.model) : []).toEqual([
      { kind: "dna", sequence: "ACGT" },
      { kind: "dna", sequence: "AGGT" },
    ]);
    // A substitution keeps a 600-base gene at 600 bases.
    expect(numericKey("bio-mutation-and-variation-7")).toBe(600);
  });

  it("recomputes the beetle frequencies worked through in natural-selection", () => {
    const opener = proseOf(lessonById("natural-selection").intro?.hook.blocks);
    expect(opener).toContain("40 beetles");
    expect(16 + 24).toBe(40);
    const first = stepProse("natural-selection", "what-share-of-the-meadow");
    expect(first).toContain(`16 ÷ 40 = ${16 / 40}, which is ${percent(16, 40)}%`);
    expect(first).toContain(`24 ÷ 40 = ${percent(24, 40)}%`);
    expect(first).toContain(`32 ÷ 80 = ${percent(32, 80)}%`);
    expect(32 + 48).toBe(80);
    expect(percent(32, 80)).toBe(percent(16, 40));
    // The birds eat half of the 16 blue beetles: 8 left, 32 in all, 25% against 40%.
    const blueLeft = 16 / 2;
    const total = blueLeft + 24;
    const birds = stepProse("natural-selection", "what-the-birds-did");
    expect(birds).toContain(`8 + 24 = ${total} beetles`);
    expect(birds).toContain(`8 ÷ 32 = ${percent(blueLeft, total)}%`);
    expect(birds).toContain(`40% − 25% = ${percent(16, 40) - percent(blueLeft, total)} percentage points`);
    // 15 percent of 40 is 6 points, the muddle the screen warns about.
    expect((15 / 100) * 40).toBe(6);
    // Two offspring each: 16 blue and 48 gold in a generation of 64, still 25% blue.
    expect(birds).toContain(`${blueLeft * 2} blue young`);
    expect(birds).toContain(`${24 * 2} gold young`);
    expect(birds).toContain(`${blueLeft * 2 + 24 * 2} beetles`);
    expect(birds).toContain(`16 ÷ 64 = ${percent(blueLeft * 2, blueLeft * 2 + 24 * 2)}%`);
    // The two environments in the figure: blue goes from 50% to 70% and to 30%.
    const environments = lessonById("natural-selection").steps.find(
      (step) => step.id === "the-environment-sets-the-direction",
    )!.diagram;
    const [a, b] = environments?.type === "biology_explorer" ? environments.cases.map((c) => c.model) : [];
    const blueAfter = (m: typeof a) =>
      m?.kind === "population" ? percent(m.after[0], m.after[0] + m.after[1]) : NaN;
    expect(blueAfter(a)).toBe(70);
    expect(blueAfter(b)).toBe(30);
    const environmentText = stepProse("natural-selection", "the-environment-sets-the-direction");
    expect(environmentText).toContain("rises from 50% to 70%");
    expect(environmentText).toContain("falls to 30%");
    // Chance and migration: 3 of 4 survivors against 5 of 10, and 20 of 80 after the arrivals.
    const other = stepProse("natural-selection", "other-causes-of-change");
    expect(other).toContain(`${10 - 6} survivors are ${5 - 2} blue and ${5 - 4} gold`);
    expect(other).toContain(`5 ÷ 10 = ${percent(5, 10)}% to 3 ÷ 4 = ${percent(3, 4)}%`);
    expect(other).toContain(`rise of ${percent(3, 4) - percent(5, 10)} points`);
    expect(other).toContain(`20 ÷ 80 = ${percent(20, 20 + 20 + 40)}%`);
  });

  it("recomputes the pond and meadow links read in reading-food-webs", () => {
    const pond = [
      ["Algae", "Zooplankton"],
      ["Zooplankton", "Small fish"],
      ["Small fish", "Heron"],
      ["Zooplankton", "Heron"],
    ];
    const into = (eater: string) => pond.filter(([, to]) => to === eater).length;
    expect(into("Heron")).toBe(2);
    expect(into("Small fish")).toBe(1);
    expect(pond).toHaveLength(numericKey("bio-reading-food-webs-6"));
    const meadow = [
      ["Grass", "Grasshopper"],
      ["Grass", "Mouse"],
      ["Grasshopper", "Frog"],
      ["Mouse", "Hawk"],
      ["Frog", "Hawk"],
    ];
    expect(meadow.filter(([, to]) => to === "Hawk")).toHaveLength(numericKey("bio-reading-food-webs-3"));
    // The producer is the only organism no arrow enters.
    const producers = (links: string[][]) =>
      [...new Set(links.flat())].filter((name) => !links.some(([, to]) => to === name));
    expect(producers(pond)).toEqual(["Algae"]);
    expect(producers(meadow)).toEqual(["Grass"]);
    expect(stepProse("reading-food-webs", "reading-the-arrows")).toContain(
      "two arrows end at the heron",
    );
  });

  it("has numeric keys that match the arithmetic each item describes", () => {
    for (const [id, value] of Object.entries(expected))
      expect(numericKey(prefixed(id)), id).toBeCloseTo(value, 9);
  });

  it("recomputes every numeric item the v2 lessons ask", () => {
    const asked = new Set(v2Lessons.flatMap((lesson) => lessonQuestionRefs(lesson)));
    const numeric = [...asked].filter((id) => byId.get(id)?.answerAuthority.kind === "numeric");
    expect(numeric.sort()).toEqual(Object.keys(expected).map(prefixed).sort());
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
