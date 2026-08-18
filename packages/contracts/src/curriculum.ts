import { z } from "zod";
import { AssuranceLevelSchema } from "./modes.js";
import { CircuitDiagramSpecSchema, VisualBriefSchema } from "./visuals.js";

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
  .refine((value: { min: number; value: number; max: number }) => value.min <= value.value && value.value <= value.max, {
    message: "Control value must be inside its range.",
  });

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

export const ActivitySchema = z.discriminatedUnion("type", [OhmsLawActivitySchema, SeriesCircuitActivitySchema]);
export type Activity = z.infer<typeof ActivitySchema>;

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
  })
  .strict();
export type Question = z.infer<typeof QuestionSchema>;

export const LearnerQuestionSchema = QuestionSchema.omit({ answerAuthority: true });
export type LearnerQuestion = z.infer<typeof LearnerQuestionSchema>;

export const LessonBeatSchema = z
  .object({
    id: z.string().min(1),
    courseId: z.string().min(1),
    conceptIds: z.array(z.string()).min(1),
    title: z.string().min(1),
    orientation: z.string().min(1),
    explanation: z.string().min(1),
    visualBrief: VisualBriefSchema,
    circuitSpec: CircuitDiagramSpecSchema.optional(),
    activityId: z.string().min(1),
    questionId: z.string().min(1),
    sourceIds: z.array(z.string()),
    assuranceLevel: AssuranceLevelSchema,
  })
  .strict();
export type LessonBeat = z.infer<typeof LessonBeatSchema>;

export const CourseBundleSchema = z
  .object({
    course: CourseSchema,
    modules: z.array(ModuleSchema),
    concepts: z.array(ConceptSchema),
    lessons: z.array(LessonBeatSchema),
    activities: z.array(ActivitySchema),
    questions: z.array(QuestionSchema),
    sources: z.array(SourceSchema),
  })
  .strict();
export type CourseBundle = z.infer<typeof CourseBundleSchema>;
