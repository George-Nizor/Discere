import type { CalculusDiagram as Spec, CalculusModel } from "@discere/contracts";
import {
  calculusWindow,
  calculusGivens,
  calculusResults,
  polynomialValue as value,
  derivativeCoefficients,
  primitiveCoefficients,
  calcNumber as n,
} from "@discere/activity-engine";
import { RotateCcw } from "lucide-react";
import { useId, useState } from "react";
function axisTicks(low: number, high: number): number[] {
  const rough = (high - low) / 4,
    power = 10 ** Math.floor(Math.log10(rough)),
    fraction = rough / power;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
  const first = Math.ceil(low / step) * step,
    count = Math.floor((high - first) / step) + 1;
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    Number((first + i * step).toPrecision(10)),
  );
}
export function CalculusDrawing({
  model: m,
  models = [m],
  approach = 1,
}: {
  model: CalculusModel;
  models?: CalculusModel[];
  approach?: number;
}) {
  const id = useId(),
    clip = useId(),
    windows = models.map(calculusWindow);
  const low = Math.min(...windows.map((w) => w[0])),
    high = Math.max(...windows.map((w) => w[1]));
  const xs = Array.from({ length: 161 }, (_, i) => low + ((high - low) * i) / 160);
  const samples = models.flatMap((model) =>
    model.kind === "jump"
      ? [model.left, model.right]
      : xs.flatMap((x) =>
          model.kind === "primitive"
            ? [
                value(model.coefficients, x),
                value(primitiveCoefficients(model.coefficients, -5), x),
                value(primitiveCoefficients(model.coefficients, 5), x),
              ]
            : [
                value(model.coefficients, x),
                ...(model.kind === "limit" && model.pointValue !== undefined
                  ? [model.pointValue]
                  : []),
              ],
        ),
  );
  const min = Math.min(0, ...samples),
    max = Math.max(1, ...samples),
    pad = (max - min) * 0.1;
  const bottom = min - pad,
    top = max + pad,
    X = (x: number) => 58 + ((x - low) / (high - low)) * 452,
    Y = (y: number) => 272 - ((y - bottom) / (top - bottom)) * 232;
  const y = (x: number) =>
    m.kind === "jump" ? (x < m.at ? m.left : m.right) : value(m.coefficients, x);
  const line = (f: (x: number) => number, a = low, b = high) =>
    Array.from({ length: 161 }, (_, i) => {
      const x = a + ((b - a) * i) / 160;
      return (i ? "L" : "M") + X(x) + "," + Y(f(x));
    }).join(" ");
  const zero = Y(0);
  const xTicks = axisTicks(low, high),
    yTicks = axisTicks(bottom, top);
  let overlay: React.ReactNode = null;
  if (m.kind === "secant" || m.kind === "tangent") {
    const a = m.at,
      b = a + (m.kind === "secant" ? m.span : 0);
    const slope =
      m.kind === "secant"
        ? (y(b) - y(a)) / m.span
        : value(derivativeCoefficients(m.coefficients), a);
    overlay = (
      <>
        <path className="calc-tangent" d={line((x) => y(a) + slope * (x - a))} />
        <circle className="calc-point" cx={X(a)} cy={Y(y(a))} r="5" />
        {m.kind === "secant" && <circle className="calc-point" cx={X(b)} cy={Y(y(b))} r="5" />}
      </>
    );
  } else if (m.kind === "limit" || m.kind === "jump") {
    overlay = (
      <>
        {[-1, 1].map((side) => (
          <circle
            key={side}
            className="calc-point"
            cx={X(m.at + side * approach)}
            cy={Y(y(m.at + side * approach))}
            r="5"
          />
        ))}
        {m.kind === "limit" && m.hole && (
          <>
            <circle className="calc-hole" cx={X(m.at)} cy={Y(y(m.at))} r="6" />
            {m.pointValue !== undefined && (
              <circle className="calc-point" cx={X(m.at)} cy={Y(m.pointValue)} r="5" />
            )}
          </>
        )}
        {m.kind === "jump" && (
          <>
            <circle className="calc-hole" cx={X(m.at)} cy={Y(m.left)} r="6" />
            <circle className="calc-point" cx={X(m.at)} cy={Y(m.right)} r="5" />
          </>
        )}
      </>
    );
  } else if (m.kind === "primitive") {
    overlay = (
      <path
        className="calc-tangent"
        d={line((x) => value(primitiveCoefficients(m.coefficients, m.constant), x))}
      />
    );
  } else if (m.kind === "area") {
    if (m.display === "rectangles") {
      const width = (m.to - m.from) / m.rectangles,
        offset = m.method === "left" ? 0 : m.method === "right" ? 1 : 0.5;
      overlay = (
        <>
          {Array.from({ length: m.rectangles }, (_, i) => m.from + i * width).map((x) => {
            const h = y(x + offset * width);
            return (
              <rect
                key={x}
                className={h >= 0 ? "calc-positive" : "calc-negative"}
                x={X(x)}
                y={Math.min(Y(h), zero)}
                width={X(x + width) - X(x)}
                height={Math.abs(Y(h) - zero)}
              />
            );
          })}
        </>
      );
    } else {
      // Thin signed strips avoid filling a zero crossing with the wrong sign.
      const width = (m.to - m.from) / 160;
      overlay = (
        <>
          {Array.from({ length: 160 }, (_, i) => m.from + i * width).map((x) => {
            const h = y(x + width / 2);
            return (
              <rect
                key={x}
                className={h >= 0 ? "calc-fill-positive" : "calc-fill-negative"}
                x={X(x)}
                y={Math.min(Y(h), zero)}
                width={X(x + width) - X(x) + 0.1}
                height={Math.abs(Y(h) - zero)}
              />
            );
          })}
        </>
      );
    }
  }
  return (
    <svg className="calculus-drawing" viewBox="0 0 560 310" role="img" aria-labelledby={id}>
      <title id={id}>
        {calculusGivens(m)}. Blue curve is f; gold line is{" "}
        {m.kind === "primitive" ? "an antiderivative" : "the slope line"}. Green shading is
        positive; orange shading is negative.
      </title>
      <defs>
        <clipPath id={clip}>
          <rect x="58" y="40" width="452" height="232" />
        </clipPath>
      </defs>
      {xTicks.map((x) => (
        <g key={x} className="calc-grid" data-scale="">
          <path d={"M" + X(x) + " 40V272"} />
          <text x={X(x)} y="296" textAnchor="middle">
            {n(x)}
          </text>
        </g>
      ))}
      {yTicks.map((y) => (
        <g key={y} className="calc-grid" data-scale="">
          <path d={"M58 " + Y(y) + "H510"} />
          <text x="49" y={Y(y) + 4} textAnchor="end">
            {n(y)}
          </text>
        </g>
      ))}
      <g clipPath={"url(#" + clip + ")"}>
        <path className="calc-axis" d={"M58 " + zero + "H510 M" + X(0) + " 40V272"} />
        {m.kind === "area" && overlay}
        {m.kind === "jump" ? (
          <>
            <path className="calc-curve" d={"M58 " + Y(m.left) + "H" + X(m.at)} />
            <path className="calc-curve" d={"M" + X(m.at) + " " + Y(m.right) + "H510"} />
          </>
        ) : (
          <path className="calc-curve" d={line(y)} />
        )}
        {m.kind !== "area" && overlay}
      </g>
      <text className="calc-axis-label" x="529" y={Math.min(275, Math.max(48, zero - 8))}>
        x
      </text>
      <text className="calc-axis-label" x="59" y="25">
        y
      </text>
    </svg>
  );
}
export function CalculusGivenVisual({ model }: { model: CalculusModel }) {
  return (
    <div className="calculus-check">
      <p className="calc-givens">{calculusGivens(model)}</p>
      <CalculusDrawing model={model} />
    </div>
  );
}
export function CalculusDiagram({
  spec,
  showResults = false,
}: {
  spec: Spec;
  showResults?: boolean;
}) {
  const [selected, setSelected] = useState(spec.initialCaseId),
    [position, setPosition] = useState(0),
    id = useId();
  const current = spec.cases.find((c) => c.id === selected)!,
    base = current.model;
  let model: CalculusModel = base,
    approach = 10 ** (-position / 25),
    label = "Approach the point",
    display = n(approach),
    min = 0,
    max = 100,
    step = 1;
  if (base.kind === "secant") {
    model = { ...base, span: base.span * (1 - position / 105) };
    label = "Shrink the interval";
    display = "h = " + n(model.span);
  }
  if (base.kind === "tangent") {
    model = { ...base, at: base.at + position / 50 };
    min = -50;
    max = 50;
    label = "Move the tangent";
    display = "x = " + n(model.at);
  }
  if (base.kind === "primitive") {
    model = { ...base, constant: base.constant + position };
    min = -5 - base.constant;
    max = 5 - base.constant;
    label = "Move the constant";
    display = "C = " + n(model.constant);
  }
  if (base.kind === "area" && base.display === "rectangles") {
    model = { ...base, rectangles: base.rectangles + position };
    min = 1 - base.rectangles;
    max = 24 - base.rectangles;
    label = "Number of rectangles";
    display = String(model.rectangles);
  }
  if (base.kind === "area" && base.display === "integral") {
    model = { ...base, to: base.from + ((base.to - base.from) * (100 - position)) / 100 };
    label = "Shorten the interval";
    max = 95;
    display = "right bound = " + n(model.to);
  }
  return (
    <div className="learning-diagram calculus-diagram">
      <div className="calc-cases" role="group" aria-label="Compare graphs">
        {spec.cases.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={selected === c.id}
            onClick={() => {
              setSelected(c.id);
              setPosition(0);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="calc-givens">{calculusGivens(base)}</p>
      <CalculusDrawing model={model} models={spec.cases.map((c) => c.model)} approach={approach} />
      <div className="calc-tools">
        <label htmlFor={id}>
          <span>
            {label} <output>{display}</output>
          </span>
          <input
            id={id}
            type="range"
            aria-label={label}
            min={min}
            max={max}
            step={step}
            value={position}
            onChange={(e) => setPosition(Number(e.currentTarget.value))}
          />
        </label>
        <button type="button" aria-label="Reset graph" onClick={() => setPosition(0)}>
          <RotateCcw aria-hidden="true" size={18} />
        </button>
      </div>
      <p className="calc-legend">
        {base.kind === "primitive"
          ? "Blue: rate f · Gold: an antiderivative F"
          : base.kind === "area"
            ? (base.display === "rectangles" ? base.method + " endpoints · " : "") +
              "Green: positive · Orange: negative"
            : base.kind === "secant"
              ? "Blue: function · Gold: secant"
              : base.kind === "tangent"
                ? "Blue: function · Gold: tangent"
                : "Move the two points closer from both sides."}
      </p>
      {showResults && (
        <div className="calc-results" aria-label="Graph results">
          {calculusResults(model).map((result) => (
            <p key={result}>{result}</p>
          ))}
        </div>
      )}
    </div>
  );
}
