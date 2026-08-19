import type { PreservationReport } from "./types.js";
import { unique } from "./helpers.js";

const NUMBER_PATTERN = /(?<![\p{L}\p{N}])[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?%?/giu;
const UNIT_PATTERN = /\b(?:mA|A|mV|V|kΩ|Ω|ohms?|volts?|amps?|amperes?|watts?|W|Hz|kHz|MHz|kg|g|ms|s)\b/giu;
const CITATION_PATTERN = /(?:\[[^\]]+\]\([^)]+\)|\[[0-9]+\]|https?:\/\/\S+)/giu;
const EQUATION_PATTERN = /(?:^|\s)([A-Za-z]\s*=\s*[^\n.!?;]{1,80})/g;

function captures(text: string, pattern: RegExp): string[] {
  return unique((text.match(pattern) ?? []).map((value) => value.trim()));
}

function difference(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map((value) => value.toLocaleLowerCase()));
  return left.filter((value) => !rightSet.has(value.toLocaleLowerCase()));
}

export function checkPreservation(source: string, edited: string): PreservationReport {
  const sourceNumbers = captures(source, NUMBER_PATTERN);
  const editedNumbers = captures(edited, NUMBER_PATTERN);
  const sourceUnits = captures(source, UNIT_PATTERN);
  const editedUnits = captures(edited, UNIT_PATTERN);
  const sourceCitations = captures(source, CITATION_PATTERN);
  const editedCitations = captures(edited, CITATION_PATTERN);
  const sourceEquations = captures(source, EQUATION_PATTERN);
  const editedEquations = captures(edited, EQUATION_PATTERN);

  const report: PreservationReport = {
    passed: true,
    missingNumbers: difference(sourceNumbers, editedNumbers),
    addedNumbers: difference(editedNumbers, sourceNumbers),
    missingUnits: difference(sourceUnits, editedUnits),
    addedUnits: difference(editedUnits, sourceUnits),
    missingCitations: difference(sourceCitations, editedCitations),
    addedCitations: difference(editedCitations, sourceCitations),
    missingEquations: difference(sourceEquations, editedEquations),
    addedEquations: difference(editedEquations, sourceEquations),
  };
  report.passed = Object.entries(report)
    .filter(([key]) => key !== "passed")
    .every(([, value]) => Array.isArray(value) && value.length === 0);
  return report;
}
