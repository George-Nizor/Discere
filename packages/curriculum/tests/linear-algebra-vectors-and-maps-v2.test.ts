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
