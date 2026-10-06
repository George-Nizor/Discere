import { levelProgress, levelTitle } from "@discere/progression-engine";
import type { CSSProperties } from "react";
import { LevelRing } from "./LevelRing.js";

/** The one place the level is explained: what it is, what XP pays for and what a level brings. */
export function LevelCard({ xp }: { xp: number }) {
  const progress = levelProgress(xp);
  const level = progress.level + 1;
  const floor = progress.level * progress.level * 100;
  return (
    <section className="level-card" aria-labelledby="level-card-title">
      <LevelRing level={level} fraction={progress.fraction} size={88} stroke={7} />
      <div className="level-card-copy">
        <h2 id="level-card-title">
          Level {level} · {levelTitle(level)}
        </h2>
        <p>
          {xp.toLocaleString()} XP in total · {(progress.nextLevelXp - xp).toLocaleString()} XP to
          level {level + 1}
        </p>
        <span
          className="level-card-bar"
          role="progressbar"
          aria-label={`Progress to level ${level + 1}`}
          aria-valuemin={floor}
          aria-valuemax={progress.nextLevelXp}
          aria-valuenow={xp}
        >
          <span style={{ "--level-fill": progress.fraction } as CSSProperties} />
        </span>
        <details className="level-rules">
          <summary>How XP and levels work</summary>
          <ul>
            <li>
              A correct answer earns 20 XP, more for harder questions. A wrong one earns none.
            </li>
            <li>
              Each hint takes a quarter off, down to 40%. A revealed answer keeps a quarter, and
              Direct mode keeps half. Help is always there; it just pays less.
            </li>
            <li>A due recall card earns 8 XP recalled on your own, 3 otherwise.</li>
            <li>A finished lesson adds 20 XP once. The daily chest adds 20 to 70.</li>
            <li>
              Levels grow further apart: level {level + 1} starts at{" "}
              {progress.nextLevelXp.toLocaleString()} XP. Each new level adds one XP boost to your
              items.
            </li>
            <li>XP never changes what counts as correct, mastered or done on your own.</li>
          </ul>
        </details>
      </div>
    </section>
  );
}
