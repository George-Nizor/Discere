import { describe, expect, it } from "vitest";
import {
  linearAlgebraResult,
  linearAlgebraArrows,
  linearApply,
  linearDeterminant,
  linearDot,
  linearInverse,
  linearMatrixProduct as product,
  linearProjection,
  linearRowReduction,
  linearSingularValues,
  linearSvd2,
  linearTranspose as transpose,
} from "../src/linear-algebra.js";
const identity = [
  [1, 0],
  [0, 1],
];
function closeMatrix(a: number[][], b: number[][]) {
  expect(a.length).toBe(b.length);
  a.forEach((r, i) => {
    expect(r.length).toBe(b[i]!.length);
    r.forEach((x, j) => expect(x).toBeCloseTo(b[i]![j]!, 9));
  });
}
describe("linear algebra calculations", () => {
  it("applies rows to vectors and composes maps in the declared order", () => {
    const a = [
        [1, 2],
        [0, 1],
      ],
      b = [
        [2, 0],
        [0, 3],
      ],
      v = [2, -1];
    closeMatrix(product(a, b), [
      [2, 6],
      [0, 3],
    ]);
    expect(linearApply(product(a, b), v)).toEqual(linearApply(a, linearApply(b, v)));
    expect(product(a, b)).not.toEqual(product(b, a));
    expect(() => product(a, [[1, 2, 3]])).toThrow(/dimensions/);
  });
  it("transposes rectangular matrices and reverses the order of a transposed product", () => {
    closeMatrix(
      transpose([
        [1, 2, 3],
        [4, 5, 6],
      ]),
      [
        [1, 4],
        [2, 5],
        [3, 6],
      ],
    );
    const a = [
        [1, 2, 3],
        [0, 1, 2],
      ],
      b = [
        [1, 0],
        [2, 1],
        [0, 1],
      ];
    closeMatrix(transpose(product(a, b)), product(transpose(b), transpose(a)));
  });
  it("returns invertible maps to identity, including a row swap", () => {
    for (const a of [
      [
        [2, 1],
        [1, 1],
      ],
      [
        [0, 2],
        [3, 0],
      ],
      [
        [1, 2, 1],
        [0, 1, 3],
        [2, 0, 1],
      ],
    ]) {
      const inverse = linearInverse(a)!;
      const expected = a.map((r, i) => r.map((_, j) => (i === j ? 1 : 0)));
      closeMatrix(product(a, inverse), expected);
      closeMatrix(product(inverse, a), expected);
    }
    expect(
      linearInverse([
        [1, 2],
        [2, 4],
      ]),
    ).toBeNull();
  });
  it("reduces augmented equations without treating the right side as a variable", () => {
    const rows = linearRowReduction(
      [
        [1, 1, 5],
        [2, -1, 1],
      ],
      2,
    );
    closeMatrix(rows.matrix, [
      [1, 0, 2],
      [0, 1, 3],
    ]);
    expect(rows.pivots).toEqual([0, 1]);
    expect(rows.steps.some((s) => s.label.startsWith("Swap rows"))).toBe(true);
    expect(rows.steps[0]!.matrix).toEqual([
      [1, 1, 5],
      [2, -1, 1],
    ]);
    expect(
      linearAlgebraResult({
        kind: "system",
        matrix: [
          [1, 1],
          [2, 2],
        ],
        rhs: [3, 6],
      }).detail,
    ).toMatch(/Infinitely/);
    expect(
      linearAlgebraResult({
        kind: "system",
        matrix: [
          [1, 1],
          [2, 2],
        ],
        rhs: [3, 7],
      }).detail,
    ).toMatch(/No solution/);
    expect(
      linearAlgebraResult({
        kind: "system",
        matrix: [
          [1, 1],
          [2, -1],
        ],
        rhs: [5, 1],
      }).value,
    ).toEqual([2, 3]);
  });
  it("does not discard uniformly small nonzero coefficients or immutable givens", () => {
    const original = [
      [1e-12, 0, 2e-12],
      [0, 2e-12, 6e-12],
    ];
    const reduced = linearRowReduction(original, 2);
    closeMatrix(reduced.matrix, [
      [1, 0, 2],
      [0, 1, 3],
    ]);
    expect(original).toEqual([
      [1e-12, 0, 2e-12],
      [0, 2e-12, 6e-12],
    ]);
  });
  it("preserves determinant sign, multiplicativity and singular collapse", () => {
    expect(
      linearDeterminant([
        [2, 1],
        [1, 3],
      ]),
    ).toBe(5);
    expect(
      linearDeterminant([
        [1, 3],
        [2, 1],
      ]),
    ).toBe(-5);
    expect(
      linearDeterminant([
        [1, 2],
        [2, 4],
      ]),
    ).toBe(0);
    expect(
      linearDeterminant([
        [1, 2, 3],
        [0, 4, 5],
        [1, 0, 6],
      ]),
    ).toBe(22);
    const a = [
        [2, 1],
        [1, 3],
      ],
      b = [
        [1, 2],
        [3, 4],
      ];
    expect(linearDeterminant(product(a, b))).toBe(linearDeterminant(a) * linearDeterminant(b));
  });
  it("projects onto a line with a perpendicular residual and ignores direction scale", () => {
    const v = [4, 2],
      d = [1, 1],
      p = linearProjection(v, d);
    expect(p).toEqual([3, 3]);
    expect(
      linearDot(
        v.map((n, i) => n - p[i]!),
        d,
      ),
    ).toBeCloseTo(0, 10);
    expect(linearProjection(v, [-2, -2])).toEqual(p);
    expect(() => linearProjection(v, [0, 0])).toThrow(/nonzero/);
  });
  it("distinguishes line, plane, and zero spans", () => {
    expect(
      linearAlgebraResult({
        kind: "span",
        vectors: [
          [1, 2],
          [2, 4],
        ],
      }).value,
    ).toBe(1);
    expect(
      linearAlgebraResult({
        kind: "span",
        vectors: [
          [1, 2],
          [2, 3],
        ],
      }).value,
    ).toBe(2);
    expect(linearAlgebraResult({ kind: "span", vectors: [[0, 0]] }).value).toBe(0);
  });
  it("checks a nonzero eigenvector, including a negative eigenvalue and a rejected candidate", () => {
    expect(
      linearAlgebraResult({
        kind: "eigen",
        matrix: [
          [2, 1],
          [1, 2],
        ],
        vector: [1, 1],
      }).value,
    ).toBe(3);
    expect(
      linearAlgebraResult({
        kind: "eigen",
        matrix: [
          [-2, 0],
          [0, 3],
        ],
        vector: [1, 0],
      }).value,
    ).toBe(-2);
    expect(
      linearAlgebraResult({
        kind: "eigen",
        matrix: [
          [2, 1],
          [1, 2],
        ],
        vector: [1, 0],
      }).value,
    ).toBeNull();
  });
  it("uses nonnegative ordered singular values for square and rectangular maps", () => {
    expect(
      linearSingularValues([
        [3, 0, 0],
        [0, 4, 0],
      ]),
    ).toEqual([4, 3]);
    expect(
      linearSingularValues([
        [3, 0],
        [0, 4],
        [0, 0],
      ]),
    ).toEqual([4, 3]);
    expect(
      linearSingularValues([
        [1, 2],
        [2, 4],
      ]),
    ).toEqual([5, 0]);
    expect(
      linearSingularValues([
        [0, 0],
        [0, 0],
      ]),
    ).toEqual([0, 0]);
    expect(
      linearSingularValues([
        [1, 0],
        [0, 1e-8],
      ])[1],
    ).toBeCloseTo(1e-8, 14);
  });
  it.each([
    [
      [2, 1],
      [0, 1],
    ],
    [
      [0, -2],
      [3, 0],
    ],
    [
      [1, 2],
      [2, 4],
    ],
    [
      [0, 0],
      [0, 0],
    ],
    [
      [2, 0],
      [0, 2],
    ],
    [
      [1, 1e-10],
      [0, 1e-8],
    ],
    [
      [0, 1e-12],
      [2e-12, 0],
    ],
  ])("reconstructs A from orthogonal SVD factors for %j", (...rows) => {
    const a = rows as number[][],
      f = linearSvd2(a);
    closeMatrix(product(product(f.u, f.s), f.vt), a);
    closeMatrix(product(transpose(f.u), f.u), identity);
    closeMatrix(product(f.vt, transpose(f.vt)), identity);
    expect(f.values[0]).toBeGreaterThanOrEqual(f.values[1]!);
  });
  it("publishes only input arrows before feedback", () => {
    const m = {
      kind: "projection" as const,
      v: [4, 2] as [number, number],
      direction: [1, 1] as [number, number],
    };
    expect(linearAlgebraArrows(m).map((a) => a.result)).toEqual([false, false]);
    expect(linearAlgebraArrows(m, true).at(-1)?.vector).toEqual([3, 3]);
  });
});

describe("least-squares fitting", () => {
  it("fits noisy constants and leaves a residual perpendicular to the columns", () => {
    const m = { kind: "least_squares" as const, matrix: [[1], [1], [1]], rhs: [2, 4, 9] };
    expect(linearAlgebraResult(m).value).toEqual([5]);
    const fitted = linearApply(m.matrix, linearAlgebraResult(m).value as number[]),
      residual = m.rhs.map((n, i) => n - fitted[i]!);
    expect(linearDot(residual, [1, 1, 1])).toBeCloseTo(0, 10);
  });
  it("distinguishes nonunique fitting coefficients from an inconsistent exact system", () => {
    expect(
      linearAlgebraResult({
        kind: "least_squares",
        matrix: [
          [1, 2],
          [2, 4],
        ],
        rhs: [3, 7],
      }).detail,
    ).toMatch(/nonunique/);
  });
});
