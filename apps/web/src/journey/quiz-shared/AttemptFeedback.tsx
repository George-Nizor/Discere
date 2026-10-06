import type { AttemptResponse, HintResponse } from "@discere/contracts";
import { Check, RotateCcw } from "lucide-react";
import { Sparkles } from "../../brand/icon-set.js";

/**
 * The hints the learner has spent, kept on screen. A ladder that disappeared as soon as the
 * next one arrived would hide how much help the answer took, which is exactly the thing the
 * evidence model is recording.
 */
export function HintLadder({ hints }: { hints: readonly HintResponse[] }) {
  if (hints.length === 0) return null;
  return (
    <ol aria-label="Hints used" className="hint-ladder">
      {hints.map((hint) => (
        <li key={hint.level}>
          <p className="eyebrow">
            Hint {hint.level} of {hint.level + hint.remaining}
          </p>
          <p>{hint.hint}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * The verdict on one attempt. It names what the evidence was worth as well as whether the
 * answer was right, so the learner can see that a hinted success counts differently.
 */
export function AttemptResult({ result }: { result: AttemptResponse | null }) {
  if (!result) return null;
  return (
    <div
      role="status"
      className={`answer-feedback ${result.correct ? "is-correct" : "is-retry"}`}
      key={`${result.attemptId}:${result.correct}:${result.feedback}`}
    >
      <span className="feedback-icon" aria-hidden="true">
        {result.correct ? <Check size={22} strokeWidth={2.5} /> : <RotateCcw size={20} />}
      </span>
      <div>
        <p>{result.feedback}</p>
        <p className="feedback-meta">
          {(result.xpGained ?? 0) > 0 ? (
            <span className="xp-gain">
              <Sparkles size={13} aria-hidden="true" /> +{result.xpGained} XP
            </span>
          ) : null}
          {result.correct ? (
            <span>{result.independent ? "Without hints" : "With help"}</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
