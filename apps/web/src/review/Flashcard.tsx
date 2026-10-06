import type { ReviewRateResponse, ReviewRating, TutoringMode } from "@discere/contracts";
import { celebrateAnswer } from "../fx/celebrate.js";
import { centre, floatText } from "../fx/engine.js";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { errorMessage } from "../api/client.js";
import { rateReviewSession, revealReviewSession, submitReviewRecall } from "../api/endpoints.js";
import { queryKeys } from "../api/queries.js";
import { formatReturn } from "../lib/format.js";
import { useExperience } from "../study/experience.js";
import { Notice } from "../ui/Feedback.js";
import { ReadAloudButton } from "../ui/ReadAloud.js";
import "../styles/review.css";

const RATINGS: Array<{ id: ReviewRating; label: string; meaning: string }> = [
  { id: "again", label: "Again", meaning: "I could not recall it." },
  { id: "hard", label: "Hard", meaning: "I recalled it with effort." },
  { id: "good", label: "Good", meaning: "I recalled it." },
  { id: "easy", label: "Easy", meaning: "I recalled it immediately." },
];

/**
 * The back stays server-side until a response is committed or the learner chooses a reveal.
 * Ratings follow the explanation; the server decides whether recall happened without help.
 */
export function Flashcard({
  sessionId,
  front,
  conceptTitles = [],
  position,
  total,
  onRated,
  mode = "coach",
  initialResponse = null,
  initialCorrect = null,
}: {
  sessionId: string;
  front: string;
  conceptTitles?: string[] | undefined;
  position: number;
  total: number;
  /** `recalled` is the server's verdict on the typed recall: true, false, or null when unmarked. */
  onRated: (result: ReviewRateResponse, recalled: boolean | null) => void;
  mode?: TutoringMode;
  initialResponse?: string | null;
  initialCorrect?: boolean | null;
}) {
  const [back, setBack] = useState<string | null>(null);
  const inFlight = useRef(false);
  const queryClient = useQueryClient();
  const { play, prepare } = useExperience();
  const [result, setResult] = useState<ReviewRateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [response, setResponse] = useState(initialResponse);
  const [correct, setCorrect] = useState(initialCorrect);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function check(): Promise<void> {
    if (inFlight.current || !draft.trim()) return;
    inFlight.current = true;
    prepare();
    setBusy(true);
    setFailure(null);
    try {
      const origin = document.activeElement;
      const assessed = await submitReviewRecall(sessionId, draft.trim());
      setResponse(assessed.response);
      setCorrect(assessed.correct);
      setFeedback(assessed.feedback);
      if (assessed.correct !== null)
        celebrateAnswer({ correct: assessed.correct, firstTry: true, xp: 0, origin, play });
      try {
        const revealed = await revealReviewSession(sessionId);
        setBack(revealed.back);
      } catch {
        setFailure(
          "Your answer was saved, but the explanation did not load. Try Reveal answer again.",
        );
      }
    } catch (error) {
      setFailure(errorMessage(error, "Your recall could not be saved."));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function reveal(): Promise<void> {
    if (back || inFlight.current) return;
    // A typed answer is never thrown away: revealing records it as the recall, exactly as
    // Check does, so it earns the same credit and the same honest verdict.
    if (response === null && draft.trim()) {
      await check();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const revealed = await revealReviewSession(sessionId);
      setBack(revealed.back);
    } catch (error) {
      setFailure(errorMessage(error, "The answer could not be shown."));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function rate(rating: ReviewRating): Promise<void> {
    if (inFlight.current || result) return;
    inFlight.current = true;
    prepare();
    setBusy(true);
    setFailure(null);
    try {
      const rated = await rateReviewSession(sessionId, {
        rating,
        recalled: correct === true && mode !== "direct",
      });
      setResult(rated);
      if ((rated.xpGained ?? 0) > 0) {
        play("review");
        floatText(`+${rated.xpGained} XP`, centre(document.activeElement), {
          to: document.querySelector('[data-fx-target="xp"]'),
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.study });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviewHome });
      onRated(rated, correct);
    } catch (error) {
      setFailure(errorMessage(error, "The rating could not be saved."));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  // The checked answer suggests a rating; the learner still chooses, since only they know how
  // hard the recall felt.
  const suggested: ReviewRating | null =
    correct === false ? "again" : correct === true ? "good" : null;

  const percent =
    total === 0
      ? 0
      : Math.max(0, Math.min(100, Math.round(((position - 1 + (result ? 1 : 0)) / total) * 100)));

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

      {conceptTitles.length > 0 ? (
        <p className="flashcard-concepts">{conceptTitles.join(" · ")}</p>
      ) : null}

      <div
        className={`flashcard${back ? " is-revealed" : ""}${correct === true ? " is-correct" : correct === false ? " is-incorrect" : ""}`}
      >
        {back ? <p className="flashcard-question-context">{front}</p> : null}
        <p
          className={`flashcard-prompt${back ? " recall-reveal" : ""}`}
          key={back ? "back" : "front"}
        >
          {back ?? front}
        </p>
        {!back && response === null ? (
          <div className="flashcard-response">
            <label htmlFor="recall-response">Your answer</label>
            <textarea
              id="recall-response"
              className="textarea textarea-short"
              maxLength={2_000}
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              disabled={busy}
            />
          </div>
        ) : response ? (
          <details className="flashcard-response">
            <summary>Your answer</summary>
            <p>{response}</p>
          </details>
        ) : null}
        {feedback ? (
          <p
            aria-live="polite"
            className={`recall-feedback${correct === false ? " is-incorrect" : correct === true ? " is-correct" : ""}`}
          >
            {correct ? <Check aria-hidden="true" size={16} /> : null}
            {correct === false && back ? "Not quite. Here’s the explanation." : feedback}
          </p>
        ) : null}
      </div>

      <p aria-live="polite" className="sr-only">
        {back ? `Answer revealed: ${back}` : "The answer is hidden."}
      </p>

      {!back ? (
        <div className="button-row flashcard-actions">
          {response === null ? (
            <button
              className="button button-primary"
              disabled={busy || !draft.trim()}
              onClick={() => void check()}
              type="button"
            >
              Check
            </button>
          ) : null}
          {mode !== "exam" || response !== null ? (
            <button
              aria-busy={busy}
              className={`button ${response === null ? "button-quiet" : "button-primary"} flashcard-reveal`}
              disabled={busy}
              onClick={() => void reveal()}
              type="button"
            >
              {busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
              Reveal answer
            </button>
          ) : null}
          {response === null && draft.trim() ? (
            <p className="flashcard-reveal-note">Revealing checks what you typed first.</p>
          ) : null}
          {/* Only the front is ever spoken; the back is not in the browser until it is revealed. */}
          <ReadAloudButton label="Read the card" text={front} />
        </div>
      ) : null}

      {back && !result ? (
        <div className="rating-row">
          {RATINGS.map((rating) => (
            <button
              aria-describedby={rating.id === suggested ? "rating-suggestion" : undefined}
              className={`rating-button${rating.id === suggested ? " is-suggested" : ""}`}
              disabled={busy}
              key={rating.id}
              onClick={() => void rate(rating.id)}
              type="button"
            >
              {rating.id === "again" ? (
                <RotateCcw aria-hidden="true" size={16} strokeWidth={1.8} />
              ) : null}
              <strong>{rating.label}</strong>
              <small>{rating.meaning}</small>
              {rating.id === suggested ? (
                <span className="rating-suggested" id="rating-suggestion">
                  Suggested
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {result ? (
        <Notice live tone="info" title="Saved">
          <p>This card comes back {formatReturn(result.dueAt)}.</p>
          {(result.xpGained ?? 0) > 0 ? (
            <p className="xp-gain">
              <Sparkles aria-hidden="true" size={14} /> +{result.xpGained} XP
            </p>
          ) : null}
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
