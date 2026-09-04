import type {
  RomanReferenceEssayEvidence,
  RomanReferenceProgress,
  RomanReferenceQuestionId,
  RomanReferenceQuestionProgress,
  RomanReferenceQuestionResponse,
} from "@discere/contracts";

function editingQuestion(id: RomanReferenceQuestionId): RomanReferenceQuestionProgress {
  return {
    id,
    draft:
      id === "turning-points"
        ? { kind: "ordering", order: ["extent", "deposition", "augustus", "division"] }
        : null,
    submittedResponse: null,
    status: "editing",
    result: null,
    feedback: null,
    mode: null,
    hints: [],
    revealedAnswer: null,
  };
}

export function referenceQuestionViews(): RomanReferenceProgress["questions"] {
  return [
    {
      content: {
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
      progress: editingQuestion("turning-points"),
    },
    {
      content: {
        id: "476-continuity",
        ordinal: 2,
        kind: "selection",
        prompt: "Why is 476 CE an incomplete date for the end of Rome?",
        sourceIds: ["wikipedia-fall-western-empire", "wikipedia-roman-empire"],
        choices: [
          {
            id: "ended-everywhere",
            label: "The empire disappeared everywhere at the same moment.",
          },
          {
            id: "western-change",
            label:
              "It marks a western political change while Roman government continued in the east.",
          },
          { id: "augustus-created", label: "It was the year Augustus created the empire." },
          { id: "greatest-extent", label: "It was the year Rome reached its greatest extent." },
        ],
      },
      progress: editingQuestion("476-continuity"),
    },
    {
      content: {
        id: "map-117",
        ordinal: 3,
        kind: "multi_select",
        prompt: "Select the two regions that show Rome’s reach from northwest to east in 117 CE.",
        mapDescription:
          "The shaded territory surrounds the Mediterranean. Its northwestern edge crosses the Channel beyond Gaul, while its far eastern edge reaches beyond Syria.",
        sourceIds: ["commons-roman-empire-extent-map", "wikipedia-roman-empire"],
        choices: [
          { id: "scandinavia", label: "Scandinavia" },
          { id: "britain", label: "Britain" },
          { id: "india", label: "India" },
          { id: "mesopotamia", label: "Mesopotamia" },
        ],
        selectionCount: 2,
      },
      progress: editingQuestion("map-117"),
    },
    {
      content: {
        id: "two-sentence",
        ordinal: 4,
        kind: "free_response",
        prompt: "How did Rome change by 117 CE?",
        instruction:
          "Write exactly two sentences: one on territory, one on what Augustus kept and controlled.",
        maxLength: 2_000,
        sourceIds: [
          "wikipedia-augustus",
          "wikipedia-roman-empire",
          "commons-roman-empire-extent-map",
        ],
      },
      progress: editingQuestion("two-sentence"),
    },
  ];
}

export function defaultRomanReferenceProgress(): RomanReferenceProgress {
  return {
    version: 3,
    activeBeat: "opening",
    activeQuestionId: null,
    assessmentFinished: false,
    updatedAt: null,
    opening: {
      order: ["division", "augustus", "deposition", "extent"],
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
    questions: referenceQuestionViews(),
    essay: {
      content: {
        id: "transformation",
        prompt: "What mattered more to Rome's transformation: its size or its political conflicts?",
        instruction: "Make a claim. Use three pieces of evidence. Address one complication.",
        minWords: 80,
        maxWords: 1_200,
        rubric: [
          { id: "claim", label: "Claim", description: "Takes a clear comparative position." },
          { id: "evidence", label: "Evidence", description: "Uses three historical examples." },
          { id: "reasoning", label: "Reasoning", description: "Links evidence to the claim." },
          { id: "complication", label: "Complication", description: "Addresses a limit." },
          { id: "accuracy", label: "Accuracy", description: "Keeps chronology clear." },
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
  };
}

/** The evidence pack the server releases once the learner opens it. */
export function referenceEssayEvidence(): RomanReferenceEssayEvidence[] {
  return [
    {
      id: "augustus-27-bce",
      date: "27 BCE",
      title: "Augustus",
      summary:
        "Republican offices remained, but Augustus controlled the army, major provinces, and the direction of government.",
      visual: "portrait",
      sourceIds: ["wikipedia-augustus"],
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
  ];
}

function settledResponse(id: RomanReferenceQuestionId): RomanReferenceQuestionResponse {
  switch (id) {
    case "turning-points":
      return { kind: "ordering", order: ["augustus", "extent", "division", "deposition"] };
    case "476-continuity":
      return { kind: "selection", choiceId: "western-change" };
    case "map-117":
      return { kind: "multi_select", choiceIds: ["britain", "mesopotamia"] };
    case "two-sentence":
      return {
        kind: "free_response",
        text: "Roman territory expanded and reached its greatest extent under Trajan in 117 CE. Augustus kept republican offices while holding the powers that decided things.",
      };
  }
}

/**
 * The state the essay beat actually opens in: four questions submitted and released, the
 * assessment finished, and a blank essay. Built from the default so the two stay in step.
 */
export function essayReadyProgress(): RomanReferenceProgress {
  const progress = defaultRomanReferenceProgress();
  progress.opening = {
    order: ["augustus", "extent", "division", "deposition"],
    submittedOrder: ["augustus", "extent", "division", "deposition"],
    status: "checked",
    wasCorrect: true,
  };
  progress.augustus.completed = true;
  progress.expansion = {
    milestoneId: "117-ce",
    answerOpen: true,
    answer: "Roman territory expanded.",
    saved: true,
    completed: true,
  };
  for (const view of progress.questions) {
    // A finished assessment must retain a submitted response equal to the draft for every
    // question, so the contract rejects a fixture that only claims to be finished.
    const response = settledResponse(view.content.id);
    view.progress = {
      ...view.progress,
      draft: response,
      submittedResponse: response,
      status: "submitted",
      result: "correct",
      feedback: `Server feedback released for ${view.content.id}.`,
      mode: "coach",
    };
  }
  progress.assessmentFinished = true;
  progress.activeBeat = "essay";
  progress.activeQuestionId = null;
  return progress;
}
