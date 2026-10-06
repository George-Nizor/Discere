import { Sparkles } from "../brand/icon-set.js";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useStudy } from "../api/queries.js";
import { paths } from "../lib/paths.js";
import { useExperience } from "../study/experience.js";
import { useBoostClock } from "./Inventory.js";
import { LevelRing } from "./LevelRing.js";

/** Rolls from the previous value to the new one, so earned XP visibly lands. */
export function useRollingNumber(value: number): number {
  const { reduced } = useExperience();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(origin + (value - origin) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    // Let the flying "+XP" label arrive before the counter starts to roll.
    const delay = window.setTimeout(() => {
      frame = requestAnimationFrame(step);
    }, 650);
    return () => {
      window.clearTimeout(delay);
      cancelAnimationFrame(frame);
      from.current = value;
    };
  }, [value, reduced]);
  return shown;
}

export function HudXp({ compact = false }: { compact?: boolean }) {
  const study = useStudy();
  const level = study.data?.level;
  const xp = useRollingNumber(level?.xp ?? 0);
  const clock = useBoostClock(study.data?.inventory);
  const label = `Level ${level?.level ?? 0}${level ? `, ${level.title}` : ""}, ${level?.xp ?? 0} XP in total${
    clock ? `, XP boost running for ${clock}` : ""
  }`;
  const content = (
    <>
      <LevelRing
        level={level?.level ?? 0}
        fraction={level?.fraction ?? 0}
        size={compact ? 30 : 34}
        stroke={3.5}
        label={false}
      />
      <span className="hud-xp-value">
        <Sparkles aria-hidden="true" size={18} />
        {xp}
      </span>
      {clock ? (
        <span className="hud-boost" aria-hidden="true">
          1.5×
        </span>
      ) : null}
      <span className="stat-tip" aria-hidden="true">
        Level and total XP{clock ? ` · boost ${clock}` : ""}
      </span>
    </>
  );
  // Inside a lesson the counter is a display only; leaving the lesson takes the exit control.
  if (compact)
    return (
      <span className="hud-xp hud-xp--compact" data-fx-target="xp" role="img" aria-label={label}>
        {content}
      </span>
    );
  return (
    <Link
      className="hud-xp"
      to={paths.you}
      data-fx-target="xp"
      aria-label={`${label}. View your progress`}
    >
      {content}
    </Link>
  );
}
