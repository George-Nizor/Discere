import { describe, it, expect } from "vitest";
import { LearningDiagramSchema } from "../src/index.js";
describe("bounded teaching visuals", () => {
  it("rejects hidden or ambiguously labelled grid points", () => {
    const grid = {
      type: "coordinate_plane",
      min: -5,
      max: 5,
      points: [{ x: 6, y: 0, label: "A" }],
    };
    expect(LearningDiagramSchema.safeParse(grid).success).toBe(false);
    grid.points = [
      { x: 1, y: 1, label: "A" },
      { x: 2, y: 2, label: "A" },
    ];
    expect(LearningDiagramSchema.safeParse(grid).success).toBe(false);
  });
  it("requires a usable slider, nonzero divisors and ordered binary search", () => {
    expect(
      LearningDiagramSchema.safeParse({
        type: "number_machine",
        input: { min: 0, max: 10, value: 20 },
        operations: [{ operator: "add", operand: 2 }],
      }).success,
    ).toBe(false);
    expect(
      LearningDiagramSchema.safeParse({
        type: "number_machine",
        input: { min: 0, max: 10, value: 0 },
        operations: [{ operator: "divide", operand: 0 }],
      }).success,
    ).toBe(false);
    expect(
      LearningDiagramSchema.safeParse({
        type: "search_array",
        values: [4, 2, 7],
        target: 4,
        strategy: "binary",
      }).success,
    ).toBe(false);
  });
});
