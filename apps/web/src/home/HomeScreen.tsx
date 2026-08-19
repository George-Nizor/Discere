import type { CourseListResponse, CourseSummary, HomeResponse } from "@discere/contracts";
import { ArrowRight, Clock, Flame, Layers, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { errorMessage } from "../api/client.js";
import { useCourses, useHome, useJourneyProgress } from "../api/queries.js";
import { paths } from "../lib/paths.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { ProgressRing } from "../ui/ProgressRing.js";
import { CourseCard } from "./CourseCard.js";

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen() {
  const home = useHome();
  const courses = useCourses();
  if (home.isPending || courses.isPending) return <LoadingScreen message="Opening Discere…" />;
  // The mission names its own course, so a library with several courses continues the one the
  // learner last worked on rather than whichever sorts first.
  const course =
    courses.data?.courses.find((item) => item.id === home.data?.currentMission.courseId) ??
    courses.data?.courses[0];
  if (home.error || courses.error || !home.data || !courses.data || !course) {
    return (
      <ErrorScreen
        message={errorMessage(home.error ?? courses.error, "The local server did not answer.")}
        title="Discere could not start"
      />
    );
  }
  return <HomeContent catalogue={courses.data} course={course} home={home.data} />;
}

function HomeContent({
  home,
  course,
  catalogue,
}: {
  home: HomeResponse;
  course: CourseSummary;
  catalogue: CourseListResponse;
}) {
  const lessonId = home.currentMission.lessonBeatId;
  const progress = useJourneyProgress(course.id, lessonId);
  const stages = progress.data?.stages ?? [];
  const done = stages.filter(
    (stage) => stage.state === "completed" || stage.state === "skipped_optional",
  ).length;
  const started = done > 0 || stages.some((stage) => stage.state === "active");
  const resumePath = progress.data
    ? paths.stage(course.id, lessonId, progress.data.activeStageId)
    : paths.lesson(course.id, lessonId);
  const accent = { "--course-accent": course.accent } as React.CSSProperties;

  return (
    <main className="page home" id="stage">
      <header className="home-hero">
        <p className="eyebrow">{`${greeting(new Date().getHours())}, ${home.learnerName}`}</p>
        <h1 className="home-hero-title">What will you understand today?</h1>
        <ul className="home-chips">
          <li className="chip">
            <Flame aria-hidden="true" className="flame-pulse" size={16} strokeWidth={1.7} />
            <strong>{home.streakDays}</strong>
            <span>{home.streakDays === 1 ? "day streak" : "day streak"}</span>
          </li>
          <li className="chip">
            <Sparkles aria-hidden="true" size={16} strokeWidth={1.7} />
            <strong>{home.xp}</strong>
            <span>XP</span>
          </li>
          <li className="chip">
            <Clock aria-hidden="true" size={16} strokeWidth={1.7} />
            <strong>{home.todayMinutes}</strong>
            <span>min today</span>
          </li>
        </ul>
      </header>

      <section aria-label="Continue learning" className="continue-card lift" style={accent}>
        <Link className="continue-link" to={resumePath} viewTransition>
          <span className="continue-body">
            <span className="eyebrow">{started ? "Pick up where you left off" : "Start here"}</span>
            <span className="continue-title">{home.currentMission.title}</span>
            <span className="continue-description">{home.currentMission.description}</span>
            <span className="continue-meta">
              {course.title} · about {home.currentMission.estimatedMinutes} minutes
            </span>
          </span>
          <span className="continue-side">
            {stages.length > 0 ? (
              <ProgressRing
                caption={`${done}/${stages.length}`}
                completed={done}
                label="stages"
                size={60}
                total={stages.length}
              />
            ) : null}
            <span className="button button-primary continue-action">
              {started ? "Resume" : "Begin"}
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
            </span>
          </span>
        </Link>
      </section>

      {home.dueReviews > 0 ? (
        <Link className="review-strip lift" to={paths.review} viewTransition>
          <Layers aria-hidden="true" size={18} strokeWidth={1.7} />
          <span>
            <strong>{home.dueReviews}</strong>{" "}
            {home.dueReviews === 1 ? "card is" : "cards are"} ready to review
          </span>
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
        </Link>
      ) : null}

      <section aria-label="Your courses" className="home-courses">
        <h2 className="section-title">Your courses</h2>
        <ul className="course-grid course-grid-compact">
          {catalogue.courses.map((entry, index) => (
            <li key={entry.id}>
              <CourseCard compact course={entry} index={index} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
