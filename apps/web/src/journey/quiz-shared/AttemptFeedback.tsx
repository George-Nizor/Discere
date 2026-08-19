import type { AttemptResponse, HintResponse } from "@discere/contracts";
import { Notice } from "../../ui/Feedback.js";

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
      <li className="hint-cost muted">
        Each hint records assisted evidence for this attempt rather than independent evidence.
      </li>
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
    <Notice
      live
      tone={result.correct ? "correct" : "info"}
      title={result.correct ? "Correct" : "Not correct yet"}
    >
      <p>{result.feedback}</p>
      <p className="muted feedback-meta">
        {result.xpAwarded} XP · {result.independent ? "independent" : "assisted"} evidence ·
        mastery {Math.round(result.mastery * 100)}%
      </p>
    </Notice>
  );
}
