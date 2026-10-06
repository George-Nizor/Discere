import { z } from "zod";

const value = z.number().finite().min(-10_000).max(10_000);
const spread = z.number().finite().min(0.001).max(10_000);
const size = z.number().int().min(2).max(10_000);
const chance = z.number().finite().min(0).max(1);
const confidence = z.number().finite().min(0.8).max(0.99);
const alpha = z.number().finite().min(0.005).max(0.2);
const label = z.string().min(1).max(40);
const count = z.number().int().min(0).max(10_000);
const tail = z.enum(["equal", "at_least", "at_most"]);
const group = z.object({ label, mean: value, sd: spread, size }).strict();

/** Authored givens only. Numerical results and marking authority are separate. */
export const InferenceModelSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("sample_summary"), values: z.array(value).min(3).max(16) }).strict(),
  z
    .object({
      kind: z.literal("bayes_table"),
      rowLabels: z.tuple([label, label]),
      columnLabels: z.tuple([label, label]),
      counts: z.tuple([z.tuple([count, count]), z.tuple([count, count])]),
    })
    .strict()
    .refine(
      (m) =>
        m.rowLabels[0] !== m.rowLabels[1] &&
        m.columnLabels[0] !== m.columnLabels[1] &&
        m.counts.every((row) => row[0] + row[1] > 0) &&
        m.counts[0][0] + m.counts[1][0] > 0 &&
        m.counts[0][1] + m.counts[1][1] > 0,
      "Use distinct labels and nonempty rows and columns.",
    ),
  z
    .object({
      kind: z.literal("discrete_distribution"),
      outcomes: z
        .array(z.object({ value, probability: chance }).strict())
        .min(2)
        .max(8),
    })
    .strict()
    .refine(
      (m) =>
        new Set(m.outcomes.map((o) => o.value)).size === m.outcomes.length &&
        Math.abs(m.outcomes.reduce((sum, o) => sum + o.probability, 0) - 1) < 1e-9,
      "Distinct outcomes must have probabilities summing to one.",
    ),
  z
    .object({
      kind: z.literal("binomial"),
      trials: z.number().int().min(1).max(24),
      probability: chance,
      target: z.number().int().min(0).max(24),
      tail,
    })
    .strict()
    .refine((m) => m.target <= m.trials, "Keep the target within the possible counts."),
  z
    .object({
      kind: z.literal("poisson"),
      rate: z.number().finite().min(0.05).max(10),
      duration: z.number().finite().min(0.25).max(4),
      target: z.number().int().min(0).max(40),
      tail,
    })
    .strict()
    .refine((m) => m.rate * m.duration <= 20, "Keep the expected count at most twenty."),
  z
    .object({
      kind: z.literal("normal"),
      mean: value,
      sd: spread,
      lower: value,
      upper: value,
    })
    .strict()
    .refine(
      (m) => m.lower < m.upper && m.lower >= m.mean - 8 * m.sd && m.upper <= m.mean + 8 * m.sd,
      "Use an ordered interval within eight standard deviations of the mean.",
    ),
  z
    .object({
      kind: z.literal("sampling_means"),
      population: z.array(value).min(2).max(6),
      sampleSize: z.number().int().min(1).max(5),
    })
    .strict()
    .refine(
      (m) => m.population.length ** m.sampleSize <= 4096,
      "Limit exact enumeration to 4,096 ordered samples with replacement.",
    ),
  z
    .object({
      kind: z.literal("standard_error"),
      mean: value,
      sd: spread,
      size,
      knownSigma: z.boolean(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("mean_interval"),
      mean: value,
      sd: spread,
      size,
      knownSigma: z.boolean(),
      confidence,
    })
    .strict(),
  z
    .object({
      kind: z.literal("interval_coverage"),
      mean: value,
      sd: spread,
      size,
      confidence,
      seed: z.number().int().min(0).max(4_294_967_295),
      intervals: z.number().int().min(10).max(30),
    })
    .strict(),
  z
    .object({
      kind: z.literal("proportion_interval"),
      successes: count,
      size,
      confidence,
    })
    .strict()
    .refine((m) => m.successes <= m.size, "Successes cannot exceed the sample size."),
  z
    .object({
      kind: z.literal("mean_test"),
      mean: value,
      sd: spread,
      size,
      nullMean: value,
      knownSigma: z.boolean(),
      alternative: z.enum(["less", "greater", "different"]),
      alpha,
    })
    .strict(),
  z
    .object({
      kind: z.literal("power"),
      effect: z.number().finite().min(0).max(100),
      sd: spread,
      size,
      alpha,
    })
    .strict(),
  z
    .object({
      kind: z.literal("two_sample"),
      groups: z.tuple([group, group]),
      confidence,
    })
    .strict()
    .refine((m) => m.groups[0].label !== m.groups[1].label, "Use distinct group labels."),
  z
    .object({
      kind: z.literal("paired"),
      before: z.array(value).min(3).max(12),
      after: z.array(value).min(3).max(12),
      confidence,
    })
    .strict()
    .refine(
      (m) =>
        m.before.length === m.after.length &&
        new Set(m.before.map((x, i) => m.after[i]! - x)).size > 1,
      "Give a matching after value for every unit and nonconstant paired differences.",
    ),
  z
    .object({
      kind: z.literal("test_outcomes"),
      nullRuns: size,
      falseRejections: count,
      alternativeRuns: size,
      missedEffects: count,
    })
    .strict()
    .refine(
      (m) => m.falseRejections <= m.nullRuns && m.missedEffects <= m.alternativeRuns,
      "Error counts cannot exceed the corresponding test runs.",
    ),
  z
    .object({
      kind: z.literal("allocation"),
      units: z
        .array(z.object({ id: label, block: label, arm: z.enum(["A", "B"]), value }).strict())
        .min(4)
        .max(24),
    })
    .strict()
    .refine(
      (m) =>
        new Set(m.units.map((u) => u.id)).size === m.units.length &&
        m.units.some((u) => u.arm === "A") &&
        m.units.some((u) => u.arm === "B"),
      "Use unique units and include both treatment arms.",
    ),
  z
    .object({
      kind: z.literal("multiple_tests"),
      tests: z.number().int().min(1).max(40),
      alpha,
      independent: z.literal(true),
    })
    .strict(),
]);

export const InferenceDiagramSchema = z
  .object({
    type: z.literal("inference_explorer"),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1).max(60),
            label: z.string().min(1).max(70),
            model: InferenceModelSchema,
          })
          .strict(),
      )
      .min(2)
      .max(3),
    initialCaseId: z.string().min(1).max(60),
  })
  .strict()
  .refine(
    (m) =>
      new Set(m.cases.map((c) => c.id)).size === m.cases.length &&
      m.cases.some((c) => c.id === m.initialCaseId),
    "Use distinct cases and an available initial case.",
  );

export type InferenceModel = z.infer<typeof InferenceModelSchema>;
export type InferenceDiagram = z.infer<typeof InferenceDiagramSchema>;
