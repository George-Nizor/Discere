import type { StudySummary } from "@discere/contracts";
import { X } from "lucide-react";
import { Award, Gem, Gift, Sparkles, Target } from "../brand/icon-set.js";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { useStudy } from "../api/queries.js";
import { celebrateLevelUp } from "../fx/celebrate.js";
import { burst } from "../fx/engine.js";
import { useExperience } from "../study/experience.js";
import { type Announcement, hold, lessonPhase, release } from "./announcements.js";
import { LevelRing } from "./LevelRing.js";
import { RANK_LABELS } from "./ranks.js";

/** What changed between two summaries of the same learner, in the order it would be noticed. */
export function announcementsBetween(before: StudySummary, next: StudySummary): Announcement[] {
  const fresh: Announcement[] = [];
  if (before.quests && next.quests && before.quests.date === next.quests.date) {
    for (const quest of next.quests.quests) {
      const old = before.quests.quests.find((item) => item.id === quest.id);
      if (quest.complete && old && !old.complete)
        fresh.push({
          id: `quest:${next.quests.date}:${quest.id}`,
          tone: "quest",
          title: "Quest complete",
          detail: quest.title,
        });
    }
    if (next.quests.chest.ready && !before.quests.chest.ready && !next.quests.chest.claimed)
      fresh.push({
        id: `chest:${next.quests.date}`,
        tone: "chest",
        title: "Daily chest ready",
        detail: `All three quests done. A ${next.quests.chest.rarity} chest waits on Home.`,
      });
  }
  for (const achievement of next.achievements ?? []) {
    const old = before.achievements?.find((item) => item.id === achievement.id);
    if (old && achievement.rank > old.rank)
      fresh.push({
        id: `achievement:${achievement.id}:${achievement.rank}`,
        tone: "achievement",
        title: `Achievement · rank ${RANK_LABELS[achievement.rank - 1]}`,
        detail: achievement.title,
      });
  }
  if (before.level && next.level && next.level.level > before.level.level)
    fresh.push({
      id: `level:${next.level.level}`,
      tone: "level",
      title: `Level ${next.level.level} · ${next.level.title}`,
      detail: "One XP boost added to your items.",
    });
  if (
    before.league &&
    next.league &&
    before.league.weekStart !== next.league.weekStart &&
    before.league.tier.index !== next.league.tier.index
  )
    fresh.push({
      id: `league:${next.league.weekStart}`,
      tone: "league",
      title:
        next.league.tier.index > before.league.tier.index
          ? `Promoted to ${next.league.tier.name}`
          : `Back to ${next.league.tier.name}`,
      detail: "A new league week has started.",
    });
  return fresh;
}

const icons = { quest: Target, chest: Gift, achievement: Award, level: Sparkles, league: Gem };

/**
 * Watches the server's study summary and announces what changed. It compares one summary with
 * the next, so a reload or a first visit announces nothing it did not see happen. Inside a lesson
 * everything is held for the finish screen; elsewhere it arrives as a toast.
 */
export function GameWatcher() {
  const study = useStudy();
  const location = useLocation();
  const { play, celebrations } = useExperience();
  const previous = useRef<StudySummary | null>(null);
  const phase = useRef(lessonPhase(location.pathname));
  const [toasts, setToasts] = useState<Announcement[]>([]);
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null);

  const announce = (items: Announcement[], overlay = true) => {
    if (!items.length) return;
    setToasts((current) => [...current, ...items].slice(-4));
    play(items.some((toast) => toast.tone !== "quest") ? "chest" : "quest");
    const level = items.find((item) => item.tone === "level");
    if (overlay && level && previous.current?.level) {
      setLevelUp({ level: previous.current.level.level, title: previous.current.level.title });
      play("levelup");
      if (celebrations) celebrateLevelUp();
    }
    window.setTimeout(() => {
      const node = document.querySelector(".game-toast:last-child");
      if (node && celebrations) {
        const rect = node.getBoundingClientRect();
        burst({ x: rect.left + 28, y: rect.top + rect.height / 2 }, { count: 24, palette: "gold" });
      }
    }, 60);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on navigation only.
  useEffect(() => {
    const now = lessonPhase(location.pathname);
    const was = phase.current;
    phase.current = now;
    // The finish screen showed what the lesson earned; moving on from it clears the list.
    if (was === "finish" && now !== "finish") {
      release();
      return;
    }
    if (now !== null) return;
    // Leaving a lesson that never reached its finish releases what it held; the finish screen
    // already showed its own.
    const released = release();
    if (was === "stage") announce(released, false);
  }, [location.pathname]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: compares successive summaries only.
  useEffect(() => {
    const next = study.data;
    if (!next) return;
    const before = previous.current;
    previous.current = next;
    if (!before) return;
    const fresh = announcementsBetween(before, next);
    if (!fresh.length) return;
    if (lessonPhase(location.pathname) !== null) hold(fresh);
    else announce(fresh);
  }, [study.data]);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = window.setTimeout(() => setToasts((current) => current.slice(1)), 4200);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  return (
    <>
      <ol className="game-toasts" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <li key={toast.id} className={`game-toast game-toast--${toast.tone}`}>
              <span className="game-toast-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span>
                <strong>{toast.title}</strong>
                <span>{toast.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {levelUp !== null ? (
        <LevelUpOverlay
          level={levelUp.level}
          title={levelUp.title}
          onClose={() => setLevelUp(null)}
        />
      ) : null}
    </>
  );
}

function LevelUpOverlay({
  level,
  title,
  onClose,
}: {
  level: number;
  title: string;
  onClose: () => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Focus returns to wherever the learner was when the dialog closes.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    button.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      opener?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="level-up" role="dialog" aria-modal="true" aria-labelledby="level-up-title">
      <div className="level-up-card">
        <div className="level-up-rays" aria-hidden="true" />
        <Sparkles className="level-up-spark" aria-hidden="true" size={28} />
        <LevelRing level={level} fraction={1} size={132} stroke={9} label={false} />
        <h2 id="level-up-title">Level {level}</h2>
        <p className="level-up-title">{title}</p>
        <p>
          Earned from answers, recall and finished lessons. One XP boost has been added to your
          items.
        </p>
        <button ref={button} className="button button-primary" type="button" onClick={onClose}>
          Keep going
        </button>
        <button className="level-up-close" type="button" aria-label="Close" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
