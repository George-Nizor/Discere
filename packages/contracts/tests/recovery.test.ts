import { describe, expect, it } from "vitest";
import {
  RomanReferenceActionSchema,
  RomanReferenceOpeningOrderSchema,
  RomanReferenceProgressSchema,
  type RomanReferenceTurningPointId,
} from "../src/recovery.js";
import { TutorAskRequestSchema } from "../src/tutor.js";

const openingOrder: RomanReferenceTurningPointId[] = [
  "deposition",
  "augustus",
  "division",
  "extent",
];
const alternateOrder: RomanReferenceTurningPointId[] = [
  "extent",
  "deposition",
  "augustus",
  "division",
];

const contents = [
  {
    id: "turning-points",
    ordinal: 1,
    kind: "ordering",
    prompt: "Put these turning points in order",
    instruction: "Arrange them from earliest to latest.",
    sourceIds: ["source-a"],
    options: [
      { id: "extent", label: "Extent" },
      { id: "deposition", label: "Deposition" },
      { id: "augustus", label: "Augustus" },
      { id: "division", label: "Division" },
    ],
  },
  {
    id: "476-continuity",
    ordinal: 2,
    kind: "selection",
    prompt: "Why is 476 incomplete?",
    sourceIds: ["source-b"],
    choices: [
      { id: "ended-everywhere", label: "Ended everywhere" },
      { id: "western-change", label: "Western change" },
      { id: "augustus-created", label: "Augustus created it" },
      { id: "greatest-extent", label: "Greatest extent" },
    ],
  },
  {
    id: "map-117",
    ordinal: 3,
    kind: "multi_select",
    prompt: "Select two regions.",
    mapDescription: "Shading crosses the Channel and reaches beyond Syria.",
    sourceIds: ["source-c"],
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
    prompt: "How did Rome change?",
    instruction: "Write two sentences.",
    sourceIds: ["source-d"],
    maxLength: 2_000,
  },
] as const;

const questionProgress = [
  {
    id: "turning-points",
    draft: { kind: "ordering", order: openingOrder },
    submittedResponse: null,
    status: "editing",
    result: null,
    feedback: null,
    mode: null,
    hints: [],
    revealedAnswer: null,
  },
  {
    id: "476-continuity",
    draft: null,
    submittedResponse: null,
    status: "editing",
    result: null,
    feedback: null,
    mode: null,
    hints: [],
    revealedAnswer: null,
  },
  {
    id: "map-117",
    draft: null,
    submittedResponse: null,
    status: "editing",
    result: null,
    feedback: null,
    mode: null,
    hints: [],
    revealedAnswer: null,
  },
  {
    id: "two-sentence",
    draft: null,
    submittedResponse: null,
    status: "editing",
    result: null,
    feedback: null,
    mode: null,
    hints: [],
    revealedAnswer: null,
  },
] as const;

const validProgress = RomanReferenceProgressSchema.parse({
  version: 3,
  opening: {
    order: openingOrder,
    submittedOrder: null,
    status: "editing",
    wasCorrect: null,
  },
  augustus: { completed: false },
  expansion: {
    milestoneId: "117-ce",
    answerOpen: false,
    answer: "",
    saved: false,
    completed: false,
  },
  questions: contents.map((content, index) => ({
    content,
    progress: questionProgress[index],
  })),
  assessmentFinished: false,
  essay: {
    content: {
      id: "transformation",
      prompt: "What mattered more to Rome's transformation?",
      instruction: "Make a claim. Use three pieces of evidence. Address one complication.",
      minWords: 80,
      maxWords: 1_200,
      rubric: [
        { id: "claim", label: "Claim", description: "Take a position." },
        { id: "evidence", label: "Evidence", description: "Use three examples." },
        { id: "reasoning", label: "Reasoning", description: "Explain the connection." },
        { id: "complication", label: "Complication", description: "Address a limit." },
        { id: "accuracy", label: "Accuracy", description: "Keep chronology clear." },
      ],
      evidence: [],
    },
    progress: {
      draft: "",
      claimPlan: "",
      evidencePlan: [],
      complicationPlan: "",
      status: "editing",
      mode: null,
      sourcesOpened: false,
      submissions: [],
      finished: false,
    },
  },
  activeBeat: "opening",
  activeQuestionId: null,
  updatedAt: "2026-08-22T00:00:00.000Z",
} as const);

function atQuestions() {
  return {
    ...validProgress,
    questions: structuredClone(validProgress.questions),
    opening: {
      order: openingOrder,
      submittedOrder: null,
      status: "skipped" as const,
      wasCorrect: null,
    },
    augustus: { completed: true },
    expansion: {
      milestoneId: "117-ce" as const,
      answerOpen: true,
      answer: "Rome expanded.",
      saved: true,
      completed: true,
    },
    activeBeat: "questions" as const,
    activeQuestionId: "turning-points" as const,
  };
}

function firstQuestion(progress: ReturnType<typeof atQuestions>) {
  const question = progress.questions[0];
  if (question === undefined) throw new Error("The reference fixture lost its first question.");
  return question;
}

describe("Roman reference recovery contracts", () => {
  it("accepts valid v3 progress with server-owned question and essay views", () => {
    const progress = RomanReferenceProgressSchema.parse(validProgress);
    expect(progress.version).toBe(3);
    expect(progress.activeBeat).toBe("opening");
    expect(progress.questions.map((question) => question.content.id)).toEqual([
      "turning-points",
      "476-continuity",
      "map-117",
      "two-sentence",
    ]);
  });

  it.each([
    { action: "reorder_opening", order: openingOrder },
    { action: "check_opening", order: openingOrder },
    { action: "skip_opening", order: openingOrder },
    { action: "complete_augustus" },
    { action: "select_expansion_milestone", milestoneId: "284-ce" },
    { action: "update_expansion_draft", answerOpen: true, answer: "A draft." },
    { action: "save_expansion_response", answer: "A saved response." },
    { action: "complete_expansion" },
    {
      action: "update_question_draft",
      questionId: "476-continuity",
      response: { kind: "selection", choiceId: "western-change" },
    },
    {
      action: "submit_question",
      questionId: "map-117",
      response: { kind: "multi_select", choiceIds: ["britain", "mesopotamia"] },
      mode: "coach",
    },
    { action: "request_question_hint", questionId: "turning-points", mode: "assisted" },
    {
      action: "reveal_question",
      questionId: "two-sentence",
      mode: "direct",
      reason: "I compared both ideas and still need the model.",
      confirmation: "show answer",
    },
    { action: "access_question_sources", questionId: "map-117", mode: "coach" },
    { action: "access_question_tutor", questionId: "map-117", mode: "assisted" },
    { action: "finish_assessment" },
  ])("accepts the $action action", (action) => {
    expect(RomanReferenceActionSchema.parse(action)).toEqual(action);
  });

  it.each([
    ["duplicate", ["augustus", "augustus", "division", "extent"]],
    ["missing", ["augustus", "deposition", "division"]],
    ["unknown", ["augustus", "deposition", "division", "civil-war"]],
  ])("rejects an opening order with a %s turning-point ID", (_case, order) => {
    expect(RomanReferenceOpeningOrderSchema.safeParse(order).success).toBe(false);
  });

  it.each([
    ["ordering", 0, "options", "extent"],
    ["selection", 1, "choices", "ended-everywhere"],
    ["map", 2, "choices", "scandinavia"],
  ])("rejects duplicate or mistyped %s option IDs", (_case, index, _field, duplicateId) => {
    const question = structuredClone(validProgress.questions[index]);
    const options = (
      question?.content.kind === "ordering"
        ? question.content.options
        : question?.content.kind === "selection" || question?.content.kind === "multi_select"
          ? question.content.choices
          : []
    ) as Array<{ id: string; label: string }>;
    const secondOption = options[1];
    if (secondOption === undefined) throw new Error("The option fixture is incomplete.");
    options[1] = { ...secondOption, id: duplicateId };
    expect(
      RomanReferenceProgressSchema.safeParse({
        ...validProgress,
        questions: validProgress.questions.map((candidate, candidateIndex) =>
          candidateIndex === index ? question : candidate,
        ),
      }).success,
    ).toBe(false);
  });

  it("rejects Direct progress that retained a hint", () => {
    const progress = atQuestions();
    const first = firstQuestion(progress);
    const submitted = { kind: "ordering" as const, order: alternateOrder };
    progress.questions[0] = {
      ...first,
      progress: {
        ...first.progress,
        draft: submitted,
        submittedResponse: submitted,
        status: "submitted",
        result: "incorrect",
        feedback: "Try again.",
        mode: "direct",
        hints: [{ level: 1, text: "A forbidden hint." }],
      },
    };
    expect(RomanReferenceProgressSchema.safeParse(progress).success).toBe(false);
  });

  it("treats an unsent Exam revision as the active frontier", () => {
    const progress = atQuestions();
    const first = firstQuestion(progress);
    progress.questions[0] = {
      ...first,
      progress: {
        ...first.progress,
        draft: { kind: "ordering", order: openingOrder },
        submittedResponse: { kind: "ordering", order: alternateOrder },
        status: "submitted",
        mode: "exam",
      },
    };
    expect(RomanReferenceProgressSchema.parse(progress).activeQuestionId).toBe("turning-points");
  });

  it("rejects a forged active beat and a resolved item with a dirty draft", () => {
    expect(
      RomanReferenceProgressSchema.safeParse({ ...validProgress, activeBeat: "questions" }).success,
    ).toBe(false);

    const progress = atQuestions();
    const first = firstQuestion(progress);
    progress.questions[0] = {
      ...first,
      progress: {
        ...first.progress,
        draft: { kind: "ordering", order: openingOrder },
        submittedResponse: { kind: "ordering", order: alternateOrder },
        status: "submitted",
        result: "correct",
        feedback: "Correct.",
        mode: "coach",
      },
    };
    expect(RomanReferenceProgressSchema.safeParse(progress).success).toBe(false);
  });

  it.each([
    ["closed", { answerOpen: false, answer: "A retained response.", saved: true }],
    ["blank", { answerOpen: true, answer: " \n\t ", saved: true }],
  ])("rejects a saved expansion response that is %s", (_case, expansion) => {
    expect(
      RomanReferenceProgressSchema.safeParse({
        ...validProgress,
        expansion: { ...validProgress.expansion, ...expansion },
      }).success,
    ).toBe(false);
  });

  it.each([
    ["blank", " \n\t "],
    ["longer than 2,000 characters", "x".repeat(2_001)],
  ])("rejects a %s saved response", (_case, answer) => {
    expect(
      RomanReferenceActionSchema.safeParse({ action: "save_expansion_response", answer }).success,
    ).toBe(false);
  });

  it("rejects extra keys on progress and actions", () => {
    expect(
      RomanReferenceProgressSchema.safeParse({ ...validProgress, unexpected: true }).success,
    ).toBe(false);
    expect(
      RomanReferenceActionSchema.safeParse({ action: "complete_augustus", unexpected: true })
        .success,
    ).toBe(false);
  });
});

describe("tutor binding to a reference item", () => {
  const base = {
    lessonId: "rise-of-the-roman-empire",
    mode: "coach" as const,
    question: "What counts as a complication?",
  };

  it("accepts a request bound to the essay", () => {
    expect(
      TutorAskRequestSchema.safeParse({ ...base, referenceEssayId: "transformation" }).success,
    ).toBe(true);
  });

  it("accepts a request bound to a reference question", () => {
    expect(
      TutorAskRequestSchema.safeParse({ ...base, referenceQuestionId: "map-117" }).success,
    ).toBe(true);
  });

  it("rejects a request naming both, which has no single mode to enforce", () => {
    const result = TutorAskRequestSchema.safeParse({
      ...base,
      referenceQuestionId: "map-117",
      referenceEssayId: "transformation",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["referenceEssayId"]);
  });

  it("rejects an essay id the lesson does not have", () => {
    expect(
      TutorAskRequestSchema.safeParse({ ...base, referenceEssayId: "some-essay" }).success,
    ).toBe(false);
  });
});
