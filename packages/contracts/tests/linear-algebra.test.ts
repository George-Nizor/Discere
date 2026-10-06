import { describe, expect, it } from "vitest";
import {
  LinearAlgebraModelSchema as model,
  LinearAlgebraDiagramSchema as diagram,
  CourseCheckVisualSchema,
  LearningDiagramSchema,
} from "../src/index.js";
describe("bounded linear algebra given data", () => {
  it.each([
    {
      kind: "matrix",
      operation: "multiply",
      matrix: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      second: [[1], [2], [3]],
    },
    {
      kind: "matrix",
      operation: "apply",
      matrix: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      vector: [1, 0, -1],
    },
    {
      kind: "system",
      matrix: [
        [1, 2],
        [3, 4],
      ],
      rhs: [1, 2],
    },
    { kind: "projection", v: [2, 3], direction: [1, 1] },
    {
      kind: "svd",
      matrix: [
        [1, 0],
        [0, 2],
        [1, 1],
      ],
    },
  ])("accepts dimensional givens for %j", (m) => expect(model.safeParse(m).success).toBe(true));
  it.each([
    { kind: "matrix", operation: "multiply", matrix: [[1, 2]], second: [[1, 2]] },
    { kind: "matrix", operation: "multiply", matrix: [[1, 2]] },
    { kind: "matrix", operation: "apply", matrix: [[1, 2]], vector: [1] },
    {
      kind: "matrix",
      operation: "determinant",
      matrix: [
        [1, 2, 3],
        [4, 5, 6],
      ],
    },
    { kind: "matrix", operation: "transpose", matrix: [[1, 2]], vector: [1, 2] },
    { kind: "matrix", operation: "transpose", matrix: [[1, 2]], second: [[1], [2]] },
    { kind: "matrix", operation: "inverse", matrix: [[1, 2], [3]] },
    {
      kind: "system",
      matrix: [
        [1, 2],
        [3, 4],
      ],
      rhs: [1],
    },
    {
      kind: "eigen",
      matrix: [
        [1, 0],
        [0, 1],
      ],
      vector: [0, 0],
    },
    { kind: "projection", v: [2, 3], direction: [0, 0] },
    { kind: "scaled_vector", v: [21, 0], scale: 2 },
    { kind: "dot_product", u: [1, 2], v: [3, 4], answer: 11 },
    {
      kind: "svd",
      matrix: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
    },
  ])("rejects invalid shapes, zero directions and answer fields for %j", (m) =>
    expect(model.safeParse(m).success).toBe(false),
  );
  it("integrates the visual with both schemas without answer authority", () => {
    const m = {
      kind: "eigen",
      matrix: [
        [2, 1],
        [1, 2],
      ],
      vector: [1, 1],
    };
    expect(CourseCheckVisualSchema.safeParse({ type: "linear_algebra", model: m }).success).toBe(
      true,
    );
    const d = {
      type: "linear_algebra_explorer",
      initialCaseId: "a",
      cases: [
        { id: "a", label: "A", model: m },
        { id: "b", label: "B", model: { ...m, vector: [1, -1] } },
      ],
    };
    expect(diagram.safeParse(d).success).toBe(true);
    expect(LearningDiagramSchema.safeParse(d).success).toBe(true);
    expect(diagram.safeParse({ ...d, initialCaseId: "missing" }).success).toBe(false);
    expect(diagram.safeParse({ ...d, cases: [d.cases[0], d.cases[0]] }).success).toBe(false);
  });
});
