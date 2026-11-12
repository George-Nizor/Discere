import { describe, expect, it } from "vitest";
import { assessNumericAnswer, parseNumericAnswer } from "../src/index.js";

describe("numbers typed with grouping, powers of ten and spaced signs", () => {
  const cases: Array<[string, number, string]> = [
    ["1,000", 1000, ""],
    ["1 000", 1000, ""],
    ["17,463,600", 17463600, ""],
    ["1,000.5", 1000.5, ""],
    ["£1,250", 1250, "£"],
    ["1.92 × 10^-14", 1.92e-14, ""],
    ["1.92*10^-14", 1.92e-14, ""],
    ["1.92x10^-14", 1.92e-14, ""],
    ["1.92 x 10⁻¹⁴", 1.92e-14, ""],
    ["1.92e-14", 1.92e-14, ""],
    ["1.92x10^-14 N", 1.92e-14, "N"],
    ["1.92 × 10^(-14) N", 1.92e-14, "N"],
    ["10^-3", 0.001, ""],
    ["- 5", -5, ""],
    ["−5", -5, ""],
  ];
  it.each(cases)("reads %s as %d", (input, value, unit) => {
    expect(
      assessNumericAnswer(input, { value, unit, relativeTolerance: 0, absoluteTolerance: 1e-20 }),
    ).toMatchObject({ correct: true });
  });
  it.each(["1,5", "1,00", "0,500", "1,0000", "1,000,00", "12,34,567", "1 5"])(
    "does not read %s as a grouped number",
    (input) => {
      expect(parseNumericAnswer(input)).toBeNull();
    },
  );
  it("keeps a wrong grouped number wrong", () => {
    expect(
      assessNumericAnswer("1,001", { value: 1000, unit: "", relativeTolerance: 0 }),
    ).toMatchObject({ correct: false, error: "outside_tolerance" });
  });
});

describe("unit words and symbols for the declared unit", () => {
  const cases: Array<[string, string, number]> = [
    ["$24", "dollars", 24],
    ["$24", "dollar", 24],
    ["24 dollars", "$", 24],
    ["$24 thousand", "thousand dollars", 24],
    ["€1.5 million", "million euros", 1.5],
    ["2 h", "hours", 2],
    ["2 hrs", "hours", 2],
    ["2 hour", "hours", 2],
    ["120 minutes", "hours", 2],
    ["2 hours", "h", 2],
    ["45°", "degrees", 45],
    ["45 deg", "degrees", 45],
    ["45 degrees", "°", 45],
    ["45 degree", "°", 45],
    ["20 C", "°C", 20],
    ["20 °C", "°C", 20],
    ["20 degrees C", "°C", 20],
    ["20 celsius", "°C", 20],
    ["12 row", "rows", 12],
    ["1 page", "pages", 1],
    ["3 request per second", "requests per second", 3],
    ["5 N·m", "N m", 5],
    ["5 kN m", "kN·m", 5],
    ["5 kpa", "kPa", 5],
    ["5 METRES", "m", 5],
    ["5 ml", "mL", 5],
    ["3e8 m/s", "×10⁸ m/s", 3],
    ["3 × 10^8 m/s", "×10⁸ m/s", 3],
    ["5e6 mm^4", "10⁶ mm⁴", 5],
  ];
  it.each(cases)("accepts %s for %s", (input, unit, value) => {
    expect(assessNumericAnswer(input, { value, unit, relativeTolerance: 0 })).toMatchObject({
      correct: true,
    });
  });
  it("reads 20 C as degrees Celsius only when Celsius is asked for", () => {
    expect(assessNumericAnswer("20 C", { value: 20, unit: "°" }).correct).toBe(false);
  });
  it("keeps a plain number in the declared power of ten", () => {
    expect(
      assessNumericAnswer("5000000", { value: 5, unit: "10⁶ mm⁴", relativeTolerance: 0 }).correct,
    ).toBe(false);
  });
  it("does not read a dollar sign as pounds", () => {
    expect(assessNumericAnswer("$24", { value: 24, unit: "£" }).correct).toBe(false);
    expect(assessNumericAnswer("$24", { value: 24, unit: "pounds" }).correct).toBe(false);
  });
});

describe("prefix case", () => {
  it.each([
    ["5 mW", "MW"],
    ["5 MW", "mW"],
    ["5 Mm", "mm"],
    ["5 MM", "mm"],
    ["5 mPa", "MPa"],
    ["5 mpa", "MPa"],
    ["5 Mb", "MB"],
    ["5 mb", "MB"],
    ["5 N·s", "ns"],
    ["5 mhz", "MHz"],
    ["5 ma", "mA"],
  ])("rejects %s for %s", (input, unit) => {
    expect(assessNumericAnswer(input, { value: 5, unit, relativeTolerance: 0 }).correct).toBe(
      false,
    );
  });
  it.each([
    ["5 MW", "MW"],
    ["5 mW", "mW"],
    ["5 mm", "mm"],
    ["5 kn", "kN"],
    ["5 KN", "kN"],
    ["5 hz", "Hz"],
    ["5 kB", "KB"],
    ["5 j", "J"],
    ["5 Rows", "rows"],
    ["5 DOLLARS", "dollars"],
  ])("accepts %s for %s", (input, unit) => {
    expect(assessNumericAnswer(input, { value: 5, unit, relativeTolerance: 0 }).correct).toBe(true);
  });
  it("still converts across prefixes", () => {
    expect(
      assessNumericAnswer("5000 kW", { value: 5, unit: "MW", relativeTolerance: 0 }).correct,
    ).toBe(true);
    expect(
      assessNumericAnswer("0.005 s", { value: 5, unit: "ms", relativeTolerance: 0 }).correct,
    ).toBe(true);
  });
});
