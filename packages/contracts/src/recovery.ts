import { z } from "zod";
import { TutoringModeSchema } from "./modes.js";
import {
  RomanReferenceReviewActionSchema,
  RomanReferenceReviewStateSchema,
  RomanReferenceReviewViewSchema,
} from "./reference-review.js";

export const RomanReferenceBeatSchema = z.enum([
  "opening",
  "augustus",
  "expansion",
  "questions",
  "essay",
  "recall",
  "complete",
]);
export type RomanReferenceBeat = z.infer<typeof RomanReferenceBeatSchema>;

export const RomanReferenceTurningPointIdSchema = z.enum([
  "augustus",
  "deposition",
  "division",
  "extent",
]);
export type RomanReferenceTurningPointId = z.infer<typeof RomanReferenceTurningPointIdSchema>;

export const RomanReferenceOpeningOrderSchema = z
  .array(RomanReferenceTurningPointIdSchema)
  .length(4)
  .refine((order) => new Set(order).size === order.length, {
    message: "Each turning point must appear exactly once.",
  });

export const RomanReferenceMilestoneIdSchema = z.enum(["27-bce", "117-ce", "284-ce", "476-ce"]);
export type RomanReferenceMilestoneId = z.infer<typeof RomanReferenceMilestoneIdSchema>;

export const RomanReferenceQuestionIdSchema = z.enum([
  "turning-points",
  "476-continuity",
  "map-117",
  "two-sentence",
]);
export type RomanReferenceQuestionId = z.infer<typeof RomanReferenceQuestionIdSchema>;

export const RomanReferenceContinuityChoiceIdSchema = z.enum([
  "ended-everywhere",
  "western-change",
  "augustus-created",
  "greatest-extent",
]);
export type RomanReferenceContinuityChoiceId = z.infer<
  typeof RomanReferenceContinuityChoiceIdSchema
>;

export const RomanReferenceMapRegionIdSchema = z.enum([
  "britain",
  "mesopotamia",
  "scandinavia",
  "india",
]);
export type RomanReferenceMapRegionId = z.infer<typeof RomanReferenceMapRegionIdSchema>;

const OrderingQuestionResponseSchema = z
  .object({
    kind: z.literal("ordering"),
    order: RomanReferenceOpeningOrderSchema,
  })
  .strict();

const SelectionQuestionResponseSchema = z
  .object({
    kind: z.literal("selection"),
    choiceId: RomanReferenceContinuityChoiceIdSchema,
  })
  .strict();

const MultiSelectQuestionResponseSchema = z
  .object({
    kind: z.literal("multi_select"),
    choiceIds: z
      .array(RomanReferenceMapRegionIdSchema)
      .max(2)
      .refine((choiceIds) => new Set(choiceIds).size === choiceIds.length, {
        message: "Each map region may be selected once.",
      }),
  })
  .strict();

const FreeResponseQuestionResponseSchema = z
  .object({
    kind: z.literal("free_response"),
    text: z.string().max(2_000),
  })
  .strict();

export const RomanReferenceQuestionResponseSchema = z.discriminatedUnion("kind", [
  OrderingQuestionResponseSchema,
  SelectionQuestionResponseSchema,
  MultiSelectQuestionResponseSchema,
  FreeResponseQuestionResponseSchema,
]);
export type RomanReferenceQuestionResponse = z.infer<typeof RomanReferenceQuestionResponseSchema>;

const QuestionLabelSchema = z.string().min(1);
const TurningPointOptionSchema = z
  .object({ id: RomanReferenceTurningPointIdSchema, label: QuestionLabelSchema })
  .strict();
const ContinuityOptionSchema = z
  .object({ id: RomanReferenceContinuityChoiceIdSchema, label: QuestionLabelSchema })
  .strict();
const MapRegionOptionSchema = z
  .object({ id: RomanReferenceMapRegionIdSchema, label: QuestionLabelSchema })
  .strict();

function optionsAreUnique(options: readonly { id: string }[]): boolean {
  return new Set(options.map((option) => option.id)).size === options.length;
}

const QuestionContentBaseSchema = z.object({
  id: RomanReferenceQuestionIdSchema,
  ordinal: z.number().int().min(1).max(4),
  prompt: z.string().min(1).max(500),
  sourceIds: z.array(z.string().min(1)).min(1).max(10),
});

const OrderingQuestionContentSchema = QuestionContentBaseSchema.extend({
  id: z.literal("turning-points"),
  kind: z.literal("ordering"),
  instruction: z.string().min(1).max(300),
  options: z.array(TurningPointOptionSchema).length(4).refine(optionsAreUnique, {
    message: "Turning-point options must be unique.",
  }),
}).strict();

const SelectionQuestionContentSchema = QuestionContentBaseSchema.extend({
  id: z.literal("476-continuity"),
  kind: z.literal("selection"),
  choices: z.array(ContinuityOptionSchema).length(4).refine(optionsAreUnique, {
    message: "Continuity choices must be unique.",
  }),
}).strict();

const MultiSelectQuestionContentSchema = QuestionContentBaseSchema.extend({
  id: z.literal("map-117"),
  kind: z.literal("multi_select"),
  mapDescription: z.string().min(1).max(1_000),
  choices: z.array(MapRegionOptionSchema).length(4).refine(optionsAreUnique, {
    message: "Map choices must be unique.",
  }),
  selectionCount: z.literal(2),
}).strict();

const FreeResponseQuestionContentSchema = QuestionContentBaseSchema.extend({
  id: z.literal("two-sentence"),
  kind: z.literal("free_response"),
  instruction: z.string().min(1).max(300),
  maxLength: z.number().int().positive().max(2_000),
}).strict();

export const RomanReferenceQuestionContentSchema = z.discriminatedUnion("kind", [
  OrderingQuestionContentSchema,
  SelectionQuestionContentSchema,
  MultiSelectQuestionContentSchema,
  FreeResponseQuestionContentSchema,
]);
export type RomanReferenceQuestionContent = z.infer<typeof RomanReferenceQuestionContentSchema>;

export const RomanReferenceQuestionResultSchema = z.enum([
  "correct",
  "partly_correct",
  "incorrect",
  "ungradable",
]);
export type RomanReferenceQuestionResult = z.infer<typeof RomanReferenceQuestionResultSchema>;

export const RomanReferenceQuestionHintSchema = z
  .object({
    level: z.number().int().positive(),
    text: z.string().min(1).max(500),
  })
  .strict();
export type RomanReferenceQuestionHint = z.infer<typeof RomanReferenceQuestionHintSchema>;

export const RomanReferenceQuestionProgressSchema = z
  .object({
    id: RomanReferenceQuestionIdSchema,
    draft: RomanReferenceQuestionResponseSchema.nullable(),
    submittedResponse: RomanReferenceQuestionResponseSchema.nullable(),
    status: z.enum(["editing", "submitted", "revealed"]),
    result: RomanReferenceQuestionResultSchema.nullable(),
    feedback: z.string().min(1).max(1_000).nullable(),
    mode: TutoringModeSchema.nullable(),
    hints: z.array(RomanReferenceQuestionHintSchema).max(5),
    revealedAnswer: RomanReferenceQuestionResponseSchema.nullable(),
  })
  .strict()
  .superRefine((progress, context) => {
    const responses = [
      ["draft", progress.draft],
      ["submittedResponse", progress.submittedResponse],
      ["revealedAnswer", progress.revealedAnswer],
    ] as const;
    for (const [field, response] of responses) {
      if (response !== null && !responseMatchesQuestion(progress.id, response)) {
        context.addIssue({
          code: "custom",
          message: "The response kind does not match this question.",
          path: [field],
        });
      }
    }

    if ((progress.result === null) !== (progress.feedback === null)) {
      context.addIssue({
        code: "custom",
        message: "A result and its feedback must appear together.",
        path: ["feedback"],
      });
    }
    if (progress.status === "editing") {
      if (progress.submittedResponse !== null || progress.result !== null) {
        context.addIssue({
          code: "custom",
          message: "An editing question cannot retain a submitted result.",
          path: ["status"],
        });
      }
      if (progress.revealedAnswer !== null) {
        context.addIssue({
          code: "custom",
          message: "An editing question cannot contain a revealed answer.",
          path: ["revealedAnswer"],
        });
      }
    } else if (progress.submittedResponse === null) {
      context.addIssue({
        code: "custom",
        message: "A submitted or revealed question must retain the learner response.",
        path: ["submittedResponse"],
      });
    }

    if (progress.status === "submitted" && progress.revealedAnswer !== null) {
      context.addIssue({
        code: "custom",
        message: "Only a revealed question may contain the answer.",
        path: ["revealedAnswer"],
      });
    }
    if (progress.status === "revealed") {
      if (progress.mode !== "direct" || progress.revealedAnswer === null) {
        context.addIssue({
          code: "custom",
          message: "A revealed answer requires a Direct-mode attempt.",
          path: ["revealedAnswer"],
        });
      }
    }

    if (progress.mode === null) {
      if (progress.status !== "editing" || progress.hints.length > 0) {
        context.addIssue({
          code: "custom",
          message: "Assessment activity must lock a tutoring mode.",
          path: ["mode"],
        });
      }
    }
    if (progress.mode === "exam" && (progress.hints.length > 0 || progress.status === "revealed")) {
      context.addIssue({
        code: "custom",
        message: "Exam mode cannot retain assistance or a revealed answer.",
        path: ["mode"],
      });
    }
    if (progress.mode === "direct" && progress.hints.length > 0) {
      context.addIssue({
        code: "custom",
        message: "Direct mode uses reveal friction rather than a hint ladder.",
        path: ["hints"],
      });
    }
    if (
      (progress.status === "revealed" || progress.result === "correct") &&
      !responsesAreEquivalent(progress.draft, progress.submittedResponse)
    ) {
      context.addIssue({
        code: "custom",
        message: "A resolved question cannot retain an unsent draft.",
        path: ["draft"],
      });
    }

    const levels = progress.hints.map((hint) => hint.level);
    if (
      new Set(levels).size !== levels.length ||
      levels.some((level, index) => level !== index + 1)
    ) {
      context.addIssue({
        code: "custom",
        message: "Earned hints must form one ordered ladder.",
        path: ["hints"],
      });
    }
  });
export type RomanReferenceQuestionProgress = z.infer<typeof RomanReferenceQuestionProgressSchema>;

export const RomanReferenceQuestionViewSchema = z
  .object({
    content: RomanReferenceQuestionContentSchema,
    progress: RomanReferenceQuestionProgressSchema,
  })
  .strict()
  .refine((view) => view.content.id === view.progress.id, {
    message: "Question content and progress IDs must match.",
    path: ["progress", "id"],
  });
export type RomanReferenceQuestionView = z.infer<typeof RomanReferenceQuestionViewSchema>;
export const RomanReferenceEssayEvidenceIdSchema = z.enum([
  "augustus-27-bce",
  "extent-117-ce",
  "third-century-crisis",
  "tetrarchy-284-ce",
  "constantinople-330-ce",
  "western-deposition-476-ce",
]);
export type RomanReferenceEssayEvidenceId = z.infer<typeof RomanReferenceEssayEvidenceIdSchema>;

export const RomanReferenceEssayRubricIdSchema = z.enum([
  "claim",
  "evidence",
  "reasoning",
  "complication",
  "accuracy",
]);
export type RomanReferenceEssayRubricId = z.infer<typeof RomanReferenceEssayRubricIdSchema>;

export const RomanReferenceEssayEvidenceSchema = z
  .object({
    id: RomanReferenceEssayEvidenceIdSchema,
    date: z.string().min(1).max(40),
    title: z.string().min(1).max(100),
    summary: z.string().min(1).max(400),
    visual: z.enum(["portrait", "map", "fracture", "tetrarchy", "city", "continuity"]),
    sourceIds: z.array(z.string().min(1)).min(1).max(4),
  })
  .strict();
export type RomanReferenceEssayEvidence = z.infer<typeof RomanReferenceEssayEvidenceSchema>;

export const RomanReferenceEssayRubricSchema = z
  .object({
    id: RomanReferenceEssayRubricIdSchema,
    label: z.string().min(1).max(80),
    description: z.string().min(1).max(300),
  })
  .strict();
export type RomanReferenceEssayRubric = z.infer<typeof RomanReferenceEssayRubricSchema>;

export const RomanReferenceEssayDimensionSchema = z
  .object({
    id: RomanReferenceEssayRubricIdSchema,
    label: z.string().min(1).max(80),
    status: z.enum(["met", "developing", "missing"]),
    comment: z.string().min(1).max(800),
    excerpt: z.string().min(1).max(500).nullable(),
  })
  .strict();
export type RomanReferenceEssayDimension = z.infer<typeof RomanReferenceEssayDimensionSchema>;

export const RomanReferenceEssayFeedbackSchema = z
  .object({
    revision: z.number().int().positive(),
    submittedAt: z.string().datetime(),
    wordCount: z.number().int().nonnegative(),
    content: z.string().max(100_000),
    summary: z.string().min(1).max(1_200),
    nextStep: z.string().min(1).max(800),
    dimensions: z.array(RomanReferenceEssayDimensionSchema).length(5),
    usedEvidenceIds: z.array(RomanReferenceEssayEvidenceIdSchema).max(6),
  })
  .strict();
export type RomanReferenceEssayFeedback = z.infer<typeof RomanReferenceEssayFeedbackSchema>;

const RomanReferenceEssayStateSchema = z
  .object({
    draft: z.string().max(100_000),
    claimPlan: z.string().max(2_000),
    evidencePlan: z
      .array(RomanReferenceEssayEvidenceIdSchema)
      .max(6)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Each evidence item may be selected once.",
      }),
    complicationPlan: z.string().max(2_000),
    status: z.enum(["editing", "submitted"]),
    mode: TutoringModeSchema.nullable(),
    sourcesOpened: z.boolean(),
    submissions: z.array(RomanReferenceEssayFeedbackSchema).max(10),
    finished: z.boolean(),
  })
  .strict()
  .superRefine((essay, context) => {
    essay.submissions.forEach((submission, index) => {
      if (submission.revision !== index + 1) {
        context.addIssue({
          code: "custom",
          message: "Essay revisions must remain sequential.",
          path: ["submissions", index, "revision"],
        });
      }
    });
    if (essay.status === "submitted" && essay.submissions.length === 0) {
      context.addIssue({
        code: "custom",
        message: "A submitted essay must retain its feedback history.",
        path: ["submissions"],
      });
    }
    if (essay.finished && essay.status !== "submitted") {
      context.addIssue({
        code: "custom",
        message: "A finished essay must retain its final submitted revision.",
        path: ["finished"],
      });
    }
    if (essay.sourcesOpened && essay.mode === null) {
      context.addIssue({
        code: "custom",
        message: "Opening the evidence pack must lock a learning mode.",
        path: ["mode"],
      });
    }
    if (essay.mode === "exam" && essay.sourcesOpened) {
      context.addIssue({
        code: "custom",
        message: "Exam mode cannot retain source access.",
        path: ["sourcesOpened"],
      });
    }
  });
export type RomanReferenceEssayState = z.infer<typeof RomanReferenceEssayStateSchema>;

/** The recovery lesson has one essay. It is named so the tutor can be bound to it by identity. */
export const RomanReferenceEssayIdSchema = z.literal("transformation");
export type RomanReferenceEssayId = z.infer<typeof RomanReferenceEssayIdSchema>;

export const RomanReferenceEssayContentSchema = z
  .object({
    id: RomanReferenceEssayIdSchema,
    prompt: z.string().min(1).max(500),
    instruction: z.string().min(1).max(300),
    minWords: z.number().int().positive(),
    maxWords: z.number().int().positive(),
    rubric: z.array(RomanReferenceEssayRubricSchema).length(5),
    evidence: z.array(RomanReferenceEssayEvidenceSchema).max(6),
  })
  .strict();
export type RomanReferenceEssayContent = z.infer<typeof RomanReferenceEssayContentSchema>;

export const RomanReferenceEssayViewSchema = z
  .object({ content: RomanReferenceEssayContentSchema, progress: RomanReferenceEssayStateSchema })
  .strict();
export type RomanReferenceEssayView = z.infer<typeof RomanReferenceEssayViewSchema>;

function responsesAreEquivalent(
  left: RomanReferenceQuestionResponse | null,
  right: RomanReferenceQuestionResponse | null,
): boolean {
  if (left === null || right === null) return left === right;
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case "ordering":
      return (
        right.kind === "ordering" && left.order.every((id, index) => right.order[index] === id)
      );
    case "selection":
      return right.kind === "selection" && left.choiceId === right.choiceId;
    case "multi_select":
      return (
        right.kind === "multi_select" &&
        left.choiceIds.length === right.choiceIds.length &&
        left.choiceIds.every((id) => right.choiceIds.includes(id))
      );
    case "free_response":
      return right.kind === "free_response" && left.text === right.text;
  }
}

function responseMatchesQuestion(
  questionId: RomanReferenceQuestionId,
  response: RomanReferenceQuestionResponse,
): boolean {
  return (
    (questionId === "turning-points" && response.kind === "ordering") ||
    (questionId === "476-continuity" && response.kind === "selection") ||
    (questionId === "map-117" && response.kind === "multi_select") ||
    (questionId === "two-sentence" && response.kind === "free_response")
  );
}

const OpeningStateSchema = z
  .object({
    order: RomanReferenceOpeningOrderSchema,
    submittedOrder: RomanReferenceOpeningOrderSchema.nullable(),
    status: z.enum(["editing", "checked", "skipped"]),
    wasCorrect: z.boolean().nullable(),
  })
  .strict();

const AugustusStateSchema = z.object({ completed: z.boolean() }).strict();

const ExpansionStateSchema = z
  .object({
    milestoneId: RomanReferenceMilestoneIdSchema,
    answerOpen: z.boolean(),
    answer: z.string().max(2_000),
    saved: z.boolean(),
    completed: z.boolean(),
  })
  .strict();

const QuestionProgressListSchema = z.array(RomanReferenceQuestionProgressSchema).length(4);

const RomanReferenceStateObjectSchema = z
  .object({
    version: z.literal(4),
    opening: OpeningStateSchema,
    augustus: AugustusStateSchema,
    expansion: ExpansionStateSchema,
    questions: QuestionProgressListSchema,
    assessmentFinished: z.boolean(),
    essay: RomanReferenceEssayStateSchema,
    review: RomanReferenceReviewStateSchema,
  })
  .strict();

function validateOpeningAndExpansion(
  state: {
    opening: z.infer<typeof OpeningStateSchema>;
    expansion: z.infer<typeof ExpansionStateSchema>;
  },
  context: z.RefinementCtx,
): void {
  const openingHasSubmission = state.opening.submittedOrder !== null;
  const openingHasJudgement = state.opening.wasCorrect !== null;
  if (state.opening.status === "checked") {
    if (!openingHasSubmission) {
      context.addIssue({
        code: "custom",
        message: "A checked opening must retain the submitted order.",
        path: ["opening", "submittedOrder"],
      });
    }
    if (!openingHasJudgement) {
      context.addIssue({
        code: "custom",
        message: "A checked opening must retain its judgement.",
        path: ["opening", "wasCorrect"],
      });
    }
  } else {
    if (openingHasSubmission) {
      context.addIssue({
        code: "custom",
        message: "Only a checked opening may retain a submitted order.",
        path: ["opening", "submittedOrder"],
      });
    }
    if (openingHasJudgement) {
      context.addIssue({
        code: "custom",
        message: "Only a checked opening may retain its judgement.",
        path: ["opening", "wasCorrect"],
      });
    }
  }

  if (state.expansion.saved && !state.expansion.answerOpen) {
    context.addIssue({
      code: "custom",
      message: "A saved expansion response must remain open.",
      path: ["expansion", "answerOpen"],
    });
  }
  if (state.expansion.saved && state.expansion.answer.trim().length === 0) {
    context.addIssue({
      code: "custom",
      message: "A saved expansion response cannot be empty.",
      path: ["expansion", "answer"],
    });
  }
  if (
    state.expansion.completed &&
    (!state.expansion.saved || state.expansion.answer.trim() === "")
  ) {
    context.addIssue({
      code: "custom",
      message: "A completed expansion beat needs its saved learner response.",
      path: ["expansion", "completed"],
    });
  }
}

const QUESTION_ORDER: readonly RomanReferenceQuestionId[] = [
  "turning-points",
  "476-continuity",
  "map-117",
  "two-sentence",
];

function validateQuestionList(
  questions: readonly RomanReferenceQuestionProgress[],
  assessmentFinished: boolean,
  context: z.RefinementCtx,
): void {
  questions.forEach((question, index) => {
    if (question.id !== QUESTION_ORDER[index]) {
      context.addIssue({
        code: "custom",
        message: "Reference questions must retain their authored order.",
        path: ["questions", index, "id"],
      });
    }
  });
  if (assessmentFinished) {
    questions.forEach((question, index) => {
      if (
        question.status === "editing" ||
        question.result === null ||
        question.feedback === null ||
        !responsesAreEquivalent(question.draft, question.submittedResponse)
      ) {
        context.addIssue({
          code: "custom",
          message: "A finished assessment must retain each submitted response and its feedback.",
          path: ["questions", index],
        });
      }
    });
  }
}

export const RomanReferenceStateSchema = RomanReferenceStateObjectSchema.superRefine(
  (state, context) => {
    validateOpeningAndExpansion(state, context);
    validateQuestionList(state.questions, state.assessmentFinished, context);
    if (
      (state.review.mode !== null || state.review.draft !== "" || state.review.rating !== null) &&
      (!state.essay.finished ||
        !state.assessmentFinished ||
        !state.expansion.completed ||
        !state.augustus.completed ||
        state.opening.status === "editing")
    ) {
      context.addIssue({
        code: "custom",
        message: "Recall must follow the completed lesson.",
        path: ["review"],
      });
    }
  },
);
export type RomanReferenceState = z.infer<typeof RomanReferenceStateSchema>;

export const RomanReferenceV3StateSchema = RomanReferenceStateObjectSchema.omit({ review: true })
  .extend({ version: z.literal(3) })
  .superRefine((state, context) => {
    validateOpeningAndExpansion(state, context);
    validateQuestionList(state.questions, state.assessmentFinished, context);
  });

export const RomanReferenceProgressSchema = z
  .object({
    version: z.literal(4),
    opening: OpeningStateSchema,
    augustus: AugustusStateSchema,
    expansion: ExpansionStateSchema,
    questions: z.array(RomanReferenceQuestionViewSchema).length(4),
    essay: RomanReferenceEssayViewSchema,
    review: RomanReferenceReviewViewSchema,
    assessmentFinished: z.boolean(),
    activeBeat: RomanReferenceBeatSchema,
    activeQuestionId: RomanReferenceQuestionIdSchema.nullable(),
    updatedAt: z.string().datetime().nullable(),
  })
  .strict()
  .superRefine((progress, context) => {
    validateOpeningAndExpansion(progress, context);
    const questionProgress = progress.questions.map((question) => question.progress);
    validateQuestionList(questionProgress, progress.assessmentFinished, context);
    if ((progress.review.back !== null) !== progress.review.progress.revealed) {
      context.addIssue({
        code: "custom",
        message: "Only authorised recall reveal may include a card back.",
        path: ["review", "back"],
      });
    }
    const expectedBeat =
      progress.opening.status === "editing"
        ? "opening"
        : !progress.augustus.completed
          ? "augustus"
          : !progress.expansion.completed
            ? "expansion"
            : !progress.assessmentFinished
              ? "questions"
              : !progress.essay.progress.finished
                ? "essay"
                : progress.review.progress.rating === null
                  ? "recall"
                  : "complete";
    if (progress.activeBeat !== expectedBeat) {
      context.addIssue({
        code: "custom",
        message: "The active beat must match the earliest incomplete lesson beat.",
        path: ["activeBeat"],
      });
    }
    const earliestUnresolved = progress.assessmentFinished
      ? null
      : (questionProgress.find(
          (question) =>
            question.status === "editing" ||
            (question.mode === "exam"
              ? !responsesAreEquivalent(question.draft, question.submittedResponse)
              : question.status !== "revealed" && question.result !== "correct"),
        )?.id ?? null);
    const expectedActive = expectedBeat === "questions" ? earliestUnresolved : null;
    if (progress.activeQuestionId !== expectedActive) {
      context.addIssue({
        code: "custom",
        message: "The active question must be the earliest unresolved question.",
        path: ["activeQuestionId"],
      });
    }
  });
export type RomanReferenceProgress = z.infer<typeof RomanReferenceProgressSchema>;

const ReorderOpeningSchema = z
  .object({ action: z.literal("reorder_opening"), order: RomanReferenceOpeningOrderSchema })
  .strict();
const CheckOpeningSchema = z
  .object({ action: z.literal("check_opening"), order: RomanReferenceOpeningOrderSchema })
  .strict();
const SkipOpeningSchema = z
  .object({ action: z.literal("skip_opening"), order: RomanReferenceOpeningOrderSchema })
  .strict();
const CompleteAugustusSchema = z.object({ action: z.literal("complete_augustus") }).strict();
const SelectExpansionMilestoneSchema = z
  .object({
    action: z.literal("select_expansion_milestone"),
    milestoneId: RomanReferenceMilestoneIdSchema,
  })
  .strict();
const UpdateExpansionDraftSchema = z
  .object({
    action: z.literal("update_expansion_draft"),
    answerOpen: z.boolean(),
    answer: z.string().max(2_000),
  })
  .strict();
const SaveExpansionResponseSchema = z
  .object({ action: z.literal("save_expansion_response"), answer: z.string().max(2_000) })
  .strict()
  .refine((state) => state.answer.trim().length > 0, {
    message: "A response cannot be empty.",
    path: ["answer"],
  });
const CompleteExpansionSchema = z.object({ action: z.literal("complete_expansion") }).strict();
const UpdateQuestionDraftSchema = z
  .object({
    action: z.literal("update_question_draft"),
    questionId: RomanReferenceQuestionIdSchema,
    response: RomanReferenceQuestionResponseSchema,
  })
  .strict();
const SubmitQuestionSchema = z
  .object({
    action: z.literal("submit_question"),
    questionId: RomanReferenceQuestionIdSchema,
    response: RomanReferenceQuestionResponseSchema,
    mode: TutoringModeSchema,
  })
  .strict();
const RequestQuestionHintSchema = z
  .object({
    action: z.literal("request_question_hint"),
    questionId: RomanReferenceQuestionIdSchema,
    mode: TutoringModeSchema,
  })
  .strict();
const RevealQuestionSchema = z
  .object({
    action: z.literal("reveal_question"),
    questionId: RomanReferenceQuestionIdSchema,
    mode: TutoringModeSchema,
    reason: z.string().trim().min(20).max(500),
    confirmation: z.literal("show answer"),
  })
  .strict();
const AccessQuestionSourcesSchema = z
  .object({
    action: z.literal("access_question_sources"),
    questionId: RomanReferenceQuestionIdSchema,
    mode: TutoringModeSchema,
  })
  .strict();
const AccessQuestionTutorSchema = z
  .object({
    action: z.literal("access_question_tutor"),
    questionId: RomanReferenceQuestionIdSchema,
    mode: TutoringModeSchema,
  })
  .strict();
const FinishAssessmentSchema = z.object({ action: z.literal("finish_assessment") }).strict();
const UpdateEssayDraftSchema = z
  .object({
    action: z.literal("update_essay_draft"),
    draft: z.string().max(100_000),
    claimPlan: z.string().max(2_000),
    evidencePlan: z.array(RomanReferenceEssayEvidenceIdSchema).max(6),
    complicationPlan: z.string().max(2_000),
  })
  .strict()
  .refine((input) => new Set(input.evidencePlan).size === input.evidencePlan.length, {
    message: "Each evidence item may be selected once.",
    path: ["evidencePlan"],
  });
const AccessEssaySourcesSchema = z
  .object({ action: z.literal("access_essay_sources"), mode: TutoringModeSchema })
  .strict();
const AccessEssayTutorSchema = z
  .object({ action: z.literal("access_essay_tutor"), mode: TutoringModeSchema })
  .strict();
const SubmitEssayRevisionSchema = z
  .object({
    action: z.literal("submit_essay_revision"),
    content: z.string().max(100_000),
    mode: TutoringModeSchema,
  })
  .strict();
const StartEssayRevisionSchema = z.object({ action: z.literal("start_essay_revision") }).strict();
const FinishEssaySchema = z.object({ action: z.literal("finish_essay") }).strict();

export const RomanReferenceActionSchema = z.discriminatedUnion("action", [
  ReorderOpeningSchema,
  CheckOpeningSchema,
  SkipOpeningSchema,
  CompleteAugustusSchema,
  SelectExpansionMilestoneSchema,
  UpdateExpansionDraftSchema,
  SaveExpansionResponseSchema,
  CompleteExpansionSchema,
  UpdateQuestionDraftSchema,
  SubmitQuestionSchema,
  RequestQuestionHintSchema,
  RevealQuestionSchema,
  AccessQuestionSourcesSchema,
  AccessQuestionTutorSchema,
  FinishAssessmentSchema,
  UpdateEssayDraftSchema,
  AccessEssaySourcesSchema,
  AccessEssayTutorSchema,
  SubmitEssayRevisionSchema,
  StartEssayRevisionSchema,
  FinishEssaySchema,
  ...RomanReferenceReviewActionSchema.options,
]);
export type RomanReferenceAction = z.infer<typeof RomanReferenceActionSchema>;
