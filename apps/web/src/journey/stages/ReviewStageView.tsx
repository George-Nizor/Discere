import type { ReviewSessionResponse, ReviewStage } from "@discere/contracts";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../../api/client.js";
import { createReviewSession } from "../../api/endpoints.js";
import { useTutoringMode } from "../mode-context.js";
import { Flashcard } from "../../review/Flashcard.js";
import { Notice } from "../../ui/Feedback.js";

export function ReviewStageView({
  stage,
  onContinue,
}: {
  stage: ReviewStage;
  onContinue: () => void;
}) {
  const [session, setSession] = useState<ReviewSessionResponse | null>(null);
  const [rated, setRated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const { mode } = useTutoringMode();
  const cardIds = stage.cardIds ?? [];

  async function start(nextIndex = index): Promise<void> {
    setBusy(true);
    setFailure(null);
    try {
      setSession(
        await createReviewSession({
          lessonId: stage.lessonId ?? stage.id.replace(/:review$/, ""),
          mode,
          ...(cardIds[nextIndex] ? { cardId: cardIds[nextIndex] } : {}),
        }),
      );
      setIndex(nextIndex);
      setRated(false);
    } catch (error) {
      setFailure(errorMessage(error, "A review card could not be opened."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stage-column lesson-recall">
      <h1>{stage.title}</h1>
      <p className="deck">
        {stage.reviewLabel} · {stage.itemCount} {stage.itemCount === 1 ? "card" : "cards"}
      </p>

      {!session ? (
        <button
          aria-busy={busy}
          className="button button-primary"
          onClick={() => void start()}
          type="button"
        >
          {busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
          Start the review
        </button>
      ) : (
        <Flashcard
          key={session.sessionId}
          front={session.card.front}
          onRated={() => setRated(true)}
          position={index + 1}
          sessionId={session.sessionId}
          total={stage.itemCount}
          mode={session.mode}
          initialResponse={session.response}
          initialCorrect={session.correct}
        />
      )}

      {rated ? (
        <div className="button-row">
          <button
            className="button button-primary"
            disabled={busy}
            onClick={index + 1 < stage.itemCount ? () => void start(index + 1) : onContinue}
            type="button"
          >
            {index + 1 < stage.itemCount ? "Next card" : "Continue"}
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </button>
        </div>
      ) : null}

      {failure ? (
        <Notice live tone="error" title="Review unavailable">
          <p>{failure}</p>
        </Notice>
      ) : null}
    </div>
  );
}
