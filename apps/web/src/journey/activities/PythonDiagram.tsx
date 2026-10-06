import type { LearningDiagram } from "@discere/contracts";
import { Code2, Play, RotateCcw, StepForward } from "lucide-react";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { reducedMotionEnabled } from "../../study/experience.js";

type Spec = Extract<LearningDiagram, { type: "python_execution" }>;
function ScrollRegion({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label: string;
  className: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setScrollable(element.scrollWidth > element.clientWidth + 1);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [children]);
  return (
    <div
      ref={ref}
      className={className}
      role="region"
      aria-label={label}
      tabIndex={scrollable ? 0 : undefined}
    >
      {children}
    </div>
  );
}
export function PythonDiagram({ spec, showResults = true }: { spec: Spec; showResults?: boolean }) {
  const [caseId, setCaseId] = useState(spec.initialCaseId);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const example = spec.cases.find((item) => item.id === caseId) ?? spec.cases[0]!;
  const current = example.steps[index];
  const finished = index === example.steps.length - 1;
  useEffect(() => {
    setCaseId(spec.initialCaseId);
    setIndex(-1);
    setPlaying(false);
  }, [spec]);
  useEffect(() => {
    if (!playing) return;
    if (finished) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setIndex((value) => value + 1), 650);
    return () => window.clearTimeout(timer);
  }, [playing, finished, index]);
  const choose = (id: string) => {
    setPlaying(false);
    setCaseId(id);
    setIndex(-1);
  };
  return (
    <div className="learning-diagram python-diagram">
      <div className="python-heading">
        <Code2 size={17} aria-hidden="true" />
        <span>Explore an example</span>
        <small>{spec.runtime}</small>
      </div>
      <div className="python-cases" role="group" aria-label="Choose a Python example">
        {spec.cases.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={example.id === item.id}
            onClick={() => choose(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <ScrollRegion className="python-code-scroll" label="Python code">
        <pre className="python-code">
          <code>
            {example.code.split("\n").map((line, offset) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: A fixed code line is identified by its position within this immutable example.
                key={offset}
                className={
                  current && offset + 1 >= current.lineStart && offset + 1 <= current.lineEnd
                    ? "python-line is-current"
                    : "python-line"
                }
              >
                <span className="python-line-number" aria-hidden="true" data-scale="">
                  {offset + 1}
                </span>
                {line || " "}
                {offset < example.code.split("\n").length - 1 ? "\n" : ""}
              </span>
            ))}
          </code>
        </pre>
      </ScrollRegion>
      <div className="python-controls">
        <button
          type="button"
          onClick={() => {
            if (playing) {
              setPlaying(false);
              return;
            }
            if (reducedMotionEnabled()) {
              setIndex(example.steps.length - 1);
              return;
            }
            if (finished) setIndex(-1);
            setPlaying(true);
          }}
        >
          <Play size={15} aria-hidden="true" />
          {playing ? "Pause" : finished ? "Replay" : "Play example"}
        </button>
        {!finished && (
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setIndex((value) => value + 1);
            }}
          >
            <StepForward size={15} aria-hidden="true" />
            Next step
          </button>
        )}
        {index >= 0 && (
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setIndex(-1);
            }}
            aria-label="Reset example"
          >
            <RotateCcw size={15} aria-hidden="true" />
          </button>
        )}
        <span className="python-step-count" role="status">
          {index < 0
            ? "Predict, then explore"
            : "Step " + (index + 1) + " of " + example.steps.length}
        </span>
      </div>
      {current && !showResults && (
        <p className="python-state python-no-output">
          Follow the highlighted lines and predict each value. Values and output appear once you
          have answered.
        </p>
      )}
      {current && showResults && (
        <div className="python-state" key={caseId + "-" + index} aria-label="Python state">
          {current.values.length > 0 && (
            <dl className="python-values">
              {current.values.map((value) => (
                <div key={value.name} className={value.table ? "python-value-table" : ""}>
                  <dt>
                    <code>{value.name}</code>
                    <span>{value.type}</span>
                  </dt>
                  <dd>
                    {value.table ? (
                      <ScrollRegion className="python-table-scroll" label={value.name + " data"}>
                        <table>
                          <caption className="sr-only">{value.name}</caption>
                          <thead>
                            <tr>
                              {value.table.columns.map((column) => (
                                <th key={column} scope="col">
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {value.table.rows.map((row, rowIndex) => (
                              // biome-ignore lint/suspicious/noArrayIndexKey: Each execution snapshot is remounted; repeated index labels are valid data.
                              <tr key={rowIndex}>
                                {row.map((cell, column) => (
                                  <td key={value.table!.columns[column]}>
                                    {cell === null ? (
                                      <span className="python-missing">missing</span>
                                    ) : (
                                      String(cell)
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {value.table.rows.length === 0 && <p>No rows</p>}
                      </ScrollRegion>
                    ) : (
                      <code>{value.display}</code>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {current.stdout && (
            <div className="python-output">
              <span>Output</span>
              <pre>{current.stdout}</pre>
            </div>
          )}
          {!current.values.length && !current.stdout && (
            <p className="python-no-output">No output yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
