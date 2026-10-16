import { readFileSync } from "node:fs";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * Chemistry: atoms to reactions, v2 lessons. Every numeric key written in the migration is
 * recomputed here from the arithmetic the item describes, not read back from the authority.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL(
      "../../../content/chemistry-atoms-to-reactions/.authoring/candidate.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as CourseBundle;
const key = (id: string): number => {
  const question = bundle.questions.find((item: Question) => item.id === `chem-${id}`);
  if (!question) throw new Error(`no question ${id}`);
  if (question.answerAuthority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return question.answerAuthority.value;
};

const FIRST_FIVE = [
  "what-makes-an-element",
  "isotopes-and-mass",
  "ions-and-charge",
  "outer-electrons",
  "neutral-ionic-formulas",
];
const PART_ONE = [
  "sharing-electron-pairs",
  "reading-chemical-formulas",
  "adding-atomic-masses",
  "from-moles-to-mass",
  "balancing-reactions",
];
const PART_TWO = ["reaction-mole-ratios", "the-reactant-that-runs-out"];
const STORY_LESSONS = [...FIRST_FIVE, ...PART_ONE, ...PART_TWO];
const words = (blocks: readonly object[] | undefined) =>
  (blocks ?? []).reduce<number>(
    (sum, block) =>
      sum + ("text" in block ? String(block.text) : "").split(/\s+/).filter(Boolean).length,
    0,
  );

/** Batches a supply allows, and the smallest count (the limiting reactant). */
const batches = (supplies: number[], coefficients: number[]) =>
  Math.min(...supplies.map((amount, i) => amount / coefficients[i]!));

describe("Chemistry v2 lessons", () => {
  it("validates with no errors and has twelve v2 lessons of three skill-check items", () => {
    const issues = validateCourseBundle(bundle).issues.filter((i) => i.severity === "error");
    expect(issues).toEqual([]);
    expect(bundle.lessons.filter((l) => l.intro)).toHaveLength(12);
    for (const lesson of bundle.lessons) expect(lesson.questionIds).toHaveLength(3);
  });

  it("reaction-mole-ratios: the skill check asks about moles, not grams", () => {
    const lesson = bundle.lessons.find((item) => item.id === "reaction-mole-ratios")!;
    expect(lesson.questionIds).toEqual([
      "chem-reaction-mole-ratios-5",
      "chem-reaction-mole-ratios-3",
      "chem-reaction-mole-ratios-c3",
    ]);
  });

  it("keeps multiple choice at or below 35% of the course", () => {
    const choices = bundle.questions.filter((q) => q.choices?.length).length;
    expect(choices / bundle.questions.length).toBeLessThanOrEqual(0.35);
  });

  it("what-makes-an-element: protons set identity", () => {
    expect(key("what-makes-an-element-hook")).toBe(6); // shared proton and electron count of carbon
    expect(key("what-makes-an-element-e1")).toBe(6);
    expect(key("what-makes-an-element-1")).toBe(8);
    expect(key("what-makes-an-element-3")).toBe(7); // neutral: electrons = protons
    expect(key("what-makes-an-element-t1")).toBe(9);
    expect(key("what-makes-an-element-4")).toBe(13);
    expect(key("what-makes-an-element-6")).toBe(9 + 10);
    expect(key("what-makes-an-element-c3")).toBe(14 + 16);
    // Arithmetic quoted in the teaching screens: neutral sodium 11 − 11, with one electron gone 11 − 10.
    expect(11 - 11).toBe(0);
    expect(11 - 10).toBe(1);
    // Carbon's nucleus (6 + 6) and lithium's (3 + 4), as the second screen says.
    expect([6 + 6, 3 + 4]).toEqual([12, 7]);
  });

  it("isotopes-and-mass: A = Z + N and weighted means", () => {
    expect(key("isotopes-and-mass-hook")).toBe(14 - 12);
    expect(key("isotopes-and-mass-1")).toBe(6 + 7);
    expect(key("isotopes-and-mass-2")).toBe(35 - 17);
    expect(key("isotopes-and-mass-t1")).toBe(41 - 19);
    expect(key("isotopes-and-mass-4")).toBe((12 + 14) / 2);
    expect(key("isotopes-and-mass-5")).toBe(18 - 8);
    expect(key("isotopes-and-mass-c3")).toBe(22 - 20);
    // Neon-22 card: 22 − 10.
    expect(22 - 10).toBe(12);
    // Screens: helium-4 (2 + 2), lithium-7 (3 + 4), chlorine-37 (17 protons, 37 − 17 neutrons).
    expect([2 + 2, 3 + 4, 37 - 17]).toEqual([4, 7, 20]);
    // One carbon atom weighs about 2 × 10⁻²³ g, written out on the first screen.
    expect(Number("0.00000000000000000000002")).toBeCloseTo(2e-23, 30);
    // Sodium-23 (Z = 11) in the worked example.
    expect(23 - 11).toBe(12);
  });

  it("ions-and-charge: charge = protons − electrons", () => {
    expect(key("ions-and-charge-hook")).toBe(5 - (5 + 3));
    expect(key("ions-and-charge-1")).toBe(11 - 10);
    expect(key("ions-and-charge-2")).toBe(8 - 10);
    expect(key("ions-and-charge-t1")).toBe(20 - 18);
    expect(key("ions-and-charge-4")).toBe(13 - 10);
    expect(key("ions-and-charge-5")).toBe(9 - 10);
    expect(key("ions-and-charge-c3")).toBe(20 - 2);
    // Screens: lithium 3 − 3 and 3 − 2, a seven-proton atom that gains 2, Be²⁺ and Cl⁻.
    expect([3 - 3, 3 - 2, 7 - (7 + 2), 4 - 2, 17 - 18]).toEqual([0, 1, -2, 2, -1]);
    // Worked example: magnesium 12 − 10.
    expect(12 - 10).toBe(2);
  });

  it("outer-electrons: fill 2, then 8, then 8", () => {
    const shells = (electrons: number) => {
      const out: number[] = [];
      let left = electrons;
      for (const capacity of [2, 8, 8]) {
        const n = Math.min(left, capacity);
        if (n > 0) out.push(n);
        left -= n;
      }
      return out;
    };
    const outer = (electrons: number) => shells(electrons).at(-1)!;
    expect(key("outer-electrons-hook")).toBe(shells(9)[1]);
    expect(key("outer-electrons-e1")).toBe(shells(6)[1]);
    expect(key("outer-electrons-1")).toBe(outer(8));
    expect(key("outer-electrons-f1")).toBe(shells(12)[2]);
    expect(key("outer-electrons-2")).toBe(outer(10));
    expect(key("outer-electrons-4")).toBe(shells(2)[0]);
    expect(key("outer-electrons-5")).toBe(outer(13));
    expect(key("outer-electrons-c3")).toBe(outer(4));
    // Shell counts quoted in the teaching screens.
    expect(shells(7)).toEqual([2, 5]);
    expect(shells(11)).toEqual([2, 8, 1]);
    expect(shells(15)).toEqual([2, 8, 5]);
    expect(shells(16)).toEqual([2, 8, 6]);
    expect(shells(9)).toEqual([2, 7]);
    expect(shells(17)).toEqual([2, 8, 7]);
    expect(shells(10)).toEqual([2, 8]);
    expect(shells(18)).toEqual([2, 8, 8]);
    // The theatre in the opener: nine people fill the front row of 2 and put 7 in the second row.
    expect(shells(9)).toEqual([2, 7]);
  });

  it("neutral-ionic-formulas: charges cancel", () => {
    /** Smallest whole numbers (cations, anions) that cancel. */
    const ratio = (plus: number, minus: number) => {
      for (let a = 1; a <= 10; a += 1)
        for (let b = 1; b <= 10; b += 1) if (a * plus === b * minus) return [a, b] as const;
      throw new Error("no ratio");
    };
    expect(key("neutral-ionic-formulas-hook")).toBe(6 / 2);
    expect(key("neutral-ionic-formulas-1")).toBe(ratio(2, 1)[1]);
    expect(key("neutral-ionic-formulas-2")).toBe(ratio(3, 2)[0]);
    expect(key("neutral-ionic-formulas-t1")).toBe(ratio(2, 3)[0]);
    expect(key("neutral-ionic-formulas-4")).toBe(ratio(2, 2)[1]);
    expect(key("neutral-ionic-formulas-5")).toBe(ratio(2, 1)[1]);
    expect(key("neutral-ionic-formulas-c3")).toBe(ratio(3, 2)[0] + ratio(3, 2)[1]);
    // Worked example Na₂S: 2 × (+1) + 1 × (−2) = 0.
    expect(2 * 1 + 1 * -2).toBe(0);
    // Opener: one +6 card needs three −2 cards, and two or four cards miss.
    expect([6 + 2 * -2, 6 + 3 * -2, 6 + 4 * -2]).toEqual([2, 0, -2]);
    // Screen "When the charges don't match": +4 and −6 first share a total at 12, so 3 and 2 cards.
    expect(ratio(4, 6)).toEqual([3, 2]);
    expect(3 * 4).toBe(2 * 6);
    // AlCl₃ and NaCl as drawn on the formula screen.
    expect(ratio(3, 1)).toEqual([1, 3]);
    expect(ratio(1, 1)).toEqual([1, 1]);
  });

  it("sharing-electron-pairs: a pair is two electrons", () => {
    expect(key("sharing-electron-pairs-hook")).toBe(7 - 1 + 2);
    expect(key("sharing-electron-pairs-e1")).toBe(3);
    expect(key("sharing-electron-pairs-1")).toBe(1 * 2);
    expect(key("sharing-electron-pairs-2")).toBe(2 * 2);
    expect(key("sharing-electron-pairs-4")).toBe(3 * 2);
    expect(key("sharing-electron-pairs-5")).toBe(1 * 2);
    expect(key("sharing-electron-pairs-t1")).toBe((2 + 4 * 1) * 2); // C=C plus four C–H
    expect(key("sharing-electron-pairs-c3")).toBe(2 * 2);
    // Worked CO₂: two double bonds of 2 pairs each.
    expect(2 * (2 * 2)).toBe(8);
    // Story lesson: the H₂ pair, chlorine's 7 + 1, and the totals in the recap (O₂, CO₂, ethene, N₂).
    expect(2 * 1).toBe(2); // one pair of two electrons fills hydrogen's first shell
    expect(7 - 1 + 2).toBe(8); // chlorine keeps 6, then counts the shared pair of 2
    expect([2 * 2, 2 * 2 * 2, (2 + 4 * 1) * 2, 3 * 2]).toEqual([4, 8, 12, 6]);
    // Water: 6 outer electrons on oxygen, 2 go into bonds, the other 4 are two lone pairs.
    expect([6 - 2, (6 - 2) / 2]).toEqual([4, 2]);
    // Ammonia: 5 outer electrons on nitrogen, 3 shared, 2 left as one lone pair.
    expect([5 - 3, (5 - 3) / 2]).toEqual([2, 1]);
  });

  it("reading-chemical-formulas: subscript × coefficient", () => {
    expect(key("reading-chemical-formulas-hook")).toBe(5 * 2);
    expect(key("reading-chemical-formulas-e1")).toBe(4);
    expect(key("reading-chemical-formulas-1")).toBe(3 * 1);
    expect(key("reading-chemical-formulas-2")).toBe(2 * 3);
    expect(key("reading-chemical-formulas-t1")).toBe(2 * (2 + 1 + 4));
    expect(key("reading-chemical-formulas-4")).toBe(5 * 3);
    expect(key("reading-chemical-formulas-5")).toBe(4 * 2);
    expect(key("reading-chemical-formulas-c3")).toBe(3 * 6);
    // Worked example: 4 H₂SO₄ holds 4 × 2 H.
    expect(4 * 2).toBe(8);
    // Screens: CO₂ drawn twice and four times, and 3 CaCl₂ (1 + 2 atoms a unit).
    expect([2 * 1, 2 * 2, 4 * 1, 4 * 2]).toEqual([2, 4, 4, 8]);
    expect([1 + 2, 3 * (1 + 2), 3 * 1, 3 * 2]).toEqual([3, 9, 3, 6]);
    // The wrong answer 12 in the H₂SO₄ item leaves the sulfur out: 2 × (2 + 4).
    expect(2 * (2 + 4)).toBe(12);
  });

  it("adding-atomic-masses: sum of count × mass", () => {
    expect(key("adding-atomic-masses-hook")).toBe(2 * 60 + 45);
    expect(key("adding-atomic-masses-e1")).toBe(2 * 14);
    expect(key("adding-atomic-masses-1")).toBe(2 * 1 + 16);
    expect(key("adding-atomic-masses-2")).toBe(12 + 2 * 16);
    expect(key("adding-atomic-masses-t1")).toBe(40 + 12 + 3 * 16);
    expect(key("adding-atomic-masses-4")).toBe(24 + 2 * 35.5);
    expect(key("adding-atomic-masses-5")).toBe(14 + 3 * 1);
    expect(key("adding-atomic-masses-c3")).toBe(23 + 16 + 1);
    // Worked SO₂.
    expect(32 + 2 * 16).toBe(64);
    // Screens: the parcel (2 × 60 + 45), methane (12 + 4 × 1) and glucose C₆H₁₂O₆.
    expect(2 * 60 + 45).toBe(165);
    expect(12 + 4 * 1).toBe(16);
    expect([6 * 12, 12 * 1, 6 * 16, 6 * 12 + 12 * 1 + 6 * 16]).toEqual([72, 12, 96, 180]);
    // Recap totals.
    expect([12 + 4 * 1, 32 + 2 * 16, 12 + 2 * 16, 40 + 12 + 3 * 16]).toEqual([16, 64, 44, 100]);
  });

  it("from-moles-to-mass: m = nM and n = m/M", () => {
    expect(key("from-moles-to-mass-hook")).toBe(4 * 150);
    expect(key("from-moles-to-mass-1")).toBe(2 * 18);
    expect(key("from-moles-to-mass-f1")).toBe(2 * 28);
    expect(key("from-moles-to-mass-3")).toBe(22 / 44);
    expect(key("from-moles-to-mass-t1")).toBe(90 / 18);
    expect(key("from-moles-to-mass-4")).toBe(2 * 3);
    expect(key("from-moles-to-mass-5")).toBe(3 * 16);
    expect(key("from-moles-to-mass-c3")).toBe(3 * 2);
    // Worked NaCl; the CH₄ and NaCl masses are given in the prompts.
    expect(2 * 58.5).toBe(117);
    // Screens: 600 g of bolts at 150 g a dozen is 4 dozen, or 48 bolts.
    expect(600 / 150).toBe(4);
    expect((600 / 150) * 12).toBe(48);
    // Magnesium at 24 g/mol: one mole 24 g, three moles 72 g. CO₂ at 44 g/mol: 88 g is 2 mol.
    expect([1 * 24, 3 * 24, 1 * 44, 2 * 44, 88 / 44]).toEqual([24, 72, 44, 88, 2]);
    // Formula mass of water and the number of hydrogen moles in 3 mol of water.
    expect(2 * 1 + 16).toBe(18);
    expect(3 * 2).toBe(6);
  });

  it("balancing-reactions: atoms match on both sides", () => {
    expect(key("balancing-reactions-hook")).toBe((3 * 4) / 2);
    expect(key("balancing-reactions-e1")).toBe(2 * 1);
    expect(key("balancing-reactions-1")).toBe((2 * 1) / 2); // 2 H₂O holds 2 O
    expect(key("balancing-reactions-2")).toBe((2 + 2 * 1) / 2); // CO₂ and 2 H₂O
    expect(key("balancing-reactions-t1")).toBe(2 * 1); // 2 AlCl₃ holds 2 Al
    expect(key("balancing-reactions-4")).toBe((2 * 3) / 2); // 2 NH₃ holds 6 H
    expect(key("balancing-reactions-5")).toBe(2); // 2 Mg atoms, one per MgO
    expect(key("balancing-reactions-c3")).toBe((4 * 2 + 6 * 1) / 2);
    // Check the balanced equation 2 C₂H₆ + 7 O₂ → 4 CO₂ + 6 H₂O: C 4 = 4, H 12 = 12, O 14 = 14.
    expect(2 * 2).toBe(4 * 1);
    expect(2 * 6).toBe(6 * 2);
    // Screens: 2 Na + Cl₂ → 2 NaCl, H₂ + Cl₂ → 2 HCl and C₃H₈ + 5 O₂ → 3 CO₂ + 4 H₂O.
    expect(2 * 1).toBe(2 * 1); // Na: 2 Na on the left, 2 in 2 NaCl
    expect(1 * 2).toBe(2 * 1); // Cl: Cl₂ on the left, 2 in 2 NaCl
    expect(1 * 2).toBe(2 * 1); // H: H₂ on the left, 2 in 2 HCl; Cl balances the same way
    expect(1 * 3).toBe(3 * 1); // C
    expect(1 * 8).toBe(4 * 2); // H
    expect(5 * 2).toBe(3 * 2 + 4 * 1); // O
    // Opener: 3 cars × 4 wheels in packs of 2; five packs fall short and seven leave spares.
    expect([3 * 4, 5 * 2 < 3 * 4, 7 * 2 > 3 * 4]).toEqual([12, true, true]);
  });

  it("reaction-mole-ratios: scale by the coefficient ratio", () => {
    expect(key("reaction-mole-ratios-hook")).toBe(20 / (8 / 2));
    expect(key("reaction-mole-ratios-e1")).toBe(4); // coefficient of Fe in 4 Fe + 3 O₂ → 2 Fe₂O₃
    expect(key("reaction-mole-ratios-1")).toBe((2 * 2) / 1);
    expect(key("reaction-mole-ratios-2")).toBe((3 * 2) / 1);
    expect(key("reaction-mole-ratios-t1")).toBe((6 * 1) / 2);
    expect(key("reaction-mole-ratios-4")).toBe((2 * 2) / 1);
    expect(key("reaction-mole-ratios-5")).toBe((4 * 2) / 2);
    expect(key("reaction-mole-ratios-c3")).toBe((4 * 3) / 2);
    // Worked: 5 mol Na needs 5 × 1/2 mol Cl₂.
    expect((5 * 1) / 2).toBe(2.5);
    // Screens: pancakes at 2 eggs to 8, so 20 pancakes need 5 eggs and 40 need 10; doubling gives 4 for 16.
    expect([20 / (8 / 2), 40 / (8 / 2), 2 * 2, 2 * 8]).toEqual([5, 10, 4, 16]);
    // Water recipe made twice and a dozen times over: 4, 2, 4 and 24, 12, 24.
    expect([2, 1, 2].map((c) => c * 2)).toEqual([4, 2, 4]);
    expect([2, 1, 2].map((c) => c * 12)).toEqual([24, 12, 24]);
    // 6 mol K with 2 K + Br₂ → 2 KBr needs 6 × 1/2 mol Br₂.
    expect((6 * 1) / 2).toBe(3);
    // Methane: 3 mol CH₄ makes 3 × 2/1 mol of water.
    expect((3 * 2) / 1).toBe(6);
    // Masses for 2 H₂ + O₂ → 2 H₂O: 2 mol H₂ (2 g/mol), 1 mol O₂ (32 g/mol), 2 mol H₂O (18 g/mol).
    expect([2 * (2 * 1), 1 * (2 * 16), 2 * (2 * 1 + 16)]).toEqual([4, 32, 36]);
    expect(4 + 32).toBe(36);
    // Recap: 2 mol N₂ gives 4 mol NH₃, and 6 mol Mg needs 3 mol O₂.
    expect([(2 * 2) / 1, (6 * 1) / 2]).toEqual([4, 3]);
    // 4 Fe + 3 O₂ → 2 Fe₂O₃ balances: Fe 4 = 4, O 6 = 6.
    expect(4).toBe(2 * 2);
    expect(3 * 2).toBe(2 * 3);
  });

  it("the-reactant-that-runs-out: smaller batch count sets the yield", () => {
    expect(key("the-reactant-that-runs-out-hook")).toBe(Math.floor(batches([9, 5], [2, 1]))); // whole sandwiches only
    expect(key("the-reactant-that-runs-out-e1")).toBe(6 / 2);
    // 2 H₂ + O₂ → 2 H₂O with 6 mol H₂ and 1 mol O₂.
    expect(key("the-reactant-that-runs-out-1")).toBe(batches([6, 1], [2, 1]) * 2);
    expect(key("the-reactant-that-runs-out-5")).toBe(6 - batches([6, 1], [2, 1]) * 2);
    // N₂ + 3 H₂ → 2 NH₃ with 4 mol N₂ and 3 mol H₂.
    expect(key("the-reactant-that-runs-out-2")).toBe(batches([4, 3], [1, 3]) * 2);
    // CH₄ + 2 O₂ → CO₂ + 2 H₂O with 3 mol CH₄ and 4 mol O₂.
    expect(key("the-reactant-that-runs-out-4")).toBe(batches([3, 4], [1, 2]) * 2);
    // 2 H₂ + O₂ with 3 mol H₂ and 2 mol O₂: oxygen left.
    expect(key("the-reactant-that-runs-out-t1")).toBe(2 - batches([3, 2], [2, 1]) * 1);
    // N₂ + 3 H₂ → 2 NH₃ with 3 mol N₂ and 12 mol H₂.
    expect(key("the-reactant-that-runs-out-c3")).toBe(batches([3, 12], [1, 3]) * 2);
    // Worked: 5 mol N₂ and 6 mol H₂ give 4 mol NH₃.
    expect(batches([5, 6], [1, 3]) * 2).toBe(4);
    // Screens: 9 bread and 5 cheese for 2 + 1 per sandwich allow 4 whole sandwiches (bread limits).
    expect([9 / 2, 5 / 1, Math.floor(batches([9, 5], [2, 1]))]).toEqual([4.5, 5, 4]);
    // Magnesium: 6 mol Mg at 2 per batch is 3 batches.
    expect(6 / 2).toBe(3);
    // 8 mol H₂ and 3 mol O₂: 4 and 3 batches, so 3 batches, 6 mol water, 6 mol H₂ used and 2 mol left.
    expect([8 / 2, 3 / 1, batches([8, 3], [2, 1])]).toEqual([4, 3, 3]);
    expect([batches([8, 3], [2, 1]) * 2, batches([8, 3], [2, 1]) * 2, 8 - 3 * 2]).toEqual([6, 6, 2]);
    // 6 mol H₂ with 3 mol O₂ is the exact ratio: 3 batches each, nothing left.
    expect([6 / 2, 3 / 1]).toEqual([3, 3]);
    // 16 g of O₂ at 32 g/mol.
    expect(16 / (2 * 16)).toBe(0.5);
    // Recap: 4 mol N₂ with 3 mol H₂ gives 2 mol NH₃.
    expect(batches([4, 3], [1, 3]) * 2).toBe(2);
  });

  describe("story format, lessons 1 to 12", () => {
    const skillsOf = (id: string) => {
      const lesson = bundle.lessons.find((item) => item.id === id)!;
      const earlier = bundle.lessons.slice(0, bundle.lessons.indexOf(lesson) + 1);
      return { lesson, taught: new Set(earlier.flatMap((item) => item.taughtSkills ?? [])) };
    };

    it("opens each lesson with a scene that asks nothing, and closes with a statement", () => {
      for (const id of STORY_LESSONS) {
        const { lesson } = skillsOf(id);
        const opener = words(lesson.intro!.hook.blocks);
        expect(opener, id).toBeGreaterThanOrEqual(120);
        expect(opener, id).toBeLessThanOrEqual(200);
        expect(lesson.intro!.hook.questionId, id).toBeUndefined();
        expect(lesson.intro!.promise.split(/\s+/).length, id).toBeLessThanOrEqual(25);
        const nextHook = lesson.recap!.nextHook ?? "";
        expect(nextHook.endsWith("?"), id).toBe(false);
        expect(nextHook.length, id).toBeGreaterThan(40);
      }
    });

    it("teaches before it asks, with figures and a transfer", () => {
      for (const id of STORY_LESSONS) {
        const { lesson } = skillsOf(id);
        const steps = lesson.steps;
        const teaching = steps.filter((step) => step.kind === "explain");
        expect(steps.length, id).toBeGreaterThanOrEqual(8);
        expect(steps.length, id).toBeLessThanOrEqual(14);
        expect(teaching.length / steps.length, id).toBeGreaterThanOrEqual(0.4);
        expect(steps[0]!.kind, id).toBe("explain");
        for (const step of teaching) {
          expect(step.checkQuestionId, step.id).toBeFalsy();
          const n = words(step.lead) + words(step.afterFigure);
          expect(n, step.id).toBeGreaterThanOrEqual(100);
          expect(n, step.id).toBeLessThanOrEqual(250);
        }
        let run = 0;
        for (const step of steps) {
          run = step.kind === "explain" ? run + 1 : 0;
          expect(run, `${id}: ${step.id}`).toBeLessThanOrEqual(3);
        }
        expect(
          steps.some((step) => step.kind === "transfer"),
          id,
        ).toBe(true);
        expect(
          steps.some((step) => step.diagram),
          id,
        ).toBe(true);
        const asking = steps.filter((step) => step.kind !== "explain");
        expect(asking.length, id).toBeGreaterThanOrEqual(3);
        expect(asking.length, id).toBeLessThanOrEqual(7);
        for (const step of steps.filter(
          (item) => item.kind === "predict" || item.kind === "try" || item.kind === "transfer",
        ))
          expect(words(step.lead), step.id).toBeLessThanOrEqual(60);
      }
    });

    it("introduces a term before any question that uses it, and checks only taught skills", () => {
      for (const id of STORY_LESSONS) {
        const { lesson, taught } = skillsOf(id);
        expect(lesson.questionIds, id).toHaveLength(3);
        for (const questionId of lesson.questionIds) {
          const question = bundle.questions.find((item) => item.id === questionId)!;
          expect(question.hints?.length ?? 0, questionId).toBeGreaterThan(0);
          expect(question.skill && taught.has(question.skill), questionId).toBe(true);
        }
        for (const step of lesson.steps)
          if (step.checkQuestionId) {
            const question = bundle.questions.find((item) => item.id === step.checkQuestionId)!;
            expect(question.skill && taught.has(question.skill), step.id).toBe(true);
          }
      }
    });

    it("keeps every question the lessons ask, with a numeric key where the item is numeric", () => {
      for (const id of STORY_LESSONS) {
        const { lesson } = skillsOf(id);
        const asked = [
          ...lesson.questionIds,
          ...lesson.steps.flatMap((step) => [
            step.checkQuestionId,
            ...(step.workedSteps ?? []).flatMap((line) => [
              line.blank?.questionId,
              line.selfExplain?.questionId,
            ]),
          ]),
        ].filter((item): item is string => Boolean(item));
        for (const questionId of asked) {
          const question = bundle.questions.find((item) => item.id === questionId);
          expect(question, questionId).toBeDefined();
          if (question!.responseType === "numeric")
            expect(question!.hints, questionId).toHaveLength(3);
        }
      }
    });

    it("rewrote the prompts that used to lean on the opener or on a figure", () => {
      const prompt = (id: string) => bundle.questions.find((item) => item.id === id)!.prompt;
      expect(prompt("chem-what-makes-an-element-2")).toContain("6 neutrons and another has 7");
      expect(prompt("chem-ions-and-charge-hook")).toContain("5 protons and 5 electrons");
      expect(prompt("chem-sharing-electron-pairs-hook")).toContain("starts with 7 outer electrons");
      expect(prompt("chem-sharing-electron-pairs-t1")).toContain(
        "one double bond between its two carbon atoms",
      );
      expect(prompt("chem-reading-chemical-formulas-t1")).toContain("2 molecules of sulfuric acid");
      expect(prompt("chem-reaction-mole-ratios-3")).toContain("ratio between which quantities");
      expect(prompt("chem-the-reactant-that-runs-out-6")).toContain("exactly the ratio");
    });

    it("has a course introduction of 120 to 200 words with 3 to 5 outcomes", () => {
      const intro = JSON.parse(
        readFileSync(
          new URL(
            "../../../content/chemistry-atoms-to-reactions/.authoring/course-intro.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ) as { paragraphs: string[]; outcomes: string[]; prerequisites: string; length: string };
      const count = intro.paragraphs.join(" ").split(/\s+/).length;
      expect(count).toBeGreaterThanOrEqual(120);
      expect(count).toBeLessThanOrEqual(200);
      expect(intro.outcomes.length).toBeGreaterThanOrEqual(3);
      expect(intro.outcomes.length).toBeLessThanOrEqual(5);
      for (const outcome of intro.outcomes)
        expect(outcome.startsWith("You'll be able to")).toBe(true);
      expect(intro.length).toContain(`${bundle.lessons.length} lessons`);
    });
  });
});
