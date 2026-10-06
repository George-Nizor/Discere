import type { CourseSummary } from "@discere/contracts";
import { useQuery } from "@tanstack/react-query";
import {
  Binary,
  BookOpenText,
  BrainCircuit,
  Cog,
  Feather,
  Lightbulb,
  Orbit,
  Search,
  Shapes,
  X,
} from "lucide-react";
import { useDeferredValue, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { type LessonSearchResult, searchLessons } from "../api/endpoints.js";
import { paths } from "../lib/paths.js";
import { CourseCard } from "./CourseCard.js";
import { filterCourses, progressFilter, progressFilters } from "./library.js";

export function CourseLibrary({ courses }: { courses: CourseSummary[] }) {
  const [params, setParams] = useSearchParams();
  const requestedParams = useRef(params);
  useEffect(() => {
    requestedParams.current = params;
  }, [params]);
  const query = params.get("q") ?? "";
  const subject = params.get("subject") ?? "";
  const progress = progressFilter(params.get("progress"));
  const available = courses.filter((course) => course.status === "available");
  const subjects = [...new Set(available.flatMap((course) => course.subjects ?? []))].sort();
  const visible = filterCourses(available, query, subject, progress);
  const deferredQuery = useDeferredValue(query.trim());
  const lessonSearch = useQuery({
    queryKey: ["lesson-search", deferredQuery],
    queryFn: () => searchLessons(deferredQuery),
    enabled: deferredQuery.length >= 2,
    staleTime: Infinity,
    placeholderData: (previous) => previous,
  });
  const lessonMatches = deferredQuery.length >= 2 ? (lessonSearch.data ?? []) : [];
  const update = (name: string, value: string, replace = false) => {
    const next = new URLSearchParams(requestedParams.current);
    if (value && value !== "all") next.set(name, value);
    else next.delete(name);
    requestedParams.current = next;
    setParams(next, { replace });
  };
  const reset = () => {
    const next = new URLSearchParams(requestedParams.current);
    for (const name of ["q", "subject", "progress"]) next.delete(name);
    requestedParams.current = next;
    setParams(next);
  };

  const pathDefinitions = [
    {
      id: "foundations",
      title: "Foundations for thinking",
      description: "Explore number, pattern, logic and chance.",
      icon: Shapes,
      courses: [
        "maths-foundations",
        "geometry-shape-and-space",
        "linear-algebra-vectors-and-maps",
        "calculus-change-and-accumulation",
        "logic-and-reasoning",
        "probability-statistics",
      ].flatMap((id) => visible.filter((course) => course.id === id)),
    },
    {
      id: "computing",
      title: "Computing and data",
      description: "Follow an algorithm. Ask a better question of your data.",
      icon: Binary,
      courses: visible.filter((course) =>
        ["cs-basics", "sql-from-rows-to-reports", "python-for-data-analysis"].includes(course.id),
      ),
    },
    {
      id: "science",
      title: "Explore the natural world",
      description: "Predict motion, follow a reaction and explore living systems.",
      icon: Orbit,
      courses: visible.filter((course) =>
        [
          "physics-motion-and-forces",
          "astronomy-sky-to-cosmos",
          "chemistry-atoms-to-reactions",
          "biology-cells-to-ecosystems",
        ].includes(course.id),
      ),
    },
    {
      id: "engineering",
      title: "Build and design",
      description: "Load a beam, balance a truss, gear a machine.",
      icon: Cog,
      courses: visible.filter((course) =>
        ["engineering-structures-and-machines"].includes(course.id),
      ),
    },
    {
      id: "society",
      title: "Minds and markets",
      description: "How people think, choose, trade and compete.",
      icon: BrainCircuit,
      courses: ["psychology-how-minds-work", "economics-markets-and-strategy"].flatMap((id) =>
        visible.filter((course) => course.id === id),
      ),
    },
    {
      id: "humanities",
      title: "Ideas and words",
      description: "Argue precisely, read closely, write with force.",
      icon: Feather,
      courses: [
        "philosophy-knowledge-mind-and-ethics",
        "english-reading-writing-and-rhetoric",
      ].flatMap((id) => visible.filter((course) => course.id === id)),
    },
  ];
  const assigned = new Set(
    pathDefinitions.flatMap((path) => path.courses.map((course) => course.id)),
  );
  const remaining = visible.filter((course) => !assigned.has(course.id));
  if (remaining.length)
    pathDefinitions.push({
      id: "explore",
      title: "Explore more",
      description: "Discover your next idea.",
      icon: Shapes,
      courses: remaining,
    });
  return (
    <main className="page library-page" id="stage">
      <header className="library-head">
        <h1>Learning paths</h1>
        <p>Step by step, from curiosity to understanding.</p>
      </header>
      <div className="library-tools">
        <label className="library-search">
          <Search aria-hidden="true" size={20} strokeWidth={1.8} />
          <span className="sr-only">Search courses, lessons and ideas</span>
          <input
            type="search"
            value={query}
            placeholder="Search a course, lesson or idea"
            onChange={(event) => update("q", event.currentTarget.value, true)}
          />
          {query ? (
            <button type="button" aria-label="Clear search" onClick={() => update("q", "", true)}>
              <X aria-hidden="true" size={18} />
            </button>
          ) : null}
        </label>
        {subjects.length ? (
          <label className="library-progress library-subject-select">
            <span>Subject</span>
            <select
              value={subject}
              onChange={(event) => update("subject", event.currentTarget.value)}
            >
              <option value="">All subjects</option>
              {subjects.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="library-progress">
          <span>Progress</span>
          <select
            value={progress}
            onChange={(event) => update("progress", event.currentTarget.value)}
          >
            {progressFilters.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {subjects.length ? (
        <div className="library-subjects" role="group" aria-label="Filter by subject">
          <button type="button" aria-pressed={!subject} onClick={() => update("subject", "")}>
            All subjects
          </button>
          {subjects.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={subject === name}
              onClick={() => update("subject", name)}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="library-result-line">
        <p aria-live="polite" aria-atomic="true">
          {visible.length} {visible.length === 1 ? "course" : "courses"}
          {visible.length !== available.length ? " of " + available.length : ""}
          {lessonMatches.length
            ? ` · ${lessonMatches.length} ${lessonMatches.length === 1 ? "lesson" : "lessons"}`
            : ""}
        </p>
        {query || subject || progress !== "all" ? (
          <button className="library-reset" type="button" onClick={reset}>
            Clear filters
          </button>
        ) : null}
      </div>
      {lessonMatches.length ? (
        <LessonMatches query={deferredQuery} results={lessonMatches} />
      ) : null}
      {visible.length ? (
        <div className="learning-paths" key={subject + ":" + progress}>
          {pathDefinitions
            .filter((path) => path.courses.length)
            .map((path) => (
              <section className="learning-path-section" aria-label={path.title} key={path.id}>
                <header className="learning-path-head">
                  <span className="learning-path-symbol">
                    <path.icon aria-hidden="true" />
                  </span>
                  <div>
                    <h2>{path.title}</h2>
                    <p>{path.description}</p>
                  </div>
                </header>
                <ol
                  className="learning-path-courses"
                  onFocus={(event) => {
                    event.target.closest<HTMLElement>(".course-card")?.scrollIntoView?.({
                      block: "nearest",
                      inline: "nearest",
                      behavior: "instant",
                    });
                  }}
                >
                  {path.courses.map((course, index) => (
                    <li key={course.id}>
                      <CourseCard course={course} index={index} />
                    </li>
                  ))}
                </ol>
              </section>
            ))}
        </div>
      ) : lessonMatches.length ? null : (
        <div className="library-empty">
          <Search aria-hidden="true" size={32} strokeWidth={1.5} />
          <h2>{query ? "Nothing matches that search" : "No courses match"}</h2>
          <p>
            {query
              ? "No course, lesson or idea mentions it yet. Try a shorter word or another subject."
              : "Try another subject or progress filter."}
          </p>
          <button className="button button-primary" type="button" onClick={reset}>
            Show all courses
          </button>
        </div>
      )}
    </main>
  );
}

const MATCH_LABEL: Record<LessonSearchResult["match"], string> = {
  lesson: "Lesson",
  concept: "Idea taught here",
  content: "Mentioned in the lesson",
};

/** Lessons whose title, ideas or teaching text match the search, each opening the lesson. */
function LessonMatches({ query, results }: { query: string; results: LessonSearchResult[] }) {
  return (
    <section aria-label="Lessons and ideas" className="library-lesson-matches">
      <h2>
        Lessons and ideas <span>matching “{query}”</span>
      </h2>
      <ul>
        {results.map((result) => (
          <li key={result.courseId + "/" + result.lessonId}>
            <Link
              className="library-lesson-match"
              to={paths.lesson(result.courseId, result.lessonId)}
              viewTransition
            >
              <span className="library-lesson-match-icon" aria-hidden="true">
                {result.match === "lesson" ? <BookOpenText size={18} /> : <Lightbulb size={18} />}
              </span>
              <span className="library-lesson-match-text">
                <strong>{result.lessonTitle}</strong>
                <small>
                  {result.courseTitle} · {MATCH_LABEL[result.match]}
                </small>
                {result.snippet ? <span>{result.snippet}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
