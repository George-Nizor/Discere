import type { Achievement } from "@discere/contracts";
import {
  Award,
  BookCheck,
  Brain,
  Bridge,
  CalendarCheck,
  Combo,
  Crosshair,
  Flame,
  Gem,
  Gift,
  Globe2,
  RefreshCw,
} from "../brand/icon-set.js";
import type { CSSProperties } from "react";
import { rankLabel } from "./ranks.js";

export const achievementIcons: Record<string, typeof Award> = {
  scholar: BookCheck,
  sharpshooter: Crosshair,
  "memory-palace": Brain,
  "second-wind": RefreshCw,
  "bridge-builder": Bridge,
  regular: CalendarCheck,
  unbroken: Flame,
  "in-the-zone": Combo,
  polymath: Globe2,
  treasure: Gift,
  climber: Gem,
};

const floorOf = (item: Achievement) => (item.rank ? item.thresholds[item.rank - 1]! : 0);
export const achievementFraction = (item: Achievement) =>
  item.nextTarget
    ? Math.min(1, (item.current - floorOf(item)) / Math.max(1, item.nextTarget - floorOf(item)))
    : 1;

/** The unfinished achievements closest to their next rank, for a nudge. */
export function closestAchievements(list: readonly Achievement[], count = 2): Achievement[] {
  return list
    .filter((item) => item.nextTarget !== null && item.current > 0)
    .sort((a, b) => achievementFraction(b) - achievementFraction(a))
    .slice(0, count);
}

function earnedDate(item: Achievement, timeZone: string) {
  const at = item.earned.at(-1)?.at;
  return at
    ? new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone })
    : null;
}

export function AchievementMedal({ item, size = 30 }: { item: Achievement; size?: number }) {
  const Icon = achievementIcons[item.id] ?? Award;
  return (
    <span className={`badge-medal badge-medal--rank-${item.rank}`} aria-hidden="true">
      <span className="badge-shine" />
      <Icon size={size} strokeWidth={1.8} />
      {item.rank ? <span className="badge-pips">{rankLabel(item.rank)}</span> : null}
    </span>
  );
}

/** One achievement system: each family has up to five numbered ranks, all read from the ledger. */
export function AchievementWall({
  achievements,
  timeZone,
}: {
  achievements: Achievement[];
  timeZone: string;
}) {
  return (
    <ul className="badge-wall">
      {achievements.map((item) => {
        const ranks = item.thresholds.length;
        const date = earnedDate(item, timeZone);
        return (
          <li key={item.id} className={`badge badge--tier-${item.rank}`}>
            <AchievementMedal item={item} />
            <strong>{item.title}</strong>
            <span className="badge-tier">
              {item.rank ? `Rank ${rankLabel(item.rank)} of ${rankLabel(ranks)}` : "Not yet earned"}
            </span>
            <span className="badge-desc">{item.description}</span>
            <span
              className="badge-progress"
              role="progressbar"
              aria-label={`${item.title} progress to the next rank`}
              aria-valuemin={0}
              aria-valuemax={item.nextTarget ?? item.current}
              aria-valuenow={item.current}
            >
              <span style={{ "--badge-fill": achievementFraction(item) } as CSSProperties} />
            </span>
            <span className="badge-count">
              {item.nextTarget
                ? `${item.current} / ${item.nextTarget}`
                : `${item.current} · every rank`}
            </span>
            {date ? (
              <span className="badge-date">
                Rank {rankLabel(item.rank)} on {date}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
