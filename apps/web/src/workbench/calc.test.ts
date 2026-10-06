import { describe, expect, it } from "vitest";
import { CalcError, evaluate, formatResult } from "./calc.js";

const close = (input: string, expected: number, angle: "deg" | "rad" = "deg") =>
  expect(evaluate(input, angle)).toBeCloseTo(expected, 10);

describe("calculator", () => {
  it("respects precedence, brackets and right-associative powers", () => {
    close("2+3*4", 14);
    close("(2+3)*4", 20);
    close("2^3^2", 512);
    close("-3^2", -9);
    close("(-3)^2", 9);
    close("10/4", 2.5);
    close("7 − 2 × 3", 1);
    close("8 ÷ 2", 4);
  });
  it("multiplies implicitly", () => {
    close("2pi", 2 * Math.PI);
    close("3(4+1)", 15);
    close("(1+1)(2+2)", 8);
    close("2sqrt(9)", 6);
  });
  it("handles functions in degrees and radians", () => {
    expect(evaluate("sin(30)")).toBeCloseTo(0.5, 12);
    expect(evaluate("cos(90)")).toBe(0);
    expect(evaluate("sin(180)")).toBe(0);
    close("sin(pi/2)", 1, "rad");
    close("asin(1)", 90);
    close("atan(1)", Math.PI / 4, "rad");
    close("sin 30", 0.5);
    close("√16", 4);
    close("ln(e)", 1);
    close("log(1000)", 3);
    close("log2(8)", 3);
    close("|−5|", 5);
    close("abs(-2.5)", 2.5);
    close("exp(0)", 1);
  });
  it("supports factorial, percent, scientific notation and Ans", () => {
    close("5!", 120);
    close("50%", 0.5);
    close("6.02e23/1e23", 6.02);
    expect(evaluate("ans*2", "deg", 21)).toBe(42);
  });
  it("explains invalid input instead of guessing", () => {
    for (const bad of ["", "2+", "(1+2", "1+2)", "sqrt(-1)", "1/0", "tan(90)", "asin(2)", "foo", "2 $ 3", "(-1)^0.5"]) {
      expect(() => evaluate(bad)).toThrow(CalcError);
    }
  });
  it("formats results readably", () => {
    expect(formatResult(0.1 + 0.2)).toBe("0.3");
    expect(formatResult(1 / 3)).toBe("0.333333333333");
    expect(formatResult(6.02e23)).toBe("6.02e+23");
    expect(formatResult(-0.0000001234)).toBe("-1.234e-7");
  });
});
