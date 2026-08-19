import type { CircuitDiagramSpec } from "@discere/contracts";
import { renderCircuitSvg } from "@discere/visual-engine";
import { useMemo } from "react";

/**
 * The circuit, drawn in the browser from the same engine the server uses.
 *
 * It replaces an `<img>` pointed at `/api/visuals/circuit.svg`. A diagram that changes as the
 * learner moves through a lesson would otherwise cost one request per frame, and could not be
 * animated at all. The server route stays for authoring previews and plain-image fallbacks.
 *
 * The markup is inserted with `dangerouslySetInnerHTML`, which is safe here for a reason worth
 * stating: `renderCircuitSvg` is a pure function over a validated numeric spec, every string it
 * interpolates goes through `escapeXml`, and no learner input reaches it. If that ever stops
 * being true, this has to be parsed rather than injected.
 */
export function CircuitVisual({
  spec,
  className,
}: {
  spec: CircuitDiagramSpec;
  className?: string;
}) {
  const markup = useMemo(() => {
    try {
      return renderCircuitSvg(spec);
    } catch {
      // Out-of-range values are a content fault, not something to crash a lesson over.
      return "";
    }
  }, [spec]);

  if (!markup) return null;
  return (
    <div
      className={className ? `circuit-visual ${className}` : "circuit-visual"}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: pure engine output over a validated numeric spec, every interpolated string escaped, no learner input; see the note above this component.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
