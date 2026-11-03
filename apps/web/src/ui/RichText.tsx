import type React from "react";
import { useEffect, useId, useRef } from "react";

export interface TextSegment {
  type: "text" | "math";
  value: string;
  /** Character offset in the source string, which gives each run a stable identity. */
  start: number;
}

const MATH_PATTERN = /\$([^$\n]+)\$/g;

/**
 * Splits learner-facing prose into plain runs and inline equations delimited by `$…$`.
 * Text without delimiters comes back as a single run, so unmarked content renders unchanged.
 */
export function splitMath(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(MATH_PATTERN)) {
    const start = match.index;
    const expression = match[1];
    if (start === undefined || expression === undefined) continue;
    if (start > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, start), start: lastIndex });
    }
    segments.push({ type: "math", value: expression, start });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex), start: lastIndex });
  }
  if (segments.length === 0) segments.push({ type: "text", value: text, start: 0 });
  return segments;
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

export function InlineMath({ expression }: { expression: string }) {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let active = true;
    // Plain prose does not download the equation renderer. Keep the equation readable while
    // loading, and never let a late import replace a newer expression or an unmounted node.
    element.textContent = expression;
    void import("katex")
      .then(({ default: katex }) => {
        if (active) katex.render(expression, element, { throwOnError: false, displayMode: false });
      })
      .catch(() => {
        /* The readable source remains available if the renderer cannot load. */
      });
    return () => {
      active = false;
    };
  }, [expression]);
  return <span className="math" ref={host} role="math" aria-label={expression} />;
}

/**
 * `**term**` is bold (a term at its definition, or a screen's key phrase), `*word*` is italic
 * (stress), and `[[term|note]]` is a hover term whose note recalls a term met earlier, as the
 * discere-lesson-voice skill writes them. A lone asterisk, as in "3 * 4", is left alone.
 */
const EMPHASIS_PATTERN =
  /\[\[([^|\]\n]+)\|([^\]\n]+)\]\]|\*\*([^*\n]+?)\*\*|(?<![\w*])\*(?=\S)([^*\n]+?)(?<=\S)\*(?![\w*])/g;

/**
 * A term the learner can hover, focus or tap to see a short reminder. The note is linked with
 * aria-describedby, so a screen reader announces it with the term.
 */
function HoverTerm({ term, note }: { term: string; note: string }) {
  const id = useId();
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: focus is how a keyboard user opens the note.
    <span className="hover-term" tabIndex={0} aria-describedby={id}>
      {term}
      <span className="hover-term-note" id={id} role="tooltip">
        {note}
      </span>
    </span>
  );
}

function Emphasis({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(EMPHASIS_PATTERN)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      match[1] !== undefined && match[2] !== undefined ? (
        <HoverTerm key={start} note={match[2]} term={match[1]} />
      ) : match[3] !== undefined ? (
        <strong key={start}>{match[3]}</strong>
      ) : (
        <em key={start}>{match[4]}</em>
      ),
    );
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** The same text without emphasis marks, for speech and plain-text uses. */
export function stripEmphasis(text: string): string {
  return text.replace(
    EMPHASIS_PATTERN,
    (_whole, term?: string, _note?: string, bold?: string, italic?: string) =>
      String(term ?? bold ?? italic ?? ""),
  );
}

export function InlineRichText({ text }: { text: string }) {
  const segments = splitMath(text);
  return (
    <>
      {segments.map((segment) =>
        segment.type === "math" ? (
          <InlineMath expression={segment.value} key={`math-${segment.start}`} />
        ) : (
          <span key={`text-${segment.start}`}>
            <Emphasis text={segment.value} />
          </span>
        ),
      )}
    </>
  );
}

/** Paragraph-level prose with inline equation support. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const paragraphs = splitParagraphs(text);
  return (
    <div className={className ? `prose ${className}` : "prose"}>
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>
          <InlineRichText text={paragraph} />
        </p>
      ))}
    </div>
  );
}
