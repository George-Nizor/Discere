import type { LearningDiagram } from "@discere/contracts";

export type OutcomeGridSpec = Extract<LearningDiagram, { type: "outcome_grid" }>;
export interface OutcomeCell {
  first: number;
  second: number;
  eligible: boolean;
  matches: boolean;
}

/** Exact enumeration of ordered outcomes of two fair, independent dice. */
export function enumerateOutcomes(spec: OutcomeGridSpec, threshold = spec.threshold.value) {
  const cells: OutcomeCell[] = [];
  for (let first = 1; first <= spec.sides; first += 1) {
    for (let second = 1; second <= spec.sides; second += 1) {
      const matches =
        spec.event === "sum_at_least" ? first + second >= threshold :
        spec.event === "sum_equals" ? first + second === threshold :
        spec.event === "both_at_most" ? first <= threshold && second <= threshold :
        second <= threshold;
      cells.push({
        first, second, matches,
        eligible: spec.givenFirstAtMost === undefined || first <= spec.givenFirstAtMost,
      });
    }
  }
  const eligible = cells.filter((cell) => cell.eligible);
  const favourable = eligible.filter((cell) => cell.matches).length;
  return { cells, favourable, total: eligible.length, probability: favourable / eligible.length };
}

/** Recompute centre and spread from current observations; never infer marking from the visual. */
export function summariseData(values: readonly number[]) {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    throw new Error("Use a nonempty set of finite observations.");
  }
  const sorted = [...values].sort((left, right) => left - right);
  const count = sorted.length;
  const middle = Math.floor(count / 2);
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const median = count % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
  const range = sorted[count - 1]! - sorted[0]!;
  const squaredDeviations = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  return {
    count, sorted, mean, median, range,
    populationVariance: squaredDeviations / count,
    populationStandardDeviation: Math.sqrt(squaredDeviations / count),
  };
}
