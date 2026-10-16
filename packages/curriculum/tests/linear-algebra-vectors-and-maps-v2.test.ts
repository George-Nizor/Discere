import { readFileSync } from "node:fs";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Linear algebra, vectors and maps: every numeric key of the v2 rewrite, recomputed here from the
 * arithmetic each item describes rather than read back from the authority it checks.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL(
      "../../../content/linear-algebra-vectors-and-maps/.authoring/candidate.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as CourseBundle;
const find = (id: string): Question => bundle.questions.find((q) => q.id === id)!;
const key = (id: string): number => {
  const authority = find(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const dot = (u: number[], v: number[]) => u.reduce((s, x, i) => s + x * v[i]!, 0);
const len = (v: number[]) => Math.sqrt(dot(v, v));
const apply = (m: number[][], v: number[]) => m.map((row) => dot(row, v));
const mul = (a: number[][], b: number[][]) =>
  a.map((row) => b[0]!.map((_, j) => dot(row, b.map((r) => r[j]!))));
const det2 = (m: number[][]) => m[0]![0]! * m[1]![1]! - m[0]![1]! * m[1]![0]!;
const proj = (v: number[], d: number[]) => d.map((x) => (dot(v, d) / dot(d, d)) * x);
const sub = (u: number[], v: number[]) => u.map((x, i) => x - v[i]!);
const unit = (v: number[]) => v.map((x) => x / len(v));
const inv2 = (m: number[][]) => {
  const d = det2(m);
  return [
    [m[1]![1]! / d, -m[0]![1]! / d],
    [-m[1]![0]! / d, m[0]![0]! / d],
  ];
};
const choiceIds = (id: string): string[] => {
  const q = find(id);
  const a = q.answerAuthority;
  if (a.kind !== "text") throw new Error("not a choice");
  return q.choices!.filter((c) => a.acceptedIdeas.includes(c.label)).map((c) => c.id);
};
const choiceLabel = (id: string) => {
  const q = find(id);
  return q.choices!.find((c) => c.id === choiceIds(id)[0])!.label;
};
const k = (lesson: string, n: number) => `lin-${lesson}-${n}`;
const eq = (id: string, expected: number) => expect(key(id)).toBeCloseTo(expected, 9);

describe("linear algebra v2: numeric keys follow from the arithmetic", () => {
  it("lessons 1 to 4: vectors, sums, dot products, unit vectors", () => {
    const L1 = "read-vector-coordinates";
    eq(k(L1, 7), 4 - 1);
    eq(k(L1, 3), len([0, 0]));
    eq(k(L1, 1), [3, -2][0]!);
    eq(k(L1, 4), [0, 1][1]!);
    eq(k(L1, 5), [-5, 3][0]!);
    eq(k(L1, 6), [6, -4][1]!);
    eq(k(L1, 10), [9, 4][0]!);
    const L2 = "add-and-scale-vectors";
    eq(k(L2, 7), 1 + 3);
    eq(k(L2, 1), 2 + -1);
    eq(k(L2, 2), 3 * -1);
    eq(k(L2, 3), -2 * 2);
    eq(k(L2, 4), 2 + -2);
    eq(k(L2, 5), 2 * 1 + 3);
    eq(k(L2, 6), 4 - 1);
    eq(k(L2, 10), 3 * -1 + 4);
    const L3 = "dot-products-and-length";
    eq(k(L3, 7), len([9, 12]));
    eq(k(L3, 2), len([3, 4]));
    eq(k(L3, 1), dot([2, 1], [3, -2]));
    eq(k(L3, 3), dot([1, -2], [1, -2]));
    eq(k(L3, 4), len([-6, 8]));
    eq(k(L3, 5), dot([1, -3], [2, 4]));
    eq(k(L3, 6), len([5, 12]));
    eq(k(L3, 10), dot([-2, 5], [3, 4]));
    expect(len([-7, 24])).toBe(25);
    const L4 = "orthogonal-and-unit-vectors";
    eq(k(L4, 7), 1 / len([6, 8]));
    eq(k(L4, 1), dot([1, 2], [-2, 1]));
    eq(k(L4, 2), unit([3, 4])[0]!);
    eq(k(L4, 6), unit([0, -7])[1]!);
    eq(k(L4, 5), dot([2, -1], [1, 2]));
    eq(k(L4, 10), unit([8, -6])[0]!);
    expect(dot([1, 1], [1, -1])).toBe(0);
    expect(choiceLabel(k(L4, 8))).toBe("(1, 1) and (1, −1)");
    expect(dot([1, 2], [2, 3])).not.toBe(0);
    expect(dot([3, 1], [1, 3])).not.toBe(0);
    // (2, 0) and (0, 3) are orthogonal, with lengths 2 and 3.
    expect(dot([2, 0], [0, 3])).toBe(0);
    expect(len([2, 0])).not.toBe(1);
    expect(choiceLabel(k(L4, 3))).toBe("Orthogonal, but not orthonormal");
    expect(len([0, 0])).toBe(0);
    expect(choiceLabel(k(L4, 4))).toBe("No");
  });

  it("lessons 5 to 8: matrices, maps, products, inverses", () => {
    const A = [[1, 4, -2], [3, 0, 5]];
    const L5 = "matrix-shape-and-transpose";
    eq(k(L5, 7), 7);
    eq(k(L5, 2), A[0]!.length);
    eq(k(L5, 3), A[1]![2]!);
    eq(k(L5, 4), A.length);
    eq(k(L5, 1), A.length);
    eq(k(L5, 5), [[2, -1], [7, 3], [4, 0]][0]![1]!);
    eq(k(L5, 6), 3);
    eq(k(L5, 10), [[5, 8], [6, 9], [7, 4]][2]![1]!);
    expect(choiceLabel(k(L5, 8))).toBe(`${2} × ${3}`);
    const L6 = "linear-transformations";
    eq(k(L6, 7), 2 * 3 + 1);
    eq(k(L6, 1), apply([[2, 1], [0, 1]], [1, 2])[0]!);
    eq(k(L6, 2), apply([[1, -2], [3, 1]], [1, 0])[1]!);
    eq(k(L6, 5), apply([[1, 2], [-1, 3]], [2, 1])[0]!);
    eq(k(L6, 6), apply([[3, 0], [0, -2]], [-1, 4])[1]!);
    eq(k(L6, 10), 3 * 2 + 2 * 1);
    // S(0) = (1, 0) is not zero, so the shift is not linear.
    expect(choiceLabel(k(L6, 4))).toBe("No");
    expect(choiceLabel(k(L6, 3))).toBe("T(u) + T(v)");
    expect(choiceLabel(k(L6, 8))).toBe("3T(v)");
    const L7 = "compose-matrix-maps";
    const A7 = [[1, 2], [0, 1]], B7 = [[2, 0], [0, 3]];
    eq(k(L7, 7), (5 + 3) * 2 - (5 * 2 + 3));
    eq(k(L7, 1), mul(A7, B7)[0]![1]!);
    eq(k(L7, 2), mul(B7, A7)[0]![1]!);
    eq(k(L7, 5), mul([[2, 1], [1, 0]], [[1, 3], [2, 4]])[1]![0]!);
    eq(k(L7, 10), mul([[1, 0], [2, 1]], [[3, 1], [0, 2]])[1]![1]!);
    // Worked example: A B v and B A v for v = (1, 1).
    expect(apply(A7, apply(B7, [1, 1]))).toEqual([8, 3]);
    expect(apply(B7, apply(A7, [1, 1]))).toEqual([6, 3]);
    expect(choiceLabel(k(L7, 3))).toBe("2 × 2");
    expect(choiceLabel(k(L7, 4))).toBe("B");
    const L8 = "identity-and-inverses";
    eq(k(L8, 7), (17 - 3) / 2);
    eq(k(L8, 1), inv2([[1, 0], [0, 1]])[0]![0]!);
    eq(k(L8, 2), inv2([[2, 1], [1, 1]])[1]![1]!);
    eq(k(L8, 5), inv2([[1, 2], [0, 1]])[0]![1]!);
    eq(k(L8, 6), inv2([[3, 0], [0, -2]])[1]![1]!);
    eq(k(L8, 10), inv2([[2, 3], [1, 2]])[0]![1]!);
    eq(k(L8, 4), (() => { const A4 = [[1, 1], [0, 2]]; const v = apply(inv2(A4), [1, -2]); return v[0]!; })());
    expect(det2([[1, 2], [2, 4]])).toBe(0);
    expect(choiceLabel(k(L8, 3))).toBe("No");
    expect(det2([[3, 1], [5, 2]])).toBe(1);
    expect(inv2([[3, 1], [5, 2]])).toEqual([[2, -1], [-5, 3]]);
  });

  it("lessons 9 to 12: systems, solutions, spans, bases", () => {
    // Solve 2x2 systems by Cramer's rule as an independent check of the row-reduction answers.
    const solve = (m: number[][], b: number[]) => {
      const d = det2(m);
      return [det2([[b[0]!, m[0]![1]!], [b[1]!, m[1]![1]!]]) / d, det2([[m[0]![0]!, b[0]!], [m[1]![0]!, b[1]!]]) / d];
    };
    const L9 = "solve-by-row-reduction";
    eq(k(L9, 7), 7 - 5);
    eq(k(L9, 1), solve([[1, 1], [2, -1]], [5, 1])[0]!);
    eq(k(L9, 2), 1 - 2 * 5);
    eq(k(L9, 3), -9 / -3);
    eq(k(L9, 4), 6 - 4);
    eq(k(L9, 5), 5 - (4 - 1));
    eq(k(L9, 6), solve([[2, 1], [1, -1]], [8, 1])[1]!);
    eq(k(L9, 10), solve([[1, 1], [3, -1]], [9, 7])[1]!);
    expect(solve([[1, 2], [3, 5]], [7, 18])).toEqual([1, 3]);
    const L10 = "one-none-or-many-solutions";
    eq(k(L10, 7), 0);
    eq(k(L10, 8), 0);
    expect(2 * 4).not.toBe(9); // doubling x + y = 4 contradicts 2x + 2y = 9
    eq(k(L10, 4), 3 - 2);
    eq(k(L10, 6), 3 - 1);
    eq(k(L10, 10), 5 - 2);
    expect(det2([[1, 1], [2, 2]])).toBe(0);
    expect(2 * 3 === 7).toBe(false); // x + y = 3 with 2x + 2y = 7: no solution
    expect(2 * 3 === 6).toBe(true); // x + y = 3 with 2x + 2y = 6: consistent
    expect(choiceLabel(k(L10, 1))).toBe("One solution");
    expect(choiceLabel(k(L10, 2))).toBe("No solution");
    expect(choiceLabel(k(L10, 3))).toBe("Infinitely many solutions");
    expect(choiceLabel(k(L10, 5))).toBe("Yes");
    const L11 = "spans-and-subspaces";
    const rank2 = (u: number[], v: number[]) => (det2([u, v]) === 0 ? 1 : 2);
    eq(k(L11, 7), 3 * 2);
    eq(k(L11, 8), 1);
    eq(k(L11, 1), rank2([1, 2], [2, 4]));
    eq(k(L11, 2), rank2([1, 0], [1, 1]));
    eq(k(L11, 5), rank2([2, 1], [-4, -2]));
    eq(k(L11, 11), rank2([1, 2], [3, 1]));
    eq(k(L11, 6), 5 - 3);
    eq(k(L11, 10), 9 - 4);
    expect(choiceLabel(k(L11, 3))).toBe("Yes");
    // y = 2x + 1 misses the origin: 0 ≠ 2 × 0 + 1.
    expect(0 === 2 * 0 + 1).toBe(false);
    expect(choiceLabel(k(L11, 4))).toBe("No");
    const L12 = "basis-and-dimension";
    eq(k(L12, 7), 1);
    eq(k(L12, 8), 3);
    eq(k(L12, 1), 2);
    // (4, 2) = c1 (1, 1) + c2 (1, -1): add and subtract the equations.
    eq(k(L12, 3), (4 + 2) / 2);
    expect((4 - 2) / 2).toBe(1);
    // (7, 3) = c1 (1, 1) + c2 (2, 0): c1 = 3, then 3 + 2 c2 = 7.
    eq(k(L12, 6), (7 - 3) / 2);
    eq(k(L12, 5), rank2([2, 1], [1, 2]));
    eq(k(L12, 10), (8 - 2) / 2);
    expect(rank2([1, 0], [0, 0])).toBe(1);
    expect(choiceLabel(k(L12, 2))).toBe("No");
    expect(choiceLabel(k(L12, 4))).toBe("No");
  });

  it("lessons 13 to 16: rank, determinants, projection, least squares", () => {
    const L13 = "rank-and-null-space";
    const pivots = (m: number[][]) => {
      // Rank by counting nonzero rows after elimination (small integer matrices).
      const a = m.map((r) => [...r]);
      let rank = 0;
      for (let c = 0; c < a[0]!.length && rank < a.length; c++) {
        const p = a.findIndex((r, i) => i >= rank && Math.abs(r[c]!) > 1e-9);
        if (p < 0) continue;
        [a[rank], a[p]] = [a[p]!, a[rank]!];
        for (let i = rank + 1; i < a.length; i++) {
          const f = a[i]![c]! / a[rank]![c]!;
          a[i] = a[i]!.map((x, j) => x - f * a[rank]![j]!);
        }
        rank++;
      }
      return rank;
    };
    const A13 = [[1, 2, 0], [0, 0, 1]];
    eq(k(L13, 7), -5);
    eq(k(L13, 8), 5 - 2);
    eq(k(L13, 3), apply(A13, [-2, 1, 0])[0]!);
    eq(k(L13, 1), pivots(A13));
    eq(k(L13, 2), 3 - pivots(A13));
    eq(k(L13, 5), pivots([[1, 0, 0], [0, 2, 0], [0, 0, 3]]));
    eq(k(L13, 6), 3 - pivots([[1, 2, 3], [2, 4, 6]]));
    eq(k(L13, 10), pivots([[1, 2], [2, 4], [3, 6]]));
    expect(5 + -5).toBe(0);
    expect(4 - pivots([[1, 3, 0, 2], [0, 0, 1, 4]])).toBe(2);
    expect(choiceLabel(k(L13, 4))).toBe("Columns 1 and 3");
    const L14 = "determinants-and-volume";
    eq(k(L14, 7), 5 * 2);
    eq(k(L14, 8), det2([[5, 2], [1, 3]]));
    eq(k(L14, 5), Math.abs(det2([[-2, 0], [0, 3]])));
    eq(k(L14, 1), det2([[2, 1], [1, 3]]));
    eq(k(L14, 2), det2([[1, 3], [2, 1]]));
    eq(k(L14, 4), 2 * 3 * 4);
    eq(k(L14, 3), det2([[1, 2], [2, 4]]));
    eq(k(L14, 6), det2(mul([[2, 0], [0, 3]], [[1, 1], [0, 2]])));
    eq(k(L14, 10), Math.abs(det2([[1, -3], [2, 2]])));
    expect(det2([[1, 5], [2, 3]])).toBe(-7);
    const L15 = "project-onto-a-direction";
    eq(k(L15, 7), 6);
    eq(k(L15, 8), dot([6, 2], [1, 1]) / dot([1, 1], [1, 1]));
    eq(k(L15, 2), proj([3, 4], [2, 0])[0]!);
    eq(k(L15, 1), proj([4, 2], [1, 1])[0]!);
    eq(k(L15, 6), proj([-2, 4], [1, 1])[0]!);
    eq(k(L15, 3), sub([4, 2], [3, 3])[1]!);
    eq(k(L15, 4), proj([2, -2], [1, 1])[0]!);
    eq(k(L15, 5), proj([2, 5], [0, 1])[1]!);
    eq(k(L15, 10), proj([7, 1], [1, -1])[0]!);
    expect(sub([5, 1], proj([5, 1], [1, 1]))).toEqual([2, -2]);
    expect(dot(sub([5, 1], proj([5, 1], [1, 1])), [1, 1])).toBe(0);
    const L16 = "fit-with-least-squares";
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const sq = (xs: number[], c: number) => xs.reduce((s, x) => s + (x - c) ** 2, 0);
    const slope = (ys: number[]) => {
      // Normal equations for y = c + s x at x = 0..n-1.
      const n = ys.length;
      const xs = ys.map((_, i) => i);
      const sx = xs.reduce((s, x) => s + x, 0);
      const sxx = xs.reduce((s, x) => s + x * x, 0);
      const sy = ys.reduce((s, y) => s + y, 0);
      const sxy = xs.reduce((s, x, i) => s + x * ys[i]!, 0);
      return (n * sxy - sx * sy) / (n * sxx - sx * sx);
    };
    eq(k(L16, 7), mean([6, 7, 11]));
    eq(k(L16, 8), mean([1, 2, 6]));
    eq(k(L16, 1), mean([2, 4, 9]));
    eq(k(L16, 4), sq([2, 4, 9], 5));
    eq(k(L16, 2), [2, 4, 9].reduce((s, x) => s + (x - 5), 0));
    eq(k(L16, 6), slope([2, 5, 8]));
    eq(k(L16, 3), slope([1, 2, 2]));
    eq(k(L16, 5), mean([1, 5, 9]));
    eq(k(L16, 10), slope([4, 3, 0]));
    expect(sq([2, 3, 10], mean([2, 3, 10]))).toBe(38);
    // Shortcut quoted in the transfer lead: (last y − first y) ÷ 2 for x = 0, 1, 2.
    for (const ys of [[2, 5, 8], [1, 2, 2], [4, 3, 0]]) expect(slope(ys)).toBeCloseTo((ys[2]! - ys[0]!) / 2, 9);
  });

  it("lessons 17 to 20: Gram–Schmidt, eigenvectors, diagonalisation, SVD", () => {
    const L17 = "build-an-orthonormal-basis";
    eq(k(L17, 7), 7);
    eq(k(L17, 8), sub([2, 3], proj([2, 3], [1, 0]))[1]!);
    eq(k(L17, 5), sub([3, 1], proj([3, 1], [1, 0]))[1]!);
    eq(k(L17, 2), unit([1, 1])[0]!);
    eq(k(L17, 6), unit([-3, 4])[1]!);
    eq(k(L17, 1), sub([1, 0], proj([1, 0], [1, 1]))[1]!);
    eq(k(L17, 3), dot([1, 1], [1, -1]));
    eq(k(L17, 10), sub([2, 4], proj([2, 4], [1, 1]))[0]!);
    // The worked round: (3, 4) and (1, 0).
    const e1 = unit([3, 4]);
    const r = sub([1, 0], proj([1, 0], e1));
    expect(len(r)).toBeCloseTo(0.8, 9);
    expect(unit(r)[0]).toBeCloseTo(0.8, 9);
    expect(unit(r)[1]).toBeCloseTo(-0.6, 9);
    expect(sub([2, 2], proj([2, 2], [1, 1]))).toEqual([0, 0]);
    expect(choiceLabel(k(L17, 4))).toBe("No");
    const L18 = "eigenvectors-and-eigenvalues";
    const lam = (m: number[][], v: number[]) => {
      const out = apply(m, v);
      const i = v.findIndex((x) => x !== 0);
      const l = out[i]! / v[i]!;
      expect(out.map((x, j) => x - l * v[j]!).every((d) => Math.abs(d) < 1e-9)).toBe(true);
      return l;
    };
    const S = [[2, 1], [1, 2]];
    eq(k(L18, 7), lam([[4, 0], [0, 4]], [1, 2]) === 4 ? 4 : NaN);
    eq(k(L18, 8), 6 * 1);
    eq(k(L18, 1), lam(S, [1, 1]));
    eq(k(L18, 2), lam(S, [1, -1]));
    eq(k(L18, 3), lam([[-2, 0], [0, 3]], [1, 0]));
    eq(k(L18, 5), lam([[4, 0], [0, 2]], [0, 1]));
    eq(k(L18, 10), lam([[1, 2], [2, 1]], [1, -1]));
    expect(lam([[4, 1], [2, 3]], [1, 1])).toBe(5);
    expect(apply([[1, 2], [2, 1]], [1, -1])).toEqual([-1, 1]);
    // (1, 0) is not an eigenvector of S: S(1, 0) = (2, 1).
    expect(apply(S, [1, 0])).toEqual([2, 1]);
    expect(det2([apply(S, [1, 0]), [1, 0]])).not.toBe(0);
    expect(choiceLabel(k(L18, 4))).toBe("No");
    expect(choiceLabel(k(L18, 6))).toBe("Yes, with eigenvalue 0");
    const L19 = "diagonalise-a-map";
    // Hook: 3 (1, 1) + (1, -1) = (4, 2).
    eq(k(L19, 7), 3 * 1 + 1);
    eq(k(L19, 8), 7);
    eq(k(L19, 1), lam(S, [1, 1]));
    eq(k(L19, 2), lam(S, [1, 1]) ** 2);
    eq(k(L19, 5), lam([[2, 0], [0, -1]], [1, 0]) ** 3);
    eq(k(L19, 4), lam(S, [1, -1]));
    eq(k(L19, 10), lam([[3, 0], [0, -2]], [0, 1]) ** 4);
    expect(lam([[4, 1], [2, 3]], [1, 1]) ** 2).toBe(25);
    expect(choiceLabel(k(L19, 3))).toBe("No");
    expect(choiceLabel(k(L19, 6))).toBe("Its columns must form a basis");
    // A is P D P⁻¹ for P = [(1, 1), (1, -1)] columns and D = diag(3, 1).
    const P = [[1, 1], [1, -1]];
    const D = [[3, 0], [0, 1]];
    const back = mul(mul(P, D), inv2(P));
    S.forEach((row, i) => row.forEach((x, j) => expect(back[i]![j]).toBeCloseTo(x, 9)));
    const L20 = "singular-value-decomposition";
    // Singular values of a matrix with perpendicular columns are the column lengths; in general
    // they are the square roots of the eigenvalues of Aᵀ A.
    const singular = (m: number[][]) => {
      const cols = m[0]!.length;
      const g = Array.from({ length: cols }, (_, i) =>
        Array.from({ length: cols }, (_, j) => dot(m.map((r) => r[i]!), m.map((r) => r[j]!))),
      );
      const tr = g.reduce((s, row, i) => s + row[i]!, 0);
      const det = cols === 2 ? det2(g) : NaN;
      if (cols === 2) {
        const disc = Math.sqrt(tr * tr - 4 * det);
        return [Math.sqrt((tr + disc) / 2), Math.sqrt(Math.max(0, (tr - disc) / 2))];
      }
      // 3 columns, rank <= 2: the nonzero eigenvalues of Aᵀ A are those of A Aᵀ (2 × 2).
      const aat = m.map((r) => m.map((s) => dot(r, s)));
      const t2 = aat[0]![0]! + aat[1]![1]!;
      const d2 = det2(aat);
      const disc = Math.sqrt(t2 * t2 - 4 * d2);
      return [Math.sqrt((t2 + disc) / 2), Math.sqrt(Math.max(0, (t2 - disc) / 2))];
    };
    eq(k(L20, 7), 4);
    eq(k(L20, 8), singular([[-7, 0], [0, 2]])[0]!);
    eq(k(L20, 1), singular([[3, 0], [0, -2]])[0]!);
    eq(k(L20, 3), singular([[1, 2], [2, 4]])[1]!);
    eq(k(L20, 6), singular([[1, 0, 0], [0, 2, 0]])[1]!);
    eq(k(L20, 5), singular([[0, 5], [2, 0], [0, 0]])[0]!);
    eq(k(L20, 10), singular([[-3, 0], [0, -8]])[1]!);
    expect(singular([[-6, 0], [0, 3]]).map((x) => Math.round(x))).toEqual([6, 3]);
    expect(singular([[1, 2], [2, 4]])[0]).toBeCloseTo(5, 9);
    expect(choiceLabel(k(L20, 2))).toBe("2 × 3");
    expect(choiceLabel(k(L20, 4))).toBe("Σ");
  });

  it("gives every numeric misconception a value that is not the key", () => {
    for (const q of bundle.questions.filter((item) => item.id.startsWith("lin-"))) {
      if (q.answerAuthority.kind !== "numeric") continue;
      for (const m of q.misconceptions ?? [])
        expect(m.match.numeric ?? []).not.toContain(q.answerAuthority.value);
    }
  });
});

/**
 * The story rewrite of lessons 1 to 5. The worked numbers each teaching screen quotes are
 * recomputed here, and the shape the brief asks for is checked on the candidate itself.
 */
describe("linear algebra story lessons 1 to 5", () => {
  const ids = [
    "read-vector-coordinates",
    "add-and-scale-vectors",
    "dot-products-and-length",
    "orthogonal-and-unit-vectors",
    "matrix-shape-and-transpose",
  ];
  const lessons = ids.map((id) => bundle.lessons.find((l) => l.id === id)!);
  type Block = { kind: string; text?: string };
  const words = (blocks: Block[] | undefined) =>
    (blocks ?? []).reduce((n, b) => n + (b.text ?? "").split(/\s+/).filter(Boolean).length, 0);

  it("has the opener, steps, skill check and close the brief describes", () => {
    for (const l of lessons) {
      expect(l.intro?.hook.questionId, l.id).toBeUndefined();
      const hookWords = words(l.intro!.hook.blocks as Block[]);
      expect(hookWords, l.id).toBeGreaterThanOrEqual(120);
      expect(hookWords, l.id).toBeLessThanOrEqual(200);
      expect(l.intro!.promise.split(/\s+/).length, l.id).toBeLessThanOrEqual(25);
      expect(l.questionIds, l.id).toHaveLength(3);
      expect(l.steps.length, l.id).toBeGreaterThanOrEqual(8);
      expect(l.steps.length, l.id).toBeLessThanOrEqual(14);
      const teaching = l.steps.filter((s) => s.kind === "explain");
      expect(teaching.length / l.steps.length, l.id).toBeGreaterThanOrEqual(0.4);
      for (const s of teaching) {
        expect(s.checkQuestionId, `${l.id}/${s.id}`).toBe("");
        const n = words(s.lead as Block[]) + words(s.afterFigure as Block[]);
        expect(n, `${l.id}/${s.id}`).toBeGreaterThanOrEqual(80);
        expect(n, `${l.id}/${s.id}`).toBeLessThanOrEqual(280);
      }
      expect(l.steps.some((s) => s.diagram), l.id).toBe(true);
      expect(l.steps.some((s) => s.kind === "transfer"), l.id).toBe(true);
      expect((l.recap?.nextHook ?? "").endsWith("?"), l.id).toBe(false);
    }
  });

  it("cites every step it contains and no question it no longer asks", () => {
    for (const l of lessons) {
      const citations = (bundle.authoringMetadata ?? []).find((m) => m.lessonId === l.id)!.citations;
      const asked = new Set<string>(l.questionIds);
      for (const s of l.steps) {
        if (s.checkQuestionId) asked.add(s.checkQuestionId);
        for (const w of s.workedSteps ?? []) {
          if (w.selfExplain) asked.add(w.selfExplain.questionId);
          if (w.blank) asked.add(w.blank.questionId);
        }
        expect(
          citations.some((c) => c.targetKind === "step" && c.targetId === s.id),
          `${l.id}/${s.id}`,
        ).toBe(true);
      }
      const own = bundle.questions.filter((q) => q.conceptIds.includes(l.conceptIds[0]!));
      for (const q of own.filter((x) => !asked.has(x.id)))
        expect(
          citations.some((c) => c.targetKind === "question" && c.targetId === q.id),
          q.id,
        ).toBe(false);
    }
  });

  it("recomputes the numbers the new teaching screens quote", () => {
    // Lesson 2: the joined walks, subtraction, repetition, flipping and a mixed expression.
    expect([3 + 2, 1 + 2]).toEqual([5, 3]);
    expect(sub([7, 5], [2, 1])).toEqual([5, 4]);
    expect([4 + -4, 1 + -1]).toEqual([0, 0]);
    expect([1, 2].map((x) => 3 * x)).toEqual([3, 6]);
    expect([1, 2].map((x) => -1 * x)).toEqual([-1, -2]);
    expect([1, 2].map((x) => -3 * x)).toEqual([-3, -6]);
    expect(-2 * -3).toBe(6);
    expect([1, 3].map((x, i) => 2 * x + [4, -2][i]!)).toEqual([6, 4]);
    // Lesson 3: the 8 by 15 field, the first dot product, the minus-sign example and the hiker.
    expect(8 ** 2 + 15 ** 2).toBe(289);
    expect(len([8, 15])).toBe(17);
    expect(len([15, 8])).toBe(17);
    expect(len([-8, 15])).toBe(17);
    expect(dot([2, 5], [1, 3])).toBe(17);
    expect(dot([8, 15], [8, 15])).toBe(289);
    expect(dot([3, 1], [-2, 5])).toBe(-1);
    expect(len([-8, -15])).toBe(17);
    expect(dot([1, 2], [3, 4])).toBe(11);
    // Lesson 4: shrinking by the length, signs kept, and the right-angle examples.
    expect((8 / 17) ** 2 + (15 / 17) ** 2).toBeCloseTo(1, 12);
    expect(unit([-3, 4])[0]!).toBeCloseTo(-0.6, 12);
    expect(unit([-3, 4])[1]!).toBeCloseTo(0.8, 12);
    expect(dot([1, 0], [0, 1])).toBe(0);
    expect(dot([2, 0], [3, 0])).toBe(6);
    expect(dot([2, 0], [-3, 0])).toBe(-6);
    expect(dot([1, 0], [0, 5])).toBe(0);
    expect(dot([4, 1], [-1, 4])).toBe(0);
    expect(dot([6, 0], [0, 4])).toBe(0);
    expect([len([6, 0]), len([0, 4])]).toEqual([6, 4]);
    expect(dot([1, 1], [1, -1])).toBe(0);
    expect([dot([1, 2], [2, 3]), dot([3, 1], [1, 3])]).toEqual([8, 6]);
    // Lesson 5: entries of the price matrix and the matrix applied to (1, 0).
    const prices = [[3, 8], [5, 1], [9, 4]];
    expect([prices[2]![0], prices[0]![1], prices[1]![0]]).toEqual([9, 8, 5]);
    expect(apply(prices, [1, 0])).toEqual([3, 5, 9]);
  });
});

/**
 * The story rewrite of lessons 6 to 10. Every number a teaching screen quotes is recomputed from
 * the arithmetic, and the shape the brief asks for is checked on the candidate itself.
 */
describe("linear algebra story lessons 6 to 10", () => {
  const ids = [
    "linear-transformations",
    "compose-matrix-maps",
    "identity-and-inverses",
    "solve-by-row-reduction",
    "one-none-or-many-solutions",
  ];
  const lessons = ids.map((id) => bundle.lessons.find((l) => l.id === id)!);
  type Block = { kind: string; text?: string };
  const words = (blocks: Block[] | undefined) =>
    (blocks ?? []).reduce((n, b) => n + (b.text ?? "").split(/\s+/).filter(Boolean).length, 0);

  it("has the opener, steps, skill check and close the brief describes", () => {
    for (const l of lessons) {
      expect(l.intro?.hook.questionId, l.id).toBeUndefined();
      const hookWords = words(l.intro!.hook.blocks as Block[]);
      expect(hookWords, l.id).toBeGreaterThanOrEqual(120);
      expect(hookWords, l.id).toBeLessThanOrEqual(200);
      expect(l.intro!.promise.split(/\s+/).length, l.id).toBeLessThanOrEqual(25);
      expect(l.questionIds, l.id).toHaveLength(3);
      expect(l.steps.length, l.id).toBeGreaterThanOrEqual(8);
      expect(l.steps.length, l.id).toBeLessThanOrEqual(14);
      const teaching = l.steps.filter((s) => s.kind === "explain");
      expect(teaching.length / l.steps.length, l.id).toBeGreaterThanOrEqual(0.4);
      let run = 0;
      for (const s of l.steps) {
        run = s.kind === "explain" ? run + 1 : 0;
        expect(run, `${l.id}/${s.id}`).toBeLessThanOrEqual(3);
      }
      for (const s of teaching) {
        expect(s.checkQuestionId, `${l.id}/${s.id}`).toBe("");
        const n = words(s.lead as Block[]) + words(s.afterFigure as Block[]);
        expect(n, `${l.id}/${s.id}`).toBeGreaterThanOrEqual(80);
        expect(n, `${l.id}/${s.id}`).toBeLessThanOrEqual(280);
      }
      for (const s of l.steps.filter((x) => x.kind !== "explain" && x.kind !== "worked_example" && x.kind !== "faded_example"))
        expect(words(s.lead as Block[]), `${l.id}/${s.id}`).toBeLessThanOrEqual(60);
      expect(l.steps.some((s) => s.diagram), l.id).toBe(true);
      expect(l.steps.some((s) => s.kind === "transfer"), l.id).toBe(true);
      expect((l.recap?.nextHook ?? "").endsWith("?"), l.id).toBe(false);
    }
  });

  it("asks every question the lesson owns and cites every step", () => {
    for (const l of lessons) {
      const citations = (bundle.authoringMetadata ?? []).find((m) => m.lessonId === l.id)!.citations;
      const asked = new Set<string>(l.questionIds);
      for (const s of l.steps) {
        if (s.checkQuestionId) asked.add(s.checkQuestionId);
        for (const w of s.workedSteps ?? []) {
          if (w.selfExplain) asked.add(w.selfExplain.questionId);
          if (w.blank) asked.add(w.blank.questionId);
        }
        expect(
          citations.some((c) => c.targetKind === "step" && c.targetId === s.id),
          `${l.id}/${s.id}`,
        ).toBe(true);
      }
      const own = bundle.questions.filter((q) => q.conceptIds.includes(l.conceptIds[0]!));
      expect(own.length, l.id).toBe(10);
      for (const q of own) expect(asked.has(q.id), q.id).toBe(true);
      // Between 3 and 7 steps carry a question.
      const questioned = l.steps.filter(
        (s) => s.checkQuestionId || (s.workedSteps ?? []).some((w) => w.selfExplain || w.blank),
      );
      expect(questioned.length, l.id).toBeGreaterThanOrEqual(3);
      expect(questioned.length, l.id).toBeLessThanOrEqual(7);
    }
  });

  it("lesson 6: recomputes the numbers the teaching screens quote", () => {
    const A = [[2, 1], [0, 1]];
    expect(apply(A, [2, 2])).toEqual([6, 2]);
    expect(apply(A, [1, 0])).toEqual([2, 0]);
    expect(apply(A, [0, 1])).toEqual([1, 1]);
    expect(apply(A, [1, 1])).toEqual([3, 1]);
    // T(u + v) = T(u) + T(v) for u = (1, 0), v = (0, 1); T(3 u) = 3 T(u).
    expect(apply(A, [1, 0]).map((x, i) => x + apply(A, [0, 1])[i]!)).toEqual(apply(A, [1, 1]));
    expect(apply(A, [3, 0])).toEqual(apply(A, [1, 0]).map((x) => 3 * x));
    // The lift (x, y) -> (x, y + 2) sends zero to (0, 2).
    expect([0, 0 + 2]).toEqual([0, 2]);
    // A linear map sending (1, 0) to (4, 1) and (0, 1) to (2, 3) sends (3, 2) to (16, 9).
    expect(apply([[4, 2], [1, 3]], [3, 2])).toEqual([16, 9]);
    expect([4, 1].map((x, i) => 3 * x + 2 * [2, 3][i]!)).toEqual([16, 9]);
    // The columns of A are its outputs for the axis points.
    expect(A.map((row) => row[0])).toEqual(apply(A, [1, 0]));
    expect(A.map((row) => row[1])).toEqual(apply(A, [0, 1]));
    // Skill check: T(3, 2) = 3 (2, 5) + 2 (1, -1).
    eq(k("linear-transformations", 10), apply([[2, 1], [5, -1]], [3, 2])[0]!);
    eq(k("linear-transformations", 7), apply([[2, 1], [0, 1]], [3, 1])[0]!);
    eq(k("linear-transformations", 6), apply([[3, 0], [0, -2]], [-1, 4])[1]!);
  });

  it("lesson 7: recomputes the numbers the teaching screens quote", () => {
    // R triples, S subtracts 2, from 4.
    expect([4 * 3 - 2, (4 - 2) * 3]).toEqual([10, 6]);
    // P doubles, Q adds 3, from 5.
    expect([5 * 2 + 3, (5 + 3) * 2]).toEqual([13, 16]);
    eq(k("compose-matrix-maps", 7), (5 + 3) * 2 - (5 * 2 + 3));
    const A = [[1, 1], [0, 1]], B = [[2, 0], [0, 1]];
    expect(mul(A, B)).toEqual([[2, 1], [0, 1]]);
    expect(mul(B, A)).toEqual([[2, 2], [0, 1]]);
    // Columns of A B are A applied to the columns of B.
    expect(apply(A, [2, 0])).toEqual([2, 0]);
    expect(apply(A, [0, 1])).toEqual([1, 1]);
    expect(dot([1, 1], [0, 1])).toBe(mul(A, B)[0]![1]);
    // A (B v) equals (A B) v.
    expect(apply(A, apply(B, [1, 2]))).toEqual(apply(mul(A, B), [1, 2]));
    // Shapes: 2 x 3 times 3 x 2 is 2 x 2, and the reverse is 3 x 3.
    const A23 = [[1, 2, 3], [4, 5, 6]], B32 = [[1, 0], [2, 1], [0, 3]];
    const shape = (m: number[][]) => [m.length, m[0]!.length];
    const tr = (m: number[][]) => m[0]!.map((_, j) => m.map((r) => r[j]!));
    expect(shape(mul(A23, B32))).toEqual([2, 2]);
    expect(shape(mul(B32, A23))).toEqual([3, 3]);
    expect(shape(tr(mul(A23, B32)))).toEqual([2, 2]);
    expect(shape(mul(tr(A23), tr(B32)))).toEqual([3, 3]);
    expect(tr(mul(A23, B32))).toEqual(mul(tr(B32), tr(A23)));
    // Skill check items.
    eq(k("compose-matrix-maps", 2), mul([[2, 0], [0, 3]], [[1, 2], [0, 1]])[0]![1]!);
    eq(k("compose-matrix-maps", 10), mul([[1, 0], [2, 1]], [[3, 1], [0, 2]])[1]![1]!);
  });

  it("lesson 8: recomputes the numbers the teaching screens quote", () => {
    // Triple then subtract 4 gave 11: 11 + 4 = 15, 15 / 3 = 5, and forwards again.
    expect([(11 + 4) / 3, 5 * 3 - 4]).toEqual([5, 11]);
    eq(k("identity-and-inverses", 7), (17 - 3) / 2);
    // Diagonal inverses are reciprocals, including a negative entry.
    expect([inv2([[2, 0], [0, 5]])[0]![0], inv2([[2, 0], [0, 5]])[1]![1]]).toEqual([0.5, 0.2]);
    expect(1 / -4).toBe(-0.25);
    // The slide with rows (1, 3), (0, 1) is undone by rows (1, -3), (0, 1).
    expect(mul([[1, 3], [0, 1]], [[1, -3], [0, 1]])).toEqual([[1, 0], [0, 1]]);
    expect(mul([[1, 1], [0, 1]], [[1, -1], [0, 1]])).toEqual([[1, 0], [0, 1]]);
    expect(mul([[1, -1], [0, 1]], [[1, 1], [0, 1]])).toEqual([[1, 0], [0, 1]]);
    // Worked recipe on rows (4, 1), (7, 2).
    expect(det2([[4, 1], [7, 2]])).toBe(1);
    expect(inv2([[4, 1], [7, 2]])).toEqual([[2, -1], [-7, 4]]);
    expect(mul([[4, 1], [7, 2]], [[2, -1], [-7, 4]])).toEqual([[1, 0], [0, 1]]);
    expect(dot([4, 1], [2, -7])).toBe(1);
    // No inverse: rows (1, 3), (2, 6).
    expect(det2([[1, 3], [2, 6]])).toBe(0);
    expect(apply([[1, 3], [2, 6]], [3, 0])).toEqual([3, 6]);
    expect(apply([[1, 3], [2, 6]], [0, 1])).toEqual([3, 6]);
    // Recovering an input: A = rows (3, 1), (5, 2), output (5, 9).
    const Ainv = inv2([[3, 1], [5, 2]]);
    expect(Ainv).toEqual([[2, -1], [-5, 3]]);
    expect(apply(Ainv, [5, 9])).toEqual([1, 2]);
    expect(apply([[3, 1], [5, 2]], [1, 2])).toEqual([5, 9]);
    // Skill check items.
    eq(k("identity-and-inverses", 10), inv2([[2, 3], [1, 2]])[0]![1]!);
    eq(k("identity-and-inverses", 6), inv2([[3, 0], [0, -2]])[1]![1]!);
    expect(det2([[1, 2], [2, 4]])).toBe(0);
  });

  it("lesson 9: recomputes the numbers the teaching screens quote", () => {
    // Ticket and snack: t + s = 7, t + 3 s = 13.
    expect([(13 - 7) / 2, 7 - (13 - 7) / 2]).toEqual([3, 4]);
    eq(k("solve-by-row-reduction", 7), 7 - 5);
    // x1 + x2 = 7 and x1 - x2 = 1 by adding.
    expect([(7 + 1) / 2, 7 - (7 + 1) / 2]).toEqual([4, 3]);
    // Rows (2, 1, 5), (1, 1, 3): R1 <- R1 - R2 gives (1, 0, 2); then x2 = 1.
    expect([2 - 1, 1 - 1, 5 - 3]).toEqual([1, 0, 2]);
    expect(3 - 2).toBe(1);
    expect([2 * 2 + 1, 2 + 1]).toEqual([5, 3]);
    // Rows (1, 1, 4), (2, 3, 11): R2 <- R2 - 2 R1 gives (0, 1, 3); x2 = 3, x1 = 1.
    expect([2 - 2 * 1, 3 - 2 * 1, 11 - 2 * 4]).toEqual([0, 1, 3]);
    expect([4 - 3, 1 + 3, 2 * 1 + 3 * 3]).toEqual([1, 4, 11]);
    // Staircase: x3 = 2, x2 = 5 - 2, x1 = 9 - 3 - 2.
    expect([2, 5 - 2, 9 - 3 - 2]).toEqual([2, 3, 4]);
    // Worked example: rows (1, 2, 7), (3, 5, 18) gives (0, -1, -3).
    expect([3 - 3 * 1, 5 - 3 * 2, 18 - 3 * 7]).toEqual([0, -1, -3]);
    // Skill check items by Cramer's rule are already covered above; the staircase item by hand.
    eq(k("solve-by-row-reduction", 5), 5 - (4 - 1));
  });

  it("lesson 10: recomputes the numbers the teaching screens quote", () => {
    // The lines: x + y = 3 holds at the three points quoted, and x - y = 1 crosses it at (2, 1).
    for (const [x = 0, y = 0] of [[3, 0], [2, 1], [0, 3]]) expect(x + y).toBe(3);
    expect([2 + 1, 2 - 1]).toEqual([3, 1]);
    // x + y = 2 and 3x + 3y = 6 are the same line.
    expect(6 / 3).toBe(2);
    // Opening pair: halving 2x + 2y = 9 gives x + y = 4.5, not 4.
    expect(9 / 2).not.toBe(4);
    eq(k("one-none-or-many-solutions", 7), 0);
    // Rows (1, 3, 2), (2, 6, 7): R2 <- R2 - 2 R1 gives (0, 0, 3).
    expect([2 - 2 * 1, 6 - 2 * 3, 7 - 2 * 2]).toEqual([0, 0, 3]);
    // Rows for x1 + 2 x2 = 4 and 2 x1 + 4 x2 = 8 reduce to a zero row; (4, 0) and (2, 1) solve both.
    expect([2 - 2 * 1, 4 - 2 * 2, 8 - 2 * 4]).toEqual([0, 0, 0]);
    for (const [x1 = 0, x2 = 0] of [[4, 0], [2, 1]]) {
      expect(x1 + 2 * x2).toBe(4);
      expect(2 * x1 + 4 * x2).toBe(8);
    }
    // Four unknowns, two pivots: x1 = 6 - s - t and x3 = 2 - t satisfy both equations.
    for (const [s = 0, t = 0] of [[0, 0], [1, 2], [-3, 5]]) {
      expect(6 - s - t + s + t).toBe(6);
      expect(2 - t + t).toBe(2);
    }
    expect(4 - 2).toBe(2);
    // x1 = x2 = x3 = t solves x1 - x2 = 0 and x2 - x3 = 0, and 3 unknowns less 2 pivots is 1.
    for (const t of [0, 1, 2]) expect([t - t, t - t]).toEqual([0, 0]);
    expect(3 - 2).toBe(1);
    // Skill check items.
    eq(k("one-none-or-many-solutions", 10), 5 - 2);
    eq(k("one-none-or-many-solutions", 6), 3 - 1);
    expect(choiceLabel(k("one-none-or-many-solutions", 5))).toBe("Yes");
  });
});

/**
 * The story rewrite of lessons 11 to 15. Every number a teaching screen quotes is recomputed from
 * the arithmetic, and the shape the brief asks for is checked on the candidate itself.
 */
describe("linear algebra story lessons 11 to 15", () => {
  const ids = [
    "spans-and-subspaces",
    "basis-and-dimension",
    "rank-and-null-space",
    "determinants-and-volume",
    "project-onto-a-direction",
  ];
  const lessons = ids.map((id) => bundle.lessons.find((l) => l.id === id)!);
  type Block = { kind: string; text?: string };
  const words = (blocks: Block[] | undefined) =>
    (blocks ?? []).reduce((n, b) => n + (b.text ?? "").split(/\s+/).filter(Boolean).length, 0);
  const asked = (l: (typeof lessons)[number]) => {
    const set = new Set<string>(l.questionIds);
    for (const s of l.steps) {
      if (s.checkQuestionId) set.add(s.checkQuestionId);
      for (const w of s.workedSteps ?? []) {
        if (w.selfExplain) set.add(w.selfExplain.questionId);
        if (w.blank) set.add(w.blank.questionId);
      }
    }
    return set;
  };

  it("has the opener, steps, skill check and close the brief describes", () => {
    for (const l of lessons) {
      expect(l.intro?.hook.questionId, l.id).toBeUndefined();
      const hookWords = words(l.intro!.hook.blocks as Block[]);
      expect(hookWords, l.id).toBeGreaterThanOrEqual(120);
      expect(hookWords, l.id).toBeLessThanOrEqual(200);
      expect(l.intro!.promise.split(/\s+/).length, l.id).toBeLessThanOrEqual(25);
      expect(l.questionIds, l.id).toHaveLength(3);
      expect(l.steps.length, l.id).toBeGreaterThanOrEqual(8);
      expect(l.steps.length, l.id).toBeLessThanOrEqual(14);
      const teaching = l.steps.filter((s) => s.kind === "explain");
      expect(teaching.length / l.steps.length, l.id).toBeGreaterThanOrEqual(0.4);
      let run = 0;
      for (const s of l.steps) {
        run = s.kind === "explain" ? run + 1 : 0;
        expect(run, `${l.id}/${s.id}`).toBeLessThanOrEqual(3);
      }
      for (const s of teaching) {
        expect(s.checkQuestionId, `${l.id}/${s.id}`).toBe("");
        const n = words(s.lead as Block[]) + words(s.afterFigure as Block[]);
        expect(n, `${l.id}/${s.id}`).toBeGreaterThanOrEqual(80);
        expect(n, `${l.id}/${s.id}`).toBeLessThanOrEqual(280);
      }
      for (const s of l.steps.filter(
        (x) => x.kind !== "explain" && x.kind !== "worked_example" && x.kind !== "faded_example",
      ))
        expect(words(s.lead as Block[]), `${l.id}/${s.id}`).toBeLessThanOrEqual(60);
      expect(l.steps.some((s) => s.diagram), l.id).toBe(true);
      expect(l.steps.some((s) => s.kind === "transfer"), l.id).toBe(true);
      expect((l.recap?.nextHook ?? "").endsWith("?"), l.id).toBe(false);
    }
  });

  it("cites every step and asks 3 to 7 questions without citing the ones it dropped", () => {
    for (const l of lessons) {
      const citations = (bundle.authoringMetadata ?? []).find((m) => m.lessonId === l.id)!.citations;
      for (const s of l.steps)
        expect(
          citations.some((c) => c.targetKind === "step" && c.targetId === s.id),
          `${l.id}/${s.id}`,
        ).toBe(true);
      const set = asked(l);
      const own = bundle.questions.filter((q) => q.conceptIds.includes(l.conceptIds[0]!));
      for (const q of own)
        expect(
          citations.some((c) => c.targetKind === "question" && c.targetId === q.id),
          q.id,
        ).toBe(set.has(q.id));
      const questioned = l.steps.filter(
        (s) => s.checkQuestionId || (s.workedSteps ?? []).some((w) => w.selfExplain || w.blank),
      );
      expect(questioned.length, l.id).toBeGreaterThanOrEqual(3);
      expect(questioned.length, l.id).toBeLessThanOrEqual(7);
    }
    const dropped = (id: string) =>
      bundle.questions
        .filter((q) => q.conceptIds.includes(`lin-${id}`))
        .map((q) => q.id)
        .filter((q) => !asked(bundle.lessons.find((l) => l.id === id)!).has(q))
        .sort();
    expect(dropped("spans-and-subspaces")).toEqual([k("spans-and-subspaces", 5), k("spans-and-subspaces", 8)]);
    expect(dropped("basis-and-dimension")).toEqual([k("basis-and-dimension", 8)]);
    expect(dropped("rank-and-null-space")).toEqual([k("rank-and-null-space", 8)]);
    expect(dropped("determinants-and-volume")).toEqual([k("determinants-and-volume", 8)]);
    expect(dropped("project-onto-a-direction")).toEqual([k("project-onto-a-direction", 2)]);
  });

  it("lesson 11: recomputes the numbers the teaching screens and items quote", () => {
    const L = "spans-and-subspaces";
    const scale = (c: number, v: number[]) => v.map((x) => c * x);
    const add = (u: number[], v: number[]) => u.map((x, i) => x + v[i]!);
    // One button: presses of (1, 2), the sum of two reachable places and a scaled one.
    expect([2, 3, -1].map((c) => scale(c, [1, 2]))).toEqual([[2, 4], [3, 6], [-1, -2]]);
    expect(add([2, 4], [-1, -2])).toEqual([1, 2]);
    expect(scale(5, [2, 4])).toEqual([10, 20]);
    // (1, 3) is off the line: its y is not double its x.
    expect(3).not.toBe(2 * 1);
    eq(k(L, 7), 3 * 2);
    // Two buttons: 2(1, 2) + 3(1, 0), and every tile is reachable with c1 = y / 2, c2 = x - y / 2.
    expect(add(scale(2, [1, 2]), scale(3, [1, 0]))).toEqual([5, 4]);
    for (const [x = 0, y = 0] of [[5, 4], [-3, 7], [0, 1]])
      expect(add(scale(y / 2, [1, 2]), scale(x - y / 2, [1, 0]))).toEqual([x, y]);
    expect(det2([[1, 2], [1, 0]])).not.toBe(0);
    expect(det2([[1, 2], [2, 4]])).toBe(0);
    // Coefficients: (4, 1) = 3(1, 0) + 1(1, 1), (7, 4) = 3(1, 0) + 4(1, 1), (5, 3) = 2(1, 0) + 3(1, 1).
    expect(add(scale(3, [1, 0]), scale(1, [1, 1]))).toEqual([4, 1]);
    expect(add(scale(3, [1, 0]), scale(4, [1, 1]))).toEqual([7, 4]);
    eq(k(L, 6), 5 - 3);
    eq(k(L, 10), 9 - 4);
    // Subspace: the line y = x + 3 misses zero and is not closed under addition.
    expect(0).not.toBe(0 + 3);
    expect([3 === 0 + 3, 4 === 1 + 3]).toEqual([true, true]);
    expect(add([0, 3], [1, 4])).toEqual([1, 7]);
    expect(7).not.toBe(1 + 3);
    // Items: y = 2x holds at zero, y = 2x + 1 does not, and the skill check dimensions.
    expect(0).toBe(2 * 0);
    expect(0).not.toBe(2 * 0 + 1);
    eq(k(L, 1), det2([[1, 2], [2, 4]]) === 0 ? 1 : 2);
    eq(k(L, 2), det2([[1, 0], [1, 1]]) === 0 ? 1 : 2);
    eq(k(L, 11), det2([[1, 2], [3, 1]]) === 0 ? 1 : 2);
    expect(choiceLabel(k(L, 3))).toBe("Yes");
    expect(choiceLabel(k(L, 4))).toBe("No");
  });

  it("lesson 12: recomputes the numbers the teaching screens and items quote", () => {
    const L = "basis-and-dimension";
    const comb = (c: number[], vs: number[][]) =>
      vs[0]!.map((_, i) => c.reduce((s, ci, j) => s + ci * vs[j]![i]!, 0));
    // Diagonal is right plus up, and right is diagonal minus up.
    expect(comb([1, 1], [[1, 0], [0, 1]])).toEqual([1, 1]);
    expect(comb([1, -1], [[1, 1], [0, 1]])).toEqual([1, 0]);
    eq(k(L, 7), 3 - 2);
    // (2, 0) in the basis (1, 1), (1, -1) and the two recipes for (3, 2).
    expect(comb([1, 1], [[1, 1], [1, -1]])).toEqual([2, 0]);
    expect(comb([3, 2], [[1, 0], [0, 1]])).toEqual([3, 2]);
    expect(comb([1, 2], [[1, 0], [1, 1]])).toEqual([3, 2]);
    // (5, 1) = 3(1, 1) + 2(1, -1): adding the equations gives 2 c1 = 6.
    expect((5 + 1) / 2).toBe(3);
    expect(5 - 3).toBe(2);
    expect(comb([3, 2], [[1, 1], [1, -1]])).toEqual([5, 1]);
    // Worked example (6, 2): c1 = 4, c2 = 2, and the faded one (4, 2): c1 = 3.
    expect([(6 + 2) / 2, (6 - 2) / 2]).toEqual([4, 2]);
    eq(k(L, 3), (4 + 2) / 2);
    // Items: (7, 3) = c1(1, 1) + c2(2, 0) and (8, 2) = c1(1, 1) + c2(1, -1).
    eq(k(L, 6), (7 - 3) / 2);
    expect(comb([3, 2], [[1, 1], [2, 0]])).toEqual([7, 3]);
    eq(k(L, 10), (8 - 2) / 2);
    // Independence by determinant: (4, 1), (1, 3) and (2, 1), (1, 2) are bases, (1, 2), (2, 4) is not.
    expect(det2([[4, 1], [1, 3]])).toBe(11);
    eq(k(L, 5), det2([[2, 1], [1, 2]]) === 0 ? 1 : 2);
    expect(det2([[1, 2], [2, 4]])).toBe(0);
    // The zero vector is spare: (3, 1) and (0, 0) span a line.
    expect(det2([[3, 1], [0, 0]])).toBe(0);
    expect(det2([[1, 0], [0, 0]])).toBe(0);
    eq(k(L, 1), 2);
    expect(choiceLabel(k(L, 4))).toBe("No");
    expect(choiceLabel(k(L, 2))).toBe("No");
  });

  it("lesson 13: recomputes the numbers the teaching screens and items quote", () => {
    const L = "rank-and-null-space";
    // Rank by elimination on a small matrix.
    const rank = (m: number[][]): number => {
      const a = m.map((r) => [...r]);
      let r = 0;
      for (let c = 0; c < a[0]!.length && r < a.length; c++) {
        const p = a.findIndex((row, i) => i >= r && Math.abs(row[c]!) > 1e-12);
        if (p < 0) continue;
        [a[r], a[p]] = [a[p]!, a[r]!];
        for (let i = r + 1; i < a.length; i++) {
          const f = a[i]![c]! / a[r]![c]!;
          a[i] = a[i]!.map((x, j) => x - f * a[r]![j]!);
        }
        r++;
      }
      return r;
    };
    // The sum machine.
    expect(apply([[1, 1]], [3, 1])).toEqual([4]);
    expect(apply([[1, 1]], [2, -2])).toEqual([0]);
    for (const t of [0, 2, 5]) expect(apply([[1, 1]], [t, -t])).toEqual([0]);
    eq(k(L, 7), -5);
    expect(5 + -5).toBe(0);
    // B: output is x(1, 0) + y(0, 1) + z(2, 3), rank 2, and (-2, -3, 1) is in the null space.
    const B = [[1, 0, 2], [0, 1, 3]];
    expect(apply(B, [3, 1, 2])).toEqual([7, 7]);
    expect(apply(B, [0, 0, 4])).toEqual([8, 12]);
    expect(apply(B, [-2, -3, 1])).toEqual([0, 0]);
    expect(rank(B)).toBe(2);
    expect(rank(B) + (3 - rank(B))).toBe(3);
    // A: rank 2, nullity 1, and (-2, 1, 0) is sent to zero.
    const A = [[1, 2, 0], [0, 0, 1]];
    expect(apply(A, [-2, 1, 0])).toEqual([0, 0]);
    eq(k(L, 3), apply(A, [-2, 1, 0])[0]!);
    eq(k(L, 1), rank(A));
    eq(k(L, 2), 3 - rank(A));
    // The worked example: rank 2 and nullity 4 - 2.
    expect(rank([[1, 3, 0, 2], [0, 0, 1, 4]])).toBe(2);
    // E: rows become (0, 1, 2) and (0, 0, 1), and its columns 2 and 3 are independent.
    const E = [[0, 1, 2], [0, 2, 5]];
    expect([E[1]![0]! - 2 * E[0]![0]!, E[1]![1]! - 2 * E[0]![1]!, E[1]![2]! - 2 * E[0]![2]!]).toEqual([0, 0, 1]);
    expect(det2([[1, 2], [2, 5]])).toBe(1);
    expect(rank(E)).toBe(2);
    expect(choiceLabel(k(L, 4))).toBe("Columns 1 and 3");
    expect(det2([[1, 0], [0, 1]])).not.toBe(0);
    // Skill check: a diagonal matrix, a repeated row and a repeated column.
    eq(k(L, 5), rank([[1, 0, 0], [0, 2, 0], [0, 0, 3]]));
    eq(k(L, 6), 3 - rank([[1, 2, 3], [2, 4, 6]]));
    eq(k(L, 10), rank([[1, 2], [2, 4], [3, 6]]));
  });

  it("lesson 14: recomputes the numbers the teaching screens and items quote", () => {
    const L = "determinants-and-volume";
    // Diagonal maps multiply area by a × d.
    expect(det2([[3, 0], [0, 4]])).toBe(12);
    expect(det2([[2, 0], [0, 2]])).toBe(4);
    expect(3 * 5).toBe(15);
    eq(k(L, 7), 5 * 2);
    // The parallelogram with columns (3, 2) and (1, 2): the box, the pieces and the difference.
    const box = (3 + 1) * (2 + 2);
    const pieces = 2 * ((3 * 2) / 2) + 2 * ((1 * 2) / 2) + 2 * (1 * 2);
    expect([box, pieces, box - pieces]).toEqual([16, 12, 4]);
    expect(det2([[3, 1], [2, 2]])).toBe(box - pieces);
    // Swapping rows flips the sign, and a dependent pair of rows gives zero.
    expect(det2([[2, 2], [3, 1]])).toBe(-4);
    expect(det2([[1, 3], [2, 6]])).toBe(0);
    // Items on signs: A = diag(-2, 3), the worked example, the faded example and the swap.
    eq(k(L, 5), Math.abs(det2([[-2, 0], [0, 3]])));
    expect(det2([[1, 5], [2, 3]])).toBe(-7);
    eq(k(L, 1), det2([[2, 1], [1, 3]]));
    eq(k(L, 2), det2([[1, 3], [2, 1]]));
    // Products: det(A B) = det A × det B for the screen's pair and the skill check's pair.
    const A = [[3, 0], [0, 2]];
    const Bm = [[1, 2], [0, 3]];
    expect(mul(A, Bm)).toEqual([[3, 6], [0, 6]]);
    expect(det2(mul(A, Bm))).toBe(det2(A) * det2(Bm));
    expect([det2(A), det2(Bm), det2(mul(A, Bm))]).toEqual([6, 3, 18]);
    eq(k(L, 6), det2(mul([[2, 0], [0, 3]], [[1, 1], [0, 2]])));
    expect(det2([[1, 0], [0, 1]])).toBe(1);
    // Volume: 2 × 5 × 3 on the screen and 2 × 3 × 4 in the item.
    expect(2 * 5 * 3).toBe(30);
    eq(k(L, 4), 2 * 3 * 4);
    // Skill check: a collapse and a negative entry.
    eq(k(L, 3), det2([[1, 2], [2, 4]]));
    eq(k(L, 10), Math.abs(det2([[1, -3], [2, 2]])));
  });

  it("lesson 15: recomputes the numbers the teaching screens and items quote", () => {
    const L = "project-onto-a-direction";
    const coefficient = (v: number[], d: number[]) => dot(v, d) / dot(d, d);
    // Dropping (8, 3) onto the ground keeps 8, and (2, 0) is the same line as (1, 0).
    expect(proj([8, 3], [1, 0])).toEqual([8, 0]);
    expect(proj([8, 3], [2, 0])).toEqual([8, 0]);
    eq(k(L, 7), 6);
    // The ramp d = (1, 2) and v = (0, 5): v · d = 10, d · d = 5, c = 2, residual (-2, 1).
    expect([dot([0, 5], [1, 2]), dot([1, 2], [1, 2])]).toEqual([10, 5]);
    expect(coefficient([0, 5], [1, 2])).toBe(2);
    expect(proj([0, 5], [1, 2])).toEqual([2, 4]);
    expect(sub([0, 5], proj([0, 5], [1, 2]))).toEqual([-2, 1]);
    expect(dot(sub([0, 5], proj([0, 5], [1, 2])), [1, 2])).toBe(0);
    expect(proj([0, 5], [2, 4])).toEqual([2, 4]);
    eq(k(L, 8), coefficient([6, 2], [1, 1]));
    // The worked and faded examples and the practice item.
    expect(coefficient([5, 1], [1, 1])).toBe(3);
    expect(sub([5, 1], proj([5, 1], [1, 1]))).toEqual([2, -2]);
    expect(dot([2, -2], [1, 1])).toBe(0);
    eq(k(L, 1), proj([4, 2], [1, 1])[0]!);
    eq(k(L, 6), proj([-2, 4], [1, 1])[0]!);
    // Perpendicular and parallel cases.
    expect(coefficient([2, -2], [1, 1])).toBe(0);
    expect(proj([3, 4], [3, 4])).toEqual([3, 4]);
    // Along and across: (3, 3) + (2, -2) = (5, 1), then the boat and the kite.
    expect([3 + 2, 3 - 2]).toEqual([5, 1]);
    expect(coefficient([7, 1], [1, 1])).toBe(4);
    expect(proj([7, 1], [1, 1])).toEqual([4, 4]);
    expect(sub([7, 1], [4, 4])).toEqual([3, -3]);
    expect(dot([3, -3], [1, 1])).toBe(0);
    eq(k(L, 3), sub([4, 2], [3, 3])[1]!);
    // Skill check items.
    eq(k(L, 4), proj([2, -2], [1, 1])[0]!);
    eq(k(L, 5), proj([2, 5], [0, 1])[1]!);
    eq(k(L, 10), proj([7, 1], [1, -1])[0]!);
  });
});

/**
 * The story rewrite of lessons 16 to 20. The numbers each teaching screen quotes and every item the
 * lessons ask are recomputed here, and the shape the brief asks for is checked on the candidate.
 */
describe("linear algebra story lessons 16 to 20", () => {
  const ids = [
    "fit-with-least-squares",
    "build-an-orthonormal-basis",
    "eigenvectors-and-eigenvalues",
    "diagonalise-a-map",
    "singular-value-decomposition",
  ];
  const lessons = ids.map((id) => bundle.lessons.find((l) => l.id === id)!);
  type Block = { kind: string; text?: string };
  const words = (blocks: Block[] | undefined) =>
    (blocks ?? []).reduce((n, b) => n + (b.text ?? "").split(/\s+/).filter(Boolean).length, 0);
  const asked = (l: (typeof lessons)[number]) => {
    const set = new Set<string>(l.questionIds);
    for (const s of l.steps) {
      if (s.checkQuestionId) set.add(s.checkQuestionId);
      for (const w of s.workedSteps ?? []) {
        if (w.selfExplain) set.add(w.selfExplain.questionId);
        if (w.blank) set.add(w.blank.questionId);
      }
    }
    return set;
  };
  const near = (actual: number[], expected: number[]) => {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((x, i) => expect(x).toBeCloseTo(expected[i]!, 9));
  };
  const scale = (c: number, v: number[]) => v.map((x) => c * x);
  const add = (u: number[], v: number[]) => u.map((x, i) => x + v[i]!);
  const lamOf = (m: number[][], v: number[]) => {
    const out = apply(m, v);
    const i = v.findIndex((x) => x !== 0);
    const l = out[i]! / v[i]!;
    out.forEach((x, j) => expect(x).toBeCloseTo(l * v[j]!, 9));
    return l;
  };
  // Singular values of a 2-column or 2-row matrix, from the eigenvalues of the 2 × 2 Gram matrix.
  const singular = (m: number[][]) => {
    const g =
      m[0]!.length === 2
        ? [0, 1].map((i) => [0, 1].map((j) => dot(m.map((r) => r[i]!), m.map((r) => r[j]!))))
        : m.map((r) => m.map((s) => dot(r, s)));
    const tr = g[0]![0]! + g[1]![1]!;
    const disc = Math.sqrt(tr * tr - 4 * det2(g));
    return [Math.sqrt((tr + disc) / 2), Math.sqrt(Math.max(0, (tr - disc) / 2))];
  };

  it("has the opener, steps, skill check and close the brief describes", () => {
    for (const l of lessons) {
      expect(l.intro?.hook.questionId, l.id).toBeUndefined();
      const hookWords = words(l.intro!.hook.blocks as Block[]);
      expect(hookWords, l.id).toBeGreaterThanOrEqual(120);
      expect(hookWords, l.id).toBeLessThanOrEqual(200);
      expect(l.intro!.promise.split(/\s+/).length, l.id).toBeLessThanOrEqual(25);
      expect(l.questionIds, l.id).toHaveLength(3);
      expect(l.steps.length, l.id).toBeGreaterThanOrEqual(8);
      expect(l.steps.length, l.id).toBeLessThanOrEqual(14);
      const teaching = l.steps.filter((s) => s.kind === "explain");
      expect(teaching.length / l.steps.length, l.id).toBeGreaterThanOrEqual(0.4);
      let run = 0;
      for (const s of l.steps) {
        run = s.kind === "explain" ? run + 1 : 0;
        expect(run, `${l.id}/${s.id}`).toBeLessThanOrEqual(3);
      }
      for (const s of teaching) {
        expect(s.checkQuestionId, `${l.id}/${s.id}`).toBe("");
        const n = words(s.lead as Block[]) + words(s.afterFigure as Block[]);
        expect(n, `${l.id}/${s.id}`).toBeGreaterThanOrEqual(80);
        expect(n, `${l.id}/${s.id}`).toBeLessThanOrEqual(280);
      }
      for (const s of l.steps.filter(
        (x) => x.kind !== "explain" && x.kind !== "worked_example" && x.kind !== "faded_example",
      ))
        expect(words(s.lead as Block[]), `${l.id}/${s.id}`).toBeLessThanOrEqual(60);
      expect(l.steps.some((s) => s.diagram), l.id).toBe(true);
      expect(l.steps.some((s) => s.kind === "transfer"), l.id).toBe(true);
      expect((l.recap?.nextHook ?? "").endsWith("?"), l.id).toBe(false);
      // Each lesson ends by pointing at the next one's subject; the last closes the course.
      expect((l.recap?.nextHook ?? "").length, l.id).toBeGreaterThan(40);
      // No em dashes anywhere in the prose the learner reads.
      const prose = [
        ...(l.intro!.hook.blocks as Block[]),
        ...(l.recap!.blocks as Block[]),
        ...l.steps.flatMap((s) => [...((s.lead ?? []) as Block[]), ...((s.afterFigure ?? []) as Block[])]),
      ]
        .map((b) => b.text ?? "")
        .join(" ");
      expect(prose, l.id).not.toContain("—");
    }
  });

  it("cites every step and asks 3 to 7 questions without citing the ones it dropped", () => {
    for (const l of lessons) {
      const citations = (bundle.authoringMetadata ?? []).find((m) => m.lessonId === l.id)!.citations;
      for (const s of l.steps)
        expect(
          citations.some((c) => c.targetKind === "step" && c.targetId === s.id),
          `${l.id}/${s.id}`,
        ).toBe(true);
      const set = asked(l);
      const own = bundle.questions.filter((q) => q.conceptIds.includes(l.conceptIds[0]!));
      for (const q of own)
        expect(
          citations.some((c) => c.targetKind === "question" && c.targetId === q.id),
          q.id,
        ).toBe(set.has(q.id));
      const questioned = l.steps.filter(
        (s) => s.checkQuestionId || (s.workedSteps ?? []).some((w) => w.selfExplain || w.blank),
      );
      expect(questioned.length, l.id).toBeGreaterThanOrEqual(3);
      expect(questioned.length, l.id).toBeLessThanOrEqual(7);
      // Every graded item is a skill this lesson or an earlier one teaches.
      const taught = new Set(
        bundle.lessons.slice(0, bundle.lessons.indexOf(l) + 1).flatMap((x) => x.taughtSkills ?? []),
      );
      for (const id of set) expect(taught.has(find(id).skill ?? ""), id).toBe(true);
    }
    const dropped = (id: string) =>
      bundle.questions
        .filter((q) => q.conceptIds.includes(`lin-${id}`))
        .map((q) => q.id)
        .filter((q) => !asked(bundle.lessons.find((l) => l.id === id)!).has(q))
        .sort();
    expect(dropped("fit-with-least-squares")).toEqual([k("fit-with-least-squares", 1), k("fit-with-least-squares", 7)]);
    expect(dropped("build-an-orthonormal-basis")).toEqual([k("build-an-orthonormal-basis", 7), k("build-an-orthonormal-basis", 8)]);
    expect(dropped("eigenvectors-and-eigenvalues")).toEqual([k("eigenvectors-and-eigenvalues", 1), k("eigenvectors-and-eigenvalues", 8)]);
    expect(dropped("diagonalise-a-map")).toEqual([k("diagonalise-a-map", 8)]);
    expect(dropped("singular-value-decomposition")).toEqual([k("singular-value-decomposition", 8)]);
  });

  it("lesson 16: recomputes the numbers the teaching screens and items quote", () => {
    const L = "fit-with-least-squares";
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const squares = (xs: number[], c: number) => xs.reduce((s, x) => s + (x - c) ** 2, 0);
    // Normal equations for y = c + s x at x = 0, 1, 2.
    const line = (ys: number[]) => {
      const xs = [0, 1, 2];
      const g = [[3, 3], [3, 5]];
      const rhs = [dot([1, 1, 1], ys), dot(xs, ys)];
      const d = det2(g);
      return {
        c: det2([[rhs[0]!, g[0]![1]!], [rhs[1]!, g[1]![1]!]]) / d,
        s: det2([[g[0]![0]!, rhs[0]!], [g[1]![0]!, rhs[1]!]]) / d,
      };
    };
    // The bolt: 6, 7, 11 projects onto (1, 1, 1) at 8, and no other constant does better.
    const bolt = [6, 7, 11];
    expect(dot(bolt, [1, 1, 1]) / dot([1, 1, 1], [1, 1, 1])).toBe(8);
    expect(mean(bolt)).toBe(8);
    const miss = bolt.map((x) => x - 8);
    expect(miss).toEqual([-2, -1, 3]);
    expect(dot(miss, [1, 1, 1])).toBe(0);
    expect(squares(bolt, 8)).toBe(14);
    expect(bolt.map((x) => x - 7)).toEqual([-1, 0, 4]);
    expect(squares(bolt, 7)).toBe(17);
    for (let c = 0; c <= 15; c += 0.25) expect(squares(bolt, c)).toBeGreaterThanOrEqual(14);
    eq(k(L, 8), mean([1, 2, 6]));
    expect(dot([1, 2, 6], [1, 1, 1]) / 3).toBe(3);
    // Worked example 2, 3, 10 and the faded example 2, 4, 9 fitted by 5.
    expect(mean([2, 3, 10])).toBe(5);
    expect([2, 3, 10].map((x) => x - 5)).toEqual([-3, -2, 5]);
    expect(squares([2, 3, 10], 5)).toBe(38);
    eq(k(L, 4), squares([2, 4, 9], 5));
    eq(k(L, 2), [2, 4, 9].reduce((s, x) => s + (x - 5), 0));
    expect(mean([2, 4, 9])).toBe(5);
    expect(choiceLabel(k(L, 9))).toBe("The residuals are perpendicular to (1, 1, 1), so their entries add up to zero.");
    // The seedling: 3, 3, 6 at weeks 0, 1, 2.
    const seed = line([3, 3, 6]);
    expect(seed.c).toBeCloseTo(2.5, 9);
    expect(seed.s).toBeCloseTo(1.5, 9);
    const fitted = [0, 1, 2].map((x) => seed.c + seed.s * x);
    near(fitted, [2.5, 4, 5.5]);
    const r = [3, 3, 6].map((y, i) => y - fitted[i]!);
    near(r, [0.5, -1, 0.5]);
    expect(dot(r, [1, 1, 1])).toBeCloseTo(0, 9);
    expect(dot(r, [0, 1, 2])).toBeCloseTo(0, 9);
    expect(r[0]).toBeCloseTo(r[2]!, 9);
    expect(r[1]!).toBeCloseTo(-2 * r[2]!, 9);
    expect((6 - 3) / 2).toBe(1.5);
    expect(mean([3, 3, 6]) - 1.5).toBe(2.5);
    // The shortcut holds for any heights, and the practice items follow from it.
    for (const ys of [[3, 3, 6], [5, 9, 7], [2, 5, 8], [1, 2, 2], [4, 3, 0]])
      expect(line(ys).s).toBeCloseTo((ys[2]! - ys[0]!) / 2, 9);
    eq(k(L, 11), line([5, 9, 7]).s);
    eq(k(L, 11), (7 - 5) / 2);
    near([line([5, 9, 7]).c], [6]);
    near([5, 9, 7].map((y, i) => y - (6 + i)), [-1, 2, -1]);
    eq(k(L, 6), line([2, 5, 8]).s);
    eq(k(L, 3), line([1, 2, 2]).s);
    eq(k(L, 10), line([4, 3, 0]).s);
    eq(k(L, 5), mean([1, 5, 9]));
    // The close points at the next lesson: these columns are not at right angles.
    expect(dot([1, 1, 1], [0, 1, 2])).toBe(3);
  });

  it("lesson 17: recomputes the numbers the teaching screens and items quote", () => {
    const L = "build-an-orthonormal-basis";
    // A right-angled pair of unit vectors and the coordinates of w = (5, 0).
    const e1 = [0.6, 0.8];
    const e2 = [0.8, -0.6];
    expect(len(e1)).toBeCloseTo(1, 9);
    expect(len(e2)).toBeCloseTo(1, 9);
    expect(dot(e1, e2)).toBeCloseTo(0, 9);
    near([dot([5, 0], e1), dot([5, 0], e2)], [3, 4]);
    near(add(scale(3, e1), scale(4, e2)), [5, 0]);
    expect(dot([1, 1], [1, 0])).not.toBe(0);
    // The shadow of (4, 7) on the x axis, and the residual.
    expect(proj([4, 7], [1, 0])).toEqual([4, 0]);
    expect(sub([4, 7], proj([4, 7], [1, 0]))).toEqual([0, 7]);
    eq(k(L, 5), sub([3, 1], proj([3, 1], [1, 0]))[1]!);
    // Gram–Schmidt on (4, 3) and (3, 5).
    expect(len([4, 3])).toBe(5);
    const f1 = unit([4, 3]);
    near(f1, [0.8, 0.6]);
    expect(dot([3, 5], f1)).toBeCloseTo(5.4, 9);
    const shadow = scale(dot([3, 5], f1), f1);
    near(shadow, [4.32, 3.24]);
    const left = sub([3, 5], shadow);
    near(left, [-1.32, 1.76]);
    expect(dot(left, f1)).toBeCloseTo(0, 9);
    expect(left[0]! ** 2 + left[1]! ** 2).toBeCloseTo(4.84, 9);
    expect(len(left)).toBeCloseTo(2.2, 9);
    near(unit(left), [-0.6, 0.8]);
    expect(dot(f1, unit(left))).toBeCloseTo(0, 9);
    // Worked example (3, 4) and (1, 0).
    const w1 = unit([3, 4]);
    const w2 = sub([1, 0], proj([1, 0], w1));
    near(w2, [0.64, -0.48]);
    expect(len(w2)).toBeCloseTo(0.8, 9);
    near(unit(w2), [0.8, -0.6]);
    // Normalising: (1, 1) and (−3, 4).
    eq(k(L, 2), 1 / Math.SQRT2);
    eq(k(L, 6), 4 / len([-3, 4]));
    // When nothing is left: (3, 6) along (1, 2), and the transfer item (2, 2) along (1, 1).
    expect(dot([3, 6], [1, 2])).toBe(15);
    expect(proj([3, 6], [1, 2])).toEqual([3, 6]);
    expect(sub([3, 6], proj([3, 6], [1, 2]))).toEqual([0, 0]);
    expect(sub([3, 5], proj([3, 5], [1, 2])).some((x) => Math.abs(x) > 0.1)).toBe(true);
    expect(sub([2, 2], proj([2, 2], [1, 1]))).toEqual([0, 0]);
    expect(choiceLabel(k(L, 4))).toBe("No");
    // Skill check.
    eq(k(L, 1), sub([1, 0], proj([1, 0], [1, 1]))[1]!);
    eq(k(L, 3), dot([1, 1], [1, -1]));
    eq(k(L, 10), sub([2, 4], proj([2, 4], [1, 1]))[0]!);
  });

  it("lesson 18: recomputes the numbers the teaching screens and items quote", () => {
    const L = "eigenvectors-and-eigenvalues";
    const T = [[3, 1], [0, 2]];
    expect(apply(T, [0, 1])).toEqual([1, 2]);
    expect(apply(T, [1, 1])).toEqual([4, 2]);
    expect(det2([apply(T, [1, 1]), [1, 1]])).not.toBe(0);
    expect(apply(T, [1, 0])).toEqual([3, 0]);
    expect(lamOf(T, [1, 0])).toBe(3);
    expect(apply(T, [1, -1])).toEqual([2, -2]);
    expect(lamOf(T, [1, -1])).toBe(2);
    // The negative and zero cases on the "flips and collapses" screen.
    expect(apply([[-1, 0], [0, 2]], [1, 0])).toEqual([-1, 0]);
    expect(lamOf([[-1, 0], [0, 2]], [1, 0])).toBe(-1);
    expect(apply([[1, 1], [1, 1]], [1, -1])).toEqual([0, 0]);
    // The predict item, the worked example and the practice items.
    eq(k(L, 7), lamOf([[4, 0], [0, 4]], [1, 2]) === 4 && apply([[4, 0], [0, 4]], [1, 2]).join() === "4,8" ? 4 : NaN);
    expect(scale(4, [1, 2])).toEqual([4, 8]);
    expect(lamOf([[4, 1], [2, 3]], [1, 1])).toBe(5);
    const S = [[2, 1], [1, 2]];
    eq(k(L, 2), lamOf(S, [1, -1]));
    eq(k(L, 3), lamOf([[-2, 0], [0, 3]], [1, 0]));
    expect(apply(S, [1, 0])).toEqual([2, 1]);
    expect(choiceLabel(k(L, 4))).toBe("No");
    // Skill check.
    eq(k(L, 5), lamOf([[4, 0], [0, 2]], [0, 1]));
    eq(k(L, 10), lamOf([[1, 2], [2, 1]], [1, -1]));
    expect(choiceLabel(k(L, 6))).toBe("Yes, with eigenvalue 0");
    // The recap lists these factors.
    expect([lamOf(T, [1, 0]), lamOf(T, [1, -1]), 5, lamOf(S, [1, -1]), lamOf([[-2, 0], [0, 3]], [1, 0])]).toEqual([3, 2, 5, 1, -2]);
  });

  it("lesson 19: recomputes the numbers the teaching screens and items quote", () => {
    const L = "diagonalise-a-map";
    const S = [[2, 1], [1, 2]];
    const T = [[3, 1], [0, 2]];
    // The opening machine is S: it triples (1, 1) and leaves (1, −1).
    expect(apply(S, [1, 1])).toEqual([3, 3]);
    expect(apply(S, [1, -1])).toEqual([1, -1]);
    // (0, 2) = (1, 1) − (1, −1) goes to 3(1, 1) − (1, −1) = (2, 4).
    expect(add(scale(1, [1, 1]), scale(-1, [1, -1]))).toEqual([0, 2]);
    expect(add(scale(3, [1, 1]), scale(-1, [1, -1]))).toEqual([2, 4]);
    expect(apply(S, [0, 2])).toEqual([2, 4]);
    // (2, 0) = (1, 1) + (1, −1) goes to (4, 2).
    expect(add([1, 1], [1, -1])).toEqual([2, 0]);
    expect(add(scale(3, [1, 1]), [1, -1])).toEqual([4, 2]);
    expect(apply(S, [2, 0])).toEqual([4, 2]);
    eq(k(L, 7), apply(S, [2, 0])[0]!);
    // T = P D P⁻¹ with P = [(1, 0), (1, −1)] and D = diag(3, 2).
    const P = [[1, 1], [0, -1]];
    const D = [[3, 0], [0, 2]];
    const PD = mul(mul(P, D), inv2(P));
    T.forEach((row, i) => row.forEach((x, j) => expect(PD[i]![j]).toBeCloseTo(x, 9)));
    near(apply(inv2(P), [4, 2]), [6, -2]);
    near(apply(D, [6, -2]), [18, -4]);
    near(apply(P, [18, -4]), [14, 4]);
    expect(apply(T, [4, 2])).toEqual([14, 4]);
    // Swapping the columns of P swaps D with them and keeps the product.
    const P2 = [[1, 1], [-1, 0]];
    const D2 = [[2, 0], [0, 3]];
    const PD2 = mul(mul(P2, D2), inv2(P2));
    T.forEach((row, i) => row.forEach((x, j) => expect(PD2[i]![j]).toBeCloseTo(x, 9)));
    // Powers: T applied three times to (1, 0).
    expect(apply(T, [1, 0])).toEqual([3, 0]);
    expect(apply(T, [3, 0])).toEqual([9, 0]);
    expect(apply(T, [9, 0])).toEqual([27, 0]);
    expect(lamOf(T, [1, 0]) ** 3).toBe(27);
    // A² = P D² P⁻¹.
    const A2 = mul(T, T);
    const PD2P = mul(mul(P, mul(D, D)), inv2(P));
    A2.forEach((row, i) => row.forEach((x, j) => expect(PD2P[i]![j]).toBeCloseTo(x, 9)));
    // The shear has only the x axis as eigenvectors.
    const shear = [[1, 1], [0, 1]];
    expect(apply(shear, [1, 0])).toEqual([1, 0]);
    for (const [a, b] of [[1, 1], [2, 3], [0, 1], [-1, 2]]) {
      const out = apply(shear, [a!, b!]);
      expect(det2([out, [a!, b!]])).not.toBe(0);
    }
    // Items.
    eq(k(L, 1), lamOf(S, [1, 1]));
    eq(k(L, 2), lamOf(S, [1, 1]) ** 2);
    expect(lamOf([[4, 1], [2, 3]], [1, 1]) ** 2).toBe(25);
    eq(k(L, 5), lamOf([[2, 0], [0, -1]], [1, 0]) ** 3);
    eq(k(L, 4), lamOf(S, [1, -1]));
    eq(k(L, 10), lamOf([[3, 0], [0, -2]], [0, 1]) ** 4);
    expect(choiceLabel(k(L, 3))).toBe("No");
    expect(choiceLabel(k(L, 6))).toBe("Its columns must form a basis");
    expect(lamOf(S, [1, 1]) ** 2).toBe(9);
  });

  it("lesson 20: recomputes the numbers the teaching screens and items quote", () => {
    const L = "singular-value-decomposition";
    // The opening machine: stretch by 5 across and 3 up, then a quarter turn.
    const stretch = [[5, 0], [0, 3]];
    const quarter = [[0, -1], [1, 0]];
    const machine = mul(quarter, stretch);
    expect(machine).toEqual([[0, -3], [5, 0]]);
    expect(apply(machine, [1, 0])).toEqual([0, 5]);
    expect(apply(machine, [0, 1])).toEqual([-3, 0]);
    near(singular(machine), [5, 3]);
    // A turn keeps length, so every unit input comes out between 3 and 5 long.
    for (let t = 0; t < 2 * Math.PI; t += 0.1) {
      const out = len(apply(machine, [Math.cos(t), Math.sin(t)]));
      expect(out).toBeGreaterThanOrEqual(3 - 1e-9);
      expect(out).toBeLessThanOrEqual(5 + 1e-9);
    }
    // The predict item: stretches 4 and 2 then a turn, longest output 4.
    near(singular(mul(quarter, [[4, 0], [0, 2]])), [4, 2]);
    eq(k(L, 7), singular(mul(quarter, [[4, 0], [0, 2]]))[0]!);
    // The flip screen: rows (−5, 0) and (0, 1) have singular values 5 and 1.
    near(singular([[-5, 0], [0, 1]]), [5, 1]);
    // Perpendicular columns: the singular values are the column lengths.
    expect(dot([0, 5], [-3, 0])).toBe(0);
    // All ones: singular values 2 and 0, and (1, 1) is stretched by 2.
    near(singular([[1, 1], [1, 1]]), [2, 0]);
    expect(len(apply([[1, 1], [1, 1]], [1, 1])) / len([1, 1])).toBeCloseTo(2, 9);
    expect(apply([[1, 1], [1, 1]], [1, -1])).toEqual([0, 0]);
    // The 3 × 2 example: columns of lengths 3 and 1.
    near(singular([[3, 0], [0, 1], [0, 0]]), [3, 1]);
    // Items.
    eq(k(L, 1), singular([[3, 0], [0, -2]])[0]!);
    expect(singular([[-6, 0], [0, 3]]).map((x) => Math.round(x))).toEqual([6, 3]);
    eq(k(L, 3), singular([[1, 2], [2, 4]])[1]!);
    eq(k(L, 6), singular([[1, 0, 0], [0, 2, 0]])[1]!);
    expect(choiceLabel(k(L, 2))).toBe("2 × 3");
    eq(k(L, 5), singular([[0, 5], [2, 0], [0, 0]])[0]!);
    eq(k(L, 10), singular([[-3, 0], [0, -8]])[1]!);
    expect(choiceLabel(k(L, 4))).toBe("Σ");
  });

  it("gives every numeric misconception a value that is not the key", () => {
    for (const id of ids) {
      for (const q of bundle.questions.filter((item) => item.conceptIds.includes(`lin-${id}`))) {
        if (q.answerAuthority.kind !== "numeric") continue;
        for (const m of q.misconceptions ?? [])
          expect(m.match.numeric ?? [], q.id).not.toContain(q.answerAuthority.value);
      }
    }
  });
});
