import type { InferenceDiagram as Spec, InferenceModel } from "@discere/contracts";
import { useEffect, useId, useRef, useState } from "react";
import {
  binomialMass,
  inferenceCoverage,
  inferenceGivens,
  inferenceNumber as n,
  inferencePercent,
  inferenceResult,
  inferenceSampling,
  poissonMass,
} from "@discere/activity-engine";
import { InferenceDrawing } from "./InferencePlots.js";
import "../../styles/inference.css";

function GivenTable({
  model: m,
  condition = false,
}: {
  model: InferenceModel;
  condition?: boolean;
}) {
  if (m.kind === "bayes_table")
    return (
      <div className="inference-table-wrap">
        <table className="inference-table">
          <caption>Counts in the two groups</caption>
          <thead>
            <tr>
              <th scope="col">Group</th>
              {m.columnLabels.map((label, j) => (
                <th
                  className={condition && j === 0 ? "is-conditioned" : ""}
                  key={label}
                  scope="col"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.rowLabels.map((label, i) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {m.counts[i]!.map((count, j) => (
                  <td
                    key={m.columnLabels[j]}
                    className={condition ? (j === 0 ? "is-conditioned" : "is-outside") : ""}
                  >
                    {count}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {condition && (
          <p className="inference-caption">Restrict attention to the {m.columnLabels[0]} column.</p>
        )}
      </div>
    );
  if (m.kind === "allocation") {
    const blocks = [...new Set(m.units.map((u) => u.block))];
    return (
      <div className="inference-table-wrap">
        <table className="inference-table inference-allocation">
          <caption>Allocation and observed outcomes</caption>
          <thead>
            <tr>
              <th scope="col">Block</th>
              <th scope="col">Group A</th>
              <th scope="col">Group B</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => (
              <tr key={block}>
                <th scope="row">{block}</th>
                {(["A", "B"] as const).map((arm) => {
                  const units = m.units.filter((u) => u.block === block && u.arm === arm);
                  return (
                    <td key={arm}>
                      {units.length ? (
                        units.map((u) => (
                          <span className="inference-unit" key={u.id}>
                            <span>{u.id}</span>
                            <strong>{n(u.value)}</strong>
                          </span>
                        ))
                      ) : (
                        <span className="inference-caption">No units</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (m.kind === "test_outcomes") {
    const rows = [
      {
        label: "Null is true",
        total: m.nullRuns,
        error: m.falseRejections,
        errorLabel: "False rejections",
        other: "Correct non-rejections",
      },
      {
        label: "Stated effect is real",
        total: m.alternativeRuns,
        error: m.missedEffects,
        errorLabel: "Missed effects",
        other: "Detected effects",
      },
    ];
    return (
      <div className="inference-outcomes">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="inference-outcome-title">
              <strong>{row.label}</strong>
              <span>{row.total} runs</span>
            </div>
            <div className="inference-outcome-bar" aria-hidden="true">
              <span className="is-error" style={{ width: (100 * row.error) / row.total + "%" }} />
              <span
                className="is-other"
                style={{ width: (100 * (row.total - row.error)) / row.total + "%" }}
              />
            </div>
            <div className="inference-outcome-key">
              <span>
                {row.errorLabel}: {row.error}
              </span>
              <span>
                {row.other}: {row.total - row.error}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
function Result({ model }: { model: InferenceModel }) {
  const result = inferenceResult(model);
  return (
    <div className="inference-results" aria-label="Statistics results">
      <dl>
        {result.measures.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <p>{result.detail}</p>
    </div>
  );
}

export function InferenceGivenVisual({ model }: { model: InferenceModel }) {
  return (
    <div className="inference-diagram inference-check">
      <p className="inference-givens">{inferenceGivens(model)}</p>
      <GivenTable model={model} />
      <InferenceDrawing model={model} showResults={false} />
    </div>
  );
}

export function InferenceDiagram({
  spec,
  showResults = false,
}: {
  spec: Spec;
  showResults?: boolean;
}) {
  const [selected, setSelected] = useState(spec.initialCaseId);
  const [condition, setCondition] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [visibleIntervals, setVisibleIntervals] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const current =
    spec.cases.find((c) => c.id === selected) ??
    spec.cases.find((c) => c.id === spec.initialCaseId)!;
  const model = current.model,
    id = useId(),
    host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showResults) {
      const pane = host.current?.closest<HTMLElement>(".stage-canvas");
      if (pane) pane.scrollTop = 0;
    }
  }, [showResults]);
  const sampling = model.kind === "sampling_means" && showResults ? inferenceSampling(model) : null;
  const displayedSample =
    sampling && model.kind === "sampling_means"
      ? Array.from(
          { length: model.sampleSize },
          (_, i) =>
            model.population[
              Math.floor(sampleIndex / model.population.length ** (model.sampleSize - i - 1)) %
                model.population.length
            ]!,
        )
      : null;
  const maxCount = model.kind === "binomial" ? model.trials : model.kind === "poisson" ? 40 : 0;
  const inspectedCount = Math.min(count, maxCount);
  const mass =
    model.kind === "binomial"
      ? binomialMass(model.trials, model.probability, inspectedCount)
      : model.kind === "poisson"
        ? poissonMass(model.rate * model.duration, inspectedCount)
        : null;
  const reset = () => {
    setCondition(false);
    setSampleIndex(0);
    setVisibleIntervals(null);
    setCount(0);
  };
  return (
    <div className="learning-diagram inference-diagram" ref={host}>
      <div className="inference-cases" role="group" aria-label="Compare examples">
        {spec.cases.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={current.id === c.id}
            onClick={() => {
              setSelected(c.id);
              reset();
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      {!showResults && current.id !== spec.initialCaseId && (
        <p className="inference-answer-context">
          Answer for {spec.cases.find((c) => c.id === spec.initialCaseId)!.label}.
        </p>
      )}
      <p className="inference-givens">{inferenceGivens(model)}</p>
      {model.kind === "bayes_table" && (
        <div className="inference-tools" role="group" aria-label="Condition on evidence">
          <button type="button" aria-pressed={!condition} onClick={() => setCondition(false)}>
            Whole table
          </button>
          <button type="button" aria-pressed={condition} onClick={() => setCondition(true)}>
            Only {model.columnLabels[0]}
          </button>
        </div>
      )}
      <GivenTable model={model} condition={condition} />
      <InferenceDrawing
        model={model}
        showResults={showResults}
        visibleIntervals={visibleIntervals ?? undefined}
        models={spec.cases.map((c) => c.model)}
      />
      {showResults && model.kind === "interval_coverage" && (
        <div className="inference-tools">
          <label htmlFor={id + "-coverage"}>
            <span>
              Intervals shown{" "}
              <output>
                {visibleIntervals ?? model.intervals} / {model.intervals}
              </output>
            </span>
            <input
              id={id + "-coverage"}
              type="range"
              aria-label="Intervals shown"
              min="1"
              max={model.intervals}
              value={visibleIntervals ?? model.intervals}
              onChange={(e) => setVisibleIntervals(Number(e.currentTarget.value))}
            />
          </label>
          <p className="inference-caption">
            Solid green: covers the fixed mean. Dashed amber: misses it.
          </p>
          <span className="sr-only">
            {inferenceCoverage(model)
              .slice(0, visibleIntervals ?? model.intervals)
              .map(
                (c) =>
                  "Interval " +
                  (c.index + 1) +
                  ": " +
                  n(c.lower) +
                  " to " +
                  n(c.upper) +
                  (c.covers ? ", covers the mean." : ", misses the mean."),
              )
              .join(" ")}
          </span>
        </div>
      )}
      {showResults && sampling && displayedSample && (
        <div className="inference-sampling-trace">
          <p aria-live="polite">
            Ordered sample {sampleIndex + 1} of {sampling.means.length}:{" "}
            <strong>{displayedSample.map(n).join(", ")}</strong>
            {" · "}Mean <strong>{n(sampling.means[sampleIndex]!)}</strong>
          </p>
          <div className="inference-tools">
            <button
              type="button"
              disabled={sampleIndex === 0}
              onClick={() => setSampleIndex(sampleIndex - 1)}
            >
              Previous sample
            </button>
            <button
              type="button"
              disabled={sampleIndex + 1 >= sampling.means.length}
              onClick={() => setSampleIndex(sampleIndex + 1)}
            >
              Next sample
            </button>
            <button type="button" disabled={sampleIndex === 0} onClick={() => setSampleIndex(0)}>
              Replay
            </button>
          </div>
        </div>
      )}
      {showResults && mass !== null && (
        <div className="inference-tools">
          <label htmlFor={id + "-count"}>
            <span>
              Inspect count <output>{inspectedCount}</output>
            </span>
            <input
              id={id + "-count"}
              type="range"
              aria-label="Inspect count"
              min="0"
              max={maxCount}
              step="1"
              value={inspectedCount}
              onChange={(e) => setCount(Number(e.currentTarget.value))}
            />
          </label>
          <p aria-live="polite" className="inference-caption">
            P(count = {inspectedCount}) = {inferencePercent(mass)}
          </p>
        </div>
      )}
      {showResults && <Result model={model} />}
    </div>
  );
}
