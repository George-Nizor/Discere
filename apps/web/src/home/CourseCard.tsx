import type { CourseSummary } from "@discere/contracts";
import { Link } from "react-router";
import { paths } from "../lib/paths.js";
import { ProgressRing } from "../ui/ProgressRing.js";

/**
 * One course on the catalogue. The whole card is the target, so there is never a small link to
 * hunt for. A course that is not ready renders in the same shape rather than being hidden, so
 * the library shows where it is going without pretending the lessons exist.
 */
export function CourseCard({
  course,
  index = 0,
  compact = false,
}: {
  course: CourseSummary;
  /** Position in the grid, used to stagger the entrance in reading order. */
  index?: number;
  compact?: boolean;
}) {
  const comingSoon = course.status === "coming_soon";
  const style = {
    "--course-accent": course.accent,
    "--enter-index": index,
  } as React.CSSProperties;

  const body = (
    <>
      <span aria-hidden="true" className="course-card-stripe" />
      {course.coverUrl ? (
        <img alt="" className="course-card-cover" loading="lazy" src={course.coverUrl} />
      ) : (
        <span aria-hidden="true" className="course-card-cover course-card-cover-blank" />
      )}
      <span className="course-card-body">
        <span className="course-card-heading">
          <strong className="course-card-title">{course.title}</strong>
          {comingSoon ? <span className="course-card-tag">In production</span> : null}
        </span>
        <span className="course-card-description">{course.description}</span>
        <span className="course-card-foot">
          <span className="course-card-meta">
            {course.completedLessonCount} of {course.lessonCount}{" "}
            {course.lessonCount === 1 ? "lesson" : "lessons"}
          </span>
          {comingSoon ? null : (
            <ProgressRing
              completed={course.completedLessonCount}
              label="lessons"
              size={compact ? 34 : 40}
              total={course.lessonCount}
            />
          )}
        </span>
      </span>
    </>
  );

  const className = `course-card rise-in${compact ? " course-card-compact" : ""}`;
  if (comingSoon) {
    return (
      <div aria-disabled="true" className={`${className} is-coming-soon`} style={style}>
        {body}
      </div>
    );
  }
  return (
    <Link className={`${className} lift`} style={style} to={paths.course(course.id)} viewTransition>
      {body}
    </Link>
  );
}
