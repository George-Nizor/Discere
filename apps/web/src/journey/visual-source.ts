import type { ExplainerStage, StageImage } from "@discere/contracts";

export type ResolvedVisual =
  | { kind: "image"; src: string; alt: string; image: StageImage | null }
  | { kind: "described"; alt: string; reason: string }
  | null;

/**
 * Turns the stage's own visual reference into a source. Nothing here is hard-coded to one
 * lesson: the server names the path it can serve, and a stage with no drawable source falls
 * back to the written description it already carries rather than to a broken image.
 */
export function resolveStageVisual(visual: ExplainerStage["visual"]): ResolvedVisual {
  if (visual.kind === "none") return null;
  if (visual.src) {
    return { kind: "image", src: visual.src, alt: visual.alt, image: visual.image ?? null };
  }
  return {
    kind: "described",
    alt: visual.alt,
    reason: `Discere has no drawable source for a ${visual.kind} visual in this lesson yet.`,
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
