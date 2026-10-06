import type { StudyStatistics, StudyStatisticsPeriod } from "@discere/contracts";
import {
  localStudyDay,
  offsetStudyDay,
  studyDays,
  type StudyEvent,
} from "@discere/progression-engine";

/** Aggregates saved evidence without opening sessions or changing rewards and streaks. */
export function buildLearningStatistics(
  events: readonly StudyEvent[],
  now: string,
  timeZone: string,
  period: StudyStatisticsPeriod,
): StudyStatistics {
  const today = localStudyDay(now, timeZone);
  const weekday = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7;
  const monday = offsetStudyDay(today, -weekday);
  const recorded = events.filter((event) => event.occurredAt <= now && event.updatedAt <= now);
  const history = studyDays(recorded, now, timeZone);
  const practiceDates = new Set(
    history
      .filter((day) => day.qualified || day.answers + day.reviews + day.lessons > 0)
      .map((day) => day.date),
  );
  const daily = new Map(
    history.map((day) => [
      day.date,
      {
        date: day.date,
        answers: 0,
        correct: 0,
        reviews: day.reviews,
        lessons: day.lessons,
        xp: day.xp,
      },
    ]),
  );
  // A saved correction may replace an answer. This is latest-result accuracy, never first-try accuracy.
  // As in the daily goal, the same question is counted once per local calendar day.
  const answers = new Map<string, StudyEvent>();
  for (const event of recorded) {
    if (event.kind !== "answer" || !event.qualifying) continue;
    const date = localStudyDay(event.occurredAt, timeZone);
    const key = date + ":" + event.referenceId;
    const previous = answers.get(key);
    if (!previous || previous.updatedAt <= event.updatedAt) answers.set(key, event);
  }
  for (const event of answers.values()) {
    const day = daily.get(localStudyDay(event.occurredAt, timeZone));
    if (day) {
      day.answers += 1;
      day.correct += Number(event.correct);
    }
  }
  const days = [...daily.values()]
    .filter((day) => day.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const from =
    period === "week"
      ? monday
      : period === "month"
        ? today.slice(0, 7) + "-01"
        : period === "year"
          ? today.slice(0, 4) + "-01-01"
          : (days[0]?.date ?? today);
  const metrics = (selected: typeof days): StudyStatistics["totals"] => ({
    answers: selected.reduce((sum, day) => sum + day.answers, 0),
    correct: selected.reduce((sum, day) => sum + day.correct, 0),
    reviews: selected.reduce((sum, day) => sum + day.reviews, 0),
    lessons: selected.reduce((sum, day) => sum + day.lessons, 0),
    studyDays: selected.filter((day) => practiceDates.has(day.date)).length,
    xp: selected.reduce((sum, day) => sum + day.xp, 0),
  });
  const selected = days.filter((day) => day.date >= from);
  const totals = metrics(selected);
  return {
    period,
    today,
    from,
    to: today,
    timeZone,
    totals,
    accuracy: totals.answers === 0 ? null : totals.correct / totals.answers,
    days: selected,
    week: { from: monday, to: today, totals: metrics(days.filter((day) => day.date >= monday)) },
  };
}
