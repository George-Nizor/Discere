import { useParams } from "react-router";
import { useAmbientAccent } from "../fx/ambient-accent.js";
import { ApiError, errorMessage } from "../api/client.js";
import { useCourse, useCourses } from "../api/queries.js";
import { paths } from "../lib/paths.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { CourseLibrary } from "./CourseLibrary.js";
import { CourseChecks } from "../checks/CourseChecks.js";
import { SqlProjects } from "../sql-projects/SqlProjects.js";
import { PythonProjects } from "../python-projects/PythonProjects.js";
import { CourseOverview, CourseRoadmap } from "./CourseRoadmap.js";

export function CourseListScreen() {
  const courses = useCourses();
  if (courses.isPending) return <LoadingScreen message="Loading courses…" />;
  if (courses.error || !courses.data) {
    return (
      <ErrorScreen
        error={courses.error}
        message={errorMessage(courses.error, "The course list did not load.")}
        onRetry={() => courses.refetch()}
        title="Courses unavailable"
      />
    );
  }
  return <CourseLibrary courses={courses.data.courses} />;
}

export function CourseScreen() {
  const { courseId } = useParams();
  const course = useCourse(courseId ?? "");
  useAmbientAccent(course.data?.course.accent);
  if (!courseId) {
    return (
      <ErrorScreen
        back={{ to: paths.courses, label: "Browse courses" }}
        message="No course was named in the address."
        title="Course not found"
      />
    );
  }
  if (course.isPending) return <LoadingScreen message="Loading the course…" />;
  const missing = course.error instanceof ApiError && course.error.status === 404;
  if (course.error || !course.data) {
    return (
      <ErrorScreen
        back={{ to: paths.courses, label: "Browse courses" }}
        error={course.error}
        message={
          missing
            ? "There is no course at this address. It may have been renamed or removed."
            : errorMessage(course.error, "The course did not load.")
        }
        onRetry={missing ? undefined : () => course.refetch()}
        title={missing ? "Course not found" : "Course unavailable"}
      />
    );
  }

  return (
    <main
      className="page course-path-page"
      id="stage"
      style={{ "--course-accent": course.data.course.accent } as React.CSSProperties}
    >
      <div className="course-overview-column">
        <CourseOverview detail={course.data} />
        <CourseChecks courseId={courseId} />
        <SqlProjects courseId={courseId} />
        <PythonProjects courseId={courseId} />
      </div>
      <CourseRoadmap key={courseId} detail={course.data} />
    </main>
  );
}
