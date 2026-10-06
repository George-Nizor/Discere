import { useSyncExternalStore } from "react";

/**
 * The in-lesson combo: consecutive answers that were right on the first submission without a
 * hint or tutor help. It is a display of momentum only. The server keeps its own count from the
 * evidence ledger for quests and badges, so nothing here can award anything.
 */
interface ComboState {
  scope: string;
  count: number;
  best: number;
}
let state: ComboState = { scope: "", count: 0, best: 0 };
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

export function comboScope(pathname = typeof location === "undefined" ? "" : location.pathname) {
  return pathname.match(/^\/courses\/[^/]+\/lessons\/[^/]+/)?.[0] ?? pathname;
}

export function registerAnswer(scope: string, streakable: boolean, correct: boolean): number {
  const base = state.scope === scope ? state : { scope, count: 0, best: 0 };
  const count = streakable ? base.count + 1 : correct ? base.count : 0;
  state = { scope, count, best: Math.max(base.best, count) };
  emit();
  return count;
}

export function resetCombo() {
  state = { scope: "", count: 0, best: 0 };
  emit();
}

export function useCombo(scope: string): { count: number; best: number } {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
  return snapshot.scope === scope ? snapshot : { count: 0, best: 0 };
}

export const comboTitles: Record<number, string> = {
  3: "Nice streak",
  5: "On fire",
  8: "Blazing",
  10: "Unstoppable",
  15: "Legendary",
  20: "Mythic",
};
