import type { League } from "@discere/contracts";
import type { CSSProperties } from "react";

const gems: Record<string, [string, string]> = {
  bronze: ["#f0b27a", "#9a5b2c"],
  silver: ["#eef2f7", "#8b97a8"],
  gold: ["#ffe58a", "#d39b14"],
  sapphire: ["#8fb6ff", "#2b55d6"],
  ruby: ["#ff8fa3", "#c0163c"],
  emerald: ["#7cf5a8", "#119a52"],
  amethyst: ["#d6a8ff", "#7b3fd6"],
  pearl: ["#fff7f0", "#c9b8d6"],
  obsidian: ["#9aa0b8", "#1d2030"],
  diamond: ["#e6fbff", "#5ad1ff"],
};

export function LeagueGem({ tier, size = 40 }: { tier: string; size?: number }) {
  const [light, dark] = gems[tier] ?? gems["bronze"]!;
  const id = `gem-${tier}-${size}`;
  return (
    <svg
      className={`league-gem league-gem--${tier}`}
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      <path d="M20 3 35 14 29 36H11L5 14Z" fill={`url(#${id})`} />
      <path d="M20 3 26 14H14Z" fill="#fff" opacity="0.55" />
      <path d="M5 14H35L20 36Z" fill="#fff" opacity="0.12" />
      <path d="M14 14 20 36 26 14" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1" />
    </svg>
  );
}

const shortDate = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

const outcomeText = {
  promoted: "moved up",
  stayed: "stayed",
  dropped: "moved down",
  current: "this week",
  before: "before you started",
} as const;

/**
 * A weekly ladder against fixed targets, never against invented opponents. The league is held for
 * the whole week; on Monday it moves up, stays or moves down by the XP earned.
 */
export function LeagueCard({ league }: { league: League }) {
  const promote = league.promoteAt;
  const fraction = promote ? Math.min(1, league.weekXp / promote) : 1;
  const holdFraction = promote ? league.holdAt / promote : 0;
  const top = Math.max(1, promote ?? 0, ...league.history.map((week) => week.xp));
  const ahead = league.weekXp - league.lastWeekSoFar;
  const toPromote = promote ? Math.max(0, promote - league.weekXp) : 0;
  const toHold = Math.max(0, league.holdAt - league.weekXp);
  const days = league.daysLeft === 0 ? "the last day" : `${league.daysLeft + 1} days`;
  return (
    <section
      className={`league-card league-card--${league.tier.id}`}
      aria-labelledby="league-title"
      id="league"
    >
      <header>
        <LeagueGem tier={league.tier.id} size={52} />
        <div>
          <h2 id="league-title">{league.tier.name} league</h2>
          <p>
            {league.weekXp} XP this week · {shortDate(league.weekStart)} to{" "}
            {shortDate(league.weekEnd)}
          </p>
        </div>
      </header>
      <div
        className="league-progress"
        role="progressbar"
        aria-label={promote ? `Progress to ${league.next?.name}` : "Top league"}
        aria-valuemin={0}
        aria-valuemax={promote ?? league.weekXp}
        aria-valuenow={Math.min(league.weekXp, promote ?? league.weekXp)}
      >
        <span style={{ "--league-fill": fraction } as CSSProperties} />
        {league.holdAt > 0 && promote ? (
          <i
            className="league-hold-mark"
            style={{ left: `${holdFraction * 100}%` }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p className="league-next">
        {league.projected === "promote" ? (
          <>
            <strong>Promotion secured.</strong> You move up to {league.next?.name} on Monday.
          </>
        ) : promote && league.next ? (
          <>
            <strong>{toPromote} XP</strong> more in {days} moves you up to {league.next.name}.
          </>
        ) : (
          <>Diamond is the top league.</>
        )}
      </p>
      {league.holdAt > 0 && league.projected !== "promote" ? (
        <p className={`league-hold${league.projected === "drop" ? " is-at-risk" : ""}`}>
          {toHold > 0
            ? `Earn ${toHold} XP to stay in ${league.tier.name}; below ${league.holdAt} XP for the week, you move down to ${league.previous?.name}.`
            : `You are safe in ${league.tier.name} this week.`}
        </p>
      ) : null}
      <div className="league-race">
        <span className={ahead >= 0 ? "is-ahead" : "is-behind"}>
          {league.lastWeekSoFar === 0 && league.weekXp === 0
            ? "Last week at this point: 0 XP"
            : ahead >= 0
              ? `${ahead} XP ahead of last week at this point`
              : `${-ahead} XP behind last week at this point`}
        </span>
        {league.bestWeekXp > 0 ? <span>Best week {league.bestWeekXp} XP</span> : null}
      </div>
      <figure className="league-history">
        <figcaption>Weekly XP, last eight weeks</figcaption>
        <ol>
          {league.history.map((week) => (
            <li
              key={week.weekStart}
              className={`league-week league-week--${week.outcome}`}
              style={{ "--bar": week.xp / top } as CSSProperties}
            >
              <span className="league-week-bar" aria-hidden="true">
                <span />
              </span>
              <span className="league-week-label" aria-hidden="true">
                {shortDate(week.weekStart)}
              </span>
              <span className="sr-only">
                Week of {shortDate(week.weekStart)}: {week.xp} XP in {week.tierName},{" "}
                {outcomeText[week.outcome]}
              </span>
            </li>
          ))}
        </ol>
      </figure>
      <details className="league-rules">
        <summary>How leagues work</summary>
        <p>
          There are ten leagues, from Bronze to Diamond. Your league holds for the whole week,
          Monday to Sunday in your time zone. When the week closes, your weekly XP decides Monday's
          league: reach the promotion target to move up one, fall below the safety line to move down
          one, anything between keeps you where you are. Bronze never drops. There are no other
          players: the targets are fixed, and XP only comes from answers, recall and finished
          lessons.
        </p>
      </details>
    </section>
  );
}
