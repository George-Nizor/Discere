import { z } from "zod";
import { LearnerQuestionSchema } from "./curriculum.js";
import { CourseCheckVisualSchema } from "./course-check-visual.js";

export const CheckConfidenceSchema = z.enum(["unsure", "partly", "sure"]);
export const CourseCheckResponseRequestSchema = z
  .object({
    questionId: z.string().min(1).max(240),
    response: z.string().trim().min(1).max(1000),
    confidence: CheckConfidenceSchema,
  })
  .strict();
export type CourseCheckResponseRequest = z.infer<typeof CourseCheckResponseRequestSchema>;
export const CourseCheckSummarySchema = z
  .object({
    id: z.string(),
    courseId: z.string(),
    courseTitle: z.string(),
    kind: z.enum(["placement", "checkpoint", "transfer"]),
    title: z.string(),
    description: z.string(),
    questionCount: z.number().int().positive(),
    status: z.enum(["available", "locked", "in_progress", "complete"]),
    sessionId: z.string().optional(),
    availableAt: z.string().datetime().optional(),
    remainingLessons: z.number().int().nonnegative(),
    correctCount: z.number().int().nonnegative().optional(),
  })
  .strict();
export type CourseCheckSummary = z.infer<typeof CourseCheckSummarySchema>;
export const CourseChecksResponseSchema = z
  .object({ checks: z.array(CourseCheckSummarySchema) })
  .strict();
const PublicItem = z
  .object({
    lessonId: z.string(),
    visual: CourseCheckVisualSchema,
    question: LearnerQuestionSchema,
  })
  .strict();
const ResultItem = PublicItem.extend({
  response: z.string(),
  confidence: CheckConfidenceSchema,
  correct: z.boolean(),
  explanation: z.string(),
}).strict();
export const CourseCheckSessionSchema = z
  .object({
    id: z.string(),
    courseId: z.string(),
    courseTitle: z.string(),
    checkId: z.string(),
    kind: z.enum(["placement", "checkpoint", "transfer"]),
    title: z.string(),
    description: z.string(),
    createdAt: z.string().datetime(),
    total: z.number().int().positive(),
    answered: z.number().int().nonnegative(),
    current: PublicItem.optional(),
    result: z
      .object({
        completedAt: z.string().datetime(),
        correct: z.number().int().nonnegative(),
        xp: z.number().int().nonnegative(),
        items: z.array(ResultItem),
        recommendedLessons: z.array(z.object({ id: z.string(), title: z.string() }).strict()),
        nextCheckAt: z.string().datetime().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type CourseCheckSession = z.infer<typeof CourseCheckSessionSchema>;
