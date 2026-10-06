import type { BiologyModel } from "@discere/contracts";
export const bioNumber = (n: number) => String(Number(n.toFixed(4)));
export const dnaComplement = (s: string) => {
  if (!/^[ATCG]+$/.test(s)) throw Error("Use DNA bases A, T, C and G.");
  const map: Record<string, string> = { A: "T", T: "A", C: "G", G: "C" };
  return [...s].map((b) => map[b]).join("");
};
export function punnett(first: string, second: string) {
  if (!/^(AA|Aa|aa)$/.test(first) || !/^(AA|Aa|aa)$/.test(second))
    throw Error("Use this single-locus diploid model.");
  return [...first].flatMap((a) => [...second].map((b) => [a, b].sort().join("")));
}
export function membraneState(m: Extract<BiologyModel, { kind: "membrane" }>, progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  let left = m.left,
    right = m.right,
    leftVolume = 1;
  if (m.permits === "solute") {
    left = m.left + ((m.left + m.right) / 2 - m.left) * t;
    right = m.left + m.right - left;
  }
  if (m.permits === "water") leftVolume = 1 + ((2 * m.left) / (m.left + m.right) - 1) * t;
  return { left, right, leftVolume, rightVolume: 2 - leftVolume };
}
export function divisionState(m: Extract<BiologyModel, { kind: "division" }>) {
  const { pairs, phase, process } = m;
  const cells = phase < 2 ? 1 : process === "mitosis" ? 2 : phase === 2 ? 2 : 4;
  const chromosomes = (process === "meiosis" && phase >= 2 ? 1 : 2) * pairs;
  const copied = phase === 1 || (process === "meiosis" && phase === 2);
  return { cells, chromosomes, chromatids: chromosomes * (copied ? 2 : 1), copied };
}
export const divisionPhases = [
  "Before DNA copying",
  "DNA copied",
  "First division complete",
  "Final cells",
];
export function energyAmounts(m: Extract<BiologyModel, { kind: "energy" }>) {
  return {
    glucose: m.glucose,
    carbonDioxide: m.glucose * 6,
    water: m.glucose * 6,
    oxygen: m.glucose * 6,
  };
}
export const foodWebs = {
  meadow: {
    names: ["Grass", "Grasshopper", "Mouse", "Frog", "Hawk"],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 4],
    ],
  },
  pond: {
    names: ["Algae", "Zooplankton", "Small fish", "Heron"],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [1, 3],
    ],
  },
} as const;
export function trophicEnergy(m: Extract<BiologyModel, { kind: "pyramid" }>) {
  return Array.from({ length: m.levels }, (_, i) => m.base * (m.percent / 100) ** i);
}
export function biologyGivens(m: BiologyModel): string {
  switch (m.kind) {
    case "cell":
      return m.cell === "plant"
        ? "Typical photosynthetic leaf cell"
        : "Typical " + m.cell + " cell";
    case "membrane":
      return (
        "Equal starting volumes · left " +
        m.left +
        " solute units · right " +
        m.right +
        " · passes " +
        (m.permits === "neither" ? "neither substance" : m.permits)
      );
    case "series":
      return "Illustrative observations · " + m.yLabel + " against " + m.xLabel;
    case "energy":
      return m.process === "photosynthesis"
        ? "Light + carbon dioxide + water → sugar + oxygen"
        : "Sugar + oxygen → carbon dioxide + water; energy transferred";
    case "dna":
      return "Template strand: " + m.sequence + " · aligned bases, not a full gene";
    case "division":
      return m.process + " · starting cell has " + m.pairs + " homologous pairs";
    case "cross":
      return m.first + " × " + m.second + " · A completely dominant · equal gamete chances";
    case "population":
      return (
        "Heritable variants · before: " + m.before.join(" / ") + " · later: " + m.after.join(" / ")
      );
    case "food_web":
      return "Food → consumer · " + m.habitat + " feeding links";
    case "pyramid":
      return "Producer energy " + m.base + " kJ · assumed transfer " + m.percent + "% per level";
  }
}
export function biologyResults(m: BiologyModel): string[] {
  switch (m.kind) {
    case "cell":
      return m.cell === "bacterium"
        ? ["DNA is in a nucleoid; no membrane-bound nucleus."]
        : m.cell === "plant"
          ? ["The illustrated leaf cell has chloroplasts and mitochondria."]
          : ["Mitochondria transfer energy during aerobic respiration."];
    case "membrane":
      return m.left === m.right && m.permits !== "neither"
        ? ["Equal initial concentrations: no net movement, although molecules still move."]
        : m.permits === "solute"
          ? ["Net solute diffusion initially toward the lower concentration."]
          : m.permits === "water"
            ? ["Water initially moves toward the higher concentration of impermeant solute."]
            : ["No crossing through this impermeable barrier."];
    case "series":
      return m.points.map((p) => p[0] + ": " + p[1]);
    case "energy":
      return [
        "Per glucose: six carbon dioxide, six water and six oxygen units in the simplified overall accounting.",
      ];
    case "dna":
      return ["Aligned complementary bases: " + dnaComplement(m.sequence)];
    case "division": {
      const s = divisionState(m);
      return [
        s.cells + " cells",
        s.chromosomes + " chromosomes per cell",
        s.chromatids + " DNA molecules per cell",
      ];
    }
    case "cross": {
      const cells = punnett(m.first, m.second);
      return [
        "AA: " + cells.filter((s) => s === "AA").length + "/4",
        "Aa: " + cells.filter((s) => s === "Aa").length + "/4",
        "aa: " + cells.filter((s) => s === "aa").length + "/4",
      ];
    }
    case "population":
      return [
        "Blue frequency: " +
          bioNumber((m.before[0] / (m.before[0] + m.before[1])) * 100) +
          "% → " +
          bioNumber((m.after[0] / (m.after[0] + m.after[1])) * 100) +
          "%",
      ];
    case "food_web":
      return [
        "Arrows track feeding and energy transfer; they do not predict all population changes.",
      ];
    case "pyramid":
      return trophicEnergy(m).map((n, i) => "Level " + (i + 1) + ": " + bioNumber(n) + " kJ");
  }
}
