import { describe, expect, it } from "vitest";
import {
  PythonExecutionSchema,
  PythonInputsSchema,
  PythonValueSchema,
} from "../src/python-project.js";
describe("bounded Python practice contracts", () => {
  it("accepts ordinary inputs and typed output values", () => {
    expect(PythonInputsSchema.parse({ values: [1, null, 0], label: "A", active: true })).toEqual({
      values: [1, null, 0],
      label: "A",
      active: true,
    });
    expect(
      PythonExecutionSchema.parse({ result: { columns: ["n"], rows: [[1]] }, output: "" }),
    ).toHaveProperty("result");
  });
  it("rejects unexpected output authority and invalid values", () => {
    expect(PythonExecutionSchema.safeParse({ result: 1, output: "", correct: true }).success).toBe(
      false,
    );
    expect(PythonValueSchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
    expect(PythonValueSchema.safeParse("a".repeat(2001)).success).toBe(false);
    expect(PythonInputsSchema.safeParse({ result: 1 }).success).toBe(false);
    expect(PythonInputsSchema.safeParse({ __builtins__: 1 }).success).toBe(false);
  });
  it("bounds nested values and total result size", () => {
    let nested: unknown = 1;
    for (let i = 0; i < 8; i++) nested = [nested];
    expect(PythonValueSchema.safeParse(nested).success).toBe(false);
    expect(
      PythonValueSchema.safeParse(Array.from({ length: 200 }, () => Array(20).fill(1))).success,
    ).toBe(false);
  });
});
