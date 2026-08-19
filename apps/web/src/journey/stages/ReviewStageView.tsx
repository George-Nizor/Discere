import type { ReviewSessionResponse, ReviewStage } from "@discere/contracts";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../../api/client.js";
import { createReviewSession } from "../../api/endpoints.js";
import { humaniseId } from "../../lib/format.js";
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

  async function start(): Promise<void> {
    setBusy(true);
    setFailure(null);
    try {
      setSession(await createReviewSession());
    } catch (error) {
      setFailure(errorMessage(error, "A review card could not be opened."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stage-column">
      <h1>{stage.title}</h1>
      <p className="deck">
        {stage.reviewLabel} · {stage.itemCount} {stage.itemCount === 1 ? "card" : "cards"}
      </p>
      <ul className="concept-chips">
        {stage.concepts.map((concept) => (
          <li key={concept}>{humaniseId(concept)}</li>
        ))}
      </ul>

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
          conceptIds={session.card.conceptIds}
          front={session.card.front}
          onRated={() => setRated(true)}
          position={1}
          sessionId={session.sessionId}
          total={stage.itemCount}
        />
      )}

      {rated ? (
        <div className="button-row">
          <button className="button button-primary" onClick={onContinue} type="button">
            Continue
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
