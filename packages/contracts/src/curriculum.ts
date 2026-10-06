import { z } from "zod";
import { CourseCheckVisualSchema } from "./course-check-visual.js";
import { LessonAuthoringMetadataSchema } from "./curation.js";
import { LearningDiagramSchema } from "./learning-diagram.js";
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
    accent: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .default("#0b8f3c"),
    /** Cover art file inside the course's own assets directory. Empty means no cover yet. */
    coverAsset: z
      .string()
      .regex(/^(?:[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:png|jpe?g|webp|svg))?$/)
      .default(""),
    /**
     * `coming_soon` renders the card as present but unopenable, so a roadmap can be shown
     * without pretending the lessons exist.
     */
    status: z.enum(["available", "coming_soon"]).default("available"),
    /** Archived prototypes remain addressable for saved history but leave discovery. */
    catalogueVisibility: z.enum(["listed", "archived"]).optional(),
    /** Authored library subjects, used for discovery rather than inferred from titles. */
    subjects: z.array(z.string().trim().min(1).max(40)).max(5).optional(),
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
    licenceUrl: z.string().url().optional(),
    attribution: z.string().min(1).optional(),
    section: z.string().min(1).optional(),
    edition: z.string().min(1).optional(),
    reuse: z.enum(["adaptable", "reference_only"]).optional(),
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
    items: z
      .array(z.object({ id: z.string().min(1), label: z.string().min(1) }).strict())
      .min(3)
      .max(8),
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

/** Public teaching data excludes marking rules and post-response feedback. */
export const LearnerActivitySchema = z.discriminatedUnion("type", [
  OhmsLawActivitySchema,
  SeriesCircuitActivitySchema,
  ParallelCircuitActivitySchema,
  TimelineActivitySchema,
  DiagramChoiceActivitySchema.omit({ correctTargetId: true, feedback: true }),
  OrderSequenceActivitySchema.omit({ correctOrder: true, feedback: true }),
  GraphPlotActivitySchema.omit({ answer: true, tolerance: true, feedback: true }),
]);
export type LearnerActivity = z.infer<typeof LearnerActivitySchema>;

export function learnerActivity(activity: Activity): LearnerActivity {
  if (activity.type === "diagram_choice") {
    const { correctTargetId: _answer, feedback: _feedback, ...publicData } = activity;
    return publicData;
  }
  if (activity.type === "order_sequence") {
    const { correctOrder: _answer, feedback: _feedback, ...publicData } = activity;
    return publicData;
  }
  if (activity.type === "graph_plot") {
    const { answer: _answer, tolerance: _tolerance, feedback: _feedback, ...publicData } = activity;
    return publicData;
  }
  return activity;
}

export const NumericAnswerAuthoritySchema = z
  .object({
    kind: z.literal("numeric"),
    value: z.number(),
    unit: z.string(),
    absoluteTolerance: z.number().nonnegative().default(1e-9),
    relativeTolerance: z.number().nonnegative().default(0.02),
    workedAnswer: z.string().min(1),
  })
  .strict();

export const TextAnswerAuthoritySchema = z
  .object({
    kind: z.literal("text"),
    acceptedIdeas: z.array(z.string().min(1)).min(1),
    acceptedAlternatives: z.array(z.string().min(1)).min(1).max(12).optional(),
    rejectedIdeas: z.array(z.string().min(1)),
    exampleAnswer: z.string().min(1),
  })
  .strict()
  .refine(
    (a) => !a.acceptedAlternatives || a.acceptedIdeas.length === 1,
    "Alternative terms require one canonical idea.",
  );

export const AnswerAuthoritySchema = z.discriminatedUnion("kind", [
  NumericAnswerAuthoritySchema,
  TextAnswerAuthoritySchema,
]);
export type AnswerAuthority = z.infer<typeof AnswerAuthoritySchema>;

export const TransferAuthoritySchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    expectedUnit: z.string(),
    value: z.number(),
    absoluteTolerance: z.number().nonnegative().default(1e-9),
    relativeTolerance: z.number().nonnegative().default(0.02),
    workedAnswer: z.string().min(1),
  })
  .strict();
export type TransferAuthority = z.infer<typeof TransferAuthoritySchema>;

/**
 * Whether the lesson workbench offers its calculator: `off` hides it (the arithmetic is the
 * skill), `available` offers it closed, `suggested` opens it beside the step. Using an offered
 * calculator is never recorded as assistance.
 */
export const CalculatorPolicySchema = z.enum(["off", "available", "suggested"]);
export type CalculatorPolicy = z.infer<typeof CalculatorPolicySchema>;

/**
 * A predictable wrong answer and what to say about it. A numeric response matches when it equals
 * one of `numeric` (within 1e-9); a choice when its id is listed; free text when it contains one
 * of `textIdeas` as a phrase. The feedback names the slip without stating the answer.
 */
export const MisconceptionSchema = z
  .object({
    match: z
      .object({
        numeric: z.array(z.number()).min(1).max(8).optional(),
        choiceIds: z.array(z.string().min(1)).min(1).max(8).optional(),
        textIdeas: z.array(z.string().min(1)).min(1).max(8).optional(),
      })
      .strict()
      .refine(
        (match) => Boolean(match.numeric || match.choiceIds || match.textIdeas),
        "A misconception needs something to match.",
      ),
    feedback: z.string().min(1),
  })
  .strict();
export type Misconception = z.infer<typeof MisconceptionSchema>;

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
    /**
     * Lesson schema v2 (docs/learning-experience §7.3). One line, at most 25 words, shown with
     * every correct verdict so a learner who is right still receives the idea. Answer-bearing:
     * it leaves the server only through the lesson-feedback route, after a recorded response.
     */
    onCorrect: z.string().min(1).optional(),
    /** Specific feedback for a predictable wrong answer, matched before the generic message. */
    misconceptions: z.array(MisconceptionSchema).max(8).optional(),
    /** What the item requires, e.g. `evaluate-expression`; checked against what the lesson teaches. */
    skill: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .optional(),
    /** Terms and symbols the prompt relies on, for the vocabulary-order validator. */
    usesTerms: z.array(z.string().min(1)).max(12).optional(),
    calculator: CalculatorPolicySchema.optional(),
  })
  .strict();
export type Question = z.infer<typeof QuestionSchema>;

export const CourseCheckDefinitionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/),
    kind: z.enum(["placement", "checkpoint", "transfer"]),
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(400),
    requiredLessonIds: z.array(z.string().min(1)).max(100),
    afterCheckId: z.string().min(1).optional(),
    delayDays: z.number().int().min(1).max(60).optional(),
    items: z
      .array(
        z
          .object({
            lessonId: z.string().min(1),
            visual: CourseCheckVisualSchema,
            question: QuestionSchema.extend({
              responseType: z.enum(["numeric", "short_text"]),
              hints: z.array(z.never()).length(0),
              transfer: z.never().optional(),
            }).refine(
              (q) =>
                q.responseType === "numeric"
                  ? q.answerAuthority.kind === "numeric" && !q.choices
                  : q.answerAuthority.kind === "text" && Boolean(q.choices),
              "Course checks use numeric responses or authored choices.",
            ),
          })
          .strict(),
      )
      .min(4)
      .max(40),
  })
  .strict()
  .refine(
    (c) =>
      new Set(c.items.map((i) => i.question.id)).size === c.items.length &&
      new Set(c.requiredLessonIds).size === c.requiredLessonIds.length &&
      (c.kind === "transfer"
        ? Boolean(c.afterCheckId && c.delayDays)
        : !c.afterCheckId && !c.delayDays) &&
      (c.kind !== "placement" || c.requiredLessonIds.length === 0),
    "Use unique questions and prerequisites, with a delay only for a transfer check.",
  );
export type CourseCheckDefinition = z.infer<typeof CourseCheckDefinitionSchema>;

export const LearnerQuestionSchema = QuestionSchema.omit({
  answerAuthority: true,
  transfer: true,
  hints: true,
  onCorrect: true,
  misconceptions: true,
  skill: true,
  usesTerms: true,
}).extend({ hintCount: z.number().int().nonnegative(), expectedUnit: z.string().optional() });
export type LearnerQuestion = z.infer<typeof LearnerQuestionSchema>;

/** Reveal hint text only through the permission-checked hint endpoint. */
export function learnerQuestion(question: Question): LearnerQuestion {
  const {
    answerAuthority,
    transfer: _transfer,
    hints,
    onCorrect: _onCorrect,
    misconceptions: _misconceptions,
    skill: _skill,
    usesTerms: _usesTerms,
    ...rest
  } = question;
  return {
    ...rest,
    hintCount: hints.length,
    ...(answerAuthority.kind === "numeric"
      ? { expectedUnit: answerAuthority.unit === "probability" ? "" : answerAuthority.unit }
      : {}),
  };
}

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
 * The kinds of beat a lesson is built from. The v2 kinds (docs/learning-experience §3.2) decide
 * the order of teaching and asking: `explore`, `predict`, `explain`, `worked_example`,
 * `faded_example`, `try` and `transfer`. The legacy kinds `hook`, `check`, `interact` and
 * `teach_back` stay valid so the courses written before v2 keep loading while they migrate.
 */
export const LESSON_V2_STEP_KINDS = [
  "explore",
  "predict",
  "explain",
  "worked_example",
  "faded_example",
  "try",
  "transfer",
] as const;
export const LessonStepKindSchema = z.enum([
  "hook",
  "explain",
  "worked_example",
  "check",
  "interact",
  "transfer",
  "teach_back",
  "explore",
  "predict",
  "faded_example",
  "try",
]);
export type LessonStepKind = z.infer<typeof LessonStepKindSchema>;

/**
 * One screen of a lesson: a short piece of prose, optionally a change to the visual, and
 * optionally one thing for the learner to do. Keeping a step small is the point — the evidence
 * on segmentation says a learner should not face a wall of text and a test as separate blocks.
 */
/**
 * One line of a worked or faded example. A faded line names the question the learner answers in
 * place of the line's result; a self-explanation line asks why the line is allowed.
 */
export const WorkedStepSchema = z
  .object({
    text: z.string().min(1),
    /** The line's working, typeset as maths when it contains `$…$`. */
    math: z.string().min(1).optional(),
    blank: z
      .object({ questionId: z.string().min(1) })
      .strict()
      .optional(),
    selfExplain: z
      .object({ questionId: z.string().min(1) })
      .strict()
      .optional(),
  })
  .strict();
export type WorkedStep = z.infer<typeof WorkedStepSchema>;

export const LessonStepSchema = z
  .object({
    /** Stable slug, unique within the lesson. Saved progress refers to steps by this id. */
    id: z.string().min(1),
    kind: LessonStepKindSchema,
    /**
     * Legacy prose. A v2 step leaves it empty and uses `lead` and `reveal` instead; the
     * validator requires one or the other.
     */
    blocks: z.array(RichTextBlockSchema).default([]),
    /** v2: a small label above the step ("Worked example"). Replaces the heading block. */
    eyebrow: z.string().min(1).max(60).optional(),
    /** v2, `explain` only: the key idea as a sentence, set as the screen's headline. */
    headline: z.string().min(1).max(160).optional(),
    /** v2: always shown before the interaction; at most 60 words. */
    lead: z.array(RichTextBlockSchema).optional(),
    /** v2: shown with the verdict after a recorded response. */
    reveal: z.array(RichTextBlockSchema).optional(),
    /** v2: `worked_example` and `faded_example` lines, revealed one at a time. */
    workedSteps: z.array(WorkedStepSchema).min(1).max(8).optional(),
    /**
     * v2: `hidden-until-response` renders givens only until the learner answers; `live` is for
     * an `explore` step whose figure state is the answer.
     */
    answerVisibility: z.enum(["hidden-until-response", "live"]).optional(),
    calculator: CalculatorPolicySchema.optional(),
    /** v2, `explain` steps: the terms and symbols this step defines. */
    introducesTerms: z.array(z.string().min(1)).max(12).optional(),
    /** Names a state of the lesson's visual. Empty keeps whatever the previous step showed. */
    visualStateId: z.string().default(""),
    /** Required for `check` and `transfer`: the question the learner answers inline. */
    checkQuestionId: z.string().default(""),
    /** Required for `interact`: the activity this step hands over to. */
    activityId: z.string().default(""),
    diagram: LearningDiagramSchema.optional(),
  })
  .strict();
export type LessonStep = z.infer<typeof LessonStepSchema>;

/** The opener of a v2 lesson (docs/learning-experience §3.1). */
export const LessonIntroSchema = z
  .object({
    /** A specific situation or puzzle that opens the gap the lesson closes. Never a definition. */
    hook: z
      .object({
        blocks: z.array(RichTextBlockSchema).min(1),
        diagram: LearningDiagramSchema.optional(),
        /** The first interaction: a quick problem answerable from prior knowledge. */
        questionId: z.string().min(1).optional(),
      })
      .strict(),
    /** At most 25 words, in the learner's voice: "By the end you'll …". */
    promise: z.string().min(1),
    /** Optional, at most 20 words, concrete. */
    whyItMatters: z.string().min(1).optional(),
    /** A prerequisite question asked as retrieval. */
    warmUpQuestionId: z.string().min(1).optional(),
    estimatedMinutes: z.number().int().min(1).max(60),
  })
  .strict();
export type LessonIntro = z.infer<typeof LessonIntroSchema>;

/** The close of a v2 lesson (docs/learning-experience §3.6). */
export const LessonRecapSchema = z
  .object({
    /** The one sentence the lesson promised. */
    keyIdea: z.string().min(1),
    blocks: z.array(RichTextBlockSchema).optional(),
    /** One line bridging to the next lesson. */
    nextHook: z.string().min(1).optional(),
  })
  .strict();
export type LessonRecap = z.infer<typeof LessonRecapSchema>;

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
    /** v2 opener screen: title, hook, promise, time. Present means the lesson uses the v2 player. */
    intro: LessonIntroSchema.optional(),
    /** v2 close screen: the key idea, stated plainly, and the bridge to the next lesson. */
    recap: LessonRecapSchema.optional(),
    /** v2: overrides the course's calculator default for every step and check in the lesson. */
    calculator: CalculatorPolicySchema.optional(),
    /** v2: skills this lesson teaches, which its graded items may require. */
    taughtSkills: z
      .array(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/))
      .max(12)
      .optional(),
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
    answerAuthority: AnswerAuthoritySchema.optional(),
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
    authoringMetadata: z.array(LessonAuthoringMetadataSchema).optional(),
    courseChecks: z.array(CourseCheckDefinitionSchema).min(1).max(3).optional(),
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
    prerequisiteLessonIds: z.array(z.string().min(1)).optional(),
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
      .array(
        z
          .object({
            id: z.string().min(1),
            title: z.string().min(1),
            summary: z.string().min(1),
            prerequisiteIds: z.array(z.string().min(1)).optional(),
          })
          .strict(),
      )
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
    sources: z.array(SourceSchema.partial().required({ title: true, url: true })).min(1),
    modules: z.array(TopicMapModuleSchema).min(1),
  })
  .strict();
export type TopicMap = z.infer<typeof TopicMapSchema>;
