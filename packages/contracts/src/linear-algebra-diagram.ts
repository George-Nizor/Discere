import { z } from "zod";
const coordinate = z.number().finite().min(-20).max(20);
const vector = z.tuple([coordinate, coordinate]);
export const LinearMatrixSchema = z
  .array(z.array(coordinate).min(1).max(3))
  .min(1)
  .max(3)
  .refine((m) => m.every((row) => row.length === m[0]!.length), "Use a rectangular matrix.");
const square = LinearMatrixSchema.refine((m) => m.length === m[0]!.length, "Use a square matrix.");
/** Bounded given data. Derived answers and worked steps do not belong in a model. */
export const LinearAlgebraModelSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("vector_sum"), u: vector, v: vector }).strict(),
  z.object({ kind: z.literal("scaled_vector"), v: vector, scale: coordinate }).strict(),
  z.object({ kind: z.literal("dot_product"), u: vector, v: vector }).strict(),
  z.object({ kind: z.literal("vector_length"), v: vector }).strict(),
  z
    .object({ kind: z.literal("projection"), v: vector, direction: vector })
    .strict()
    .refine((m) => m.direction.some((n) => n !== 0), "A projection direction must be nonzero."),
  z
    .object({
      kind: z.literal("matrix"),
      operation: z.enum(["transpose", "multiply", "apply", "inverse", "determinant"]),
      matrix: LinearMatrixSchema,
      second: LinearMatrixSchema.optional(),
      vector: z.array(coordinate).min(1).max(3).optional(),
    })
    .strict()
    .superRefine((m, ctx) => {
      const fail = (message: string) => ctx.addIssue({ code: "custom", message });
      if (m.operation === "multiply") {
        if (!m.second || m.matrix[0]!.length !== m.second.length)
          fail("Matrix product inner dimensions must match.");
      } else if (m.second !== undefined) fail("A second matrix is only used for multiplication.");
      if (m.operation === "apply") {
        if (!m.vector || m.vector.length !== m.matrix[0]!.length)
          fail("The input vector must match the matrix columns.");
      } else if (m.vector !== undefined)
        fail("An input vector is only used for a matrix application.");
      if (
        ["inverse", "determinant"].includes(m.operation) &&
        m.matrix.length !== m.matrix[0]!.length
      )
        fail("This operation needs a square matrix.");
    }),
  z
    .object({
      kind: z.literal("system"),
      matrix: LinearMatrixSchema,
      rhs: z.array(coordinate).min(1).max(3),
    })
    .strict()
    .refine((m) => m.rhs.length === m.matrix.length, "Give one right-hand value per equation."),
  z
    .object({
      kind: z.literal("least_squares"),
      matrix: LinearMatrixSchema,
      rhs: z.array(coordinate).min(1).max(3),
    })
    .strict()
    .refine(
      (m) => m.rhs.length === m.matrix.length && m.matrix.length >= m.matrix[0]!.length,
      "Give one measurement per row and at least as many measurements as coefficients.",
    ),
  z.object({ kind: z.literal("span"), vectors: z.array(vector).min(1).max(3) }).strict(),
  z
    .object({ kind: z.literal("eigen"), matrix: square, vector })
    .strict()
    .refine(
      (m) => m.matrix.length === 2 && m.vector.some((n) => n !== 0),
      "Use a two-dimensional matrix and a nonzero candidate vector.",
    ),
  z
    .object({ kind: z.literal("svd"), matrix: LinearMatrixSchema })
    .strict()
    .refine(
      (m) => Math.min(m.matrix.length, m.matrix[0]!.length) === 2,
      "This SVD model supports 2x2, 2x3 and 3x2 matrices.",
    ),
]);
export const LinearAlgebraDiagramSchema = z
  .object({
    type: z.literal("linear_algebra_explorer"),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1).max(60),
            label: z.string().min(1).max(70),
            model: LinearAlgebraModelSchema,
          })
          .strict(),
      )
      .min(2)
      .max(3),
    initialCaseId: z.string().min(1).max(60),
  })
  .strict()
  .refine(
    (s) =>
      new Set(s.cases.map((c) => c.id)).size === s.cases.length &&
      s.cases.some((c) => c.id === s.initialCaseId),
    "Use distinct cases and an available initial case.",
  );
export type LinearAlgebraModel = z.infer<typeof LinearAlgebraModelSchema>;
export type LinearAlgebraDiagram = z.infer<typeof LinearAlgebraDiagramSchema>;
