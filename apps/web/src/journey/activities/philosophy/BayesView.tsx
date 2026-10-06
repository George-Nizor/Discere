import { bayesDots } from "@discere/activity-engine";
import { useEffect, useState } from "react";
import { Segmented, type ViewProps } from "./shared.js";

const ROWS = 20;
const GAP = 12;
const kinds = ["he", "h", "e", "none"] as const;

export function BayesView({ model, showResults, interactive, label }: ViewProps<"bayes_grid">) {
  const [mode, setMode] = useState<"all" | "mark" | "filter">(interactive ? "all" : "mark");
  useEffect(() => {
    if (!showResults && mode === "filter") setMode("mark");
  }, [showResults, mode]);
  const { dots, per, groups } = bayesDots(model, 1000);
  const columns = Math.ceil(dots / ROWS);
  const width = columns * GAP;
  // Dots are ordered by group, so the hypothesis forms a band at the left of the field.
  const kindOf: Array<(typeof kinds)[number]> = [];
  groups.forEach((count, g) => {
    for (let i = 0; i < count; i++) kindOf.push(kinds[g]!);
  });
  let evidenceIndex = 0;
  const positions = kindOf.map((kind, i) => {
    const evidence = kind === "he" || kind === "e";
    const slot = mode === "filter" && evidence ? evidenceIndex++ : i;
    return { id: i, kind, evidence, x: Math.floor(slot / ROWS) * GAP, y: (slot % ROWS) * GAP };
  });
  const leftShift = (640 - width) / 2;
  return (
    <div className="phil-bayes" data-mode={mode}>
      <svg viewBox="0 0 640 290" role="img" aria-label={label} className="phil-svg">
        <g transform={"translate(" + (leftShift + GAP / 2) + " 20)"}>
          {positions.map((p) => (
            <circle
              key={p.id}
              r="4.1"
              className={"phil-dot phil-dot-" + p.kind}
              data-faded={mode === "filter" && !p.evidence ? "true" : "false"}
              style={{
                transform: "translate(" + p.x + "px, " + p.y + "px)",
                transitionDelay: (Math.floor(p.id / ROWS) % 50) * 8 + "ms",
              }}
            />
          ))}
        </g>
        <text x="320" y="278" textAnchor="middle" className="phil-svg-small">
          {per === 1
            ? "Each dot is one person"
            : "Each dot stands for " + per.toLocaleString("en-GB") + " people"}
        </text>
      </svg>
      <ul className="phil-bayes-legend">
        <li>
          <span className="phil-swatch phil-dot-he" /> {model.hypothesis}
        </li>
        <li>
          <span className="phil-swatch phil-dot-none" /> do not
        </li>
        {mode !== "all" ? (
          <li>
            <span className="phil-swatch phil-swatch-ring" /> {model.evidence}
          </li>
        ) : null}
      </ul>
      {interactive ? (
        <Segmented
          label="What the grid shows"
          value={mode}
          onChange={setMode}
          options={[
            { value: "all", label: "Everyone" },
            { value: "mark", label: "Mark who " + model.evidence },
            {
              value: "filter",
              label: "Keep only them",
              disabled: !showResults,
              title: showResults ? undefined : "Filtering opens after you answer",
            },
          ]}
        />
      ) : null}
    </div>
  );
}
