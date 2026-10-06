import { describe, expect, it } from "vitest";
import { enumerateOutcomes, summariseData } from "../src/statistics.js";

describe("exact probability teaching cases", () => {
  it("enumerates ordered cases rather than treating possible sums as equally likely", () => {
    const result = enumerateOutcomes({
      type: "outcome_grid", sides: 6, event: "sum_equals",
      threshold: { min: 2, max: 12, value: 7, step: 1 },
    });
    expect(result.cells).toHaveLength(36);
    expect(result.favourable).toBe(6);
    expect(result.probability).toBeCloseTo(1 / 6);
    expect(new Set(result.cells.map((cell) => cell.first + "," + cell.second)).size).toBe(36);
  });
  it("conditions the denominator and numerator on the same event", () => {
    const result = enumerateOutcomes({
      type: "outcome_grid", sides: 6, event: "sum_at_least",
      threshold: { min: 2, max: 12, value: 7, step: 1 }, givenFirstAtMost: 2,
    });
    expect(result.total).toBe(12);
    expect(result.favourable).toBe(3);
    expect(result.probability).toBe(0.25);
  });
  it("has exact boundary probabilities and independent joint outcomes", () => {
    const spec = {
      type: "outcome_grid" as const, sides: 6, event: "both_at_most" as const,
      threshold: { min: 0, max: 6, value: 3, step: 1 },
    };
    expect(enumerateOutcomes(spec).probability).toBe(0.25);
    expect(enumerateOutcomes(spec, 0).probability).toBe(0);
    expect(enumerateOutcomes(spec, 6).probability).toBe(1);
  });
});

describe("statistics recomputation", () => {
  it("sorts numerically, handles an even median, and leaves the authored data intact", () => {
    const values = [10, 2, 6, 4];
    expect(summariseData(values)).toMatchObject({ count: 4, mean: 5.5, median: 5, range: 8 });
    expect(values).toEqual([10, 2, 6, 4]);
  });
  it("separates centre from spread and explicitly uses a population denominator", () => {
    const narrow = summariseData([4, 4, 4, 4]);
    const wide = summariseData([2, 2, 6, 6]);
    expect(narrow.mean).toBe(wide.mean);
    expect(narrow.populationVariance).toBe(0);
    expect(wide.populationVariance).toBe(4);
    expect(wide.populationStandardDeviation).toBe(2);
  });
  it("recomputes an outlier instead of moving the median with the mean", () => {
    expect(summariseData([2, 4, 4, 5, 25])).toMatchObject({ mean: 8, median: 4, range: 23 });
  });
  it("rejects empty and nonfinite input", () => {
    expect(() => summariseData([])).toThrow();
    expect(() => summariseData([1, Number.NaN])).toThrow();
  });
});
