import type {
  EssayStage,
  ExplainerStage,
  InteractiveVisualStage,
  JourneyProgress,
  LearnerQuestion,
  LessonJourney,
  OhmsLawActivity,
  ParallelCircuitActivity,
  QuizStage,
  SeriesCircuitActivity,
  StageState,
  TimelineActivity,
} from "@discere/contracts";

export const ohmsLawActivity: OhmsLawActivity = {
  id: "ohms-law-explorer",
  type: "ohms_law_explorer",
  title: "Change the circuit",
  conceptIds: ["ohms-law"],
  instructions: "Adjust voltage or resistance.",
  voltage: { value: 5, min: 1, max: 12, step: 1 },
  resistance: { value: 100, min: 10, max: 1000, step: 10 },
  predictionPrompt: "What happens to current when resistance increases?",
};

export const seriesActivity: SeriesCircuitActivity = {
  id: "series-circuit-explorer",
  type: "series_circuit_explorer",
  title: "Explore resistance in series",
  conceptIds: ["series-circuits"],
  instructions: "Change one resistor.",
  voltage: { value: 9, min: 1, max: 12, step: 1 },
  resistors: [
    { id: "r1", label: "R1", value: 100, min: 10, max: 500, step: 10 },
    { id: "r2", label: "R2", value: 200, min: 10, max: 500, step: 10 },
  ],
  predictionPrompt: "What happens to total resistance when R2 increases?",
};

export const parallelActivity: ParallelCircuitActivity = {
  id: "parallel-circuit-explorer",
  type: "parallel_circuit_explorer",
  title: "Explore two parallel branches",
  conceptIds: ["parallel-circuits"],
  instructions: "Change one branch.",
  voltage: { value: 12, min: 1, max: 12, step: 1 },
  branches: [
    { id: "r1", label: "R1", value: 100, min: 10, max: 500, step: 10 },
    { id: "r2", label: "R2", value: 100, min: 10, max: 500, step: 10 },
  ],
  predictionPrompt: "What happens to total resistance when R2 increases?",
};

export const timelineActivity: TimelineActivity = {
  id: "roman-timeline",
  type: "timeline_explorer",
  title: "From kings to emperors",
  conceptIds: ["roman-republic"],
  instructions: "Drag the year to reveal what had happened by then.",
  startYear: -753,
  endYear: 117,
  step: 1,
  initialYear: -753,
  events: [
    { id: "founding", year: -753, label: "Rome founded", detail: "The traditional date." },
    {
      id: "republic",
      year: -509,
      label: "Republic established",
      detail: "The last king is expelled.",
    },
    {
      id: "augustus",
      year: -27,
      label: "Augustus takes power",
      detail: "The Senate grants the name Augustus.",
    },
  ],
  predictionPrompt: "Which of these happened first?",
  orderingChoiceIds: ["augustus", "republic"],
};

export const numericQuestion: LearnerQuestion = {
  id: "calculate-current-5v-100ohm",
  conceptIds: ["ohms-law"],
  prompt: "A 5 V battery is connected across a 100 Ω resistor. Calculate the current in amperes.",
  responseType: "numeric",
  difficulty: 1,
  hints: ["Write Ohm's law as I = V / R.", "Substitute the values."],
  sourceIds: [],
};

export const explainerStage: ExplainerStage = {
  id: "lesson:explainer",
  type: "explainer",
  title: "Build the idea",
  conceptIds: ["current"],
  sourceIds: [],
  optional: false,
  completionPolicy: "view",
  body: "Trace the wire around the loop.\n\nCurrent measures how quickly charge passes a point.",
  takeaway: "Voltage pushes, resistance limits.",
  visual: {
    kind: "circuit",
    briefId: "brief-1",
    alt: "A battery and a resistor in one loop.",
    src: "/api/visuals/circuit.svg?lessonId=lesson",
  },
};

export const visualStage: InteractiveVisualStage = {
  id: "lesson:visual",
  type: "interactive_visual",
  title: "Change the circuit",
  conceptIds: ["ohms-law"],
  sourceIds: [],
  optional: false,
  completionPolicy: "interaction",
  activity: ohmsLawActivity,
  prompt: "What happens to current when resistance increases?",
  visualKind: "circuit",
};

export const quizStage: QuizStage = {
  id: "lesson:quiz",
  type: "quiz",
  title: "Check your understanding",
  conceptIds: ["ohms-law"],
  sourceIds: [],
  optional: false,
  completionPolicy: "assessment",
  questionId: numericQuestion.id,
  question: numericQuestion,
  questionIndex: 1,
  questionCount: 1,
};

export const essayStage: EssayStage = {
  id: "lesson:essay",
  type: "essay",
  title: "Explain it in your own words",
  conceptIds: ["ohms-law"],
  sourceIds: [],
  optional: true,
  completionPolicy: "submission",
  essayId: "lesson:teach-back",
  prompt: "Explain how voltage, resistance, and current relate.",
  expectedScope: "Two to four sentences.",
  successCriteria: ["Names the relationship.", "Uses the equation."],
  minWords: 5,
};

export const journey: LessonJourney = {
  id: "electronics-foundations:lesson",
  courseId: "electronics-foundations",
  lessonId: "lesson",
  title: "Current in a single loop",
  estimatedMinutes: 12,
  conceptIds: ["current", "ohms-law"],
  stageOrder: [explainerStage.id, visualStage.id, quizStage.id, essayStage.id],
  stages: [explainerStage, visualStage, quizStage, essayStage],
  sources: [],
};

export function progressWith(states: Record<string, StageState>): JourneyProgress {
  const stages = journey.stageOrder.map((stageId) => ({
    stageId,
    state: states[stageId] ?? ("locked" as StageState),
    interactionState: {},
    updatedAt: "2026-08-18T12:00:00.000Z",
  }));
  const active = stages.find((stage) => stage.state === "active" || stage.state === "available");
  return {
    journeyId: journey.id,
    activeStageId: active?.stageId ?? journey.stageOrder[0] ?? "",
    stages,
  };
}
