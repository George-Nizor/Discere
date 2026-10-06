import { describe, it, expect } from "vitest";
import {
  BiologyModelSchema,
  BiologyDiagramSchema,
  AnswerAuthoritySchema,
} from "@discere/contracts";
import {
  membraneState,
  dnaComplement,
  punnett,
  divisionState,
  trophicEnergy,
  biologyResults,
  energyAmounts,
  foodWebs,
} from "../src/biology.js";
describe("bounded biological models", () => {
  it("preserves total solute and fixed volumes during solute diffusion", () => {
    for (let left = 1; left <= 18; left++)
      for (let right = 1; right <= 18; right++)
        for (const t of [0, 0.25, 0.5, 1]) {
          const s = membraneState({ kind: "membrane", left, right, permits: "solute" }, t);
          expect(s.left + s.right).toBeCloseTo(left + right);
          expect(s.leftVolume).toBe(1);
          expect(s.rightVolume).toBe(1);
          if (t === 1) expect(s.left).toBeCloseTo(s.right);
        }
  });
  it("preserves impermeant solute and total volume in the pressure-free osmotic model", () => {
    for (let left = 1; left <= 18; left++)
      for (let right = 1; right <= 18; right++) {
        const s = membraneState({ kind: "membrane", left, right, permits: "water" }, 1);
        expect(s.left).toBe(left);
        expect(s.right).toBe(right);
        expect(s.leftVolume + s.rightVolume).toBe(2);
        expect(left / s.leftVolume).toBeCloseTo(right / s.rightVolume);
        expect(s.leftVolume > 1).toBe(left > right);
      }
  });
  it("does not move blocked substances and distinguishes dynamic equilibrium", () => {
    expect(membraneState({ kind: "membrane", left: 12, right: 4, permits: "neither" }, 1)).toEqual({
      left: 12,
      right: 4,
      leftVolume: 1,
      rightVolume: 1,
    });
    expect(biologyResults({ kind: "membrane", left: 8, right: 8, permits: "solute" })[0]).toContain(
      "no net movement",
    );
  });
  it("clamps the progression without extrapolating negative amounts", () => {
    const m = { kind: "membrane", left: 12, right: 4, permits: "solute" } as const;
    expect(membraneState(m, -1)).toEqual(membraneState(m, 0));
    expect(membraneState(m, 2)).toEqual(membraneState(m, 1));
  });
  it("pairs aligned bases in opposite directions and restores the original when paired twice", () => {
    expect(dnaComplement("AAGC")).toBe("TTCG");
    for (const s of ["ATCG", "CCATGA", "TATATATA"]) expect(dnaComplement(dnaComplement(s))).toBe(s);
    expect(() => dnaComplement("ATUG")).toThrow();
  });
  it("enumerates independent gamete pairings without claiming fixed offspring quotas", () => {
    expect(punnett("Aa", "Aa")).toEqual(["AA", "Aa", "Aa", "aa"]);
    expect(punnett("AA", "aa")).toEqual(["Aa", "Aa", "Aa", "Aa"]);
    expect(punnett("Aa", "aa").filter((g) => g === "aa")).toHaveLength(2);
    for (const a of ["AA", "Aa", "aa"])
      for (const b of ["AA", "Aa", "aa"]) expect(punnett(a, b)).toHaveLength(4);
  });
  it("rejects unsupported allele counts and symbols", () => {
    expect(() => punnett("AAA", "aa")).toThrow();
    expect(() => punnett("BB", "aa")).toThrow();
  });
  it("separates chromosome count and DNA amount across mitosis endpoints", () => {
    for (let pairs = 1; pairs <= 4; pairs++) {
      const state = (phase: number) =>
        divisionState({ kind: "division", process: "mitosis", pairs, phase });
      expect(state(0)).toMatchObject({ cells: 1, chromosomes: 2 * pairs, chromatids: 2 * pairs });
      expect(state(1)).toMatchObject({ cells: 1, chromosomes: 2 * pairs, chromatids: 4 * pairs });
      expect(state(2)).toMatchObject({ cells: 2, chromosomes: 2 * pairs, chromatids: 2 * pairs });
      expect(state(3).cells * state(3).chromatids).toBe(state(1).chromatids);
    }
  });
  it("reduces chromosome sets in meiosis I and separates sisters in meiosis II", () => {
    for (let pairs = 1; pairs <= 4; pairs++) {
      const s = (phase: number) =>
        divisionState({ kind: "division", process: "meiosis", pairs, phase });
      expect(s(2)).toMatchObject({
        cells: 2,
        chromosomes: pairs,
        chromatids: 2 * pairs,
        copied: true,
      });
      expect(s(3)).toMatchObject({
        cells: 4,
        chromosomes: pairs,
        chromatids: pairs,
        copied: false,
      });
      expect(s(2).cells * s(2).chromatids).toBe(s(1).chromatids);
      expect(s(3).cells * s(3).chromatids).toBe(s(1).chromatids);
    }
  });
  it("scales overall reaction accounting without an invented fixed ATP yield", () => {
    expect(energyAmounts({ kind: "energy", process: "photosynthesis", glucose: 3 })).toEqual({
      glucose: 3,
      carbonDioxide: 18,
      water: 18,
      oxygen: 18,
    });
    expect(energyAmounts({ kind: "energy", process: "respiration", glucose: 2 })).toMatchObject({
      carbonDioxide: 12,
    });
  });
  it("uses the given efficiency at every trophic transfer", () => {
    trophicEnergy({ kind: "pyramid", base: 4000, percent: 20, levels: 3 }).forEach((v, i) =>
      expect(v).toBeCloseTo([4000, 800, 160][i]!),
    );
    for (const percent of [5, 10, 15, 20, 30]) {
      const e = trophicEnergy({ kind: "pyramid", base: 12000, percent, levels: 4 });
      e.slice(1).forEach((v, i) => {
        expect(v).toBeCloseTo((e[i]! * percent) / 100);
        expect(v).toBeLessThan(e[i]!);
      });
    }
  });
  it("keeps food-to-consumer arrows valid and acyclic", () => {
    for (const web of Object.values(foodWebs))
      for (const [a, b] of web.edges) {
        expect(a).toBeLessThan(b);
        expect(web.names[a]).toBeTruthy();
        expect(web.names[b]).toBeTruthy();
      }
  });
  it("rejects answer fields, invalid DNA, reversed plot inputs and impossible model bounds", () => {
    for (const model of [
      { kind: "dna", sequence: "ATUX" },
      { kind: "cell", cell: "animal", answer: "nucleus" },
      { kind: "division", process: "meiosis", pairs: 0, phase: 0 },
      {
        kind: "series",
        xLabel: "x",
        yLabel: "y",
        points: [
          [1, 2],
          [1, 3],
          [2, 4],
        ],
      },
      { kind: "pyramid", base: 100, percent: 100, levels: 3 },
    ])
      expect(BiologyModelSchema.safeParse(model).success).toBe(false);
    expect(
      BiologyDiagramSchema.safeParse({
        type: "biology_explorer",
        cases: [
          { id: "a", label: "A", model: { kind: "cell", cell: "animal" } },
          { id: "a", label: "B", model: { kind: "cell", cell: "plant" } },
        ],
        initialCaseId: "a",
      }).success,
    ).toBe(false);
  });
  it("permits equivalent terms only for one canonical idea", () => {
    const a = {
      kind: "text",
      acceptedIdeas: ["plasma membrane"],
      acceptedAlternatives: ["cell membrane"],
      rejectedIdeas: [],
      exampleAnswer: "A plasma membrane controls exchange.",
    };
    expect(AnswerAuthoritySchema.safeParse(a).success).toBe(true);
    expect(
      AnswerAuthoritySchema.safeParse({
        ...a,
        acceptedIdeas: ["plasma membrane", "selective exchange"],
      }).success,
    ).toBe(false);
  });
});
