import { z } from "zod";
export const BiologyModelSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cell"), cell: z.enum(["animal", "plant", "bacterium"]) }).strict(),
  z
    .object({
      kind: z.literal("membrane"),
      left: z.number().int().min(1).max(18),
      right: z.number().int().min(1).max(18),
      permits: z.enum(["solute", "water", "neither"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("series"),
      xLabel: z.string().min(1).max(40),
      yLabel: z.string().min(1).max(40),
      points: z
        .array(z.tuple([z.number().min(0).max(100), z.number().min(0).max(20000)]))
        .min(3)
        .max(7),
    })
    .strict()
    .refine(
      (s) => s.points.every((p, i) => i === 0 || p[0] > s.points[i - 1]![0]),
      "Plot inputs must increase.",
    ),
  z
    .object({
      kind: z.literal("energy"),
      process: z.enum(["photosynthesis", "respiration"]),
      glucose: z.number().int().min(1).max(3),
    })
    .strict(),
  z.object({ kind: z.literal("dna"), sequence: z.string().regex(/^[ATCG]{4,8}$/) }).strict(),
  z
    .object({
      kind: z.literal("division"),
      process: z.enum(["mitosis", "meiosis"]),
      pairs: z.number().int().min(1).max(4),
      phase: z.number().int().min(0).max(3),
    })
    .strict(),
  z
    .object({
      kind: z.literal("cross"),
      first: z.enum(["AA", "Aa", "aa"]),
      second: z.enum(["AA", "Aa", "aa"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("population"),
      before: z.tuple([z.number().int().min(1).max(80), z.number().int().min(1).max(80)]),
      after: z.tuple([z.number().int().min(1).max(80), z.number().int().min(1).max(80)]),
    })
    .strict(),
  z.object({ kind: z.literal("food_web"), habitat: z.enum(["meadow", "pond"]) }).strict(),
  z
    .object({
      kind: z.literal("pyramid"),
      base: z.number().min(100).max(20000),
      percent: z.number().int().min(5).max(30),
      levels: z.number().int().min(3).max(4),
    })
    .strict(),
]);
export const BiologyDiagramSchema = z
  .object({
    type: z.literal("biology_explorer"),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1),
            label: z.string().min(1).max(60),
            model: BiologyModelSchema,
          })
          .strict(),
      )
      .min(2)
      .max(3),
    initialCaseId: z.string().min(1),
  })
  .strict()
  .refine(
    (s) =>
      new Set(s.cases.map((c) => c.id)).size === s.cases.length &&
      s.cases.some((c) => c.id === s.initialCaseId),
    "Use distinct cases and an available initial case.",
  );
export type BiologyModel = z.infer<typeof BiologyModelSchema>;
export type BiologyDiagram = z.infer<typeof BiologyDiagramSchema>;
