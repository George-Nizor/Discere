import type { WritingLintResponse } from "@discere/contracts";

export type WritingContext = "lesson" | "question" | "hint" | "feedback" | "assessment";

export interface LintOptions {
  context?: WritingContext;
  hiddenAnswer?: string;
}

export interface PreservationReport {
  passed: boolean;
  missingNumbers: string[];
  addedNumbers: string[];
  missingUnits: string[];
  addedUnits: string[];
  missingCitations: string[];
  addedCitations: string[];
  missingEquations: string[];
  addedEquations: string[];
}

export type LintResult = WritingLintResponse;
