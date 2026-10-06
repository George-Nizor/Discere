import type { StudySummary } from "@discere/contracts";
import { Check } from "lucide-react";
import { Flame, Snowflake, Target } from "../brand/icon-set.js";
import { Link } from "react-router";
import { paths } from "../lib/paths.js";
import { ProgressRing } from "../ui/ProgressRing.js";

/**
 * Today on one card: the daily goal and the streak, with the week beneath. This is the one place
 * the streak is explained; the navigation shows only its number.
 */
export function StudyRhythm({ study }: { study: StudySummary }) {
  const left = Math.max(0, study.daily.target - study.daily.current);
  const freezes = study.inventory?.streakFreezes ?? study.streak.charges;
  return (
    <section className="study-rhythm" aria-labelledby="study-rhythm-title">
      <h2 id="study-rhythm-title" className="sr-only">
        Today
      </h2>
      <div className="daily-goal">
        <ProgressRing
          size={66}
          completed={study.daily.complete ? 1 : study.daily.current}
          total={study.daily.complete ? 1 : study.daily.target}
          label={study.daily.complete ? "daily goal" : "daily practice responses"}
          caption={
            study.daily.complete ? (
              <Check size={24} />
            ) : (
              `${study.daily.current}/${study.daily.target}`
            )
          }
        />
        <div>
          <h3>{study.daily.complete ? "Today’s goal reached" : "Today’s goal"}</h3>
          <p>
            {study.daily.complete
              ? "Anything more today is extra."
              : `${left} more ${left === 1 ? "response" : "responses"}, or finish a lesson.`}
          </p>
          <Link className="study-goal-link" to={paths.settings}>
            <Target size={13} aria-hidden="true" /> Goal: {study.daily.target} a day
          </Link>
        </div>
      </div>
      <div className="weekly-rhythm">
        <div className={`rhythm-streak${study.streak.activeToday ? " is-lit" : ""}`}>
          <Flame size={19} aria-hidden="true" />
          <strong>{study.streak.days}</strong>
          <span>day streak</span>
          <span className="streak-charge" title="Streak freezes held">
            <Snowflake size={15} aria-hidden="true" />
            <span>
              {freezes} {freezes === 1 ? "freeze" : "freezes"}
            </span>
          </span>
        </div>
        <p className="rhythm-rule">
          {study.streak.activeToday
            ? "Today counts. "
            : study.streak.days > 0
              ? "One answer today keeps it going. "
              : "One answer, a finished lesson or three recall cards starts it. "}
          A missed day uses a freeze if you hold one.
          {study.streak.longest > study.streak.days
            ? ` Longest: ${study.streak.longest} days.`
            : ""}
        </p>
        <ol className="study-week" aria-label="This week">
          {study.week.map((day, index) => (
            <li
              key={day.date}
              className={`${day.qualified ? "is-studied" : day.protected ? "is-protected" : ""}${day.date === study.today ? " is-today" : ""}`}
              aria-label={`${day.date}: ${day.qualified ? "studied" : day.protected ? "kept by a streak freeze" : day.date > study.today ? "upcoming" : "no practice yet"}`}
              aria-current={day.date === study.today ? "date" : undefined}
            >
              <span aria-hidden="true" className="week-day">
                {["M", "T", "W", "T", "F", "S", "S"][index]}
              </span>
              <span className="week-mark" aria-hidden="true">
                {day.qualified ? (
                  <Check size={15} strokeWidth={2.5} />
                ) : day.protected ? (
                  <Snowflake size={15} />
                ) : (
                  <span />
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
