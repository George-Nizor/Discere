import {
  type ProgramResult,
  runTeachingProgram,
  traceSearch,
  truthValue,
} from "@discere/activity-engine";
import type { LearningDiagram as Diagram } from "@discere/contracts";
import { useId, useState } from "react";
import { BiologyDiagram } from "./BiologyDiagram.js";
import { CalculusDiagram } from "./CalculusDiagram.js";
import { ChemistryDiagram } from "./ChemistryDiagram.js";
import { GeometryDiagram } from "./GeometryDiagram.js";
import { InferenceDiagram } from "./InferenceDiagram.js";
import { LinearAlgebraDiagram } from "./LinearAlgebraDiagram.js";
import { MechanicsDiagram } from "./MechanicsDiagram.js";
import { EngineeringDiagram } from "./EngineeringDiagram.js";
import { EconomicsDiagram } from "./EconomicsDiagram.js";
import { PhilosophyDiagram } from "./PhilosophyDiagram.js";
import { LanguageDiagram } from "./LanguageDiagram.js";
import { AstronomyDiagram } from "./AstronomyDiagram.js";
import { PsychologyDiagram } from "./PsychologyDiagram.js";
import { PythonDiagram } from "./PythonDiagram.js";
import { QueryDiagram } from "./QueryDiagram.js";
import { StatisticsDiagram } from "./StatisticsDiagram.js";

function format(value: number): string {
  return Number(value.toFixed(4)).toString();
}
function Control({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean | undefined;
}) {
  const id = useId();
  return (
    <label className="learning-diagram-control" htmlFor={id}>
      <span>
        {label} <output>{format(value)}</output>
      </span>
      <input
        id={id}
        type="range"
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

interface CandidateProps {
  answerText?: string | undefined;
  onAnswerChange?: ((value: number) => void) | undefined;
  answerLocked?: boolean | undefined;
}
function candidateNumber(text: string | undefined): number | null {
  if (!text?.trim()) return null;
  const parts = text.trim().replaceAll("−", "-").split("/");
  if (parts.length > 2 || parts.some((part) => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(part.trim())))
    return null;
  const value = Number(parts[0]) / (parts[1] === undefined ? 1 : Number(parts[1]));
  return Number.isFinite(value) ? value : null;
}
/** Theme-aware fills: the diagrams draw with tokens, so no colour is invisible in the dark theme. */
const FILL = {
  panel: { fill: "var(--canvas-sunken)" },
  given: { fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1.5 },
  line: { stroke: "var(--line-strong)" },
  ink: { fill: "var(--ink)" },
  inkStroke: { stroke: "var(--ink)" },
  muted: { fill: "var(--muted)" },
  result: { fill: "var(--correct)" },
} as const;

function NumberMachine({
  spec,
  showResults,
  answerText,
  onAnswerChange,
  answerLocked,
}: {
  spec: Extract<Diagram, { type: "number_machine" }>;
  showResults: boolean;
} & CandidateProps) {
  const [explored, setInput] = useState(spec.input.value);
  const input = (spec.bindAnswer ? candidateNumber(answerText) : null) ?? explored;
  const letter = spec.variable ?? "x";
  let result = input;
  const symbols = { add: "+", subtract: "−", multiply: "×", divide: "÷" };
  const stages = spec.operations.map((operation, index) => {
    result =
      operation.operator === "add"
        ? result + operation.operand
        : operation.operator === "subtract"
          ? result - operation.operand
          : operation.operator === "multiply"
            ? result * operation.operand
            : result / operation.operand;
    return {
      label: `${symbols[operation.operator]} ${format(operation.operand)}`,
      value: result,
      key: JSON.stringify(spec.operations.slice(0, index + 1)),
    };
  });
  // Before the response the machine shows its givens only: the input and the operations. What
  // comes out is the question, so it is drawn as "?" (audit M1).
  const nodes = [{ label: letter, value: input, key: "input" }, ...stages];
  const gap = 480 / Math.max(1, nodes.length - 1);
  const hit = spec.target !== undefined && Math.abs(result - spec.target) < 1e-9;
  return (
    <div className="learning-diagram number-machine">
      <svg
        viewBox="0 0 600 195"
        role="img"
        aria-label={
          showResults
            ? `${letter} = ${format(input)}, ${stages.map((stage) => stage.label).join(", then ")}, gives ${format(result)}`
            : `${letter} = ${format(input)}, then ${stages.map((stage) => stage.label).join(", then ")}. The output is hidden until you answer.`
        }
      >
        {nodes.map((node, index) => (
          <g key={node.key} transform={`translate(${60 + index * gap}, 100)`}>
            {index < nodes.length - 1 ? (
              <>
                <path d={`M 35 0 H ${gap - 35}`} style={FILL.line} strokeWidth="2" />
                <path
                  d={`M ${gap - 43} -5 L ${gap - 35} 0 L ${gap - 43} 5`}
                  fill="none"
                  style={FILL.line}
                  strokeWidth="2"
                />
              </>
            ) : null}
            <rect
              x="-34"
              y="-35"
              width="68"
              height="70"
              rx="12"
              style={index === 0 ? FILL.given : FILL.panel}
            />
            <text textAnchor="middle" y="-57" fontSize="23" style={FILL.ink}>
              {node.label}
            </text>
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="27"
              style={index === nodes.length - 1 && showResults ? FILL.result : FILL.ink}
            >
              {index === 0 || showResults ? format(node.value) : "?"}
            </text>
          </g>
        ))}
        {spec.target !== undefined ? (
          <text
            x={60 + (nodes.length - 1) * gap}
            y="168"
            textAnchor="middle"
            fontSize="17"
            style={showResults && hit ? FILL.result : FILL.muted}
          >
            target {format(spec.target)}
            {showResults && hit ? " ✓" : ""}
          </text>
        ) : null}
      </svg>
      {spec.bindAnswer || showResults ? (
        <Control
          label={spec.bindAnswer ? `Choose ${letter}` : `Try another ${letter}`}
          {...spec.input}
          value={input}
          disabled={spec.bindAnswer && answerLocked}
          onChange={(value) => {
            setInput(value);
            if (spec.bindAnswer) onAnswerChange?.(value);
          }}
        />
      ) : null}
    </div>
  );
}

function EquationBalance({
  spec,
  showResults,
  answerText,
  onAnswerChange,
  answerLocked,
}: {
  spec: Extract<Diagram, { type: "equation_balance" }>;
  showResults: boolean;
} & CandidateProps) {
  const [explored, setValue] = useState(spec.variable.value);
  const value = (spec.bindAnswer ? candidateNumber(answerText) : null) ?? explored;
  const left = spec.coefficient * value + spec.constant;
  const equal = Math.abs(left - spec.right) < 1e-8;
  // Level until the response: a tilt would say which way the candidate misses.
  const tilt = showResults ? Math.max(-12, Math.min(12, (spec.right - left) * 2)) : 0;
  const expression = `${spec.coefficient === 1 ? "" : format(spec.coefficient)}x${spec.constant === 0 ? "" : `${spec.constant < 0 ? " − " : " + "}${format(Math.abs(spec.constant))}`}`;
  return (
    <div className="learning-diagram equation-balance">
      <svg
        viewBox="0 0 600 330"
        role="img"
        aria-label={
          showResults
            ? `With x = ${format(value)}, ${expression} is ${format(left)}; the right side is ${format(spec.right)}`
            : `A balance: ${expression} on the left, ${format(spec.right)} on the right.`
        }
      >
        <path d="M 300 137 L 261 286 H 339 Z" style={FILL.panel} />
        <circle cx="300" cy="137" r="8" style={FILL.ink} />
        <g transform={`rotate(${tilt} 300 137)`}>
          <path d="M 105 137 H 495" style={FILL.inkStroke} strokeWidth="5" strokeLinecap="round" />
          {[140, 460].map((x) => (
            <g key={x}>
              <path
                d={`M ${x} 137 V 192 M ${x - 66} 192 H ${x + 66}`}
                fill="none"
                style={FILL.inkStroke}
                strokeWidth="3"
              />
              <rect
                x={x - 57}
                y="76"
                width="114"
                height="58"
                rx="9"
                style={x === 140 ? FILL.given : FILL.panel}
              />
              <text x={x} y="112" textAnchor="middle" fontSize="26" style={FILL.ink}>
                {x === 140 ? expression : format(spec.right)}
              </text>
            </g>
          ))}
        </g>
        {showResults ? (
          <text
            x="300"
            y="40"
            textAnchor="middle"
            fontSize="25"
            style={equal ? FILL.result : FILL.ink}
          >
            x = {format(value)}: {format(left)} {equal ? "=" : left < spec.right ? "<" : ">"}{" "}
            {format(spec.right)}
          </text>
        ) : null}
      </svg>
      {spec.bindAnswer || showResults ? (
        <Control
          label={spec.bindAnswer ? "Choose x" : "Try another x"}
          {...spec.variable}
          value={value}
          disabled={spec.bindAnswer && answerLocked}
          onChange={(next) => {
            setValue(next);
            if (spec.bindAnswer) onAnswerChange?.(next);
          }}
        />
      ) : null}
    </div>
  );
}

function CoordinatePlane({
  spec,
  showResults,
}: {
  spec: Extract<Diagram, { type: "coordinate_plane" }>;
  showResults: boolean;
}) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const clipId = useId();
  const size = spec.max - spec.min;
  const px = (value: number) => 45 + ((value - spec.min) / size) * 360;
  const py = (value: number) => 405 - ((value - spec.min) / size) * 360;
  const ticks = Array.from({ length: size + 1 }, (_, index) => spec.min + index);
  const line = spec.line;
  return (
    <div className="learning-diagram learning-diagram-graph">
      <svg
        viewBox="0 0 450 450"
        role="img"
        aria-label={`Coordinate grid from ${spec.min} to ${spec.max}${line ? (showResults ? ` with line y = ${line.gradient}x + ${line.intercept}` : " with a straight line drawn") : ""}. ${spec.points.map((point) => `${point.label} at (${point.x}, ${point.y})`).join("; ")}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="45" y="45" width="360" height="360" />
          </clipPath>
        </defs>
        {ticks.map((tick) => (
          <g key={tick} data-scale="">
            <path
              d={`M ${px(tick)} 45 V 405 M 45 ${py(tick)} H 405`}
              fill="none"
              style={tick === 0 ? FILL.inkStroke : FILL.line}
              strokeWidth={tick === 0 ? 2 : 1}
            />
            {tick !== 0 && (size <= 12 || tick % 2 === 0) ? (
              <>
                <text x={px(tick)} y={py(0) + 19} textAnchor="middle" fontSize="13">
                  {tick}
                </text>
                <text x={px(0) - 11} y={py(tick) + 4} textAnchor="end" fontSize="13">
                  {tick}
                </text>
              </>
            ) : null}
          </g>
        ))}
        <text x="427" y={py(0) + 5} fontSize="21">
          x
        </text>
        <text x={px(0) - 5} y="24" fontSize="21">
          y
        </text>
        {line ? (
          <path
            clipPath={`url(#${clipId})`}
            d={`M ${px(spec.min)} ${py(line.gradient * spec.min + line.intercept)} L ${px(spec.max)} ${py(line.gradient * spec.max + line.intercept)}`}
            stroke="#09873a"
            strokeWidth="3"
          />
        ) : null}
        {spec.points.map((point) => (
          <g key={point.label}>
            <circle
              className="coordinate-given"
              cx={px(point.x)}
              cy={py(point.y)}
              r="6"
              fill="#91a7ff"
              stroke="#131313"
              strokeWidth="2"
            />
            <text
              x={px(point.x) + (point.x === spec.max ? -18 : 9)}
              y={py(point.y) + (point.y >= spec.max - 1 ? 22 : -10)}
              fontSize="17"
            >
              {point.label}
            </text>
          </g>
        ))}
        {spec.explore ? (
          <circle cx={px(x)} cy={py(y)} r="7" fill="#09873a" stroke="white" strokeWidth="2" />
        ) : null}
      </svg>
      {spec.explore ? (
        <div className="learning-diagram-controls">
          <p className="learning-diagram-hint">
            Move the green dot to see how a pair (x, y) finds its place. It is for exploring and is
            not your answer.
          </p>
          <Control label="Dot x" value={x} min={spec.min} max={spec.max} onChange={setX} />
          <Control label="Dot y" value={y} min={spec.min} max={spec.max} onChange={setY} />
        </div>
      ) : null}
    </div>
  );
}

export function LearningDiagram({
  spec,
  showResults = true,
  answerText,
  onAnswerChange,
  answerLocked,
}: {
  spec: Diagram;
  showResults?: boolean;
} & CandidateProps) {
  switch (spec.type) {
    case "biology_explorer":
      return <BiologyDiagram key={JSON.stringify(spec)} spec={spec} showResults={showResults} />;
    case "chemistry_explorer":
      return <ChemistryDiagram key={JSON.stringify(spec)} spec={spec} showResults={showResults} />;
    case "inference_explorer":
      return <InferenceDiagram key={JSON.stringify(spec)} spec={spec} showResults={showResults} />;
    case "linear_algebra_explorer":
      return <LinearAlgebraDiagram spec={spec} showResults={showResults} />;
    case "calculus_explorer":
      return <CalculusDiagram key={JSON.stringify(spec)} spec={spec} showResults={showResults} />;
    case "mechanics_explorer":
      return <MechanicsDiagram key={JSON.stringify(spec)} spec={spec} showResults={showResults} />;
    case "engineering_explorer":
      return (
        <EngineeringDiagram key={JSON.stringify(spec)} spec={spec} showResults={showResults} />
      );
    case "economics_explorer":
      return <EconomicsDiagram key={JSON.stringify(spec)} spec={spec} showResults={showResults} />;
    case "philosophy_explorer":
      return <PhilosophyDiagram key={JSON.stringify(spec)} spec={spec} showResults={showResults} />;
    case "language_explorer":
      return <LanguageDiagram key={JSON.stringify(spec)} spec={spec} showResults={showResults} />;
    case "astronomy_explorer":
      return <AstronomyDiagram key={JSON.stringify(spec)} spec={spec} showResults={showResults} />;
    case "psychology_explorer":
      return <PsychologyDiagram key={JSON.stringify(spec)} spec={spec} showResults={showResults} />;
    case "geometry_explorer":
      return <GeometryDiagram spec={spec} showResults={showResults} />;
    case "python_execution":
      return <PythonDiagram spec={spec} showResults={showResults} />;
    case "relational_query":
      return <QueryDiagram spec={spec} showResults={showResults} />;
    case "number_machine":
      return (
        <NumberMachine
          spec={spec}
          showResults={showResults}
          answerText={answerText}
          onAnswerChange={onAnswerChange}
          answerLocked={answerLocked}
        />
      );
    case "equation_balance":
      return (
        <EquationBalance
          spec={spec}
          showResults={showResults}
          answerText={answerText}
          onAnswerChange={onAnswerChange}
          answerLocked={answerLocked}
        />
      );
    case "coordinate_plane":
      return <CoordinatePlane spec={spec} showResults={showResults} />;
    case "truth_table":
      return <TruthTable spec={spec} showResults={showResults} />;
    case "program_trace":
      return <ProgramTrace spec={spec} showResults={showResults} />;
    case "search_array":
      return <SearchArray spec={spec} showResults={showResults} />;
    case "outcome_grid":
    case "data_distribution":
    case "sampling_population":
      return <StatisticsDiagram spec={spec} showResults={showResults} />;
  }
}

const FORMULAS = {
  p: "p",
  not_p: "¬p",
  p_and_q: "p ∧ q",
  p_or_q: "p ∨ q",
  p_implies_q: "p → q",
  q_implies_p: "q → p",
  notq_implies_notp: "¬q → ¬p",
  p_xor_q: "p ⊕ q",
  speaker_agreement: "Both claims fit",
  conflicting_speakers: "Both claims fit",
};
function TruthTable({
  spec,
  showResults,
}: {
  spec: Extract<Diagram, { type: "truth_table" }>;
  showResults: boolean;
}) {
  const [p, setP] = useState(spec.p);
  const [q, setQ] = useState(spec.q);
  const binary = !["p", "not_p"].includes(spec.formula);
  const rows = binary
    ? [true, false].flatMap((p) => [true, false].map((q) => ({ p, q })))
    : [true, false].map((p) => ({ p, q: false }));
  return (
    <div className="learning-diagram truth-diagram">
      {(spec.pLabel || spec.qLabel) && (
        <div className="truth-labels">
          {spec.pLabel && <p>p: {spec.pLabel}</p>}
          {spec.qLabel && <p>q: {spec.qLabel}</p>}
        </div>
      )}
      {/* The switches pick a row to read. Before the answer the result column is the question,
          so they appear only once there is something to read (audit M1, M7). */}
      {showResults && spec.formula !== "p" ? (
        <div className="truth-controls">
          <p className="learning-diagram-hint">
            Pick values for p{binary ? " and q" : ""} to read a row.
          </p>
          <button aria-pressed={p} onClick={() => setP(!p)} type="button">
            p: {p ? "True" : "False"}
          </button>
          {binary ? (
            <button aria-pressed={q} onClick={() => setQ(!q)} type="button">
              q: {q ? "True" : "False"}
            </button>
          ) : null}
        </div>
      ) : null}
      <table>
        <caption className="sr-only">Truth values for {FORMULAS[spec.formula]}</caption>
        <thead>
          <tr>
            <th scope="col">p</th>
            {binary ? <th scope="col">q</th> : null}
            {spec.formula !== "p" ? (
              <th scope="col">{spec.outputLabel ?? FORMULAS[spec.formula]}</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.p}-${row.q}`}
              className={
                showResults && row.p === p && (!binary || row.q === q) ? "is-selected" : ""
              }
            >
              <td>{row.p ? "True" : "False"}</td>
              {binary ? <td>{row.q ? "True" : "False"}</td> : null}
              {spec.formula !== "p" ? (
                <td>
                  {showResults ? (truthValue(spec.formula, row.p, row.q) ? "True" : "False") : "?"}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {showResults && spec.formula !== "p" ? (
        <p aria-live="polite">
          For these inputs, {FORMULAS[spec.formula]} is{" "}
          <strong>{truthValue(spec.formula, p, q) ? "true" : "false"}</strong>.
        </p>
      ) : null}
    </div>
  );
}

function ProgramTrace({
  spec,
  showResults,
}: {
  spec: Extract<Diagram, { type: "program_trace" }>;
  showResults: boolean;
}) {
  const [code, setCode] = useState(spec.code);
  const [result, setResult] = useState<ProgramResult | null>(null);
  const [index, setIndex] = useState(0);
  const id = useId();
  const step = result?.steps[index];
  return (
    <div className="learning-diagram program-diagram">
      <div className="program-editor">
        <label htmlFor={id}>Edit code</label>
        <textarea
          id={id}
          spellCheck={false}
          maxLength={2_000}
          value={code}
          rows={Math.min(10, Math.max(3, code.split("\n").length))}
          onChange={(event) => {
            setCode(event.currentTarget.value);
            setResult(null);
          }}
        />
        <div className="button-row">
          {/* Running the program prints the answer, so it opens once the prediction is in. */}
          <button
            className="button button-secondary"
            type="button"
            disabled={!showResults}
            onClick={() => {
              setResult(runTeachingProgram(code));
              setIndex(0);
            }}
          >
            Run code
          </button>
          {code !== spec.code ? (
            <button
              className="button button-ghost"
              type="button"
              onClick={() => {
                setCode(spec.code);
                setResult(null);
                setIndex(0);
              }}
            >
              Restore example
            </button>
          ) : null}
        </div>
      </div>
      <div className="program-trace-result">
        {code !== spec.code ? (
          <p>
            Your edits change the trace. Answer for the lesson’s original example or stated repair.
          </p>
        ) : null}
        {result ? (
          <>
            {result.error ? (
              <p role="alert">{result.error}</p>
            ) : (
              <p aria-live="polite">
                Final x = <strong>{result.value}</strong>
              </p>
            )}
            {step ? (
              <div className="program-state" key={`${code}-${index}`}>
                <span>
                  Line {step.line} · {step.event}
                </span>
                <strong>x = {format(step.x)}</strong>
              </div>
            ) : null}
            {result.steps.length > 1 ? (
              <Control
                label="Trace step"
                min={1}
                max={result.steps.length}
                value={index + 1}
                onChange={(value) => setIndex(value - 1)}
              />
            ) : null}
          </>
        ) : null}
        {!result ? (
          <p className="program-trace-placeholder">
            {showResults
              ? "Run the code, then follow how x changes at each step."
              : "Trace it in your head first. Running the code opens once you have answered."}
          </p>
        ) : null}
      </div>
      <details className="program-language">
        <summary>Supported instructions</summary>
        <p>
          Assign a number to x; update x with +, −, × or ÷; use if/else, while, and for i in
          range(n). Use spaces for indentation. A run stops after 100 steps.
        </p>
      </details>
    </div>
  );
}

function SearchArray({
  spec,
  showResults,
}: {
  spec: Extract<Diagram, { type: "search_array" }>;
  showResults: boolean;
}) {
  const [target, setTarget] = useState(spec.target);
  const [index, setIndex] = useState(-1);
  const id = useId();
  const steps = traceSearch(spec.values, target, spec.strategy);
  const current = steps[index];
  return (
    <div className="learning-diagram search-diagram">
      <label htmlFor={id}>
        Find{" "}
        <input
          id={id}
          type="number"
          min={-100}
          max={100}
          value={target}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            if (Number.isInteger(value) && Math.abs(value) <= 100) {
              setTarget(value);
              setIndex(-1);
            }
          }}
        />
      </label>
      <ol className="search-values">
        {spec.values.map((value, at) => (
          <li
            key={value}
            className={
              current?.index === at
                ? "is-inspected"
                : current && (at < current.low || at > current.high)
                  ? "is-excluded"
                  : ""
            }
          >
            <small data-scale="">{at}</small>
            <strong>{value}</strong>
          </li>
        ))}
      </ol>
      <p aria-live="polite">
        {current
          ? `Check ${index + 1}: ${spec.values[current.index]}${current.found ? " matches the target." : index === steps.length - 1 ? ". The target is absent." : "."}`
          : showResults
            ? "Choose a target, then inspect the next value."
            : "Work out the checks first. Stepping through the search opens once you have answered."}
      </p>
      <div className="button-row">
        {showResults && index + 1 < steps.length ? (
          <button
            className="button button-secondary"
            onClick={() => setIndex(index + 1)}
            type="button"
          >
            {index < 0 ? "Start search" : "Next check"}
          </button>
        ) : null}
        {index >= 0 ? (
          <button className="button button-quiet" onClick={() => setIndex(-1)} type="button">
            Restart
          </button>
        ) : null}
      </div>
    </div>
  );
}
