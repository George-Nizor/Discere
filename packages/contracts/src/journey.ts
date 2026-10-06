import { z } from "zod";
import {
  CalculatorPolicySchema,
  ExplainerVisualKindSchema,
  LearnerActivitySchema,
  LearnerQuestionSchema,
  LessonStepKindSchema,
  RichTextBlockSchema,
  SourceSchema,
} from "./curriculum.js";
import { LearningDiagramSchema } from "./learning-diagram.js";
import { CircuitDiagramSpecSchema, VisualStateSchema } from "./visuals.js";

export const JourneyStageTypeSchema = z.enum([
  "explainer",
  "interactive_visual",
  "quiz",
  "essay",
  "review",
  "recap",
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
/** A worked-example line as the learner receives it: blanks carry their question, keyless. */
export const LearnerWorkedStepSchema = z
  .object({
    text: z.string().min(1),
    math: z.string().min(1).optional(),
    blank: LearnerQuestionSchema.optional(),
    selfExplain: LearnerQuestionSchema.optional(),
  })
  .strict();
export type LearnerWorkedStep = z.infer<typeof LearnerWorkedStepSchema>;

export const LearnerStepSchema = z
  .object({
    id: z.string().min(1),
    kind: LessonStepKindSchema,
    /**
     * Teaching shown before the learner acts. For a legacy question-led step this is the
     * authored prose with every sentence that would give the answer away held back for the
     * reveal; for a v2 step it is the authored `lead`. It may be empty.
     */
    blocks: z.array(RichTextBlockSchema),
    /** A small label above the step, never a headline. */
    eyebrow: z.string().min(1).optional(),
    /** v2 `explain`: the key idea, set as the screen's headline. */
    headline: z.string().min(1).optional(),
    workedSteps: z.array(LearnerWorkedStepSchema).optional(),
    answerVisibility: z.enum(["hidden-until-response", "live"]).optional(),
    calculator: CalculatorPolicySchema.optional(),
    visualStateId: z.string(),
    diagram: LearningDiagramSchema.optional(),
    /** Question-first steps fetch their explanation only after a recorded response. */
    questionLed: z.boolean().optional(),
    /** True when the step holds back teaching for after the response (shown with the verdict). */
    hasReveal: z.boolean().optional(),
    /** Present on `check` and `transfer` steps. */
    question: LearnerQuestionSchema.optional(),
    /** Present on `interact` steps. */
    activity: LearnerActivitySchema.optional(),
  })
  .strict();
export type LearnerStep = z.infer<typeof LearnerStepSchema>;

/** The v2 opener as the learner receives it. Its question, if any, carries no key. */
export const LearnerLessonIntroSchema = z
  .object({
    hook: z
      .object({
        blocks: z.array(RichTextBlockSchema).min(1),
        diagram: LearningDiagramSchema.optional(),
        question: LearnerQuestionSchema.optional(),
      })
      .strict(),
    promise: z.string().min(1),
    whyItMatters: z.string().min(1).optional(),
    estimatedMinutes: z.number().int().positive(),
  })
  .strict();
export type LearnerLessonIntro = z.infer<typeof LearnerLessonIntroSchema>;

export const ExplainerStageSchema = StageBaseSchema.extend({
  type: z.literal("explainer"),
  steps: z.array(LearnerStepSchema).min(1),
  /** Present for a v2 lesson: the opener screen shown before the first step. */
  intro: LearnerLessonIntroSchema.optional(),
  /** The lesson's calculator policy, which a step may override. Absent means available. */
  calculator: CalculatorPolicySchema.optional(),
  visual: z
    .object({
      kind: ExplainerVisualKindSchema,
      briefId: z.string().optional(),
      alt: z.string().min(1),
      /** Served path for a visual the interface can draw. Absent means "describe it instead". */
      src: z.string().min(1).optional(),
      image: StageImageSchema.optional(),
      /**
       * The circuit as data, so the browser can draw it itself and animate between states.
       * The served `src` stays for anything that still wants a plain image.
       */
      circuit: CircuitDiagramSpecSchema.optional(),
      /** Configurations this visual moves between, named by the lesson's steps. */
      states: z.array(VisualStateSchema).default([]),
    })
    .strict(),
}).strict();
export type ExplainerStage = z.infer<typeof ExplainerStageSchema>;

export const InteractiveVisualStageSchema = StageBaseSchema.extend({
  type: z.literal("interactive_visual"),
  activity: LearnerActivitySchema,
  prompt: z.string().min(1),
  visualKind: z.enum(["circuit", "graph", "timeline", "map", "diagram"]),
}).strict();
export type InteractiveVisualStage = z.infer<typeof InteractiveVisualStageSchema>;

export const QuizStageSchema = StageBaseSchema.extend({
  type: z.literal("quiz"),
  questionId: z.string().min(1),
  question: LearnerQuestionSchema,
  /** v2 skill check: no hints, no tutor, results per item. */
  skillCheck: z.boolean().optional(),
  calculator: CalculatorPolicySchema.optional(),
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
  lessonId: z.string().min(1).optional(),
  cardIds: z.array(z.string().min(1)).optional(),
}).strict();
export type ReviewStage = z.infer<typeof ReviewStageSchema>;

/** The v2 close: the key idea stated plainly, then the bridge to the next lesson. */
export const RecapStageSchema = StageBaseSchema.extend({
  type: z.literal("recap"),
  keyIdea: z.string().min(1),
  blocks: z.array(RichTextBlockSchema),
  nextHook: z.string().min(1).optional(),
  /** Fronts of the recall cards this lesson adds to review. Never the backs. */
  cardFronts: z.array(z.string().min(1)),
}).strict();
export type RecapStage = z.infer<typeof RecapStageSchema>;

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
  RecapStageSchema,
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
    subjects: z.array(z.string().min(1)).max(5).optional(),
    /** Lessons the learner has finished every stage of, for the catalogue progress ring. */
    completedLessonCount: z.number().int().nonnegative(),
  })
  .strict();
export type CourseSummary = z.infer<typeof CourseSummarySchema>;
