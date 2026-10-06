import type { QueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

/**
 * Whether Discere's local engine is answering, learnt from the requests the app already makes
 * (`requestJson` reports every answer and every unreachable engine here).
 * No request of its own runs while the engine is healthy; once one fails as unreachable, a
 * light health probe runs every few seconds so the app recovers by itself when the engine is
 * reopened.
 */
interface EngineState {
  down: boolean;
  /** Error screens already explaining the outage; the shell banner stays quiet while any exist. */
  explainedBy: number;
}

let state: EngineState = { down: false, explainedBy: 0 };
const listeners = new Set<() => void>();

function set(next: Partial<EngineState>): void {
  const merged = { ...state, ...next };
  if (merged.down === state.down && merged.explainedBy === state.explainedBy) return;
  state = merged;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useEngineStatus(): EngineState {
  return useSyncExternalStore(subscribe, () => state);
}

export function markEngineExplained(): () => void {
  set({ explainedBy: state.explainedBy + 1 });
  return () => set({ explainedBy: Math.max(0, state.explainedBy - 1) });
}

/** Called by the request helper when nothing answered at all. */
export function reportEngineUnreachable(): void {
  set({ down: true });
}

export function reportEngineAnswered(): void {
  set({ down: false });
}

/** Test seam: forget everything learnt. */
export function resetEngineStatus(): void {
  state = { down: false, explainedBy: 0 };
  for (const listener of listeners) listener();
}

async function engineAnswers(): Promise<boolean> {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Ask the engine directly, and on an answer refetch whatever failed while it was away. Returns
 * whether the engine answered, so a Retry button can say so.
 */
export async function retryEngine(client: QueryClient): Promise<boolean> {
  const answered = await engineAnswers();
  if (answered) {
    reportEngineAnswered();
    await client.refetchQueries({
      type: "active",
      predicate: (query) => query.state.status === "error",
    });
    void client.invalidateQueries();
  }
  return answered;
}

/** While the engine is down, probe it so the app recovers on its own. Returns the stop function. */
export function watchEngine(client: QueryClient, probeEveryMs = 5_000): () => void {
  let probing = false;
  const timer = setInterval(() => {
    if (!state.down || probing) return;
    probing = true;
    void retryEngine(client).finally(() => {
      probing = false;
    });
  }, probeEveryMs);
  return () => clearInterval(timer);
}
