import { Check, Copy, CornerDownLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type AngleUnit, CalcError, evaluate, formatResult } from "./calc.js";
import { insertIntoAnswer } from "./answer-target.js";

interface Key {
  label: string;
  /** Text inserted, or an action. */
  insert?: string;
  action?: "clear" | "back" | "equals" | "second" | "angle";
  tone?: "fn" | "op" | "num" | "eq" | "util";
  aria?: string;
}

const first: Key[] = [
  { label: "2nd", action: "second", tone: "util", aria: "Second functions" },
  { label: "DEG", action: "angle", tone: "util" },
  { label: "(", insert: "(", tone: "op" },
  { label: ")", insert: ")", tone: "op" },
  { label: "AC", action: "clear", tone: "util", aria: "Clear" },
  { label: "sin", insert: "sin(", tone: "fn" },
  { label: "cos", insert: "cos(", tone: "fn" },
  { label: "tan", insert: "tan(", tone: "fn" },
  { label: "n!", insert: "!", tone: "fn", aria: "Factorial" },
  { label: "⌫", action: "back", tone: "util", aria: "Delete" },
  { label: "ln", insert: "ln(", tone: "fn" },
  { label: "log", insert: "log(", tone: "fn" },
  { label: "√", insert: "√(", tone: "fn", aria: "Square root" },
  { label: "x²", insert: "^2", tone: "fn", aria: "Square" },
  { label: "÷", insert: "÷", tone: "op", aria: "Divide" },
  { label: "7", insert: "7", tone: "num" },
  { label: "8", insert: "8", tone: "num" },
  { label: "9", insert: "9", tone: "num" },
  { label: "xʸ", insert: "^", tone: "fn", aria: "Power" },
  { label: "×", insert: "×", tone: "op", aria: "Multiply" },
  { label: "4", insert: "4", tone: "num" },
  { label: "5", insert: "5", tone: "num" },
  { label: "6", insert: "6", tone: "num" },
  { label: "e", insert: "e", tone: "fn", aria: "Euler's number" },
  { label: "−", insert: "−", tone: "op", aria: "Subtract" },
  { label: "1", insert: "1", tone: "num" },
  { label: "2", insert: "2", tone: "num" },
  { label: "3", insert: "3", tone: "num" },
  { label: "π", insert: "π", tone: "fn", aria: "Pi" },
  { label: "+", insert: "+", tone: "op", aria: "Add" },
  { label: "0", insert: "0", tone: "num" },
  { label: ".", insert: ".", tone: "num", aria: "Decimal point" },
  { label: "EXP", insert: "e", tone: "fn", aria: "Times ten to the power" },
  { label: "Ans", insert: "Ans", tone: "fn", aria: "Previous answer" },
  { label: "=", action: "equals", tone: "eq", aria: "Equals" },
];
const second: Record<string, Key> = {
  sin: { label: "sin⁻¹", insert: "asin(", tone: "fn", aria: "Inverse sine" },
  cos: { label: "cos⁻¹", insert: "acos(", tone: "fn", aria: "Inverse cosine" },
  tan: { label: "tan⁻¹", insert: "atan(", tone: "fn", aria: "Inverse tangent" },
  ln: { label: "eˣ", insert: "exp(", tone: "fn", aria: "e to the power" },
  log: { label: "10ˣ", insert: "10^(", tone: "fn", aria: "Ten to the power" },
  "√": { label: "∛", insert: "∛(", tone: "fn", aria: "Cube root" },
  "x²": { label: "x³", insert: "^3", tone: "fn", aria: "Cube" },
  "n!": { label: "|x|", insert: "abs(", tone: "fn", aria: "Absolute value" },
};
// EXP writes "e" only after a digit, where the parser reads 1e5; elsewhere it would be Euler's number.
const EXP_KEY = "EXP";

interface Entry {
  id: number;
  expression: string;
  result: string;
}

export function Calculator() {
  const [input, setInput] = useState("");
  const [angle, setAngle] = useState<AngleUnit>("deg");
  const [shift, setShift] = useState(false);
  const [ans, setAns] = useState(0);
  const [history, setHistory] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return formatResult(evaluate(input, angle, ans));
    } catch {
      return null;
    }
  }, [input, angle, ans]);
  const latest = history[0]?.result ?? null;

  useEffect(() => {
    field.current?.focus();
  }, []);

  function type(text: string) {
    const element = field.current;
    const start = element?.selectionStart ?? input.length;
    const end = element?.selectionEnd ?? input.length;
    const next = input.slice(0, start) + text + input.slice(end);
    setInput(next);
    setError(null);
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + text.length, start + text.length);
    });
  }
  function equals() {
    if (!input.trim()) return;
    try {
      const value = evaluate(input, angle, ans);
      const result = formatResult(value);
      setAns(value);
      setHistory((current) =>
        [{ id: (current[0]?.id ?? 0) + 1, expression: input, result }, ...current].slice(0, 12),
      );
      setInput(result);
      setError(null);
    } catch (problem) {
      setError(problem instanceof CalcError ? problem.message : "That could not be calculated.");
    }
  }
  function press(key: Key) {
    if (key.action === "clear") {
      setInput("");
      setError(null);
    } else if (key.action === "back") {
      setInput((current) => current.slice(0, -1));
    } else if (key.action === "equals") equals();
    else if (key.action === "second") setShift((value) => !value);
    else if (key.action === "angle") setAngle((value) => (value === "deg" ? "rad" : "deg"));
    else if (key.label === EXP_KEY) type(/\d$/.test(input) ? "e" : "1e");
    else if (key.insert) {
      type(key.insert);
      if (shift) setShift(false);
    }
    field.current?.focus();
  }
  const resultToUse = preview ?? latest;
  async function copy() {
    if (!resultToUse) return;
    try {
      await navigator.clipboard.writeText(resultToUse);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* Clipboard can be refused; the value is still on screen. */
    }
  }
  function useInAnswer() {
    if (!resultToUse) return;
    if (insertIntoAnswer(resultToUse)) {
      setInserted(true);
      window.setTimeout(() => setInserted(false), 1400);
    } else setError("Click the lesson's answer box once, then press Use in answer again.");
  }

  return (
    <div className="calc">
      <div className="calc-display">
        <div className="calc-modes" aria-live="polite">
          <span className={angle === "deg" ? "is-on" : ""}>DEG</span>
          <span className={angle === "rad" ? "is-on" : ""}>RAD</span>
          {shift ? <span className="is-on">2nd</span> : null}
        </div>
        <label className="sr-only" htmlFor="calc-input">
          Expression
        </label>
        <input
          id="calc-input"
          ref={field}
          className="calc-input"
          value={input}
          inputMode="none"
          autoComplete="off"
          spellCheck={false}
          placeholder="0"
          onChange={(event) => {
            setInput(event.currentTarget.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "=") {
              event.preventDefault();
              equals();
            } else if (event.key === "Escape" && input !== "") {
              // A first Esc clears the expression; a second, on an empty line, closes the bench.
              event.preventDefault();
              setInput("");
              setError(null);
            }
          }}
        />
        <output
          className={`calc-preview${error ? " is-error" : ""}`}
          htmlFor="calc-input"
          aria-live="polite"
        >
          {error ?? (preview !== null && preview !== input ? `= ${preview}` : " ")}
        </output>
      </div>
      <div className="calc-actions">
        <button
          type="button"
          className="calc-chip"
          onClick={() => void copy()}
          disabled={!resultToUse}
        >
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          className="calc-chip calc-chip--primary"
          onClick={useInAnswer}
          disabled={!resultToUse}
          title="Put the result in the lesson's answer box"
        >
          {inserted ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <CornerDownLeft size={15} aria-hidden="true" />
          )}
          {inserted ? "Added" : "Use in answer"}
        </button>
      </div>
      <div className="calc-keys" role="group" aria-label="Calculator keys">
        {first.map((key) => {
          const shown = shift && second[key.label] ? second[key.label]! : key;
          const label = key.action === "angle" ? (angle === "deg" ? "DEG" : "RAD") : shown.label;
          return (
            <button
              key={key.label}
              type="button"
              className={`calc-key calc-key--${shown.tone ?? "num"}${key.action === "second" && shift ? " is-active" : ""}`}
              aria-label={
                key.action === "angle"
                  ? `Angle unit: ${angle === "deg" ? "degrees" : "radians"}`
                  : (shown.aria ?? shown.label)
              }
              onClick={() => press(shown)}
            >
              {label}
            </button>
          );
        })}
      </div>
      {history.length ? (
        <ol className="calc-history" aria-label="Previous calculations">
          {history.map((entry) => (
            <li key={entry.id}>
              <button type="button" onClick={() => type(entry.result)} title="Insert this result">
                <span>{entry.expression}</span>
                <strong>= {entry.result}</strong>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="calc-hint">
          Type or tap. Enter evaluates, Esc clears. Angles are in{" "}
          {angle === "deg" ? "degrees" : "radians"}.
        </p>
      )}
    </div>
  );
}
