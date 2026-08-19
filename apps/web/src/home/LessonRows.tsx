import { ArrowRight, Check, Lock } from "lucide-react";
import { Link } from "react-router";
import { useCourse } from "../api/queries.js";
import { paths } from "../lib/paths.js";

/**
 * The lesson index, as a column of cards rather than a table of rows: a lesson is a thing you
 * pick up, and the whole card is the target. A lesson without content says so instead of
 * offering a control that goes nowhere.
 */
export function LessonRows({
  courseId,
  currentLessonId,
}: {
  courseId: string;
  currentLessonId?: string;
}) {
  const course = useCourse(courseId);
  if (course.isPending) return <p className="muted">Loading lessons…</p>;
  if (!course.data) return <p className="muted">The lesson list did not load.</p>;

  return (
    <ol className="lesson-cards">
      {course.data.lessons.map((lesson, index) => {
        const done = lesson.completed;
        const current = lesson.id === currentLessonId;
        const classes = [
          "lesson-card",
          lesson.available ? "lift" : "is-locked",
          current ? "is-current" : "",
          done ? "is-done" : "",
          "rise-in",
        ]
          .filter(Boolean)
          .join(" ");

        const inner = (
          <>
            <span aria-hidden="true" className="lesson-card-number">
              {done ? <Check size={16} strokeWidth={2.2} /> : index + 1}
            </span>
            <span className="lesson-card-body">
              <span className="lesson-card-title">{lesson.title}</span>
              <span className="lesson-card-orientation">{lesson.orientation}</span>
            </span>
            <span className="lesson-card-action">
              {lesson.available ? (
                <>
                  {current ? "Continue" : done ? "Revisit" : "Open"}
                  <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
                </>
              ) : (
                <>
                  <Lock aria-hidden="true" size={14} strokeWidth={1.8} />
                  Written, not open yet
                </>
              )}
            </span>
          </>
        );

        return (
          <li key={lesson.id} style={{ "--enter-index": index } as React.CSSProperties}>
            {lesson.available ? (
              <Link className={classes} to={paths.lesson(courseId, lesson.id)} viewTransition>
                {inner}
              </Link>
            ) : (
              <div aria-disabled="true" className={classes}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
