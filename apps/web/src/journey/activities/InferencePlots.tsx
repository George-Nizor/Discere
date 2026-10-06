import type { InferenceModel } from "@discere/contracts";
import type { ReactNode } from "react";
import {
  binomialMass,
  inferenceCoverage,
  inferenceMeanInterval,
  inferenceNumber as n,
  inferencePaired,
  inferencePower,
  inferenceProportion,
  inferenceSampling,
  inferenceSummary,
  inferenceTest,
  inferenceWelch,
  normalDensity,
  poissonMass,
  studentDensity,
} from "@discere/activity-engine";

type Model<K extends InferenceModel["kind"]> = Extract<InferenceModel, { kind: K }>;
const range = (count: number) => Array.from({ length: count }, (_, i) => i);
function bounds(values: number[], padding = 0.12): [number, number] {
  const low = Math.min(...values),
    high = Math.max(...values),
    gap = Math.max(1, high - low);
  return [low - gap * padding, high + gap * padding];
}
const scale = (low: number, high: number) => (value: number) =>
  44 + (392 * (value - low)) / (high - low);
function Plot({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={"inference-plot " + className}
      viewBox="0 0 480 240"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}
function Axis({
  low,
  high,
  y = 202,
  ticks = true,
}: {
  low: number;
  high: number;
  y?: number;
  ticks?: boolean;
}) {
  const x = scale(low, high);
  return (
    <g className="inference-axis">
      <path d={"M44 " + y + "H436"} />
      {ticks &&
        range(5).map((i) => {
          const value = low + ((high - low) * i) / 4;
          return (
            <g key={i}>
              <path d={"M" + x(value) + " " + y + "v5"} />
              <text x={x(value)} y={y + 24} textAnchor="middle">
                {Number(value.toPrecision(3)).toString()}
              </text>
            </g>
          );
        })}
    </g>
  );
}
function Dots({
  values,
  showSummary = false,
  domain,
}: {
  values: number[];
  showSummary?: boolean;
  domain?: [number, number];
}) {
  const [low, high] = domain ?? bounds(values),
    x = scale(low, high);
  const maximumStack = Math.max(...values.map((value) => values.filter((v) => v === value).length));
  const dotGap = Math.min(24, 122 / maximumStack);
  const summary = showSummary ? inferenceSummary(values) : null;
  return (
    <Plot label="Given observations on a common number line.">
      <Axis low={low} high={high} />
      {values.map((value, i) => {
        const stack = values.slice(0, i).filter((v) => v === value).length;
        return (
          <g key={value + ":" + stack}>
            <circle
              className="inference-given"
              cx={x(value)}
              cy={130 - stack * dotGap}
              r={Math.min(7, dotGap / 2.5)}
            />
            {stack === 0 && (
              <text className="inference-label" x={x(value)} y="151" textAnchor="middle">
                {n(value)}
              </text>
            )}
          </g>
        );
      })}
      {summary && (
        <g className="inference-revealed" data-result="summary">
          <path
            className="inference-line"
            d={"M" + x(summary.sorted[0]!) + " 167H" + x(summary.sorted.at(-1)!)}
          />
          <rect
            x={x(summary.q1)}
            y="151"
            width={Math.max(1, x(summary.q3) - x(summary.q1))}
            height="32"
            rx="3"
          />
          <path className="inference-line" d={"M" + x(summary.median) + " 148v38"} />
        </g>
      )}
    </Plot>
  );
}
function Bars({
  values,
  highlighted,
  reveal,
  count = false,
}: {
  values: Array<{ value: number; probability: number }>;
  highlighted?: (value: number) => boolean;
  reveal: boolean;
  count?: boolean;
}) {
  const highest = Math.max(...values.map((v) => v.probability), 0.01),
    gap = 392 / values.length;
  const stride = Math.max(1, Math.ceil(values.length / 10));
  return (
    <Plot
      label={
        count
          ? "Probability by count. Shaded bars belong to the stated event."
          : "Probability distribution across the displayed values."
      }
    >
      <Axis low={0} high={1} ticks={false} />
      {values.map((v, i) => (
        <g key={v.value} className={highlighted?.(v.value) ? "inference-event" : "inference-bar"}>
          <rect
            x={44 + i * gap + gap * 0.13}
            y={202 - (146 * v.probability) / highest}
            width={gap * 0.74}
            height={(146 * v.probability) / highest}
            rx="3"
          />
          {(i % stride === 0 || i === values.length - 1) && (
            <text className="inference-label" x={44 + (i + 0.5) * gap} y="227" textAnchor="middle">
              {n(v.value)}
            </text>
          )}
          {reveal && values.length <= 8 && (
            <text
              className="inference-label"
              x={44 + (i + 0.5) * gap}
              y={192 - (146 * v.probability) / highest}
              textAnchor="middle"
            >
              {n(v.probability)}
            </text>
          )}
        </g>
      ))}
      <text className="inference-muted" x="44" y="24">
        Probability
      </text>
    </Plot>
  );
}
function Curve({
  low,
  high,
  density,
  shade,
  marker,
  second,
}: {
  low: number;
  high: number;
  density: (x: number) => number;
  shade?: ((x: number) => boolean) | undefined;
  marker?: number;
  second?: (x: number) => number;
}) {
  const x = scale(low, high),
    points = range(161).map((i) => low + ((high - low) * i) / 160);
  const top = Math.max(...points.map(density), ...points.map((v) => second?.(v) ?? 0));
  const y = (value: number) => 194 - (146 * value) / Math.max(top, 1e-12);
  const path = (f: (v: number) => number) =>
    points.map((v, i) => (i ? "L" : "M") + x(v) + " " + y(f(v))).join("");
  return (
    <Plot label="Distribution curve on a common horizontal scale; shading indicates the stated region.">
      <Axis low={low} high={high} y={194} />
      {shade &&
        points
          .slice(0, -1)
          .filter(shade)
          .map((v) => (
            <path
              key={v}
              className="inference-area"
              strokeWidth="3"
              d={"M" + x(v) + " 194V" + y(density(v))}
            />
          ))}
      <path className="inference-curve" d={path(density)} />
      {second && <path className="inference-second-curve" d={path(second)} />}
      {marker !== undefined && marker >= low && marker <= high && (
        <path className="inference-marker" d={"M" + x(marker) + " 35V194"} />
      )}
    </Plot>
  );
}
function Intervals({
  rows,
  target,
  reveal,
  domain,
}: {
  rows: Array<{ mean: number; lower: number; upper: number; label: string }>;
  target?: number;
  reveal: boolean;
  domain?: [number, number];
}) {
  const [low, high] =
    domain ??
    bounds([...rows.flatMap((r) => [r.lower, r.upper]), ...(target === undefined ? [] : [target])]);
  const x = scale(low, high),
    gap = Math.min(60, 145 / Math.max(rows.length, 1));
  return (
    <Plot label="Interval estimates on a common horizontal scale. Dots mark estimates; horizontal lines span their intervals.">
      <Axis low={low} high={high} ticks={reveal} />
      {target !== undefined && (
        <g className="inference-target">
          <path d={"M" + x(target) + " 24V202"} />
          <text x={x(target)} y="18" textAnchor="middle">
            {n(target)}
          </text>
        </g>
      )}
      {rows.map((row, i) => {
        const y = 52 + i * gap,
          misses = reveal && target !== undefined && (row.lower > target || row.upper < target);
        return (
          <g
            key={row.label + ":" + row.mean + ":" + row.lower}
            className={
              misses ? "inference-miss" : reveal ? "inference-revealed" : "inference-estimate"
            }
          >
            <path
              className="inference-line"
              d={"M" + x(row.lower) + " " + y + "H" + x(row.upper)}
            />
            <path
              className="inference-line"
              d={"M" + x(row.lower) + " " + (y - 5) + "v10M" + x(row.upper) + " " + (y - 5) + "v10"}
            />
            <circle cx={x(row.mean)} cy={y} r={rows.length > 10 ? 2.5 : 5} />
            {row.label && (
              <text className="inference-label" x="44" y={y - 13}>
                {row.label}
              </text>
            )}
          </g>
        );
      })}
    </Plot>
  );
}
function Paired({ model, reveal }: { model: Model<"paired">; reveal: boolean }) {
  const [low, high] = bounds([...model.before, ...model.after]),
    y = (v: number) => 195 - ((v - low) / (high - low)) * 150;
  return (
    <Plot label="Each connecting line belongs to one unit, from its before measurement on the left to its after measurement on the right.">
      <text className="inference-label" x="135" y="23" textAnchor="middle">
        Before
      </text>
      <text className="inference-label" x="345" y="23" textAnchor="middle">
        After
      </text>
      {model.before
        .map((value, i) => ({ value, after: model.after[i]!, unit: "unit-" + i }))
        .map(({ value, after, unit }) => (
          <g key={unit}>
            <path
              className={"inference-pair " + (reveal ? "is-revealed" : "")}
              d={"M135 " + y(value) + "L345 " + y(after)}
            />
            <circle className="inference-given" cx="135" cy={y(value)} r="5" />
            <circle className="inference-given" cx="345" cy={y(after)} r="5" />
            <text className="inference-label" x="120" y={y(value) + 5} textAnchor="end">
              {n(value)}
            </text>
            <text className="inference-label" x="360" y={y(after) + 5}>
              {n(after)}
            </text>
          </g>
        ))}
      <text className="inference-muted" x="240" y="231" textAnchor="middle">
        Keep the measurements paired by unit
      </text>
    </Plot>
  );
}
function SummarySpreads({ model }: { model: Model<"standard_error"> | Model<"two_sample"> }) {
  const groups =
    model.kind === "two_sample"
      ? model.groups
      : [
          { label: model.knownSigma ? "Population SD" : "Sample SD", sd: model.sd },
          { label: "Standard error of the mean", sd: model.sd / Math.sqrt(model.size) },
        ];
  const largest = Math.max(...groups.map((g) => g.sd));
  return (
    <Plot label="Spread comparison. The length of each horizontal segment represents the named spread, not a confidence interval.">
      {groups.map((g, i) => (
        <g key={g.label}>
          <text className="inference-label" x="44" y={42 + i * 93}>
            {g.label}
          </text>
          <rect
            className="inference-spread-track"
            x="44"
            y={58 + i * 93}
            width="392"
            height="19"
            rx="9"
          />
          <rect
            className="inference-given"
            x="44"
            y={58 + i * 93}
            width={Math.max(2, (392 * g.sd) / largest)}
            height="19"
            rx="9"
          />
        </g>
      ))}
    </Plot>
  );
}

export function InferenceDrawing({
  model: m,
  showResults,
  visibleIntervals,
  models = [m],
}: {
  model: InferenceModel;
  showResults: boolean;
  visibleIntervals?: number | undefined;
  models?: InferenceModel[];
}) {
  const commonIntervalDomain = () =>
    bounds(
      models.flatMap((model) => {
        if (model.kind === "mean_interval") {
          const interval = inferenceMeanInterval(model);
          return [interval.lower, interval.upper];
        }
        if (model.kind === "proportion_interval") return [0, 1];
        if (model.kind === "two_sample") {
          const interval = inferenceWelch(model);
          return [0, interval.lower, interval.upper];
        }
        if (model.kind === "interval_coverage")
          return inferenceCoverage(model).flatMap((c) => [c.lower, c.upper]);
        return [];
      }),
    );

  switch (m.kind) {
    case "sample_summary":
      return (
        <Dots
          values={m.values}
          showSummary={showResults}
          domain={bounds(
            models.flatMap((model) => (model.kind === "sample_summary" ? model.values : [])),
          )}
        />
      );
    case "discrete_distribution":
      return <Bars values={m.outcomes} reveal />;
    case "binomial":
    case "poisson": {
      const mass = (k: number) =>
        m.kind === "binomial"
          ? binomialMass(m.trials, m.probability, k)
          : poissonMass(m.rate * m.duration, k);
      const last =
        m.kind === "binomial"
          ? m.trials
          : Math.min(
              40,
              Math.max(
                m.target,
                Math.ceil(m.rate * m.duration + 4 * Math.sqrt(m.rate * m.duration)),
              ),
            );
      const highlighted = (k: number) =>
        m.tail === "equal" ? k === m.target : m.tail === "at_least" ? k >= m.target : k <= m.target;
      return (
        <div>
          <Bars
            values={range(last + 1).map((value) => ({ value, probability: mass(value) }))}
            highlighted={highlighted}
            reveal={showResults}
            count
          />
          {m.kind === "poisson" && (
            <p className="inference-caption">
              Counts above {last} remain possible; the plot shows the main part of the distribution.
            </p>
          )}
        </div>
      );
    }
    case "normal": {
      const low = Math.min(m.mean - 3.5 * m.sd, m.lower - m.sd / 4),
        high = Math.max(m.mean + 3.5 * m.sd, m.upper + m.sd / 4);
      return (
        <Curve
          low={low}
          high={high}
          density={(v) => normalDensity((v - m.mean) / m.sd) / m.sd}
          shade={(v) => v >= m.lower && v <= m.upper}
        />
      );
    }
    case "sampling_means":
      return showResults ? (
        <Bars values={inferenceSampling(m).bins} reveal />
      ) : (
        <Dots values={m.population} />
      );
    case "standard_error":
      return <SummarySpreads model={m} />;
    case "mean_interval": {
      const c = inferenceMeanInterval(m);
      return (
        <Intervals
          rows={[{ ...c, label: "Population mean estimate" }]}
          reveal={showResults}
          domain={commonIntervalDomain()}
        />
      );
    }
    case "proportion_interval": {
      const c = inferenceProportion(m);
      return (
        <Intervals
          rows={[
            {
              mean: c.estimate,
              lower: c.lower,
              upper: c.upper,
              label: "Population proportion estimate",
            },
          ]}
          reveal={showResults}
          domain={commonIntervalDomain()}
        />
      );
    }
    case "interval_coverage": {
      const intervals = inferenceCoverage(m).slice(0, visibleIntervals ?? m.intervals);
      return (
        <Intervals
          rows={intervals.map((c) => ({ ...c, label: "" }))}
          target={m.mean}
          reveal={showResults}
          domain={commonIntervalDomain()}
        />
      );
    }
    case "mean_test": {
      const t = inferenceTest(m),
        low = Math.min(-4, t.statistic - 0.5),
        high = Math.max(4, t.statistic + 0.5);
      const density = (v: number) =>
        m.knownSigma ? normalDensity(v) : studentDensity(v, m.size - 1);
      const shade = (v: number) =>
        m.alternative === "less"
          ? v <= t.statistic
          : m.alternative === "greater"
            ? v >= t.statistic
            : Math.abs(v) >= Math.abs(t.statistic);
      return (
        <div>
          <Curve
            low={low}
            high={high}
            density={density}
            marker={t.statistic}
            shade={showResults ? shade : undefined}
          />
          <p className="inference-caption">
            Null distribution in {m.knownSigma ? "z" : "t"} units. The dashed line marks the
            observed statistic.
          </p>
        </div>
      );
    }
    case "power": {
      const p = inferencePower(m),
        shift = m.effect / p.se,
        low = -4,
        high = Math.max(4, shift + 4);
      return (
        <div>
          <Curve
            low={low}
            high={high}
            density={normalDensity}
            second={(v) => normalDensity(v - shift)}
            marker={p.critical}
            shade={showResults ? (v) => v >= p.critical : undefined}
          />
          <p className="inference-caption">
            Blue: null. Green: stated alternative. Dashed line: rejection threshold. Horizontal
            scale uses the null standard error.
          </p>
        </div>
      );
    }
    case "two_sample": {
      if (!showResults) return <SummarySpreads model={m} />;
      const w = inferenceWelch(m);
      return (
        <Intervals
          rows={[
            {
              mean: w.difference,
              lower: w.lower,
              upper: w.upper,
              label: "Second group − first group",
            },
          ]}
          target={0}
          reveal
          domain={commonIntervalDomain()}
        />
      );
    }
    case "paired":
      return showResults ? (
        <div>
          <Paired model={m} reveal />
          <p className="inference-caption">
            Differences: {inferencePaired(m).differences.map(n).join(", ")}
          </p>
        </div>
      ) : (
        <Paired model={m} reveal={false} />
      );
    case "multiple_tests":
      return (
        <Plot
          label={m.tests + " separate opportunities for a false rejection when all nulls are true."}
        >
          {range(m.tests).map((i) => (
            <g key={i}>
              <rect
                className="inference-test-tile"
                x={49 + (i % 10) * 39}
                y={31 + Math.floor(i / 10) * 44}
                width="31"
                height="31"
                rx="8"
              />
              <text
                className="inference-label"
                x={64.5 + (i % 10) * 39}
                y={51 + Math.floor(i / 10) * 44}
                textAnchor="middle"
              >
                {i + 1}
              </text>
            </g>
          ))}
          <text className="inference-muted" x="240" y="230" textAnchor="middle">
            Each test is another opportunity
          </text>
        </Plot>
      );
    case "bayes_table":
    case "allocation":
    case "test_outcomes":
      return null;
  }
}
