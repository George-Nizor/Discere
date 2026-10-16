import type { SvgFigure as SvgFigureSpec } from "@discere/contracts";
import { useState } from "react";

/**
 * An authored drawing. The contract has already refused anything but plain shapes, text and the
 * theme classes, so the markup is placed as written. The drawing is hidden from assistive
 * technology and described once by the wrapper.
 */
export function SvgFigure({ spec }: { spec: SvgFigureSpec }) {
  const [caseId, setCaseId] = useState(spec.initialCaseId ?? spec.cases[0]?.id ?? "");
  const active = spec.cases.find((item) => item.id === caseId) ?? spec.cases[0];
  if (!active) return null;
  return (
    <figure className="learning-diagram svg-figure">
      {spec.cases.length > 1 ? (
        <div className="svg-figure-cases" role="group" aria-label="Choose a view">
          {spec.cases.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              aria-pressed={item.id === active.id}
              onClick={() => setCaseId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      <div
        className="svg-figure-drawing"
        role="img"
        aria-label={spec.alt}
        // Safe: validated by svgFigureProblems when the course loads.
        // biome-ignore lint/security/noDangerouslySetInnerHtml: authored, validated drawing
        dangerouslySetInnerHTML={{ __html: active.svg }}
      />
      {spec.caption ? <figcaption>{spec.caption}</figcaption> : null}
    </figure>
  );
}
