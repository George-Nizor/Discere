import type { CourseDetailResponse, CourseLessonSummary } from "@discere/contracts";
import { ArrowRight, BookOpen, Check, Layers, Play } from "lucide-react";
import { useState } from "react";
import { LessonPedestal } from "../ui/LessonPedestal.js";
import { Link } from "react-router";
import { paths } from "../lib/paths.js";
import { reducedMotionEnabled } from "../study/experience.js";
import { LearningCompanion } from "../ui/LearningCompanion.js";
import { usePlacement } from "../checks/check-model.js";

export function CourseRoadmap({ detail }: { detail: CourseDetailResponse }) {
  const lessons = detail.lessons.filter((lesson) => lesson.available);
  // A finished placement marks the lessons it showed the learner knows, and moves the suggested
  // next lesson past them. Known lessons stay open: placement advises, it never locks.
  const { placedOut, startLessonId } = usePlacement(detail.course.id);
  const known = (lesson: CourseLessonSummary) => !lesson.completed && placedOut.has(lesson.id);
  const current =
    lessons.find((lesson) => !lesson.completed && !known(lesson)) ??
    lessons.find((lesson) => !lesson.completed) ??
    lessons[0];
  // Until the learner picks a stop, the selection follows the suggested lesson, which can move
  // once a placement result arrives.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = lessons.find((lesson) => lesson.id === selectedId) ?? current;
  const modules = detail.modules?.filter((module) =>
    module.lessonIds.some((id) => lessons.some((lesson) => lesson.id === id)),
  ) ?? [
    {
      id: "course",
      title: detail.course.title,
      description: detail.course.description,
      lessonIds: lessons.map((lesson) => lesson.id),
    },
  ];
  const seen = new Set<string>();
  const groups = modules
    .map((module) => ({
      ...module,
      lessons: module.lessonIds.flatMap((id) => {
        const lesson = lessons.find((item) => item.id === id);
        if (!lesson || seen.has(id)) return [];
        seen.add(id);
        return [lesson];
      }),
    }))
    .filter((module) => module.lessons.length);
  const extra = lessons.filter((lesson) => !seen.has(lesson.id));
  if (extra.length)
    groups.push({
      id: "further",
      title: "Further ideas",
      description: "",
      lessonIds: extra.map((lesson) => lesson.id),
      lessons: extra,
    });
  let position = 0;
  function node(lesson: CourseLessonSummary) {
    const index = position++;
    const active = lesson.id === selected?.id;
    return (
      <li
        key={lesson.id}
        className={
          "roadmap-node" +
          (active ? " is-selected" : "") +
          (lesson.completed ? " is-complete" : "") +
          (known(lesson) ? " is-known" : "") +
          (lesson.id === startLessonId && !lesson.completed && !known(lesson) ? " is-start" : "")
        }
        style={
          { "--node-offset": [-28, 34, 74, 22, -46, -72][index % 6] + "px" } as React.CSSProperties
        }
      >
        <button
          type="button"
          className="roadmap-stop"
          aria-pressed={active}
          aria-label={
            lesson.title +
            (lesson.completed
              ? ", completed"
              : known(lesson)
                ? ", known from your placement, optional"
                : lesson.id === current?.id
                  ? ", next lesson"
                  : "")
          }
          onClick={(event) => {
            const stop = event.currentTarget;
            setSelectedId(lesson.id);
            window.requestAnimationFrame(() =>
              stop.scrollIntoView?.({
                block: "center",
                behavior: reducedMotionEnabled() ? "instant" : "smooth",
              }),
            );
          }}
        >
          <span className="roadmap-art">
            <LessonPedestal done={lesson.completed} active={active} />
            {active ? <LearningCompanion className="roadmap-companion" /> : null}
          </span>
          <span className="roadmap-title">
            {lesson.title}
            {lesson.completed ? <span className="sr-only">Completed</span> : null}
          </span>
        </button>
      </li>
    );
  }
  return (
    <div className="course-roadmap">
      <div className="roadmap-modules">
        {groups.map((module, index) => (
          <section className="roadmap-module" key={module.id} aria-label={module.title}>
            <header className="roadmap-module-head">
              <span>Unit {index + 1}</span>
              <h2>{module.title}</h2>
            </header>
            <ol className="roadmap-nodes">{module.lessons.map(node)}</ol>
          </section>
        ))}
      </div>
      {selected ? (
        <aside className="roadmap-launch" aria-label="Selected lesson">
          <div key={selected.id} className="roadmap-launch-copy">
            <h2>{selected.title}</h2>
            <p>{selected.orientation}</p>
            {known(selected) ? (
              <p className="roadmap-launch-note">
                Your placement showed you know this. It is optional; open it to refresh.
              </p>
            ) : null}
          </div>
          <Link
            className="button button-primary"
            viewTransition
            to={paths.lesson(detail.course.id, selected.id)}
          >
            {selected.completed ? (
              <Check aria-hidden="true" size={18} />
            ) : (
              <Play aria-hidden="true" size={18} />
            )}
            {selected.completed
              ? "Revisit lesson"
              : selected.id === current?.id && detail.course.lastActiveAt
                ? "Continue"
                : "Start lesson"}
          </Link>
        </aside>
      ) : null}
    </div>
  );
}

export function CourseOverview({ detail }: { detail: CourseDetailResponse }) {
  const course = detail.course;
  return (
    <aside className="course-overview">
      <Link className="course-back" to={paths.courses}>
        <ArrowRight aria-hidden="true" size={16} />
        Learning paths
      </Link>
      <div className="course-overview-body">
        {course.coverUrl ? (
          <img src={course.coverUrl} alt="" className="course-overview-art" />
        ) : null}
        <p className="course-overview-subject">{course.subjects?.join(" · ")}</p>
        <h1>{course.title}</h1>
        <p className="course-overview-description">{course.description}</p>
        <div className="course-overview-counts">
          <span>
            <BookOpen aria-hidden="true" size={17} />
            {course.lessonCount} lessons
          </span>
          {detail.exerciseCount ? (
            <span>
              <Layers aria-hidden="true" size={17} />
              {detail.exerciseCount} exercises
            </span>
          ) : null}
        </div>
        {course.completedLessonCount ? (
          <p className="course-overview-earned">
            {course.completedLessonCount} of {course.lessonCount} lessons completed
          </p>
        ) : null}
      </div>
    </aside>
  );
}
