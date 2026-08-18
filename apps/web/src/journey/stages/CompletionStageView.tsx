import type { CompletionStage } from "@discere/contracts";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useHome, useReviewHome } from "../../api/queries.js";
import { humaniseId } from "../../lib/format.js";
import { paths } from "../../lib/paths.js";

export function CompletionStageView({
  stage,
  courseId,
  nextLesson,
}: {
  stage: CompletionStage;
  courseId: string;
  nextLesson: { id: string; title: string } | null;
}) {
  const home = useHome();
  const review = useReviewHome();
  const progress = home.data?.progress ?? [];

  const rows = stage.concepts.map((conceptId) => {
    const record = progress.find((entry) => entry.conceptId === conceptId);
    return {
      conceptId,
      title: record?.title ?? humaniseId(conceptId),
      state: record?.state ?? "available",
      independentAttempts: record?.independentAttempts ?? 0,
      assistedAttempts: record?.assistedAttempts ?? 0,
    };
  });

  return (
    <div className="stage-column completion">
      <h1>{stage.title}</h1>
      <p className="deck">{stage.nextAction}</p>

      <section aria-label="Concepts encountered" className="completion-concepts">
        <h2>What you worked on</h2>
        <table className="evidence-table">
          <thead>
            <tr>
              <th scope="col">Concept</th>
              <th scope="col">State</th>
              <th scope="col">Independent</th>
              <th scope="col">Assisted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.conceptId}>
                <th scope="row">{row.title}</th>
                <td>{humaniseId(row.state)}</td>
                <td>{row.independentAttempts}</td>
                <td>{row.assistedAttempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="completion-meta muted">
        {home.data ? `${home.data.xp} XP in total` : "XP is loading"}
        {review.data
          ? ` · ${review.data.dueCount} review ${review.data.dueCount === 1 ? "item" : "items"} due`
          : ""}
      </p>

      <div className="button-row">
        {nextLesson ? (
          <Link className="button button-primary" to={paths.lesson(courseId, nextLesson.id)}>
            Start {nextLesson.title}
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </Link>
        ) : (
          <Link className="button button-primary" to={paths.course(courseId)}>
            Back to the course
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </Link>
        )}
        <Link className="button button-secondary" to={paths.review}>
          Go to review
        </Link>
      </div>
    </div>
  );
}
