import type { LearnerQuestion } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { numericQuestion } from "../../test/fixtures.js";
import { answerResponse, answerSurface, choiceLetter, initialAnswerDraft } from "./answer-draft.js";

const choiceQuestion: LearnerQuestion = {
  ...numericQuestion,
  id: "transition-question",
  responseType: "short_text",
  prompt: "Which event marked the transition?",
  choices: [
    { id: "a", label: "The Punic Wars" },
    { id: "c", label: "The reign of Augustus" },
  ],
};

const textQuestion: LearnerQuestion = {
  ...numericQuestion,
  id: "explain-question",
  responseType: "long_text",
};

const drawingQuestion: LearnerQuestion = {
  ...numericQuestion,
  id: "sketch-question",
  responseType: "drawing",
};

describe("answer drafts", () => {
  it("chooses the surface from the question", () => {
    expect(answerSurface(numericQuestion)).toBe("numeric");
    expect(answerSurface(choiceQuestion)).toBe("choice");
    expect(answerSurface(textQuestion)).toBe("text");
    expect(answerSurface(drawingQuestion)).toBe("unsupported");
  });

  it("starts each surface empty", () => {
    expect(initialAnswerDraft(numericQuestion)).toEqual({ kind: "numeric", value: "", unit: "" });
    expect(initialAnswerDraft(choiceQuestion)).toEqual({ kind: "choice", choiceId: null });
    expect(initialAnswerDraft(textQuestion)).toEqual({ kind: "text", text: "" });
  });

  it("joins a numeric value with its unit", () => {
    expect(answerResponse(numericQuestion, { kind: "numeric", value: "0.05", unit: "A" })).toBe(
      "0.05 A",
    );
    expect(answerResponse(numericQuestion, { kind: "numeric", value: " 50 ", unit: " mA " })).toBe(
      "50 mA",
    );
    expect(answerResponse(numericQuestion, { kind: "numeric", value: "0.05", unit: "" })).toBe(
      "0.05",
    );
  });

  it("reports an unready answer as an empty response", () => {
    expect(answerResponse(numericQuestion, { kind: "numeric", value: "  ", unit: "A" })).toBe("");
    expect(answerResponse(choiceQuestion, { kind: "choice", choiceId: null })).toBe("");
    expect(answerResponse(textQuestion, { kind: "text", text: "   " })).toBe("");
  });

  it("sends the chosen label so the server keeps answer authority", () => {
    expect(answerResponse(choiceQuestion, { kind: "choice", choiceId: "c" })).toBe(
      "The reign of Augustus",
    );
  });

  it("letters each choice", () => {
    expect(choiceLetter(0)).toBe("A");
    expect(choiceLetter(3)).toBe("D");
    expect(choiceLetter(20)).toBe("21");
  });
});
