import type { LessonStep, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { matchMisconception } from "../src/assessment.js";
import { answerLeakTokens, sentences, splitLegacyStep } from "../src/lesson-projection.js";

const numeric = (value: number, prompt = "What is x + 5 for x = 2?"): Question => ({
  id: "q",
  conceptIds: ["c"],
  prompt,
  responseType: "numeric",
  difficulty: 1,
  hints: [],
  sourceIds: [],
  answerAuthority: {
    kind: "numeric",
    value,
    unit: "",
    absoluteTolerance: 1e-9,
    relativeTolerance: 0,
    workedAnswer: "2 + 5 = 7.",
  },
});
const step = (text: string): LessonStep => ({
  id: "s",
  kind: "check",
  blocks: [
    { kind: "heading", text: "One letter, one value" },
    { kind: "paragraph", text },
  ],
  visualStateId: "",
  checkQuestionId: "q",
  activityId: "",
});

describe("legacy step projection (audit B1)", () => {
  it("shows the teaching and holds back only the sentence that states the answer", () => {
    const projection = splitLegacyStep(
      step("A letter stands for a number. With x = 2 the machine gives 7. Try it."),
      numeric(7),
    );
    expect(projection.eyebrow).toBe("One letter, one value");
    expect(projection.lead).toEqual([
      { kind: "paragraph", text: "A letter stands for a number. Try it." },
    ]);
    expect(projection.reveal).toEqual([
      { kind: "paragraph", text: "With x = 2 the machine gives 7." },
    ]);
  });
  it("treats numbers the prompt already gives as givens, not leaks", () => {
    const tokens = answerLeakTokens(
      numeric(2, "Which x makes x + 5 = 7 true, given 2 is a guess?"),
    );
    expect(tokens.numbers.has("2")).toBe(false);
  });
  it("does not split decimals or thousands", () => {
    expect(sentences("It is 2.5 m. Then 1,000 more.")).toEqual([
      "It is 2.5 m.",
      "Then 1,000 more.",
    ]);
    const projection = splitLegacyStep(step("About 1,000 people. The rest."), numeric(1000));
    expect(projection.reveal[0]).toEqual({ kind: "paragraph", text: "About 1,000 people." });
  });
});

describe("misconception feedback", () => {
  const question: Question = {
    ...numeric(14, "If x = 6, what is 3x − 4?"),
    misconceptions: [
      { match: { numeric: [6] }, feedback: "You subtracted first." },
      { match: { numeric: [5, 2] }, feedback: "3x is 3 × x." },
    ],
  };
  it("matches the slip by value and says something specific", () => {
    expect(matchMisconception(question, "6")).toBe("You subtracted first.");
    expect(matchMisconception(question, "6.0")).toBe("You subtracted first.");
    expect(matchMisconception(question, "2")).toBe("3x is 3 × x.");
    expect(matchMisconception(question, "13")).toBeUndefined();
  });
  it("matches a chosen option by id", () => {
    const choice: Question = {
      ...question,
      responseType: "short_text",
      answerAuthority: {
        kind: "text",
        acceptedIdeas: ["x + 5 = 12"],
        rejectedIdeas: [],
        exampleAnswer: "x + 5 = 12",
      },
      choices: [
        { id: "a", label: "x + 5 = 12" },
        { id: "b", label: "5x = 12" },
      ],
      misconceptions: [{ match: { choiceIds: ["b"] }, feedback: "5x means 5 × x." }],
    };
    expect(matchMisconception(choice, "5x = 12")).toBe("5x means 5 × x.");
  });
});
