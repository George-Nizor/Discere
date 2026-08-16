import { z } from "zod";
import { LearnerQuestionSchema, LessonBeatSchema, OhmsLawActivitySchema, SourceSchema } from "./curriculum.js";
import { ConceptStateSchema, TutoringModeSchema } from "./modes.js";

export const ConceptProgressSchema = z
  .object({
    conceptId: z.string().min(1),
    state: ConceptStateSchema,
    mastery: z.number().min(0).max(1),
    independentAttempts: z.number().int().nonnegative(),
    assistedAttempts: z.number().int().nonnegative(),
  })
  .strict();

export type ConceptProgress = z.infer<typeof ConceptProgressSchema>;

export const HomeResponseSchema = z
  .object({
    learnerName: z.string().min(1),
    xp: z.number().int().nonnegative(),
    streakDays: z.number().int().nonnegative(),
    currentMission: z
      .object({
        id: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
        estimatedMinutes: z.number().int().positive(),
        lessonBeatId: z.string().min(1),
      })
      .strict(),
    progress: z.array(ConceptProgressSchema),
  })
  .strict();
export type HomeResponse = z.infer<typeof HomeResponseSchema>;

export const LessonResponseSchema = z
  .object({
    lesson: LessonBeatSchema,
    activity: OhmsLawActivitySchema,
    question: LearnerQuestionSchema,
    sources: z.array(SourceSchema),
  })
  .strict();
export type LessonResponse = z.infer<typeof LessonResponseSchema>;

export const AttemptRequestSchema = z
  .object({
    questionId: z.string().min(1),
    response: z.string().min(1).max(20_000),
    mode: TutoringModeSchema,
  })
  .strict();
export type AttemptRequest = z.infer<typeof AttemptRequestSchema>;

export const AttemptResponseSchema = z
  .object({
    attemptId: z.string().uuid(),
    correct: z.boolean(),
    feedback: z.string().min(1),
    xpAwarded: z.number().int().nonnegative(),
    mastery: z.number().min(0).max(1),
    independent: z.boolean(),
  })
  .strict();
export type AttemptResponse = z.infer<typeof AttemptResponseSchema>;

export const HintResponseSchema = z
  .object({
    hint: z.string().min(1),
    level: z.number().int().positive(),
    remaining: z.number().int().nonnegative(),
  })
  .strict();
export type HintResponse = z.infer<typeof HintResponseSchema>;

export const RevealStartRequestSchema = z
  .object({ reason: z.string().trim().min(8).max(240) })
  .strict();

export const RevealStartResponseSchema = z
  .object({
    token: z.string().uuid(),
    availableAt: z.string().datetime(),
    confirmationPhrase: z.literal("show answer"),
  })
  .strict();
export type RevealStartResponse = z.infer<typeof RevealStartResponseSchema>;

export const RevealConfirmRequestSchema = z
  .object({ token: z.string().uuid(), confirmation: z.string() })
  .strict();

export const RevealConfirmResponseSchema = z
  .object({ answer: z.string().min(1), transferPrompt: z.string().min(1) })
  .strict();
export type RevealConfirmResponse = z.infer<typeof RevealConfirmResponseSchema>;

export const WritingLintRequestSchema = z
  .object({
    text: z.string().max(100_000),
    context: z.enum(["lesson", "question", "hint", "feedback", "assessment"]).default("lesson"),
    hiddenAnswer: z.string().optional(),
  })
  .strict();

export const StyleViolationSchema = z
  .object({
    ruleId: z.string().min(1),
    severity: z.enum(["hard", "warning"]),
    category: z.string().min(1),
    message: z.string().min(1),
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
    excerpt: z.string(),
  })
  .strict();

export type StyleViolation = z.infer<typeof StyleViolationSchema>;

export const WritingLintResponseSchema = z
  .object({
    passed: z.boolean(),
    violations: z.array(StyleViolationSchema),
    metrics: z.object({
      words: z.number().int().nonnegative(),
      sentences: z.number().int().nonnegative(),
      headings: z.number().int().nonnegative(),
      emDashes: z.number().int().nonnegative(),
    }).strict(),
  })
  .strict();
export type WritingLintResponse = z.infer<typeof WritingLintResponseSchema>;
