import type { ReviewRateResponse, ReviewRating } from "@discere/contracts";
import { Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../api/client.js";
import { rateReviewSession, revealReviewSession } from "../api/endpoints.js";
import { formatDueDate, formatInterval, humaniseId } from "../lib/format.js";
import { Notice } from "../ui/Feedback.js";
import { ReadAloudButton } from "../ui/ReadAloud.js";

const RATINGS: Array<{ id: ReviewRating; label: string; meaning: string }> = [
  { id: "again", label: "Again", meaning: "I could not recall it." },
  { id: "hard", label: "Hard", meaning: "I recalled it with effort." },
  { id: "good", label: "Good", meaning: "I recalled it." },
  { id: "easy", label: "Easy", meaning: "I recalled it immediately." },
];

/**
 * One retrieval at a time. The back stays server-side until the learner asks for it, and the
 * rating that follows says whether the recall happened without help.
 */
export function Flashcard({
  sessionId,
  front,
  conceptIds,
  position,
  total,
  onRated,
}: {
  sessionId: string;
  front: string;
  conceptIds: string[];
  position: number;
  total: number;
  onRated: (result: ReviewRateResponse) => void;
}) {
  const [back, setBack] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewRateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function reveal(): Promise<void> {
    if (back || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const revealed = await revealReviewSession(sessionId);
      setBack(revealed.back);
    } catch (error) {
      setFailure(errorMessage(error, "The answer could not be shown."));
    } finally {
      setBusy(false);
    }
  }

  async function rate(rating: ReviewRating): Promise<void> {
    setBusy(true);
    setFailure(null);
    try {
      const rated = await rateReviewSession(sessionId, { rating, recalled: rating !== "again" });
      setResult(rated);
      onRated(rated);
    } catch (error) {
      setFailure(errorMessage(error, "The rating could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  const percent = total === 0 ? 0 : Math.round((position / total) * 100);

  return (
    <div className="flashcard-screen">
      <div className="flashcard-progress">
        <span aria-hidden="true" className="flashcard-progress-track">
          <span className="flashcard-progress-fill" style={{ width: `${percent}%` }} />
        </span>
        <span className="flashcard-progress-count">
          {position} / {total}
        </span>
      </div>

      <p className="flashcard-concepts">{conceptIds.map(humaniseId).join(" · ")}</p>

      <div className="flashcard">
        <p className="flashcard-side">{back ? "Back" : "Front"}</p>
        <p className="flashcard-prompt">{back ?? front}</p>
      </div>

      <p aria-live="polite" className="sr-only">
        {back ? `Answer revealed: ${back}` : "The answer is hidden."}
      </p>

      {!back ? (
        <div className="button-row flashcard-actions">
          <button
            aria-busy={busy}
            className="button button-primary flashcard-reveal"
            onClick={() => void reveal()}
            type="button"
          >
            {busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
            Reveal answer
          </button>
          {/* Only the front is ever spoken; the back is not in the browser until it is revealed. */}
          <ReadAloudButton label="Read the card" text={front} />
        </div>
      ) : null}

      {back && !result ? (
        <div className="rating-row">
          {RATINGS.map((rating) => (
            <button
              className="rating-button"
              key={rating.id}
              onClick={() => void rate(rating.id)}
              type="button"
            >
              {rating.id === "again" ? (
                <RotateCcw aria-hidden="true" size={16} strokeWidth={1.8} />
              ) : null}
              <strong>{rating.label}</strong>
              <small>{rating.meaning}</small>
            </button>
          ))}
        </div>
      ) : null}

      {result ? (
        <Notice live tone="correct" title={`Rated ${result.rating}`}>
          <p>
            Recorded as {result.evidence} evidence. This card returns in{" "}
            {formatInterval(result.intervalDays)}, on {formatDueDate(result.dueAt)}.
          </p>
        </Notice>
      ) : null}

      {failure ? (
        <Notice live tone="error" title="The review step failed">
          <p>{failure}</p>
        </Notice>
      ) : null}
    </div>
  );
}
