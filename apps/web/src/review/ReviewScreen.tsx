import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { errorMessage } from "../api/client.js";
import { createReviewSession, getReviewSession } from "../api/endpoints.js";
import { queryKeys, useReviewHome } from "../api/queries.js";
import { formatDueDate } from "../lib/format.js";
import { paths } from "../lib/paths.js";
import { ErrorScreen, LoadingScreen, Notice } from "../ui/Feedback.js";
import { Flashcard } from "./Flashcard.js";

export function ReviewScreen() {
  const review = useReviewHome();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (review.isPending) return <LoadingScreen message="Checking what is due…" />;
  if (review.error || !review.data) {
    return (
      <ErrorScreen
        message={errorMessage(review.error, "The review queue did not load.")}
        title="Review unavailable"
      />
    );
  }

  async function start(): Promise<void> {
    setBusy(true);
    setFailure(null);
    try {
      const session = await createReviewSession();
      void navigate(paths.reviewSession(session.sessionId), { viewTransition: true });
    } catch (error) {
      setFailure(errorMessage(error, "A review session could not be started."));
      setBusy(false);
    }
  }

  const { dueCount, estimatedMinutes, courses } = review.data;

  return (
    <main className="page" id="stage">
      <h1>Review</h1>

      <section aria-label="Due now" className="review-summary">
        <p className="review-count">
          <strong>{dueCount}</strong>
          <span>
            {dueCount === 1 ? "card due" : "cards due"}
            {estimatedMinutes > 0 ? ` · about ${estimatedMinutes} min` : ""}
          </span>
        </p>
        <button
          aria-busy={busy}
          className="button button-primary"
          onClick={() => void start()}
          type="button"
        >
          {busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
          {dueCount > 0 ? "Start review" : "Review the earliest card"}
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
        </button>
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
                        ? formatDueDate(course.nextDueAt)
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
  const review = useReviewHome();
  const [rated, setRated] = useState(false);
  const [busy, setBusy] = useState(false);

  const session = useQuery({
    queryKey: queryKeys.reviewSession(sessionId ?? ""),
    queryFn: () => getReviewSession(sessionId ?? ""),
    enabled: Boolean(sessionId),
  });

  if (!sessionId) {
    return <ErrorScreen message="No review session was named." title="Session not found" />;
  }
  if (session.isPending) return <LoadingScreen message="Opening the card…" />;
  if (session.error || !session.data) {
    return (
      <ErrorScreen
        message={errorMessage(session.error, "The review card did not load.")}
        title="Card unavailable"
      />
    );
  }

  async function nextCard(): Promise<void> {
    setBusy(true);
    try {
      const next = await createReviewSession();
      await queryClient.invalidateQueries({ queryKey: queryKeys.reviewHome });
      setRated(false);
      void navigate(paths.reviewSession(next.sessionId), { viewTransition: true });
    } finally {
      setBusy(false);
    }
  }

  const dueCount = review.data?.dueCount ?? 1;

  return (
    <main className="page page-narrow" id="stage">
      <Flashcard
        conceptIds={session.data.card.conceptIds}
        front={session.data.card.front}
        onRated={() => setRated(true)}
        position={1}
        sessionId={session.data.sessionId}
        total={Math.max(1, dueCount)}
      />
      {rated ? (
        <div className="button-row">
          <button
            aria-busy={busy}
            className="button button-primary"
            onClick={() => void nextCard()}
            type="button"
          >
            Next card
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </button>
          <Link className="button button-quiet" to={paths.review}>
            Finish the session
          </Link>
        </div>
      ) : null}
    </main>
  );
}
