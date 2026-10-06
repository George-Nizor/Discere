import { z } from "zod";
import { TutoringModeSchema } from "./modes.js";

export type PythonValue =
  | string
  | number
  | boolean
  | null
  | PythonValue[]
  | { [key: string]: PythonValue };
const value: z.ZodType<PythonValue> = z.lazy(() =>
  z.union([
    z.string().max(2000),
    z.number().finite().min(-1e15).max(1e15),
    z.boolean(),
    z.null(),
    z.array(value).max(200),
    z.record(z.string().min(1).max(120), value),
  ]),
);
export const PythonValueSchema = value.superRefine((input, ctx) => {
  const pending: { value: PythonValue; depth: number }[] = [{ value: input, depth: 0 }];
  let nodes = 0;
  while (pending.length) {
    const item = pending.pop()!;
    nodes += 1;
    if (nodes > 2000 || item.depth > 6) {
      ctx.addIssue({
        code: "custom",
        message: "Keep the result within 2,000 values and six nested levels.",
      });
      return;
    }
    if (item.value !== null && typeof item.value === "object")
      for (const child of Object.values(item.value))
        pending.push({ value: child, depth: item.depth + 1 });
  }
});
export const PythonInputsSchema = z
  .record(z.string().regex(/^[a-z][a-z0-9_]{0,39}$/), PythonValueSchema)
  .superRefine((input, ctx) => {
    if (Object.keys(input).length > 12 || "result" in input || JSON.stringify(input).length > 60000)
      ctx.addIssue({
        code: "custom",
        message: "Use at most twelve bounded input variables; result belongs to the learner.",
      });
  });
export const PythonCodeSchema = z.string().max(16000);
export const PythonCallSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
    arguments: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,39}$/)).max(6),
  })
  .strict();
export type PythonCall = z.infer<typeof PythonCallSchema>;
export const PythonExecutionSchema = z.union([
  z
    .object({
      result: PythonValueSchema,
      output: z.string().max(8000),
    })
    .strict(),
  z
    .object({
      error: z.enum(["code", "limit", "runtime"]),
      message: z.string().min(1).max(500),
      output: z.string().max(8000).optional(),
    })
    .strict(),
]);
export type PythonInputs = z.infer<typeof PythonInputsSchema>;
export type PythonExecution = z.infer<typeof PythonExecutionSchema>;

const Id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9][a-z0-9-]*$/);
export const PythonTaskSchema = z
  .object({
    id: Id,
    title: z.string().min(1).max(120),
    prompt: z.string().min(1).max(1800),
    lessonId: Id,
    conceptIds: z.array(Id).min(1),
    sourceIds: z.array(Id).min(1),
    inputs: PythonInputsSchema,
    call: PythonCallSchema.optional(),
    starter: PythonCodeSchema,
    hints: z.array(z.string().min(1).max(500)).min(1).max(3),
    correction: z.string().min(1).max(650),
    solution: PythonCodeSchema.min(1),
    explanation: z.string().min(1).max(1000),
    cases: z
      .array(z.object({ inputs: PythonInputsSchema, expected: PythonValueSchema }).strict())
      .min(3)
      .max(5),
  })
  .strict()
  .superRefine((task, ctx) => {
    if (task.call?.arguments.some((name) => !(name in task.inputs)))
      ctx.addIssue({
        code: "custom",
        message: "A function call must use supplied input variables.",
      });
    if (
      JSON.stringify(task.inputs) !== JSON.stringify(task.cases[0]?.inputs) ||
      task.cases.some(
        (c) =>
          JSON.stringify(Object.keys(c.inputs).sort()) !==
          JSON.stringify(Object.keys(task.inputs).sort()),
      )
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Every case must use the displayed input variable names; the first case is visible.",
      });
  });
export const PythonProjectDefinitionSchema = z
  .object({
    id: Id,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(700),
    tasks: z.array(PythonTaskSchema).min(1).max(15),
  })
  .strict();
export const PythonProjectCollectionSchema = z
  .object({
    courseId: Id,
    projects: z.array(PythonProjectDefinitionSchema).min(1).max(12),
  })
  .strict()
  .superRefine((collection, ctx) => {
    const projectIds = collection.projects.map((p) => p.id);
    const taskIds = collection.projects.flatMap((p) => p.tasks.map((t) => t.id));
    if (new Set(projectIds).size !== projectIds.length || new Set(taskIds).size !== taskIds.length)
      ctx.addIssue({ code: "custom", message: "Project and task identifiers must be distinct." });
  });
export const PythonProjectStartSchema = z.object({ mode: TutoringModeSchema }).strict();
export const PythonProjectActionSchema = z
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
    code: PythonCodeSchema.optional(),
    reason: z.string().trim().min(3).max(500).optional(),
    token: z.string().uuid().optional(),
    confirmation: z.string().max(40).optional(),
  })
  .strict();
export const PythonProjectsResponseSchema = z
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
export const PythonProjectSessionSchema = z
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
        inputs: PythonInputsSchema,
        call: PythonCallSchema.optional(),
        code: PythonCodeSchema,
        hints: z.array(z.string()),
        hintsRemaining: z.number().int().nonnegative(),
        assisted: z.boolean(),
        locked: z.boolean(),
        canContinue: z.boolean(),
        result: PythonValueSchema.optional(),
        output: z.string().max(8000).optional(),
        error: z.string().optional(),
        feedback: z.object({ correct: z.boolean(), message: z.string() }).strict().optional(),
        solution: z.object({ code: PythonCodeSchema, explanation: z.string() }).strict().optional(),
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
            code: PythonCodeSchema,
            correct: z.boolean(),
            independent: z.boolean(),
            firstCorrect: z.boolean(),
            solution: PythonCodeSchema,
            explanation: z.string(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
export type PythonTask = z.infer<typeof PythonTaskSchema>;
export type PythonProjectDefinition = z.infer<typeof PythonProjectDefinitionSchema>;
export type PythonProjectCollection = z.infer<typeof PythonProjectCollectionSchema>;
export type PythonProjectAction = z.infer<typeof PythonProjectActionSchema>;
export type PythonProjectSession = z.infer<typeof PythonProjectSessionSchema>;
export type PythonProjectsResponse = z.infer<typeof PythonProjectsResponseSchema>;
