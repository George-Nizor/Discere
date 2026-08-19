import { z } from "zod";
import { AssuranceLevelSchema } from "./modes.js";
import { CircuitDiagramSpecSchema, VisualBriefSchema, VisualStateSchema } from "./visuals.js";

export const ConceptSchema = z
  .object({
    id: z.string().min(1),
    moduleId: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    prerequisiteIds: z.array(z.string()),
    misconceptionIds: z.array(z.string()),
    assuranceLevel: AssuranceLevelSchema,
  })
  .strict();
export type Concept = z.infer<typeof ConceptSchema>;

export const ModuleSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
  })
  .strict();
export type CourseModule = z.infer<typeof ModuleSchema>;

export const CourseSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    audience: z.string().min(1),
    assuranceLevel: AssuranceLevelSchema,
    moduleIds: z.array(z.string()).min(1),
    sourceIds: z.array(z.string()),
    /**
     * The course's identity colour, as a CSS hex. Courses have to be told apart at a glance on
     * a catalogue; green stays reserved for action and correctness, so it cannot also mean
     * "this course". Defaults to the house green when a bundle does not choose one.
     */
    accent: z.string().regex(/^#[0-9a-f]{6}$/i).default("#0b8f3c"),
    /** Cover art file inside the course's own assets directory. Empty means no cover yet. */
    coverAsset: z.string().default(""),
    /**
     * `coming_soon` renders the card as present but unopenable, so a roadmap can be shown
     * without pretending the lessons exist.
     */
    status: z.enum(["available", "coming_soon"]).default("available"),
  })
  .strict();
export type Course = z.infer<typeof CourseSchema>;

export const SourceSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    publisher: z.string().min(1),
    url: z.string().url(),
    licence: z.string().min(1),
    accessedAt: z.string().date(),
    notes: z.string().optional(),
  })
  .strict();
export type Source = z.infer<typeof SourceSchema>;

export const RangeControlSchema = z
  .object({
    value: z.number(),
    min: z.number(),
    max: z.number(),
    step: z.number().positive().default(1),
  })
  .strict()
  .refine(
    (value: { min: number; value: number; max: number }) =>
      value.min <= value.value && value.value <= value.max,
    {
      message: "Control value must be inside its range.",
    },
  );

export const OhmsLawActivitySchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("ohms_law_explorer"),
    title: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    instructions: z.string().min(1),
    voltage: RangeControlSchema,
    resistance: RangeControlSchema,
    predictionPrompt: z.string().min(1),
  })
  .strict();
export type OhmsLawActivity = z.infer<typeof OhmsLawActivitySchema>;

export const SeriesCircuitResistorSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    value: z.number().positive(),
    min: z.number().positive(),
    max: z.number().positive(),
    step: z.number().positive().default(10),
  })
  .strict()
  .refine((value) => value.min <= value.value && value.value <= value.max, {
    message: "Resistor value must be inside its range.",
  });
export type SeriesCircuitResistor = z.infer<typeof SeriesCircuitResistorSchema>;

export const SeriesCircuitActivitySchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("series_circuit_explorer"),
    title: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    instructions: z.string().min(1),
    voltage: RangeControlSchema,
    resistors: z.array(SeriesCircuitResistorSchema).min(2).max(4),
    predictionPrompt: z.string().min(1),
  })
  .strict();
export type SeriesCircuitActivity = z.infer<typeof SeriesCircuitActivitySchema>;

export const ParallelCircuitBranchSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    value: z.number().positive(),
    min: z.number().positive(),
    max: z.number().positive(),
    step: z.number().positive().default(10),
  })
  .strict()
  .refine((value) => value.min <= value.value && value.value <= value.max, {
    message: "Branch resistance must be inside its range.",
  });
export type ParallelCircuitBranch = z.infer<typeof ParallelCircuitBranchSchema>;

export const ParallelCircuitActivitySchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("parallel_circuit_explorer"),
    title: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    instructions: z.string().min(1),
    voltage: RangeControlSchema,
    branches: z.array(ParallelCircuitBranchSchema).min(2).max(3),
    predictionPrompt: z.string().min(1),
  })
  .strict();
export type ParallelCircuitActivity = z.infer<typeof ParallelCircuitActivitySchema>;

/**
 * One dated event on a timeline. `year` is astronomical-style: 27 BCE is -27, and 117 CE is
 * 117, so ordering is plain numeric comparison rather than an era-aware special case.
 */
export const TimelineEventSchema = z
  .object({
    id: z.string().min(1),
    year: z.number().int(),
    label: z.string().min(1),
    detail: z.string().min(1),
  })
  .strict();
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const TimelineActivitySchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("timeline_explorer"),
    title: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    instructions: z.string().min(1),
    startYear: z.number().int(),
    endYear: z.number().int(),
    step: z.number().int().positive().default(1),
    initialYear: z.number().int(),
    events: z.array(TimelineEventSchema).min(2).max(12),
    predictionPrompt: z.string().min(1),
    /**
     * Event identifiers the learner orders. Correctness is recomputed from the event years, so
     * the learner payload never carries a marked answer.
     */
    orderingChoiceIds: z.array(z.string().min(1)).min(2).max(4),
  })
  .strict();
export type TimelineActivity = z.infer<typeof TimelineActivitySchema>;

/**
 * Structural rules a timeline must satisfy beyond its field types. They are reported as
 * authoring issues by the curriculum validator rather than folded into the schema, so a
 * discriminated union over activity types stays a union of plain objects.
 */
export function timelineActivityIssues(activity: TimelineActivity): string[] {
  const issues: string[] = [];
  if (activity.startYear >= activity.endYear) issues.push("A timeline must start before it ends.");
  if (activity.initialYear < activity.startYear || activity.initialYear > activity.endYear) {
    issues.push("The opening year must sit inside the timeline.");
  }
  for (const event of activity.events) {
    if (event.year < activity.startYear || event.year > activity.endYear) {
      issues.push(`Event '${event.id}' sits outside the timeline range.`);
    }
  }
  const years = new Set<number>();
  for (const id of activity.orderingChoiceIds) {
    const event = activity.events.find((item) => item.id === id);
    if (!event) {
      issues.push(`Ordering choice '${id}' does not name an event on this timeline.`);
      continue;
    }
    if (years.has(event.year)) {
      issues.push(`Ordering choices share the year ${event.year}, so none of them is earliest.`);
    }
    years.add(event.year);
  }
  return issues;
}

/**
 * A place on a figure the learner can tap. Coordinates are percentages of the figure's box, so
 * a target keeps its meaning whatever size the figure is drawn at and whichever renderer drew
 * it — a circuit, a graph, or a photograph.
 */
export const DiagramTargetSchema = z
  .object({
    id: z.string().min(1),
    /** Named for a screen reader, and shown when the pointer or focus is on the target. */
    label: z.string().min(1),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    /** Radius as a percentage of the figure's width. */
    r: z.number().positive().max(50).default(8),
  })
  .strict();
export type DiagramTarget = z.infer<typeof DiagramTargetSchema>;

export const ActivityFeedbackSchema = z
  .object({ correct: z.string().min(1), incorrect: z.string().min(1) })
  .strict();

/** Point at the thing you mean, rather than describing it in words the question supplied. */
export const DiagramChoiceActivitySchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("diagram_choice"),
    title: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    instructions: z.string().min(1),
    prompt: z.string().min(1),
    /** Drawn beneath the targets when the figure is a circuit. */
    circuit: CircuitDiagramSpecSchema.optional(),
    /** A course asset drawn beneath the targets instead, by file name. */
    imageFile: z.string().default(""),
    imageAlt: z.string().default(""),
    targets: z.array(DiagramTargetSchema).min(2).max(8),
    correctTargetId: z.string().min(1),
    feedback: ActivityFeedbackSchema,
  })
  .strict();
export type DiagramChoiceActivity = z.infer<typeof DiagramChoiceActivitySchema>;

/** Put the steps in order. Sequence is a kind of understanding a multiple choice cannot test. */
export const OrderSequenceActivitySchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("order_sequence"),
    title: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    instructions: z.string().min(1),
    prompt: z.string().min(1),
    items: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) }).strict()).min(3).max(8),
    correctOrder: z.array(z.string().min(1)).min(3).max(8),
    feedback: ActivityFeedbackSchema,
  })
  .strict();
export type OrderSequenceActivity = z.infer<typeof OrderSequenceActivitySchema>;

export const GraphAxisSchema = z
  .object({
    label: z.string().min(1),
    unit: z.string().default(""),
    min: z.number(),
    max: z.number(),
    /** Gridline spacing, which is also what a placed point snaps to. */
    step: z.number().positive(),
  })
  .strict();

/** Read a value off a graph, or place a point on one. */
export const GraphPlotActivitySchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("graph_plot"),
    title: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    instructions: z.string().min(1),
    prompt: z.string().min(1),
    mode: z.enum(["read", "place"]),
    x: GraphAxisSchema,
    y: GraphAxisSchema,
    /** A line already on the axes for a `read` task, as a series of points. */
    series: z.array(z.object({ x: z.number(), y: z.number() }).strict()).default([]),
    answer: z.object({ x: z.number(), y: z.number() }).strict(),
    /** How far off the answer may be, in axis units. */
    tolerance: z.object({ x: z.number().nonnegative(), y: z.number().nonnegative() }).strict(),
    feedback: ActivityFeedbackSchema,
  })
  .strict();
export type GraphPlotActivity = z.infer<typeof GraphPlotActivitySchema>;

export const ActivitySchema = z.discriminatedUnion("type", [
  OhmsLawActivitySchema,
  SeriesCircuitActivitySchema,
  ParallelCircuitActivitySchema,
  TimelineActivitySchema,
  DiagramChoiceActivitySchema,
  OrderSequenceActivitySchema,
  GraphPlotActivitySchema,
]);
export type Activity = z.infer<typeof ActivitySchema>;
export type ActivityType = Activity["type"];

export const NumericAnswerAuthoritySchema = z
  .object({
    kind: z.literal("numeric"),
    value: z.number(),
    unit: z.string().min(1),
    absoluteTolerance: z.number().nonnegative().default(1e-9),
    relativeTolerance: z.number().nonnegative().default(0.02),
    workedAnswer: z.string().min(1),
  })
  .strict();

export const TextAnswerAuthoritySchema = z
  .object({
    kind: z.literal("text"),
    acceptedIdeas: z.array(z.string().min(1)).min(1),
    rejectedIdeas: z.array(z.string().min(1)),
    exampleAnswer: z.string().min(1),
  })
  .strict();

export const AnswerAuthoritySchema = z.discriminatedUnion("kind", [
  NumericAnswerAuthoritySchema,
  TextAnswerAuthoritySchema,
]);
export type AnswerAuthority = z.infer<typeof AnswerAuthoritySchema>;

export const TransferAuthoritySchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    expectedUnit: z.string().min(1),
    value: z.number(),
    absoluteTolerance: z.number().nonnegative().default(1e-9),
    relativeTolerance: z.number().nonnegative().default(0.02),
    workedAnswer: z.string().min(1),
  })
  .strict();
export type TransferAuthority = z.infer<typeof TransferAuthoritySchema>;

/**
 * A selectable answer choice. Choices carry no correctness marking, so the learner payload
 * stays safe; the server still holds the authority that decides the submitted text.
 */
export const QuestionChoiceSchema = z
  .object({ id: z.string().min(1), label: z.string().min(1) })
  .strict();
export type QuestionChoice = z.infer<typeof QuestionChoiceSchema>;

export const QuestionSchema = z
  .object({
    id: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    prompt: z.string().min(1),
    responseType: z.enum(["numeric", "short_text", "long_text", "drawing", "code"]),
    difficulty: z.number().min(0.5).max(2).default(1),
    hints: z.array(z.string().min(1)),
    answerAuthority: AnswerAuthoritySchema,
    sourceIds: z.array(z.string()),
    /** Present when the question is answered by selection rather than free response. */
    choices: z.array(QuestionChoiceSchema).min(2).max(8).optional(),
    /**
     * A changed case offered after the worked answer is revealed, so a learner who was shown
     * the answer can still produce independent evidence. It is answer-bearing and never
     * reaches the browser inside the question.
     */
    transfer: TransferAuthoritySchema.optional(),
  })
  .strict();
export type Question = z.infer<typeof QuestionSchema>;

export const LearnerQuestionSchema = QuestionSchema.omit({ answerAuthority: true, transfer: true });
export type LearnerQuestion = z.infer<typeof LearnerQuestionSchema>;

/**
 * A retrieved image held next to the bundle. Provenance travels with the picture (spec v0.2
 * section 19.3) so the interface can always show attribution beside what it displays, and so a
 * licence that forbids redistribution can be caught while the course is still being authored.
 */
export const CourseImageSchema = z
  .object({
    /** File name inside `content/<courseId>/assets/`. Never a path. */
    file: z
      .string()
      .min(1)
      .regex(
        /^[a-z0-9][a-z0-9.-]*$/,
        "An asset file name uses lower-case letters, digits, dots, and hyphens.",
      ),
    alt: z.string().min(12),
    caption: z.string().min(1),
    creator: z.string().min(1),
    licence: z.string().min(1),
    /** Absent when the provider publishes no deed URL, which is common for public domain. */
    licenceUrl: z.string().url().optional(),
    /** The provider's landing page, which is what an attribution line links to. */
    landingPageUrl: z.string().url(),
    attribution: z.string().min(1),
    retrievedAt: z.string().date(),
    contentHash: z.string().min(8),
  })
  .strict();
export type CourseImage = z.infer<typeof CourseImageSchema>;

/**
 * Licence strings a bundled, redistributed image may carry. Anchored at both ends, because
 * "CC BY-NC-SA 4.0" opens with a permitted prefix and is not permitted. An optional version and
 * an optional jurisdiction suffix are allowed, which is how Commons writes them.
 */
export const REDISTRIBUTABLE_LICENCE_PATTERN =
  /^(public domain|cc0|cc by|cc by-sa)( \d[\d.]*)?( [a-z]{2,3})?$/i;

export const ExplainerVisualKindSchema = z.enum([
  "circuit",
  "image",
  "timeline",
  "diagram",
  "none",
]);
export type ExplainerVisualKind = z.infer<typeof ExplainerVisualKindSchema>;

/** Titles the learner reads above each generated stage of a lesson. */
export const StageTitlesSchema = z
  .object({
    quiz: z.string().min(1),
    review: z.string().min(1),
    completion: z.string().min(1),
  })
  .strict();
export type StageTitles = z.infer<typeof StageTitlesSchema>;

/**
 * A run of learner-facing prose, as structured blocks rather than one string. Splitting it up
 * is what lets a definition become a disclosure and an equation be typeset, instead of every
 * paragraph looking the same.
 *
 * This is an internal schema and never reaches constrained decoding, so a discriminated union
 * is safe here. The authoring boundary flattens it (see `AuthoredLessonDraftSchema`).
 */
export const RichTextBlockSchema = z.discriminatedUnion("kind", [
  // `$…$` spans are KaTeX, as in every other learner-facing string.
  z.object({ kind: z.literal("paragraph"), text: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("heading"), text: z.string().min(1) }).strict(),
  z
    .object({ kind: z.literal("definition"), term: z.string().min(1), text: z.string().min(1) })
    .strict(),
  z
    .object({
      kind: z.literal("callout"),
      tone: z.enum(["info", "key"]),
      text: z.string().min(1),
    })
    .strict(),
  z.object({ kind: z.literal("equation"), latex: z.string().min(1) }).strict(),
]);
export type RichTextBlock = z.infer<typeof RichTextBlockSchema>;

/**
 * The kinds of beat a lesson is built from, following the Beats A–G architecture in
 * `docs/learning-experience-redesign-draft.md`. A lesson opens with a `hook`, alternates
 * `explain` and `interact`, and closes on a `check` or `transfer`.
 */
export const LessonStepKindSchema = z.enum([
  "hook",
  "explain",
  "worked_example",
  "check",
  "interact",
  "transfer",
  "teach_back",
]);
export type LessonStepKind = z.infer<typeof LessonStepKindSchema>;

/**
 * One screen of a lesson: a short piece of prose, optionally a change to the visual, and
 * optionally one thing for the learner to do. Keeping a step small is the point — the evidence
 * on segmentation says a learner should not face a wall of text and a test as separate blocks.
 */
export const LessonStepSchema = z
  .object({
    /** Stable slug, unique within the lesson. Saved progress refers to steps by index, not id. */
    id: z.string().min(1),
    kind: LessonStepKindSchema,
    blocks: z.array(RichTextBlockSchema).min(1),
    /** Names a state of the lesson's visual. Empty keeps whatever the previous step showed. */
    visualStateId: z.string().default(""),
    /** Required for `check` and `transfer`: the question the learner answers inline. */
    checkQuestionId: z.string().default(""),
    /** Required for `interact`: the activity this step hands over to. */
    activityId: z.string().default(""),
  })
  .strict();
export type LessonStep = z.infer<typeof LessonStepSchema>;

export const LessonBeatSchema = z
  .object({
    id: z.string().min(1),
    courseId: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    title: z.string().min(1),
    /**
     * The lesson as a sequence of short beats. This is the lesson: there is no longer a prose
     * body beside it, because two sources for the same teaching drift apart.
     */
    steps: z.array(LessonStepSchema).min(3),
    /** One line naming what the lesson is about, used wherever a lesson is listed. */
    orientation: z.string().min(1),
    /**
     * Present when the lesson has a technical diagram to show. A lesson can teach entirely
     * through its steps and its questions, so this is optional rather than a brief nobody wrote.
     */
    visualBrief: VisualBriefSchema.optional(),
    circuitSpec: CircuitDiagramSpecSchema.optional(),
    /**
     * Configurations the lesson's visual moves between as the learner advances. A step names
     * one by id; the player interpolates from whichever state was showing.
     */
    visualStates: z.array(VisualStateSchema).default([]),
    image: CourseImageSchema.optional(),
    visualKind: ExplainerVisualKindSchema.default("none"),
    /**
     * A slider or scrubber explorer, given a stage of its own. Optional: since lessons became
     * steps, an interaction can live inside a step instead, and most subjects have no explorer.
     */
    activityId: z.string().default(""),
    questionIds: z.array(z.string().min(1)).min(1),
    essayId: z.string().min(1).optional(),
    flashcardIds: z.array(z.string().min(1)),
    reviewLabel: z.string().min(1),
    nextAction: z.string().min(1),
    stageTitles: StageTitlesSchema,
    sourceIds: z.array(z.string()),
    assuranceLevel: AssuranceLevelSchema,
  })
  .strict();
export type LessonBeat = z.infer<typeof LessonBeatSchema>;

/**
 * An authored recall card. The back is answer-bearing, so it only ever leaves the server
 * through the review flow that records the reveal.
 */
export const FlashcardRecordSchema = z
  .object({
    id: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    front: z.string().min(1),
    back: z.string().min(1),
    sourceIds: z.array(z.string()).min(1),
    /** The question this card rehearses, when it was written alongside one. */
    questionId: z.string().min(1).optional(),
  })
  .strict();
export type FlashcardRecord = z.infer<typeof FlashcardRecordSchema>;

export const EssayTopicSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    prompt: z.string().min(1),
    expectedScope: z.string().min(1),
    successCriteria: z.array(z.string().min(1)).min(1),
    minWords: z.number().int().nonnegative(),
    sourceIds: z.array(z.string()),
  })
  .strict();
export type EssayTopic = z.infer<typeof EssayTopicSchema>;

export const CourseBundleSchema = z
  .object({
    course: CourseSchema,
    modules: z.array(ModuleSchema),
    concepts: z.array(ConceptSchema),
    lessons: z.array(LessonBeatSchema),
    activities: z.array(ActivitySchema),
    questions: z.array(QuestionSchema),
    flashcards: z.array(FlashcardRecordSchema),
    essays: z.array(EssayTopicSchema),
    sources: z.array(SourceSchema),
  })
  .strict();
export type CourseBundle = z.infer<typeof CourseBundleSchema>;

/**
 * A curated course outline, committed as data before any lesson exists.
 *
 * A topic map is the plan: what the course covers, in what order, and what each lesson should
 * leave the learner able to do. It is assembled by hand from open curricula rather than
 * generated, because the shape of a subject is the part worth getting right yourself — and it
 * lets the catalogue show a course as planned long before its lessons are written.
 */
export const TopicMapLessonSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    title: z.string().min(1),
    /** What the learner should be able to do afterwards, in one sentence. */
    outcome: z.string().min(1),
    /** The beats the lesson should hit, in order. One line each. */
    outline: z.array(z.string().min(1)).min(3).max(12),
    conceptIds: z.array(z.string().min(1)).min(1),
    /** Interaction types this lesson should use, so the plan commits to more than prose. */
    activityKinds: z
      .array(z.enum(["diagram_choice", "order_sequence", "graph_plot", "explorer"]))
      .default([]),
  })
  .strict();
export type TopicMapLesson = z.infer<typeof TopicMapLessonSchema>;

export const TopicMapModuleSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    concepts: z
      .array(z.object({ id: z.string().min(1), title: z.string().min(1), summary: z.string().min(1) }).strict())
      .min(1),
    lessons: z.array(TopicMapLessonSchema).min(1),
  })
  .strict();

export const TopicMapSchema = z
  .object({
    courseId: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    title: z.string().min(1),
    description: z.string().min(1),
    audience: z.string().min(1),
    accent: z.string().regex(/^#[0-9a-f]{6}$/i),
    coverAsset: z.string().default("cover.svg"),
    /** Where the outline came from, so the plan can be checked against its sources. */
    sources: z.array(z.object({ title: z.string().min(1), url: z.string().url() }).strict()).min(1),
    modules: z.array(TopicMapModuleSchema).min(1),
  })
  .strict();
export type TopicMap = z.infer<typeof TopicMapSchema>;
