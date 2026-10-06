import { describe, expect, it } from "vitest";
import {
  ChemistryModelSchema,
  ChemistryDiagramSchema,
  type ChemicalReaction,
} from "@discere/contracts";
import {
  formulaMass,
  shellCounts,
  reactionTotals,
  batchResult,
  reactions,
  speciesAtoms,
  lewisData,
  chemistryResults,
} from "../src/chemistry.js";
describe("chemical model invariants", () => {
  it("preserves electron counts and first-shell capacity for every supported atom", () => {
    for (let e = 0; e <= 18; e++) {
      const s = shellCounts(e);
      expect(s.reduce((a, b) => a + b, 0)).toBe(e);
      expect(s[0]).toBeLessThanOrEqual(2);
      expect(s[1]).toBeLessThanOrEqual(8);
      expect(s[2]).toBeLessThanOrEqual(8);
    }
    expect(() => shellCounts(19)).toThrow();
    expect(() => shellCounts(1.5)).toThrow();
  });
  it("uses stated rounded masses without treating mass number as atomic mass", () => {
    expect(formulaMass("NaCl")).toBe(23 + 35.5);
    expect(formulaMass("Al2O3")).toBe(2 * 27 + 3 * 16);
    expect(formulaMass("NH3")).toBe(14 + 3);
  });
  it.each(["water", "ammonia", "methane", "magnesium"] as ChemicalReaction[])(
    "%s conserves each element for every scaled balanced equation",
    (r) => {
      const v = reactions[r];
      for (let k = 1; k <= 6; k++) {
        const totals = reactionTotals(
          r,
          v.balanced.map((x) => x * k),
        );
        expect(totals.balanced).toBe(true);
        expect(totals.left).toEqual(totals.right);
      }
      const bad = [...v.balanced];
      bad[0]!++;
      expect(reactionTotals(r, bad).balanced).toBe(false);
    },
  );
  it.each(["water", "ammonia", "methane", "magnesium"] as ChemicalReaction[])(
    "%s conserves atoms and never consumes more than supplied",
    (r) => {
      const def = reactions[r];
      for (let a = 1; a <= 12; a++) {
        for (let b = 1; b <= 12; b++) {
          const result = batchResult(r, [a, b]);
          expect(Math.min(...result.leftovers)).toBeCloseTo(0);
          expect(result.leftovers.every((x) => x >= -1e-10)).toBe(true);
          const before: Record<string, number> = {},
            after: Record<string, number> = {};
          def.left.forEach((s, i) => {
            for (const [el, count] of Object.entries(speciesAtoms[s])) {
              before[el] = (before[el] || 0) + count * [a, b][i]!;
              after[el] = (after[el] || 0) + count * result.leftovers[i]!;
            }
          });
          def.right.forEach((s, i) => {
            for (const [el, count] of Object.entries(speciesAtoms[s]))
              after[el] = (after[el] || 0) + count * result.products[i]!;
          });
          for (const el of Object.keys(before)) expect(after[el]).toBeCloseTo(before[el]!, 10);
        }
      }
    },
  );
  it("keeps fractional molar reaction extents, rather than rounding to whole molecules", () => {
    expect(batchResult("water", [3, 3])).toEqual({
      extent: 1.5,
      products: [3],
      leftovers: [0, 1.5],
    });
  });
  it("counts Lewis electrons once and matches atomic valence totals", () => {
    const valence: Record<string, number> = { H: 1, C: 4, N: 5, O: 6 };
    for (const d of Object.values(lewisData)) {
      const shown =
        d.bonds.reduce((n, b) => n + b[2] * 2, 0) +
        d.lonePairs.reduce<number>((n, p) => n + p * 2, 0);
      expect(shown).toBe(d.atoms.reduce((n, a) => n + valence[a]!, 0));
    }
  });
  it("rejects unknown authority fields, impossible ranges and inaccurate quarter-block drawings", () => {
    for (const model of [
      { kind: "atom", protons: 0, neutrons: 2, electrons: 2 },
      { kind: "atom", protons: 2, neutrons: 2, electrons: 2, answer: 4 },
      { kind: "amount", species: "H2O", moles: 1.1 },
      { kind: "reaction", reaction: "methane", coefficients: [1, 2, 1] },
      { kind: "batch", reaction: "water", supplies: [0, 3] },
    ])
      expect(ChemistryModelSchema.safeParse(model).success).toBe(false);
  });
  it("requires valid distinct case identifiers", () => {
    const c = {
      id: "a",
      label: "Hydrogen",
      model: { kind: "atom", protons: 1, neutrons: 0, electrons: 1 },
    };
    expect(
      ChemistryDiagramSchema.safeParse({
        type: "chemistry_explorer",
        cases: [c, c],
        initialCaseId: "a",
      }).success,
    ).toBe(false);
  });
  it("explains signed charge and formula counts from the selected case", () => {
    expect(chemistryResults({ kind: "atom", protons: 8, neutrons: 8, electrons: 10 })).toContain(
      "Charge −2",
    );
    expect(chemistryResults({ kind: "formula", species: "Al2O3", copies: 3 })).toEqual([
      "6 Al atoms",
      "9 O atoms",
    ]);
  });
});
