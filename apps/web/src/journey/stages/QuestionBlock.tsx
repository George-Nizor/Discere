import type { LearnerQuestion, LessonFeedbackRequest } from "@discere/contracts";
import { Loader2 } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { Notice } from "../../ui/Feedback.js";
import { InlineRichText } from "../../ui/RichText.js";
import { PlayerFooterSlot } from "../player-footer.js";
import { AnswerInput } from "../quiz/AnswerInput.js";
import { QuestionFeedback } from "../quiz-shared/QuestionFeedback.js";
import { type Attempt, type AttemptPolicy, useAttempt } from "../quiz-shared/use-attempt.js";

/** Whether the last marked response is still the one on screen. */
export function attemptMarksDraft(attempt: Attempt): boolean {
  return attempt.result !== null && attempt.markedResponse === attempt.response;
}

/**
 * One question inside a lesson screen: its prompt, an optional figure that sees the attempt,
 * the one answer input, the Check action and the verdict. Every lesson question — a step's
 * check, a faded example's blank, a self-explanation, the opener's hook — goes through here,
 * so they all follow the same attempt policy.
 *
 * `inline` keeps the action and verdict beside the question instead of in the player's footer,
 * for screens that ask more than one thing (a faded example's blanks).
 */
export function QuestionBlock({
  question,
  context,
  policy,
  heading = "h1",
  promptClassName = "step-question",
  hidePrompt = false,
  label,
  inline = false,
  figure,
  onReady,
  onStarted,
  hideInput = false,
}: {
  question: LearnerQuestion;
  context: LessonFeedbackRequest | undefined;
  policy?: AttemptPolicy;
  /** The prompt is the screen's headline unless something else holds that place. */
  heading?: "h1" | "h2" | "h3";
  promptClassName?: string;
  hidePrompt?: boolean;
  label?: string;
  inline?: boolean;
  figure?: (attempt: Attempt) => ReactNode;
  onReady?: () => void;
  /**
   * True when the figure's control is the answer (an explore step's slider): one input per
   * answer, so no box is drawn beside it (spec §3.2 rule 5).
   */
  hideInput?: boolean;
  /** Called once the first response is recorded (the tutoring mode then locks). */
  onStarted?: () => void;
}) {
  const attempt = useAttempt(question, context, policy);
  const announced = useRef(false);
  useEffect(() => {
    if (attempt.ready && !announced.current) {
      announced.current = true;
      onReady?.();
    }
  }, [attempt.ready, onReady]);
  const started = attempt.attemptId !== null;
  useEffect(() => {
    if (started) onStarted?.();
  }, [started, onStarted]);
  const Heading = heading;
  const formId = `check-${question.id}`;
  const actions = !attempt.ready ? (
    <div className="button-row check-actions">
      <button
        aria-busy={attempt.busy}
        disabled={attempt.busy || !attempt.response}
        className={inline ? "button button-secondary" : "button button-primary"}
        form={formId}
        type="submit"
      >
        {attempt.busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
        {attempt.result === null ? "Check answer" : "Check again"}
      </button>
    </div>
  ) : null;
  const marks = attemptMarksDraft(attempt);
  return (
    <div
      className={"step-check question-beat" + (inline ? " is-inline" : "")}
      data-result={
        attempt.phase === "correct"
          ? "correct"
          : attempt.phase === "retry" || attempt.phase === "revealed" || attempt.phase === "closed"
            ? "incorrect"
            : undefined
      }
    >
      {hidePrompt ? null : (
        <Heading className={promptClassName}>
          <InlineRichText text={question.prompt} />
        </Heading>
      )}
      {figure ? figure(attempt) : null}
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          void attempt.send();
        }}
      >
        {hideInput ? (
          <p className="figure-answer-note" aria-live="polite">
            {attempt.response ? `Your answer: ${attempt.response}` : "Use the slider to answer."}
          </p>
        ) : (
          <AnswerInput
            answered={marks}
            correct={attempt.solved}
            readOnly={attempt.ready || attempt.busy}
            draft={attempt.draft}
            onChange={attempt.setDraft}
            question={question}
            idPrefix={`answer-${question.id}`}
            {...(label ? { label } : {})}
            correctChoiceId={
              attempt.phase === "revealed" ? attempt.lessonFeedback?.correctChoiceId : undefined
            }
          />
        )}
        {inline ? actions : <PlayerFooterSlot kind="actions">{actions}</PlayerFooterSlot>}
      </form>
      <QuestionFeedback
        attempt={attempt}
        hints={policy?.hints !== false}
        placement={inline ? "inline" : "footer"}
      />
      {attempt.failure ? (
        <Notice live tone="error" title="Try again">
          <p>{attempt.failure}</p>
        </Notice>
      ) : null}
    </div>
  );
}
