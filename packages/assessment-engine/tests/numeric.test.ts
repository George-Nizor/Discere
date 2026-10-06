import { describe, expect, it } from "vitest";
import { assessNumericAnswer, parseNumericAnswer } from "../src/index.js";

describe("numeric assessment", () => {
  it("normalises milliamps", () =>
    expect(parseNumericAnswer("50 mA")).toEqual({ value: 0.05, unit: "A" }));
  it("accepts a value inside tolerance", () =>
    expect(
      assessNumericAnswer("0.049 A", { value: 0.05, unit: "A", relativeTolerance: 0.03 }).correct,
    ).toBe(true));
  it("rejects incompatible units", () =>
    expect(assessNumericAnswer("5 V", { value: 5, unit: "A" }).error).toBe("unit_mismatch"));
  it("accepts exact fractions and a mathematical minus sign", () => {
    expect(
      assessNumericAnswer("−3 / 4", { value: -0.75, unit: "", relativeTolerance: 0 }).correct,
    ).toBe(true);
    expect(parseNumericAnswer("1/2 A")).toEqual({ value: 0.5, unit: "A" });
  });
  it("rejects zero denominators, expressions, and units on dimensionless answers", () => {
    for (const input of ["1/0", "1/0.0", "2+3", "Infinity", "1/2/3"])
      expect(parseNumericAnswer(input)).toBeNull();
    expect(assessNumericAnswer("4 V", { value: 4, unit: "" }).error).toBe("unit_mismatch");
    expect(
      assessNumericAnswer("0.76", { value: 0.75, unit: "", relativeTolerance: 0 }).correct,
    ).toBe(false);
  });
});

describe("physical quantities", () => {
  it.each(["13 m", "13 metres", "13 metres.", "1300 cm", "0.013 km", "13"])(
    "accepts equivalent distances: %s",
    (input) => {
      expect(
        assessNumericAnswer(input, { value: 13, unit: "m", relativeTolerance: 0 }).correct,
      ).toBe(true);
    },
  );
  it("accepts compound units, fractions, and equivalent impulse dimensions", () => {
    expect(assessNumericAnswer("1/3 m/s", { value: 1 / 3, unit: "m/s" }).correct).toBe(true);
    expect(assessNumericAnswer("2 m/s^2", { value: 2, unit: "m/s²" }).correct).toBe(true);
    expect(assessNumericAnswer("18 N·s", { value: 18, unit: "kg·m/s" }).correct).toBe(true);
    expect(assessNumericAnswer("60%", { value: 60, unit: "%" }).correct).toBe(true);
    expect(assessNumericAnswer("5 cm", { value: 5, unit: "cm" }).correct).toBe(true);
    expect(assessNumericAnswer("5", { value: 5, unit: "cm" }).correct).toBe(true);
  });
  it("rejects the wrong physical dimension and units on a dimensionless factor", () => {
    for (const input of ["13 s", "13 J", "13 m/s"])
      expect(assessNumericAnswer(input, { value: 13, unit: "m" }).error).toBe("unit_mismatch");
    expect(assessNumericAnswer("4 m", { value: 4, unit: "" }).error).toBe("unit_mismatch");
    expect(assessNumericAnswer("2 m/s", { value: 2, unit: "m/s²" }).error).toBe("unit_mismatch");
  });
});

describe("authored counts and probabilities", () => {
  it("accepts the named particle count and rejects a different particle", () => {
    for (const input of ["16", "16 electron", "16 electrons."])
      expect(assessNumericAnswer(input, { value: 16, unit: "electrons" }).correct).toBe(true);
    expect(assessNumericAnswer("16 protons", { value: 16, unit: "electrons" }).error).toBe(
      "unit_mismatch",
    );
    expect(
      assessNumericAnswer("15 electrons", { value: 16, unit: "electrons", relativeTolerance: 0 })
        .correct,
    ).toBe(false);
  });
  it("accepts fractions, decimals and percentages only for a declared probability", () => {
    for (const input of ["1/4", "0.25", "25%", "25 percent"])
      expect(
        assessNumericAnswer(input, { value: 0.25, unit: "probability", relativeTolerance: 0 })
          .correct,
      ).toBe(true);
    expect(assessNumericAnswer("25", { value: 0.25, unit: "probability" }).correct).toBe(false);
    expect(assessNumericAnswer("25%", { value: 25, unit: "%" }).correct).toBe(true);
    expect(assessNumericAnswer("25%", { value: 0.25, unit: "" }).error).toBe("unit_mismatch");
    expect(assessNumericAnswer("0.25 m", { value: 0.25, unit: "probability" }).error).toBe(
      "unit_mismatch",
    );
  });
  it("keeps mass, moles and atomic mass distinct and converts grams", () => {
    expect(
      assessNumericAnswer("0.036 kg", { value: 36, unit: "g", relativeTolerance: 0 }).correct,
    ).toBe(true);
    expect(assessNumericAnswer("36 grams.", { value: 36, unit: "g" }).correct).toBe(true);
    expect(assessNumericAnswer("2 moles", { value: 2, unit: "mol" }).correct).toBe(true);
    expect(assessNumericAnswer("18 amu", { value: 18, unit: "u" }).correct).toBe(true);
    expect(assessNumericAnswer("18 g", { value: 18, unit: "u" }).error).toBe("unit_mismatch");
    expect(assessNumericAnswer("2 g", { value: 2, unit: "mol" }).error).toBe("unit_mismatch");
  });
});

describe("equivalent production quantities", () => {
  it.each([
    ["1200 mm", 1.2, "m"],
    ["2 minutes", 120, "s"],
    ["120 second", 120, "s"],
    ["0.4 kJ", 400, "J"],
    ["0.25 kN", 250, "N"],
    ["500 mmol", 0.5, "mol"],
  ])("accepts %s without losing the physical dimension", (input, value, unit) => {
    expect(
      assessNumericAnswer(input as string, { value: value as number, unit: unit as string })
        .correct,
    ).toBe(true);
    expect(
      assessNumericAnswer(input as string, { value: value as number, unit: "V" }).correct,
    ).toBe(false);
  });
});

describe("the question's own unit", () => {
  const cases: Array<[string, string, number]> = [
    ["52 °", "°", 52],
    ["52°", "°", 52],
    ["£24", "£", 24],
    ["24 £", "£", 24],
    ["£3m", "£m", 3],
    ["3 £m", "£m", 3],
    ["1.2 L☉", "L☉", 1.2],
    ["4.5 million years", "million years", 4.5],
    ["0.5 °/day", "°/day", 0.5],
  ];
  it.each(cases)("accepts %s for a question in %s", (input, unit, value) => {
    expect(assessNumericAnswer(input, { value, unit })).toMatchObject({ correct: true });
  });
  it("still marks a wrong number wrong", () => {
    expect(assessNumericAnswer("53 °", { value: 52, unit: "°" })).toMatchObject({ correct: false, error: "outside_tolerance" });
  });
  it("does not mistake another unit for the declared one", () => {
    expect(assessNumericAnswer("£24", { value: 24, unit: "£m" }).correct).toBe(false);
  });
});
