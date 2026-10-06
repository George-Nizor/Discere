import type { StudySummary } from "@discere/contracts";
import { CalendarCheck, Gift, Sparkles } from "../brand/icon-set.js";
import { RARITY_NAMES } from "./ranks.js";
import { Bonehead, type BoneheadExpression } from "../mascot/Bonehead.js";

/** One line that names the nearest real goal, in the order a learner would care about it. */
export function nextNudge(study: StudySummary): string {
  if (study.firstRun)
    return "Start with your first lesson. The three cards explain how progress works.";
  const quests = study.quests;
  const left = quests ? quests.quests.filter((quest) => !quest.complete).length : 0;
  if (quests?.chest.ready && !quests.chest.claimed)
    return `Your ${RARITY_NAMES[quests.chest.rarity]} chest is ready to open.`;
  if (!study.streak.activeToday && study.streak.days > 0)
    return `Answer one question today to keep your ${study.streak.days}-day streak.`;
  if (left > 0 && left < 3)
    return `${left} more ${left === 1 ? "quest" : "quests"} until today's chest.`;
  const league = study.league;
  if (league?.projected === "drop" && league.daysLeft <= 2)
    return `${league.holdAt - league.weekXp} XP by Sunday keeps you in the ${league.tier.name} league.`;
  if (
    league?.promoteAt &&
    league.next &&
    league.projected !== "promote" &&
    league.promoteAt - league.weekXp <= 60
  )
    return `${league.promoteAt - league.weekXp} XP more this week moves you up to ${league.next.name}.`;
  if (study.level) {
    const need = study.level.nextLevelXp - study.level.xp;
    if (need <= 40) return `${need} XP to level ${study.level.level + 1}.`;
  }
  if (!study.daily.complete) {
    const need = Math.max(0, study.daily.target - study.daily.current);
    return `${need} more ${need === 1 ? "response" : "responses"} reaches today's goal.`;
  }
  return "Today's goal is done. Anything more is extra.";
}

function greeting(name: string, study: StudySummary | undefined): string {
  if (study?.firstRun) return `Welcome to Discere, ${name}.`;
  return `Welcome back, ${name}.`;
}

/** First run only: three cards that say how progress works, beside the first lesson. */
export function FirstRunPrimer() {
  return (
    <ol className="home-primer" aria-label="How progress works">
      <li>
        <Sparkles size={20} aria-hidden="true" />
        <span>
          <strong>Answer on your own</strong>
          <span>
            Correct answers earn XP and raise your level. Without hints they earn the most and build
            a run.
          </span>
        </span>
      </li>
      <li>
        <CalendarCheck size={20} aria-hidden="true" />
        <span>
          <strong>Come back each day</strong>
          <span>
            One answer, a finished lesson or three recall cards keeps your streak. Freezes, earned
            every seven study days, cover a missed day.
          </span>
        </span>
      </li>
      <li>
        <Gift size={20} aria-hidden="true" />
        <span>
          <strong>Finish three quests</strong>
          <span>They open a daily chest with XP and items. Strong days raise its rarity.</span>
        </span>
      </li>
    </ol>
  );
}

/** Bonehead's mood on Home follows the day: proud once the goal is done, curious before. */
function heroMood(study: StudySummary | undefined): BoneheadExpression {
  if (!study) return "idle";
  if (study.firstRun) return "delighted";
  if (study.daily.complete) return "proud";
  if (!study.streak.activeToday && study.streak.days > 0) return "curious";
  return "idle";
}

export function HomeHero({ name, study }: { name: string; study: StudySummary | undefined }) {
  return (
    <header className={`home-hero${study?.firstRun ? " home-hero--first" : ""}`}>
      <Bonehead className="home-hero-mascot" expression={heroMood(study)} glow={Boolean(study?.daily.complete)} live size="100%" />
      <div className="home-hero-text">
        <h1>{greeting(name, study)}</h1>
        {study ? <p className="home-hero-nudge">{nextNudge(study)}</p> : null}
      </div>
    </header>
  );
}
