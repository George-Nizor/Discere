import { describe, expect, it } from "vitest";
import { LearningDiagramSchema } from "../src/index.js";
const fixture = () => ({
  type: "python_execution",
  runtime: "Python 3.12",
  initialCaseId: "a",
  cases: ["a", "b"].map((id) => ({
    id,
    label: id,
    code: "x = 2\nx += 3",
    steps: [
      { lineStart: 1, lineEnd: 1, values: [{ name: "x", type: "int", display: "2" }], stdout: "" },
      { lineStart: 2, lineEnd: 2, values: [{ name: "x", type: "int", display: "5" }], stdout: "" },
    ],
  })),
});
describe("bounded Python execution diagrams", () => {
  it("accepts an ordered execution of every code line", () =>
    expect(LearningDiagramSchema.safeParse(fixture()).success).toBe(true));
  it("rejects unavailable cases and duplicate identities", () => {
    expect(
      LearningDiagramSchema.safeParse({ ...fixture(), initialCaseId: "missing" }).success,
    ).toBe(false);
    const data = fixture();
    data.cases[1]!.id = "a";
    expect(LearningDiagramSchema.safeParse(data).success).toBe(false);
  });
  it("rejects skipped, overlapping and out-of-range code spans", () => {
    for (const [start, end] of [
      [3, 3],
      [1, 2],
      [2, 4],
    ]) {
      const data = fixture();
      data.cases[0]!.steps[1]!.lineStart = start!;
      data.cases[0]!.steps[1]!.lineEnd = end!;
      expect(LearningDiagramSchema.safeParse(data).success).toBe(false);
    }
  });
  it("rejects ragged tables, duplicated watched names and hidden authority", () => {
    const data = fixture();
    const value = data.cases[0]!.steps[0]!.values[0]!;
    for (const extra of [
      { table: { columns: ["a", "b"], rows: [[1]] } },
      { answerAuthority: { kind: "numeric", value: 5 } },
    ]) {
      expect(
        LearningDiagramSchema.safeParse({
          ...data,
          cases: data.cases.map((item) => ({
            ...item,
            steps: [{ ...item.steps[0], values: [{ ...value, ...extra }] }, item.steps[1]],
          })),
        }).success,
      ).toBe(false);
    }
    data.cases[0]!.steps[0]!.values.push({ ...value });
    expect(LearningDiagramSchema.safeParse(data).success).toBe(false);
  });
});
