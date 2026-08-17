import { useEffect, useState } from "react";
import type { ReviewRateRequest, ReviewSessionResponse, ReviewRevealResponse, ReviewRating, ReviewStage } from "@discere/contracts";
import { createReviewSession, rateReviewSession, revealReviewSession } from "./api";

const ratings: Array<{ id: ReviewRating; label: string; detail: string }> = [
  { id: "again", label: "Again", detail: "I could not retrieve it." },
  { id: "hard", label: "Hard", detail: "I needed effort." },
  { id: "good", label: "Good", detail: "I recalled it." },
  { id: "easy", label: "Easy", detail: "I knew it quickly." },
];

export function StoryReview({ stage, onComplete }: { stage: ReviewStage; onComplete: () => void }) {
  const [session, setSession] = useState<ReviewSessionResponse>();
  const [revealed, setRevealed] = useState<ReviewRevealResponse>();
  const [recall, setRecall] = useState("");
  const [rating, setRating] = useState<ReviewRating>();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => { void createReviewSession().then(setSession).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not start review.")); }, []);

  async function reveal(): Promise<void> {
    if (!session) return;
    try { setError(undefined); setRevealed(await revealReviewSession(session.sessionId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reveal the answer."); }
  }

  async function rate(nextRating: ReviewRating): Promise<void> {
    if (!session) return;
    setRating(nextRating);
    const input: ReviewRateRequest = { rating: nextRating, recalled: recall.trim().length > 0 };
    try { setError(undefined); await rateReviewSession(session.sessionId, input); setSaved(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this review."); }
  }

  if (!session) return <section className="story-review-loading">Preparing one due review…</section>;
  return (
    <section className="story-review" aria-labelledby="review-title">
      <div className="story-review-progress"><span>{stage.reviewLabel}</span><span>1 / {stage.itemCount}</span></div>
      <div className="story-review-card" aria-live="polite">
        <span className="story-card-label">{revealed ? "Answer" : "Recall"}</span>
        <h2 id="review-title">{revealed ? revealed.back : session.card.front}</h2>
        {!revealed ? <label className="story-recall"><span>Try recalling it before revealing the answer</span><textarea value={recall} onChange={(event) => setRecall(event.currentTarget.value)} placeholder="Type a phrase, calculation, or explanation…" rows={3} /></label> : <p className="story-review-source">Source-backed card · {revealed.sourceIds.join(", ")}</p>}
        {!revealed ? <button className="story-primary" type="button" onClick={() => void reveal()}>Reveal answer <span aria-hidden="true">↓</span></button> : null}
      </div>
      {revealed && !saved ? <div className="story-rating"><p>How did retrieval feel?</p><div>{ratings.map((item) => <button key={item.id} type="button" className={rating === item.id ? "selected" : ""} onClick={() => void rate(item.id)}><strong>{item.label}</strong><span>{item.detail}</span></button>)}</div></div> : null}
      {saved ? <div className="story-review-complete" role="status"><strong>Review scheduled</strong><p>Your response was recorded as {recall.trim() ? "independent" : "assisted"} evidence.</p><button className="story-primary" type="button" onClick={onComplete}>Continue to completion <span aria-hidden="true">→</span></button></div> : null}
      {error ? <p className="story-error" role="alert">{error}</p> : null}
    </section>
  );
}
