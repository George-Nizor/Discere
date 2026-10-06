import { describe, expect, it } from "vitest";
import {
  InferenceDiagramSchema,
  InferenceModelSchema,
  type InferenceModel,
} from "../src/inference-diagram.js";

import { inferenceModels as models } from "./fixtures/inference-models.js";

describe("bounded inference authoring", () => {
  it.each(models.map((model) => [model.kind, model] as const))(
    "accepts %s givens and rejects embedded results",
    (_, model) => {
      expect(InferenceModelSchema.safeParse(model).success).toBe(true);
      expect(InferenceModelSchema.safeParse({ ...model, answer: 42 }).success).toBe(false);
    },
  );
  it.each([
    { kind: "sample_summary", values: [1, 2, Infinity] },
    {
      kind: "bayes_table",
      rowLabels: ["A", "B"],
      columnLabels: ["X", "Y"],
      counts: [
        [0, 1],
        [0, 2],
      ],
    },
    {
      kind: "discrete_distribution",
      outcomes: [
        { value: 1, probability: 0.5 },
        { value: 2, probability: 0.6 },
      ],
    },
    {
      kind: "discrete_distribution",
      outcomes: [
        { value: 1, probability: 0.5 },
        { value: 1, probability: 0.5 },
      ],
    },
    { kind: "binomial", trials: 4, probability: 0.5, target: 5, tail: "equal" },
    { kind: "poisson", rate: 10, duration: 4, target: 3, tail: "equal" },
    { kind: "normal", mean: 0, sd: 1, lower: -9, upper: 2 },
    { kind: "normal", mean: 0, sd: 1, lower: 2, upper: 1 },
    { kind: "sampling_means", population: [0, 1, 2, 3, 4, 5], sampleSize: 5 },
    { kind: "standard_error", mean: 0, sd: 0, size: 10, knownSigma: true },
    { kind: "proportion_interval", successes: 11, size: 10, confidence: 0.95 },
    { kind: "paired", before: [1, 2, 3], after: [2, 3, 4], confidence: 0.95 },
    { kind: "paired", before: [1, 2, 3], after: [2, 3, 5, 6], confidence: 0.95 },
    {
      kind: "test_outcomes",
      nullRuns: 20,
      falseRejections: 21,
      alternativeRuns: 20,
      missedEffects: 2,
    },
    { kind: "multiple_tests", tests: 20, alpha: 0.05, independent: false },
  ])("rejects an impossible or unbounded model %j", (model) => {
    expect(InferenceModelSchema.safeParse(model).success).toBe(false);
  });
  it("requires real distinct comparison cases and a matching starting case", () => {
    const first = { id: "first", label: "First sample", model: models[0]! };
    const second = { ...first, id: "second", label: "Second sample" };
    const spec = { type: "inference_explorer", cases: [first, second], initialCaseId: "first" };
    expect(InferenceDiagramSchema.safeParse(spec).success).toBe(true);
    expect(InferenceDiagramSchema.safeParse({ ...spec, cases: [first, first] }).success).toBe(
      false,
    );
    expect(InferenceDiagramSchema.safeParse({ ...spec, initialCaseId: "missing" }).success).toBe(
      false,
    );
    expect(InferenceDiagramSchema.safeParse({ ...spec, cases: [first] }).success).toBe(false);
  });
});
