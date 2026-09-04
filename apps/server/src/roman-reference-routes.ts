import {
  type LessonResponse,
  type Question,
  type RomanReferenceAction,
  RomanReferenceActionSchema,
  type RomanReferenceEssayContent,
  type RomanReferenceEssayFeedback,
  type RomanReferenceEssayState,
  RomanReferenceMilestoneIdSchema,
  RomanReferenceOpeningOrderSchema,
  type RomanReferenceProgress,
  RomanReferenceProgressSchema,
  type RomanReferenceQuestionContent,
  type RomanReferenceQuestionHint,
  type RomanReferenceQuestionId,
  type RomanReferenceQuestionProgress,
  RomanReferenceQuestionProgressSchema,
  type RomanReferenceQuestionResponse,
  RomanReferenceQuestionResponseSchema,
  type RomanReferenceState,
  RomanReferenceStateSchema,
  type RomanReferenceTurningPointId,
  type TutoringMode,
} from "@discere/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lintText } from "@discere/writing-engine";
import type { ContentRepository } from "./content.js";
import type { DiscereStore } from "./db/store.js";
import { HttpError } from "./errors.js";
import {
  answerForRomanReferenceQuestion,
  assessRomanReferenceQuestion,
  hintForRomanReferenceQuestion,
  privateQuestionForRomanReference,
  ROMAN_REFERENCE_QUESTION_CONTENT,
  responseMatchesRomanReferenceQuestion,
  sourceIdsForRomanReferenceQuestion,
} from "./roman-reference-assessment.js";
import {
  assessRomanReferenceEssay,
  blankRomanReferenceEssay,
  ROMAN_REFERENCE_ESSAY_CONTENT,
  ROMAN_REFERENCE_ESSAY_SOURCE_IDS,
  romanReferenceEssayFeedbackProse,
} from "./roman-reference-essay.js";

const ROMAN_REFERENCE_PATH =
  "/api/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/progress";

/**
 * No colon: legacy catalogue progress treats `courseId:lessonId` as course evidence. This row is
 * only the isolated reference journey and must never create XP, mastery, streak or completion.
 */
export const ROMAN_REFERENCE_JOURNEY_ID = "recovery-v2/roman-empire/rise-of-the-roman-empire";
export const ROMAN_REFERENCE_STATE_STAGE_ID = "reference-state";
export const ROMAN_REFERENCE_LESSON_ID = "rise-of-the-roman-empire";

const REFERENCE_STAGE_ORDER = [ROMAN_REFERENCE_STATE_STAGE_ID];
const StoredUpdatedAtSchema = z.string().datetime();

const CORRECT_OPENING_ORDER = [
  "augustus",
  "extent",
  "division",
  "deposition",
] as const satisfies readonly RomanReferenceTurningPointId[];

const DEFAULT_OPENING_ORDER = [
  "extent",
  "deposition",
  "augustus",
  "division",
] as const satisfies readonly RomanReferenceTurningPointId[];

const QUESTION_ORDER = [
  "turning-points",
  "476-continuity",
  "map-117",
  "two-sentence",
] as const satisfies readonly RomanReferenceQuestionId[];

const RomanReferenceV1StateSchema = z
  .object({
    version: z.literal(1),
    opening: z
      .object({
        order: RomanReferenceOpeningOrderSchema,
        submittedOrder: RomanReferenceOpeningOrderSchema.nullable(),
        status: z.enum(["editing", "checked", "skipped"]),
        wasCorrect: z.boolean().nullable(),
      })
      .strict(),
    augustus: z.object({ completed: z.boolean() }).strict(),
    expansion: z
      .object({
        milestoneId: RomanReferenceMilestoneIdSchema,
        answerOpen: z.boolean(),
        answer: z.string().max(2_000),
        saved: z.boolean(),
      })
      .strict(),
  })
  .strict()
  .superRefine((state, context) => {
    if (
      state.expansion.saved &&
      (!state.expansion.answerOpen || state.expansion.answer.trim() === "")
    ) {
      context.addIssue({
        code: "custom",
        message: "A saved v1 expansion response must be open and nonblank.",
        path: ["expansion", "saved"],
      });
    }
  });
type RomanReferenceV1State = z.infer<typeof RomanReferenceV1StateSchema>;
const RomanReferenceV2StateSchema = z
  .object({
    version: z.literal(2),
    opening: z
      .object({
        order: RomanReferenceOpeningOrderSchema,
        submittedOrder: RomanReferenceOpeningOrderSchema.nullable(),
        status: z.enum(["editing", "checked", "skipped"]),
        wasCorrect: z.boolean().nullable(),
      })
      .strict(),
    augustus: z.object({ completed: z.boolean() }).strict(),
    expansion: z
      .object({
        milestoneId: RomanReferenceMilestoneIdSchema,
        answerOpen: z.boolean(),
        answer: z.string().max(2_000),
        saved: z.boolean(),
        completed: z.boolean(),
      })
      .strict(),
    questions: z.array(RomanReferenceQuestionProgressSchema).length(4),
    assessmentFinished: z.boolean(),
  })
  .strict();
type RomanReferenceV2State = z.infer<typeof RomanReferenceV2StateSchema>;

function blankQuestion(id: RomanReferenceQuestionId): RomanReferenceQuestionProgress {
  return {
    id,
    draft: id === "turning-points" ? { kind: "ordering", order: [...DEFAULT_OPENING_ORDER] } : null,
    submittedResponse: null,
    status: "editing",
    result: null,
    feedback: null,
    mode: null,
    hints: [],
    revealedAnswer: null,
  };
}

function defaultState(): RomanReferenceState {
  return RomanReferenceStateSchema.parse({
    version: 3,
    opening: {
      order: [...DEFAULT_OPENING_ORDER],
      submittedOrder: null,
      status: "editing",
      wasCorrect: null,
    },
    augustus: { completed: false },
    expansion: {
      milestoneId: "117-ce",
      answerOpen: false,
      answer: "",
      saved: false,
      completed: false,
    },
    questions: QUESTION_ORDER.map(blankQuestion),
    assessmentFinished: false,
    essay: blankRomanReferenceEssay(),
  });
}

function upgradeV1(state: RomanReferenceV1State): RomanReferenceState {
  return RomanReferenceStateSchema.parse({
    version: 3,
    opening: {
      ...state.opening,
      order: [...state.opening.order],
      submittedOrder:
        state.opening.submittedOrder === null ? null : [...state.opening.submittedOrder],
    },
    augustus: { ...state.augustus },
    expansion: { ...state.expansion, completed: false },
    questions: QUESTION_ORDER.map(blankQuestion),
    assessmentFinished: false,
    essay: blankRomanReferenceEssay(),
  });
}

function upgradeV2(state: RomanReferenceV2State): RomanReferenceState {
  return RomanReferenceStateSchema.parse({
    ...state,
    version: 3,
    opening: {
      ...state.opening,
      order: [...state.opening.order],
      submittedOrder:
        state.opening.submittedOrder === null ? null : [...state.opening.submittedOrder],
    },
    augustus: { ...state.augustus },
    expansion: { ...state.expansion },
    questions: state.questions.map((question) => ({
      ...question,
      hints: [...question.hints],
    })),
    essay: blankRomanReferenceEssay(),
  });
}

function isCorrectOrder(order: readonly RomanReferenceTurningPointId[]): boolean {
  return CORRECT_OPENING_ORDER.every((item, index) => order[index] === item);
}

function ordersMatch(
  left: readonly RomanReferenceTurningPointId[],
  right: readonly RomanReferenceTurningPointId[],
): boolean {
  return left.every((item, index) => right[index] === item);
}

function openingIsServerConsistent(
  state: RomanReferenceV1State | RomanReferenceV2State | RomanReferenceState,
): boolean {
  const { opening } = state;
  if (opening.status === "checked") {
    return (
      opening.submittedOrder !== null &&
      opening.wasCorrect !== null &&
      isCorrectOrder(opening.order) &&
      opening.wasCorrect === isCorrectOrder(opening.submittedOrder)
    );
  }
  return opening.submittedOrder === null && opening.wasCorrect === null;
}

function responsesMatch(
  left: RomanReferenceQuestionResponse | null,
  right: RomanReferenceQuestionResponse | null,
): boolean {
  if (left === null || right === null) return left === right;
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case "ordering":
      return right.kind === "ordering" && ordersMatch(left.order, right.order);
    case "selection":
      return right.kind === "selection" && left.choiceId === right.choiceId;
    case "multi_select":
      return (
        right.kind === "multi_select" &&
        left.choiceIds.length === right.choiceIds.length &&
        left.choiceIds.every((choiceId) => right.choiceIds.includes(choiceId))
      );
    case "free_response":
      return right.kind === "free_response" && left.text === right.text;
  }
}

function hintsAreServerConsistent(question: RomanReferenceQuestionProgress): boolean {
  if (question.hints.length === 0) return true;
  const mode = question.mode;
  if (
    question.submittedResponse === null ||
    question.status === "editing" ||
    mode === null ||
    mode === "exam" ||
    mode === "direct"
  ) {
    return false;
  }
  return question.hints.every((hint, index) => {
    const expected = hintForRomanReferenceQuestion(question.id, mode, index);
    return expected !== null && expected.level === hint.level && expected.text === hint.text;
  });
}

function questionsAreServerConsistent(state: RomanReferenceV2State | RomanReferenceState): boolean {
  return state.questions.every((question) => {
    if (!hintsAreServerConsistent(question)) return false;
    if (
      question.submittedResponse?.kind === "multi_select" &&
      question.submittedResponse.choiceIds.length !== 2
    ) {
      return false;
    }
    if (question.status === "editing")
      return question.result === null && question.feedback === null;
    if (question.submittedResponse === null || question.mode === null) return false;
    if (
      (state.assessmentFinished ||
        question.status === "revealed" ||
        question.result === "correct") &&
      !responsesMatch(question.draft, question.submittedResponse)
    ) {
      return false;
    }

    const expected = assessRomanReferenceQuestion(question.id, question.submittedResponse);
    const feedbackDeferred = question.mode === "exam" && !state.assessmentFinished;
    if (feedbackDeferred) {
      if (question.result !== null || question.feedback !== null) return false;
    } else if (question.result !== expected.result || question.feedback !== expected.feedback) {
      return false;
    }

    if (question.status === "revealed") {
      return responsesMatch(question.revealedAnswer, answerForRomanReferenceQuestion(question.id));
    }
    return question.revealedAnswer === null;
  });
}

function essayIsServerConsistent(essay: RomanReferenceEssayState): boolean {
  if (essay.submissions.length === 0) {
    return essay.status === "editing" && !essay.finished;
  }
  if (essay.mode === null) return false;
  const historyIsValid = essay.submissions.every((submission) => {
    const expected = assessRomanReferenceEssay({
      content: submission.content,
      revision: submission.revision,
      submittedAt: submission.submittedAt,
    });
    return JSON.stringify(submission) === JSON.stringify(expected);
  });
  if (!historyIsValid) return false;
  const latest = essay.submissions.at(-1);
  if (essay.status === "submitted" && latest?.content !== essay.draft) return false;
  return !essay.finished || essay.status === "submitted";
}

function stateIsServerConsistent(state: RomanReferenceState): boolean {
  return (
    openingIsServerConsistent(state) &&
    questionsAreServerConsistent(state) &&
    essayIsServerConsistent(state.essay)
  );
}

interface StoredReferenceState {
  state: RomanReferenceState;
  updatedAt: string | null;
  requiresPersistence: boolean;
}

function readStoredState(store: DiscereStore): StoredReferenceState {
  const progress = store.getJourneyProgress(ROMAN_REFERENCE_JOURNEY_ID, REFERENCE_STAGE_ORDER);
  const row = progress.stages[0];
  if (row?.state !== "active") {
    return { state: defaultState(), updatedAt: null, requiresPersistence: false };
  }
  if (!StoredUpdatedAtSchema.safeParse(row.updatedAt).success) {
    return { state: defaultState(), updatedAt: null, requiresPersistence: true };
  }

  const v3 = RomanReferenceStateSchema.safeParse(row.interactionState);
  if (v3.success && stateIsServerConsistent(v3.data)) {
    return { state: v3.data, updatedAt: row.updatedAt, requiresPersistence: false };
  }

  const v2 = RomanReferenceV2StateSchema.safeParse(row.interactionState);
  if (v2.success && openingIsServerConsistent(v2.data) && questionsAreServerConsistent(v2.data)) {
    try {
      return { state: upgradeV2(v2.data), updatedAt: row.updatedAt, requiresPersistence: true };
    } catch {
      // A shape-valid but impossible legacy row falls through to the stable default.
    }
  }

  const v1 = RomanReferenceV1StateSchema.safeParse(row.interactionState);
  if (v1.success && openingIsServerConsistent(v1.data)) {
    return { state: upgradeV1(v1.data), updatedAt: row.updatedAt, requiresPersistence: true };
  }
  return { state: defaultState(), updatedAt: null, requiresPersistence: true };
}

function questionIsUnresolved(
  question: RomanReferenceQuestionProgress,
  assessmentFinished: boolean,
): boolean {
  if (assessmentFinished) return false;
  if (question.status === "editing") return true;
  if (question.status === "revealed" || question.result === "correct") return false;
  return question.mode !== "exam" || !responsesMatch(question.draft, question.submittedResponse);
}

function activeBeat(state: RomanReferenceState): RomanReferenceProgress["activeBeat"] {
  if (state.opening.status === "editing") return "opening";
  if (!state.augustus.completed) return "augustus";
  if (!state.expansion.completed) return "expansion";
  return state.assessmentFinished ? "essay" : "questions";
}

function activeQuestionId(state: RomanReferenceState): RomanReferenceQuestionId | null {
  return (
    state.questions.find((question) => questionIsUnresolved(question, state.assessmentFinished))
      ?.id ?? null
  );
}

function responseFor(state: RomanReferenceState, updatedAt: string | null): RomanReferenceProgress {
  const beat = activeBeat(state);
  return RomanReferenceProgressSchema.parse({
    ...state,
    questions: state.questions.map((progress, index) => ({
      content: ROMAN_REFERENCE_QUESTION_CONTENT[index],
      progress,
    })),
    essay: {
      content: {
        ...ROMAN_REFERENCE_ESSAY_CONTENT,
        evidence:
          state.essay.sourcesOpened && state.essay.mode !== "exam"
            ? ROMAN_REFERENCE_ESSAY_CONTENT.evidence
            : [],
      },
      progress: state.essay,
    },
    activeBeat: beat,
    activeQuestionId: beat === "questions" ? activeQuestionId(state) : null,
    updatedAt,
  });
}

function openingAlreadyResolved(): never {
  throw new HttpError(
    409,
    "The opening challenge has already been resolved.",
    "OPENING_ALREADY_RESOLVED",
  );
}

function expansionAlreadyCompleted(): never {
  throw new HttpError(
    409,
    "The expansion response has already been completed.",
    "EXPANSION_ALREADY_COMPLETED",
  );
}

function questionAlreadyResolved(): never {
  throw new HttpError(409, "This question is already resolved.", "QUESTION_ALREADY_RESOLVED");
}

function questionAt(
  state: RomanReferenceState,
  questionId: RomanReferenceQuestionId,
): { index: number; question: RomanReferenceQuestionProgress } {
  const index = state.questions.findIndex((question) => question.id === questionId);
  const question = state.questions[index];
  if (index < 0 || question === undefined) {
    throw new HttpError(404, "Reference question not found.", "QUESTION_NOT_FOUND");
  }
  return { index, question };
}

function replaceQuestion(
  state: RomanReferenceState,
  index: number,
  question: RomanReferenceQuestionProgress,
): RomanReferenceState {
  return {
    ...state,
    questions: state.questions.map((current, currentIndex) =>
      currentIndex === index ? question : current,
    ),
  };
}

function assertResponseMatches(
  questionId: RomanReferenceQuestionId,
  response: RomanReferenceQuestionResponse,
): void {
  if (!responseMatchesRomanReferenceQuestion(questionId, response)) {
    throw new HttpError(
      400,
      "The response does not match this reference question.",
      "QUESTION_RESPONSE_MISMATCH",
    );
  }
}

function assertSubmittableResponse(
  questionId: RomanReferenceQuestionId,
  response: RomanReferenceQuestionResponse,
): void {
  assertResponseMatches(questionId, response);
  if (
    questionId === "map-117" &&
    response.kind === "multi_select" &&
    response.choiceIds.length !== 2
  ) {
    throw new HttpError(400, "Select exactly two regions before checking.", "MAP_SELECTION_COUNT");
  }
}

function assertModeMatches(question: RomanReferenceQuestionProgress, mode: TutoringMode): void {
  if (question.mode !== null && question.mode !== mode) {
    throw new HttpError(
      409,
      `This question is locked to ${question.mode} mode.`,
      "QUESTION_MODE_LOCKED",
    );
  }
}

function lockMode(
  question: RomanReferenceQuestionProgress,
  mode: TutoringMode,
): RomanReferenceQuestionProgress {
  assertModeMatches(question, mode);
  return question.mode === null ? { ...question, mode } : question;
}

function questionIsTerminal(
  state: RomanReferenceState,
  question: RomanReferenceQuestionProgress,
): boolean {
  return (
    state.assessmentFinished || question.status === "revealed" || question.result === "correct"
  );
}

function cloneResponse(response: RomanReferenceQuestionResponse): RomanReferenceQuestionResponse {
  return RomanReferenceQuestionResponseSchema.parse(response);
}
function essayWordCount(content: string): number {
  const trimmed = content.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

function assertEssayMode(essay: RomanReferenceEssayState, mode: TutoringMode): void {
  if (essay.mode !== null && essay.mode !== mode) {
    throw new HttpError(409, `This essay is locked to ${essay.mode} mode.`, "ESSAY_MODE_LOCKED");
  }
}

function lockEssayMode(
  essay: RomanReferenceEssayState,
  mode: TutoringMode,
): RomanReferenceEssayState {
  assertEssayMode(essay, mode);
  return essay.mode === null ? { ...essay, mode } : essay;
}

function applyAction(
  current: RomanReferenceState,
  action: RomanReferenceAction,
  submittedAt: string,
): RomanReferenceState {
  switch (action.action) {
    case "reorder_opening": {
      if (current.opening.status !== "editing") openingAlreadyResolved();
      if (ordersMatch(current.opening.order, action.order)) return current;
      return { ...current, opening: { ...current.opening, order: [...action.order] } };
    }
    case "check_opening": {
      if (
        current.opening.status === "checked" &&
        current.opening.submittedOrder !== null &&
        ordersMatch(current.opening.submittedOrder, action.order)
      ) {
        return current;
      }
      if (current.opening.status !== "editing") openingAlreadyResolved();
      return {
        ...current,
        opening: {
          order: [...CORRECT_OPENING_ORDER],
          submittedOrder: [...action.order],
          status: "checked",
          wasCorrect: isCorrectOrder(action.order),
        },
      };
    }
    case "skip_opening": {
      if (
        current.opening.status === "skipped" &&
        ordersMatch(current.opening.order, action.order)
      ) {
        return current;
      }
      if (current.opening.status !== "editing") openingAlreadyResolved();
      return {
        ...current,
        opening: {
          order: [...action.order],
          submittedOrder: null,
          status: "skipped",
          wasCorrect: null,
        },
      };
    }
    case "complete_augustus":
      return current.augustus.completed ? current : { ...current, augustus: { completed: true } };
    case "select_expansion_milestone":
      if (current.expansion.completed) {
        if (current.expansion.milestoneId === action.milestoneId) return current;
        expansionAlreadyCompleted();
      }
      return current.expansion.milestoneId === action.milestoneId
        ? current
        : {
            ...current,
            expansion: { ...current.expansion, milestoneId: action.milestoneId },
          };
    case "update_expansion_draft":
      if (current.expansion.completed) expansionAlreadyCompleted();
      if (
        current.expansion.answerOpen === action.answerOpen &&
        current.expansion.answer === action.answer &&
        !current.expansion.saved
      ) {
        return current;
      }
      return {
        ...current,
        expansion: {
          ...current.expansion,
          answerOpen: action.answerOpen,
          answer: action.answer,
          saved: false,
        },
      };
    case "save_expansion_response":
      if (current.expansion.completed) {
        if (current.expansion.answer === action.answer && current.expansion.saved) return current;
        expansionAlreadyCompleted();
      }
      if (
        current.expansion.answer === action.answer &&
        current.expansion.answerOpen &&
        current.expansion.saved
      ) {
        return current;
      }
      return {
        ...current,
        expansion: {
          ...current.expansion,
          answerOpen: true,
          answer: action.answer,
          saved: true,
        },
      };
    case "complete_expansion":
      if (current.expansion.completed) return current;
      if (!current.expansion.saved || current.expansion.answer.trim() === "") {
        throw new HttpError(
          409,
          "Save a response before completing this page.",
          "EXPANSION_RESPONSE_REQUIRED",
        );
      }
      return { ...current, expansion: { ...current.expansion, completed: true } };
    case "update_question_draft": {
      assertResponseMatches(action.questionId, action.response);
      const { index, question } = questionAt(current, action.questionId);
      if (questionIsTerminal(current, question)) {
        if (responsesMatch(question.draft, action.response)) return current;
        questionAlreadyResolved();
      }
      if (responsesMatch(question.draft, action.response)) return current;
      return replaceQuestion(current, index, {
        ...question,
        draft: cloneResponse(action.response),
      });
    }
    case "submit_question": {
      assertSubmittableResponse(action.questionId, action.response);
      const { index, question } = questionAt(current, action.questionId);
      assertModeMatches(question, action.mode);
      if (questionIsTerminal(current, question)) {
        if (responsesMatch(question.submittedResponse, action.response)) return current;
        questionAlreadyResolved();
      }
      if (
        question.status !== "editing" &&
        responsesMatch(question.submittedResponse, action.response) &&
        responsesMatch(question.draft, action.response)
      ) {
        return current;
      }
      const response = cloneResponse(action.response);
      const assessed =
        action.mode === "exam"
          ? { result: null, feedback: null }
          : assessRomanReferenceQuestion(action.questionId, response);
      return replaceQuestion(current, index, {
        ...lockMode(question, action.mode),
        draft: response,
        submittedResponse: response,
        status: "submitted",
        result: assessed.result,
        feedback: assessed.feedback,
        revealedAnswer: null,
      });
    }
    case "request_question_hint": {
      const { index, question } = questionAt(current, action.questionId);
      assertModeMatches(question, action.mode);
      if (action.mode === "exam") {
        throw new HttpError(403, "Hints are unavailable in Exam mode.", "EXAM_GUARDRAIL");
      }
      if (action.mode === "direct") {
        throw new HttpError(
          403,
          "Direct mode uses the answer-reveal confirmation instead of hints.",
          "DIRECT_REVEAL_REQUIRED",
        );
      }
      if (question.submittedResponse === null || question.status === "editing") {
        throw new HttpError(
          409,
          "Submit an attempt before requesting a hint.",
          "INITIAL_ATTEMPT_REQUIRED",
        );
      }
      if (questionIsTerminal(current, question)) questionAlreadyResolved();
      const hint = hintForRomanReferenceQuestion(
        action.questionId,
        action.mode,
        question.hints.length,
      );
      if (hint === null) {
        throw new HttpError(409, "No further hint is available.", "HINTS_EXHAUSTED");
      }
      return replaceQuestion(current, index, {
        ...lockMode(question, action.mode),
        hints: [...question.hints, hint],
      });
    }
    case "reveal_question": {
      const { index, question } = questionAt(current, action.questionId);
      assertModeMatches(question, action.mode);
      if (action.mode === "exam") {
        throw new HttpError(403, "Answers are unavailable in Exam mode.", "EXAM_GUARDRAIL");
      }
      if (action.mode !== "direct") {
        throw new HttpError(
          403,
          "Answer reveal is only available in Direct mode.",
          "DIRECT_MODE_REQUIRED",
        );
      }
      if (question.status === "revealed") return current;
      if (question.submittedResponse === null || question.status === "editing") {
        throw new HttpError(
          409,
          "Submit an attempt before revealing the answer.",
          "INITIAL_ATTEMPT_REQUIRED",
        );
      }
      return replaceQuestion(current, index, {
        ...lockMode(question, action.mode),
        status: "revealed",
        revealedAnswer: answerForRomanReferenceQuestion(action.questionId),
      });
    }
    case "access_question_sources": {
      const { index, question } = questionAt(current, action.questionId);
      assertModeMatches(question, action.mode);
      if (action.mode === "exam") {
        throw new HttpError(403, "Sources are unavailable in Exam mode.", "EXAM_GUARDRAIL");
      }
      const locked = lockMode(question, action.mode);
      return locked === question ? current : replaceQuestion(current, index, locked);
    }
    case "access_question_tutor": {
      const { index, question } = questionAt(current, action.questionId);
      assertModeMatches(question, action.mode);
      if (action.mode === "exam") {
        throw new HttpError(403, "Tutor assistance is unavailable in Exam mode.", "EXAM_GUARDRAIL");
      }
      if (action.mode === "direct" && question.status !== "revealed") {
        throw new HttpError(
          409,
          "Confirm the Direct answer reveal before asking for the answer.",
          "DIRECT_REVEAL_REQUIRED",
        );
      }
      const locked = lockMode(question, action.mode);
      return locked === question ? current : replaceQuestion(current, index, locked);
    }
    case "finish_assessment": {
      if (current.assessmentFinished) return current;
      if (current.questions.some((question) => question.submittedResponse === null)) {
        throw new HttpError(
          409,
          "Submit all four responses before finishing the assessment.",
          "ASSESSMENT_INCOMPLETE",
        );
      }
      const unsentDraft = current.questions.find(
        (question) => !responsesMatch(question.draft, question.submittedResponse),
      );
      if (unsentDraft) {
        throw new HttpError(
          409,
          "Check the revised response before finishing the assessment.",
          "UNSUBMITTED_QUESTION_DRAFT",
        );
      }
      return {
        ...current,
        assessmentFinished: true,
        questions: current.questions.map((question) => {
          const response = question.submittedResponse;
          if (response === null) throw new Error("Finished assessment lost a response.");
          const assessed = assessRomanReferenceQuestion(question.id, response);
          return { ...question, result: assessed.result, feedback: assessed.feedback };
        }),
      };
    }
    case "update_essay_draft": {
      if (current.essay.finished) {
        throw new HttpError(409, "The final essay is read-only.", "ESSAY_FINISHED");
      }
      if (current.essay.status === "submitted") {
        const unchanged =
          current.essay.draft === action.draft &&
          current.essay.claimPlan === action.claimPlan &&
          JSON.stringify(current.essay.evidencePlan) === JSON.stringify(action.evidencePlan) &&
          current.essay.complicationPlan === action.complicationPlan;
        if (unchanged) return current;
        throw new HttpError(
          409,
          "Start a revision before changing the submitted essay.",
          "ESSAY_REVISION_REQUIRED",
        );
      }
      return {
        ...current,
        essay: {
          ...current.essay,
          draft: action.draft,
          claimPlan: action.claimPlan,
          evidencePlan: [...action.evidencePlan],
          complicationPlan: action.complicationPlan,
        },
      };
    }
    case "access_essay_sources": {
      assertEssayMode(current.essay, action.mode);
      if (action.mode === "exam") {
        throw new HttpError(
          403,
          "Evidence sources are unavailable in Exam mode.",
          "EXAM_GUARDRAIL",
        );
      }
      const essay = lockEssayMode(current.essay, action.mode);
      return essay.sourcesOpened
        ? current
        : { ...current, essay: { ...essay, sourcesOpened: true } };
    }
    case "access_essay_tutor": {
      assertEssayMode(current.essay, action.mode);
      if (action.mode === "exam") {
        throw new HttpError(403, "Tutor assistance is unavailable in Exam mode.", "EXAM_GUARDRAIL");
      }
      const essay = lockEssayMode(current.essay, action.mode);
      return essay === current.essay ? current : { ...current, essay };
    }
    case "submit_essay_revision": {
      if (!current.assessmentFinished) {
        throw new HttpError(
          409,
          "Finish the four questions before submitting the essay.",
          "ASSESSMENT_INCOMPLETE",
        );
      }
      assertEssayMode(current.essay, action.mode);
      if (current.essay.finished) {
        const latest = current.essay.submissions.at(-1);
        if (latest?.content === action.content) return current;
        throw new HttpError(409, "The final essay is read-only.", "ESSAY_FINISHED");
      }
      if (current.essay.status === "submitted") {
        const latest = current.essay.submissions.at(-1);
        if (latest?.content === action.content) return current;
        throw new HttpError(
          409,
          "Start a revision before submitting new writing.",
          "ESSAY_REVISION_REQUIRED",
        );
      }
      const words = essayWordCount(action.content);
      if (words < ROMAN_REFERENCE_ESSAY_CONTENT.minWords) {
        throw new HttpError(
          400,
          `Write at least ${ROMAN_REFERENCE_ESSAY_CONTENT.minWords} words before submitting.`,
          "ESSAY_TOO_SHORT",
        );
      }
      if (words > ROMAN_REFERENCE_ESSAY_CONTENT.maxWords) {
        throw new HttpError(
          400,
          `Keep the essay within ${ROMAN_REFERENCE_ESSAY_CONTENT.maxWords} words.`,
          "ESSAY_TOO_LONG",
        );
      }
      const feedback = assessRomanReferenceEssay({
        content: action.content,
        revision: current.essay.submissions.length + 1,
        submittedAt,
      });
      return {
        ...current,
        essay: {
          ...lockEssayMode(current.essay, action.mode),
          draft: action.content,
          status: "submitted",
          submissions: [...current.essay.submissions, feedback],
        },
      };
    }
    case "start_essay_revision": {
      if (current.essay.finished) {
        throw new HttpError(409, "The final essay is read-only.", "ESSAY_FINISHED");
      }
      if (current.essay.status === "editing") return current;
      return { ...current, essay: { ...current.essay, status: "editing" } };
    }
    case "finish_essay": {
      if (current.essay.finished) return current;
      if (current.essay.status !== "submitted") {
        throw new HttpError(
          409,
          "Submit the current revision before finishing.",
          "ESSAY_SUBMISSION_REQUIRED",
        );
      }
      return { ...current, essay: { ...current.essay, finished: true } };
    }
  }
}

function saveState(store: DiscereStore, state: RomanReferenceState): RomanReferenceProgress {
  const saved = store.saveStageProgress(
    ROMAN_REFERENCE_JOURNEY_ID,
    REFERENCE_STAGE_ORDER,
    {
      stageId: ROMAN_REFERENCE_STATE_STAGE_ID,
      state: "active",
      interactionState: state,
    },
    // This persistence row is not learner evidence and therefore receives no stage type or XP.
    undefined,
  );
  return responseFor(state, saved.stages[0]?.updatedAt ?? null);
}

export interface RomanReferenceTutorLearnerContext {
  referenceQuestionId: RomanReferenceQuestionId;
  content: RomanReferenceQuestionContent;
  submittedResponse: RomanReferenceQuestionResponse | null;
  earnedHints: readonly RomanReferenceQuestionHint[];
}

export interface RomanReferenceTutorResolution {
  mode: Exclude<TutoringMode, "exam">;
  question: Question;
  learnerContext: RomanReferenceTutorLearnerContext;
  sourceIds: readonly string[];
}

function lessonNarrowedToSources(
  content: ContentRepository,
  sourceIds: readonly string[],
): LessonResponse {
  const lesson = content.getLesson(ROMAN_REFERENCE_LESSON_ID, "roman-empire");
  const bundle = content.bundle("roman-empire");
  if (!lesson || !bundle) {
    throw new HttpError(404, "Roman reference lesson not found.", "LESSON_NOT_FOUND");
  }
  const sources = sourceIds.map((sourceId) => {
    const source = bundle.sources.find((candidate) => candidate.id === sourceId);
    if (!source) throw new Error(`Missing Roman reference source '${sourceId}'.`);
    return source;
  });
  return {
    ...lesson,
    lesson: { ...lesson.lesson, sourceIds: [...sourceIds] },
    sources,
  };
}

export function lessonForRomanReferenceTutor(
  content: ContentRepository,
  questionId: RomanReferenceQuestionId,
): LessonResponse {
  return lessonNarrowedToSources(content, sourceIdsForRomanReferenceQuestion(questionId));
}

/** The essay draws on the whole evidence pack, so its tutor is given the whole pack and no more. */
export function lessonForRomanReferenceEssayTutor(content: ContentRepository): LessonResponse {
  return lessonNarrowedToSources(content, ROMAN_REFERENCE_ESSAY_SOURCE_IDS);
}

/** Server-only bridge used by both direct generation and companion import. */
export function resolveRomanReferenceTutorQuestion(
  store: DiscereStore,
  input: { referenceQuestionId: RomanReferenceQuestionId; mode: TutoringMode },
): RomanReferenceTutorResolution {
  const stored = readStoredState(store);
  const { question } = questionAt(stored.state, input.referenceQuestionId);
  if (question.mode === null) {
    throw new HttpError(
      409,
      "Open tutor help from this question before asking.",
      "QUESTION_MODE_NOT_LOCKED",
    );
  }
  assertModeMatches(question, input.mode);
  if (question.mode === "exam") {
    throw new HttpError(403, "Tutor assistance is unavailable in Exam mode.", "EXAM_GUARDRAIL");
  }
  if (question.mode === "direct" && question.status !== "revealed") {
    throw new HttpError(
      409,
      "Confirm the Direct answer reveal before asking for the answer.",
      "DIRECT_REVEAL_REQUIRED",
    );
  }
  const content = ROMAN_REFERENCE_QUESTION_CONTENT.find(
    (item) => item.id === input.referenceQuestionId,
  );
  if (!content)
    throw new Error(`Missing public reference question '${input.referenceQuestionId}'.`);
  return {
    mode: question.mode,
    question: privateQuestionForRomanReference(input.referenceQuestionId),
    learnerContext: {
      referenceQuestionId: input.referenceQuestionId,
      content,
      submittedResponse: question.submittedResponse,
      earnedHints: question.hints,
    },
    sourceIds: sourceIdsForRomanReferenceQuestion(input.referenceQuestionId),
  };
}

export interface RomanReferenceEssayTutorContext {
  essayId: RomanReferenceEssayContent["id"];
  content: RomanReferenceEssayContent;
  /** What the learner has written so far, so the tutor responds to this draft and not a hypothesis. */
  draft: string;
  claimPlan: string;
  evidencePlan: readonly string[];
  complicationPlan: string;
  status: RomanReferenceEssayState["status"];
  revisions: number;
  /** The rubric result the learner is currently acting on, absent before the first submission. */
  latestFeedback: RomanReferenceEssayFeedback | null;
}

export interface RomanReferenceEssayTutorResolution {
  mode: Exclude<TutoringMode, "exam">;
  essayContext: RomanReferenceEssayTutorContext;
  sourceIds: readonly string[];
}

/**
 * Server-only bridge for the essay, used by both direct generation and companion import.
 *
 * The essay's mode lives in the isolated reference row, not in the browser, so the client cannot
 * ask for Coach help on an essay it locked to Exam. The lock is taken by `access_essay_tutor`
 * before the drawer opens, which is why an unlocked essay is a client sequencing error rather
 * than a mode the server should choose on its behalf.
 */
export function resolveRomanReferenceTutorEssay(
  store: DiscereStore,
  input: { mode: TutoringMode },
): RomanReferenceEssayTutorResolution {
  const { state } = readStoredState(store);
  if (!state.assessmentFinished) {
    throw new HttpError(
      409,
      "Finish the four questions before asking about the essay.",
      "ASSESSMENT_INCOMPLETE",
    );
  }
  const essay = state.essay;
  if (essay.mode === null) {
    throw new HttpError(
      409,
      "Open tutor help from the essay before asking.",
      "ESSAY_MODE_NOT_LOCKED",
    );
  }
  assertEssayMode(essay, input.mode);
  if (essay.mode === "exam") {
    throw new HttpError(403, "Tutor assistance is unavailable in Exam mode.", "EXAM_GUARDRAIL");
  }
  return {
    mode: essay.mode,
    essayContext: {
      essayId: ROMAN_REFERENCE_ESSAY_CONTENT.id,
      content: ROMAN_REFERENCE_ESSAY_CONTENT,
      draft: essay.draft,
      claimPlan: essay.claimPlan,
      evidencePlan: [...essay.evidencePlan],
      complicationPlan: essay.complicationPlan,
      status: essay.status,
      revisions: essay.submissions.length,
      latestFeedback: essay.submissions.at(-1) ?? null,
    },
    sourceIds: ROMAN_REFERENCE_ESSAY_SOURCE_IDS,
  };
}

/**
 * Rubric feedback is prose this server writes and a learner reads, which puts it inside the
 * project's rule that generated prose passes the writing gate before it is accepted. The gate runs
 * over the summary, the five rubric comments, and the next step; the quoted excerpts are the
 * learner's own sentences and are not ours to lint.
 *
 * The record is the point. These templates are deterministic, so a failure is a defect in what we
 * wrote rather than a bad roll, and `roman-reference-essay.test.ts` fails the build for it. Holding
 * feedback back from a learner at runtime would punish them for our editing, so the run is
 * recorded and the feedback is still delivered.
 */
function reviewNewEssayFeedback(
  store: DiscereStore,
  before: RomanReferenceState,
  after: RomanReferenceState,
): void {
  if (after.essay.submissions.length <= before.essay.submissions.length) return;
  const submission = after.essay.submissions.at(-1);
  if (!submission) return;
  const prose = romanReferenceEssayFeedbackProse(submission);
  store.recordWritingGate(
    "recovery-v2:roman-reference-essay-feedback",
    prose,
    lintText(prose, { context: "feedback" }),
  );
}

export async function registerRomanReferenceRoutes(
  app: FastifyInstance,
  options: { store: DiscereStore },
): Promise<void> {
  app.get(ROMAN_REFERENCE_PATH, async () => {
    const stored = readStoredState(options.store);
    return responseFor(stored.state, stored.updatedAt);
  });

  app.put(ROMAN_REFERENCE_PATH, async (request) => {
    const action = RomanReferenceActionSchema.parse(request.body);
    const stored = readStoredState(options.store);
    const next = applyAction(stored.state, action, options.store.now());
    reviewNewEssayFeedback(options.store, stored.state, next);
    return next === stored.state && !stored.requiresPersistence
      ? responseFor(stored.state, stored.updatedAt)
      : saveState(options.store, next);
  });
}
