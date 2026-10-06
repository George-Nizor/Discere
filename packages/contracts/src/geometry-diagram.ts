import { z } from "zod";
const length = z.number().min(0.5).max(30);
const degrees = z.number().int().min(15).max(150);
/** Given dimensions only; no correct response or explanatory feedback is carried by a drawing. */
export const GeometryShapeSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("angle"),
      degrees: z.number().int().min(10).max(350),
      total: z.union([z.literal(90), z.literal(180), z.literal(360)]),
    })
    .strict()
    .refine((v) => v.degrees < v.total, "The given turn must be smaller than its total."),
  z
    .object({ kind: z.literal("triangle_angles"), a: degrees, b: degrees })
    .strict()
    .refine((v) => v.a + v.b <= 165, "Keep three positive, visible triangle angles."),
  z.object({ kind: z.literal("rectangle"), width: length, height: length }).strict(),
  z
    .object({
      kind: z.literal("triangle"),
      base: length,
      height: length,
      offset: z.number().min(0).max(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("parallelogram"),
      base: length,
      height: length,
      offset: z.number().min(0).max(0.7),
    })
    .strict(),
  z
    .object({ kind: z.literal("trapezoid"), bottom: length, top: length, height: length })
    .strict()
    .refine((v) => v.top < v.bottom, "Use a shorter upper base."),
  z
    .object({
      kind: z.literal("composite"),
      width: length,
      height: length,
      cutWidth: length,
      cutHeight: length,
    })
    .strict()
    .refine(
      (v) => v.cutWidth < v.width && v.cutHeight < v.height,
      "The corner cutout must leave an L shape.",
    ),
  z.object({ kind: z.literal("circle"), radius: length }).strict(),
  z
    .object({
      kind: z.literal("similarity"),
      width: length,
      height: length,
      factor: z.number().min(0.5).max(4),
    })
    .strict(),
  z.object({ kind: z.literal("right_triangle"), a: length, b: length }).strict(),
  z
    .object({
      kind: z.literal("distance"),
      x1: z.number().int().min(-5).max(10),
      y1: z.number().int().min(-5).max(10),
      x2: z.number().int().min(-5).max(10),
      y2: z.number().int().min(-5).max(10),
    })
    .strict()
    .refine(
      (v) => v.x1 !== v.x2 && v.y1 !== v.y2,
      "Use two points with a horizontal and vertical separation.",
    ),
  z.object({ kind: z.literal("prism"), length, width: length, height: length }).strict(),
]);
export const GeometryDiagramSchema = z
  .object({
    type: z.literal("geometry_explorer"),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1).max(32),
            label: z.string().min(1).max(42),
            shape: GeometryShapeSchema,
          })
          .strict(),
      )
      .min(2)
      .max(3),
    initialCaseId: z.string().min(1).max(32),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.cases.map((c) => c.id)).size === v.cases.length &&
      v.cases.some((c) => c.id === v.initialCaseId),
    "Use unique cases and an available starting case.",
  );
export type GeometryShape = z.infer<typeof GeometryShapeSchema>;
export type GeometryDiagram = z.infer<typeof GeometryDiagramSchema>;
