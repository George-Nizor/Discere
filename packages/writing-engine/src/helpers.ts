import type { StyleViolation } from "@discere/contracts";

export interface PatternRule {
  ruleId: string;
  severity: "hard" | "warning";
  category: string;
  message: string;
  pattern: RegExp;
}

export function words(text: string): string[] {
  return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) ?? [];
}

export function sentences(text: string): string[] {
  return text
    .replace(/\n{2,}/g, ". ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function headings(text: string): string[] {
  return text.match(/^#{1,6}\s+.+$/gm) ?? [];
}

export function matchRule(text: string, rule: PatternRule): StyleViolation[] {
  const flags = rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`;
  const pattern = new RegExp(rule.pattern.source, flags);
  const matches: StyleViolation[] = [];
  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined) continue;
    matches.push({
      ruleId: rule.ruleId,
      severity: rule.severity,
      category: rule.category,
      message: rule.message,
      start: match.index,
      end: match.index + match[0].length,
      excerpt: match[0],
    });
  }
  return matches;
}

export function normaliseForLeakCheck(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}.+\-/]+/gu, " ")
    .trim();
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
