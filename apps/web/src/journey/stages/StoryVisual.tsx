import type { ExplainerStage } from "@discere/contracts";
import { flagFromParam } from "@discere/contracts";
import { CircuitVisual } from "../activities/CircuitVisual.js";
import { useVisualState } from "../activities/use-visual-state.js";
import { resolveStageVisual } from "../visual-source.js";

/**
 * The lesson's diagram, redrawn as the learner advances. A step names a state; the circuit
 * moves to it rather than cutting, so a change in resistance is something the learner watches
 * happen instead of a second picture they have to compare against a remembered first.
 */
/**
 * Folds interpolated parameters onto a circuit spec. A series circuit addresses its resistors
 * as `resistance0`, `resistance1`, and so on, because a flat numeric map is what can be
 * interpolated; anything a state does not mention keeps the value the bundle authored.
 */
function applyVisualParams(
  circuit: NonNullable<ExplainerStage["visual"]["circuit"]>,
  params: Record<string, number>,
): NonNullable<ExplainerStage["visual"]["circuit"]> {
  const flags = {
    showValues: flagFromParam(params["showValues"], circuit.showValues),
    showCurrentArrow: flagFromParam(params["showCurrentArrow"], circuit.showCurrentArrow),
  };
  if ("kind" in circuit && circuit.kind === "series") {
    return {
      ...circuit,
      ...flags,
      ...(params["voltage"] === undefined ? {} : { voltage: params["voltage"] }),
      resistances: circuit.resistances.map((value, index) => params[`resistance${index}`] ?? value),
    };
  }
  return {
    ...circuit,
    ...flags,
    ...(params["voltage"] === undefined ? {} : { voltage: params["voltage"] }),
    ...(params["resistance"] === undefined ? {} : { resistance: params["resistance"] }),
  };
}

export function StoryVisual({
  stage,
  activeStateId,
}: {
  stage: ExplainerStage;
  activeStateId: string;
}) {
  const { params, caption } = useVisualState(stage.visual.states, activeStateId);
  const circuit = stage.visual.circuit;
  const visual = resolveStageVisual(stage.visual);

  // A circuit is drawn here, from the blended parameters rather than from a fetched image.
  if (circuit) {
    const spec = applyVisualParams(circuit, params);
    return (
      <figure className="story-visual">
        <CircuitVisual spec={spec} />
        <figcaption aria-live="polite">{caption || stage.visual.alt}</figcaption>
      </figure>
    );
  }

  if (!visual) return null;
  return (
    <figure className="story-visual">
      {visual.kind === "image" ? (
        <img alt={visual.alt} src={visual.src} />
      ) : (
        <div className="visual-described">
          <p className="eyebrow">Described in words</p>
          <p>{visual.alt}</p>
          <p className="muted">{visual.reason}</p>
        </div>
      )}
      <figcaption>
        {caption ||
          (visual.kind === "image" && visual.image ? visual.image.caption : stage.visual.alt)}
        {/* A retrieved picture carries the attribution its licence requires, beside it. */}
        {visual.kind === "image" && visual.image ? (
          <span className="visual-credit">
            {visual.image.attribution},{" "}
            {visual.image.licenceUrl ? (
              <a href={visual.image.licenceUrl} rel="noreferrer" target="_blank">
                {visual.image.licence}
              </a>
            ) : (
              visual.image.licence
            )}
            {" · "}
            <a href={visual.image.landingPageUrl} rel="noreferrer" target="_blank">
              Source
            </a>
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
