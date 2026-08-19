import { ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router";
import { errorMessage } from "../api/client.js";
import { useCourse, useCourses } from "../api/queries.js";
import { CourseCard } from "./CourseCard.js";
import { humaniseId } from "../lib/format.js";
import { paths } from "../lib/paths.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { LessonRows } from "./LessonRows.js";

export function CourseListScreen() {
  const courses = useCourses();
  if (courses.isPending) return <LoadingScreen message="Loading courses…" />;
  if (courses.error || !courses.data) {
    return (
      <ErrorScreen
        message={errorMessage(courses.error, "The course list did not load.")}
        title="Courses unavailable"
      />
    );
  }
  const open = courses.data.courses.filter((course) => course.status === "available");
  const planned = courses.data.courses.length - open.length;
  const finished = open.reduce((sum, course) => sum + course.completedLessonCount, 0);
  const lessons = open.reduce((sum, course) => sum + course.lessonCount, 0);

  return (
    <main className="page" id="stage">
      <header className="page-head">
        <h1>Courses</h1>
        <p className="page-tally">
          <strong>{finished}</strong> of {lessons} lessons
          {planned > 0 ? ` · ${planned} in production` : ""}
        </p>
      </header>
      <ul className="course-grid">
        {courses.data.courses.map((course, index) => (
          <li key={course.id}>
            <CourseCard course={course} index={index} />
          </li>
        ))}
      </ul>
    </main>
  );
}

export function CourseScreen() {
  const { courseId } = useParams();
  const course = useCourse(courseId ?? "");
  if (!courseId) {
    return <ErrorScreen message="No course was named in the address." title="Course not found" />;
  }
  if (course.isPending) return <LoadingScreen message="Loading the course…" />;
  if (course.error || !course.data) {
    return (
      <ErrorScreen
        message={errorMessage(course.error, "The course did not load.")}
        title="Course unavailable"
      />
    );
  }

  const concepts = [...new Set(course.data.lessons.flatMap((lesson) => lesson.conceptIds))];
  const accent = { "--course-accent": course.data.course.accent } as React.CSSProperties;

  return (
    <main className="page" id="stage" style={accent}>
      <h1>{course.data.course.title}</h1>
      <p className="deck page-deck">{course.data.course.description}</p>

      <section aria-label="Lessons" className="lesson-list">
        <h2>Lessons</h2>
        <LessonRows courseId={courseId} />
      </section>

      <section aria-label="Concepts" className="concept-section">
        <h2>Concepts in this course</h2>
        <ul className="concept-chips">
          {concepts.map((concept) => (
            <li key={concept}>{humaniseId(concept)}</li>
          ))}
        </ul>
        <Link className="button button-quiet" to={paths.progress}>
          See concept mastery
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
        </Link>
      </section>
    </main>
  );
}
