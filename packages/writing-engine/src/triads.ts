import type { StyleViolation } from "@discere/contracts";
import { sentences } from "./helpers.js";

const LIST_PATTERN = /\b([^,.;:]{2,45}),\s+([^,.;:]{2,45}),\s+(?:and|or)\s+([^,.;:]{2,45})(?=[.!?;:]|$)/giu;
const PARALLEL_PATTERN = /\b(\w+(?:ing|ed))\b[^,]{0,35},\s+(\w+(?:ing|ed))\b[^,]{0,35},\s+(?:and|or)\s+(\w+(?:ing|ed))\b/giu;

function offsetFor(text: string, sentence: string, from: number): number {
  const index = text.indexOf(sentence, from);
  return index >= 0 ? index : from;
}

export function detectTriads(text: string): StyleViolation[] {
  const violations: StyleViolation[] = [];
  let triadCount = 0;
  let searchFrom = 0;

  for (const sentence of sentences(text)) {
    const sentenceStart = offsetFor(text, sentence, searchFrom);
    searchFrom = sentenceStart + sentence.length;
    const matches = [...sentence.matchAll(new RegExp(LIST_PATTERN.source, LIST_PATTERN.flags))];
    const parallelMatches = [...sentence.matchAll(new RegExp(PARALLEL_PATTERN.source, PARALLEL_PATTERN.flags))];

    if (matches.length > 0 || parallelMatches.length > 0) {
      triadCount += 1;
      const match = matches[0] ?? parallelMatches[0];
      if (match?.index !== undefined) {
        violations.push({
          ruleId: "TRI001_THREE_SHORT_PARALLEL_CLAUSES",
          severity: "warning",
          category: "forced_triad",
          message: "Check whether three items are genuinely required. Keep the natural number of points.",
          start: sentenceStart + match.index,
          end: sentenceStart + match.index + match[0].length,
          excerpt: match[0],
        });
      }
    }
  }

  if (triadCount >= 3) {
    violations.push({
      ruleId: "TRI005_REPEATED_TRIADS",
      severity: "hard",
      category: "forced_triad",
      message: "The passage repeatedly uses groups of three. Rewrite the affected lists around the content.",
      start: 0,
      end: Math.min(text.length, 180),
      excerpt: text.slice(0, 180),
    });
  }

  return violations;
}
