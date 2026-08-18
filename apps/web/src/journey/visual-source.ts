import type { ExplainerStage } from "@discere/contracts";

export type ResolvedVisual =
  | { kind: "image"; src: string; alt: string }
  | { kind: "described"; alt: string; reason: string }
  | null;

/**
 * Turns the stage's own visual reference into a source. Nothing here is hard-coded to one
 * lesson: a kind the deterministic renderers do not cover falls back to the written
 * description the stage already carries, rather than to a broken image.
 */
export function resolveStageVisual(visual: ExplainerStage["visual"]): ResolvedVisual {
  if (visual.kind === "none") return null;
  if (visual.kind === "circuit")
    return { kind: "image", src: "/api/visuals/circuit.svg", alt: visual.alt };
  return {
    kind: "described",
    alt: visual.alt,
    reason: `Discere has no deterministic renderer for a ${visual.kind} visual yet.`,
  };
}

export function circuitVisualUrl(voltage: number, resistance: number, showValues: boolean): string {
  const query = new URLSearchParams({
    voltage: String(voltage),
    resistance: String(resistance),
    values: showValues ? "true" : "false",
  });
  return `/api/visuals/circuit.svg?${query.toString()}`;
}

export function graphVisualUrl(resistance: number): string {
  return `/api/visuals/graph.svg?${new URLSearchParams({ resistance: String(resistance) }).toString()}`;
}
