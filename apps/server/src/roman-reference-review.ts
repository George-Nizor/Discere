import type {
  ReferenceRecallResult,
  RomanReferenceReviewAction,
  RomanReferenceReviewState,
  TutoringMode,
} from "@discere/contracts";
import { createReviewState, scheduleReview } from "@discere/progression-engine";
import { HttpError } from "./errors.js";

export const REFERENCE_RECALL_FRONT = "Why does Roman imperial history continue after 476 CE?";
export const REFERENCE_RECALL_BACK =
  "The western emperor was removed in 476 CE, while Roman imperial government continued from Constantinople in the east.";
const CARD_ID = "recovery-v2:roman-continuity";

export function blankRomanReferenceReview(): RomanReferenceReviewState {
  return {
    draft: "",
    response: null,
    result: null,
    feedback: null,
    mode: null,
    revealed: false,
    rating: null,
    evidence: null,
    schedule: null,
    previousSchedule: null,
  };
}

/** A narrow recall rubric. Unrecognised prose remains unassessed, rather than earning credit. */
export function assessRomanReferenceRecall(response: string): {
  result: ReferenceRecallResult;
  feedback: string;
} {
  const text = response.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ");
  const contradiction =
    /\b(?:east(?:ern)?|constantinople)\b[^.!?]{0,85}\b(?:ended|fell|collapsed|disappeared|ceased)\b/.test(
      text,
    ) ||
    /\b(?:east(?:ern)?|constantinople)\b[^.!?]{0,60}\b(?:did not|didn't|never|no longer|failed to)\s+(?:continue|survive|last|remain)/.test(
      text,
    ) ||
    /\b(?:whole|entire|all of the|both halves of the)\s+(?:roman\s+)?empire\b[^.!?]{0,70}\b(?:ended|fell|collapsed|disappeared)/.test(
      text,
    ) ||
    /\bwest(?:ern)?\b[^.!?]{0,45}\b(?:was not|wasn't|never)\s+(?:removed|deposed|ended)/.test(text);
  if (contradiction)
    return {
      result: "incorrect",
      feedback: "476 CE marks a western political change. Roman government continued in the east.",
    };
  const westernChange =
    /\bwest(?:ern)?\b[^.!?]{0,85}\b(?:remov\w*|depos\w*|fell|fall|ended|end|collaps\w*)\b/.test(
      text,
    ) ||
    /\b(?:remov\w*|depos\w*|fell|fall|ended|end|collaps\w*)\b[^.!?]{0,85}\bwest(?:ern)?\b/.test(
      text,
    ) ||
    /\b(?:romulus|augustulus)\b[^.!?]{0,60}\b(?:remov\w*|depos\w*)\b/.test(text);
  const easternContinuation =
    /\b(?:east(?:ern)?|constantinople|byzantine)\b[^.!?]{0,85}\b(?:continu\w*|surviv\w*|remain\w*|last\w*|persist\w*)\b/.test(
      text,
    ) ||
    /\b(?:continu\w*|surviv\w*|remain\w*|last\w*|persist\w*)\b[^.!?]{0,85}\b(?:east(?:ern)?|constantinople|byzantine)\b/.test(
      text,
    );
  if (westernChange && easternContinuation)
    return {
      result: "correct",
      feedback: "You distinguish the western deposition from eastern Roman continuation.",
    };
  if (westernChange || easternContinuation)
    return {
      result: "partly_correct",
      feedback: westernChange
        ? "You identify the western change. Explain what happened to Roman government in the east."
        : "You identify eastern continuation. Explain what changed in the west in 476 CE.",
    };
  return {
    result: "unassessed",
    feedback:
      "This response does not give enough evidence to assess the western change and eastern continuation.",
  };
}

function lockMode(state: RomanReferenceReviewState, mode: TutoringMode): RomanReferenceReviewState {
  if (state.mode !== null && state.mode !== mode) {
    throw new HttpError(409, "This recall is locked to its original mode.", "RECALL_MODE_LOCKED");
  }
  return state.mode === null ? { ...state, mode } : state;
}

export function applyRomanReferenceReviewAction(
  state: RomanReferenceReviewState,
  action: RomanReferenceReviewAction,
  now: string,
): RomanReferenceReviewState {
  if (action.action === "restart_recall") {
    if (!state.schedule || !state.rating) {
      throw new HttpError(409, "Finish this recall first.", "RECALL_INCOMPLETE");
    }
    if (Date.parse(state.schedule.dueAt) > Date.parse(now)) {
      throw new HttpError(409, "This card is not due yet.", "RECALL_NOT_DUE");
    }
    return { ...blankRomanReferenceReview(), previousSchedule: state.schedule };
  }
  if (state.rating !== null) {
    if (action.action === "rate_recall" && action.rating === state.rating) return state;
    throw new HttpError(409, "This recall is finished.", "RECALL_FINISHED");
  }
  switch (action.action) {
    case "update_recall_draft":
      if (state.response !== null || state.revealed) {
        if (state.draft === action.draft) return state;
        throw new HttpError(409, "The submitted recall is read-only.", "RECALL_SUBMITTED");
      }
      return state.draft === action.draft ? state : { ...state, draft: action.draft };
    case "submit_recall": {
      const locked = lockMode(state, action.mode);
      if (state.response !== null || state.revealed) {
        if (state.response === action.response) return state;
        throw new HttpError(409, "The first response is already recorded.", "RECALL_SUBMITTED");
      }
      return {
        ...locked,
        draft: action.response,
        response: action.response,
        ...assessRomanReferenceRecall(action.response),
      };
    }
    case "reveal_recall": {
      const locked = lockMode(state, action.mode);
      if (action.mode === "exam" && state.response === null) {
        throw new HttpError(
          403,
          "Submit a response before revealing in Exam mode.",
          "EXAM_GUARDRAIL",
        );
      }
      return state.revealed ? state : { ...locked, revealed: true };
    }
    case "rate_recall": {
      if (!state.revealed)
        throw new HttpError(409, "Reveal the card before rating.", "RECALL_REVEAL_REQUIRED");
      const independent =
        state.result === "correct" && state.response !== null && state.mode !== "direct";
      const evidence = independent ? "independent" : "assisted";
      return {
        ...state,
        rating: action.rating,
        evidence,
        schedule: scheduleReview(state.previousSchedule ?? createReviewState(CARD_ID, now), {
          reviewedAt: now,
          outcome: state.result === "correct" ? "correct" : "incorrect",
          evidence,
          rating: action.rating,
        }),
      };
    }
  }
}

export function romanReferenceReviewIsConsistent(state: RomanReferenceReviewState): boolean {
  if (state.response !== null) {
    const assessed = assessRomanReferenceRecall(state.response);
    if (
      state.draft !== state.response ||
      assessed.result !== state.result ||
      assessed.feedback !== state.feedback
    )
      return false;
  }
  if (state.schedule !== null) {
    if (
      state.schedule.cardId !== CARD_ID ||
      state.schedule.lastReviewedAt === null ||
      state.rating === null
    )
      return false;
    const expected = applyRomanReferenceReviewAction(
      { ...state, rating: null, schedule: null, evidence: null },
      {
        action: "rate_recall",
        rating: state.rating,
      },
      state.schedule.lastReviewedAt,
    );
    return (
      expected.evidence === state.evidence &&
      JSON.stringify(expected.schedule) === JSON.stringify(state.schedule)
    );
  }
  return true;
}
