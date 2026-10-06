import { z } from "zod";
import { BiologyDiagramSchema } from "./biology-diagram.js";
import { LinearAlgebraDiagramSchema } from "./linear-algebra-diagram.js";
import { InferenceDiagramSchema } from "./inference-diagram.js";
import { ChemistryDiagramSchema } from "./chemistry-diagram.js";
import { PythonDiagramSchema } from "./python-diagram.js";
import { GeometryDiagramSchema } from "./geometry-diagram.js";
import { CalculusDiagramSchema } from "./calculus-diagram.js";
import { MechanicsDiagramSchema } from "./mechanics-diagram.js";
import { EngineeringDiagramSchema } from "./engineering-diagram.js";
import { EconomicsDiagramSchema } from "./economics-diagram.js";
import { PhilosophyDiagramSchema } from "./philosophy-diagram.js";
import { LanguageDiagramSchema } from "./language-diagram.js";
import { AstronomyDiagramSchema } from "./astronomy-diagram.js";
import { PsychologyDiagramSchema } from "./psychology-diagram.js";

const ControlSchema = z
  .object({
    min: z.number(),
    max: z.number(),
    value: z.number(),
    step: z.number().positive().default(1),
  })
  .strict()
  .refine(
    (control) =>
      control.min < control.max &&
      control.value >= control.min &&
      control.value <= control.max &&
      (control.max - control.min) / control.step <= 200,
    "Use a bounded control with at most 200 increments.",
  );
const OperationSchema = z
  .object({ operator: z.enum(["add", "subtract", "multiply", "divide"]), operand: z.number() })
  .strict()
  .refine(
    (operation) => operation.operator !== "divide" || operation.operand !== 0,
    "Division needs a nonzero divisor.",
  );

const QueryTableSchema = z
  .object({
    name: z.string().min(1).max(40),
    columns: z.array(z.string().min(1).max(40)).min(1).max(8),
    rows: z
      .array(
        z
          .object({
            id: z.string().min(1),
            cells: z.array(z.union([z.string().max(120), z.number(), z.null()])).max(8),
          })
          .strict(),
      )
      .max(24),
  })
  .strict()
  .refine(
    (table) =>
      new Set(table.columns).size === table.columns.length &&
      new Set(table.rows.map((row) => row.id)).size === table.rows.length &&
      table.rows.every((row) => row.cells.length === table.columns.length),
    "Use unique column and row labels with one cell per column.",
  );

/** Teaching cases and controls; these contain no assessment authority. */
export const LearningDiagramSchema = z.discriminatedUnion("type", [
  PythonDiagramSchema,
  GeometryDiagramSchema,
  MechanicsDiagramSchema,
  CalculusDiagramSchema,
  LinearAlgebraDiagramSchema,
  InferenceDiagramSchema,
  ChemistryDiagramSchema,
  BiologyDiagramSchema,
  EngineeringDiagramSchema,
  EconomicsDiagramSchema,
  PhilosophyDiagramSchema,
  LanguageDiagramSchema,
  AstronomyDiagramSchema,
  PsychologyDiagramSchema,
  z
    .object({
      type: z.literal("relational_query"),
      inputs: z.array(QueryTableSchema).min(1).max(2),
      queries: z
        .array(
          z
            .object({
              id: z.string().min(1),
              label: z.string().min(1).max(60),
              sql: z.string().min(1).max(1500),
              result: QueryTableSchema,
            })
            .strict(),
        )
        .min(2)
        .max(3),
      initialQueryId: z.string().min(1),
    })
    .strict()
    .refine(
      (spec) =>
        new Set(spec.inputs.map((table) => table.name)).size === spec.inputs.length &&
        new Set(spec.queries.map((query) => query.id)).size === spec.queries.length &&
        spec.queries.some((query) => query.id === spec.initialQueryId),
      "Use distinct input tables and queries with an available initial query.",
    ),
  z
    .object({
      type: z.literal("number_machine"),
      bindAnswer: z.boolean().optional(),
      input: ControlSchema,
      operations: z.array(OperationSchema).min(1).max(4),
      /** An output to aim for, drawn beside the result: an `explore` step's goal. */
      target: z.number().optional(),
      /** The letter the input stands for; `x` unless the lesson uses another. */
      variable: z
        .string()
        .regex(/^[a-z]$/)
        .optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("equation_balance"),
      bindAnswer: z.boolean().optional(),
      coefficient: z.number(),
      constant: z.number(),
      right: z.number(),
      variable: ControlSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("coordinate_plane"),
      min: z.number().int().min(-10).max(-1),
      max: z.number().int().min(1).max(10),
      points: z
        .array(
          z
            .object({
              x: z.number().min(-10).max(10),
              y: z.number().min(-10).max(10),
              label: z.string().min(1),
            })
            .strict(),
        )
        .max(8),
      line: z.object({ gradient: z.number(), intercept: z.number() }).strict().optional(),
      explore: z.boolean().default(true),
    })
    .strict()
    .refine(
      (spec) =>
        spec.points.every(
          (point) =>
            point.x >= spec.min &&
            point.x <= spec.max &&
            point.y >= spec.min &&
            point.y <= spec.max,
        ) && new Set(spec.points.map((point) => point.label)).size === spec.points.length,
      "Keep labelled points unique and inside the displayed grid.",
    ),
  z
    .object({
      type: z.literal("truth_table"),
      pLabel: z.string().min(1).max(70).optional(),
      qLabel: z.string().min(1).max(70).optional(),
      outputLabel: z.string().min(1).max(70).optional(),
      formula: z.enum([
        "p",
        "not_p",
        "p_and_q",
        "p_or_q",
        "p_implies_q",
        "q_implies_p",
        "notq_implies_notp",
        "p_xor_q",
        "speaker_agreement",
        "conflicting_speakers",
      ]),
      p: z.boolean().default(true),
      q: z.boolean().default(false),
    })
    .strict(),
  z.object({ type: z.literal("program_trace"), code: z.string().min(1).max(2_000) }).strict(),
  z
    .object({
      type: z.literal("search_array"),
      values: z.array(z.number().int().min(-100).max(100)).min(2).max(16),
      target: z.number().int().min(-100).max(100),
      strategy: z.enum(["linear", "binary"]),
    })
    .strict()
    .refine(
      (spec) => new Set(spec.values).size === spec.values.length,
      "This teaching array needs distinct values.",
    )
    .refine(
      (spec) =>
        spec.strategy !== "binary" ||
        spec.values.every((value, index) => index === 0 || value >= spec.values[index - 1]!),
      "Binary search needs a sorted list.",
    ),
  z
    .object({
      type: z.literal("outcome_grid"),
      sides: z.number().int().min(2).max(8),
      event: z.enum(["sum_at_least", "sum_equals", "both_at_most", "second_at_most"]),
      threshold: ControlSchema,
      givenFirstAtMost: z.number().int().min(1).max(8).optional(),
    })
    .strict()
    .refine(
      (spec) =>
        [spec.threshold.min, spec.threshold.max, spec.threshold.value, spec.threshold.step].every(
          Number.isInteger,
        ) &&
        spec.threshold.min >= 0 &&
        spec.threshold.max <= spec.sides * 2 &&
        (spec.givenFirstAtMost === undefined || spec.givenFirstAtMost <= spec.sides),
      "Use whole-outcome thresholds and a nonempty condition inside the displayed dice.",
    ),
  z
    .object({
      type: z.literal("data_distribution"),
      values: z.array(z.number().min(-100).max(100)).min(3).max(12),
      editableIndex: z.number().int().nonnegative(),
      control: ControlSchema,
      showSpread: z.boolean().default(false),
    })
    .strict()
    .refine(
      (spec) =>
        spec.editableIndex < spec.values.length &&
        spec.values[spec.editableIndex] === spec.control.value &&
        spec.values.every((value) => value >= spec.control.min && value <= spec.control.max),
      "Keep every observation, including the editable one, inside its stated scale.",
    ),
  z
    .object({
      type: z.literal("sampling_population"),
      groups: z
        .array(
          z
            .object({
              label: z.string().min(1).max(40),
              value: z.number().min(-100).max(100),
              count: z.number().int().min(2).max(12),
            })
            .strict(),
        )
        .min(2)
        .max(3),
      samples: z
        .array(
          z
            .object({
              id: z.string().min(1),
              label: z.string().min(1).max(50),
              indices: z.array(z.number().int().nonnegative()).min(1).max(36),
            })
            .strict(),
        )
        .min(2)
        .max(3),
      initialSampleId: z.string().min(1),
    })
    .strict()
    .refine((spec) => {
      const size = spec.groups.reduce((sum, group) => sum + group.count, 0);
      return (
        new Set(spec.groups.map((group) => group.label)).size === spec.groups.length &&
        new Set(spec.samples.map((sample) => sample.id)).size === spec.samples.length &&
        spec.samples.some((sample) => sample.id === spec.initialSampleId) &&
        spec.samples.every(
          (sample) =>
            new Set(sample.indices).size === sample.indices.length &&
            sample.indices.every((index) => index < size),
        )
      );
    }, "Use distinct groups and samples, with unique sample members from the population."),
]);
export type LearningDiagram = z.infer<typeof LearningDiagramSchema>;
