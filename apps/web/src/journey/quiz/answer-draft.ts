import type { LearnerQuestion } from "@discere/contracts";

export type AnswerDraft =
  | { kind: "numeric"; value: string; unit: string }
  | { kind: "text"; text: string }
  | { kind: "choice"; choiceId: string | null };

export type AnswerSurface = "choice" | "numeric" | "text" | "unsupported";

/**
 * Chooses the answer surface from the question itself. Selection wins when the question
 * carries choices, otherwise the declared response type decides.
 */
export function answerSurface(question: LearnerQuestion): AnswerSurface {
  if (question.choices && question.choices.length > 0) return "choice";
  if (question.responseType === "numeric") return "numeric";
  if (question.responseType === "short_text" || question.responseType === "long_text")
    return "text";
  return "unsupported";
}

export function initialAnswerDraft(question: LearnerQuestion): AnswerDraft {
  const surface = answerSurface(question);
  if (surface === "choice") return { kind: "choice", choiceId: null };
  if (surface === "numeric") return { kind: "numeric", value: "", unit: "" };
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
  const choice = question.choices?.find((option) => option.id === draft.choiceId);
  return choice ? choice.label : "";
}

export const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function choiceLetter(index: number): string {
  return CHOICE_LETTERS[index] ?? String(index + 1);
}
