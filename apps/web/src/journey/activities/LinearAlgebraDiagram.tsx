import type { LinearAlgebraDiagram as Spec, LinearAlgebraModel } from "@discere/contracts";
import {
  linearAlgebraArrows,
  linearAlgebraGivens,
  linearAlgebraResult,
  linearApply,
  linearLeastSquares,
  linearMatrixProduct,
  linearNumber as n,
  linearRowReduction,
  linearSvd2,
  linearVectorLabel,
  type LinearMatrix,
} from "@discere/activity-engine";
import { RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

const rowIds = ["row-1", "row-2", "row-3"];
const columnIds = ["column-1", "column-2", "column-3", "column-4", "column-5", "column-6"];
function Matrix({
  values,
  label,
  augmented = false,
  focusRow,
  focusColumn,
}: {
  values: LinearMatrix;
  label: string;
  augmented?: boolean;
  focusRow?: number;
  focusColumn?: number;
}) {
  return (
    <div className="la-matrix">
      <span aria-hidden="true">{label}</span>
      <table>
        <caption className="sr-only">
          {label}: {values.length} rows, {values[0]!.length} columns
        </caption>
        <tbody>
          {values.map((row, i) => (
            <tr key={rowIds[i]}>
              {row.map((x, j) => (
                <td
                  key={columnIds[j]}
                  className={[
                    augmented && j === row.length - 1 ? "la-rhs" : "",
                    focusRow === i || focusColumn === j ? "la-focus" : "",
                  ].join(" ")}
                >
                  {n(x)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function GivenMatrices({ model: m, focus = 0 }: { model: LinearAlgebraModel; focus?: number }) {
  if (m.kind === "matrix")
    return (
      <div className="la-matrices">
        <Matrix
          values={m.matrix}
          label="A"
          {...(m.operation === "multiply" ? { focusRow: focus } : {})}
        />
        {m.second && <Matrix values={m.second} label="B" />}
        {m.vector && <Matrix values={m.vector.map((x) => [x])} label="v" />}
      </div>
    );
  if (m.kind === "system" || m.kind === "least_squares")
    return (
      <div className="la-matrices">
        <Matrix
          values={m.matrix.map((r, i) => [...r, m.rhs[i]!])}
          label="A | b"
          augmented
          focusRow={focus}
        />
      </div>
    );
  if (m.kind === "eigen")
    return (
      <div className="la-matrices">
        <Matrix values={m.matrix} label="A" />
        <Matrix values={m.vector.map((x) => [x])} label="v" />
      </div>
    );
  if (m.kind === "svd")
    return (
      <div className="la-matrices">
        <Matrix values={m.matrix} label="A" />
      </div>
    );
  return null;
}
function LeastSquaresDrawing({
  model: m,
  showResults,
}: {
  model: Extract<LinearAlgebraModel, { kind: "least_squares" }>;
  showResults: boolean;
}) {
  const id = useId(),
    coefficients = showResults ? linearLeastSquares(m.matrix, m.rhs) : null,
    predicted = coefficients ? linearApply(m.matrix, coefficients) : null;
  const values = [0, ...m.rhs, ...(predicted ?? [])],
    min = Math.min(...values),
    max = Math.max(...values),
    range = Math.max(2, max - min),
    X = (i: number) => 70 + (i * 260) / Math.max(1, m.rhs.length - 1),
    Y = (v: number) => 220 - ((v - min + range * 0.1) * 175) / (range * 1.2);
  return (
    <svg
      className="la-drawing la-fit-drawing"
      viewBox="0 0 400 270"
      role="img"
      aria-labelledby={id}
    >
      <title id={id}>
        Measurements b = {linearVectorLabel(m.rhs)}. Blue is measured.
        {showResults ? " Green is the fitted output." : ""}
      </title>
      <g className="la-axis">
        <path d="M50 30V220H350" />
      </g>
      {m.rhs.map((v, i) => (
        <g key={rowIds[i]}>
          <circle cx={X(i)} cy={Y(v)} r="5" fill="#80a2ff" />
          <text x={X(i)} y={Y(v) - 10} textAnchor="middle" fill="#adc6ff" fontSize="14">
            {n(v)}
          </text>
          <text x={X(i)} y="248" textAnchor="middle" fill="#b9c6d5" fontSize="13">
            Row {i + 1}
          </text>
          {predicted && (
            <g data-result="fit">
              <path className="la-guide" d={"M" + X(i) + " " + Y(v) + "V" + Y(predicted[i]!)} />
              <circle cx={X(i)} cy={Y(predicted[i]!)} r="5" fill="#50df8f" />
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
function squareMap(m: LinearAlgebraModel): LinearMatrix | null {
  if (m.kind === "svd" || m.kind === "eigen")
    return m.matrix.length === 2 && m.matrix[0]!.length === 2 ? m.matrix : null;
  if (m.kind === "matrix" && m.matrix.length === 2 && m.matrix[0]!.length === 2)
    return m.operation === "multiply"
      ? m.second?.length === 2 && m.second[0]!.length === 2
        ? linearMatrixProduct(m.matrix, m.second)
        : null
      : m.operation === "apply" || m.operation === "determinant"
        ? m.matrix
        : null;
  return null;
}
export function LinearAlgebraDrawing({
  model: m,
  models = [m],
  showResults = false,
  progress = 100,
  svdPhase = 3,
}: {
  model: LinearAlgebraModel;
  models?: LinearAlgebraModel[];
  showResults?: boolean;
  progress?: number;
  svdPhase?: number;
}) {
  const id = useId(),
    marker = useId();
  const arrows = linearAlgebraArrows(m, showResults),
    a = squareMap(m);
  let map: LinearMatrix | null = null;
  if (showResults && a) {
    if (m.kind === "svd") {
      const f = linearSvd2(a);
      map =
        svdPhase === 0
          ? [
              [1, 0],
              [0, 1],
            ]
          : svdPhase === 1
            ? f.vt
            : svdPhase === 2
              ? linearMatrixProduct(f.s, f.vt)
              : a;
    } else {
      const t = progress / 100;
      map = a.map((r, i) => r.map((x, j) => (1 - t) * (i === j ? 1 : 0) + t * x));
    }
  }
  const allArrows = models.flatMap((model) => linearAlgebraArrows(model, showResults));
  const maps = showResults
    ? models.map(squareMap).filter((x): x is LinearMatrix => x !== null)
    : [];
  const bound = Math.max(
    2,
    ...allArrows.flatMap((v) => v.vector.map(Math.abs)),
    ...maps.flatMap((a) => a.map((r) => Math.hypot(...r))),
  );
  const radius = 2 ** Math.ceil(Math.log2(bound * 1.18)),
    scale = 104 / radius,
    X = (v: number) => 200 + v * scale,
    Y = (v: number) => 135 - v * scale;
  const ticks = [-radius, -radius / 2, 0, radius / 2, radius];
  const points = Array.from({ length: 65 }, (_, i) => [
    Math.cos((i * Math.PI) / 32),
    Math.sin((i * Math.PI) / 32),
  ]);
  const curve = (p: number[][]) =>
    p.map((v, i) => (i ? "L" : "M") + X(v[0]!) + "," + Y(v[1]!)).join(" ");
  if (m.kind === "least_squares")
    return <LeastSquaresDrawing model={m} showResults={showResults} />;
  const hasPlot = arrows.length > 0 || a !== null;
  if (!hasPlot) return null;
  return (
    <svg className="la-drawing" viewBox="0 0 400 270" role="img" aria-labelledby={id}>
      <title id={id}>
        {linearAlgebraGivens(m)}.
        {showResults ? " Green shows the calculated output." : " Blue marks show given inputs."}
      </title>
      <defs>
        <marker
          id={marker}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10Z" fill="context-stroke" />
        </marker>
      </defs>
      {ticks.map((v) => (
        <g key={v} className={v === 0 ? "la-axis" : "la-grid"} data-scale="">
          <path d={"M" + X(v) + " 31V239M96 " + Y(v) + "H304"} />
          <text x={X(v)} y="259" textAnchor="middle">
            {n(v)}
          </text>
          {v !== 0 && (
            <text x="89" y={Y(v) + 5} textAnchor="end">
              {n(v)}
            </text>
          )}
        </g>
      ))}
      {showResults &&
        m.kind === "span" &&
        (linearAlgebraResult(m).value === 2 ? (
          <rect
            x="96"
            y="31"
            width="208"
            height="208"
            className="la-transformed"
            data-result="span"
          />
        ) : linearAlgebraResult(m).value === 1 ? (
          (() => {
            const v = m.vectors.find((v) => Math.hypot(...v) > 0)!,
              f = radius / Math.max(...v.map(Math.abs));
            return (
              <path
                className="la-transformed"
                data-result="span"
                d={"M" + X(-v[0] * f) + " " + Y(-v[1] * f) + "L" + X(v[0] * f) + " " + Y(v[1] * f)}
              />
            );
          })()
        ) : null)}
      {a && <path className="la-unit" d={curve(points)} />}
      {map && (
        <path
          className="la-transformed"
          data-result="transformation"
          d={curve(points.map((v) => linearApply(map!, v)))}
        />
      )}
      {map &&
        m.kind === "svd" &&
        [0, 1].map((column) => {
          const v = [map![0]![column]!, map![1]![column]!];
          return (
            <g
              key={columnIds[column]}
              className={"la-svd-axis la-svd-axis-" + column}
              data-result="svd-axis"
            >
              <title>Unit input direction {column + 1} through the current SVD factors</title>
              {Math.hypot(...v) > 0 ? (
                <path
                  d={"M200 135L" + X(v[0]!) + " " + Y(v[1]!)}
                  markerEnd={"url(#" + marker + ")"}
                />
              ) : (
                <circle cx="200" cy="135" r="4" />
              )}
              <text x={X(v[0]!) + 7} y={Y(v[1]!) + (v[1]! > 0 ? -12 : 20)}>
                {column ? "e₂" : "e₁"}
              </text>
            </g>
          );
        })}
      {showResults && m.kind === "projection" && (
        <path
          className="la-guide"
          d={
            "M" +
            X(m.v[0]) +
            " " +
            Y(m.v[1]) +
            "L" +
            X((linearAlgebraResult(m).value as number[])[0]!) +
            " " +
            Y((linearAlgebraResult(m).value as number[])[1]!)
          }
        />
      )}
      {arrows.map((arrow, i) => (
        <g
          key={arrow.label}
          className={arrow.result ? "la-output-arrow" : "la-input-arrow"}
          data-result={arrow.result ? "vector" : undefined}
        >
          {Math.hypot(...arrow.vector) > 0 ? (
            <path
              d={"M200 135L" + X(arrow.vector[0]) + " " + Y(arrow.vector[1])}
              markerEnd={"url(#" + marker + ")"}
            />
          ) : (
            <circle cx="200" cy="135" r="4" />
          )}
          <text x={X(arrow.vector[0]) + 7} y={Y(arrow.vector[1]) + (i % 2 ? 18 : -9)}>
            {arrow.label}
          </text>
        </g>
      ))}
      <text className="la-axis-name" x="317" y="140">
        x
      </text>
      <text className="la-axis-name" x="195" y="22">
        y
      </text>
    </svg>
  );
}
function Result({ model }: { model: LinearAlgebraModel }) {
  const result = linearAlgebraResult(model),
    v = result.value;
  return (
    <div className="la-results" aria-label="Linear algebra results">
      {v !== null && (
        <div className="la-result-value">
          <span>{result.label}</span>
          {Array.isArray(v) && Array.isArray(v[0]) ? (
            <Matrix values={v as LinearMatrix} label={result.label} />
          ) : (
            <strong>{Array.isArray(v) ? linearVectorLabel(v as number[]) : n(v as number)}</strong>
          )}
        </div>
      )}
      <p>{result.detail}</p>
    </div>
  );
}
export function LinearAlgebraGivenVisual({ model }: { model: LinearAlgebraModel }) {
  return (
    <div className="la-check">
      <GivenMatrices model={model} />
      <p className="la-givens">{linearAlgebraGivens(model)}</p>
      <LinearAlgebraDrawing model={model} />
    </div>
  );
}
export function LinearAlgebraDiagram({
  spec,
  showResults = false,
}: {
  spec: Spec;
  showResults?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showResults) {
      const pane = host.current?.closest<HTMLElement>(".stage-canvas");
      if (pane) pane.scrollTop = 0;
    }
  }, [showResults]);
  const [selected, setSelected] = useState(spec.initialCaseId),
    [progress, setProgress] = useState(100),
    [rowStep, setRowStep] = useState(0),
    [focus, setFocus] = useState(0),
    [svdPhase, setSvdPhase] = useState(3),
    id = useId();
  const current = spec.cases.find((c) => c.id === selected)!,
    model = current.model,
    initialLabel = spec.cases.find((c) => c.id === spec.initialCaseId)!.label;
  const steps =
    model.kind === "system" && showResults
      ? linearRowReduction(
          model.matrix.map((r, i) => [...r, model.rhs[i]!]),
          model.matrix[0]!.length,
        ).steps
      : [];
  const reset = () => {
    setProgress(100);
    setRowStep(0);
    setFocus(0);
    setSvdPhase(3);
  };
  const map = squareMap(model),
    rowCount = model.kind === "system" || model.kind === "matrix" ? model.matrix.length : 0;
  return (
    <div className="learning-diagram la-diagram" ref={host}>
      {spec.cases.length > 1 && (
        <p className="la-cases-purpose" id={id + "-cases"}>
          Questions use {initialLabel}. Switch to{" "}
          {spec.cases
            .filter((c) => c.id !== spec.initialCaseId)
            .map((c) => c.label)
            .join(" or ")}{" "}
          to see a contrasting case.
        </p>
      )}
      <div className="la-cases" role="group" aria-labelledby={id + "-cases"}>
        {spec.cases.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={selected === c.id}
            onClick={() => {
              setSelected(c.id);
              reset();
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      {!showResults && selected !== spec.initialCaseId && (
        <p className="la-givens">Answer for {initialLabel}.</p>
      )}
      <GivenMatrices model={model} focus={focus} />
      <p className="la-givens">{linearAlgebraGivens(model)}</p>
      <LinearAlgebraDrawing
        model={model}
        models={spec.cases.map((c) => c.model)}
        showResults={showResults}
        progress={progress}
        svdPhase={svdPhase}
      />
      {(model.kind === "system" || (model.kind === "matrix" && model.operation === "multiply")) &&
        rowCount > 1 && (
          <div className="la-focus-tools" role="group" aria-labelledby={id + "-rows"}>
            <span className="la-tools-label" id={id + "-rows"}>
              Highlight a row
            </span>
            {Array.from({ length: rowCount }, (_, i) => (
              <button
                key={rowIds[i]}
                type="button"
                aria-pressed={focus === i}
                onClick={() => setFocus(i)}
              >
                Row {i + 1}
              </button>
            ))}
          </div>
        )}
      {showResults && steps.length > 0 && (
        <div className="la-elimination">
          <Matrix values={steps[rowStep]!.matrix} label="Row reduction" augmented />
          <p aria-live="polite">{steps[rowStep]!.label}</p>
          <div className="la-tools">
            {rowStep > 0 && (
              <button type="button" onClick={() => setRowStep(rowStep - 1)}>
                Previous row operation
              </button>
            )}
            {rowStep + 1 < steps.length && (
              <button type="button" onClick={() => setRowStep(rowStep + 1)}>
                Next row operation
              </button>
            )}
            <button type="button" aria-label="Reset row operations" onClick={() => setRowStep(0)}>
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      {showResults && model.kind === "svd" && map && (
        <div className="la-svd-phases" role="group" aria-label="SVD transformation">
          {["Input", "Change input axes", "Stretch", "Change output axes"].map((label, i) => (
            <button
              key={label}
              type="button"
              aria-pressed={svdPhase === i}
              onClick={() => setSvdPhase(i)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {showResults && map && model.kind !== "svd" && (
        <div className="la-tools">
          <label htmlFor={id}>
            <span>
              Move from I to{" "}
              {model.kind === "matrix" && model.operation === "multiply" ? "A B" : "A"}{" "}
              <output>{progress}%</output>
            </span>
            <input
              id={id}
              type="range"
              aria-label={
                "Move from I to " +
                (model.kind === "matrix" && model.operation === "multiply" ? "A B" : "A")
              }
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.currentTarget.value))}
            />
          </label>
          <button type="button" aria-label="Reset transformation" onClick={() => setProgress(100)}>
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {showResults && model.kind === "svd" && (
        <p className="la-factor-shapes">
          A: {model.matrix.length} × {model.matrix[0]!.length} · U: {model.matrix.length} ×{" "}
          {model.matrix.length} · Σ: {model.matrix.length} × {model.matrix[0]!.length} · Vᵀ:{" "}
          {model.matrix[0]!.length} × {model.matrix[0]!.length}
        </p>
      )}
      {showResults && <Result model={model} />}
    </div>
  );
}
