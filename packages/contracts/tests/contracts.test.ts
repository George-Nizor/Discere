import { describe, expect, it } from "vitest";
import { CircuitDiagramSpecSchema, ExplainerStageSchema, JourneyProgressSchema, TutoringModeSchema } from "../src/index.js";

describe("shared contracts", () => {
  it("accepts known tutoring modes", () => {
    expect(TutoringModeSchema.parse("coach")).toBe("coach");
  });

  it("rejects non-positive circuit values", () => {
    expect(() =>
      CircuitDiagramSpecSchema.parse({
        id: "bad",
        voltage: 5,
        resistance: 0,
        showCurrentArrow: true,
        showValues: true,
        batteryLabel: "Battery",
        resistorLabel: "Resistor",
      }),
    ).toThrow();
  });

  it("accepts a learner-safe explainer stage without answer authority", () => {
    const stage = ExplainerStageSchema.parse({
      id: "lesson:explainer",
      type: "explainer",
      title: "Build the idea",
      conceptIds: ["current"],
      sourceIds: ["source-1"],
      optional: false,
      completionPolicy: "interaction",
      steps: [
        {
          id: "hook",
          kind: "hook",
          visualStateId: "",
          blocks: [{ kind: "paragraph", text: "Current is the rate of charge flow." }],
        },
        {
          id: "check",
          kind: "check",
          visualStateId: "",
          blocks: [{ kind: "paragraph", text: "Your turn." }],
          question: {
            id: "q1",
            conceptIds: ["current"],
            prompt: "What raises the current?",
            responseType: "short_text",
            difficulty: 1,
            hints: [],
            sourceIds: [],
          },
        },
      ],
      visual: { kind: "circuit", alt: "A closed circuit." },
    });
    expect(stage.type).toBe("explainer");
    expect("answerAuthority" in stage).toBe(false);
    // A step's inline question is delivered exactly as a quiz stage's is: no marking data.
    expect(stage.steps[1]?.question && "answerAuthority" in stage.steps[1].question).toBe(false);
  });

  it("requires an active stage in persisted journey progress", () => {
    expect(
      JourneyProgressSchema.parse({
        journeyId: "course:lesson",
        activeStageId: "lesson:explainer",
        stages: [{ stageId: "lesson:explainer", state: "active", interactionState: {}, updatedAt: "2026-08-17T00:00:00.000Z" }],
      }).activeStageId,
    ).toBe("lesson:explainer");
  });
});
