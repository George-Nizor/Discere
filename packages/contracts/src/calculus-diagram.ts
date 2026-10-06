import { z } from "zod";
const x = z.number().min(-6).max(6);
const coefficients = z.array(z.number().min(-50).max(50)).min(1).max(5);
const polynomial = { coefficients };
/** Only function definitions and given coordinates, never assessment authority. */
export const CalculusModelSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("limit"),
      ...polynomial,
      at: x,
      hole: z.boolean(),
      pointValue: z.number().min(-100).max(100).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("jump"),
      at: x,
      left: z.number().min(-20).max(20),
      right: z.number().min(-20).max(20),
    })
    .strict(),
  z
    .object({ kind: z.literal("secant"), ...polynomial, at: x, span: z.number().min(0.05).max(2) })
    .strict(),
  z.object({ kind: z.literal("tangent"), ...polynomial, at: x }).strict(),
  z
    .object({ kind: z.literal("primitive"), ...polynomial, constant: z.number().min(-5).max(5) })
    .strict(),
  z
    .object({
      kind: z.literal("area"),
      ...polynomial,
      from: x,
      to: x,
      rectangles: z.number().int().min(1).max(24),
      method: z.enum(["left", "right", "midpoint"]),
      display: z.enum(["rectangles", "integral"]),
    })
    .strict()
    .refine((v) => v.from < v.to, "Area bounds must increase."),
]);
export const CalculusDiagramSchema = z
  .object({
    type: z.literal("calculus_explorer"),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1),
            label: z.string().min(1).max(70),
            model: CalculusModelSchema,
          })
          .strict(),
      )
      .min(2)
      .max(3),
    initialCaseId: z.string().min(1),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.cases.map((c) => c.id)).size === v.cases.length &&
      v.cases.some((c) => c.id === v.initialCaseId),
    "Use unique cases and an available initial case.",
  );
export type CalculusModel = z.infer<typeof CalculusModelSchema>;
export type CalculusDiagram = z.infer<typeof CalculusDiagramSchema>;
