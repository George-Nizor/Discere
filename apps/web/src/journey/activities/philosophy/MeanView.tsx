import { meanSummary, philosophyNumber as fmt } from "@discere/activity-engine";
import { useId, useState } from "react";
import { Glows, type ViewProps } from "./shared.js";

const X0 = 60,
  X1 = 580,
  Y = 112;

export function MeanView({ model, showResults, interactive, label }: ViewProps<"mean">) {
  const id = useId().replaceAll(":", "");
  const control = useId();
  const span = model.high - model.low;
  const [value, setValue] = useState(model.low + span * 0.25);
  const sx = (v: number) => X0 + ((v - model.low) / span) * (X1 - X0);
  const summary = meanSummary(model);
  const clamped = Math.min(model.high, Math.max(model.low, value));
  const region = summary.region(clamped);
  return (
    <div className="phil-mean">
      <svg viewBox="0 0 640 200" role="img" aria-label={label} className="phil-svg">
        <defs>
          <Glows id={id} />
          <linearGradient id={id + "-spectrum"} x1="0" x2="1">
            <stop offset="0" stopColor="#5b8fd9" />
            <stop offset="0.5" stopColor="#8d77c9" />
            <stop offset="1" stopColor="#e07a5f" />
          </linearGradient>
        </defs>
        <text x="320" y="26" textAnchor="middle" className="phil-svg-small">
          {model.sphere} · for {model.agent}
        </text>
        <rect
          x={X0}
          y={Y - 9}
          width={X1 - X0}
          height="18"
          rx="9"
          fill={"url(#" + id + "-spectrum)"}
          className="phil-spectrum"
        />
        <g className="phil-band" style={{ transform: "translateX(" + sx(model.band[0]) + "px)" }}>
          <rect
            x="0"
            y={Y - 30}
            width={sx(model.band[1]) - sx(model.band[0])}
            height="60"
            rx="14"
            className="phil-band-glow"
            filter={"url(#" + id + "-soft)"}
          />
          <rect
            x="0"
            y={Y - 16}
            width={sx(model.band[1]) - sx(model.band[0])}
            height="32"
            rx="12"
            className="phil-band-core"
          />
          <text
            x={(sx(model.band[1]) - sx(model.band[0])) / 2}
            y={Y - 30}
            textAnchor="middle"
            className="phil-svg-label phil-virtue"
          >
            {model.virtue}
          </text>
        </g>
        <text x={X0} y={Y + 72} textAnchor="start" className="phil-svg-small">
          ← {model.deficiency}
        </text>
        <text x={X1} y={Y + 72} textAnchor="end" className="phil-svg-small">
          {model.excess} →
        </text>
        {[model.low, model.band[0], model.band[1], model.high]
          .filter((v, i, all) => all.findIndex((w) => Math.abs(sx(w) - sx(v)) < 34) === i)
          .map((v) => (
            <g key={v} className="phil-tick">
              <path d={"M" + sx(v) + " " + (Y + 14) + "v10"} />
              <text x={sx(v)} y={Y + 42} textAnchor="middle" className="phil-svg-small">
                {fmt(v)}
              </text>
            </g>
          ))}
        {showResults ? (
          <g className="phil-midpoint">
            <path d={"M" + sx(summary.arithmeticMean) + " " + (Y - 44) + "V" + (Y + 28)} />
            <text
              x={sx(summary.arithmeticMean)}
              y={Y - 50}
              textAnchor="middle"
              className="phil-svg-small"
            >
              arithmetic midpoint {fmt(summary.arithmeticMean)}
            </text>
          </g>
        ) : null}
        {interactive ? (
          <g className="phil-marker" style={{ transform: "translateX(" + sx(clamped) + "px)" }}>
            <circle cx="0" cy={Y} r="20" fill={"url(#" + id + "-gold)"} />
            <circle cx="0" cy={Y} r="8" className="phil-marker-dot" />
          </g>
        ) : null}
      </svg>
      <p className="phil-caption">Scale: {model.scale}</p>
      {interactive ? (
        <label htmlFor={control} className="phil-slider">
          <span>
            Try an amount:{" "}
            <output>
              {fmt(clamped, 1)} {model.scale}
            </output>{" "}
            · <strong data-region={region === model.virtue ? "virtue" : "vice"}>{region}</strong>
          </span>
          <input
            id={control}
            type="range"
            min={model.low}
            max={model.high}
            step={span / 100}
            value={clamped}
            aria-label={"Amount in " + model.scale}
            onChange={(e) => setValue(Number(e.currentTarget.value))}
          />
        </label>
      ) : null}
    </div>
  );
}
