import type { InferenceModel } from "../../src/inference-diagram.js";
export const inferenceModels: InferenceModel[] = [
  { kind: "sample_summary", values: [1, 3, 5, 7, 9] },
  {
    kind: "bayes_table",
    rowLabels: ["A", "B"],
    columnLabels: ["Flag", "Clear"],
    counts: [
      [8, 2],
      [18, 72],
    ],
  },
  {
    kind: "discrete_distribution",
    outcomes: [
      { value: 0, probability: 0.5 },
      { value: 2, probability: 0.5 },
    ],
  },
  { kind: "binomial", trials: 4, probability: 0.5, target: 2, tail: "equal" },
  { kind: "poisson", rate: 2, duration: 1, target: 3, tail: "at_least" },
  { kind: "normal", mean: 10, sd: 2, lower: 8, upper: 12 },
  { kind: "sampling_means", population: [0, 2], sampleSize: 2 },
  { kind: "standard_error", mean: 10, sd: 4, size: 16, knownSigma: true },
  { kind: "mean_interval", mean: 10, sd: 4, size: 16, knownSigma: false, confidence: 0.95 },
  {
    kind: "interval_coverage",
    mean: 10,
    sd: 4,
    size: 16,
    confidence: 0.95,
    seed: 42,
    intervals: 20,
  },
  { kind: "proportion_interval", successes: 4, size: 20, confidence: 0.95 },
  {
    kind: "mean_test",
    mean: 10,
    sd: 4,
    size: 16,
    nullMean: 8,
    knownSigma: true,
    alternative: "greater",
    alpha: 0.05,
  },
  { kind: "power", effect: 2, sd: 4, size: 16, alpha: 0.05 },
  {
    kind: "two_sample",
    groups: [
      { label: "A", mean: 10, sd: 4, size: 16 },
      { label: "B", mean: 13, sd: 6, size: 9 },
    ],
    confidence: 0.95,
  },
  { kind: "paired", before: [10, 50, 100], after: [12, 54, 103], confidence: 0.95 },
  {
    kind: "test_outcomes",
    nullRuns: 100,
    falseRejections: 5,
    alternativeRuns: 100,
    missedEffects: 20,
  },
  {
    kind: "allocation",
    units: [
      { id: "1", block: "Low", arm: "A", value: 3 },
      { id: "2", block: "Low", arm: "B", value: 4 },
      { id: "3", block: "High", arm: "A", value: 8 },
      { id: "4", block: "High", arm: "B", value: 9 },
    ],
  },
  { kind: "multiple_tests", tests: 20, alpha: 0.05, independent: true },
];
