/**
 * What the companion reacts to. Emitted from the places that already mark these moments
 * (answer celebrations, level-ups, chests, read-aloud), so the pet never decides anything itself
 * and can never award or imply evidence.
 */
export type MascotEvent =
  | { type: "answer"; correct: boolean; combo: number }
  | { type: "levelup" }
  | { type: "chest" }
  | { type: "finish"; stars: number }
  | { type: "listening"; on: boolean };

const listeners = new Set<(event: MascotEvent) => void>();

export function emitMascot(event: MascotEvent) {
  for (const listener of listeners) listener(event);
}

export function onMascot(listener: (event: MascotEvent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
