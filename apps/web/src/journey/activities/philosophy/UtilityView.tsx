import { expectedUtilities, philosophyNumber as fmt } from "@discere/activity-engine";
import { useEffect, useId, useState } from "react";
import { Controls, Glows, Segmented, type ViewProps, wrap } from "./shared.js";

const signed = (v: number) => String(fmt(v)).replace("-", "−");
const LEFT = 190,
  WIDTH = 420,
  ROW = 150;

export function UtilityView({
  model,
  showResults,
  interactive,
  label,
}: ViewProps<"expected_utility">) {
  const id = useId().replaceAll(":", "");
  const [widths, setWidths] = useState<"probability" | "equal">("probability");
  const [level, setLevel] = useState(false);
  useEffect(() => {
    if (!showResults) setLevel(false);
  }, [showResults]);
  const eus = expectedUtilities(model);
  const max = Math.max(
    1,
    ...model.options.flatMap((o) => o.outcomes.map((x) => Math.abs(x.value))),
  );
  const k = 46 / max;
  const height = 26 + model.options.length * ROW;
  return (
    <div className="phil-utility" data-level={level ? "true" : "false"}>
      <svg viewBox={"0 0 640 " + height} role="img" aria-label={label} className="phil-svg">
        <defs>
          <Glows id={id} />
        </defs>
        {model.options.map((o, row) => {
          const base = 20 + row * ROW + 64;
          let cursor = LEFT;
          const eu = eus[row]!.value;
          return (
            <g key={o.label} className="phil-option">
              {wrap(o.label, 11).map((line, i, lines) => (
                <text
                  key={line}
                  x={LEFT - 14}
                  y={base + 5}
                  dy={(i - (lines.length - 1) / 2) * 1.2 + "em"}
                  textAnchor="end"
                  className="phil-svg-label"
                >
                  {line}
                </text>
              ))}
              <path d={"M" + LEFT + " " + base + "H" + (LEFT + WIDTH)} className="phil-axis" />
              {o.outcomes.map((x, i) => {
                const w =
                  widths === "probability" ? x.probability * WIDTH : WIDTH / o.outcomes.length;
                const h = Math.abs(x.value) * k;
                const left = cursor;
                cursor += w;
                const up = x.value >= 0;
                return (
                  <g key={x.label} className="phil-outcome">
                    <rect
                      x={left + 1.5}
                      y={up ? base - h : base}
                      width={Math.max(0, w - 3)}
                      height={Math.max(1.5, h)}
                      rx="4"
                      fill={"url(#" + id + (up ? "-teal" : "-coral") + ")"}
                      className="phil-bar"
                    />
                    <text
                      x={left + w / 2}
                      y={up ? base + 18 : base + h + 18}
                      textAnchor="middle"
                      className="phil-svg-small"
                    >
                      {fmt(x.probability * 100, 0)}% · {signed(x.value)}
                    </text>
                    <text
                      x={left + w / 2}
                      y={up ? base - h - 8 : base + h + 34}
                      textAnchor="middle"
                      className="phil-svg-tiny"
                    >
                      {x.label}
                    </text>
                  </g>
                );
              })}
              {level ? (
                <g className="phil-level">
                  <rect
                    x={LEFT}
                    y={eu >= 0 ? base - Math.abs(eu) * k : base}
                    width={WIDTH}
                    height={Math.max(2, Math.abs(eu) * k)}
                    rx="4"
                  />
                  <text
                    x={LEFT + WIDTH - 6}
                    y={eu >= 0 ? base - Math.abs(eu) * k - 8 : base + Math.abs(eu) * k + 18}
                    textAnchor="end"
                    className="phil-svg-label phil-level-text"
                  >
                    Expected {signed(eu)} {model.unit}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
      {interactive ? (
        <Controls>
          <Segmented
            label="Bar widths"
            value={widths}
            onChange={setWidths}
            options={[
              { value: "probability", label: "Width = probability" },
              { value: "equal", label: "Equal widths" },
            ]}
          />
          <button
            type="button"
            className="phil-chip-button"
            aria-pressed={level}
            disabled={!showResults}
            title={showResults ? undefined : "Levelling opens after you answer"}
            onClick={() => {
              setWidths("probability");
              setLevel(!level);
            }}
          >
            Level the areas
          </button>
        </Controls>
      ) : null}
      <p className="phil-caption">
        Heights are values in {model.unit}; with width set to probability, each area is probability
        × value.
      </p>
    </div>
  );
}
