import { describe, expect, it } from "vitest";
import { assessTextAnswer } from "../src/index.js";
import { stemWord } from "../src/text.js";

const one = (idea: string, rejected: string[] = []) => ({
  acceptedIdeas: [idea],
  rejectedIdeas: rejected,
});

describe("shared stems", () => {
  it.each([
    ["tracing", "trace"],
    ["traced", "trace"],
    ["dominance", "dominant"],
    ["dominant", "dominance"],
    ["boundaries", "boundary"],
    ["hypotheses", "hypothesis"],
    ["analyses", "analysis"],
    ["the differences", "different"],
  ])("accepts %s for %s", (input, idea) => {
    expect(assessTextAnswer(input, one(idea)).correct).toBe(true);
  });
  it.each([
    ["valid", "invalid"],
    ["sound", "unsound"],
    ["the sameness", "same"],
    ["recessive", "dominant"],
    ["stud", "student"],
  ])("still rejects %s for %s", (input, idea) => {
    expect(assessTextAnswer(input, one(idea)).correct).toBe(false);
  });
  it("leaves short words exact", () => {
    expect(stemWord("cats")).toBe("cats");
    expect(stemWord("thing")).toBe("thing");
    expect(stemWord("this")).toBe("this");
  });
  it("matches a longer idea only as written, where the wording is the point", () => {
    const parallel = one("Install the package; configure the file; run the server");
    expect(
      assessTextAnswer("Install the package; configuring the file; run the server", parallel)
        .correct,
    ).toBe(false);
    expect(
      assessTextAnswer("Install the package; configure the file; run the server", parallel).correct,
    ).toBe(true);
  });
});

describe("one typing slip in a longer word", () => {
  it.each([
    ["the tropospere", "troposphere"],
    ["the troposphera", "troposphere"],
    ["photosynthesiss", "photosynthesis"],
    ["mitocondria", "mitochondria"],
  ])("accepts %s for %s", (input, idea) => {
    expect(assessTextAnswer(input, one(idea)).correct).toBe(true);
  });
  it.each([
    ["effect", "affect"],
    ["afferent", "efferent"],
    ["mitosis", "meiosis"],
    ["cell", "call"],
    ["trace", "track"],
  ])("does not treat %s as a slip for %s", (input, idea) => {
    expect(assessTextAnswer(input, one(idea)).correct).toBe(false);
  });
  it("never reads a word named by a rejected idea as a slip", () => {
    expect(assessTextAnswer("adsorption", one("absorption", ["adsorption"])).correct).toBe(false);
  });
  it("keeps rejected ideas strict", () => {
    expect(assessTextAnswer("dominant, not recesive", one("dominant", ["recessive"])).correct).toBe(
      true,
    );
  });
});

describe("negation", () => {
  const troposphere = one("troposphere", ["stratosphere"]);
  it.each([
    "I don't think it's the troposphere",
    "I dont think it's the troposphere",
    "She doesnt believe it is the troposphere",
    "It isnt the troposphere",
    "not the troposphere",
  ])("does not credit %s", (input) => {
    expect(assessTextAnswer(input, troposphere).correct).toBe(false);
  });
  it.each([
    "The troposphere, not the stratosphere",
    "It's the troposphere. It isnt the stratosphere.",
    "the troposphere; I dont think it's the stratosphere",
  ])("does not let a negated rejected idea refuse %s", (input) => {
    expect(assessTextAnswer(input, troposphere).correct).toBe(true);
  });
  it("still refuses an asserted rejected idea", () => {
    expect(assessTextAnswer("troposphere or stratosphere", troposphere).correct).toBe(false);
  });
});

describe("significant symbols (current behaviour, unchanged in this pass)", () => {
  it("strips the status letters of git output, so ?? two.txt matches two.txt", () => {
    const untracked = one("?? two.txt");
    expect(assessTextAnswer("?? two.txt", untracked).correct).toBe(true);
    expect(assessTextAnswer("two.txt", untracked).correct).toBe(true);
    expect(assessTextAnswer("M two.txt", untracked).correct).toBe(true);
  });
  it("strips the ampersand of a Rust borrow, so &self matches self", () => {
    const borrow = one("&self");
    expect(assessTextAnswer("&self", borrow).correct).toBe(true);
    expect(assessTextAnswer("self", borrow).correct).toBe(true);
    expect(assessTextAnswer("&mut self", borrow).correct).toBe(true);
  });
});
