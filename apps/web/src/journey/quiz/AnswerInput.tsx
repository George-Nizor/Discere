import type { LearnerQuestion } from "@discere/contracts";
import { Check, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { InlineRichText } from "../../ui/RichText.js";
import { Notice } from "../../ui/Feedback.js";
import { type AnswerDraft, answerSurface, choiceLetter } from "./answer-draft.js";

/** Moves between choice cards with the arrow keys, as a radio group would. */
function moveFocus(event: KeyboardEvent<HTMLFieldSetElement>): void {
  const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
  if (!keys.includes(event.key)) return;
  const cards = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>("button.choice-card:not(:disabled)"),
  ];
  const at = cards.indexOf(document.activeElement as HTMLButtonElement);
  if (at < 0 || cards.length === 0) return;
  event.preventDefault();
  const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
  cards[(at + step + cards.length) % cards.length]?.focus();
}

/**
 * Maths, code and bare numbers are set in the mono face so their symbols line up and read as
 * notation; ordinary words keep the interface face.
 */
export function looksLikeNotation(label: string): boolean {
  const text = label.trim();
  if (/^[-−+]?\d[\d.,\s/%−-]*$/.test(text)) return true;
  if (/[=×÷√^≤≥≠<>]|\b\d+\s*[a-z]\b|\b[a-z]\s*[+\-−*/]\s*\d/i.test(text)) return true;
  return /^(SELECT|INSERT|UPDATE|WITH)\b|[a-z_]+\(.*\)|`/i.test(text);
}

export function AnswerInput({
  question,
  draft,
  onChange,
  answered,
  correct,
  readOnly = false,
  correctChoiceId,
  idPrefix = "answer",
  label,
}: {
  question: LearnerQuestion;
  draft: AnswerDraft;
  onChange: (draft: AnswerDraft) => void;
  /** True while the last marked response is still the one on screen. */
  answered: boolean;
  correct: boolean;
  readOnly?: boolean;
  /** Set once the answer is revealed, so the right choice is marked as well as the wrong one. */
  correctChoiceId?: string | undefined;
  /** Keeps ids unique when one screen holds several inputs (a faded example's blanks). */
  idPrefix?: string;
  /** A visible label for the input ("Output", "Left side"); defaults to "Value" or "Your answer". */
  label?: string;
}) {
  const surface = answerSurface(question);

  if (surface === "choice" && draft.kind === "choice") {
    return (
      <fieldset className="choice-list" onKeyDown={moveFocus}>
        <legend className="sr-only">{label ?? "Answer choices"}</legend>
        {(question.choices ?? []).map((choice, index) => {
          const selected = draft.choiceId === choice.id;
          const marked = answered && selected;
          const right = (marked && correct) || choice.id === correctChoiceId;
          return (
            <button
              aria-pressed={selected}
              className={[
                "choice-card",
                selected ? "choice-card-selected" : "",
                right ? "choice-card-correct" : "",
                marked && !correct ? "choice-card-incorrect" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={choice.id}
              disabled={correct || readOnly}
              onClick={() => onChange({ kind: "choice", choiceId: choice.id })}
              type="button"
            >
              <span className="choice-letter">{choiceLetter(index)}</span>
              <span className={`choice-label${looksLikeNotation(choice.label) ? " choice-label--notation" : ""}`}>
                <InlineRichText text={choice.label} />
              </span>
              {right ? (
                <Check
                  aria-label={marked ? "Correct" : "The right answer"}
                  className="choice-mark"
                  size={18}
                  strokeWidth={2}
                />
              ) : marked && !correct ? (
                <X aria-label="Not right" className="choice-mark" size={18} strokeWidth={2} />
              ) : null}
            </button>
          );
        })}
      </fieldset>
    );
  }

  if (surface === "numeric" && draft.kind === "numeric") {
    return (
      <div className="numeric-answer">
        <div className="numeric-answer-value">
          <label className="field-label" htmlFor={`${idPrefix}-value`}>
            {label ?? "Value"}
          </label>
          <input
            autoComplete="off"
            className="text-input"
            id={`${idPrefix}-value`}
            inputMode="decimal"
            readOnly={correct || readOnly}
            onChange={(event) => onChange({ ...draft, value: event.currentTarget.value })}
            placeholder="e.g. 12 or 3/4"
            type="text"
            value={draft.value}
          />
        </div>
        {question.expectedUnit !== "" ? (
          <div className="numeric-answer-unit">
            <label className="field-label" htmlFor={`${idPrefix}-unit`}>
              Unit
            </label>
            <input
              autoComplete="off"
              className="text-input"
              id={`${idPrefix}-unit`}
              readOnly={correct || readOnly}
              onChange={(event) => onChange({ ...draft, unit: event.currentTarget.value })}
              placeholder={question.expectedUnit ?? "A"}
              type="text"
              value={draft.unit}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (surface === "text" && draft.kind === "text") {
    return (
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-text`}>
          {label ?? "Your answer"}
        </label>
        <textarea
          readOnly={correct || readOnly}
          className="textarea textarea-short"
          id={`${idPrefix}-text`}
          onChange={(event) => onChange({ kind: "text", text: event.currentTarget.value })}
          value={draft.text}
        />
      </div>
    );
  }

  return (
    <Notice tone="warning" title="This question cannot be answered here">
      <p>
        The question expects a <code>{question.responseType}</code> response. Discere has no input
        for that response type yet.
      </p>
    </Notice>
  );
}
