import type { CourseSummary, HomeResponse } from "@discere/contracts";
import { ArrowRight, Flame, Layers, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { errorMessage } from "../api/client.js";
import { useCourses, useHome, useJourneyProgress, useReviewHome } from "../api/queries.js";
import { paths } from "../lib/paths.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { LessonRows } from "./LessonRows.js";

export function HomeScreen() {
  const home = useHome();
  const courses = useCourses();
  if (home.isPending || courses.isPending) return <LoadingScreen message="Opening Discere…" />;
  const course = courses.data?.courses[0];
  if (home.error || courses.error || !home.data || !course) {
    return (
      <ErrorScreen
        message={errorMessage(home.error ?? courses.error, "The local server did not answer.")}
        title="Discere could not start"
      />
    );
  }
  return <HomeContent course={course} home={home.data} />;
}

function HomeContent({ home, course }: { home: HomeResponse; course: CourseSummary }) {
  const lessonId = home.currentMission.lessonBeatId;
  const progress = useJourneyProgress(course.id, lessonId);
  const review = useReviewHome();
  const stages = progress.data?.stages ?? [];
  const done = stages.filter(
    (stage) => stage.state === "completed" || stage.state === "skipped_optional",
  ).length;
  const started = done > 0 || stages.some((stage) => stage.state === "active");
  const resumePath = progress.data
    ? paths.stage(course.id, lessonId, progress.data.activeStageId)
    : paths.lesson(course.id, lessonId);

  return (
    <main className="page" id="stage">
      <p className="eyebrow">Continue learning</p>
      <h1>{course.title}</h1>
      <p className="deck page-deck">{course.description}</p>

      <section aria-label="Current lesson" className="continue">
        <h2 className="continue-title">{home.currentMission.title}</h2>
        <p className="prose">
          <span>{home.currentMission.description}</span>
        </p>
        <p className="muted continue-meta">
          About {home.currentMission.estimatedMinutes} minutes
          {stages.length > 0 ? ` · ${done} of ${stages.length} stages done` : ""}
        </p>
        {stages.length > 0 ? (
          <ol className="stage-dots" aria-hidden="true">
            {stages.map((stage) => (
              <li
                className={
                  stage.state === "completed" || stage.state === "skipped_optional"
                    ? "stage-dot stage-dot-complete"
                    : stage.state === "active"
                      ? "stage-dot stage-dot-current"
                      : "stage-dot"
                }
                key={stage.stageId}
              />
            ))}
          </ol>
        ) : null}
        <Link className="button button-primary" to={resumePath}>
          {started ? "Resume lesson" : "Start lesson"}
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
        </Link>
      </section>

      <section aria-label="Your standing" className="stat-row">
        <p className="stat">
          <Sparkles aria-hidden="true" size={16} strokeWidth={1.6} />
          <strong>{home.xp}</strong>
          <span>XP earned</span>
        </p>
        <p className="stat">
          <Flame aria-hidden="true" size={16} strokeWidth={1.6} />
          <strong>{home.streakDays}</strong>
          <span>{home.streakDays === 1 ? "day streak" : "days streak"}</span>
        </p>
        <Link className="stat stat-link" to={paths.review}>
          <Layers aria-hidden="true" size={16} strokeWidth={1.6} />
          <strong>{review.data?.dueCount ?? 0}</strong>
          <span>due for review</span>
        </Link>
      </section>

      <section aria-label="Lessons" className="lesson-list">
        <h2>Lessons in this course</h2>
        <LessonRows courseId={course.id} currentLessonId={lessonId} />
        <Link className="button button-quiet" to={paths.course(course.id)}>
          Explore the course
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
        </Link>
      </section>
    </main>
  );
}
