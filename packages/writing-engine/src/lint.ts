import type { StyleViolation, WritingLintResponse } from "@discere/contracts";
import { headings, matchRule, normaliseForLeakCheck, sentences, words } from "./helpers.js";
import { PATTERN_RULES } from "./pattern-rules.js";
import { detectTriads } from "./triads.js";
import type { LintOptions } from "./types.js";

function emDashViolations(text: string, wordCount: number): StyleViolation[] {
  const matches = [...text.matchAll(/—/g)];
  const permitted = Math.max(2, Math.floor(wordCount / 300) * 2);
  if (matches.length <= permitted) return [];
  const first = matches[permitted];
  if (!first || first.index === undefined) return [];
  return [
    {
      ruleId: "FMT001_EM_DASH_DENSITY",
      severity: "hard",
      category: "formatting",
      message: "Use commas, full stops, or parentheses. The passage relies too heavily on em dashes.",
      start: first.index,
      end: first.index + 1,
      excerpt: "—",
    },
  ];
}

function headingDensityViolation(text: string, wordCount: number): StyleViolation[] {
  const found = headings(text);
  if (found.length === 0 || wordCount / found.length >= 45) return [];
  const first = text.indexOf(found[0] ?? "");
  return [
    {
      ruleId: "FMT002_HEADING_DENSITY",
      severity: "warning",
      category: "formatting",
      message: "Combine small sections. Headings should mark meaningful changes in the lesson.",
      start: Math.max(0, first),
      end: Math.max(0, first) + (found[0]?.length ?? 0),
      excerpt: found[0] ?? "",
    },
  ];
}

function repeatedSentenceOpeningViolations(text: string): StyleViolation[] {
  const openingCounts = new Map<string, { count: number; index: number; excerpt: string }>();
  let offset = 0;
  for (const sentence of sentences(text)) {
    const index = text.indexOf(sentence, offset);
    offset = Math.max(offset, index + sentence.length);
    const opening = (sentence.match(/^["“']?([\p{L}]+(?:\s+[\p{L}]+)?)/u)?.[1] ?? "").toLocaleLowerCase();
    if (!opening) continue;
    const current = openingCounts.get(opening);
    openingCounts.set(opening, {
      count: (current?.count ?? 0) + 1,
      index: current?.index ?? Math.max(0, index),
      excerpt: current?.excerpt ?? sentence.slice(0, 80),
    });
  }
  return [...openingCounts.entries()]
    .filter(([, value]) => value.count >= 3)
    .map(([opening, value]) => ({
      ruleId: "REP002_REPEATED_SENTENCE_OPENING",
      severity: "warning" as const,
      category: "repetition",
      message: `Several sentences begin with '${opening}'. Vary the sentence structure where it helps clarity.`,
      start: value.index,
      end: value.index + value.excerpt.length,
      excerpt: value.excerpt,
    }));
}

function repeatedTransitionHardening(violations: StyleViolation[]): StyleViolation[] {
  const transitions = violations.filter((item) => item.ruleId === "REP001_REPEATED_TRANSITION");
  if (transitions.length < 3) return violations;
  return violations.map((item) =>
    item.ruleId === "REP001_REPEATED_TRANSITION" ? { ...item, severity: "hard" as const } : item,
  );
}

interface Measurement {
  value: number;
  dimension: "current" | "voltage" | "resistance";
  start: number;
  end: number;
  excerpt: string;
}

const MEASUREMENT_PATTERN = /-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?\s*(?:milliamperes?|milliamps?|microamperes?|microamps?|amperes?|amps?|millivolts?|kilovolts?|volts?|kiloohms?|megaohms?|ohms?|mA|[µμu]A|A|mV|kV|V|kΩ|KΩ|MΩ|Ω)/giu;

function normaliseMeasurement(value: number, rawUnit: string): Pick<Measurement, "value" | "dimension"> | null {
  const compact = rawUnit.normalize("NFKC").replace(/\s+/g, "");
  if (compact === "MΩ") return { value: value * 1e6, dimension: "resistance" };

  switch (compact.toLocaleLowerCase().replaceAll("μ", "µ")) {
    case "a":
    case "amp":
    case "amps":
    case "ampere":
    case "amperes":
      return { value, dimension: "current" };
    case "ma":
    case "milliamp":
    case "milliamps":
    case "milliampere":
    case "milliamperes":
      return { value: value * 1e-3, dimension: "current" };
    case "µa":
    case "ua":
    case "microamp":
    case "microamps":
    case "microampere":
    case "microamperes":
      return { value: value * 1e-6, dimension: "current" };
    case "v":
    case "volt":
    case "volts":
      return { value, dimension: "voltage" };
    case "mv":
    case "millivolt":
    case "millivolts":
      return { value: value * 1e-3, dimension: "voltage" };
    case "kv":
    case "kilovolt":
    case "kilovolts":
      return { value: value * 1e3, dimension: "voltage" };
    case "ω":
    case "ohm":
    case "ohms":
      return { value, dimension: "resistance" };
    case "kω":
    case "kiloohm":
    case "kiloohms":
      return { value: value * 1e3, dimension: "resistance" };
    case "megaohm":
    case "megaohms":
      return { value: value * 1e6, dimension: "resistance" };
    default:
      return null;
  }
}
function measurements(text: string): Measurement[] {
  return [...text.matchAll(new RegExp(MEASUREMENT_PATTERN.source, MEASUREMENT_PATTERN.flags))].flatMap((match) => {
    if (match.index === undefined) return [];
    const numberMatch = match[0].match(/^-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?/u);
    if (!numberMatch) return [];
    const numericValue = Number(numberMatch[0]);
    if (!Number.isFinite(numericValue)) return [];
    const rawUnit = match[0].slice(numberMatch[0].length).trim();
    const normalized = normaliseMeasurement(numericValue, rawUnit);
    if (!normalized) return [];
    return [{ ...normalized, start: match.index, end: match.index + match[0].length, excerpt: match[0] }];
  });
}

function nearlyEqual(left: number, right: number): boolean {
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= scale * 1e-9;
}

function answerLeakViolations(text: string, hiddenAnswer?: string): StyleViolation[] {
  if (!hiddenAnswer?.trim()) return [];
  const normalizedText = normaliseForLeakCheck(text);
  const normalizedAnswer = normaliseForLeakCheck(hiddenAnswer);
  if (normalizedAnswer.length >= 2 && normalizedText.includes(normalizedAnswer)) {
    const plainIndex = text.toLocaleLowerCase().indexOf(hiddenAnswer.toLocaleLowerCase());
    return [
      {
        ruleId: "ANS001_FINAL_ANSWER_IN_HINT",
        severity: "hard",
        category: "answer_leakage",
        message: "The hint contains the hidden answer. Replace it with the next reasoning step.",
        start: Math.max(0, plainIndex),
        end: Math.max(0, plainIndex) + hiddenAnswer.length,
        excerpt: plainIndex >= 0 ? text.slice(plainIndex, plainIndex + hiddenAnswer.length) : hiddenAnswer,
      },
    ];
  }

  const expected = measurements(hiddenAnswer).at(-1);
  if (!expected) return [];
  const equivalent = measurements(text).find(
    (candidate) => candidate.dimension === expected.dimension && nearlyEqual(candidate.value, expected.value),
  );
  if (!equivalent) return [];
  return [
    {
      ruleId: "ANS005_EQUIVALENT_NUMERIC_ANSWER",
      severity: "hard",
      category: "answer_leakage",
      message: "The hint gives a numerically equivalent form of the hidden answer. Replace it with the next reasoning step.",
      start: equivalent.start,
      end: equivalent.end,
      excerpt: equivalent.excerpt,
    },
  ];
}

function placeholderViolations(text: string): StyleViolation[] {
  const pattern = /\b(?:TODO|TBD|lorem ipsum|insert (?:text|image|example) here|placeholder)\b/giu;
  return [...text.matchAll(pattern)].flatMap((match) => {
    if (match.index === undefined) return [];
    return [{
      ruleId: "QLT001_PLACEHOLDER_CONTENT",
      severity: "hard" as const,
      category: "quality",
      message: "Replace placeholder content before the text can be shown to a learner.",
      start: match.index,
      end: match.index + match[0].length,
      excerpt: match[0],
    }];
  });
}

export function lintText(text: string, options: LintOptions = {}): WritingLintResponse {
  const wordCount = words(text).length;
  let violations = PATTERN_RULES.flatMap((rule) => matchRule(text, rule));
  violations.push(...detectTriads(text));
  violations.push(...emDashViolations(text, wordCount));
  violations.push(...headingDensityViolation(text, wordCount));
  violations.push(...repeatedSentenceOpeningViolations(text));
  violations.push(...answerLeakViolations(text, options.hiddenAnswer));
  violations.push(...placeholderViolations(text));

  if (options.context === "feedback") {
    violations = violations.map((item) =>
      item.ruleId === "PRA001_GENERIC_PRAISE" ? { ...item, severity: "hard" as const } : item,
    );
  }
  violations = repeatedTransitionHardening(violations).sort((a, b) => a.start - b.start);

  return {
    passed: violations.every((item) => item.severity !== "hard"),
    violations,
    metrics: {
      words: wordCount,
      sentences: sentences(text).length,
      headings: headings(text).length,
      emDashes: (text.match(/—/g) ?? []).length,
    },
  };
}
