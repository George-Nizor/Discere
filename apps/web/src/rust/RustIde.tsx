import type { RustRunResult, RustTaskRun } from "@discere/contracts";
import { Fragment, type KeyboardEvent, type ReactNode, useRef } from "react";
import { CodeEditor } from "../sql-projects/CodeEditor.js";

/**
 * The pieces of the Rust workspace: an editor that indents like one, a console that shows what
 * rustc and the program said, and a renderer for task text with `inline code`.
 */

const INDENT = "    ";

export function RustEditor({
  id,
  value,
  onChange,
  onRun,
  disabled,
  label,
  fitLines,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  disabled?: boolean;
  label: string;
  /** Size the editor to the program instead of filling its container. */
  fitLines?: boolean;
}) {
  // Tab indents, as in any code editor. Escape first lets Tab leave the editor instead.
  const escaped = useRef(false);
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      onRun?.();
      return;
    }
    if (event.key === "Escape") {
      escaped.current = true;
      return;
    }
    if (event.key === "Tab" && !event.shiftKey && !escaped.current) {
      event.preventDefault();
      const area = event.currentTarget;
      area.setRangeText(INDENT, area.selectionStart, area.selectionEnd, "end");
      onChange(area.value);
    } else if (event.key === "Enter" && !event.shiftKey) {
      // Keep the current line's indentation, and add a level after an opening brace.
      const area = event.currentTarget;
      const before = area.value.slice(0, area.selectionStart);
      const line = before.slice(before.lastIndexOf("\n") + 1);
      const indent = /^\s*/.exec(line)?.[0] ?? "";
      const extra = /[{(\[]\s*$/.test(line) ? INDENT : "";
      if (indent || extra) {
        event.preventDefault();
        area.setRangeText("\n" + indent + extra, area.selectionStart, area.selectionEnd, "end");
        onChange(area.value);
      }
    }
    if (event.key !== "Escape") escaped.current = false;
  }
  return (
    <div
      className="rust-editor"
      style={
        fitLines
          ? ({ "--rust-lines": Math.max(3, value.split("\n").length) } as React.CSSProperties)
          : undefined
      }
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <CodeEditor
        id={id}
        language="rust"
        value={value}
        disabled={disabled ?? false}
        placeholder="fn main() {\n    \n}"
        onChange={onChange}
        onKeyDown={keyDown}
      />
    </div>
  );
}

type Shown = Pick<RustRunResult, "status" | "diagnostics" | "stdout" | "stderr" | "message"> &
  Pick<RustTaskRun, "returned" | "passed" | "total">;

const HEADLINES: Record<Shown["status"], string> = {
  ok: "Ran successfully",
  compile_error: "Did not compile",
  runtime_error: "Stopped with an error",
  limit: "Stopped at a practice limit",
  unavailable: "Rust is unavailable",
};

/** Splits text and pairs each piece with where it starts, a stable key for static text. */
function pieces(text: string, separator: RegExp): { at: number; text: string }[] {
  const out: { at: number; text: string }[] = [];
  let at = 0;
  for (const part of text.split(separator)) {
    out.push({ at, text: part });
    at += part.length + 1;
  }
  return out;
}

/** Colours rustc's `error`, `warning`, `help` and `-->` lines so a long message can be scanned. */
function Diagnostics({ text }: { text: string }) {
  return (
    <pre className="rust-console-diagnostics">
      {pieces(text, /\n/).map(({ at, text: line }) => {
        const kind = /^error/.test(line)
          ? "error"
          : /^warning/.test(line)
            ? "warning"
            : /^(help|note)|^\s+= (help|note)/.test(line)
              ? "help"
              : /^\s*-->/.test(line)
                ? "location"
                : null;
        return (
          <Fragment key={at}>
            {kind ? <span className={"rust-diag rust-diag--" + kind}>{line}</span> : line}
            {"\n"}
          </Fragment>
        );
      })}
    </pre>
  );
}

export function RustConsole({
  result,
  busy,
  idle,
  children,
}: {
  result?: Shown | undefined;
  busy?: string;
  idle: string;
  children?: ReactNode;
}) {
  return (
    <section className="rust-console" aria-label="Console" aria-live="polite">
      {busy ? (
        <p className="rust-console-status">{busy}</p>
      ) : !result ? (
        <p className="rust-console-idle">{idle}</p>
      ) : (
        <>
          <p className={"rust-console-status rust-console-status--" + result.status}>
            {HEADLINES[result.status]}
            {result.passed !== undefined && result.total !== undefined && result.total > 1
              ? ": " + result.passed + " of " + result.total + " tests passed"
              : null}
          </p>
          {result.message ? <p className="rust-console-message">{result.message}</p> : null}
          {result.diagnostics ? <Diagnostics text={result.diagnostics} /> : null}
          {result.stdout ? (
            <pre className="rust-console-stdout" aria-label="Printed output">
              {result.stdout}
            </pre>
          ) : result.status === "ok" && result.returned === undefined ? (
            <p className="rust-console-idle">The program printed nothing.</p>
          ) : null}
          {result.returned !== undefined ? (
            <p className="rust-console-returned">
              Returned <code>{result.returned}</code>
            </p>
          ) : null}
          {result.stderr ? <pre className="rust-console-stderr">{result.stderr}</pre> : null}
        </>
      )}
      {children}
    </section>
  );
}

/** Task text: blank lines split paragraphs, backticks mark code. */
export function TaskText({ text }: { text: string }) {
  return (
    <>
      {pieces(text, /\n{2,}/).map((paragraph) => (
        <p key={paragraph.at}>
          {pieces(paragraph.text, /(`[^`]+`)/).map(({ at, text: part }) =>
            part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
              <code key={at}>{part.slice(1, -1)}</code>
            ) : (
              <Fragment key={at}>{part}</Fragment>
            ),
          )}
        </p>
      ))}
    </>
  );
}
