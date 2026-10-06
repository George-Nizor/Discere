import type { CourseDetailResponse, CourseSummary, HomeResponse } from "@discere/contracts";
import { ArrowRight, BookOpen, Check, Layers } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { useEffect, useRef } from "react";
import { reducedMotionEnabled } from "../study/experience.js";
import { errorMessage } from "../api/client.js";
import { useCourse, useCourses, useHome, useJourneyProgress, useStudy } from "../api/queries.js";
import { paths } from "../lib/paths.js";
import { StudyRhythm } from "../study/StudyRhythm.js";
import { AchievementMedal, closestAchievements } from "../game/AchievementWall.js";
import { InventoryCard } from "../game/Inventory.js";
import { QuestBoard } from "../game/QuestBoard.js";
import { FirstRunPrimer, HomeHero } from "../game/HomeHero.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { LearningCompanion } from "../ui/LearningCompanion.js";
import { LessonPedestal } from "../ui/LessonPedestal.js";

export function HomeScreen() {
  const home = useHome();
  const catalogue = useCourses();
  const study = useStudy();
  const [params, setParams] = useSearchParams();
  if (home.isPending || catalogue.isPending) return <LoadingScreen message="Opening Discere…" />;
  if (home.error || catalogue.error || !home.data || !catalogue.data) {
    return (
      <ErrorScreen
        title="Discere could not start"
        error={home.error ?? catalogue.error}
        message={errorMessage(home.error ?? catalogue.error, "The local server did not answer.")}
        onRetry={() => Promise.all([home.refetch(), catalogue.refetch()])}
      />
    );
  }
  const courses = catalogue.data.courses
    .filter((course) => course.status === "available")
    .sort((left, right) => (right.lastActiveAt ?? "").localeCompare(left.lastActiveAt ?? ""));
  const course =
    courses.find((item) => item.id === params.get("course")) ??
    courses.find((item) => item.id === home.data.currentMission.courseId) ??
    courses[0];
  if (!course)
    return <ErrorScreen title="Your courses could not load" message="Try reopening Discere." />;
  const suggestions = courses
    .filter(
      (item) => item.id !== course.id && !item.lastActiveAt && item.completedLessonCount === 0,
    )
    .slice(0, 3);
  const almost = closestAchievements(study.data?.achievements ?? [], 2);

  return (
    <main className="page home-homepage" id="stage">
      <HomeHero name={home.data.learnerName} study={study.data} />
      <div className="home-dashboard">
        <div className="home-game">
          {study.data?.firstRun ? <FirstRunPrimer /> : null}
          {study.data?.quests ? (
            <QuestBoard quests={study.data.quests} swaps={study.data.inventory?.questSwaps ?? 0} />
          ) : null}
          <aside className="home-practice" aria-label="Today">
            {study.data ? (
              <StudyRhythm study={study.data} />
            ) : study.error ? (
              <p role="status" className="muted">
                Your practice history could not load.
              </p>
            ) : (
              <p role="status" className="muted">
                Loading your practice…
              </p>
            )}
            {home.data.dueReviews > 0 ? (
              <Link className="home-review-link" to={paths.review} viewTransition>
                <Layers size={19} aria-hidden="true" />
                <span>
                  <strong>{home.data.dueReviews}</strong>{" "}
                  {home.data.dueReviews === 1 ? "card is" : "cards are"} ready to review
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            ) : null}
            <Link className="home-activity-link" to={paths.you}>
              Your learning activity <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </aside>
        </div>
        <section className="home-learning" aria-label="Continue learning">
          <HomeCourseSelector
            courses={courses}
            selectedId={course.id}
            onSelect={(id) => {
              // Switching course is a view choice, not a place: Back should leave Home.
              setParams(
                (previous) => {
                  const next = new URLSearchParams(previous);
                  next.set("course", id);
                  return next;
                },
                { replace: true },
              );
            }}
          />
          <HomeCoursePanel key={course.id} course={course} home={home.data} />
        </section>
        {study.data?.inventory && !study.data.firstRun ? (
          <div className="home-side">
            <InventoryCard
              inventory={study.data.inventory}
              nextFreezeIn={study.data.streak.nextChargeIn}
            />
            {almost.length ? (
              <section className="home-almost" aria-labelledby="home-almost-title">
                <h2 id="home-almost-title">Almost there</h2>
                <ul>
                  {almost.map((item) => (
                    <li key={item.id}>
                      <AchievementMedal item={item} size={20} />
                      <span>
                        <strong>{item.title}</strong>
                        <span>
                          {item.current} of {item.nextTarget} for the next rank
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to={`${paths.you}#achievements`}>
                  All achievements <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
      {suggestions.length > 0 ? (
        <section className="home-discover" aria-labelledby="discover-heading">
          <div className="home-section-heading">
            <h2 id="discover-heading">Start something new</h2>
            <Link to={paths.courses}>
              All courses <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <ul className="home-suggestions">
            {suggestions.map((item) => (
              <li key={item.id}>
                <Link to={paths.course(item.id)} className="home-suggestion" viewTransition>
                  <img src={item.coverUrl} alt="" width={78} height={78} loading="lazy" />
                  <span>
                    <strong>{item.title}</strong>
                    <span>{item.lessonCount} lessons</span>
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <Link className="home-browse-link" to={paths.courses}>
          <BookOpen size={18} aria-hidden="true" /> Explore your courses
        </Link>
      )}
    </main>
  );
}

function HomeCoursePanel({ course, home }: { course: CourseSummary; home: HomeResponse }) {
  const detail = useCourse(course.id);
  if (detail.isPending)
    return (
      <div className="home-course-panel home-course-loading" role="status">
        Loading {course.title}…
      </div>
    );
  if (detail.error || !detail.data)
    return (
      <div className="home-course-panel home-course-loading">
        <p role="alert">{errorMessage(detail.error, "This course could not load.")}</p>
        <button type="button" className="button button-quiet" onClick={() => void detail.refetch()}>
          Try again
        </button>
      </div>
    );
  const lesson =
    detail.data.lessons.find((item) => item.id === detail.data?.resumeLessonId) ??
    detail.data.lessons.find(
      (item) => item.id === home.currentMission.lessonBeatId && item.available,
    ) ??
    detail.data.lessons.find((item) => item.available && !item.completed) ??
    detail.data.lessons.find((item) => item.available);
  if (!lesson) return null;
  return <HomeLessonPanel course={detail.data.course} detail={detail.data} lessonId={lesson.id} />;
}

function HomeLessonPanel({
  course,
  detail,
  lessonId,
}: {
  course: CourseSummary;
  detail: CourseDetailResponse;
  lessonId: string;
}) {
  const progress = useJourneyProgress(course.id, lessonId);
  const lessons = detail.lessons.filter((lesson) => lesson.available);
  const selectedIndex = Math.max(
    0,
    lessons.findIndex((lesson) => lesson.id === lessonId),
  );
  const current = lessons[selectedIndex];
  const moduleIndex =
    detail.modules?.findIndex((module) => module.lessonIds.includes(lessonId)) ?? -1;
  const module = moduleIndex >= 0 ? detail.modules?.[moduleIndex] : undefined;
  const start = Math.max(0, Math.min(selectedIndex, lessons.length - 3));
  const preview = lessons.slice(start, start + 3);
  const started =
    Boolean(course.lastActiveAt) ||
    Boolean(
      progress.data?.stages.some(
        (stage) =>
          stage.state === "completed" ||
          stage.state === "skipped_optional" ||
          Object.keys(stage.interactionState).length > 0,
      ),
    );
  const finished = lessons.every((lesson) => lesson.completed);
  const resumePath = finished
    ? paths.course(course.id)
    : progress.data
      ? paths.stage(course.id, lessonId, progress.data.activeStageId)
      : paths.lesson(course.id, lessonId);
  const fraction = Math.min(
    100,
    Math.round((course.completedLessonCount / course.lessonCount) * 100),
  );
  if (!current) return null;
  return (
    <div
      className="home-course-panel"
      style={{ "--course-accent": course.accent } as React.CSSProperties}
    >
      <img className="home-course-art" src={course.coverUrl} alt="" width={164} height={164} />
      <div className="home-course-intro">
        <h2>
          <Link to={paths.course(course.id)}>{course.title}</Link>
        </h2>
        <p className="home-course-level">
          {module ? "Unit " + (moduleIndex + 1) + " · " + module.title : course.subjects?.[0]}
        </p>
        <div
          className="home-course-progress"
          role="progressbar"
          aria-label={course.title + " course progress"}
          aria-valuenow={course.completedLessonCount}
          aria-valuemin={0}
          aria-valuemax={course.lessonCount}
          aria-valuetext={
            course.completedLessonCount + " of " + course.lessonCount + " lessons finished"
          }
        >
          <span style={{ width: fraction + "%" }} />
        </div>
        <p className="home-course-count">
          {course.completedLessonCount} of {course.lessonCount} lessons finished
        </p>
      </div>
      <ol className="home-lesson-preview" aria-label="Upcoming lessons">
        {preview.map((lesson) => (
          <li
            key={lesson.id}
            className={
              (lesson.id === lessonId ? "is-current" : "") +
              (lesson.completed ? " is-complete" : "")
            }
          >
            <span className="home-lesson-art">
              <LessonPedestal done={lesson.completed} active={lesson.id === lessonId} />
              {lesson.id === lessonId && !lesson.completed ? (
                <LearningCompanion className="home-lesson-companion" />
              ) : null}
            </span>
            <span className="home-lesson-title">{lesson.title}</span>
            {lesson.completed ? (
              <Check size={19} className="home-lesson-check" aria-label="Completed" />
            ) : (
              <span
                className="home-lesson-dot"
                aria-label={lesson.id === lessonId ? "Next lesson" : "Upcoming"}
              />
            )}
          </li>
        ))}
      </ol>
      <Link
        className="button button-primary home-resume"
        to={resumePath}
        viewTransition
        aria-label={
          finished ? "View " + course.title : (started ? "Resume " : "Start ") + current.title
        }
      >
        {finished ? "View course" : started ? "Resume" : "Start"}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
      {finished ? null : (
        <Link className="home-roadmap-link" to={paths.course(course.id)}>
          View course roadmap
        </Link>
      )}
    </div>
  );
}

function HomeCourseSelector({
  courses,
  selectedId,
  onSelect,
}: {
  courses: CourseSummary[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const lastSelection = useRef(selectedId);
  const order = courses.map((course) => course.id).join(":");
  useEffect(() => {
    const container = strip.current;
    if (!container) return;
    const changed = lastSelection.current !== selectedId;
    lastSelection.current = selectedId;
    const reveal = (smooth = false) => {
      const selected = container.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
      if (!selected) return;
      const offset =
        selected.getBoundingClientRect().left -
        container.getBoundingClientRect().left +
        container.scrollLeft;
      container.scrollTo?.({
        left: Math.max(0, offset - (container.clientWidth - selected.clientWidth) / 2),
        behavior: smooth && !reducedMotionEnabled() ? "smooth" : "instant",
      });
    };
    reveal(changed);
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => reveal());
    observer?.observe(container);
    return () => observer?.disconnect();
  }, [selectedId, order]);
  return (
    // One Tab stop for the whole switcher; arrow keys move between courses (a radio group).
    <div
      ref={strip}
      className="home-course-switcher"
      aria-label="Choose a course"
      role="radiogroup"
      onKeyDown={(event) => {
        const keys: Record<string, number> = {
          ArrowRight: 1,
          ArrowDown: 1,
          ArrowLeft: -1,
          ArrowUp: -1,
        };
        const index = courses.findIndex((course) => course.id === selectedId);
        let target: number | null = null;
        if (event.key in keys)
          target = (index + (keys[event.key] ?? 0) + courses.length) % courses.length;
        else if (event.key === "Home") target = 0;
        else if (event.key === "End") target = courses.length - 1;
        const next = target === null ? undefined : courses[target];
        if (!next) return;
        event.preventDefault();
        onSelect(next.id);
        window.requestAnimationFrame(() =>
          strip.current
            ?.querySelector<HTMLButtonElement>(`button[data-course="${CSS.escape(next.id)}"]`)
            ?.focus(),
        );
      }}
    >
      {courses.map((course) => (
        <span className="home-course-switcher-item" key={course.id}>
          <button
            type="button"
            role="radio"
            aria-checked={course.id === selectedId}
            aria-pressed={course.id === selectedId}
            aria-label={course.title}
            data-course={course.id}
            tabIndex={course.id === selectedId ? 0 : -1}
            title={course.title}
            onClick={() => onSelect(course.id)}
          >
            <img src={course.coverUrl} alt="" width={46} height={46} />
            {course.completedLessonCount >= course.lessonCount ? (
              <Check className="home-course-complete" size={14} aria-hidden="true" />
            ) : null}
          </button>
        </span>
      ))}
    </div>
  );
}
