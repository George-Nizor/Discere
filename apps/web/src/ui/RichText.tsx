import katex from "katex";
import { useEffect, useRef } from "react";

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
    katex.render(expression, element, { throwOnError: false, displayMode: false });
  }, [expression]);
  // The plain source stays in the accessibility tree; KaTeX replaces the visual layer.
  return <span className="math" ref={host} role="math" aria-label={expression} />;
}

export function InlineRichText({ text }: { text: string }) {
  const segments = splitMath(text);
  return (
    <>
      {segments.map((segment) =>
        segment.type === "math" ? (
          <InlineMath expression={segment.value} key={`math-${segment.start}`} />
        ) : (
          <span key={`text-${segment.start}`}>{segment.value}</span>
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
