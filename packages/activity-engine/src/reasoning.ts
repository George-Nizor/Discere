import type { LearningDiagram } from "@discere/contracts";
export type TruthFormula = Extract<LearningDiagram, { type: "truth_table" }>["formula"];
export function truthValue(formula: TruthFormula, p: boolean, q: boolean): boolean {
  switch (formula) {
    case "p":
      return p;
    case "not_p":
      return !p;
    case "p_and_q":
      return p && q;
    case "p_or_q":
      return p || q;
    case "p_implies_q":
      return !p || q;
    case "q_implies_p":
      return !q || p;
    case "notq_implies_notp":
      return q || !p;
    case "p_xor_q":
      return p !== q;
    case "speaker_agreement":
      return p === !q && q === (p === q);
    case "conflicting_speakers":
      return p === q && q === !p;
  }
}
export interface SearchStep {
  index: number;
  low: number;
  high: number;
  found: boolean;
}
export function traceSearch(
  values: number[],
  target: number,
  strategy: "linear" | "binary",
): SearchStep[] {
  if (
    strategy === "binary" &&
    values.some((value, index) => index > 0 && value < values[index - 1]!)
  )
    throw new Error("Binary search needs a sorted list.");
  const steps: SearchStep[] = [];
  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const index = strategy === "linear" ? low : Math.floor((low + high) / 2);
    const found = values[index] === target;
    steps.push({ index, low, high, found });
    if (found) break;
    if (strategy === "linear" || values[index]! < target) low = index + 1;
    else high = index - 1;
  }
  return steps;
}
