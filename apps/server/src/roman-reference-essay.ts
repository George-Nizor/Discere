import type {
  Question,
  RomanReferenceEssayContent,
  RomanReferenceEssayDimension,
  RomanReferenceEssayEvidenceId,
  RomanReferenceEssayFeedback,
  RomanReferenceEssayState,
} from "@discere/contracts";

export const ROMAN_REFERENCE_ESSAY_CONTENT: Omit<RomanReferenceEssayContent, "evidence"> & {
  evidence: RomanReferenceEssayContent["evidence"];
} = {
  id: "transformation",
  prompt: "What mattered more to Rome's transformation: its size or its political conflicts?",
  instruction: "Make a claim. Use three pieces of evidence. Address one complication.",
  minWords: 80,
  maxWords: 1_200,
  rubric: [
    {
      id: "claim",
      label: "Claim",
      description:
        "Takes a clear position on size, political conflict, or a qualified relationship.",
    },
    {
      id: "evidence",
      label: "Evidence",
      description: "Uses at least three accurate examples from different moments in Roman history.",
    },
    {
      id: "reasoning",
      label: "Reasoning",
      description: "Explains how the evidence supports the comparison rather than listing events.",
    },
    {
      id: "complication",
      label: "Complication",
      description:
        "Addresses a limit, exception, or interaction between size and political conflict.",
    },
    {
      id: "accuracy",
      label: "Accuracy",
      description:
        "Keeps the chronology and the distinction between western and eastern Rome clear.",
    },
  ],
  evidence: [
    {
      id: "augustus-27-bce",
      date: "27 BCE",
      title: "Augustus",
      summary:
        "Republican offices remained, but Augustus controlled the army, major provinces, and the direction of government.",
      visual: "portrait",
      sourceIds: ["wikipedia-augustus", "openstax-world-history-rome"],
    },
    {
      id: "extent-117-ce",
      date: "117 CE",
      title: "Greatest extent",
      summary:
        "Under Trajan, Roman rule reached its largest territorial extent, increasing the frontiers and communities the state had to govern.",
      visual: "map",
      sourceIds: ["commons-roman-empire-extent-map", "wikipedia-roman-empire"],
    },
    {
      id: "third-century-crisis",
      date: "235-284 CE",
      title: "Third-century crisis",
      summary:
        "Frequent imperial claimants, civil wars, frontier wars, and currency problems made government unstable.",
      visual: "fracture",
      sourceIds: ["openstax-world-history-eastward-shift"],
    },
    {
      id: "tetrarchy-284-ce",
      date: "284 CE",
      title: "Tetrarchy",
      summary:
        "Diocletian shared rule among two senior and two junior emperors, each working from a regional centre.",
      visual: "tetrarchy",
      sourceIds: ["openstax-world-history-eastward-shift"],
    },
    {
      id: "constantinople-330-ce",
      date: "330 CE",
      title: "Constantinople",
      summary:
        "Constantine established an imperial capital closer to eastern trade routes and major military frontiers.",
      visual: "city",
      sourceIds: ["openstax-world-history-eastward-shift"],
    },
    {
      id: "western-deposition-476-ce",
      date: "476 CE",
      title: "Western deposition",
      summary:
        "The western imperial court ended, while Roman imperial government continued from Constantinople.",
      visual: "continuity",
      sourceIds: ["wikipedia-fall-western-empire", "openstax-world-history-eastward-shift"],
    },
  ],
};

export function blankRomanReferenceEssay(): RomanReferenceEssayState {
  return {
    draft: "",
    claimPlan: "",
    evidencePlan: [],
    complicationPlan: "",
    status: "editing",
    mode: null,
    sourcesOpened: false,
    submissions: [],
    finished: false,
  };
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

function sentences(text: string): string[] {
  return (text.trim().match(/[^.!?]+(?:[.!?]+|$)/g) ?? [])
    .map((sentence) => sentence.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function shorten(sentence: string): string {
  return sentence.length <= 500 ? sentence : `${sentence.slice(0, 497)}...`;
}

/**
 * Picks a sentence to quote back, preferring one no other rubric row has already used.
 *
 * Five rows quoting the same two sentences reads as carelessness, and it is: the learner is being
 * shown three times that the assessor found the same sentence first. Where a row genuinely has
 * nothing of its own to point at it quotes nothing, and its comment does the work alone.
 *
 * `patterns` is a preference order, strongest first. That matters for the complication row, where
 * a sentence opening "Although" is a concession and a sentence containing "while holding the
 * powers" is not — and the second used to win by being earlier in the essay.
 */
function pickExcerpt(
  items: readonly string[],
  patterns: readonly RegExp[],
  used: Set<string>,
): string | null {
  for (const pattern of patterns) {
    const fresh = items.find((sentence) => pattern.test(sentence) && !used.has(sentence));
    if (fresh) {
      used.add(fresh);
      return shorten(fresh);
    }
  }
  return null;
}

const EVIDENCE_PATTERNS: ReadonlyArray<{
  id: RomanReferenceEssayEvidenceId;
  pattern: RegExp;
}> = [
  { id: "augustus-27-bce", pattern: /\b(?:augustus|octavian|27\s*bce)\b/i },
  { id: "extent-117-ce", pattern: /\b(?:trajan|117\s*ce|greatest extent|largest extent)\b/i },
  {
    id: "third-century-crisis",
    pattern: /\b(?:third[- ]century crisis|crisis of the third century|235|civil wars?)\b/i,
  },
  { id: "tetrarchy-284-ce", pattern: /\b(?:diocletian|tetrarchy|four emperors|284\s*ce)\b/i },
  { id: "constantinople-330-ce", pattern: /\b(?:constantinople|330\s*ce|constantine)\b/i },
  {
    id: "western-deposition-476-ce",
    pattern: /\b(?:476\s*ce|romulus augustulus|odoacer|western emperor|eastern roman)\b/i,
  },
];

const CLAIM_PATTERN =
  /\b(?:size|territor|expansion|political conflict|civil war|succession).{0,100}\b(?:more|greater|main|primary|decisive|outweigh|mattered)|\b(?:more|greater|main|primary|decisive|outweigh|mattered).{0,100}\b(?:size|territor|expansion|political conflict|civil war|succession)/i;
const REASONING_PATTERN =
  /\b(?:because|therefore|which meant|as a result|so that|allowed|caused|led to|made it|weakened|strengthened)\b/i;
/** A sentence that opens with a concession is one. A sentence merely containing "while" may not be. */
const LEADING_COMPLICATION =
  /^\s*(?:although|though|however|yet|even though|on the other hand|admittedly|granted|that said)\b/i;
const COMPLICATION_PATTERN =
  /\b(?:although|however|while|yet|even though|on the other hand|but)\b/i;
const FALSE_CLAIMS = [
  /\b(?:all|entire)\s+(?:of\s+)?rome\s+(?:ended|fell|collapsed)\s+in\s+476\b/i,
  /\baugustus\b.{0,60}\b117\s*ce\b/i,
  /\b395\s*ce\b.{0,60}\bwestern emperor (?:was )?(?:removed|deposed)\b/i,
];

function dimension(
  id: RomanReferenceEssayDimension["id"],
  label: string,
  status: RomanReferenceEssayDimension["status"],
  comment: string,
  excerpt: string | null,
): RomanReferenceEssayDimension {
  return { id, label, status, comment, excerpt };
}

export function assessRomanReferenceEssay(input: {
  content: string;
  revision: number;
  submittedAt: string;
}): RomanReferenceEssayFeedback {
  const items = sentences(input.content);
  const usedEvidenceIds = EVIDENCE_PATTERNS.filter(({ pattern }) =>
    items.some((sentence) => pattern.test(sentence)),
  ).map(({ id }) => id);
  const reasoningExcerpts = items.filter((sentence) => REASONING_PATTERN.test(sentence));
  const inaccurateExcerpt =
    items.find((sentence) => FALSE_CLAIMS.some((pattern) => pattern.test(sentence))) ?? null;

  // Whether a rubric dimension is met is a fact about the essay, so it is decided here, over the
  // whole response, before any sentence is spoken for. Deciding it from whichever quote was left
  // over would mark a real complication missing because the reasoning row got there first.
  const hasClaim = items.some((sentence) => CLAIM_PATTERN.test(sentence));
  const hasComplication = items.some((sentence) => COMPLICATION_PATTERN.test(sentence));

  // Quotes are then allocated most-specific first, which is not the order they are displayed in.
  // Almost any sentence can illustrate reasoning; only one usually opens with a concession, so
  // reasoning goes last and takes what is left.
  const quoted = new Set<string>();
  if (inaccurateExcerpt) quoted.add(inaccurateExcerpt);
  const anyEvidence = EVIDENCE_PATTERNS.map(({ pattern }) => pattern);
  const complicationExcerpt = pickExcerpt(
    items,
    [LEADING_COMPLICATION, COMPLICATION_PATTERN],
    quoted,
  );
  const claimExcerpt = pickExcerpt(items, [CLAIM_PATTERN], quoted);
  const evidenceExcerpt = pickExcerpt(items, anyEvidence, quoted);
  const reasoningExcerpt = pickExcerpt(items, [REASONING_PATTERN], quoted);
  const accuracyExcerpt = inaccurateExcerpt
    ? shorten(inaccurateExcerpt)
    : pickExcerpt(items, anyEvidence, quoted);

  const dimensions: RomanReferenceEssayDimension[] = [
    dimension(
      "claim",
      "Claim",
      hasClaim ? "met" : "missing",
      hasClaim
        ? "The comparison has a clear position."
        : "State whether size or political conflict mattered more, then name the basis for that judgement.",
      claimExcerpt,
    ),
    dimension(
      "evidence",
      "Evidence",
      usedEvidenceIds.length >= 3 ? "met" : usedEvidenceIds.length > 0 ? "developing" : "missing",
      usedEvidenceIds.length >= 3
        ? `The response uses ${usedEvidenceIds.length} distinct historical examples.`
        : `The response uses ${usedEvidenceIds.length} distinct example${usedEvidenceIds.length === 1 ? "" : "s"}; the task asks for three.`,
      evidenceExcerpt,
    ),
    dimension(
      "reasoning",
      "Reasoning",
      reasoningExcerpts.length >= 2
        ? "met"
        : reasoningExcerpts.length === 1
          ? "developing"
          : "missing",
      reasoningExcerpts.length >= 2
        ? "Several sentences explain why the evidence changes the comparison."
        : "Link each example to the claim with a cause, consequence, or limit.",
      reasoningExcerpt,
    ),
    dimension(
      "complication",
      "Complication",
      hasComplication ? "met" : "missing",
      hasComplication
        ? "The response recognises a limit or interaction in the argument."
        : "Add one sentence showing where the other factor still mattered or where the claim has a limit.",
      complicationExcerpt,
    ),
    dimension(
      "accuracy",
      "Accuracy",
      inaccurateExcerpt ? "missing" : usedEvidenceIds.length > 0 ? "met" : "developing",
      inaccurateExcerpt
        ? "This sentence collapses distinct dates or treats western change as the end of all Roman government."
        : "No conflict with the checked chronology was detected in the cited examples.",
      accuracyExcerpt,
    ),
  ];

  const unmet = dimensions.filter((item) => item.status !== "met");
  const summary =
    unmet.length === 0
      ? "The argument states a position, supports it with several dated examples, explains their significance, and qualifies the comparison."
      : `The draft has ${5 - unmet.length} of the 5 rubric dimensions in place. The feedback below identifies the first revision that would change the argument most.`;
  const nextStep =
    dimensions.find((item) => item.status === "missing")?.comment ??
    dimensions.find((item) => item.status === "developing")?.comment ??
    "Read the final version once for sentence-level clarity before finishing.";

  return {
    revision: input.revision,
    submittedAt: input.submittedAt,
    wordCount: wordCount(input.content),
    content: input.content,
    summary,
    nextStep,
    dimensions,
    usedEvidenceIds,
  };
}

/**
 * The sources the essay is allowed to draw on. The evidence pack cites these, so a tutor bound to
 * the essay is given the same list and nothing wider.
 */
export const ROMAN_REFERENCE_ESSAY_SOURCE_IDS: readonly string[] = [
  ...new Set(ROMAN_REFERENCE_ESSAY_CONTENT.evidence.flatMap((item) => item.sourceIds)),
];

/** Only the prose the server wrote. Learner excerpts are quoted evidence, not generated text. */
export function romanReferenceEssayFeedbackProse(feedback: RomanReferenceEssayFeedback): string {
  return [
    feedback.summary,
    ...feedback.dimensions.map((item) => item.comment),
    feedback.nextStep,
  ].join("\n\n");
}

const DRAFT_OFFERS: readonly RegExp[] = [
  /here(?:'s| is)\s+(?:a|an|your|the)\s+(?:draft|paragraph|opening|introduction|thesis|claim|version|rewrite|essay)/i,
  /you (?:could|might|can|should) write\s*[:,]/i,
  /(?:try|use|copy|paste) (?:this|the following)\b/i,
  /your (?:essay|paragraph|claim|thesis|opening|introduction) (?:could|might|should) (?:say|read|be|start)/i,
  /(?:i(?:'ve| have) )?(?:written|drafted|rewritten) (?:it|this|that|your \w+) for you/i,
  /(?:rewritten|revised|rephrased) (?:version|as)\s*[:,]/i,
  /(?:something|word it) like (?:this|the following)\s*[:,]/i,
];

/** A run of words inside quotation marks, which is how handed-over wording usually arrives. */
const QUOTED_SPAN = /["“”']([^"“”']{80,})["“”']/g;

function longestQuotedWordCount(raw: string): number {
  let longest = 0;
  for (const match of raw.matchAll(QUOTED_SPAN)) {
    const span = match[1];
    if (!span) continue;
    longest = Math.max(longest, span.trim().split(/\s+/).length);
  }
  return longest;
}

/**
 * The essay has no hidden answer, so the question guard does not transfer. What it has is work the
 * learner is meant to do, which makes the boundary different in kind: the tutor may explain any
 * history it likes, and may not hand back prose the learner could submit as their own.
 *
 * Two signals together make a reply submittable. An offer to supply wording, and enough wording
 * after it to be an answer. Either alone is ordinary teaching — "you could write about the
 * tetrarchy here" is a suggestion, and a long explanation of the tetrarchy is a lesson. A
 * sufficiently long quoted span counts on its own, because nothing else needs sixty quoted words.
 *
 * The mode makes no difference. Direct grants a reveal for a question that has an answer to
 * reveal; no mode turns the learner's own argument into something the tutor may write for them.
 */
export function romanReferenceTutorReplyWritesEssay(raw: string): boolean {
  if (longestQuotedWordCount(raw) >= 60) return true;
  // Matched against the original text so the offset still indexes `raw`.
  const offers = DRAFT_OFFERS.map((pattern) => raw.search(pattern)).filter((index) => index >= 0);
  if (offers.length === 0) return false;
  const after = raw.slice(Math.min(...offers));
  if (after.trim().split(/\s+/).length < 45) return false;
  const readsAsArgument =
    CLAIM_PATTERN.test(after) ||
    EVIDENCE_PATTERNS.filter(({ pattern }) => pattern.test(after)).length >= 2;
  return readsAsArgument || longestQuotedWordCount(after) >= 25;
}

export const ROMAN_REFERENCE_ESSAY_CONCEPT_IDS: readonly string[] = [
  "augustus-principate",
  "roman-expansion",
  "fall-and-legacy",
];

/**
 * The shape the shared tutor gate expects, for a task that has no answer key.
 *
 * `exampleAnswer` is deliberately empty: there is no single correct essay, so there is no string
 * the reply may not resemble. `answerBoundaryFor` reads that emptiness as "no boundary" and the
 * essay's own guard does the work instead.
 */
export function privateEssayQuestionForRomanReference(): Question {
  return {
    id: `recovery-v2:essay:${ROMAN_REFERENCE_ESSAY_CONTENT.id}`,
    conceptIds: [...ROMAN_REFERENCE_ESSAY_CONCEPT_IDS],
    prompt: ROMAN_REFERENCE_ESSAY_CONTENT.prompt,
    responseType: "long_text",
    difficulty: 3,
    hints: [],
    answerAuthority: { kind: "text", acceptedIdeas: [], rejectedIdeas: [], exampleAnswer: "" },
    sourceIds: [...ROMAN_REFERENCE_ESSAY_SOURCE_IDS],
  };
}
