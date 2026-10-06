import { describe, it, expect } from "vitest";
import { CourseCheckVisualSchema } from "../src/course-check-visual.js";
describe("Foundation assessment givens", () => {
  it("rejects duplicate labels, blank statements and answer-bearing extra fields", () => {
    const v = {
      type: "statements",
      title: "Argument",
      statements: [
        { label: "A", text: "p" },
        { label: "A", text: "q" },
      ],
    };
    expect(CourseCheckVisualSchema.safeParse(v).success).toBe(false);
    expect(
      CourseCheckVisualSchema.safeParse({ ...v, statements: [{ label: "A", text: "" }] }).success,
    ).toBe(false);
    expect(
      CourseCheckVisualSchema.safeParse({
        ...v,
        statements: [{ label: "A", text: "p" }],
        correct: true,
      }).success,
    ).toBe(false);
  });
  it("bounds code length, line count and language without accepting execution data", () => {
    expect(
      CourseCheckVisualSchema.safeParse({ type: "program", language: "python", code: "x = 3" })
        .success,
    ).toBe(true);
    for (const change of [
      { code: "x\n".repeat(25) },
      { code: "" },
      { language: "javascript" },
      { output: "3" },
    ])
      expect(
        CourseCheckVisualSchema.safeParse({
          type: "program",
          language: "python",
          code: "x = 3",
          ...change,
        }).success,
      ).toBe(false);
  });
  it("requires bounded finite datasets and distinct series labels", () => {
    const s = {
      type: "data_series",
      label: "Given values",
      series: [{ label: "A", values: [2, 3] }],
    };
    expect(CourseCheckVisualSchema.safeParse(s).success).toBe(true);
    for (const values of [[1], [1, Infinity], [1, 101], Array(13).fill(1)])
      expect(
        CourseCheckVisualSchema.safeParse({ ...s, series: [{ label: "A", values }] }).success,
      ).toBe(false);
    expect(
      CourseCheckVisualSchema.safeParse({ ...s, series: [...s.series, ...s.series] }).success,
    ).toBe(false);
  });
});

describe("SQL check givens", () => {
  const visual = {
    type: "query",
    sql: "SELECT count(*) FROM samples;",
    tables: [
      {
        name: "samples",
        columns: ["id", "value"],
        rows: [
          [1, null],
          [2, "NULL"],
        ],
      },
    ],
  };
  it("accepts distinct typed input cells without a solved result", () => {
    expect(CourseCheckVisualSchema.parse(visual)).toEqual(visual);
  });
  it("rejects malformed, oversized or result-bearing inputs", () => {
    for (const tables of [
      [...visual.tables, ...visual.tables],
      [{ ...visual.tables[0], rows: [[1]] }],
      [{ ...visual.tables[0], columns: ["id", "id"] }],
      [{ ...visual.tables[0], name: "a; DROP TABLE b" }],
      [{ ...visual.tables[0], rows: Array(9).fill([1, 2]) }],
      [{ ...visual.tables[0], rows: [[1, Infinity]] }],
      [{ ...visual.tables[0], output: [[2]] }],
    ])
      expect(CourseCheckVisualSchema.safeParse({ ...visual, tables }).success).toBe(false);
    expect(CourseCheckVisualSchema.safeParse({ ...visual, result: 2 }).success).toBe(false);
    expect(
      CourseCheckVisualSchema.safeParse({ ...visual, sql: "select 1;\n".repeat(25) }).success,
    ).toBe(false);
  });
});
