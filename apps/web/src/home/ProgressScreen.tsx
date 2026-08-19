import type { ActivityResponse } from "@discere/contracts";
import { levelProgress } from "@discere/progression-engine";
import { Flame, Sparkles } from "lucide-react";
import { errorMessage } from "../api/client.js";
import { useActivity, useCourses, useHome } from "../api/queries.js";
import { formatPercent, humaniseId } from "../lib/format.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { ProgressRing } from "../ui/ProgressRing.js";

const WEEKS = 10;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MILLISECONDS_PER_DAY = 86_400_000;

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Ten weeks of columns ending today, each column a Monday-to-Sunday week. Building the grid
 * from dates rather than from the returned rows means a week with no study still occupies its
 * column, so the gaps are visible instead of being closed up.
 */
function calendarWeeks(activity: ActivityResponse): Array<Array<{ date: string; count: number }>> {
  const counts = new Map(activity.days.map((day) => [day.date, day.completions]));
  const today = new Date(`${isoDay(new Date())}T00:00:00.000Z`);
  // Monday of the current week: getUTCDay is 0 on Sunday, which belongs to the week before.
  const weekday = (today.getUTCDay() + 6) % 7;
  const thisMonday = new Date(today.getTime() - weekday * MILLISECONDS_PER_DAY);
  const weeks: Array<Array<{ date: string; count: number }>> = [];
  for (let week = WEEKS - 1; week >= 0; week -= 1) {
    const monday = new Date(thisMonday.getTime() - week * 7 * MILLISECONDS_PER_DAY);
    weeks.push(
      Array.from({ length: 7 }, (_, offset) => {
        const date = isoDay(new Date(monday.getTime() + offset * MILLISECONDS_PER_DAY));
        return { date, count: counts.get(date) ?? 0 };
      }),
    );
  }
  return weeks;
}

/** Four steps rather than a continuous scale, so neighbouring days are told apart. */
function intensity(count: number, busiest: number): number {
  if (count === 0) return 0;
  const share = count / Math.max(1, busiest);
  if (share > 0.66) return 3;
  if (share > 0.33) return 2;
  return 1;
}

export function ProgressScreen() {
  const home = useHome();
  const activity = useActivity();
  const courses = useCourses();

  if (home.isPending) return <LoadingScreen message="Loading your progress…" />;
  if (home.error || !home.data) {
    return (
      <ErrorScreen
        message={errorMessage(home.error, "Progress did not load.")}
        title="Progress unavailable"
      />
    );
  }

  const rows = [...home.data.progress].sort((left, right) => right.mastery - left.mastery);
  const level = levelProgress(home.data.xp);
  const weeks = activity.data ? calendarWeeks(activity.data) : [];
  const busiest = activity.data?.busiestCount ?? 0;
  const studiedDays = weeks.flat().filter((day) => day.count > 0).length;

  return (
    <main className="page" id="stage">
      <p className="eyebrow">Progress</p>
      <h1>Your learning</h1>

      <section aria-label="Standing" className="standing-row">
        <div className="standing-card">
          <ProgressRing
            caption={`${Math.round(level.fraction * 100)}%`}
            completed={Math.round(level.fraction * 100)}
            label="per cent of this level"
            size={64}
            total={100}
          />
          <div>
            <p className="standing-value">Level {level.level}</p>
            <p className="standing-label">
              <Sparkles aria-hidden="true" size={14} strokeWidth={1.7} /> {home.data.xp} XP ·{" "}
              {level.nextLevelXp - home.data.xp} to next
            </p>
          </div>
        </div>
        <div className="standing-card">
          <p className="standing-figure">
            <Flame aria-hidden="true" size={22} strokeWidth={1.7} />
            {home.data.streakDays}
          </p>
          <div>
            <p className="standing-value">
              {home.data.streakDays === 1 ? "Day in a row" : "Days in a row"}
            </p>
            <p className="standing-label">
              {home.data.todayMinutes} {home.data.todayMinutes === 1 ? "minute" : "minutes"}{" "}
              studied today
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="calendar-heading" className="calendar-section">
        <h2 className="section-title" id="calendar-heading">
          Study calendar
        </h2>
        <p className="muted">
          {studiedDays} {studiedDays === 1 ? "day" : "days"} of study in the last {WEEKS} weeks.
        </p>
        {activity.error ? (
          <p className="muted">The activity history did not load.</p>
        ) : (
          <div className="calendar">
            <ul aria-hidden="true" className="calendar-days">
              {DAY_LABELS.map((label, index) => (
                <li key={label}>{index % 2 === 0 ? label : ""}</li>
              ))}
            </ul>
            <ol className="calendar-grid">
              {weeks.map((week) => (
                <li className="calendar-week" key={week[0]?.date ?? ""}>
                  <ol>
                    {week.map((day) => (
                      <li
                        className={`calendar-day is-${intensity(day.count, busiest)}`}
                        key={day.date}
                        title={`${day.date}: ${day.count} ${day.count === 1 ? "stage" : "stages"} finished`}
                      >
                        <span className="sr-only">
                          {day.date}: {day.count} finished
                        </span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {courses.data ? (
        <section aria-labelledby="courses-heading" className="mastery-section">
          <h2 className="section-title" id="courses-heading">
            Courses
          </h2>
          <ul className="course-progress-list">
            {courses.data.courses
              .filter((course) => course.status === "available")
              .map((course) => (
              <li
                className="course-progress"
                key={course.id}
                style={{ "--course-accent": course.accent } as React.CSSProperties}
              >
                <ProgressRing
                  caption={`${course.completedLessonCount}/${course.lessonCount}`}
                  completed={course.completedLessonCount}
                  label="lessons"
                  size={44}
                  total={course.lessonCount}
                />
                <div>
                  <p className="course-progress-title">{course.title}</p>
                  <p className="muted">
                    {course.completedLessonCount} of {course.lessonCount} lessons finished
                  </p>
                </div>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="concepts-heading" className="mastery-section">
        <h2 className="section-title" id="concepts-heading">
          Concept mastery
        </h2>
        <ul className="concept-cards">
          {rows.map((row) => (
            <li className="concept-card" key={row.conceptId}>
              <p className="concept-card-title">{row.title}</p>
              <p className="concept-card-state">{humaniseId(row.state)}</p>
              <span className="mastery-meter" aria-hidden="true">
                <span
                  className="mastery-meter-fill"
                  style={{ width: `${Math.round(row.mastery * 100)}%` }}
                />
              </span>
              <p className="concept-card-figures">
                <strong>{formatPercent(row.mastery)}</strong>
                <span className="muted">
                  {row.independentAttempts} independent · {row.assistedAttempts} assisted
                </span>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
