import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { errorMessage } from "../api/client.js";
import { createReviewSession, getReviewSession, getReviewHome } from "../api/endpoints.js";
import { queryKeys, useReviewHome } from "../api/queries.js";
import { formatDueCell, formatReturn } from "../lib/format.js";
import { paths } from "../lib/paths.js";
import { ErrorScreen, LoadingScreen, Notice } from "../ui/Feedback.js";
import { Flashcard } from "./Flashcard.js";
import { readReviewRun, recordRated, saveReviewRun } from "./review-run.js";
import { DueCourseChecks } from "../checks/CourseChecks.js";

export function ReviewScreen() {
  const review = useReviewHome();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (review.isPending) return <LoadingScreen message="Checking what is due…" />;
  if (review.error || !review.data) {
    return (
      <ErrorScreen
        error={review.error}
        message={errorMessage(review.error, "The review queue did not load.")}
        onRetry={() => review.refetch()}
        title="Review unavailable"
      />
    );
  }

  async function start(): Promise<void> {
    setBusy(true);
    setFailure(null);
    try {
      const session = await createReviewSession();
      saveReviewRun(session.sessionId, {
        position: 1,
        total: Math.max(1, review.data?.dueCount ?? 1),
        practice: (review.data?.dueCount ?? 0) === 0,
      });
      void navigate(paths.reviewSession(session.sessionId), { viewTransition: true });
    } catch (error) {
      setFailure(errorMessage(error, "A review session could not be started."));
      setBusy(false);
    }
  }

  const { dueCount, estimatedMinutes, courses } = review.data;
  const nextDueAt = courses
    .map((course) => course.nextDueAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0];

  return (
    <main className="page" id="stage">
      <h1>Review</h1>
      <DueCourseChecks />

      <section aria-label="Due now" className="review-summary">
        {dueCount === 0 && courses.length ? (
          <p className="review-nothing-due">
            Nothing is due.
            {nextDueAt ? ` The next card comes back ${formatReturn(nextDueAt)}.` : ""} Practising
            early brings that card forward one at a time; its schedule updates from your rating.
          </p>
        ) : null}
        <p className="review-count">
          <strong>{dueCount}</strong>
          <span>
            {dueCount === 1 ? "card due" : "cards due"}
            {estimatedMinutes > 0 ? ` · about ${estimatedMinutes} min` : ""}
          </span>
        </p>
        {courses.length ? (
          <button
            aria-busy={busy}
            className="button button-primary"
            onClick={() => void start()}
            type="button"
          >
            {busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
            {dueCount > 0 ? "Start review" : "Practise early"}
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </button>
        ) : (
          <>
            <p>Try a lesson. The ideas you learn will return here.</p>
            <Link className="button button-primary" to={paths.courses}>
              Explore courses
            </Link>
          </>
        )}
      </section>

      {courses.length > 0 ? (
        <section aria-label="Due by course" className="review-courses">
          <h2 className="section-title">By course</h2>
          {/* A session takes turns between courses, so the split is worth showing. */}
          <table>
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col">Due</th>
                <th scope="col">Cards</th>
                <th scope="col">Next</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.courseId}>
                  <th scope="row">
                    <Link to={paths.course(course.courseId)}>{course.title}</Link>
                  </th>
                  <td>{course.dueCount}</td>
                  <td>{course.cardCount}</td>
                  <td className="muted">
                    {course.dueCount > 0
                      ? "Now"
                      : course.nextDueAt
                        ? formatDueCell(course.nextDueAt)
                        : "Not scheduled"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {failure ? (
        <Notice live tone="error" title="Review could not start">
          <p>{failure}</p>
        </Notice>
      ) : null}
    </main>
  );
}

export function ReviewSessionScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ratedSession, setRatedSession] = useState<string | null>(null);
  const [exhaustedSession, setExhaustedSession] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Re-read after each rating, since the rating updates the stored run.
  const [, setRunVersion] = useState(0);

  const session = useQuery({
    queryKey: queryKeys.reviewSession(sessionId ?? ""),
    queryFn: () => getReviewSession(sessionId ?? ""),
    enabled: Boolean(sessionId),
  });

  const run = readReviewRun(sessionId ?? "");
  const rated =
    Boolean(session.data) && (ratedSession === sessionId || Boolean(session.data?.rated));
  const finished = rated && (run.position >= run.total || exhaustedSession === sessionId);
  const queue = useQuery({
    queryKey: queryKeys.reviewHome,
    queryFn: getReviewHome,
    enabled: finished,
  });

  if (!sessionId) {
    return (
      <ErrorScreen
        back={{ to: paths.review, label: "Back to Review" }}
        message="No review session was named."
        title="Session not found"
      />
    );
  }
  if (session.isPending) return <LoadingScreen message="Opening the card…" />;
  if (session.error || !session.data) {
    return (
      <ErrorScreen
        back={{ to: paths.review, label: "Back to Review" }}
        error={session.error}
        message={errorMessage(session.error, "The review card did not load.")}
        onRetry={() => session.refetch()}
        title="Card unavailable"
      />
    );
  }

  const returning = !rated && run.seen.includes(session.data.card.cardId);

  async function nextCard(): Promise<void> {
    if (busy || !rated || finished) return;
    setBusy(true);
    setFailure(null);
    try {
      const queue = await getReviewHome();
      if (queue.dueCount === 0) {
        setExhaustedSession(sessionId ?? null);
        return;
      }
      const next = await createReviewSession();
      // The total is what has been reviewed plus what is due now, so a card that came back
      // during the run lengthens it visibly instead of repeating under a fixed count.
      saveReviewRun(next.sessionId, {
        ...run,
        position: run.position + 1,
        total: run.position + queue.dueCount,
      });
      setRatedSession(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.reviewHome });
      void navigate(paths.reviewSession(next.sessionId), { viewTransition: true });
    } catch (error) {
      setFailure(errorMessage(error, "The next card could not be opened."));
    } finally {
      setBusy(false);
    }
  }

  const nextDueAt = queue.data?.courses
    .map((course) => course.nextDueAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0];

  return (
    <main className="page page-narrow review-session" id="stage">
      {returning ? (
        <p className="review-returning">
          Back again: this card came round once already in this session.
        </p>
      ) : null}
      {session.data.rated && ratedSession !== sessionId ? (
        <section aria-label="Saved review">
          <p>
            {run.position} / {run.total}
          </p>
          <h1>{session.data.card.front}</h1>
          <p>Your review is saved.</p>
        </section>
      ) : (
        <Flashcard
          key={session.data.sessionId}
          conceptTitles={session.data.card.conceptTitles}
          front={session.data.card.front}
          onRated={(result, recalled) => {
            queryClient.setQueryData(queryKeys.reviewSession(sessionId), {
              ...session.data,
              rated: true,
            });
            saveReviewRun(
              sessionId,
              recordRated(run, session.data.card.cardId, {
                recalled,
                xp: result.xpGained ?? 0,
              }),
            );
            setRunVersion((version) => version + 1);
            setRatedSession(sessionId);
          }}
          position={run.position}
          sessionId={session.data.sessionId}
          total={run.total}
          mode={session.data.mode}
          initialResponse={session.data.response}
          initialCorrect={session.data.correct}
        />
      )}
      {finished ? (
        <section aria-label="Session summary" className="review-summary-card" role="status">
          <h2>{run.practice ? "Practice saved" : "Review complete"}</h2>
          <dl className="review-summary-stats">
            <div>
              <dt>Cards reviewed</dt>
              <dd>{Math.max(run.reviewed, 1)}</dd>
            </div>
            <div>
              <dt>Typed answers right</dt>
              <dd>{run.checked > 0 ? `${run.recalled} of ${run.checked}` : "None typed"}</dd>
            </div>
            <div>
              <dt>XP earned</dt>
              <dd>{run.xp > 0 ? `+${run.xp}` : "0"}</dd>
            </div>
          </dl>
          <p className="review-summary-next">
            {queue.data && queue.data.dueCount > 0
              ? `${queue.data.dueCount} ${queue.data.dueCount === 1 ? "card is" : "cards are"} due again already: a card you missed returns within minutes.`
              : nextDueAt
                ? `Nothing else is due. The next card comes back ${formatReturn(nextDueAt)}.`
                : "Nothing else is due."}
          </p>
        </section>
      ) : null}
      {failure ? (
        <Notice live tone="error" title="Card unavailable">
          <p>{failure}</p>
        </Notice>
      ) : null}
      {rated ? (
        <div className="button-row review-session-actions">
          {!finished ? (
            <button
              aria-busy={busy}
              disabled={busy}
              className="button button-primary"
              onClick={() => void nextCard()}
              type="button"
            >
              Next card
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
            </button>
          ) : null}
          <Link
            className={`button ${finished ? "button-primary" : "button-quiet"}`}
            to={paths.review}
          >
            {finished ? "Back to Review" : "Finish the session"}
          </Link>
        </div>
      ) : null}
    </main>
  );
}
