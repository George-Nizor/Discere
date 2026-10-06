import { useId } from "react";
import { ArrowDown } from "lucide-react";
import type { CourseCheckVisual } from "@discere/contracts";
type Given = Extract<CourseCheckVisual, { type: "statements" | "program" | "data_series" }>;
export function FoundationCheckVisual({ visual }: { visual: Given }) {
  const id = useId();
  if (visual.type === "program")
    return (
      <figure className="check-program" aria-labelledby={id}>
        <figcaption id={id}>Python</figcaption>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to scroll a long code listing. */}
        <pre tabIndex={0} aria-label="Python code">
          <code>{visual.code}</code>
        </pre>
      </figure>
    );
  if (visual.type === "statements")
    return (
      <figure className="check-statements" aria-labelledby={id}>
        <figcaption id={id}>{visual.title}</figcaption>
        <ol>
          {visual.statements.map((statement) => (
            <li key={statement.label}>
              <span className="check-statement-label">{statement.label}</span>
              <p>{statement.text}</p>
            </li>
          ))}
        </ol>
        {visual.conclusion ? (
          <div className="check-proposed-conclusion">
            <ArrowDown aria-hidden="true" size={20} />
            <span>Proposed conclusion</span>
            <p>{visual.conclusion}</p>
          </div>
        ) : null}
      </figure>
    );
  const values = visual.series.flatMap((s) => s.values);
  const lower = Math.floor(Math.min(...values) / 2) * 2 - 2;
  const upper = Math.ceil(Math.max(...values) / 2) * 2 + 2;
  const x = (value: number) => 34 + ((value - lower) * 412) / (upper - lower);
  const tallestStack = Math.max(
    ...visual.series.map((s) =>
      Math.max(...s.values.map((value) => s.values.filter((v) => v === value).length)),
    ),
  );
  const band = Math.max(110, tallestStack * 17 + 75),
    height = visual.series.length * band + 22;
  return (
    <figure className="check-series" aria-labelledby={id}>
      <figcaption id={id}>{visual.label}</figcaption>
      <svg
        viewBox={"0 0 480 " + height}
        role="img"
        aria-labelledby={id + "-title"}
        aria-describedby={id + "-desc"}
      >
        <title id={id + "-title"}>Observations on a shared number line</title>
        <desc id={id + "-desc"}>
          {visual.series.map((s) => s.label + ": " + s.values.join(", ")).join(". ")}. Each dot is
          one observation.
        </desc>
        {visual.series.map((s, row) => {
          const base = (row + 1) * band - 35,
            counts = new Map<number, number>();
          return (
            <g key={s.label}>
              <text x="34" y={row * band + 24} className="check-series-name">
                {s.label}
              </text>
              <path d={"M34 " + base + "H446"} stroke="#67736b" strokeWidth="1.5" />
              {Array.from({ length: 5 }, (_, tick) => {
                const n = lower + ((upper - lower) * tick) / 4;
                return (
                  <g key={n}>
                    <path d={"M" + x(n) + " " + base + "v6"} stroke="#87958c" />
                    <text x={x(n)} y={base + 22} textAnchor="middle">
                      {Number(n.toFixed(2))}
                    </text>
                  </g>
                );
              })}
              {s.values.map((value) => {
                const stack = counts.get(value) ?? 0;
                counts.set(value, stack + 1);
                return (
                  <circle
                    key={s.label + "-" + value + "-" + stack}
                    cx={x(value)}
                    cy={base - 13 - stack * 17}
                    r="6.5"
                    fill={row === 0 ? "#8ba0ff" : "#82e6a0"}
                    stroke="#d8e1f1"
                    strokeWidth="1"
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      <p className="check-series-values">
        {visual.series.map((s) => (
          <span key={s.label}>
            {s.label}: {s.values.join(", ")}
          </span>
        ))}
      </p>
    </figure>
  );
}
