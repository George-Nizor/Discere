import type { CourseCheckSummary } from "@discere/contracts";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Compass, Flag } from "lucide-react";
import { Link } from "react-router";
import { ApiError } from "../api/client.js";
import { checkPath, checksKey, getCourseChecks, getDueChecks } from "./api.js";
import { CHECK_NAMES } from "./check-model.js";

export function checkDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
function CheckLink({ check }: { check: CourseCheckSummary }) {
  // The kind's own icon throughout; a tick would read as a pass whatever the score.
  const Icon =
    check.kind === "placement" ? Compass : check.kind === "checkpoint" ? Flag : CalendarDays;
  const status =
    check.status === "complete"
      ? "Taken · " + check.correctCount + " / " + check.questionCount + " correct"
      : check.status === "in_progress"
        ? "Continue where you left off"
        : check.status === "locked"
          ? check.kind === "transfer"
            ? check.availableAt
              ? "Opens " + checkDate(check.availableAt)
              : "Opens a week after “" + CHECK_NAMES.checkpoint + "”"
            : check.remainingLessons
              ? "Opens after " +
                check.remainingLessons +
                " more " +
                (check.remainingLessons === 1 ? "lesson" : "lessons")
              : check.availableAt
                ? "Opens " + checkDate(check.availableAt)
                : "Locked"
          : check.questionCount + " questions";
  return (
    <li className={"course-check-link is-" + check.status}>
      <Icon aria-hidden="true" size={23} />
      <div>
        <Link to={checkPath(check.courseId, check.id)}>
          {CHECK_NAMES[check.kind]}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
        <p>{status}</p>
      </div>
    </li>
  );
}
export function CourseChecks({ courseId }: { courseId: string }) {
  const query = useQuery({
    queryKey: checksKey(courseId),
    queryFn: () => getCourseChecks(courseId),
  });
  // An archived course has no checks; its 404 is an answer, not a failure.
  if (query.error instanceof ApiError && query.error.status === 404) return null;
  if (query.error)
    return (
      <p className="muted">
        Course checks could not load.{" "}
        <button type="button" className="text-button" onClick={() => void query.refetch()}>
          Retry
        </button>
      </p>
    );
  // Hold the space while loading so the roadmap does not jump when the list arrives.
  if (query.isPending)
    return (
      <section
        aria-busy="true"
        aria-label="Course checks"
        className="course-check-links is-loading"
      >
        <ul>
          {[0, 1, 2].map((index) => (
            <li className="course-check-link is-placeholder" key={index} />
          ))}
        </ul>
      </section>
    );
  if (!query.data?.checks.length) return null;
  return (
    <section className="course-check-links" aria-label="Course checks">
      <ul>
        {query.data.checks.map((c) => (
          <CheckLink key={c.id} check={c} />
        ))}
      </ul>
    </section>
  );
}
export function DueCourseChecks() {
  const query = useQuery({
    queryKey: ["due-course-checks"],
    queryFn: getDueChecks,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
  if (query.error)
    return (
      <p className="muted">
        Later checks could not load.{" "}
        <button type="button" className="text-button" onClick={() => void query.refetch()}>
          Retry
        </button>
      </p>
    );
  if (!query.data?.checks.length) return null;
  return (
    <section className="due-course-checks" aria-label="Later course checks">
      <h2>Use it again</h2>
      <p>Fresh problems from courses you finished earlier.</p>
      <ul>
        {query.data.checks.map((c) => (
          <CheckLink key={c.courseId + ":" + c.id} check={c} />
        ))}
      </ul>
    </section>
  );
}
