import { z } from "zod";
import { BiologyModelSchema } from "./biology-diagram.js";
import { LinearAlgebraModelSchema } from "./linear-algebra-diagram.js";
import { InferenceModelSchema } from "./inference-diagram.js";
import { ChemistryModelSchema } from "./chemistry-diagram.js";
import { GeometryShapeSchema } from "./geometry-diagram.js";
import { CalculusModelSchema } from "./calculus-diagram.js";
import { EngineeringModelSchema } from "./engineering-diagram.js";
import { EconomicsModelSchema } from "./economics-diagram.js";
import { PhilosophyModelSchema } from "./philosophy-diagram.js";
import { LanguageModelSchema } from "./language-diagram.js";
import { AstronomyModelSchema } from "./astronomy-diagram.js";
import { PsychologyModelSchema } from "./psychology-diagram.js";
import { MechanicsModelSchema } from "./mechanics-diagram.js";

const Identifier = z.string().regex(/^[a-z_][a-z0-9_]{0,39}$/);
const QueryTable = z
  .object({
    name: Identifier,
    columns: z.array(Identifier).min(1).max(6),
    rows: z
      .array(z.array(z.union([z.string().max(80), z.number().finite(), z.null()])))
      .min(1)
      .max(8),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.columns).size === v.columns.length &&
      v.rows.every((row) => row.length === v.columns.length),
    "Use a rectangular table with distinct columns.",
  );

const Point = z
  .object({
    x: z.number().min(-10).max(10),
    y: z.number().min(-10).max(10),
    label: z.string().min(1).max(24),
  })
  .strict();
/** Read-only problem data. No solved output or assessment key belongs here. */
export const CourseCheckVisualSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("query"),
      sql: z
        .string()
        .min(1)
        .max(1800)
        .refine((s) => s.split("\n").length <= 24, "Use at most 24 lines."),
      tables: z.array(QueryTable).min(1).max(3),
    })
    .strict()
    .refine(
      (v) => new Set(v.tables.map((t) => t.name)).size === v.tables.length,
      "Use distinct table names.",
    ),
  z
    .object({
      type: z.literal("statements"),
      title: z.string().min(1).max(80),
      statements: z
        .array(
          z
            .object({
              label: z.string().min(1).max(24),
              text: z.string().min(1).max(300),
            })
            .strict(),
        )
        .min(1)
        .max(4),
      conclusion: z.string().min(1).max(240).optional(),
    })
    .strict()
    .refine(
      (v) => new Set(v.statements.map((s) => s.label)).size === v.statements.length,
      "Use distinct statement labels.",
    ),
  z
    .object({
      type: z.literal("program"),
      language: z.literal("python"),
      code: z
        .string()
        .min(1)
        .max(1800)
        .refine((s) => s.split("\n").length <= 24, "Use at most 24 lines."),
    })
    .strict(),
  z
    .object({
      type: z.literal("data_series"),
      label: z.string().min(1).max(100),
      series: z
        .array(
          z
            .object({
              label: z.string().min(1).max(40),
              values: z.array(z.number().finite().min(-100).max(100)).min(2).max(12),
            })
            .strict(),
        )
        .min(1)
        .max(2),
    })
    .strict()
    .refine(
      (v) => new Set(v.series.map((s) => s.label)).size === v.series.length,
      "Use distinct series labels.",
    ),
  z.object({ type: z.literal("biology"), model: BiologyModelSchema }).strict(),
  z.object({ type: z.literal("chemistry"), model: ChemistryModelSchema }).strict(),
  z.object({ type: z.literal("calculus"), model: CalculusModelSchema }).strict(),
  z.object({ type: z.literal("engineering"), model: EngineeringModelSchema }).strict(),
  z.object({ type: z.literal("economics"), model: EconomicsModelSchema }).strict(),
  z.object({ type: z.literal("philosophy"), model: PhilosophyModelSchema }).strict(),
  z.object({ type: z.literal("language"), model: LanguageModelSchema }).strict(),
  z.object({ type: z.literal("astronomy"), model: AstronomyModelSchema }).strict(),
  z.object({ type: z.literal("psychology"), model: PsychologyModelSchema }).strict(),
  z.object({ type: z.literal("linear_algebra"), model: LinearAlgebraModelSchema }).strict(),
  z.object({ type: z.literal("inference"), model: InferenceModelSchema }).strict(),
  z.object({ type: z.literal("mechanics"), model: MechanicsModelSchema }).strict(),
  z.object({ type: z.literal("geometry"), shape: GeometryShapeSchema }).strict(),
  z
    .object({
      type: z.literal("machine"),
      input: z.string().min(1).max(30),
      operations: z.array(z.string().min(1).max(24)).min(1).max(3),
      output: z.literal("?"),
    })
    .strict(),
  z
    .object({
      type: z.literal("balance"),
      left: z.string().min(1).max(40),
      right: z.string().min(1).max(40),
    })
    .strict(),
  z
    .object({
      type: z.literal("coordinates"),
      points: z.array(Point).min(1).max(4),
      connect: z.boolean(),
    })
    .strict()
    .refine(
      (v) => new Set(v.points.map((p) => p.label)).size === v.points.length,
      "Point labels must be unique.",
    ),
  z
    .object({
      type: z.literal("table"),
      columns: z.array(z.string().min(1).max(40)).min(2).max(3),
      rows: z
        .array(z.array(z.string().min(1).max(40)))
        .min(2)
        .max(5),
    })
    .strict()
    .refine(
      (v) =>
        new Set(v.columns).size === v.columns.length &&
        v.rows.every((row) => row.length === v.columns.length),
      "Use a rectangular table with distinct column labels.",
    ),
]);
export type CourseCheckVisual = z.infer<typeof CourseCheckVisualSchema>;
