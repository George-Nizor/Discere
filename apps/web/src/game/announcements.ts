import { useSyncExternalStore } from "react";

/**
 * Game announcements: a quest finished, the chest became ready, an achievement rank, a level.
 * Inside a lesson they are held rather than toasted, so nothing celebrates over a question
 * (least of all a wrong one). The lesson's finish screen shows what was held; leaving a lesson
 * any other way releases them as toasts.
 */
export interface Announcement {
  id: string;
  tone: "quest" | "chest" | "achievement" | "level" | "league";
  title: string;
  detail: string;
}

let held: Announcement[] = [];
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

export function hold(items: Announcement[]) {
  const known = new Set(held.map((item) => item.id));
  const fresh = items.filter((item) => !known.has(item.id));
  if (!fresh.length) return;
  held = [...held, ...fresh];
  emit();
}

/** Empties the held list and returns what it had. */
export function release(): Announcement[] {
  const out = held;
  if (!out.length) return out;
  held = [];
  emit();
  return out;
}

export function useHeldAnnouncements(): Announcement[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => held,
    () => held,
  );
}

/** A lesson in progress: its stages hold announcements; the finish screen shows them. */
export function lessonPhase(pathname: string): "stage" | "finish" | null {
  if (!/^\/courses\/[^/]+\/lessons\/[^/]+/.test(pathname)) return null;
  return /:completion\/?$/.test(decodeURIComponent(pathname)) ? "finish" : "stage";
}
