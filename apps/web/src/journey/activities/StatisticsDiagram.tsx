import { enumerateOutcomes, summariseData } from "@discere/activity-engine";
import type { LearningDiagram } from "@discere/contracts";
import { RotateCcw } from "lucide-react";
import { useId, useState } from "react";

type StatisticsSpec = Extract<
  LearningDiagram,
  {
    type: "outcome_grid" | "data_distribution" | "sampling_population";
  }
>;
const display = (value: number) => Number(value.toFixed(4)).toString();

function Slider({
  label,
  min,
  max,
  value,
  step,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <label className="learning-diagram-control" htmlFor={id}>
      <span>
        {label} <output>{display(value)}</output>
      </span>
      <input
        id={id}
        type="range"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        step={step}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

function OutcomeGrid({
  spec,
  showResults,
}: {
  spec: Extract<StatisticsSpec, { type: "outcome_grid" }>;
  showResults: boolean;
}) {
  const [threshold, setThreshold] = useState(spec.threshold.value);
  const result = enumerateOutcomes(spec, threshold);
  const labels = {
    sum_at_least: "Sum at least",
    sum_equals: "Sum equals",
    both_at_most: "Both rolls at most",
    second_at_most: "Second roll at most",
  };
  const label = labels[spec.event];
  const cell = 360 / spec.sides;
  const rows = Array.from({ length: spec.sides }, (_, index) => index + 1);
  return (
    <div className="learning-diagram statistics-diagram">
      <svg
        viewBox="0 0 470 450"
        role="img"
        aria-label={
          showResults
            ? label +
              " " +
              threshold +
              ": " +
              result.favourable +
              " of " +
              result.total +
              " eligible outcomes"
            : "Ordered pairs for two independent dice; green dots mark " +
              label.toLowerCase() +
              " " +
              threshold
        }
      >
        <text x="248" y="22" textAnchor="middle" className="stat-axis-label">
          Second roll
        </text>
        <text
          x="16"
          y="240"
          textAnchor="middle"
          transform="rotate(-90 16 240)"
          className="stat-axis-label"
        >
          First roll
        </text>
        {rows.map((number) => (
          <g key={number} data-scale="">
            <text x={60 + (number - 0.5) * cell} y="49" textAnchor="middle" fontSize="16">
              {number}
            </text>
            <text x="42" y={60 + (number - 0.5) * cell + 5} textAnchor="middle" fontSize="16">
              {number}
            </text>
          </g>
        ))}
        {result.cells.map((outcome) => {
          const matches = outcome.eligible && outcome.matches;
          const x = 60 + (outcome.second - 1) * cell;
          const y = 60 + (outcome.first - 1) * cell;
          return (
            <g key={outcome.first + ":" + outcome.second} opacity={outcome.eligible ? 1 : 0.23}>
              <rect
                className={"stat-outcome-cell" + (matches ? " is-match" : "")}
                x={x + 3}
                y={y + 3}
                width={cell - 6}
                height={cell - 6}
                rx="7"
              />
              <text
                x={x + cell / 2}
                y={y + cell / 2 + 5}
                textAnchor="middle"
                fontSize={spec.sides > 6 ? 12 : 15}
                className={matches ? "stat-outcome-label is-match" : "stat-outcome-label"}
              >
                {outcome.first},{outcome.second}
              </text>
              {matches ? (
                <circle cx={x + cell - 12} cy={y + 12} r="3" className="stat-accent-fill" />
              ) : null}
            </g>
          );
        })}
      </svg>
      {showResults ? (
        <div className="stat-probability" aria-live="polite" aria-atomic="true">
          <strong>
            {result.favourable}
            <span> / {result.total}</span>
          </strong>
          <span>{display(result.probability * 100)}%</span>
        </div>
      ) : null}
      <p className="stat-caption">
        Two fair, independent {spec.sides}-sided dice. Green dots mark matching outcomes.
        {spec.givenFirstAtMost !== undefined
          ? " Only first rolls at most " + spec.givenFirstAtMost + " remain possible."
          : ""}
      </p>
      <Slider label={label} {...spec.threshold} value={threshold} onChange={setThreshold} />
      <details className="stat-equivalent">
        <summary>Read the outcomes</summary>
        <table>
          <caption>
            {showResults
              ? label +
                " " +
                threshold +
                "; " +
                result.favourable +
                " matching outcomes among " +
                result.total +
                " eligible outcomes."
              : label + " " + threshold}
          </caption>
          <thead>
            <tr>
              <th scope="col">First</th>
              <th scope="col">Second</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {result.cells.map((outcome) => (
              <tr key={outcome.first + ":" + outcome.second}>
                <td>{outcome.first}</td>
                <td>{outcome.second}</td>
                <td>
                  {!outcome.eligible
                    ? "Excluded by condition"
                    : outcome.matches
                      ? "Matches"
                      : "Other"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function Distribution({
  spec,
  showResults,
}: {
  spec: Extract<StatisticsSpec, { type: "data_distribution" }>;
  showResults: boolean;
}) {
  const [value, setValue] = useState(spec.control.value);
  const observations = spec.values.map((original, index) => ({
    id: "observation-" + index,
    index,
    value: index === spec.editableIndex ? value : original,
  }));
  const values = observations.map((observation) => observation.value);
  const summary = summariseData(values);
  const x = (observation: number) =>
    40 + (520 * (observation - spec.control.min)) / (spec.control.max - spec.control.min);
  const ticks = Array.from(
    { length: 7 },
    (_, index) => spec.control.min + ((spec.control.max - spec.control.min) * index) / 6,
  );
  return (
    <div className="learning-diagram statistics-diagram">
      <svg
        className="stat-distribution"
        viewBox="0 0 600 285"
        role="img"
        aria-label={
          "Values " +
          values.join(", ") +
          (showResults
            ? "; mean " +
              display(summary.mean) +
              "; median " +
              display(summary.median) +
              "; range " +
              display(summary.range)
            : "")
        }
      >
        {ticks.map((tick) => (
          <g key={tick} data-scale="">
            <path d={"M " + x(tick) + " 48 V 229"} className="stat-grid" />
            <text x={x(tick)} y="252" textAnchor="middle" fontSize="16">
              {display(tick)}
            </text>
          </g>
        ))}
        <path d="M 40 229 H 560" className="stat-axis" strokeWidth="2" />
        {showResults ? (
          <>
            <line
              x1={x(summary.mean)}
              x2={x(summary.mean)}
              y1="40"
              y2="229"
              className="stat-marker stat-mean"
              strokeWidth="2"
            />
            <line
              className="stat-marker stat-median"
              x1={x(summary.median)}
              x2={x(summary.median)}
              y1="58"
              y2="229"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
          </>
        ) : null}
        {observations.map((observation) => {
          const stack = values
            .slice(0, observation.index)
            .filter((item) => item === observation.value).length;
          const count = values.filter((item) => item === observation.value).length;
          const gap = Math.min(22, 156 / Math.max(1, count - 1));
          return (
            <circle
              key={observation.id}
              cx={x(observation.value)}
              cy={208 - stack * gap}
              r={Math.min(9, gap / 2 - 1)}
              className={
                observation.index === spec.editableIndex
                  ? "stat-observation is-editable"
                  : "stat-observation"
              }
              strokeWidth="2"
            />
          );
        })}
      </svg>
      {showResults ? (
        <dl className="stat-measures" aria-live="polite" aria-atomic="true">
          <div>
            <dt>Mean</dt>
            <dd>{display(summary.mean)}</dd>
          </div>
          <div>
            <dt>Median</dt>
            <dd>{display(summary.median)}</dd>
          </div>
          <div>
            <dt>Range</dt>
            <dd>{display(summary.range)}</dd>
          </div>
          {spec.showSpread ? (
            <div>
              <dt>Population SD</dt>
              <dd>{display(summary.populationStandardDeviation)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <p className="stat-data">Values: {values.join(", ")}</p>
      <p className="stat-caption">
        {showResults
          ? "The solid line marks the mean; the dashed line marks the median."
          : "Each dot is one observation. Move the highlighted value and compare the distribution."}
        {spec.showSpread
          ? " These observations are the whole teaching population; variance divides by " +
            summary.count +
            "."
          : ""}
      </p>
      <Slider
        label={"Observation " + (spec.editableIndex + 1)}
        {...spec.control}
        value={value}
        onChange={setValue}
      />
      <button
        className="button button-quiet stat-restore"
        type="button"
        onClick={() => setValue(spec.control.value)}
      >
        <RotateCcw size={14} aria-hidden="true" /> Restore values
      </button>
    </div>
  );
}

function Sampling({
  spec,
  showResults,
}: {
  spec: Extract<StatisticsSpec, { type: "sampling_population" }>;
  showResults: boolean;
}) {
  const [sampleId, setSampleId] = useState(spec.initialSampleId);
  const sample = spec.samples.find((item) => item.id === sampleId)!;
  const selected = new Set(sample.indices);
  const population = spec.groups.flatMap((group) =>
    Array.from({ length: group.count }, () => group.value),
  );
  const sampleMean = summariseData(sample.indices.map((index) => population[index]!)).mean;
  const populationMean = summariseData(population).mean;
  const maxCount = Math.max(...spec.groups.map((group) => group.count));
  let offset = 0;
  return (
    <div className="learning-diagram statistics-diagram">
      <div className="stat-sample-controls" role="group" aria-label="Choose a sample">
        {spec.samples.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={item.id === sampleId}
            onClick={() => setSampleId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <svg
        viewBox={"0 0 600 " + (80 * spec.groups.length + 28)}
        role="img"
        aria-label={
          sample.label +
          ": " +
          sample.indices.length +
          (showResults ? " of " + population.length + " members" : " members selected") +
          (showResults
            ? "; sample mean " +
              display(sampleMean) +
              "; population mean " +
              display(populationMean)
            : "")
        }
      >
        {spec.groups.map((group, groupIndex) => {
          const start = offset;
          offset += group.count;
          return (
            <g key={group.label}>
              <text x="30" y={groupIndex * 80 + 20} fontSize="17">
                {group.label} · value {group.value}
              </text>
              {Array.from({ length: group.count }, (_, index) => ({
                id: group.label + "-" + index,
                index,
              })).map((member) => {
                const included = selected.has(start + member.index);
                const cx = 45 + member.index * (510 / Math.max(1, maxCount - 1));
                const cy = groupIndex * 80 + 51;
                return (
                  <g key={member.id}>
                    <circle
                      className={included ? "stat-member is-included" : "stat-member"}
                      cx={cx}
                      cy={cy}
                      r="13"
                      strokeWidth="2"
                    />
                    {included ? (
                      <path
                        d={"M " + (cx - 5) + " " + cy + " l 3 3 7 -7"}
                        fill="none"
                        className="stat-check"
                        strokeWidth="2"
                      />
                    ) : null}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {showResults ? (
        <dl className="stat-measures" aria-live="polite" aria-atomic="true">
          <div>
            <dt>Sample mean</dt>
            <dd>{display(sampleMean)}</dd>
          </div>
          <div>
            <dt>Population mean</dt>
            <dd>{display(populationMean)}</dd>
          </div>
          <div>
            <dt>Selected</dt>
            <dd>
              {sample.indices.length} / {population.length}
            </dd>
          </div>
        </dl>
      ) : null}
      <p className="stat-caption">
        Checks mark selected members. These fixed examples compare selection methods; they are not
        random draws.
      </p>
      <details className="stat-equivalent">
        <summary>Read the sample</summary>
        <table>
          <caption>{sample.label}</caption>
          <thead>
            <tr>
              <th scope="col">Group</th>
              <th scope="col">Value</th>
              <th scope="col">Population</th>
              <th scope="col">Selected</th>
            </tr>
          </thead>
          <tbody>
            {spec.groups.map((group, index) => {
              const start = spec.groups.slice(0, index).reduce((sum, item) => sum + item.count, 0);
              const count = sample.indices.filter(
                (member) => member >= start && member < start + group.count,
              ).length;
              return (
                <tr key={group.label}>
                  <th scope="row">{group.label}</th>
                  <td>{group.value}</td>
                  <td>{group.count}</td>
                  <td>{count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export function StatisticsDiagram({
  spec,
  showResults = true,
}: {
  spec: StatisticsSpec;
  showResults?: boolean;
}) {
  if (spec.type === "outcome_grid") return <OutcomeGrid spec={spec} showResults={showResults} />;
  if (spec.type === "data_distribution")
    return <Distribution spec={spec} showResults={showResults} />;
  return <Sampling spec={spec} showResults={showResults} />;
}
