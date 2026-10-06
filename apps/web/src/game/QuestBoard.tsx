import type { ChestClaim, ChestRarity, DailyQuests, Quest } from "@discere/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Bolt, Brain, Combo, QuestDone, Repeat2, Shuffle, Target, Trophy } from "../brand/icon-set.js";
import { type CSSProperties, useRef, useState } from "react";
import { claimDailyChest } from "../api/endpoints.js";
import { queryKeys } from "../api/queries.js";
import { celebrateChest } from "../fx/celebrate.js";
import type { PaletteName } from "../fx/engine.js";
import { swapQuest } from "./api.js";
import { itemPhrase, RARITY_NAMES } from "./ranks.js";
import { useExperience } from "../study/experience.js";

const icons = {
  target: Target,
  brain: Brain,
  flame: Combo,
  bolt: Bolt,
  cards: Repeat2,
  trophy: Trophy,
} satisfies Record<Quest["icon"], unknown>;

function QuestRow({
  quest,
  onSwap,
  swapping,
}: {
  quest: Quest;
  onSwap?: (() => void) | undefined;
  swapping: boolean;
}) {
  const Icon = icons[quest.icon];
  const fraction = quest.current / quest.target;
  return (
    <li className={`quest${quest.complete ? " is-complete" : ""}`} data-quest={quest.id}>
      <span className={`quest-icon quest-icon--${quest.icon}`} aria-hidden="true">
        {quest.complete ? <QuestDone size={36} /> : <Icon size={36} />}
      </span>
      <span className="quest-body">
        <strong>{quest.title}</strong>
        <span>{quest.description}</span>
        <span
          className="quest-bar"
          role="progressbar"
          aria-label={`${quest.title} progress`}
          aria-valuemin={0}
          aria-valuemax={quest.target}
          aria-valuenow={quest.current}
        >
          <span style={{ "--quest-fill": fraction } as CSSProperties} />
        </span>
      </span>
      <span className="quest-count">
        {quest.current}/{quest.target}
        {onSwap && !quest.complete ? (
          <button
            type="button"
            className="quest-swap"
            onClick={onSwap}
            disabled={swapping}
            aria-label={`Swap ${quest.title} for another quest, using one quest swap`}
            title="Use a quest swap"
          >
            <Shuffle size={14} aria-hidden="true" />
          </button>
        ) : null}
      </span>
    </li>
  );
}

export function ChestArt({
  state,
  rarity = "common",
}: {
  state: "locked" | "ready" | "open";
  rarity?: ChestRarity;
}) {
  return (
    <svg
      className={`chest-art chest-art--${state} chest-art--${rarity}`}
      viewBox="0 0 120 110"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="chest-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8743a" />
          <stop offset="1" stopColor="#6b3a1c" />
        </linearGradient>
        <linearGradient id="chest-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff2a8" />
          <stop offset="0.5" stopColor="#ffd23e" />
          <stop offset="1" stopColor="#c98a12" />
        </linearGradient>
        <radialGradient id="chest-glow">
          <stop offset="0" stopColor="#fff3b0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffd23e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="100" rx="42" ry="6" fill="#000" opacity="0.35" />
      {state !== "locked" ? (
        <circle className="chest-glow" cx="60" cy="48" r="48" fill="url(#chest-glow)" />
      ) : null}
      <rect x="18" y="52" width="84" height="44" rx="6" fill="url(#chest-wood)" />
      <rect x="18" y="52" width="84" height="8" fill="url(#chest-gold)" />
      <rect x="18" y="86" width="84" height="6" fill="url(#chest-gold)" opacity="0.85" />
      <rect x="28" y="52" width="7" height="44" fill="url(#chest-gold)" />
      <rect x="85" y="52" width="7" height="44" fill="url(#chest-gold)" />
      <g className="chest-lid">
        <path d="M18 54 Q18 24 60 22 Q102 24 102 54 Z" fill="url(#chest-wood)" />
        <path
          d="M18 54 Q18 24 60 22 Q102 24 102 54"
          fill="none"
          stroke="url(#chest-gold)"
          strokeWidth="5"
        />
        <rect x="28" y="28" width="7" height="26" fill="url(#chest-gold)" />
        <rect x="85" y="28" width="7" height="26" fill="url(#chest-gold)" />
      </g>
      <rect x="52" y="48" width="16" height="18" rx="3" fill="url(#chest-gold)" />
      <circle cx="60" cy="56" r="2.6" fill="#6b3a1c" />
      {state === "open" ? (
        <g className="chest-coins">
          <circle cx="48" cy="44" r="6" fill="url(#chest-gold)" />
          <circle cx="62" cy="40" r="7" fill="url(#chest-gold)" />
          <circle cx="74" cy="45" r="5.5" fill="url(#chest-gold)" />
        </g>
      ) : null}
    </svg>
  );
}

const paletteFor: Record<ChestRarity, PaletteName> = {
  common: "gold",
  rare: "correct",
  epic: "cosmic",
  legendary: "blaze",
};

export function QuestBoard({
  quests,
  swaps = 0,
  compact = false,
}: {
  quests: DailyQuests;
  /** Quest swaps held. A swap button appears on unfinished quests when there is one to spend. */
  swaps?: number;
  /** The finish screen shows progress only; the rules live on Home. */
  compact?: boolean;
}) {
  const client = useQueryClient();
  const { play, celebrations } = useExperience();
  const chest = useRef<HTMLButtonElement>(null);
  const [opened, setOpened] = useState<ChestClaim | null>(null);
  const refresh = () => {
    void client.invalidateQueries({ queryKey: queryKeys.study });
    void client.invalidateQueries({ queryKey: queryKeys.home });
  };
  const claim = useMutation({
    mutationFn: claimDailyChest,
    onSuccess: (result) => {
      if (result.xpGained > 0) {
        setOpened(result);
        play("chest", result.rarity === "legendary" ? 3 : result.rarity === "epic" ? 2 : 1);
        if (celebrations)
          celebrateChest(chest.current, result.xpGained, paletteFor[result.rarity ?? "common"]);
      }
      refresh();
    },
  });
  const swap = useMutation({ mutationFn: swapQuest, onSuccess: refresh });
  const done = quests.quests.filter((quest) => quest.complete).length;
  const state = quests.chest.claimed ? "open" : quests.chest.ready ? "ready" : "locked";
  const rarity = quests.chest.rarity;
  const contents = [
    `${quests.chest.xp} XP`,
    ...quests.chest.items.map((item) => itemPhrase(item.id, item.count)),
  ].join(" · ");
  return (
    <section
      className={`quest-board${compact ? " quest-board--compact" : ""}`}
      aria-labelledby={compact ? undefined : "quest-board-title"}
      aria-label={compact ? "Today's quests" : undefined}
    >
      <header>
        {compact ? <h2>Today's quests</h2> : <h2 id="quest-board-title">Daily quests</h2>}
        <span className="quest-board-count">{done} of 3</span>
      </header>
      {compact ? null : (
        <p className="quest-board-rule">
          New quests each day at midnight. Finish all three to open the chest.
        </p>
      )}
      <ol className="quest-list">
        {quests.quests.map((quest) => (
          <QuestRow
            key={quest.id}
            quest={quest}
            swapping={swap.isPending}
            onSwap={
              !compact && swaps > 0 && !quests.chest.claimed
                ? () => swap.mutate(quest.id)
                : undefined
            }
          />
        ))}
      </ol>
      {swap.data && !swap.data.swapped ? (
        <p className="quest-board-note" role="status">
          {swap.data.reason}
        </p>
      ) : null}
      <button
        ref={chest}
        type="button"
        className={`quest-chest quest-chest--${state} quest-chest--${rarity}`}
        disabled={state !== "ready" || claim.isPending}
        onClick={() => claim.mutate()}
      >
        <ChestArt state={state} rarity={rarity} />
        <span>
          <strong className={`chest-title chest-title--${rarity}`}>
            {state === "open"
              ? `${RARITY_NAMES[rarity]} chest opened · +${quests.chest.xp} XP`
              : state === "ready"
                ? `Open your ${RARITY_NAMES[rarity]} chest`
                : `${RARITY_NAMES[rarity]} chest`}
          </strong>
          <span>
            {state === "open"
              ? opened?.items.length
                ? `Added: ${opened.items.map((item) => itemPhrase(item.id, item.count)).join(", ")}.`
                : "New quests tomorrow."
              : state === "ready"
                ? `Inside: ${contents}.`
                : `Finish all three quests to unlock it. Inside now: ${contents}.`}
          </span>
        </span>
      </button>
      {compact || state === "open" ? null : (
        <details className="chest-upgrades">
          <summary>
            Raise the chest's rarity
            <span>
              {quests.chest.upgrades.filter((upgrade) => upgrade.met).length} of{" "}
              {quests.chest.upgrades.length}
            </span>
          </summary>
          <p>Each of these, done today, raises it one step: Common, Rare, Epic, Legendary.</p>
          <ul>
            {quests.chest.upgrades.map((upgrade) => (
              <li key={upgrade.id} className={upgrade.met ? "is-met" : ""}>
                {upgrade.met ? (
                  <Check size={15} aria-label="Done" />
                ) : (
                  <span className="chest-upgrade-dot" aria-label="Not yet" role="img" />
                )}
                <span>{upgrade.label}</span>
                <span className="chest-upgrade-count">
                  {upgrade.current}/{upgrade.target}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
