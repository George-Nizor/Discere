import type { LessonFeedbackResponse } from "@discere/contracts";
import { Check, Eye, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Lightbulb } from "../../brand/icon-set.js";
import { RichBlocks } from "../../ui/RichBlocks.js";
import { InlineRichText } from "../../ui/RichText.js";
import { PlayerFooterSlot } from "../player-footer.js";
import { HintLadder } from "./AttemptFeedback.js";
import type { Attempt } from "./use-attempt.js";

/** The worked answer and whatever teaching the step held back for after the response. */
function WorkedAnswer({ feedback }: { feedback: LessonFeedbackResponse }) {
  return (
    <div className="beat-explanation">
      {/* A code question's worked answer is a whole program, so it keeps its lines. */}
      {feedback.answer.includes("\n") ? (
        <pre className="beat-worked-code">
          <code>{feedback.answer}</code>
        </pre>
      ) : (
        <p className="beat-worked-answer">
          <InlineRichText text={feedback.answer} />
        </p>
      )}
      {feedback.blocks.length ? <RichBlocks blocks={feedback.blocks} /> : null}
    </div>
  );
}

/** Whether a marked answer was unreadable (the wrong form), which is not counted as a miss. */
function isUnreadable(attempt: Attempt): boolean {
  const result = attempt.result;
  return (
    result !== null &&
    result.qualifying === false &&
    !result.correct &&
    (attempt.phase === "answering" || attempt.phase === "retry")
  );
}

/**
 * The verdict on a lesson question, in the player's footer.
 *
 * A wrong answer says so in words ("Not right"), never in a tone colour alone, and keeps the
 * answer open for another try. A right answer always arrives with the idea: the authored
 * `onCorrect` line, or the first thing the step held back, so being right cannot skip the
 * lesson (spec §3.2 rule 3). The full explanation is one tap away, not three.
 */
export function QuestionFeedback({
  attempt,
  hints = true,
  placement = "footer",
}: {
  attempt: Attempt;
  /** False on a skill check: the verdict stands without a ladder. */
  hints?: boolean;
  /** `inline` keeps the verdict beside its question, for screens that ask several things. */
  placement?: "footer" | "inline";
}) {
  const [moreChoice, setMoreOpen] = useState<boolean | null>(null);
  const result = attempt.result;
  const className = "question-feedback" + (placement === "inline" ? " is-inline" : "");
  const place = (body: ReactNode) =>
    placement === "inline" ? (
      body
    ) : (
      <PlayerFooterSlot kind="feedback">{body}</PlayerFooterSlot>
    );
  // The live region is mounted with the question, empty, before any verdict exists: a region
  // created together with its text is often not announced by screen readers.
  if (!result) return place(<div className={className} aria-live="polite" />);
  const feedback = attempt.lessonFeedback;
  const phase = attempt.phase;
  const unreadable = isUnreadable(attempt);
  // A program that stopped with an error cost no try, but its hints are still worth offering.
  const stopped = unreadable && result.codeRun !== undefined;
  // The idea that comes with a right answer: authored, or else the worked answer itself.
  const idea = feedback?.onCorrect ?? result.feedback;
  // The worked answer and the held-back teaching are one tap away whenever there is any.
  const more = feedback !== null;
  // The verdict line already carries the idea (onCorrect, or the worked answer); the rest
  // waits behind "Why?" so the footer never buries the question.
  const moreOpen = moreChoice ?? false;
  const body = (
    <div className={className} data-phase={phase} aria-live="polite">
      <div
        // A new marking replaces the verdict node, so a second identical verdict is read again.
        key={`${attempt.misses}:${phase}:${attempt.markedResponse ?? ""}`}
        className={
          "answer-feedback " +
          (phase === "correct" ? "is-correct" : unreadable ? "is-format" : "is-retry")
        }
      >
        <div>
          <p className="feedback-verdict">
            {phase === "correct" ? (
              <>
                <Check aria-hidden="true" size={18} />
                Correct
              </>
            ) : unreadable ? (
              <>{result.codeRun ? "The program did not finish" : "That answer could not be read"}</>
            ) : phase === "revealed" ? (
              <>
                <Eye aria-hidden="true" size={18} />
                {attempt.misses > 0 ? "Not quite. Here is the answer" : "Here is the answer"}
              </>
            ) : (
              <>
                <X aria-hidden="true" size={18} />
                Not quite
              </>
            )}
          </p>
          {phase === "correct" ? (
            <p className="feedback-line">
              <InlineRichText text={idea} />
            </p>
          ) : phase === "retry" ||
            phase === "closed" ||
            unreadable ||
            (phase === "revealed" && result.specific) ? (
            <p className="feedback-line">
              <InlineRichText text={result.feedback} />
            </p>
          ) : null}
          {phase === "closed" ? (
            <p className="feedback-line">Exam mode keeps the answer closed. Continue when ready.</p>
          ) : null}
          {phase === "correct" && (result.xpGained ?? 0) > 0 ? (
            <span className="xp-gain">+{result.xpGained} XP</span>
          ) : null}
        </div>
      </div>
      {hints && (phase === "retry" || stopped) ? <HintLadder hints={attempt.hints} /> : null}
      {phase === "revealed" && feedback ? <WorkedAnswer feedback={feedback} /> : null}
      {phase === "correct" && feedback && more ? (
        <>
          <button
            className="button button-quiet why-button"
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(!moreOpen)}
          >
            {moreOpen ? "Close" : "Why?"}
          </button>
          {moreOpen ? <WorkedAnswer feedback={feedback} /> : null}
        </>
      ) : null}
      {(phase === "retry" || stopped) && (attempt.canHint || attempt.canReveal) && hints ? (
        <div className="feedback-help">
          {attempt.canHint ? (
            <button
              className="button button-quiet"
              disabled={attempt.busy}
              onClick={() => void attempt.askForHint()}
              type="button"
            >
              <Lightbulb aria-hidden="true" size={16} />
              {attempt.hints.length ? "Another hint" : "Get a hint"}
            </button>
          ) : null}
          {attempt.canReveal ? (
            <button
              className="button button-quiet"
              disabled={attempt.busy}
              onClick={() => void attempt.reveal()}
              type="button"
            >
              Show the answer
            </button>
          ) : null}
        </div>
      ) : null}
      {!feedback && attempt.failure && (phase === "correct" || attempt.canReveal) ? (
        <button
          className="button button-quiet"
          disabled={attempt.busy}
          type="button"
          onClick={() => void attempt.loadExplanation()}
        >
          Load explanation
        </button>
      ) : null}
    </div>
  );
  return place(body);
}
