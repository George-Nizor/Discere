import type { ChemicalSpecies, ChemicalReaction, ChemistryModel } from "@discere/contracts";
/** Rounded teaching masses; every mass problem explicitly supplies this convention. */
export const teachingMasses: Record<string, number> = {
  H: 1,
  C: 12,
  N: 14,
  O: 16,
  Na: 23,
  Mg: 24,
  Al: 27,
  Cl: 35.5,
  Ca: 40,
};
export const speciesAtoms: Record<ChemicalSpecies, Record<string, number>> = {
  H2: { H: 2 },
  O2: { O: 2 },
  N2: { N: 2 },
  H2O: { H: 2, O: 1 },
  CO2: { C: 1, O: 2 },
  CH4: { C: 1, H: 4 },
  NH3: { N: 1, H: 3 },
  HCl: { H: 1, Cl: 1 },
  NaCl: { Na: 1, Cl: 1 },
  MgCl2: { Mg: 1, Cl: 2 },
  CaCl2: { Ca: 1, Cl: 2 },
  Al2O3: { Al: 2, O: 3 },
  MgO: { Mg: 1, O: 1 },
  Na2O: { Na: 2, O: 1 },
  Mg: { Mg: 1 },
};
export const elements = [
  "",
  "H",
  "He",
  "Li",
  "Be",
  "B",
  "C",
  "N",
  "O",
  "F",
  "Ne",
  "Na",
  "Mg",
  "Al",
  "Si",
  "P",
  "S",
  "Cl",
  "Ar",
];
export const ionCharges: Record<string, number> = { Na: 1, Mg: 2, Al: 3, Ca: 2, Cl: -1, O: -2 };
export const reactions: Record<
  ChemicalReaction,
  { left: ChemicalSpecies[]; right: ChemicalSpecies[]; balanced: number[] }
> = {
  water: { left: ["H2", "O2"], right: ["H2O"], balanced: [2, 1, 2] },
  ammonia: { left: ["N2", "H2"], right: ["NH3"], balanced: [1, 3, 2] },
  methane: { left: ["CH4", "O2"], right: ["CO2", "H2O"], balanced: [1, 2, 1, 2] },
  magnesium: { left: ["Mg", "O2"], right: ["MgO"], balanced: [2, 1, 2] },
};
export const chemNumber = (n: number) => String(Number(n.toFixed(4)));
export const chemicalLabel = (formula: string) =>
  formula.replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]!);
export function formulaMass(species: ChemicalSpecies) {
  return Object.entries(speciesAtoms[species]).reduce((s, [e, n]) => s + teachingMasses[e]! * n, 0);
}
export function shellCounts(electrons: number) {
  if (!Number.isInteger(electrons) || electrons < 0 || electrons > 18)
    throw Error("Use 0–18 electrons.");
  return [
    Math.min(electrons, 2),
    Math.min(Math.max(0, electrons - 2), 8),
    Math.max(0, electrons - 10),
  ];
}
export function atomTotals(species: ChemicalSpecies[], coefficients: number[]) {
  const total: Record<string, number> = {};
  species.forEach((s, i) => {
    for (const [e, n] of Object.entries(speciesAtoms[s]))
      total[e] = (total[e] || 0) + n * coefficients[i]!;
  });
  return total;
}
export function reactionTotals(reaction: ChemicalReaction, coefficients: number[]) {
  const r = reactions[reaction];
  const left = atomTotals(r.left, coefficients.slice(0, r.left.length)),
    right = atomTotals(r.right, coefficients.slice(r.left.length));
  return {
    left,
    right,
    balanced: [...new Set([...Object.keys(left), ...Object.keys(right)])].every(
      (e) => left[e] === right[e],
    ),
  };
}
export function batchResult(reaction: ChemicalReaction, supplies: [number, number]) {
  const r = reactions[reaction],
    extent = Math.min(supplies[0] / r.balanced[0]!, supplies[1] / r.balanced[1]!);
  return {
    extent,
    products: r.balanced.slice(2).map((n) => n * extent),
    leftovers: supplies.map((n, i) => n - extent * r.balanced[i]!),
  };
}
export function reactionEquation(reaction: ChemicalReaction, coefficients: number[]) {
  const r = reactions[reaction],
    part = (s: ChemicalSpecies[], offset: number) =>
      s
        .map(
          (f, i) =>
            (coefficients[i + offset] === 1 ? "" : coefficients[i + offset] + " ") +
            chemicalLabel(f),
        )
        .join(" + ");
  return part(r.left, 0) + " → " + part(r.right, 2);
}
export const lewisData = {
  H2: { atoms: ["H", "H"], bonds: [[0, 1, 1]], lonePairs: [0, 0] },
  O2: { atoms: ["O", "O"], bonds: [[0, 1, 2]], lonePairs: [2, 2] },
  N2: { atoms: ["N", "N"], bonds: [[0, 1, 3]], lonePairs: [1, 1] },
  H2O: {
    atoms: ["O", "H", "H"],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
    ],
    lonePairs: [2, 0, 0],
  },
  NH3: {
    atoms: ["N", "H", "H", "H"],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
    ],
    lonePairs: [1, 0, 0, 0],
  },
  CH4: {
    atoms: ["C", "H", "H", "H", "H"],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
      [0, 4, 1],
    ],
    lonePairs: [0, 0, 0, 0, 0],
  },
} as const;
export function chemistryGivens(m: ChemistryModel): string {
  switch (m.kind) {
    case "atom":
      return m.protons + " protons · " + m.neutrons + " neutrons · " + m.electrons + " electrons";
    case "formula":
      return m.copies + " × " + chemicalLabel(m.species);
    case "ionic":
      return (
        m.positive +
        " " +
        m.cation +
        signed(ionCharges[m.cation]!) +
        " and " +
        m.negative +
        " " +
        m.anion +
        signed(ionCharges[m.anion]!)
      );
    case "lewis":
      return chemicalLabel(m.species) + " · Lewis electron structure";
    case "amount":
      return (
        chemNumber(m.moles) +
        " mol " +
        chemicalLabel(m.species) +
        " · M = " +
        chemNumber(formulaMass(m.species)) +
        " g/mol"
      );
    case "reaction":
      return reactionEquation(m.reaction, m.coefficients);
    case "batch": {
      const r = reactions[m.reaction];
      return (
        reactionEquation(m.reaction, r.balanced) +
        " · " +
        m.supplies.map((n, i) => n + " mol " + chemicalLabel(r.left[i]!)).join(", ")
      );
    }
  }
}
export function signed(n: number) {
  return n === 0 ? "0" : n > 0 ? "+" + n : String(n).replace("-", "−");
}
export function chemistryResults(m: ChemistryModel): string[] {
  switch (m.kind) {
    case "atom":
      return [
        "Atomic number " + m.protons,
        "Mass number " + (m.protons + m.neutrons),
        "Charge " + signed(m.protons - m.electrons),
      ];
    case "formula":
      return Object.entries(speciesAtoms[m.species]).map(
        ([e, n]) => m.copies * n + " " + e + " atoms",
      );
    case "ionic":
      return [
        "Total charge " +
          signed(m.positive * ionCharges[m.cation]! + m.negative * ionCharges[m.anion]!),
      ];
    case "lewis": {
      const d = lewisData[m.species];
      return [
        d.bonds.reduce((n, b) => n + b[2] * 2, 0) + " shared electrons",
        d.lonePairs.reduce<number>((n, p) => n + p * 2, 0) + " nonbonding electrons",
      ];
    }
    case "amount":
      return [
        chemNumber(m.moles * formulaMass(m.species)) + " g",
        chemNumber(m.moles) + " × 6.02214076 × 10²³ entities",
      ];
    case "reaction": {
      const t = reactionTotals(m.reaction, m.coefficients);
      return Object.keys(t.left).map(
        (e) => e + ": " + t.left[e] + " left / " + t.right[e] + " right",
      );
    }
    case "batch": {
      const r = reactions[m.reaction],
        v = batchResult(m.reaction, m.supplies);
      return [
        ...v.products.map((n, i) => chemNumber(n) + " mol " + chemicalLabel(r.right[i]!)),
        ...v.leftovers.map((n, i) => chemNumber(n) + " mol " + chemicalLabel(r.left[i]!) + " left"),
      ];
    }
  }
}

export function chemicalEntity(species: ChemicalSpecies): string {
  if (species === "Mg") return "atom";
  if (["NaCl", "MgCl2", "CaCl2", "Al2O3", "MgO", "Na2O"].includes(species)) return "formula unit";
  return "molecule";
}
