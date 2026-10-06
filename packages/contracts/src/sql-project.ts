import { z } from "zod";
import { TutoringModeSchema } from "./modes.js";

const Id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9][a-z0-9-]*$/);
const Name = z.string().regex(/^[a-z_][a-z0-9_]{0,39}$/);
export const SqlCellSchema = z.union([
  z.string().max(2000),
  z.number().finite().min(-1e15).max(1e15),
  z.null(),
]);
export const SqlTableSchema = z
  .object({
    name: Name,
    columns: z
      .array(z.object({ name: Name, type: z.enum(["TEXT", "INTEGER", "REAL"]) }).strict())
      .min(1)
      .max(8),
    rows: z.array(z.array(SqlCellSchema)).max(40),
  })
  .strict()
  .superRefine((t, ctx) => {
    if (
      new Set(t.columns.map((c) => c.name)).size !== t.columns.length ||
      t.rows.some((r) => r.length !== t.columns.length)
    )
      ctx.addIssue({
        code: "custom",
        message: "Table columns must be distinct and rows rectangular.",
      });
    for (const row of t.rows)
      row.forEach((v, i) => {
        const type = t.columns[i]?.type;
        if (
          v !== null &&
          (type === "TEXT"
            ? typeof v !== "string"
            : typeof v !== "number" || (type === "INTEGER" && !Number.isSafeInteger(v)))
        )
          ctx.addIssue({
            code: "custom",
            message: "Each value must match its declared SQLite type.",
          });
      });
  });
export const SqlTablesSchema = z
  .array(SqlTableSchema)
  .min(1)
  .max(3)
  .superRefine((tables, ctx) => {
    if (
      new Set(tables.map((t) => t.name)).size !== tables.length ||
      tables.some((t) => t.name.startsWith("sqlite_"))
    )
      ctx.addIssue({ code: "custom", message: "Use distinct non-system table names." });
  });
export const SqlQuerySchema = z.string().max(16000);
export const SqlResultSchema = z
  .object({
    columns: z.array(z.string().max(200)).min(1).max(16),
    rows: z.array(z.array(SqlCellSchema)).max(200),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.rows.some((row) => row.length !== r.columns.length))
      ctx.addIssue({ code: "custom", message: "Results must be rectangular." });
  });
export const SqlTaskSchema = z
  .object({
    id: Id,
    title: z.string().min(1).max(120),
    prompt: z.string().min(1).max(1800),
    lessonId: Id,
    conceptIds: z.array(Id).min(1),
    sourceIds: z.array(Id).min(1),
    tables: SqlTablesSchema,
    outputColumns: z.array(Name).min(1).max(8),
    ordered: z.boolean(),
    starter: SqlQuerySchema,
    hints: z.array(z.string().min(1).max(500)).min(1).max(3),
    correction: z.string().min(1).max(650),
    solution: SqlQuerySchema.min(1),
    explanation: z.string().min(1).max(1000),
    cases: z
      .array(z.object({ tables: SqlTablesSchema, expected: SqlResultSchema }).strict())
      .min(3)
      .max(5),
  })
  .strict()
  .superRefine((t, ctx) => {
    if (
      new Set(t.outputColumns).size !== t.outputColumns.length ||
      JSON.stringify(t.tables) !== JSON.stringify(t.cases[0]?.tables) ||
      t.cases.some((c) => JSON.stringify(c.expected.columns) !== JSON.stringify(t.outputColumns))
    )
      ctx.addIssue({
        code: "custom",
        message: "The first case must be visible, with the requested result columns in every case.",
      });
    const schema = (tables: z.infer<typeof SqlTablesSchema>) =>
      JSON.stringify(tables.map((v) => [v.name, v.columns]));
    if (t.cases.some((c) => schema(c.tables) !== schema(t.tables)))
      ctx.addIssue({ code: "custom", message: "All cases must use the displayed table schemas." });
  });
export const SqlProjectDefinitionSchema = z
  .object({
    id: Id,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(700),
    tasks: z.array(SqlTaskSchema).min(1).max(15),
  })
  .strict();
export const SqlProjectCollectionSchema = z
  .object({
    courseId: Id,
    projects: z.array(SqlProjectDefinitionSchema).min(1).max(10),
  })
  .strict()
  .superRefine((c, ctx) => {
    const ids = c.projects.map((p) => p.id);
    const tasks = c.projects.flatMap((p) => p.tasks.map((t) => t.id));
    if (new Set(ids).size !== ids.length || new Set(tasks).size !== tasks.length)
      ctx.addIssue({ code: "custom", message: "Project and task identifiers must be unique." });
  });
export type SqlTable = z.infer<typeof SqlTableSchema>;
export type SqlResult = z.infer<typeof SqlResultSchema>;
export type SqlTask = z.infer<typeof SqlTaskSchema>;
export type SqlProjectDefinition = z.infer<typeof SqlProjectDefinitionSchema>;
export type SqlProjectCollection = z.infer<typeof SqlProjectCollectionSchema>;

export const SqlProjectSummarySchema = z
  .object({
    id: Id,
    courseId: Id,
    title: z.string(),
    description: z.string(),
    taskCount: z.number().int(),
    completed: z.number().int(),
    sessionId: z.string().uuid().optional(),
    mode: TutoringModeSchema.optional(),
    finished: z.boolean(),
  })
  .strict();
export const SqlProjectsResponseSchema = z
  .object({ projects: z.array(SqlProjectSummarySchema) })
  .strict();
export const SqlPublicTaskSchema = z
  .object({
    id: Id,
    title: z.string(),
    prompt: z.string(),
    lessonId: Id,
    tables: SqlTablesSchema,
    outputColumns: z.array(Name),
    ordered: z.boolean(),
    query: SqlQuerySchema,
    hints: z.array(z.string()),
    hintsRemaining: z.number().int(),
    assisted: z.boolean(),
    canContinue: z.boolean(),
    locked: z.boolean(),
    result: SqlResultSchema.optional(),
    error: z.string().optional(),
    feedback: z.object({ correct: z.boolean(), message: z.string() }).strict().optional(),
    solution: z.object({ query: z.string(), explanation: z.string() }).strict().optional(),
  })
  .strict();
export const SqlProjectSessionSchema = z
  .object({
    id: z.string().uuid(),
    courseId: Id,
    projectId: Id,
    title: z.string(),
    mode: TutoringModeSchema,
    revision: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    xp: z.number().int().nonnegative(),
    current: SqlPublicTaskSchema.optional(),
    results: z
      .array(
        z
          .object({
            id: Id,
            title: z.string(),
            lessonId: Id,
            query: SqlQuerySchema,
            correct: z.boolean(),
            independent: z.boolean(),
            firstCorrect: z.boolean(),
            solution: z.string(),
            explanation: z.string(),
          })
          .strict(),
      )
      .optional(),
    reveal: z
      .object({ token: z.string().uuid(), availableAt: z.string().datetime() })
      .strict()
      .optional(),
  })
  .strict();
export type SqlProjectSession = z.infer<typeof SqlProjectSessionSchema>;
export type SqlProjectSummary = z.infer<typeof SqlProjectSummarySchema>;
export const SqlProjectStartSchema = z.object({ mode: TutoringModeSchema }).strict();
export const SqlProjectActionSchema = z
  .object({
    taskId: Id,
    revision: z.number().int().nonnegative(),
    requestId: z.string().uuid(),
    action: z.enum([
      "save",
      "run",
      "check",
      "hint",
      "next",
      "reveal_start",
      "reveal_confirm",
      "finish",
    ]),
    query: SqlQuerySchema.optional(),
    reason: z.string().trim().min(1).max(500).optional(),
    token: z.string().uuid().optional(),
    confirmation: z.string().max(80).optional(),
  })
  .strict();
export type SqlProjectAction = z.infer<typeof SqlProjectActionSchema>;
