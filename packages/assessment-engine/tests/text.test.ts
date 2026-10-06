import { describe, expect, it } from "vitest";
import { assessTextAnswer } from "../src/index.js";

describe("mathematical text answers", () => {
  it("keeps signs and operators distinct when marking equation choices", () => {
    const rule = { acceptedIdeas: ["y = 2x − 2"], rejectedIdeas: [] };
    expect(assessTextAnswer("y = 2x - 2", rule).correct).toBe(true);
    expect(assessTextAnswer("y = -2x + 2", rule).correct).toBe(false);
    expect(assessTextAnswer("y = 2x + 2", rule).correct).toBe(false);
  });
});

describe("term boundaries", () => {
  it("distinguishes logical opposites and whole symbols", () => {
    expect(
      assessTextAnswer("invalid", { acceptedIdeas: ["valid"], rejectedIdeas: [] }).correct,
    ).toBe(false);
    expect(
      assessTextAnswer("unsound", { acceptedIdeas: ["sound"], rejectedIdeas: [] }).correct,
    ).toBe(false);
    expect(assessTextAnswer("question", { acceptedIdeas: ["q"], rejectedIdeas: [] }).correct).toBe(
      false,
    );
    expect(
      assessTextAnswer("The conclusion is q.", { acceptedIdeas: ["q"], rejectedIdeas: [] }).correct,
    ).toBe(true);
  });
  it("does not treat an explicitly negated marking term as asserted", () => {
    expect(
      assessTextAnswer("It is not valid.", { acceptedIdeas: ["valid"], rejectedIdeas: [] }).correct,
    ).toBe(false);
    expect(
      assessTextAnswer("It is valid, not invalid.", {
        acceptedIdeas: ["valid"],
        rejectedIdeas: ["invalid"],
      }).correct,
    ).toBe(true);
  });
});

describe("explicit alternatives for a single scientific term", () => {
  const authority = {
    acceptedIdeas: ["plasma membrane"],
    acceptedAlternatives: ["cell membrane"],
    rejectedIdeas: ["cell wall"],
  };
  it("accepts each equivalent phrase without requiring both", () => {
    expect(assessTextAnswer("plasma membrane", authority)).toMatchObject({
      correct: true,
      coverage: 1,
      matchedIdeas: ["plasma membrane"],
    });
    expect(assessTextAnswer("The cell membrane.", authority)).toMatchObject({
      correct: true,
      coverage: 1,
      matchedIdeas: ["plasma membrane"],
    });
  });
  it("retains word boundaries, negation and rejected-claim checks", () => {
    for (const answer of [
      "not a cell membrane",
      "cell membranectomy",
      "cell wall",
      "cell membrane and cell wall",
    ])
      expect(assessTextAnswer(answer, authority).correct).toBe(false);
  });
  it("does not let alternatives satisfy a multi-idea rubric", () => {
    expect(
      assessTextAnswer("cell membrane", {
        ...authority,
        acceptedIdeas: ["plasma membrane", "selective exchange"],
      }).correct,
    ).toBe(false);
  });
});

describe("contracted negation", () => {
  const rule = { acceptedIdeas: ["valid"], rejectedIdeas: ["invalid"] };
  it.each(["It isn't valid.", "It isn’t valid.", "It wasn't valid.", "It can’t be valid."])(
    "does not credit an explicitly negated claim: %s",
    (input) => {
      expect(assessTextAnswer(input, rule).correct).toBe(false);
    },
  );
  it("allows an asserted answer with a negated alternative", () => {
    expect(assessTextAnswer("It is valid and isn't invalid.", rule).correct).toBe(true);
  });
});

describe("contradictory and qualified claims", () => {
  const authority = { acceptedIdeas: ["valid"], rejectedIdeas: ["invalid"] };
  it.each([
    "not necessarily valid",
    "cannot be valid",
    "not always valid",
    "It is valid. Actually it is not valid.",
  ])("does not credit %s", (input) => {
    expect(assessTextAnswer(input, authority).correct).toBe(false);
  });
  it("keeps an asserted wrong claim disqualifying even if repeated with a negation", () => {
    expect(assessTextAnswer("valid and invalid; not invalid", authority).correct).toBe(false);
    expect(assessTextAnswer("valid and not invalid", authority).correct).toBe(true);
  });
});

describe("grammatical number and hyphens (audit M6)", () => {
  const same = { acceptedIdeas: ["same value"], rejectedIdeas: ["different values"] };
  it("accepts a plural or singular form of an accepted phrase", () => {
    expect(assessTextAnswer("They have the same values", same).correct).toBe(true);
    expect(assessTextAnswer("the same value both times", same).correct).toBe(true);
    expect(
      assessTextAnswer("the boxes balance", { acceptedIdeas: ["box"], rejectedIdeas: [] }).correct,
    ).toBe(true);
  });
  it("treats a hyphenated phrase and its spaced form alike", () => {
    expect(
      assessTextAnswer("it is well known", { acceptedIdeas: ["well-known"], rejectedIdeas: [] })
        .correct,
    ).toBe(true);
  });
  it("stays strict about meaning", () => {
    expect(assessTextAnswer("different values", same).correct).toBe(false);
    expect(assessTextAnswer("not the same value", same).correct).toBe(false);
    expect(assessTextAnswer("the sameness", same).correct).toBe(false);
  });
});
