import type { CalculusModel } from "@discere/contracts";
export const calcNumber = (v: number): string => Number(v.toFixed(4)).toString();
export function polynomialValue(c: readonly number[], x: number): number {
  return c.reduceRight((sum, coefficient) => sum * x + coefficient, 0);
}
export const derivativeCoefficients = (c: readonly number[]): number[] =>
  c.length === 1 ? [0] : c.slice(1).map((v, i) => v * (i + 1));
export const primitiveCoefficients = (c: readonly number[], constant = 0): number[] => [
  constant,
  ...c.map((v, i) => v / (i + 1)),
];
export function polynomialIntegral(c: readonly number[], a: number, b: number): number {
  const p = primitiveCoefficients(c);
  return polynomialValue(p, b) - polynomialValue(p, a);
}
export function rectangleSum(
  c: readonly number[],
  a: number,
  b: number,
  count: number,
  method: "left" | "right" | "midpoint",
): number {
  if (!Number.isInteger(count) || count < 1 || count > 24)
    throw Error("Use one to twenty-four rectangles.");
  const width = (b - a) / count,
    offset = method === "left" ? 0 : method === "right" ? 1 : 0.5;
  return Array.from(
    { length: count },
    (_, i) => polynomialValue(c, a + (i + offset) * width) * width,
  ).reduce((a, b) => a + b, 0);
}
export function polynomialLabel(c: readonly number[]): string {
  return (
    c
      .map((v, i) => ({ v, i }))
      .reverse()
      .filter((t) => t.v !== 0)
      .map(({ v, i }, j) => {
        const sign = v < 0 ? "−" : j ? "+" : "";
        const magnitude = Math.abs(v) === 1 && i > 0 ? "" : calcNumber(Math.abs(v));
        return (
          sign + magnitude + (i ? (i === 1 ? "x" : "x" + ["", "", "²", "³", "⁴", "⁵"][i]) : "")
        );
      })
      .join(" ") || "0"
  );
}
export function calculusGivens(m: CalculusModel): string {
  if (m.kind === "jump")
    return "f(x) = " + m.left + " for x < " + m.at + "; f(x) = " + m.right + " for x ≥ " + m.at;
  const f = "f(x) = " + polynomialLabel(m.coefficients);
  if (m.kind === "limit")
    return (
      f +
      (m.hole
        ? " when x ≠ " +
          m.at +
          "; f(" +
          m.at +
          ") " +
          (m.pointValue === undefined ? "is undefined" : "= " + m.pointValue)
        : "") +
      "; approach x = " +
      m.at
    );
  if (m.kind === "area") return f + "; interval [" + m.from + ", " + m.to + "]";
  if (m.kind === "primitive") return f + "; compare F with F′ = f";
  return f + "; start at x = " + m.at;
}
export function calculusWindow(m: CalculusModel): [number, number] {
  if (m.kind === "area") return [Math.min(0, m.from) - 0.5, Math.max(0, m.to) + 0.5];
  if (m.kind === "primitive") return [-2, 2];
  return [m.at - 2, m.at + 2];
}
export function calculusResults(m: CalculusModel): string[] {
  if (m.kind === "jump")
    return [
      "Left limit: " + m.left,
      "Right limit: " + m.right,
      m.left === m.right ? "Two-sided limit: " + m.left : "The two-sided limit does not exist.",
    ];
  if (m.kind === "limit") return ["Limit: " + calcNumber(polynomialValue(m.coefficients, m.at))];
  if (m.kind === "tangent")
    return [
      "Tangent slope: " + calcNumber(polynomialValue(derivativeCoefficients(m.coefficients), m.at)),
    ];
  if (m.kind === "secant")
    return [
      "Secant slope: " +
        calcNumber(
          (polynomialValue(m.coefficients, m.at + m.span) - polynomialValue(m.coefficients, m.at)) /
            m.span,
        ),
    ];
  if (m.kind === "primitive")
    return ["F(x) = " + polynomialLabel(primitiveCoefficients(m.coefficients, m.constant))];
  return [
    m.display === "rectangles"
      ? "Rectangle sum: " +
        calcNumber(rectangleSum(m.coefficients, m.from, m.to, m.rectangles, m.method))
      : "Signed integral: " + calcNumber(polynomialIntegral(m.coefficients, m.from, m.to)),
  ];
}
