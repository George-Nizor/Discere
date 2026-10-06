import { describe, expect, it } from "vitest";
import { LearnerQuestionSchema, learnerQuestion, QuestionSchema } from "../src/index.js";

describe("permission-safe learner questions", () => {
  it("delivers an available hint count without any hint text or marking authority", () => {
    const original = QuestionSchema.parse({
      id: "q",
      conceptIds: ["counting"],
      prompt: "Find the value.",
      responseType: "numeric",
      difficulty: 1,
      hints: ["Secret first hint", "Secret later hint"],
      answerAuthority: {
        kind: "numeric",
        value: 42,
        unit: "",
        absoluteTolerance: 0,
        relativeTolerance: 0,
        workedAnswer: "The worked result is 42.",
      },
      sourceIds: [],
    });
    const delivered = learnerQuestion(original);
    expect(delivered).toMatchObject({ hintCount: 2, expectedUnit: "" });
    expect(delivered).not.toHaveProperty("hints");
    expect(delivered).not.toHaveProperty("answerAuthority");
    expect(delivered).not.toHaveProperty("transfer");
    expect(JSON.stringify(delivered)).not.toContain("Secret");
    expect(LearnerQuestionSchema.parse(delivered)).toEqual(delivered);
    expect(LearnerQuestionSchema.safeParse({ ...delivered, hints: original.hints }).success).toBe(
      false,
    );
  });
});

it("presents probability as a unitless learner input without disclosing its value", () => {
  const original = QuestionSchema.parse({
    id: "prob",
    conceptIds: ["probability"],
    prompt: "What is the probability?",
    responseType: "numeric",
    difficulty: 1,
    hints: [],
    sourceIds: [],
    answerAuthority: {
      kind: "numeric",
      value: 0.25,
      unit: "probability",
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer: "One in four.",
    },
  });
  const delivered = learnerQuestion(original);
  expect(delivered.expectedUnit).toBe("");
  expect(delivered).not.toHaveProperty("answerAuthority");
  expect(JSON.stringify(delivered)).not.toContain("0.25");
});
