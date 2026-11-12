import {
  encodeOrderResponse,
  encodeSortResponse,
  type LearnerQuestion,
} from "@discere/contracts";

export type AnswerDraft =
  | { kind: "numeric"; value: string; unit: string }
  | { kind: "text"; text: string }
  | { kind: "choice"; choiceId: string | null }
  | { kind: "code"; code: string }
  /** The item ids in the sequence the learner has them. */
  | { kind: "order"; ids: string[] }
  /** The items in the arrangement they were dealt, and the group each placed item is in. */
  | { kind: "sort"; ids: string[]; placed: Record<string, string> };

export type AnswerSurface =
  | "choice"
  | "numeric"
  | "text"
  | "code"
  | "order"
  | "sort"
  | "unsupported";

/**
 * Deals items into an arrangement decided by a seed alone, so the same seed always gives the
 * same arrangement. A lesson keeps one seed for a visit, which is why going back to a question
 * shows its items where they were.
 */
export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const dealt = [...items];
  let state = seed >>> 0 || 0x9e3779b9;
  const next = () => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = dealt.length - 1; index > 0; index -= 1) {
    const other = Math.floor(next() * (index + 1));
    [dealt[index], dealt[other]] = [dealt[other] as T, dealt[index] as T];
  }
  return dealt;
}

/** A number from a string, so one visit's seed gives each question its own arrangement. */
function mix(seed: number, text: string): number {
  let hash = seed >>> 0;
  for (const char of text) hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 0x01000193) >>> 0;
  return hash;
}

/**
 * Chooses the answer surface from the question itself. Selection wins when the question
 * carries choices, otherwise the declared response type decides.
 */
export function answerSurface(question: LearnerQuestion): AnswerSurface {
  if (question.responseType === "order" && question.order) return "order";
  if (question.responseType === "sort" && question.sort) return "sort";
  if (question.choices && question.choices.length > 0) return "choice";
  if (question.responseType === "code" && question.code) return "code";
  if (question.responseType === "numeric") return "numeric";
  if (question.responseType === "short_text" || question.responseType === "long_text")
    return "text";
  return "unsupported";
}

export function initialAnswerDraft(question: LearnerQuestion, seed = 0): AnswerDraft {
  const surface = answerSurface(question);
  if (surface === "order")
    return {
      kind: "order",
      ids: shuffled(
        (question.order?.items ?? []).map((item) => item.id),
        mix(seed, question.id),
      ),
    };
  if (surface === "sort")
    return {
      kind: "sort",
      ids: shuffled(
        (question.sort?.items ?? []).map((item) => item.id),
        mix(seed, question.id),
      ),
      placed: {},
    };
  if (surface === "choice") return { kind: "choice", choiceId: null };
  if (surface === "numeric") return { kind: "numeric", value: "", unit: "" };
  if (surface === "code") return { kind: "code", code: question.code?.starter ?? "" };
  return { kind: "text", text: "" };
}

/** The exact string sent to the server. An empty result means the answer is not ready. */
export function answerResponse(question: LearnerQuestion, draft: AnswerDraft): string {
  if (draft.kind === "numeric") {
    const value = draft.value.trim();
    if (!value) return "";
    const unit = draft.unit.trim();
    return unit ? `${value} ${unit}` : value;
  }
  if (draft.kind === "text") return draft.text.trim();
  if (draft.kind === "code") return draft.code.trim() ? draft.code : "";
  if (draft.kind === "order") return encodeOrderResponse(draft.ids);
  if (draft.kind === "sort")
    // A sorting is an answer once every item is in a group.
    return draft.ids.every((id) => draft.placed[id]) ? encodeSortResponse(draft.placed) : "";
  const choice = question.choices?.find((option) => option.id === draft.choiceId);
  return choice ? choice.label : "";
}

export const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function choiceLetter(index: number): string {
  return CHOICE_LETTERS[index] ?? String(index + 1);
}
