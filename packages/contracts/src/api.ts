import { z } from "zod";
import {
  ActivitySchema,
  ConceptSchema,
  LearnerQuestionSchema,
  LessonBeatSchema,
  SourceSchema,
} from "./curriculum.js";
import {
  CourseSummarySchema,
  JourneyProgressSchema,
  LessonJourneySchema,
  StageProgressRequestSchema,
} from "./journey.js";
import { ConceptStateSchema, TutoringModeSchema } from "./modes.js";

export const ConceptProgressSchema = z
  .object({
    conceptId: z.string().min(1),
    /** The authored concept title, so no screen has to humanise an identifier. */
    title: z.string().min(1),
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
        /** The course the lesson belongs to, so the home screen continues the right one. */
        courseId: z.string().min(1),
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
    activity: ActivitySchema,
    question: LearnerQuestionSchema,
    sources: z.array(SourceSchema),
  })
  .strict();
export type LessonResponse = z.infer<typeof LessonResponseSchema>;

export const CourseListResponseSchema = z
  .object({ courses: z.array(CourseSummarySchema).min(1) })
  .strict();
export type CourseListResponse = z.infer<typeof CourseListResponseSchema>;

export const CourseLessonSummarySchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    orientation: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    available: z.boolean(),
    stageCount: z.number().int().nonnegative(),
  })
  .strict();
export type CourseLessonSummary = z.infer<typeof CourseLessonSummarySchema>;

/** A concept as the course page names it, so no screen has to humanise an identifier. */
export const CourseConceptSummarySchema = ConceptSchema.pick({
  id: true,
  title: true,
  summary: true,
}).strict();
export type CourseConceptSummary = z.infer<typeof CourseConceptSummarySchema>;

export const CourseDetailResponseSchema = z
  .object({
    course: CourseSummarySchema,
    lessons: z.array(CourseLessonSummarySchema).min(1),
    concepts: z.array(CourseConceptSummarySchema).min(1),
  })
  .strict();
export type CourseDetailResponse = z.infer<typeof CourseDetailResponseSchema>;

export const JourneyResponseSchema = LessonJourneySchema;
export type JourneyResponse = z.infer<typeof JourneyResponseSchema>;

export const JourneyProgressResponseSchema = JourneyProgressSchema;
export type JourneyProgressResponse = z.infer<typeof JourneyProgressResponseSchema>;

export const StageProgressUpdateSchema = StageProgressRequestSchema;
export type StageProgressUpdate = z.infer<typeof StageProgressUpdateSchema>;

export const EssayDraftResponseSchema = z
  .object({
    essayId: z.string().min(1),
    content: z.string().max(100_000),
    wordCount: z.number().int().nonnegative(),
    submitted: z.boolean(),
    updatedAt: z.string().datetime().nullable(),
  })
  .strict();
export type EssayDraftResponse = z.infer<typeof EssayDraftResponseSchema>;

export const EssaySaveRequestSchema = z.object({ content: z.string().max(100_000) }).strict();
export type EssaySaveRequest = z.infer<typeof EssaySaveRequestSchema>;

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

export const EssaySubmitResponseSchema = z
  .object({
    essayId: z.string().min(1),
    submitted: z.literal(true),
    wordCount: z.number().int().nonnegative(),
    feedback: z.string().min(1),
    /**
     * Advisory style observations about the learner's own prose. The writing gate stays
     * mandatory for generated text; a learner's submission is never rejected for style.
     */
    styleNotes: z.array(StyleViolationSchema).default([]),
  })
  .strict();
export type EssaySubmitResponse = z.infer<typeof EssaySubmitResponseSchema>;

export const ReviewRatingSchema = z.enum(["again", "hard", "good", "easy"]);
export type ReviewRating = z.infer<typeof ReviewRatingSchema>;

export const ReviewCardFrontSchema = z
  .object({
    cardId: z.string().min(1),
    questionId: z.string().min(1),
    front: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    revealed: z.literal(false),
  })
  .strict();
export type ReviewCardFront = z.infer<typeof ReviewCardFrontSchema>;

export const ReviewSessionResponseSchema = z
  .object({
    sessionId: z.string().uuid(),
    card: ReviewCardFrontSchema,
    rated: z.boolean(),
  })
  .strict();
export type ReviewSessionResponse = z.infer<typeof ReviewSessionResponseSchema>;

export const ReviewRevealResponseSchema = z
  .object({
    sessionId: z.string().uuid(),
    cardId: z.string().min(1),
    back: z.string().min(1),
    sourceIds: z.array(z.string()),
  })
  .strict();
export type ReviewRevealResponse = z.infer<typeof ReviewRevealResponseSchema>;

export const ReviewRateRequestSchema = z
  .object({ rating: ReviewRatingSchema, recalled: z.boolean() })
  .strict();
export type ReviewRateRequest = z.infer<typeof ReviewRateRequestSchema>;

export const ReviewRateResponseSchema = z
  .object({
    sessionId: z.string().uuid(),
    rating: ReviewRatingSchema,
    evidence: z.enum(["independent", "assisted"]),
    dueAt: z.string().datetime(),
    intervalDays: z.number().positive(),
    repetition: z.number().int().nonnegative(),
  })
  .strict();
export type ReviewRateResponse = z.infer<typeof ReviewRateResponseSchema>;

export const ReviewHomeResponseSchema = z
  .object({
    dueCount: z.number().int().nonnegative(),
    estimatedMinutes: z.number().int().nonnegative(),
  })
  .strict();
export type ReviewHomeResponse = z.infer<typeof ReviewHomeResponseSchema>;

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
  .object({ answer: z.string().min(1), transferPrompt: z.string().min(1).nullable() })
  .strict();
export type RevealConfirmResponse = z.infer<typeof RevealConfirmResponseSchema>;

export const TransferChallengeSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    responseType: z.literal("numeric"),
    expectedUnit: z.string().min(1),
  })
  .strict();
export type TransferChallenge = z.infer<typeof TransferChallengeSchema>;

export const TransferStateResponseSchema = z
  .object({
    challenge: TransferChallengeSchema,
    completed: z.boolean(),
    lastCorrect: z.boolean().nullable(),
    feedback: z.string().nullable(),
  })
  .strict();
export type TransferStateResponse = z.infer<typeof TransferStateResponseSchema>;

export const TransferSubmitRequestSchema = z
  .object({
    transferId: z.string().min(1),
    response: z.string().trim().min(1).max(20_000),
  })
  .strict();
export type TransferSubmitRequest = z.infer<typeof TransferSubmitRequestSchema>;

export const TransferSubmitResponseSchema = z
  .object({
    correct: z.boolean(),
    feedback: z.string().min(1),
    xpAwarded: z.number().int().nonnegative(),
    mastery: z.number().min(0).max(1),
    completed: z.boolean(),
  })
  .strict();
export type TransferSubmitResponse = z.infer<typeof TransferSubmitResponseSchema>;

export const WritingLintRequestSchema = z
  .object({
    text: z.string().max(100_000),
    context: z.enum(["lesson", "question", "hint", "feedback", "assessment"]).default("lesson"),
    hiddenAnswer: z.string().optional(),
  })
  .strict();

export const WritingLintResponseSchema = z
  .object({
    passed: z.boolean(),
    violations: z.array(StyleViolationSchema),
    metrics: z
      .object({
        words: z.number().int().nonnegative(),
        sentences: z.number().int().nonnegative(),
        headings: z.number().int().nonnegative(),
        emDashes: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();
export type WritingLintResponse = z.infer<typeof WritingLintResponseSchema>;
