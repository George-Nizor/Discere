import type {
  EssayStage,
  ExplainerStage,
  InteractiveVisualStage,
  JourneyProgress,
  LearnerQuestion,
  LessonJourney,
  OhmsLawActivity,
  QuizStage,
  SeriesCircuitActivity,
  StageState,
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
  visual: { kind: "circuit", briefId: "brief-1", alt: "A battery and a resistor in one loop." },
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
