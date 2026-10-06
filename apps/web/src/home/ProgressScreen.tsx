import type { StudyStatistics } from "@discere/contracts";
import { ArrowRight, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { errorMessage } from "../api/client.js";
import { useCourses, useHome, useStudy, useStudyStatistics } from "../api/queries.js";
import { formatPercent, humaniseId } from "../lib/format.js";
import { paths } from "../lib/paths.js";
import { AchievementWall } from "../game/AchievementWall.js";
import { LeagueCard } from "../game/LeagueCard.js";
import { LevelCard } from "../game/LevelCard.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { LearningCompanion } from "../ui/LearningCompanion.js";
import { activityBuckets, displayDate } from "./activity.js";
import { StudyStatisticsPeriodSchema } from "@discere/contracts";

const periods = [
  { id: "all", label: "All time" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
] as const;

export function ProgressScreen() {
  const home = useHome();
  const study = useStudy();
  const courses = useCourses();
  const [params, setParams] = useSearchParams();
  const parsed = StudyStatisticsPeriodSchema.safeParse(params.get("period") ?? "all");
  const period = parsed.success ? parsed.data : "all";
  const statistics = useStudyStatistics(period);
  const { hash } = useLocation();
  const studyLoaded = Boolean(study.data);
  // Links from the navigation land on the league or the achievements once they have rendered.
  useEffect(() => {
    if (!hash || !studyLoaded) return;
    document.getElementById(hash.slice(1))?.scrollIntoView?.({ block: "start" });
  }, [hash, studyLoaded]);
  if (home.isPending) return <LoadingScreen message="Loading your activity…" />;
  if (home.error || !home.data)
    return (
      <ErrorScreen
        title="Activity unavailable"
        message={errorMessage(home.error, "Your activity did not load.")}
      />
    );
  const ideas = home.data.progress
    .filter((row) => row.mastery > 0 || row.independentAttempts + row.assistedAttempts > 0)
    .sort((left, right) => right.mastery - left.mastery);
  const startedCourses =
    courses.data?.courses.filter(
      (course) =>
        course.status === "available" && (course.lastActiveAt || course.completedLessonCount > 0),
    ) ?? [];
  const week = statistics.data?.week;

  return (
    <main className="page you-page" id="stage">
      <header className="you-heading">
        <h1>Your learning activity</h1>
      </header>
      <section className="you-weekly" aria-labelledby="weekly-heading">
        <div className="you-weekly-title">
          <h2 id="weekly-heading">Weekly summary</h2>
          {week ? (
            <p>
              {displayDate(week.from)} – {displayDate(week.to, { year: "numeric" })}
            </p>
          ) : null}
        </div>
        <div className="you-weekly-copy">
          {week ? (
            week.totals.studyDays > 0 ? (
              <>
                <p>
                  {week.totals.lessons > 0 ? (
                    <>
                      You finished{" "}
                      <strong>
                        {week.totals.lessons} {week.totals.lessons === 1 ? "lesson" : "lessons"}
                      </strong>{" "}
                      over{" "}
                    </>
                  ) : (
                    <>You practised over </>
                  )}
                  <strong>
                    {week.totals.studyDays} {week.totals.studyDays === 1 ? "day" : "days"}
                  </strong>{" "}
                  this week.
                </p>
                <p>
                  {week.totals.answers}{" "}
                  {week.totals.answers === 1 ? "question answered" : "questions answered"}
                  {week.totals.reviews > 0 ? " · " + week.totals.reviews + " cards reviewed" : ""}
                  {week.totals.xp > 0 ? " · " + week.totals.xp + " XP earned" : ""}
                </p>
              </>
            ) : (
              <>
                <p>Start a lesson to build this week’s progress.</p>
                <Link to={paths.home}>
                  Find your next lesson <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </>
            )
          ) : (
            <p role="status">
              {statistics.error ? "Your weekly summary could not load." : "Loading your week…"}
            </p>
          )}
        </div>
        <LearningCompanion className="you-weekly-companion" />
      </section>
      <section className="you-standing-grid" aria-label="Level and league">
        <LevelCard xp={study.data?.level?.xp ?? home.data.xp} />
        {study.data?.league ? <LeagueCard league={study.data.league} /> : null}
      </section>
      <div className="you-periods" role="group" aria-label="Activity period">
        {periods.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={period === item.id}
            onClick={() =>
              setParams((previous) => {
                const next = new URLSearchParams(previous);
                next.set("period", item.id);
                return next;
              })
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      {statistics.data ? (
        <div className="you-statistics" key={period}>
          <dl className="you-metrics">
            <div>
              <dt>Questions answered</dt>
              <dd>{statistics.data.totals.answers.toLocaleString()}</dd>
              <span className="you-metric-note">
                {statistics.data.totals.reviews} cards reviewed
              </span>
            </div>
            <div>
              <dt>
                Answer accuracy{" "}
                <details className="you-accuracy-info">
                  <summary aria-label="How accuracy is calculated">
                    <Info size={15} aria-hidden="true" />
                  </summary>
                  <p>
                    The latest checked answer for each question each day. Corrections are included.
                    Recall ratings are counted separately.
                  </p>
                </details>
              </dt>
              <dd>
                {statistics.data.accuracy === null
                  ? "—"
                  : new Intl.NumberFormat("en", {
                      style: "percent",
                      maximumFractionDigits: 1,
                    }).format(statistics.data.accuracy)}
              </dd>
              <span className="you-metric-note">
                {statistics.data.totals.answers === 0
                  ? "No answers checked yet"
                  : statistics.data.totals.correct +
                    " of " +
                    statistics.data.totals.answers +
                    " correct"}
              </span>
            </div>
            <div>
              <dt>Lessons finished</dt>
              <dd>{statistics.data.totals.lessons.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Days practised</dt>
              <dd>{statistics.data.totals.studyDays.toLocaleString()}</dd>
            </div>
          </dl>
          <ActivityChart statistics={statistics.data} />
        </div>
      ) : (
        <div className="you-statistics-loading" role={statistics.error ? "alert" : "status"}>
          <p>
            {statistics.error
              ? errorMessage(statistics.error, "Your activity could not load.")
              : "Loading your activity…"}
          </p>
          {statistics.error ? (
            <button
              type="button"
              className="button button-quiet"
              onClick={() => void statistics.refetch()}
            >
              Try again
            </button>
          ) : null}
        </div>
      )}
      <section className="you-course-section" aria-labelledby="you-courses-heading">
        <div className="home-section-heading">
          <h2 id="you-courses-heading">Your courses</h2>
          <Link to={paths.courses}>
            All courses <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {courses.isPending ? (
          <p role="status" className="muted">
            Loading your courses…
          </p>
        ) : courses.error ? (
          <p role="status" className="muted">
            Your course progress could not load.
          </p>
        ) : startedCourses.length > 0 ? (
          <ul className="you-course-progress">
            {startedCourses.map((course) => (
              <li key={course.id}>
                <Link
                  to={paths.course(course.id)}
                  viewTransition
                  style={{ "--course-accent": course.accent } as React.CSSProperties}
                >
                  <img src={course.coverUrl} width={62} height={62} alt="" loading="lazy" />
                  <span className="you-course-copy">
                    <strong>{course.title}</strong>
                    <span>
                      {course.completedLessonCount} of {course.lessonCount} lessons finished
                    </span>
                    <span className="you-course-meter" aria-hidden="true">
                      <span
                        style={{
                          width:
                            Math.min(
                              100,
                              Math.round((course.completedLessonCount / course.lessonCount) * 100),
                            ) + "%",
                        }}
                      />
                    </span>
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Your course progress appears here as you learn.</p>
        )}
      </section>
      {study.data?.achievements ? (
        <section
          className="you-achievements"
          aria-labelledby="achievements-heading"
          id="achievements"
        >
          <div className="section-head">
            <h2 id="achievements-heading">Achievements</h2>
            <p className="page-tally">
              {study.data.achievements.reduce((total, item) => total + item.rank, 0)} of{" "}
              {study.data.achievements.reduce((total, item) => total + item.thresholds.length, 0)}{" "}
              ranks
            </p>
          </div>
          <AchievementWall achievements={study.data.achievements} timeZone={study.data.timeZone} />
        </section>
      ) : null}
      <details className="you-ideas">
        <summary>
          Ideas you have practised <span>{ideas.length}</span>
        </summary>
        {ideas.length === 0 ? (
          <p className="muted">Your ideas appear here as you practise.</p>
        ) : (
          <ul className="concept-cards">
            {ideas.map((row) => (
              <li className="concept-card" key={row.conceptId}>
                <p className="concept-card-title">{row.title}</p>
                <p className="concept-card-state">{humaniseId(row.state)}</p>
                <span className="mastery-meter" aria-hidden="true">
                  <span
                    className="mastery-meter-fill"
                    style={{ width: Math.round(row.mastery * 100) + "%" }}
                  />
                </span>
                <p className="concept-card-figures">
                  <strong>{formatPercent(row.mastery)}</strong>
                  <span className="muted">
                    {row.independentAttempts} without hints · {row.assistedAttempts} with help
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </details>
    </main>
  );
}

function ActivityChart({ statistics }: { statistics: StudyStatistics }) {
  const buckets = activityBuckets(statistics);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    buckets.find((bucket) => bucket.id === selectedId) ??
    [...buckets].reverse().find((bucket) => bucket.answers + bucket.reviews > 0) ??
    buckets.at(-1);
  const maximum = Math.max(1, ...buckets.map((bucket) => bucket.answers + bucket.reviews));
  const top = maximum <= 4 ? 4 : Math.ceil(maximum / 10) * 10;
  return (
    <section className="you-chart" aria-labelledby="activity-chart-heading">
      <header>
        <h2 id="activity-chart-heading">Practice activity</h2>
        <p>
          {displayDate(statistics.from, { year: "numeric" })} –{" "}
          {displayDate(statistics.to, { year: "numeric" })}
        </p>
      </header>
      <div className="you-chart-key">
        <span>
          <i /> Questions answered
        </span>
        <span>
          <i /> Cards reviewed
        </span>
      </div>
      <div className="you-plot">
        <div className="you-plot-axis" aria-hidden="true">
          <span>{top}</span>
          <span>{top / 2}</span>
          <span>0</span>
        </div>
        <ol className="you-bars" aria-label="Practice by period">
          {buckets.map((bucket, index) => (
            <li key={bucket.id}>
              <button
                type="button"
                aria-pressed={bucket.id === selected?.id}
                title={bucket.label + ": " + (bucket.answers + bucket.reviews) + " responses"}
                aria-label={
                  bucket.label +
                  ": " +
                  bucket.answers +
                  " questions answered, " +
                  bucket.reviews +
                  " cards reviewed"
                }
                onClick={() => setSelectedId(bucket.id)}
                onFocus={() => setSelectedId(bucket.id)}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  const buttons = event.currentTarget.closest("ol")?.querySelectorAll("button");
                  const target =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? buckets.length - 1
                        : Math.max(
                            0,
                            Math.min(
                              buckets.length - 1,
                              index + (event.key === "ArrowLeft" ? -1 : 1),
                            ),
                          );
                  buttons?.[target]?.focus();
                  event.preventDefault();
                }}
              >
                <span className="you-bar-stack" aria-hidden="true">
                  <span
                    className="you-bar-reviews"
                    style={{ height: (bucket.reviews / top) * 100 + "%" }}
                  />
                  <span
                    className="you-bar-answers"
                    style={{ height: (bucket.answers / top) * 100 + "%" }}
                  />
                  {bucket.answers + bucket.reviews === 0 ? (
                    <span className="you-bar-empty" />
                  ) : null}
                </span>
                <span className="you-bar-label" aria-hidden="true">
                  {buckets.length <= 12 ||
                  index % Math.ceil(buckets.length / 8) === 0 ||
                  index === buckets.length - 1
                    ? bucket.label
                    : ""}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <p className="you-chart-readout" aria-live="polite">
        {selected ? (
          <>
            <strong>
              {displayDate(selected.from)}
              {selected.to !== selected.from ? " – " + displayDate(selected.to) : ""}
            </strong>
            <span>
              {selected.answers} {selected.answers === 1 ? "question" : "questions"} ·{" "}
              {selected.reviews} {selected.reviews === 1 ? "card" : "cards"}
            </span>
          </>
        ) : null}
      </p>
      <p className="you-time-zone">Dates use {statistics.timeZone.replaceAll("_", " ")}.</p>
    </section>
  );
}
