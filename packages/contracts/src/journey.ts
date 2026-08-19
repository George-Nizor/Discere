import { z } from "zod";
import {
  ActivitySchema,
  ExplainerVisualKindSchema,
  LearnerQuestionSchema,
  LessonStepKindSchema,
  RichTextBlockSchema,
  SourceSchema,
} from "./curriculum.js";

export const JourneyStageTypeSchema = z.enum([
  "explainer",
  "interactive_visual",
  "quiz",
  "essay",
  "review",
  "completion",
]);
export type JourneyStageType = z.infer<typeof JourneyStageTypeSchema>;

export const StageCompletionPolicySchema = z.enum([
  "view",
  "interaction",
  "submission",
  "assessment",
]);
export type StageCompletionPolicy = z.infer<typeof StageCompletionPolicySchema>;

export const StageStateSchema = z.enum([
  "available",
  "active",
  "completed",
  "skipped_optional",
  "locked",
]);
export type StageState = z.infer<typeof StageStateSchema>;

const StageBaseSchema = z
  .object({
    id: z.string().min(1),
    type: JourneyStageTypeSchema,
    title: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    sourceIds: z.array(z.string()),
    optional: z.boolean(),
    completionPolicy: StageCompletionPolicySchema,
  })
  .strict();

/**
 * A retrieved picture as the learner receives it: a served path plus the attribution the
 * interface must print beside it. Nothing here identifies a file on the authoring machine.
 */
export const StageImageSchema = z
  .object({
    src: z.string().min(1),
    caption: z.string().min(1),
    attribution: z.string().min(1),
    licence: z.string().min(1),
    licenceUrl: z.string().url().optional(),
    landingPageUrl: z.string().url(),
  })
  .strict();
export type StageImage = z.infer<typeof StageImageSchema>;

/**
 * A step as the learner receives it. The authored step names a question by id; this carries the
 * question itself, already stripped of its answer authority and transfer task exactly as the
 * quiz stages are, so the answer never leaves the server before it is earned.
 */
export const LearnerStepSchema = z
  .object({
    id: z.string().min(1),
    kind: LessonStepKindSchema,
    blocks: z.array(RichTextBlockSchema).min(1),
    visualStateId: z.string(),
    /** Present on `check` and `transfer` steps. */
    question: LearnerQuestionSchema.optional(),
    /** Present on `interact` steps. */
    activity: ActivitySchema.optional(),
  })
  .strict();
export type LearnerStep = z.infer<typeof LearnerStepSchema>;

export const ExplainerStageSchema = StageBaseSchema.extend({
  type: z.literal("explainer"),
  steps: z.array(LearnerStepSchema).min(1),
  visual: z
    .object({
      kind: ExplainerVisualKindSchema,
      briefId: z.string().optional(),
      alt: z.string().min(1),
      /** Served path for a visual the interface can draw. Absent means "describe it instead". */
      src: z.string().min(1).optional(),
      image: StageImageSchema.optional(),
    })
    .strict(),
}).strict();
export type ExplainerStage = z.infer<typeof ExplainerStageSchema>;

export const InteractiveVisualStageSchema = StageBaseSchema.extend({
  type: z.literal("interactive_visual"),
  activity: ActivitySchema,
  prompt: z.string().min(1),
  visualKind: z.enum(["circuit", "graph", "timeline", "map"]),
}).strict();
export type InteractiveVisualStage = z.infer<typeof InteractiveVisualStageSchema>;

export const QuizStageSchema = StageBaseSchema.extend({
  type: z.literal("quiz"),
  questionId: z.string().min(1),
  question: LearnerQuestionSchema,
  /** One-based position of this question among the lesson's quiz stages. */
  questionIndex: z.number().int().positive(),
  questionCount: z.number().int().positive(),
}).strict();
export type QuizStage = z.infer<typeof QuizStageSchema>;

export const EssayStageSchema = StageBaseSchema.extend({
  type: z.literal("essay"),
  essayId: z.string().min(1),
  prompt: z.string().min(1),
  expectedScope: z.string().min(1),
  successCriteria: z.array(z.string().min(1)).min(1),
  minWords: z.number().int().nonnegative(),
}).strict();
export type EssayStage = z.infer<typeof EssayStageSchema>;

export const ReviewStageSchema = StageBaseSchema.extend({
  type: z.literal("review"),
  reviewLabel: z.string().min(1),
  itemCount: z.number().int().positive(),
  concepts: z.array(z.string().min(1)).min(1),
}).strict();
export type ReviewStage = z.infer<typeof ReviewStageSchema>;

export const CompletionStageSchema = StageBaseSchema.extend({
  type: z.literal("completion"),
  concepts: z.array(z.string().min(1)).min(1),
  nextAction: z.string().min(1),
}).strict();
export type CompletionStage = z.infer<typeof CompletionStageSchema>;

export const LearnerStageSchema = z.discriminatedUnion("type", [
  ExplainerStageSchema,
  InteractiveVisualStageSchema,
  QuizStageSchema,
  EssayStageSchema,
  ReviewStageSchema,
  CompletionStageSchema,
]);
export type LearnerStage = z.infer<typeof LearnerStageSchema>;

export const LessonJourneySchema = z
  .object({
    id: z.string().min(1),
    courseId: z.string().min(1),
    lessonId: z.string().min(1),
    title: z.string().min(1),
    estimatedMinutes: z.number().int().positive(),
    conceptIds: z.array(z.string()).min(1),
    stageOrder: z.array(z.string().min(1)).min(1),
    stages: z.array(LearnerStageSchema).min(1),
    sources: z.array(SourceSchema),
  })
  .strict();
export type LessonJourney = z.infer<typeof LessonJourneySchema>;

export const StageProgressSchema = z
  .object({
    stageId: z.string().min(1),
    state: StageStateSchema,
    interactionState: z.record(z.string(), z.unknown()).default({}),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type StageProgress = z.infer<typeof StageProgressSchema>;

export const JourneyProgressSchema = z
  .object({
    journeyId: z.string().min(1),
    activeStageId: z.string().min(1),
    stages: z.array(StageProgressSchema),
  })
  .strict();
export type JourneyProgress = z.infer<typeof JourneyProgressSchema>;

export const StageProgressRequestSchema = z
  .object({
    stageId: z.string().min(1),
    state: StageStateSchema,
    interactionState: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
export type StageProgressRequest = z.infer<typeof StageProgressRequestSchema>;

export const CourseSummarySchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    lessonCount: z.number().int().positive(),
    availableLessonIds: z.array(z.string().min(1)),
    /** Most recent stage activity in this course, used to choose what to continue. */
    lastActiveAt: z.string().datetime().nullable(),
    /** Identity colour for this course, as a CSS hex. */
    accent: z.string().min(1),
    /** Same-origin URL for the cover art, or empty when the course has none. */
    coverUrl: z.string(),
    status: z.enum(["available", "coming_soon"]),
    /** Lessons the learner has finished every stage of, for the catalogue progress ring. */
    completedLessonCount: z.number().int().nonnegative(),
  })
  .strict();
export type CourseSummary = z.infer<typeof CourseSummarySchema>;
