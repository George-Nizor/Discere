import { describe, expect, it } from "vitest";
import { checkPreservation, lintText } from "../src/index.js";

describe("Discere writing gate", () => {
  it("rejects negative parallelism", () => {
    const result = lintText("A resistor not only limits current, but also releases heat.");
    expect(result.passed).toBe(false);
    expect(result.violations.some((item) => item.ruleId === "NEG001_NOT_ONLY_BUT_ALSO")).toBe(true);
  });

  it("rejects the not-X-it-is-Y construction", () => {
    const result = lintText("This is not a current source; it is a voltage source.");
    expect(result.passed).toBe(false);
    expect(result.violations.some((item) => item.ruleId === "NEG003_NOT_X_IT_IS_Y")).toBe(true);
  });

  it("raises generic praise to a hard error in feedback", () => {
    const result = lintText("Great job! Your calculation uses the correct equation.", {
      context: "feedback",
    });
    expect(result.passed).toBe(false);
  });

  it("rejects a hidden answer inside a hint", () => {
    const result = lintText("Divide the values to get 0.05 A.", {
      context: "hint",
      hiddenAnswer: "0.05 A",
    });
    expect(result.violations.some((item) => item.ruleId === "ANS001_FINAL_ANSWER_IN_HINT")).toBe(true);
  });

  it("rejects equivalent numeric answers written in another unit", () => {
    const result = lintText("The current is 50 mA.", {
      context: "hint",
      hiddenAnswer: "0.05 A",
    });
    expect(result.passed).toBe(false);
    expect(result.violations.some((item) => item.ruleId === "ANS005_EQUIVALENT_NUMERIC_ANSWER")).toBe(true);
  });

  it("detects negative parallelism that uses a contraction", () => {
    const result = lintText("That isn't a minor detail; it is the central idea.");
    expect(result.passed).toBe(false);
    expect(result.violations.some((item) => item.ruleId === "NEG003_NOT_X_IT_IS_Y")).toBe(true);
  });

  it("detects contractions on both sides of a rhetorical contrast", () => {
    const result = lintText("It's not about memorising; it's about seeing the relationship.");
    expect(result.passed).toBe(false);
    expect(result.violations.some((item) => item.ruleId === "NEG003_NOT_X_IT_IS_Y")).toBe(true);
  });

  it("detects abstract not-X-but-Y framing", () => {
    const result = lintText("The goal is not speed, but understanding.");
    expect(result.passed).toBe(false);
    expect(result.violations.some((item) => item.ruleId === "NEG003_NOT_X_IT_IS_Y")).toBe(true);
  });

  it("detects not-merely-but framing", () => {
    const result = lintText("The graph is not merely a picture but a model of the relationship.");
    expect(result.passed).toBe(false);
    expect(result.violations.some((item) => item.ruleId === "NEG001_NOT_ONLY_BUT_ALSO")).toBe(true);
  });

  it("rejects equivalent numeric answers written as words", () => {
    const result = lintText("The current is 50 milliamps.", {
      context: "hint",
      hiddenAnswer: "0.05 A",
    });
    expect(result.passed).toBe(false);
    expect(result.violations.some((item) => item.ruleId === "ANS005_EQUIVALENT_NUMERIC_ANSWER")).toBe(true);
  });

  it("accepts direct learning prose", () => {
    const result = lintText(
      "Current measures how quickly electric charge passes a point. Increase resistance while voltage stays fixed and the current falls.",
    );
    expect(result.passed).toBe(true);
  });

  it("detects altered numbers during editing", () => {
    const result = checkPreservation("Use 5 V across 100 Ω. I = V / R.", "Use 6 V across 100 Ω. I = V / R.");
    expect(result.passed).toBe(false);
    expect(result.missingNumbers).toContain("5");
    expect(result.addedNumbers).toContain("6");
  });
});
