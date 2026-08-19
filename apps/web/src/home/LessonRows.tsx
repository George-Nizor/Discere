import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useCourse } from "../api/queries.js";
import { paths } from "../lib/paths.js";

/** The lesson index. A lesson without content says so instead of offering a dead control. */
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
    <ol className="lesson-rows">
      {course.data.lessons.map((lesson, index) => (
        <li
          className={lesson.available ? "lesson-row" : "lesson-row lesson-row-planned"}
          key={lesson.id}
        >
          <span className="lesson-number">{index + 1}</span>
          <span className="lesson-body">
            <strong>{lesson.title}</strong>
            <span className="muted">{lesson.orientation}</span>
          </span>
          {lesson.available ? (
            <Link className="lesson-open" to={paths.lesson(courseId, lesson.id)}>
              {lesson.id === currentLessonId ? "Continue" : "Open"}
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
            </Link>
          ) : (
            <span className="lesson-planned muted">Written, not open yet</span>
          )}
        </li>
      ))}
    </ol>
  );
}
