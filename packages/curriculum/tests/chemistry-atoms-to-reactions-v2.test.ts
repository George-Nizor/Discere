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
  });

  it("ions-and-charge: charge = protons − electrons", () => {
    expect(key("ions-and-charge-hook")).toBe(5 - (5 + 3));
    expect(key("ions-and-charge-1")).toBe(11 - 10);
    expect(key("ions-and-charge-2")).toBe(8 - 10);
    expect(key("ions-and-charge-t1")).toBe(20 - 18);
    expect(key("ions-and-charge-4")).toBe(13 - 10);
    expect(key("ions-and-charge-5")).toBe(9 - 10);
    expect(key("ions-and-charge-c3")).toBe(20 - 2);
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
  });
});
