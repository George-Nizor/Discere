import { z } from "zod";
import { TutoringModeSchema } from "./modes.js";

/**
 * Rust practice: the playground, lesson programs and graded projects. Learner code is compiled
 * and run by the server in a sandbox (ADR 0006). Expected results and reference programs never
 * leave the server; a check prints values that the server compares.
 */
export const RustCodeSchema = z.string().max(16000);
export const RustStdinSchema = z.string().max(4000);

export const RustRunRequestSchema = z
  .object({ code: RustCodeSchema.min(1), stdin: RustStdinSchema.optional() })
  .strict();
export type RustRunRequest = z.infer<typeof RustRunRequestSchema>;

/** One compile-and-run. `diagnostics` is rustc's own text, with paths reduced to main.rs. */
export const RustRunResultSchema = z
  .object({
    status: z.enum(["ok", "compile_error", "runtime_error", "limit", "unavailable"]),
    diagnostics: z.string().max(12000),
    stdout: z.string().max(8000),
    stderr: z.string().max(4000),
    exitCode: z.number().int().nullable(),
    message: z.string().max(500).optional(),
  })
  .strict();
export type RustRunResult = z.infer<typeof RustRunResultSchema>;

export const RustStatusSchema = z
  .object({ ready: z.boolean(), version: z.string().optional(), message: z.string().optional() })
  .strict();
export type RustStatus = z.infer<typeof RustStatusSchema>;

/** A reviewed lesson program: the code and what rustc 1.93.1 actually did with it. */
export const RustDiagramSchema = z
  .object({
    type: z.literal("rust_program"),
    runtime: z.string().min(1).max(100),
    code: z.string().min(1).max(4000),
    outcome: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("output"), stdout: z.string().max(4000) }).strict(),
      z
        .object({ kind: z.literal("compile_error"), diagnostics: z.string().min(1).max(6000) })
        .strict(),
    ]),
  })
  .strict();
export type RustDiagram = z.infer<typeof RustDiagramSchema>;

const Id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9][a-z0-9-]*$/);
const RustIdent = z.string().regex(/^[a-z_][a-z0-9_]{0,39}$/);
/** A Rust type as written in a signature, kept to simple forms a beginner course uses. */
const RustType = z.string().regex(/^[A-Za-z0-9_&<>, \[\]();']{1,60}$/);

export const RustCallSchema = z
  .object({
    name: RustIdent,
    parameters: z.array(z.object({ name: RustIdent, type: RustType }).strict()).max(6),
    returns: RustType,
  })
  .strict();
export type RustCall = z.infer<typeof RustCallSchema>;

/**
 * A program task feeds `stdin` and compares printed text. A function task calls the learner's
 * function with Rust expressions as arguments and compares the `{:?}` form of what it returns.
 */
export const RustCaseSchema = z
  .object({
    stdin: RustStdinSchema.optional(),
    arguments: z.array(z.string().min(1).max(400)).max(6).optional(),
    expected: z.string().max(4000),
  })
  .strict();
export const RustTaskSchema = z
  .object({
    id: Id,
    title: z.string().min(1).max(120),
    prompt: z.string().min(1).max(1800),
    lessonId: Id,
    conceptIds: z.array(Id).min(1),
    sourceIds: z.array(Id).min(1),
    kind: z.enum(["program", "function"]),
    call: RustCallSchema.optional(),
    starter: RustCodeSchema,
    hints: z.array(z.string().min(1).max(500)).min(1).max(3),
    correction: z.string().min(1).max(650),
    solution: RustCodeSchema.min(1),
    explanation: z.string().min(1).max(1000),
    cases: z.array(RustCaseSchema).min(3).max(5),
  })
  .strict()
  .superRefine((task, ctx) => {
    if (task.kind === "function") {
      if (!task.call)
        ctx.addIssue({ code: "custom", message: "A function task names its function." });
      if (task.cases.some((c) => c.arguments?.length !== task.call?.parameters.length))
        ctx.addIssue({ code: "custom", message: "Every case supplies each parameter." });
    } else if (task.call || task.cases.some((c) => c.arguments))
      ctx.addIssue({ code: "custom", message: "A program task reads stdin, not arguments." });
    if (new Set(task.cases.map((c) => JSON.stringify([c.stdin, c.arguments]))).size !== task.cases.length)
      ctx.addIssue({ code: "custom", message: "Each case needs different input." });
  });
export type RustCase = z.infer<typeof RustCaseSchema>;

/**
 * The public half of a lesson question answered by writing code: what the learner starts from
 * and the one example they can see. The hidden cases (`Question.codeCases`) and the worked
 * program never leave the server.
 */
export const CodeExerciseSchema = z
  .object({
    language: z.literal("rust"),
    kind: z.enum(["program", "function"]),
    starter: RustCodeSchema,
    call: RustCallSchema.optional(),
    example: RustCaseSchema,
  })
  .strict();
export type CodeExercise = z.infer<typeof CodeExerciseSchema>;

export const RustProjectDefinitionSchema = z
  .object({
    id: Id,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(700),
    tasks: z.array(RustTaskSchema).min(1).max(15),
  })
  .strict();
export const RustProjectCollectionSchema = z
  .object({
    courseId: Id,
    projects: z.array(RustProjectDefinitionSchema).min(1).max(12),
  })
  .strict()
  .superRefine((collection, ctx) => {
    const projectIds = collection.projects.map((p) => p.id);
    const taskIds = collection.projects.flatMap((p) => p.tasks.map((t) => t.id));
    if (new Set(projectIds).size !== projectIds.length || new Set(taskIds).size !== taskIds.length)
      ctx.addIssue({ code: "custom", message: "Project and task identifiers must be distinct." });
  });
export const RustProjectStartSchema = z.object({ mode: TutoringModeSchema }).strict();
export const RustProjectActionSchema = z
  .object({
    requestId: z.string().uuid(),
    taskId: Id,
    revision: z.number().int().nonnegative(),
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
    code: RustCodeSchema.optional(),
    reason: z.string().trim().min(3).max(500).optional(),
    token: z.string().uuid().optional(),
    confirmation: z.string().max(40).optional(),
  })
  .strict();
export const RustProjectsResponseSchema = z
  .object({
    projects: z.array(
      z
        .object({
          id: Id,
          courseId: Id,
          title: z.string(),
          description: z.string(),
          taskCount: z.number().int().positive(),
          completed: z.number().int().nonnegative(),
          finished: z.boolean(),
          sessionId: z.string().uuid().optional(),
          mode: TutoringModeSchema.optional(),
        })
        .strict(),
    ),
  })
  .strict();
/** The last run or check of the current task, as the learner sees it. */
export const RustTaskRunSchema = z
  .object({
    status: RustRunResultSchema.shape.status,
    diagnostics: z.string(),
    stdout: z.string(),
    stderr: z.string(),
    /** Function tasks: the `{:?}` form of the visible case's return value. */
    returned: z.string().optional(),
    message: z.string().optional(),
    /** Check only: how many cases passed, without saying which hidden ones failed. */
    passed: z.number().int().nonnegative().optional(),
    total: z.number().int().positive().optional(),
  })
  .strict();
export type RustTaskRun = z.infer<typeof RustTaskRunSchema>;
export const RustProjectSessionSchema = z
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
    current: z
      .object({
        id: Id,
        title: z.string(),
        prompt: z.string(),
        lessonId: Id,
        kind: z.enum(["program", "function"]),
        call: RustCallSchema.optional(),
        /** The visible case: its stdin, or the argument expressions, and the expected value. */
        example: z
          .object({
            stdin: z.string().optional(),
            arguments: z.array(z.string()).optional(),
            expected: z.string(),
          })
          .strict(),
        code: RustCodeSchema,
        hints: z.array(z.string()),
        hintsRemaining: z.number().int().nonnegative(),
        assisted: z.boolean(),
        locked: z.boolean(),
        canContinue: z.boolean(),
        run: RustTaskRunSchema.optional(),
        feedback: z.object({ correct: z.boolean(), message: z.string() }).strict().optional(),
        solution: z.object({ code: RustCodeSchema, explanation: z.string() }).strict().optional(),
      })
      .strict()
      .optional(),
    reveal: z
      .object({ token: z.string().uuid(), availableAt: z.string().datetime() })
      .strict()
      .optional(),
    results: z
      .array(
        z
          .object({
            id: Id,
            title: z.string(),
            lessonId: Id,
            code: RustCodeSchema,
            correct: z.boolean(),
            independent: z.boolean(),
            firstCorrect: z.boolean(),
            solution: RustCodeSchema,
            explanation: z.string(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
export type RustTask = z.infer<typeof RustTaskSchema>;
export type RustProjectDefinition = z.infer<typeof RustProjectDefinitionSchema>;
export type RustProjectCollection = z.infer<typeof RustProjectCollectionSchema>;
export type RustProjectAction = z.infer<typeof RustProjectActionSchema>;
export type RustProjectSession = z.infer<typeof RustProjectSessionSchema>;
export type RustProjectsResponse = z.infer<typeof RustProjectsResponseSchema>;
