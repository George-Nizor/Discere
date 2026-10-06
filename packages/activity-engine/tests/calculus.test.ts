import { describe, expect, it } from "vitest";
import { CalculusModelSchema, CalculusDiagramSchema } from "@discere/contracts";
import {
  polynomialValue as f,
  derivativeCoefficients as d,
  primitiveCoefficients as p,
  polynomialIntegral as integral,
  rectangleSum,
  calculusResults,
  polynomialLabel,
} from "../src/calculus.js";
describe("calculus invariants", () => {
  it.each([
    [3, -2, 4],
    [1, 4, 4],
    [0, 0, 0, 1],
    [-2, 3, 0, -1, 2],
  ])("derivatives agree with independent central differences for %j", (a, b, c, ...rest) => {
    const coeff = [a, b, c, ...rest];
    for (const x of [-1.5, -0.2, 0, 1, 2]) {
      const h = 0.00001;
      expect(f(d(coeff), x)).toBeCloseTo((f(coeff, x + h) - f(coeff, x - h)) / (2 * h), 5);
    }
  });
  it("antiderivatives differentiate back to their rates regardless of constant", () => {
    for (const coeff of [[2], [3, 2], [0, 0, 3], [2, -3, 4, 1]]) {
      for (const constant of [-5, 0, 4]) expect(d(p(coeff, constant))).toEqual(coeff);
    }
  });
  it("integrals match independently constructed Simpson sums", () => {
    const coeff = [2, -1, 3, 2];
    let sum = 0;
    const count = 100,
      width = 3 / count;
    for (let i = 0; i < count; i++) {
      const a = -1 + i * width,
        b = a + width;
      sum += (width / 6) * (f(coeff, a) + 4 * f(coeff, (a + b) / 2) + f(coeff, b));
    }
    expect(integral(coeff, -1, 2)).toBeCloseTo(sum, 10);
  });
  it("preserves signed area, additivity and reversed bounds", () => {
    expect(integral([0, 1], -2, 2)).toBe(0);
    expect(integral([-3], 0, 4)).toBe(-12);
    expect(integral([1, 2], 3, 1)).toBe(-integral([1, 2], 1, 3));
    expect(integral([2, 0, 1], -1, 3)).toBeCloseTo(
      integral([2, 0, 1], -1, 0) + integral([2, 0, 1], 0, 3),
      10,
    );
  });
  it("bounds increasing functions with left and right sums", () => {
    const exact = integral([0, 0, 1], 0, 2);
    for (const n of [1, 2, 8, 24]) {
      expect(rectangleSum([0, 0, 1], 0, 2, n, "left")).toBeLessThan(exact);
      expect(rectangleSum([0, 0, 1], 0, 2, n, "right")).toBeGreaterThan(exact);
    }
    expect(Math.abs(rectangleSum([0, 0, 1], 0, 2, 24, "left") - exact)).toBeLessThan(
      Math.abs(rectangleSum([0, 0, 1], 0, 2, 2, "left") - exact),
    );
  });
  it("midpoint sums are exact for affine rates", () => {
    for (const n of [1, 3, 24])
      expect(rectangleSum([3, -2], -1, 4, n, "midpoint")).toBeCloseTo(integral([3, -2], -1, 4), 10);
  });
  it("rejects unbounded work and arbitrary answer fields", () => {
    expect(() => rectangleSum([1], 0, 1, 1000, "left")).toThrow();
    expect(
      CalculusModelSchema.safeParse({ kind: "tangent", coefficients: [1], at: 0, answer: 4 })
        .success,
    ).toBe(false);
    expect(
      CalculusModelSchema.safeParse({
        kind: "area",
        coefficients: [1],
        from: 2,
        to: 1,
        rectangles: 4,
        method: "left",
        display: "integral",
      }).success,
    ).toBe(false);
    expect(
      CalculusModelSchema.safeParse({ kind: "tangent", coefficients: [1, 2, 3, 4, 5, 6], at: 0 })
        .success,
    ).toBe(false);
  });
  it("distinguishes point assignment, limit and jump", () => {
    expect(
      calculusResults({ kind: "limit", coefficients: [1, 1], at: 2, hole: true, pointValue: 9 }),
    ).toEqual(["Limit: 3"]);
    expect(calculusResults({ kind: "jump", at: 0, left: 2, right: 5 })).toContain(
      "The two-sided limit does not exist.",
    );
    expect(calculusResults({ kind: "jump", at: 0, left: 2, right: 2 })).toContain(
      "Two-sided limit: 2",
    );
  });
  it("requires an available unique case selection", () => {
    const m = { kind: "tangent", coefficients: [0, 1], at: 0 };
    expect(
      CalculusDiagramSchema.safeParse({
        type: "calculus_explorer",
        initialCaseId: "missing",
        cases: [
          { id: "a", label: "One", model: m },
          { id: "a", label: "Two", model: m },
        ],
      }).success,
    ).toBe(false);
  });
  it("labels a negative coefficient and omits zero terms", () => {
    expect(polynomialLabel([4, 0, -1])).toBe("−x² +4");
    expect(polynomialLabel([0])).toBe("0");
  });
});
