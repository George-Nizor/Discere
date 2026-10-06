import { philosophyNumber as fmt, veilSummary } from "@discere/activity-engine";
import { Shuffle } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Controls, Glows, Segmented, type ViewProps } from "./shared.js";

const BASE = 228,
  TALL = 160;

export function VeilView({ model, showResults, interactive, label }: ViewProps<"veil">) {
  const id = useId().replaceAll(":", "");
  const [lens, setLens] = useState<"veil" | "worst" | "average" | "plain">(
    interactive ? "veil" : "plain",
  );
  const [place, setPlace] = useState(0);
  useEffect(() => {
    if (!showResults && lens === "average") setLens("veil");
  }, [showResults, lens]);
  const summary = veilSummary(model);
  const n = model.societies.length;
  const gap = 44;
  const groupWidth = (560 - gap * (n - 1)) / n;
  const max = Math.max(1, ...model.societies.flatMap((s) => s.values));
  const h = (v: number) => (v / max) * TALL;
  const spot = place % model.positions.length;
  return (
    <div className="phil-veil" data-lens={lens}>
      <svg viewBox="0 0 640 300" role="img" aria-label={label} className="phil-svg">
        <defs>
          <Glows id={id} />
          <linearGradient
            id={id + "-veil"}
            x1="0"
            y1="0"
            x2="46"
            y2="0"
            gradientUnits="userSpaceOnUse"
            spreadMethod="reflect"
          >
            <stop offset="0" stopColor="#efe3ff" stopOpacity="0.02" />
            <stop offset="0.6" stopColor="#efe3ff" stopOpacity="0.13" />
            <stop offset="1" stopColor="#c58cff" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id={id + "-veil-fade"} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.75" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={id + "-veil-mask"}>
            <rect
              x="20"
              y="30"
              width="600"
              height={BASE - 20}
              fill={"url(#" + id + "-veil-fade)"}
            />
          </mask>
        </defs>
        {model.societies.map((s, si) => {
          const x0 = 40 + si * (groupWidth + gap);
          let cursor = x0;
          const row = summary.rows[si]!;
          return (
            <g key={s.label} className="phil-society">
              <path
                d={"M" + (x0 - 6) + " " + BASE + "H" + (x0 + groupWidth + 6)}
                className="phil-axis"
              />
              {model.positions.map((position, pi) => {
                const value = s.values[pi]!;
                const w = summary.shares[pi]! * groupWidth;
                const left = cursor;
                cursor += w;
                const worst = value === row.minimum;
                const lit = lens === "veil" ? pi === spot : lens === "worst" ? worst : true;
                return (
                  <g
                    key={position}
                    className="phil-position"
                    data-lit={lit ? "true" : "false"}
                    data-worst={worst ? "true" : "false"}
                  >
                    <rect
                      x={left + 2}
                      y={BASE - h(value)}
                      width={Math.max(2, w - 4)}
                      height={Math.max(2, h(value))}
                      rx="5"
                      fill={"url(#" + id + "-violet)"}
                      className="phil-bar"
                    />
                    <text
                      x={left + w / 2}
                      y={BASE - h(value) - 9}
                      textAnchor="middle"
                      className="phil-svg-label"
                    >
                      {fmt(value)}
                    </text>
                    {lens === "veil" && pi === spot ? (
                      <text
                        x={left + w / 2}
                        y={BASE + 20}
                        textAnchor="middle"
                        className="phil-svg-tiny phil-you"
                      >
                        you
                      </text>
                    ) : null}
                  </g>
                );
              })}
              <text
                x={x0 + groupWidth / 2}
                y={BASE + 44}
                textAnchor="middle"
                className="phil-svg-label"
              >
                {s.label}
              </text>
              {lens === "average" ? (
                <g className="phil-average">
                  <path
                    d={"M" + (x0 - 4) + " " + (BASE - h(row.average)) + "H" + (x0 + groupWidth + 4)}
                  />
                  <text
                    x={x0 + groupWidth / 2}
                    y={BASE - h(row.average) - 6}
                    textAnchor="middle"
                    className="phil-svg-small"
                  >
                    average {fmt(row.average)}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
        {lens === "veil" ? (
          <rect
            x="20"
            y="30"
            width="600"
            height={BASE - 20}
            fill={"url(#" + id + "-veil)"}
            mask={"url(#" + id + "-veil-mask)"}
            className="phil-veil-cloth"
          />
        ) : null}
      </svg>
      <ul className="phil-positions">
        {model.positions.map((p, i) => (
          <li key={p} data-lit={lens === "veil" && i === spot ? "true" : "false"}>
            {p} · {fmt(summary.shares[i]! * 100, 0)}% of people
          </li>
        ))}
      </ul>
      {interactive ? (
        <Controls>
          <Segmented
            label="How to look at the societies"
            value={lens === "plain" ? "veil" : lens}
            onChange={setLens}
            options={[
              { value: "veil", label: "Behind the veil" },
              { value: "worst", label: "Worst-off" },
              {
                value: "average",
                label: "Averages",
                disabled: !showResults,
                title: showResults ? undefined : "Averages open after you answer",
              },
            ]}
          />
          {lens === "veil" ? (
            <button type="button" onClick={() => setPlace(place + 1)}>
              <Shuffle aria-hidden="true" size={16} />
              Another place
            </button>
          ) : null}
        </Controls>
      ) : null}
      <p className="phil-caption">
        Values in {model.unit}. Bar widths show each position's share of people.
      </p>
    </div>
  );
}
