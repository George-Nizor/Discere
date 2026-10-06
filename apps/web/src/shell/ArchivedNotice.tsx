import { Archive } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getCourseDetail } from "../api/endpoints.js";
import { queryKeys, useCourses } from "../api/queries.js";
import { paths } from "../lib/paths.js";

/** The course id in a course address, if there is one. Exported for tests. */
export function courseIdOfPath(pathname: string): string | null {
  const match = pathname.match(/^\/courses\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Archived courses still open from old links and saved history, but they are no longer in the
 * library and some predate the current design. Say so plainly on every screen of one, with a
 * way back to the library, rather than letting it pass as a current course.
 */
export function ArchivedNotice() {
  const { pathname } = useLocation();
  const courseId = courseIdOfPath(pathname);
  const courses = useCourses();
  const listed = courses.data?.courses.some((course) => course.id === courseId);
  // Only a course that exists but is not listed is archived; an unknown id is a 404 instead.
  const detail = useQuery({
    queryKey: queryKeys.course(courseId ?? ""),
    queryFn: () => getCourseDetail(courseId ?? ""),
    enabled: Boolean(courseId) && courses.isSuccess && !listed,
  });
  if (!courseId || !courses.data || listed || !detail.data) return null;
  return (
    <aside aria-label="Archived course" className="archived-notice">
      <Archive aria-hidden="true" size={18} />
      <p>
        <strong>Archived course.</strong> It is kept from an earlier version of Discere so your
        history stays readable, but it is no longer in the library or updated.
      </p>
      <Link className="button button-quiet" to={paths.courses}>
        Browse current courses
      </Link>
    </aside>
  );
}
