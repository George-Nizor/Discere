import { describe, expect, it } from "vitest";
import {
  binomialMass,
  countEventProbability,
  normalDensity,
  normalInterval,
  normalQuantile,
  normalSurvival,
  poissonMass,
  studentDensity,
  studentQuantile,
  studentSurvival,
} from "../src/inference-probability.js";
import {
  inferenceBayes,
  inferenceCoverage,
  inferenceDiscrete,
  inferenceMeanInterval,
  inferenceMultiplicity,
  inferencePaired,
  inferencePower,
  inferenceProportion,
  inferenceSampling,
  inferenceSummary,
  inferenceTest,
  inferenceWelch,
} from "../src/inference.js";

describe("independent distribution references", () => {
  it.each([
    [0, 0.5],
    [1, 0.15865525393145707],
    [1.96, 0.024997895148220435],
    [3, 0.0013498980316300933],
    [-2, 0.9772498680518208],
  ])("matches standard normal survival at %s", (z, expected) => {
    expect(Math.abs(normalSurvival(z!) - expected!)).toBeLessThan(8e-8);
  });
  it("retains tiny positive upper-tail areas", () => {
    expect(normalInterval(8, 9)).toBeGreaterThan(6e-16);
    expect(normalInterval(8, 9)).toBeLessThan(7e-16);
    expect(normalInterval(-1, 1)).toBeCloseTo(0.682689492, 6);
    expect(normalDensity(0)).toBeCloseTo(0.3989422804, 9);
  });
  it("matches published normal quantiles", () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.95996398454, 5);
    expect(normalQuantile(0.95)).toBeCloseTo(1.64485362695, 5);
    expect(normalQuantile(0.005)).toBeCloseTo(-2.57582930355, 5);
  });
  it.each([-10, -2, -0.1, 0, 0.1, 2, 10])("agrees with the closed-form Cauchy tail at %s", (t) => {
    expect(studentSurvival(t, 1)).toBeCloseTo(0.5 - Math.atan(t) / Math.PI, 12);
    expect(studentDensity(t, 1)).toBeCloseTo(1 / (Math.PI * (1 + t * t)), 12);
  });
  it.each([-8, -1, 0, 1, 8])("agrees with the df=2 closed form at %s", (t) => {
    expect(studentSurvival(t, 2)).toBeCloseTo(0.5 - t / (2 * Math.sqrt(2 + t * t)), 12);
  });
  it.each([
    [1, 12.7062047364321],
    [5, 2.570581835636305],
    [10, 2.2281388519649385],
    [30, 2.0422724563012373],
    [100, 1.9839715184496334],
  ])("matches the 97.5th t percentile with df=%s", (df, expected) => {
    expect(studentQuantile(0.975, df!)).toBeCloseTo(expected!, 8);
  });
  it("handles symmetry, extreme tails and noninteger Welch degrees", () => {
    expect(studentQuantile(0.025, 10)).toBeCloseTo(-2.2281388519649385, 8);
    expect(studentSurvival(0, 9.7)).toBe(0.5);
    expect(studentSurvival(1e6, 100)).toBeLessThan(1e-100);
    expect(studentSurvival(2, 10000)).toBeCloseTo(normalSurvival(2), 4);
    expect(studentSurvival(studentQuantile(0.995, 1.2), 1.2)).toBeCloseTo(0.005, 12);
  });
  it("preserves binomial endpoints and an exact small distribution", () => {
    expect([0, 1, 2, 3, 4].map((k) => binomialMass(4, 0.5, k))).toEqual(
      [1, 4, 6, 4, 1].map((k) => k / 16),
    );
    expect(binomialMass(10, 0, 0)).toBe(1);
    expect(binomialMass(10, 0, 1)).toBe(0);
    expect(binomialMass(10, 1, 10)).toBe(1);
    expect(binomialMass(10, 1, 11)).toBe(0);
    expect(countEventProbability((k) => binomialMass(4, 0.5, k), 3, "at_least")).toBe(5 / 16);
  });
  it("matches independent Poisson values and event boundaries", () => {
    expect(poissonMass(2, 0)).toBeCloseTo(0.1353352832366127, 13);
    expect(poissonMass(2, 3)).toBeCloseTo(0.18044704431548356, 13);
    expect(countEventProbability((k) => poissonMass(2, k), 1, "at_most")).toBeCloseTo(
      0.4060058497098381,
      13,
    );
    expect(countEventProbability((k) => poissonMass(20, k), 0, "at_least")).toBe(1);
    expect(poissonMass(0, 0)).toBe(1);
    expect(poissonMass(0, 1)).toBe(0);
  });
  it("rejects unbounded or impossible numerical requests", () => {
    expect(() => normalQuantile(1)).toThrow();
    expect(() => normalInterval(2, 1)).toThrow();
    expect(() => studentSurvival(0, 0)).toThrow();
    expect(() => studentQuantile(0.5, Infinity)).toThrow();
    expect(() => binomialMass(10000, 0.5, 10)).toThrow();
    expect(() => poissonMass(2, 1e9)).toThrow();
    expect(() => countEventProbability(() => 1, 10000, "equal")).toThrow();
  });
});

describe("inference models", () => {
  it("uses the declared quartile convention without mutating data", () => {
    const data = [9, 1, 5, 3, 7];
    const s = inferenceSummary(data);
    expect(s).toMatchObject({ mean: 5, median: 5, q1: 2, q3: 8, iqr: 6, variance: 10 });
    expect(data).toEqual([9, 1, 5, 3, 7]);
    expect(inferenceSummary([1, 2, 3, 4])).toMatchObject({ q1: 1.5, q3: 3.5, variance: 5 / 3 });
    expect(inferenceSummary([4, 4, 4]).sd).toBe(0);
  });
  it("conditions on the evidence column rather than reversing the conditional", () => {
    expect(
      inferenceBayes({
        kind: "bayes_table",
        rowLabels: ["A", "B"],
        columnLabels: ["Flag", "Clear"],
        counts: [
          [8, 2],
          [18, 72],
        ],
      }),
    ).toMatchObject({ total: 100, prior: 0.1, likelihood: 0.8, evidence: 0.26, posterior: 8 / 26 });
  });
  it("weights expectation and squared deviations", () => {
    expect(
      inferenceDiscrete([
        { value: 0, probability: 0.25 },
        { value: 4, probability: 0.75 },
      ]),
    ).toMatchObject({ mean: 3, variance: 3 });
  });
  it("enumerates multiplicities, not just distinct sample means", () => {
    const s = inferenceSampling({ kind: "sampling_means", population: [0, 2], sampleSize: 2 });
    expect(s.means).toEqual([0, 1, 1, 2]);
    expect(s.bins).toEqual([
      { value: 0, count: 1, probability: 0.25 },
      { value: 1, count: 2, probability: 0.5 },
      { value: 2, count: 1, probability: 0.25 },
    ]);
    expect(s.mean).toBe(1);
    expect(s.se).toBeCloseTo(Math.SQRT1_2, 12);
    expect(
      inferenceSampling({ kind: "sampling_means", population: [1, 1, 3], sampleSize: 1 }).bins[0]!
        .probability,
    ).toBe(2 / 3);
    expect(() =>
      inferenceSampling({ kind: "sampling_means", population: [0, 1, 2, 3, 4, 5], sampleSize: 5 }),
    ).toThrow();
  });
  it("uses known population spread for z, and t even beyond n=30 when SD is estimated", () => {
    const known = inferenceMeanInterval({
      kind: "mean_interval",
      mean: 10,
      sd: 4,
      size: 16,
      knownSigma: true,
      confidence: 0.95,
    });
    expect(known.lower).toBeCloseTo(8.04003601546, 5);
    expect(known.upper).toBeCloseTo(11.95996398454, 5);
    const estimated = inferenceMeanInterval({
      kind: "mean_interval",
      mean: 0,
      sd: 10,
      size: 101,
      knownSigma: false,
      confidence: 0.95,
    });
    expect(estimated.critical).toBeCloseTo(1.9839715184496334, 8);
    expect(estimated.critical).toBeGreaterThan(known.critical);
  });
  it("keeps Wilson uncertainty at the boundaries and matches a reference example", () => {
    const empty = inferenceProportion({
      kind: "proportion_interval",
      successes: 0,
      size: 10,
      confidence: 0.95,
    });
    const full = inferenceProportion({
      kind: "proportion_interval",
      successes: 10,
      size: 10,
      confidence: 0.95,
    });
    expect(empty.lower).toBeCloseTo(0, 12);
    expect(empty.upper).toBeCloseTo(0.2775328, 6);
    expect(full.upper).toBeCloseTo(1, 12);
    expect(full.lower).toBeCloseTo(1 - empty.upper, 12);
    const middle = inferenceProportion({
      kind: "proportion_interval",
      successes: 4,
      size: 20,
      confidence: 0.9,
    });
    expect(middle.lower).toBeCloseTo(0.093118, 5);
    expect(middle.upper).toBeCloseTo(0.3783767, 5);
  });
  it("replays coverage deterministically and widens around the same sample means", () => {
    const model = {
      kind: "interval_coverage" as const,
      mean: 10,
      sd: 3,
      size: 9,
      confidence: 0.8,
      seed: 42,
      intervals: 30,
    };
    const first = inferenceCoverage(model),
      second = inferenceCoverage({ ...model, confidence: 0.99 });
    expect(first).toEqual(inferenceCoverage(model));
    expect(first.map((c) => c.mean)).toEqual(second.map((c) => c.mean));
    expect(first.every((c, i) => c.lower >= second[i]!.lower && c.upper <= second[i]!.upper)).toBe(
      true,
    );
    expect(first.some((c) => !c.covers)).toBe(true);
    expect(second.filter((c) => c.covers).length).toBeGreaterThanOrEqual(
      first.filter((c) => c.covers).length,
    );
    expect(first.every((c) => [c.mean, c.lower, c.upper].every(Number.isFinite))).toBe(true);
  });
  it("keeps the sign of a negative effect and uses the preselected tail", () => {
    const model = {
      kind: "mean_test" as const,
      mean: 73,
      nullMean: 80,
      sd: 20,
      size: 25,
      knownSigma: true,
      alpha: 0.05,
    };
    const less = inferenceTest({ ...model, alternative: "less" });
    const greater = inferenceTest({ ...model, alternative: "greater" });
    const different = inferenceTest({ ...model, alternative: "different" });
    expect(less.statistic).toBe(-1.75);
    expect(less.p).toBeCloseTo(0.040059156863817086, 6);
    expect(less.reject).toBe(true);
    expect(greater.p).toBeCloseTo(0.9599408431361829, 6);
    expect(different.p).toBeCloseTo(0.08011831372763417, 6);
    expect(different.reject).toBe(false);
  });
  it("has null-effect power equal to alpha and increasing power with sample size", () => {
    const model = { kind: "power" as const, effect: 0, sd: 4, size: 16, alpha: 0.05 };
    expect(inferencePower(model).power).toBeCloseTo(0.05, 12);
    expect(inferencePower({ ...model, effect: 2, size: 64 }).power).toBeGreaterThan(
      inferencePower({ ...model, effect: 2 }).power,
    );
  });
  it("uses Welch degrees rather than a pooled variance and preserves group order", () => {
    const model = {
      kind: "two_sample" as const,
      groups: [
        { label: "A", mean: 10, sd: 4, size: 16 },
        { label: "B", mean: 13, sd: 6, size: 9 },
      ] as [
        { label: string; mean: number; sd: number; size: number },
        { label: string; mean: number; sd: number; size: number },
      ],
      confidence: 0.95,
    };
    const w = inferenceWelch(model);
    expect(w.difference).toBe(3);
    expect(w.se).toBeCloseTo(Math.sqrt(5), 12);
    expect(w.degrees).toBeCloseTo(375 / 31, 12);
    const reverse = inferenceWelch({ ...model, groups: [model.groups[1], model.groups[0]] });
    expect(reverse.lower).toBeCloseTo(-w.upper, 12);
    expect(reverse.upper).toBeCloseTo(-w.lower, 12);
  });
  it("uses paired differences despite the much larger spread of the raw values", () => {
    const p = inferencePaired({
      kind: "paired",
      before: [10, 50, 100, 200],
      after: [12, 54, 103, 205],
      confidence: 0.95,
    });
    expect(p.differences).toEqual([2, 4, 3, 5]);
    expect(p.mean).toBe(3.5);
    expect(p.sd).toBeCloseTo(Math.sqrt(5 / 3), 12);
    expect(p.se).toBeCloseTo(Math.sqrt(5 / 12), 12);
    expect(p.lower).toBeGreaterThan(1);
    expect(p.upper).toBeLessThan(6);
  });
  it("separates the independent exact family risk from the general Bonferroni threshold", () => {
    const m = inferenceMultiplicity({
      kind: "multiple_tests",
      tests: 20,
      alpha: 0.05,
      independent: true,
    });
    expect(m.familyError).toBeCloseTo(0.6415140775914581, 13);
    expect(m.bonferroni).toBe(0.0025);
  });
});
