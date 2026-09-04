import type {
  Question,
  RomanReferenceQuestionContent,
  RomanReferenceQuestionHint,
  RomanReferenceQuestionId,
  RomanReferenceQuestionResponse,
  RomanReferenceQuestionResult,
  RomanReferenceTurningPointId,
  TutoringMode,
} from "@discere/contracts";
import { RomanReferenceQuestionContentSchema } from "@discere/contracts";

const CORRECT_TURNING_POINT_ORDER = [
  "augustus",
  "extent",
  "division",
  "deposition",
] as const satisfies readonly RomanReferenceTurningPointId[];

const QUESTION_CONTENT = [
  {
    id: "turning-points",
    ordinal: 1,
    kind: "ordering",
    prompt: "Put these turning points in order",
    instruction: "Arrange them from earliest to latest.",
    sourceIds: [
      "wikipedia-augustus",
      "wikipedia-roman-empire",
      "wikipedia-fall-western-empire",
      "openstax-world-history-eastward-shift",
    ],
    // A stable scramble keeps the public payload from becoming the answer key.
    options: [
      { id: "extent", label: "Roman territory reaches its greatest extent" },
      { id: "deposition", label: "The last western emperor is removed" },
      { id: "augustus", label: "Octavian receives the name Augustus" },
      {
        id: "division",
        label: "The empire passes to separate eastern and western rulers",
      },
    ],
  },
  {
    id: "476-continuity",
    ordinal: 2,
    kind: "selection",
    prompt: "Why is 476 CE an incomplete date for the end of Rome?",
    sourceIds: ["wikipedia-fall-western-empire", "wikipedia-roman-empire"],
    choices: [
      { id: "ended-everywhere", label: "The empire disappeared everywhere at the same moment." },
      {
        id: "western-change",
        label: "It marks a western political change while Roman government continued in the east.",
      },
      { id: "augustus-created", label: "It was the year Augustus created the empire." },
      { id: "greatest-extent", label: "It was the year Rome reached its greatest extent." },
    ],
  },
  {
    id: "map-117",
    ordinal: 3,
    kind: "multi_select",
    prompt: "Select the two regions that show Rome’s reach from northwest to east in 117 CE.",
    mapDescription:
      "The shaded territory surrounds the Mediterranean. Its northwestern edge crosses the Channel beyond Gaul, while its far eastern edge reaches beyond Syria.",
    sourceIds: ["commons-roman-empire-extent-map", "wikipedia-roman-empire"],
    // Correct choices are separated so position does not hint at the private set.
    choices: [
      { id: "scandinavia", label: "Scandinavia" },
      { id: "britain", label: "Britain" },
      { id: "india", label: "India" },
      { id: "mesopotamia", label: "Mesopotamia" },
    ],
    selectionCount: 2,
  },
  {
    id: "two-sentence",
    ordinal: 4,
    kind: "free_response",
    prompt: "How did Rome change by 117 CE?",
    sourceIds: ["wikipedia-augustus", "wikipedia-roman-empire", "commons-roman-empire-extent-map"],
    instruction:
      "Write exactly two sentences: one on territory, one on what Augustus kept and controlled.",
    maxLength: 2_000,
  },
] as const;

export const ROMAN_REFERENCE_QUESTION_CONTENT: readonly RomanReferenceQuestionContent[] =
  QUESTION_CONTENT.map((question) => RomanReferenceQuestionContentSchema.parse(question));

const MODE_HINTS: Record<
  RomanReferenceQuestionId,
  Partial<Record<Exclude<TutoringMode, "exam" | "direct">, readonly string[]>>
> = {
  "turning-points": {
    coach: [
      "Anchor the sequence with Augustus at the beginning and the western deposition at the end.",
      "For the middle pair, ask whether Rome reached its greatest extent before or after power passed to separate eastern and western rulers.",
    ],
    assisted: [
      "Fix the first two positions: Augustus’s settlement came before the 117 CE territorial maximum. Work out the two later events.",
    ],
  },
  "476-continuity": {
    coach: [
      "Decide whether the date applies to the whole Roman world or to one imperial court.",
      "Use the east–west diagram. The west changes in 476; read what happens on the other side.",
    ],
    assisted: [
      "Remove the choices tied to Augustus and maximum extent. Those belong to 27 BCE and 117 CE.",
      "476 CE concerns the last emperor in the west. Compare the remaining choices by what each says happened in the east.",
    ],
  },
  "map-117": {
    coach: [
      "Follow the edge of the shaded area. Labels near the map are not all inside Roman territory.",
      "Look for one end across the Channel and the other beyond the eastern Mediterranean.",
    ],
    assisted: [
      "Britain is the northwestern end. Keep it, then trace the shading eastward for the second choice.",
    ],
  },
  "two-sentence": {
    coach: [
      "Give each sentence one job. Read the map for one; compare republican forms with actual power for the other.",
      "For the map, ask whether the territory grew or shrank. For Augustus, separate what Romans could still see from who made the main decisions.",
    ],
    assisted: [
      "Use this first sentence, then write the second yourself: “Roman territory expanded after 27 BCE and reached its greatest extent under Trajan in 117 CE.”",
      "Complete this without copying the lesson: “Augustus kept ___ in place, but he held ___.”",
    ],
  },
};

const DIRECT_REVEAL_COPY: Record<RomanReferenceQuestionId, string> = {
  "turning-points":
    "Octavian receives the name Augustus; Roman territory reaches its greatest extent; the empire passes to separate eastern and western rulers; the last western emperor is removed.",
  "476-continuity":
    "It marks a western political change while Roman government continued in the east. 476 CE is useful for the western court. The Eastern Roman Empire continued from Constantinople.",
  "map-117":
    "Britain and Mesopotamia. In 117 CE, Roman territory stretched between them and surrounded the Mediterranean.",
  "two-sentence":
    "Roman territory expanded substantially after 27 BCE and reached its greatest extent under Trajan in 117 CE. Augustus kept republican offices in place, but he held the powers that made him the dominant ruler.",
};

const CORRECT_FEEDBACK: Record<RomanReferenceQuestionId, string> = {
  "turning-points":
    "The order is 27 BCE, 117 CE, 395 CE, then 476 CE. Rome reached its territorial maximum before power passed to separate eastern and western rulers; the western deposition came later.",
  "476-continuity":
    "476 CE is useful for the western court. The Eastern Roman Empire continued from Constantinople.",
  "map-117":
    "Britain marks the northwestern reach; Mesopotamia marks the eastern reach. Roman territory surrounded the Mediterranean between them.",
  "two-sentence":
    "One sentence identifies the territorial maximum in 117 CE. The other distinguishes republican offices from the powers Augustus held.",
};

const CONTINUITY_WRONG_FEEDBACK = {
  "ended-everywhere":
    "The deposition affected the western court, not every Roman government. The Eastern Roman Empire continued from Constantinople.",
  "augustus-created":
    "Augustus received his title in 27 BCE. In 476 CE, the last western emperor was removed while Roman government continued in the east.",
  "greatest-extent":
    "Rome reached its greatest extent under Trajan in 117 CE. The 476 CE date concerns the western court, while Roman government continued in the east.",
} as const;

const TURNING_POINT_RELATIONSHIPS = [
  {
    before: "augustus",
    after: "extent",
    text: "Octavian received the name Augustus in 27 BCE, before Rome reached its greatest extent in 117 CE.",
  },
  {
    before: "extent",
    after: "division",
    text: "Rome reached its greatest extent in 117 CE, before power passed to separate eastern and western rulers in 395 CE.",
  },
  {
    before: "division",
    after: "deposition",
    text: "Power passed to separate eastern and western rulers in 395 CE, before the last western emperor was removed in 476 CE.",
  },
] as const;

const Q4_FEEDBACK = {
  ungradable: "Write two complete sentences before checking.",
  wrongCount: (count: number) =>
    `Both historical ideas are present, but the response has ${count} sentences. Give the territorial change one sentence and Augustus’s settlement the other.`,
  missingTerritory:
    "The Augustus comparison is present. The other sentence needs the territorial change between 27 BCE and the 117 CE maximum.",
  missingPolitics:
    "The territorial change is present. The other sentence needs both sides of Augustus’s settlement: republican offices remained, while effective power rested with him.",
  augustusContradiction:
    "Augustus did not abolish every republican office in 27 BCE. Revise that sentence to distinguish the forms that remained from the powers he controlled.",
  mapContradiction:
    "The 117 CE map shows Rome at its greatest territorial extent, not a contraction. Correct that comparison first.",
  neither:
    "The response does not yet answer either comparison. Use the map for territorial change and the Augustus page for political change.",
} as const;

export interface RomanReferenceAssessment {
  result: RomanReferenceQuestionResult;
  feedback: string;
}

function assessTurningPoints(
  response: Extract<RomanReferenceQuestionResponse, { kind: "ordering" }>,
): RomanReferenceAssessment {
  const correctRelations = TURNING_POINT_RELATIONSHIPS.filter(
    ({ before, after }) => response.order.indexOf(before) < response.order.indexOf(after),
  ).length;
  if (correctRelations === 3) {
    return { result: "correct", feedback: CORRECT_FEEDBACK["turning-points"] };
  }
  const broken = TURNING_POINT_RELATIONSHIPS.find(
    ({ before, after }) => response.order.indexOf(before) > response.order.indexOf(after),
  );
  if (!broken) throw new Error("The turning-point authority has no broken relationship.");
  return correctRelations === 2
    ? {
        result: "partly_correct",
        feedback: `Two date relationships are in place. ${broken.text} Move those cards and check the sequence again.`,
      }
    : {
        result: "incorrect",
        feedback: `Start with the first broken relationship: ${broken.text} Move those cards, then check the rest.`,
      };
}

function assessContinuity(
  response: Extract<RomanReferenceQuestionResponse, { kind: "selection" }>,
): RomanReferenceAssessment {
  if (response.choiceId === "western-change") {
    return { result: "correct", feedback: CORRECT_FEEDBACK["476-continuity"] };
  }
  return {
    result: "incorrect",
    feedback: CONTINUITY_WRONG_FEEDBACK[response.choiceId],
  };
}

function assessMap(
  response: Extract<RomanReferenceQuestionResponse, { kind: "multi_select" }>,
): RomanReferenceAssessment {
  const accepted = new Set(["britain", "mesopotamia"]);
  const correct = response.choiceIds.filter((choiceId) => accepted.has(choiceId));
  if (correct.length === 2) {
    return { result: "correct", feedback: CORRECT_FEEDBACK["map-117"] };
  }
  if (correct.length === 1) {
    const correctChoice = correct[0];
    const wrongChoice = response.choiceIds.find((choiceId) => !accepted.has(choiceId));
    if (correctChoice === undefined || wrongChoice === undefined) {
      throw new Error(
        "A partly correct map response must contain one correct and one wrong region.",
      );
    }
    const labels = new Map([
      ["britain", "Britain"],
      ["mesopotamia", "Mesopotamia"],
      ["scandinavia", "Scandinavia"],
      ["india", "India"],
    ]);
    const correctLabel = labels.get(correctChoice);
    const wrongLabel = labels.get(wrongChoice);
    if (correctLabel === undefined || wrongLabel === undefined) {
      throw new Error("A map response used a region without an authored label.");
    }
    return {
      result: "partly_correct",
      feedback: `${correctLabel} marks one end. ${wrongLabel} lies outside the shaded territory; trace the boundary to the opposite end and replace it.`,
    };
  }
  return {
    result: "incorrect",
    feedback:
      "Both selected regions lie outside the shaded territory. Trace the shaded boundary from the northwest to its far eastern edge.",
  };
}

function normalise(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function countSentences(text: string): number {
  const segments = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text)];
  const segmented = segments.filter((segment) => /[a-z0-9]/i.test(segment.segment)).length;
  if (segmented > 1) return segmented;
  const lineSentences = text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => /[a-z0-9]/i.test(line)).length;
  return Math.max(segmented, lineSentences);
}

interface TwoSentenceChecks {
  sentenceCount: number;
  territoryGrowth: boolean;
  territorialMaximum: boolean;
  republicanContinuity: boolean;
  concentratedPower: boolean;
  contradiction: "augustus" | "map" | null;
}

function twoSentenceChecks(raw: string): TwoSentenceChecks {
  const text = normalise(raw);
  const augustusContradiction = hasAny(text, [
    /augustus (?:abolished|ended|eliminated) (?:every |all )?(?:republican offices?|the senate|senate)/,
    /(?:every |all )?(?:republican offices?|the senate|senate) (?:were )?(?:abolished|ended|eliminated) by augustus/,
    /(?:the )?senate (?:retained|kept|held) (?:the )?(?:decisive|real) power[^.]{0,100}augustus (?:did not|didn't|never)/,
  ]);
  const mapContradiction = hasAny(text, [
    /(?:roman |rome's )?territor\w* (?:shrank|contracted)/,
    /(?:rome|the roman empire|the empire) (?:ended|fell) (?:in|by) 117/,
  ]);

  const growthNegated = hasAny(text, [
    /(?:did not|didn't|never) (?:expand|spread|grow|increase)/,
    /(?:was not|wasn't) larger/,
  ]);
  const maximumNegated = hasAny(text, [
    /(?:did not|didn't|never) reach (?:its )?(?:greatest|largest|maximum)/,
    /(?:was not|wasn't) (?:the )?(?:greatest|largest|maximum)/,
  ]);
  const continuityNegated = hasAny(text, [
    /augustus (?:did not|didn't|never) (?:keep|retain|preserve)/,
    /(?:republican offices?|republican forms?|elections|the senate|senate) (?:did not|didn't|never) (?:remain|continue)/,
  ]);
  const powerNegated = hasAny(text, [
    /augustus (?:did not|didn't|never) (?:hold|control|concentrate|command)/,
    /augustus (?:had|held) no (?:real |effective )?(?:power|control)/,
  ]);

  const maximumPhrase = hasAny(text, [
    /(?:greatest|largest|maximum) (?:territorial )?(?:extent|reach|size)/,
    /territorial (?:maximum|peak)/,
  ]);
  const dateOrTrajan = /\b117\b/.test(text) || /\btrajan\b/.test(text);
  const augustusOrRuler = /\baugustus\b/.test(text) || /\bone ruler\b/.test(text);

  return {
    sentenceCount: countSentences(raw),
    territoryGrowth:
      !growthNegated &&
      hasAny(text, [
        /territor\w* (?:expanded|spread farther|grew|became larger|increased its reach)/,
        /(?:rome|the roman empire|the empire) (?:expanded|spread farther|grew|became larger|increased its reach)/,
        /(?:expanded|spread farther|grew|became larger|increased its reach) (?:roman )?territor\w*/,
      ]),
    territorialMaximum: !maximumNegated && maximumPhrase && dateOrTrajan,
    republicanContinuity:
      !continuityNegated &&
      hasAny(text, [
        /(?:republican offices?|republican forms?|elections|the senate|senate) (?:remained|continued|were kept|stayed)/,
        /(?:kept|continued|preserved|retained) (?:the )?(?:republican offices?|republican forms?|elections|senate)/,
      ]),
    concentratedPower:
      !powerNegated &&
      augustusOrRuler &&
      hasAny(text, [
        /(?:held|controlled|concentrated|had|commanded|directed) (?:the )?(?:real |effective |practical )?(?:power|control|army|provinces|direction of government)/,
        /(?:dominant|effective) ruler/,
        /(?:real|effective|practical) power (?:rested|lay|was concentrated) (?:with|in) (?:augustus|one ruler|him)/,
      ]),
    contradiction: augustusContradiction ? "augustus" : mapContradiction ? "map" : null,
  };
}

function assessTwoSentence(
  response: Extract<RomanReferenceQuestionResponse, { kind: "free_response" }>,
): RomanReferenceAssessment {
  const text = response.text.trim();
  if (normalise(text) === "") {
    return { result: "ungradable", feedback: Q4_FEEDBACK.ungradable };
  }
  const checks = twoSentenceChecks(text);
  if (checks.contradiction === "augustus") {
    return { result: "incorrect", feedback: Q4_FEEDBACK.augustusContradiction };
  }
  if (checks.contradiction === "map") {
    return { result: "incorrect", feedback: Q4_FEEDBACK.mapContradiction };
  }

  const concepts = [
    checks.territoryGrowth,
    checks.territorialMaximum,
    checks.republicanContinuity,
    checks.concentratedPower,
  ];
  const conceptCount = concepts.filter(Boolean).length;
  if (conceptCount === 4 && checks.sentenceCount === 2) {
    return { result: "correct", feedback: CORRECT_FEEDBACK["two-sentence"] };
  }
  if (conceptCount === 4) {
    return {
      result: "partly_correct",
      feedback: Q4_FEEDBACK.wrongCount(checks.sentenceCount),
    };
  }
  if (conceptCount <= 1) {
    return { result: "incorrect", feedback: Q4_FEEDBACK.neither };
  }

  const territoryComplete = checks.territoryGrowth && checks.territorialMaximum;
  if (!territoryComplete) {
    return { result: "partly_correct", feedback: Q4_FEEDBACK.missingTerritory };
  }
  return { result: "partly_correct", feedback: Q4_FEEDBACK.missingPolitics };
}

export function responseMatchesRomanReferenceQuestion(
  questionId: RomanReferenceQuestionId,
  response: RomanReferenceQuestionResponse,
): boolean {
  return (
    (questionId === "turning-points" && response.kind === "ordering") ||
    (questionId === "476-continuity" && response.kind === "selection") ||
    (questionId === "map-117" && response.kind === "multi_select") ||
    (questionId === "two-sentence" && response.kind === "free_response")
  );
}

export function assessRomanReferenceQuestion(
  questionId: RomanReferenceQuestionId,
  response: RomanReferenceQuestionResponse,
): RomanReferenceAssessment {
  if (questionId === "turning-points" && response.kind === "ordering") {
    return assessTurningPoints(response);
  }
  if (questionId === "476-continuity" && response.kind === "selection") {
    return assessContinuity(response);
  }
  if (questionId === "map-117" && response.kind === "multi_select") {
    if (response.choiceIds.length !== 2) {
      return { result: "ungradable", feedback: "Select exactly two regions before checking." };
    }
    return assessMap(response);
  }
  if (questionId === "two-sentence" && response.kind === "free_response") {
    return assessTwoSentence(response);
  }
  throw new TypeError(`Response kind does not match Roman reference question '${questionId}'.`);
}

export function hintForRomanReferenceQuestion(
  questionId: RomanReferenceQuestionId,
  mode: Exclude<TutoringMode, "exam" | "direct">,
  earnedCount: number,
): RomanReferenceQuestionHint | null {
  const text = MODE_HINTS[questionId][mode]?.[earnedCount];
  return text === undefined ? null : { level: earnedCount + 1, text };
}

export function answerForRomanReferenceQuestion(
  questionId: RomanReferenceQuestionId,
): RomanReferenceQuestionResponse {
  switch (questionId) {
    case "turning-points":
      return { kind: "ordering", order: [...CORRECT_TURNING_POINT_ORDER] };
    case "476-continuity":
      return { kind: "selection", choiceId: "western-change" };
    case "map-117":
      return { kind: "multi_select", choiceIds: ["britain", "mesopotamia"] };
    case "two-sentence":
      return { kind: "free_response", text: DIRECT_REVEAL_COPY["two-sentence"] };
  }
}

const QUESTION_SOURCES: Record<RomanReferenceQuestionId, readonly string[]> = {
  "turning-points": [
    "wikipedia-augustus",
    "wikipedia-roman-empire",
    "wikipedia-fall-western-empire",
    "openstax-world-history-eastward-shift",
  ],
  "476-continuity": ["wikipedia-fall-western-empire", "wikipedia-roman-empire"],
  "map-117": ["commons-roman-empire-extent-map", "wikipedia-roman-empire"],
  "two-sentence": [
    "wikipedia-augustus",
    "wikipedia-roman-empire",
    "commons-roman-empire-extent-map",
  ],
};

export function sourceIdsForRomanReferenceQuestion(
  questionId: RomanReferenceQuestionId,
): readonly string[] {
  return QUESTION_SOURCES[questionId];
}

/** A semantic answer boundary for modes that must not receive the active conclusion. */
export function romanReferenceTutorReplyLeaksAnswer(
  questionId: RomanReferenceQuestionId,
  mode: Exclude<TutoringMode, "exam">,
  raw: string,
): boolean {
  if (mode === "direct") return false;
  const text = normalise(raw);
  switch (questionId) {
    case "turning-points": {
      const positions = [
        text.search(/\baugustus\b/),
        text.search(/(?:greatest|maximum) (?:territorial )?extent|\b117\b|\btrajan\b/),
        text.search(/separate eastern and western|\bdivision\b|\b395\b/),
        text.search(/last western emperor|western deposition|\b476\b/),
      ];
      return (
        positions.every((position) => position >= 0) &&
        positions.every((position, index) => {
          const previousPosition = positions[index - 1];
          return index === 0 || (previousPosition !== undefined && position > previousPosition);
        })
      );
    }
    case "476-continuity":
      return hasAny(text, [
        /(?:east|eastern roman empire|constantinople)[^.]{0,90}(?:continued|survived|remained|persisted|did not end|didn't end)/,
        /(?:continued|survived|remained|persisted|did not end|didn't end)[^.]{0,90}(?:in the east|eastern roman empire|constantinople)/,
      ]);
    case "map-117":
      return mode === "coach"
        ? /\bbritain\b|\bmesopotamia\b/.test(text)
        : /\bmesopotamia\b/.test(text);
    case "two-sentence": {
      const checks = twoSentenceChecks(raw);
      return (
        checks.territoryGrowth &&
        checks.territorialMaximum &&
        checks.republicanContinuity &&
        checks.concentratedPower
      );
    }
  }
}

export function privateQuestionForRomanReference(questionId: RomanReferenceQuestionId): Question {
  const content = ROMAN_REFERENCE_QUESTION_CONTENT.find((question) => question.id === questionId);
  if (!content) throw new Error(`Missing Roman reference question '${questionId}'.`);
  const exampleAnswer = DIRECT_REVEAL_COPY[questionId];
  return {
    id: `recovery-v2:${questionId}`,
    conceptIds: ["augustus-principate", "roman-expansion"],
    prompt: content.prompt,
    responseType: questionId === "two-sentence" ? "long_text" : "short_text",
    difficulty: 1,
    hints: [...(MODE_HINTS[questionId].coach ?? []), ...(MODE_HINTS[questionId].assisted ?? [])],
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [exampleAnswer],
      rejectedIdeas: [],
      exampleAnswer,
    },
    sourceIds: [...QUESTION_SOURCES[questionId]],
  };
}

const DYNAMIC_AUTHORED_COPY = [
  ...TURNING_POINT_RELATIONSHIPS.flatMap(({ text }) => [
    `Two date relationships are in place. ${text} Move those cards and check the sequence again.`,
    `Start with the first broken relationship: ${text} Move those cards, then check the rest.`,
  ]),
  ...(["Britain", "Mesopotamia"] as const).flatMap((correct) =>
    (["Scandinavia", "India"] as const).map(
      (wrong) =>
        `${correct} marks one end. ${wrong} lies outside the shaded territory; trace the boundary to the opposite end and replace it.`,
    ),
  ),
  ...[0, 1, 3, 4].map((count) => Q4_FEEDBACK.wrongCount(count)),
];

/** Every authored learner-facing string emitted by this authority, for the writing gate. */
export const ROMAN_REFERENCE_AUTHORED_COPY: readonly string[] = [
  ...ROMAN_REFERENCE_QUESTION_CONTENT.flatMap((question) => [
    question.prompt,
    ...(question.kind === "ordering"
      ? [question.instruction, ...question.options.map((option) => option.label)]
      : question.kind === "multi_select"
        ? [question.mapDescription, ...question.choices.map((choice) => choice.label)]
        : question.kind === "selection"
          ? question.choices.map((choice) => choice.label)
          : [question.instruction]),
  ]),
  ...Object.values(MODE_HINTS).flatMap((modes) => [
    ...(modes.coach ?? []),
    ...(modes.assisted ?? []),
  ]),
  ...Object.values(DIRECT_REVEAL_COPY),
  ...Object.values(CORRECT_FEEDBACK),
  ...Object.values(CONTINUITY_WRONG_FEEDBACK),
  "Both selected regions lie outside the shaded territory. Trace the shaded boundary from the northwest to its far eastern edge.",
  "Select exactly two regions before checking.",
  Q4_FEEDBACK.ungradable,
  Q4_FEEDBACK.missingTerritory,
  Q4_FEEDBACK.missingPolitics,
  Q4_FEEDBACK.augustusContradiction,
  Q4_FEEDBACK.mapContradiction,
  Q4_FEEDBACK.neither,
  ...DYNAMIC_AUTHORED_COPY,
];
