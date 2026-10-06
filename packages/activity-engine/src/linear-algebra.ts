import type { LinearAlgebraModel } from "@discere/contracts";
export type LinearMatrix = number[][];
export type LinearPoint = [number, number];
export function linearNumber(n: number): string {
  return Number(n.toFixed(6)).toString();
}
export const linearVectorLabel = (v: number[]) => "(" + v.map(linearNumber).join(", ") + ")";
export const linearMatrixLabel = (m: LinearMatrix) =>
  "[" + m.map(linearVectorLabel).join("; ") + "]";
export function linearDot(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) throw Error("Vector dimensions must match.");
  return a.reduce((sum, v, i) => sum + v * b[i]!, 0);
}
export function linearTranspose(m: LinearMatrix): LinearMatrix {
  return m[0]!.map((_, col) => m.map((row) => row[col]!));
}
export function linearMatrixProduct(a: LinearMatrix, b: LinearMatrix): LinearMatrix {
  if (a[0]!.length !== b.length) throw Error("Matrix dimensions must match.");
  return a.map((row) => linearTranspose(b).map((col) => linearDot(row, col)));
}
export function linearApply(a: LinearMatrix, v: number[]): number[] {
  return a.map((row) => linearDot(row, v));
}
export function linearDeterminant(a: LinearMatrix): number {
  if (a.some((row) => row.length !== a.length) || a.length > 3 || !a.length)
    throw Error("Use a square matrix of size one to three.");
  if (a.length === 1) return a[0]![0]!;
  if (a.length === 2) return a[0]![0]! * a[1]![1]! - a[0]![1]! * a[1]![0]!;
  return a[0]!.reduce(
    (sum, v, col) =>
      sum +
      (col % 2 ? -1 : 1) *
        v *
        linearDeterminant(a.slice(1).map((row) => row.filter((_, c) => c !== col))),
    0,
  );
}
export interface LinearRowStep {
  label: string;
  matrix: LinearMatrix;
}
/** Pivoted row reduction. Tolerance is numerical, not a formal exact-arithmetic proof. */
export function linearRowReduction(
  input: LinearMatrix,
  coefficientColumns = input[0]!.length,
): { matrix: LinearMatrix; pivots: number[]; steps: LinearRowStep[] } {
  const m = input.map((row) => [...row]),
    steps: LinearRowStep[] = [{ label: "Given rows", matrix: m.map((row) => [...row]) }],
    pivots: number[] = [];
  const epsilon =
    1e-12 * Math.max(...m.flatMap((r) => r.slice(0, coefficientColumns)).map(Math.abs));
  const capture = (label: string) => steps.push({ label, matrix: m.map((row) => [...row]) });
  let row = 0;
  for (let col = 0; col < coefficientColumns && row < m.length; col++) {
    let best = row;
    for (let r = row + 1; r < m.length; r++)
      if (Math.abs(m[r]![col]!) > Math.abs(m[best]![col]!)) best = r;
    if (Math.abs(m[best]![col]!) <= epsilon) {
      for (let r = row; r < m.length; r++) m[r]![col] = 0;
      continue;
    }
    if (best !== row) {
      [m[row], m[best]] = [m[best]!, m[row]!];
      capture("Swap rows " + (row + 1) + " and " + (best + 1));
    }
    const pivot = m[row]![col]!;
    if (pivot !== 1) {
      m[row] = m[row]!.map((v) => v / pivot);
      m[row]![col] = 1;
      capture("Divide row " + (row + 1) + " by " + linearNumber(pivot));
    }
    for (let r = 0; r < m.length; r++)
      if (r !== row && m[r]![col] !== 0) {
        const factor = m[r]![col]!;
        m[r] = m[r]!.map((v, c) => v - factor * m[row]![c]!);
        m[r]![col] = 0;
        capture("Row " + (r + 1) + " minus " + linearNumber(factor) + " times row " + (row + 1));
      }
    pivots.push(col);
    row++;
  }
  return { matrix: m, pivots, steps };
}
export function linearInverse(a: LinearMatrix): LinearMatrix | null {
  if (a.length !== a[0]!.length) throw Error("An inverse requires a square matrix.");
  const augmented = a.map((row, i) => [...row, ...row.map((_, j) => (i === j ? 1 : 0))]);
  const reduced = linearRowReduction(augmented, a.length);
  return reduced.pivots.length === a.length
    ? reduced.matrix.map((row) => row.slice(a.length))
    : null;
}
export function linearProjection(v: number[], direction: number[]): number[] {
  const denominator = linearDot(direction, direction);
  if (denominator === 0) throw Error("A projection needs a nonzero direction.");
  const coefficient = linearDot(v, direction) / denominator;
  return direction.map((n) => n * coefficient);
}
export function linearSingularValues(a: LinearMatrix): number[] {
  const at = linearTranspose(a),
    gram = a.length === 2 ? linearMatrixProduct(a, at) : linearMatrixProduct(at, a);
  if (gram.length !== 2) throw Error("This singular-value model needs two rows or two columns.");
  const p = gram[0]![0]!,
    q = gram[0]![1]!,
    r = gram[1]![1]!,
    gap = Math.hypot(p - r, 2 * q);
  const largest = Math.max(0, (p + r + gap) / 2);
  // Cauchy–Binet: the product of the two singular values is the norm of all 2x2 minors.
  // This avoids subtracting nearly equal Gram products for a small singular value.
  const rows = a.length === 2 ? a : at,
    minors: number[] = [];
  for (let i = 0; i < rows[0]!.length; i++)
    for (let j = i + 1; j < rows[0]!.length; j++)
      minors.push(rows[0]![i]! * rows[1]![j]! - rows[0]![j]! * rows[1]![i]!);
  const first = Math.sqrt(largest),
    second = first > 0 ? Math.hypot(...minors) / first : 0;
  return [first, second];
}
/** Full orthogonal factors for the two-dimensional visual, including rank-deficient maps. */
export function linearSvd2(a: LinearMatrix): {
  u: LinearMatrix;
  s: LinearMatrix;
  vt: LinearMatrix;
  values: number[];
} {
  if (a.length !== 2 || a[0]!.length !== 2)
    throw Error("Use a 2x2 matrix for this factor drawing.");
  const gram = linearMatrixProduct(linearTranspose(a), a),
    values = linearSingularValues(a);
  const p = gram[0]![0]!,
    q = gram[0]![1]!,
    r = gram[1]![1]!,
    lambda = values[0]! ** 2;
  const candidates: LinearPoint[] = [
    [q, lambda - p],
    [lambda - r, q],
  ];
  let v1: LinearPoint =
    q !== 0
      ? candidates.reduce((best, v) => (Math.hypot(...v) > Math.hypot(...best) ? v : best))
      : p >= r
        ? [1, 0]
        : [0, 1];
  const length = Math.hypot(...v1);
  v1 = v1.map((n) => n / length) as LinearPoint;
  const v2: LinearPoint = [-v1[1], v1[0]];
  const first = linearApply(a, v1),
    firstLength = Math.hypot(...first);
  const u1: LinearPoint =
    firstLength > 0 ? (first.map((n) => n / firstLength) as LinearPoint) : [1, 0];
  const orientation = linearDeterminant(a) < 0 ? -1 : 1;
  const u2: LinearPoint = [-orientation * u1[1], orientation * u1[0]];
  return {
    u: linearTranspose([u1, u2]),
    s: [
      [values[0]!, 0],
      [0, values[1]!],
    ],
    vt: [v1, v2],
    values,
  };
}
/** Small full-column-rank teaching systems; rank-deficient coefficients are nonunique. */
export function linearLeastSquares(a: LinearMatrix, b: number[]): number[] | null {
  const at = linearTranspose(a),
    normal = linearMatrixProduct(at, a),
    inverse = linearInverse(normal);
  return inverse ? linearApply(inverse, linearApply(at, b)) : null;
}
export interface LinearResult {
  label: string;
  value: number | number[] | LinearMatrix | null;
  detail: string;
}
export function linearAlgebraResult(m: LinearAlgebraModel): LinearResult {
  switch (m.kind) {
    case "vector_sum":
      return {
        label: "u + v",
        value: m.u.map((n, i) => n + m.v[i]!),
        detail: "Add matching coordinates.",
      };
    case "scaled_vector":
      return {
        label: "Scaled vector",
        value: m.v.map((n) => n * m.scale),
        detail: "Multiply every coordinate by the scalar.",
      };
    case "dot_product":
      return {
        label: "u dot v",
        value: linearDot(m.u, m.v),
        detail: "Multiply matching coordinates, then add.",
      };
    case "vector_length":
      return {
        label: "Length",
        value: Math.hypot(...m.v),
        detail: "Take the square root of the sum of squared coordinates.",
      };
    case "projection":
      return {
        label: "Projection",
        value: linearProjection(m.v, m.direction),
        detail: "The residual is perpendicular to the projection direction.",
      };
    case "matrix":
      switch (m.operation) {
        case "transpose":
          return {
            label: "Transpose",
            value: linearTranspose(m.matrix),
            detail: "Swap the row and column positions.",
          };
        case "multiply":
          return {
            label: "A B",
            value: linearMatrixProduct(m.matrix, m.second!),
            detail: "Each entry is a row-column dot product; B acts first.",
          };
        case "apply":
          return {
            label: "A v",
            value: linearApply(m.matrix, m.vector!),
            detail: "The input coordinates weight the columns of A.",
          };
        case "inverse":
          return {
            label: "Inverse",
            value: linearInverse(m.matrix),
            detail: "A square singular matrix has no inverse.",
          };
        case "determinant":
          return {
            label: "Determinant",
            value: linearDeterminant(m.matrix),
            detail: "Absolute value scales area or volume; the sign records orientation.",
          };
      }
      break;
    case "system": {
      const augmented = m.matrix.map((row, i) => [...row, m.rhs[i]!]),
        reduced = linearRowReduction(augmented, m.matrix[0]!.length);
      const inconsistent = linearRowReduction(augmented).pivots.length > reduced.pivots.length;
      const unique = !inconsistent && reduced.pivots.length === m.matrix[0]!.length;
      const solution = Array.from({ length: m.matrix[0]!.length }, () => 0);
      if (unique)
        reduced.pivots.forEach((col, row) => {
          solution[col] = reduced.matrix[row]!.at(-1)!;
        });
      return {
        label: "Solution",
        value: unique ? solution : null,
        detail: inconsistent
          ? "No solution: an equation reduces to zero equals a nonzero value."
          : unique
            ? "One value for every variable."
            : "Infinitely many solutions: a free variable remains.",
      };
    }
    case "least_squares": {
      const coefficients = linearLeastSquares(m.matrix, m.rhs);
      return {
        label: "Fitting coefficients",
        value: coefficients,
        detail: coefficients
          ? "The fitted output minimises squared residual length; the residual is perpendicular to every column of A."
          : "These rank-deficient columns give nonunique fitting coefficients.",
      };
    }
    case "span": {
      const rank = linearRowReduction(linearTranspose(m.vectors)).pivots.length;
      return {
        label: "Span dimension",
        value: rank,
        detail:
          rank === 2
            ? "The vectors span the plane."
            : rank === 1
              ? "The vectors span one line through the origin."
              : "Only the zero vector is spanned.",
      };
    }
    case "eigen": {
      const result = linearApply(m.matrix, m.vector),
        index = m.vector.findIndex((n) => n !== 0),
        lambda = result[index]! / m.vector[index]!;
      const eigen = result.every((n, i) => Math.abs(n - lambda * m.vector[i]!) < 1e-9);
      return {
        label: "Eigenvalue for this candidate",
        value: eigen ? lambda : null,
        detail: eigen
          ? "The nonzero candidate keeps its line; A v = lambda v."
          : "The candidate is not an eigenvector: its output is not a scalar multiple.",
      };
    }
    case "svd":
      return {
        label: "Singular values",
        value: linearSingularValues(m.matrix),
        detail:
          "Nonnegative stretch factors. U and V are orthogonal; Sigma has the same rectangular shape as A.",
      };
  }
  throw Error("Unknown linear algebra operation.");
}
export function linearAlgebraGivens(m: LinearAlgebraModel): string {
  switch (m.kind) {
    case "vector_sum":
    case "dot_product":
      return "u = " + linearVectorLabel(m.u) + "; v = " + linearVectorLabel(m.v);
    case "scaled_vector":
      return "v = " + linearVectorLabel(m.v) + "; scalar = " + linearNumber(m.scale);
    case "vector_length":
      return "v = " + linearVectorLabel(m.v);
    case "projection":
      return "v = " + linearVectorLabel(m.v) + "; direction = " + linearVectorLabel(m.direction);
    case "matrix":
      return (
        "A = " +
        linearMatrixLabel(m.matrix) +
        (m.second ? "; B = " + linearMatrixLabel(m.second) : "") +
        (m.vector ? "; v = " + linearVectorLabel(m.vector) : "")
      );
    case "system":
    case "least_squares":
      return "A = " + linearMatrixLabel(m.matrix) + "; b = " + linearVectorLabel(m.rhs);
    case "span":
      return "Vectors: " + m.vectors.map(linearVectorLabel).join("; ");
    case "eigen":
      return (
        "A = " + linearMatrixLabel(m.matrix) + "; candidate v = " + linearVectorLabel(m.vector)
      );
    case "svd":
      return "A = " + linearMatrixLabel(m.matrix);
  }
}
export interface LinearArrow {
  label: string;
  vector: LinearPoint;
  result: boolean;
}
export function linearAlgebraArrows(m: LinearAlgebraModel, showResults = false): LinearArrow[] {
  const given = (label: string, vector: LinearPoint): LinearArrow => ({
    label,
    vector,
    result: false,
  });
  const output = (label: string, vector: number[]): LinearArrow => ({
    label,
    vector: vector as LinearPoint,
    result: true,
  });
  switch (m.kind) {
    case "vector_sum":
      return [
        given("u", m.u),
        given("v", m.v),
        ...(showResults
          ? [
              output(
                "u + v",
                m.u.map((n, i) => n + m.v[i]!),
              ),
            ]
          : []),
      ];
    case "dot_product":
      return [given("u", m.u), given("v", m.v)];
    case "scaled_vector":
      return [
        given("v", m.v),
        ...(showResults
          ? [
              output(
                "scaled",
                m.v.map((n) => n * m.scale),
              ),
            ]
          : []),
      ];
    case "vector_length":
      return [given("v", m.v)];
    case "projection":
      return [
        given("v", m.v),
        given("direction", m.direction),
        ...(showResults ? [output("projection", linearProjection(m.v, m.direction))] : []),
      ];
    case "span":
      return m.vectors.map((v, i) => given("v" + (i + 1), v));
    case "eigen":
      return [
        given("v", m.vector),
        ...(showResults ? [output("A v", linearApply(m.matrix, m.vector))] : []),
      ];
    case "matrix":
      return m.operation === "apply" && m.vector?.length === 2 && m.matrix.length === 2
        ? [
            given("v", m.vector as LinearPoint),
            ...(showResults ? [output("A v", linearApply(m.matrix, m.vector))] : []),
          ]
        : [];
    default:
      return [];
  }
}
