import type { PatternRule } from "./helpers.js";

export const PATTERN_RULES: PatternRule[] = [
  {
    ruleId: "NEG001_NOT_ONLY_BUT_ALSO",
    severity: "hard",
    category: "negative_parallelism",
    message: "State both claims directly. Remove the 'not only ... but also' frame.",
    pattern: /\bnot\s+(?:only|merely)\b[\s\S]{0,120}?\bbut(?:\s+also)?\b/giu,
  },
  {
    ruleId: "NEG002_NOT_JUST_BUT",
    severity: "hard",
    category: "negative_parallelism",
    message: "State the intended claim directly. Remove the 'not just ... but' frame.",
    pattern: /\bnot\s+just\b[\s\S]{0,120}?\bbut\b/giu,
  },
  {
    ruleId: "NEG003_NOT_X_IT_IS_Y",
    severity: "hard",
    category: "negative_parallelism",
    message: "Replace the rhetorical negation with a direct explanation.",
    pattern:
      /\b(?:it|this|that|the\s+(?:goal|point|idea|purpose|lesson))(?:(?:\s+(?:is|was)\s+(?:not|no))|(?:\s+(?:isn(?:'|’)t|wasn(?:'|’)t))|(?:['’]s\s+not))\b[^.!?;]{1,100}(?:(?:[;.!?]\s*)(?:it|this|that|the\s+(?:goal|point|idea|purpose|lesson))(?:(?:\s+(?:is|was))|(?:['’]s))\b|,\s*but\b)/giu,
  },
  {
    ruleId: "NEG004_MORE_THAN_X_IT_IS_Y",
    severity: "warning",
    category: "negative_parallelism",
    message: "State the claim directly instead of using a 'more than X' rhetorical frame.",
    pattern: /\bmore\s+than\b[^.!?;]{1,100}[,;]\s*(?:it|this|that|[\p{L}][^,;.!?]{0,35})\s+(?:is|was|are|were)\b/giu,
  },
  {
    ruleId: "CAN001_CANNED_OPENING",
    severity: "hard",
    category: "canned_language",
    message: "Begin with the subject matter rather than a generic opening.",
    pattern: /^(?:great question|excellent question|certainly|absolutely|of course|let(?:'|’)s dive in|in today(?:'|’)s world)\b[^.!?]*[.!?]?/giu,
  },
  {
    ruleId: "CAN002_CANNED_CONCLUSION",
    severity: "warning",
    category: "canned_language",
    message: "End when the explanation is complete. Remove the generic conclusion.",
    pattern: /\b(?:in conclusion|to sum up|ultimately,?\s+it is clear that|all in all|at the end of the day)\b/giu,
  },
  {
    ruleId: "PRA001_GENERIC_PRAISE",
    severity: "warning",
    category: "generic_praise",
    message: "Give specific feedback tied to the learner's work.",
    pattern: /\b(?:great job|well done|excellent work|fantastic effort|you(?:'|’)re doing great|good thinking)\b[!.]?/giu,
  },
  {
    ruleId: "HYP001_INFLATED_IMPORTANCE",
    severity: "warning",
    category: "inflated_language",
    message: "Use concrete language instead of announcing importance.",
    pattern: /\b(?:crucial|pivotal|game[- ]changing|revolutionary|transformative|profound|delve|tapestry|landscape)\b/giu,
  },
  {
    ruleId: "REP001_REPEATED_TRANSITION",
    severity: "warning",
    category: "repetition",
    message: "Vary or remove repeated transition phrases.",
    pattern: /\b(?:moreover|furthermore|additionally|however|therefore|consequently)\b/giu,
  },
];
