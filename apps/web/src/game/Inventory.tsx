import type { Inventory } from "@discere/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Shuffle, Snowflake, Zap } from "../brand/icon-set.js";
import { useEffect, useState } from "react";
import { queryKeys } from "../api/queries.js";
import { useExperience } from "../study/experience.js";
import { activateBoost } from "./api.js";

/** Minutes and seconds left on a running boost, refreshing the summary when it ends. */
export function useBoostClock(inventory: Inventory | undefined): string | null {
  const client = useQueryClient();
  const endsAt = inventory?.activeBoost?.endsAt;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= Date.parse(endsAt)) {
        window.clearInterval(timer);
        void client.invalidateQueries({ queryKey: queryKeys.study });
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt, client]);
  if (!endsAt) return null;
  const left = Math.max(0, Date.parse(endsAt) - now);
  if (left === 0) return null;
  const minutes = Math.floor(left / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Items earned by real work: chests, new levels and seven study days. None can be bought, none
 * changes what counts as correct, and none turns help into independent work.
 */
export function InventoryCard({
  inventory,
  nextFreezeIn,
}: {
  inventory: Inventory;
  nextFreezeIn: number;
}) {
  const client = useQueryClient();
  const { play } = useExperience();
  const clock = useBoostClock(inventory);
  const boost = useMutation({
    mutationFn: activateBoost,
    onSuccess: (result) => {
      if (result.activated) play("quest", 2);
      void client.invalidateQueries({ queryKey: queryKeys.study });
    },
  });
  return (
    <section className="inventory-card" aria-labelledby="inventory-title">
      <header>
        <h2 id="inventory-title">Your items</h2>
        <p>Earned by studying, never bought.</p>
      </header>
      <ul className="inventory-list">
        <li className="inventory-item inventory-item--freeze">
          <span className="inventory-icon" aria-hidden="true">
            <Snowflake size={20} />
          </span>
          <span className="inventory-copy">
            <strong>
              Streak freeze{" "}
              <span className="inventory-count">
                {inventory.streakFreezes}/{inventory.freezeCap}
              </span>
            </strong>
            <span>
              Covers a day you miss, automatically.{" "}
              {inventory.streakFreezes >= inventory.freezeCap
                ? "You hold the most allowed."
                : `Next in ${nextFreezeIn} study ${nextFreezeIn === 1 ? "day" : "days"}.`}
            </span>
          </span>
        </li>
        <li className={`inventory-item inventory-item--boost${clock ? " is-active" : ""}`}>
          <span className="inventory-icon" aria-hidden="true">
            <Zap size={20} />
          </span>
          <span className="inventory-copy">
            <strong>
              XP boost <span className="inventory-count">{inventory.xpBoosts}</span>
            </strong>
            <span>
              {clock
                ? "Running: 1.5× XP on answers, recall and lessons."
                : `1.5× XP on answers, recall and lessons for ${inventory.boostMinutes} minutes. One per new level.`}
            </span>
          </span>
          {clock ? (
            <span className="inventory-timer" role="timer" aria-label={`Boost time left ${clock}`}>
              {clock}
            </span>
          ) : (
            <button
              type="button"
              className="button button-quiet inventory-use"
              disabled={inventory.xpBoosts === 0 || boost.isPending}
              onClick={() => boost.mutate()}
            >
              Start
            </button>
          )}
        </li>
        <li className="inventory-item inventory-item--swap">
          <span className="inventory-icon" aria-hidden="true">
            <Shuffle size={20} />
          </span>
          <span className="inventory-copy">
            <strong>
              Quest swap <span className="inventory-count">{inventory.questSwaps}</span>
            </strong>
            <span>
              Replaces an unfinished daily quest; use it from the quest list. From Epic chests up.
            </span>
          </span>
        </li>
      </ul>
      {boost.data && !boost.data.activated ? (
        <p className="inventory-note" role="status">
          {boost.data.reason}
        </p>
      ) : null}
    </section>
  );
}
