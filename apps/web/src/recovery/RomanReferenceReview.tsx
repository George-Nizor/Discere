import type { ReviewRating, RomanReferenceProgress } from "@discere/contracts";
import { Check, CircleAlert, Landmark } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { errorMessage } from "../api/client.js";
import { ModeProvider, useTutoringMode } from "../journey/mode-context.js";
import { formatDueDate } from "../lib/format.js";
import { ReferenceFrame, romanReferencePaths } from "./RomanReference.js";
import { ROMAN_REFERENCE_LESSON_ID, useReferenceProgress } from "./reference-progress.js";

const RATINGS: { id: ReviewRating; label: string }[] = [
  { id: "again", label: "Again" },
  { id: "hard", label: "Hard" },
  { id: "good", label: "Good" },
  { id: "easy", label: "Easy" },
];

function CitiesVisual() {
  return (
    <div className="reference-recall-visual" aria-label="Two centres of Roman rule" role="img">
      <div>
        <Landmark aria-hidden="true" size={76} strokeWidth={1} />
        <span>Rome</span>
      </div>
      <span className="reference-recall-link" aria-hidden="true" />
      <div>
        <Landmark aria-hidden="true" size={76} strokeWidth={1} />
        <span>Constantinople</span>
      </div>
    </div>
  );
}

function RecallCard({
  progress,
  save,
}: {
  progress: RomanReferenceProgress;
  save: ReturnType<typeof useReferenceProgress>["save"];
}) {
  const { mode, setMode } = useTutoringMode();
  const navigate = useNavigate();
  const review = progress.review.progress;
  const effectiveMode = review.mode ?? mode;
  const [draft, setDraft] = useState(review.draft);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const draftVersion = useRef(0);
  const latestDraft = useRef(draft);
  latestDraft.current = draft;
  const editing = review.response === null && !review.revealed && review.rating === null;

  useEffect(() => {
    if (!editing || busy || draft === review.draft) return;
    const currentVersion = ++draftVersion.current;
    const timer = window.setTimeout(() => {
      void save({ action: "update_recall_draft", draft }).catch((error) => {
        if (currentVersion === draftVersion.current)
          setFailure(errorMessage(error, "Your response was not saved."));
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draft, review.draft, editing, busy, save]);

  async function act(work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await work();
    } catch (error) {
      setFailure(errorMessage(error, "Your recall was not saved. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function reveal() {
    if (effectiveMode === "exam" && review.response === null) return;
    if (editing) await save({ action: "update_recall_draft", draft: latestDraft.current });
    await save({ action: "reveal_recall", mode: effectiveMode });
  }

  return (
    <ReferenceFrame
      beat="recall"
      effectiveMode={effectiveMode}
      hideAssistance
      nextPath={review.rating ? romanReferencePaths.complete : null}
      nextLabel="Next"
      readText={progress.review.front}
      reachedSteps={[1, 2, 3, 7, 8]}
      sources={[]}
    >
      <main className="reference-main reference-recall" id="stage">
        {review.mode === null ? (
          <fieldset aria-label="Learning mode" className="reference-mode-control">
            {(["coach", "assisted", "direct", "exam"] as const).map((candidate) => (
              <button
                key={candidate}
                aria-pressed={mode === candidate}
                onClick={() => setMode(candidate)}
                type="button"
              >
                {candidate.charAt(0).toUpperCase() + candidate.slice(1)}
              </button>
            ))}
          </fieldset>
        ) : null}
        <section className="reference-recall-card" aria-label="Roman history recall">
          <CitiesVisual />
          <div className="reference-recall-content">
            <h1>{progress.review.front}</h1>
            {editing ? (
              <>
                <label htmlFor="roman-recall-response">Your answer</label>
                <textarea
                  id="roman-recall-response"
                  value={draft}
                  rows={3}
                  maxLength={2_000}
                  onChange={(event) => setDraft(event.currentTarget.value)}
                  disabled={busy}
                />
                <div className="reference-recall-actions">
                  <button
                    className="reference-primary"
                    disabled={busy || draft.trim() === ""}
                    onClick={() =>
                      void act(() =>
                        save({
                          action: "submit_recall",
                          response: draft.trim(),
                          mode: effectiveMode,
                        }),
                      )
                    }
                    type="button"
                  >
                    Check
                  </button>
                  {effectiveMode !== "exam" ? (
                    <button
                      className="reference-secondary"
                      disabled={busy}
                      onClick={() => void act(reveal)}
                      type="button"
                    >
                      Reveal
                    </button>
                  ) : null}
                </div>
              </>
            ) : review.response ? (
              progress.review.back ? (
                <details className="reference-recall-response">
                  <summary>Your answer</summary>
                  <p>{review.response}</p>
                </details>
              ) : (
                <p className="reference-recall-response">{review.response}</p>
              )
            ) : null}
            {review.feedback && !review.revealed ? (
              <p aria-live="polite" className={`reference-recall-feedback is-${review.result}`}>
                {review.result === "correct" ? (
                  <Check aria-hidden="true" size={20} />
                ) : (
                  <CircleAlert aria-hidden="true" size={20} />
                )}
                {review.feedback}
              </p>
            ) : null}
            {progress.review.back ? (
              <p className="reference-recall-back">{progress.review.back}</p>
            ) : !editing ? (
              <button
                className="reference-primary"
                disabled={busy}
                onClick={() => void act(reveal)}
                type="button"
              >
                Reveal
              </button>
            ) : null}
            {failure ? (
              <p role="alert" className="reference-save-error">
                {failure}
              </p>
            ) : null}
          </div>
        </section>
        {review.revealed && !review.rating ? (
          <fieldset className="reference-recall-ratings" aria-label="Recall confidence">
            <legend>How hard was it to recall?</legend>
            {RATINGS.map((rating) => (
              <button
                key={rating.id}
                disabled={busy}
                type="button"
                onClick={() =>
                  void act(async () => {
                    await save({ action: "rate_recall", rating: rating.id });
                    navigate(romanReferencePaths.complete);
                  })
                }
              >
                {rating.label}
              </button>
            ))}
          </fieldset>
        ) : null}
        {review.schedule ? (
          <div className="reference-recall-scheduled">
            <p>Return {formatDueDate(review.schedule.dueAt)}.</p>
            {Date.parse(review.schedule.dueAt) <= Date.now() ? (
              <button
                type="button"
                className="reference-primary"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await save({ action: "restart_recall" });
                    setDraft("");
                  })
                }
              >
                Recall again
              </button>
            ) : null}
          </div>
        ) : null}
      </main>
    </ReferenceFrame>
  );
}

function ReferenceRecallContent() {
  const progress = useReferenceProgress();
  if (!progress.data)
    return (
      <main className="reference-main" role="status">
        {progress.error ? "Your saved place is unavailable. Refresh to try again." : "Loading…"}
      </main>
    );
  if (!progress.data.essay.progress.finished)
    return (
      <ReferenceFrame
        beat="recall"
        hideAssistance
        nextPath={romanReferencePaths.essay}
        nextLabel="Continue"
        readText="Finish your essay before recalling the lesson."
        sources={[]}
      >
        <main className="reference-main">
          <h1>Finish your essay first</h1>
        </main>
      </ReferenceFrame>
    );
  return <RecallCard progress={progress.data} save={progress.save} />;
}

export function RomanReferenceReview() {
  return (
    <ModeProvider lessonId={ROMAN_REFERENCE_LESSON_ID}>
      <ReferenceRecallContent />
    </ModeProvider>
  );
}

function CompletionContent() {
  const progress = useReferenceProgress();
  if (!progress.data)
    return (
      <main className="reference-main" role="status">
        {progress.error ? "Your saved place is unavailable. Refresh to try again." : "Loading…"}
      </main>
    );
  const saved = progress.data;
  if (!saved.review.progress.rating)
    return (
      <Navigate
        replace
        to={saved.essay.progress.finished ? romanReferencePaths.recall : romanReferencePaths.essay}
      />
    );
  const labels = [
    { id: "turning-points", text: "Order the turning points" },
    { id: "map-117", text: "Read Rome’s reach in 117 CE" },
    { id: "two-sentence", text: "Explain Augustus’s powers and Rome’s expansion" },
  ];
  return (
    <ReferenceFrame
      beat="complete"
      hideAssistance
      nextPath={null}
      readText="What you can explain"
      reachedSteps={[1, 2, 3, 7, 8]}
      sources={[]}
    >
      <main className="reference-main reference-complete" id="stage">
        <h1>What you can explain</h1>
        <ul>
          {labels.map((item) => {
            const question = saved.questions.find((view) => view.progress.id === item.id)?.progress;
            const correct = question?.result === "correct";
            const independent =
              correct &&
              question?.hints.length === 0 &&
              question?.status !== "revealed" &&
              question?.mode !== "direct";
            return (
              <li key={item.id}>
                {correct ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
                <span>{item.text}</span>
                <small>{independent ? "Without hints" : correct ? "With help" : "Revisit"}</small>
              </li>
            );
          })}
        </ul>
        {saved.review.progress.schedule ? (
          <p className="reference-complete-return">
            East and west after 476 CE · Return{" "}
            {formatDueDate(saved.review.progress.schedule.dueAt)}.
            <Link to={romanReferencePaths.recall}>Open card</Link>
          </p>
        ) : (
          <Link className="reference-primary" to={romanReferencePaths.recall}>
            Recall the lesson
          </Link>
        )}
        <div className="reference-complete-actions">
          <Link
            className="reference-primary"
            to="/courses/roman-empire/lessons/expansion-and-provinces"
          >
            Continue course
          </Link>
          <Link className="reference-secondary" to="/">
            Home
          </Link>
        </div>
      </main>
    </ReferenceFrame>
  );
}

export function RomanReferenceCompletion() {
  return (
    <ModeProvider lessonId={ROMAN_REFERENCE_LESSON_ID}>
      <CompletionContent />
    </ModeProvider>
  );
}
