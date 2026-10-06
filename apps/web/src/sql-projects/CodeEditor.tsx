import { type KeyboardEvent, type ReactNode, useRef } from "react";

/**
 * A plain textarea with line numbers and light syntax colouring, for the SQL and Python
 * projects. The textarea stays the real control, so typing, selection, undo, screen readers
 * and mobile keyboards behave natively; the coloured copy underneath is decoration only.
 * Lines do not wrap, so a line number always sits beside the line it counts.
 */

export type CodeLanguage = "sql" | "python";

const KEYWORDS: Record<CodeLanguage, Set<string>> = {
  sql: new Set(
    "select from where and or not in is null as join left right inner outer full cross on group by order having limit offset distinct count sum avg min max case when then else end union all with insert update delete values into set like between exists asc desc coalesce cast over partition row_number rank dense_rank lag lead round".split(
      " ",
    ),
  ),
  python: new Set(
    "def return if elif else for while in not and or is None True False import from as with lambda try except finally raise class pass break continue yield global nonlocal assert del print len range sum min max sorted list dict set tuple int float str".split(
      " ",
    ),
  ),
};

const PATTERNS: Record<CodeLanguage, RegExp> = {
  sql: /(--[^\n]*)|('(?:[^']|'')*'?)|("(?:[^"])*"?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g,
  python:
    /(#[^\n]*)|("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g,
};

/** Split code into coloured spans. Exported for tests. */
export function highlight(code: string, language: CodeLanguage): ReactNode[] {
  const pattern = new RegExp(PATTERNS[language].source, "g");
  const keywords = KEYWORDS[language];
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of code.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(code.slice(last, index));
    const text = match[0];
    let kind: string | null = null;
    if (match[1]) kind = "comment";
    else if (match[2]) kind = "string";
    else if (language === "sql" && match[3]) kind = "identifier";
    else if (language === "sql" ? match[4] : match[3]) kind = "number";
    else if (keywords.has(language === "sql" ? text.toLowerCase() : text)) kind = "keyword";
    parts.push(
      kind ? (
        <span className={`code-token code-token--${kind}`} key={key++}>
          {text}
        </span>
      ) : (
        text
      ),
    );
    last = index + text.length;
  }
  if (last < code.length) parts.push(code.slice(last));
  return parts;
}

export function CodeEditor({
  id,
  language,
  value,
  onChange,
  onKeyDown,
  disabled,
  placeholder,
  describedBy,
  maxLength = 16000,
}: {
  id: string;
  language: CodeLanguage;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  placeholder?: string;
  describedBy?: string;
  maxLength?: number;
}) {
  const layer = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const lines = Math.max(1, value.split("\n").length);
  function sync(target: HTMLTextAreaElement): void {
    if (layer.current) {
      layer.current.scrollTop = target.scrollTop;
      layer.current.scrollLeft = target.scrollLeft;
    }
    if (gutter.current) gutter.current.scrollTop = target.scrollTop;
  }
  return (
    <div className={`code-editor${disabled ? " is-disabled" : ""}`}>
      <div aria-hidden="true" className="code-editor-gutter" ref={gutter}>
        {Array.from({ length: lines }, (_, index) => index + 1).map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
      <div className="code-editor-surface">
        <pre aria-hidden="true" className="code-editor-layer" ref={layer}>
          {highlight(value, language)}
          {/* A trailing newline needs a character after it to keep the layer as tall. */}
          {"\n "}
        </pre>
        <textarea
          aria-describedby={describedBy}
          autoCapitalize="off"
          autoCorrect="off"
          className="code-editor-input"
          disabled={disabled}
          id={id}
          maxLength={maxLength}
          onChange={(event) => onChange(event.currentTarget.value)}
          onKeyDown={onKeyDown}
          onScroll={(event) => sync(event.currentTarget)}
          placeholder={placeholder}
          spellCheck={false}
          value={value}
          wrap="off"
        />
      </div>
    </div>
  );
}
