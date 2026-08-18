import type { LearnerQuestion } from "@discere/contracts";
import { Check } from "lucide-react";
import { Notice } from "../../ui/Feedback.js";
import { type AnswerDraft, answerSurface, choiceLetter } from "./answer-draft.js";

export function AnswerInput({
  question,
  draft,
  onChange,
  answered,
  correct,
}: {
  question: LearnerQuestion;
  draft: AnswerDraft;
  onChange: (draft: AnswerDraft) => void;
  answered: boolean;
  correct: boolean;
}) {
  const surface = answerSurface(question);

  if (surface === "choice" && draft.kind === "choice") {
    return (
      <fieldset className="choice-list">
        <legend className="sr-only">Answer choices</legend>
        {(question.choices ?? []).map((choice, index) => {
          const selected = draft.choiceId === choice.id;
          const marked = answered && selected;
          return (
            <button
              aria-pressed={selected}
              className={[
                "choice-card",
                selected ? "choice-card-selected" : "",
                marked && correct ? "choice-card-correct" : "",
                marked && !correct ? "choice-card-incorrect" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={choice.id}
              onClick={() => onChange({ kind: "choice", choiceId: choice.id })}
              type="button"
            >
              <span className="choice-letter">{choiceLetter(index)}</span>
              <span className="choice-label">{choice.label}</span>
              {marked && correct ? (
                <Check aria-label="Correct" className="choice-mark" size={18} strokeWidth={2} />
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
          <label className="field-label" htmlFor="answer-value">
            Value
          </label>
          <input
            autoComplete="off"
            className="text-input"
            id="answer-value"
            inputMode="decimal"
            onChange={(event) => onChange({ ...draft, value: event.currentTarget.value })}
            placeholder="0.05"
            type="text"
            value={draft.value}
          />
        </div>
        <div className="numeric-answer-unit">
          <label className="field-label" htmlFor="answer-unit">
            Unit
          </label>
          <input
            autoComplete="off"
            className="text-input"
            id="answer-unit"
            onChange={(event) => onChange({ ...draft, unit: event.currentTarget.value })}
            placeholder="A"
            type="text"
            value={draft.unit}
          />
        </div>
      </div>
    );
  }

  if (surface === "text" && draft.kind === "text") {
    return (
      <div>
        <label className="field-label" htmlFor="answer-text">
          Your answer
        </label>
        <textarea
          className="textarea textarea-short"
          id="answer-text"
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
