import { z } from "zod";

const TableSchema = z
  .object({
    columns: z.array(z.string().min(1).max(60)).min(1).max(9),
    rows: z
      .array(z.array(z.union([z.string().max(160), z.number(), z.boolean(), z.null()])).max(9))
      .max(24),
  })
  .strict()
  .refine(
    (table) =>
      new Set(table.columns).size === table.columns.length &&
      table.rows.every((row) => row.length === table.columns.length),
    "Use unique columns and rectangular tables.",
  );
const ValueSchema = z
  .object({
    name: z.string().min(1).max(60),
    type: z.string().min(1).max(40),
    display: z.string().max(2000),
    table: TableSchema.optional(),
  })
  .strict();

/** Reviewed executions of original examples, never learner code or assessment keys. */
export const PythonDiagramSchema = z
  .object({
    type: z.literal("python_execution"),
    runtime: z.string().min(1).max(100),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1).max(60),
            label: z.string().min(1).max(60),
            code: z.string().min(1).max(4000),
            steps: z
              .array(
                z
                  .object({
                    lineStart: z.number().int().positive(),
                    lineEnd: z.number().int().positive(),
                    values: z.array(ValueSchema).max(6),
                    stdout: z.string().max(2000),
                  })
                  .strict(),
              )
              .min(1)
              .max(24),
          })
          .strict()
          .refine((example) => {
            const lines = example.code.split("\n").length;
            return (
              example.steps.every(
                (step, index) =>
                  step.lineEnd >= step.lineStart &&
                  step.lineEnd <= lines &&
                  step.lineStart === (index ? example.steps[index - 1]!.lineEnd + 1 : 1) &&
                  new Set(step.values.map((value) => value.name)).size === step.values.length,
              ) && example.steps.at(-1)!.lineEnd === lines
            );
          }, "Execution steps must cover the code in order, with unique watched names."),
      )
      .min(2)
      .max(3),
    initialCaseId: z.string().min(1),
  })
  .strict()
  .refine(
    (spec) =>
      new Set(spec.cases.map((item) => item.id)).size === spec.cases.length &&
      spec.cases.some((item) => item.id === spec.initialCaseId),
    "Use distinct cases and a valid starting case.",
  );
