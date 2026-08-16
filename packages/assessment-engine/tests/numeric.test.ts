import { describe, expect, it } from "vitest";
import { assessNumericAnswer, parseNumericAnswer } from "../src/index.js";
describe("numeric assessment", () => {
  it("normalises milliamps", () => expect(parseNumericAnswer("50 mA")).toEqual({ value: 0.05, unit: "A" }));
  it("accepts a value inside tolerance", () => expect(assessNumericAnswer("0.049 A", { value: 0.05, unit: "A", relativeTolerance: 0.03 }).correct).toBe(true));
  it("rejects incompatible units", () => expect(assessNumericAnswer("5 V", { value: 5, unit: "A" }).error).toBe("unit_mismatch"));
});
