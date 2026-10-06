import { describe, expect, it } from "vitest";
import { LearningDiagramSchema } from "../src/learning-diagram.js";
const table = {
  name: "orders",
  columns: ["id", "amount"],
  rows: [{ id: "one", cells: [1, null] }],
};
const query = { id: "all", label: "All", sql: "SELECT * FROM orders;", result: table };
const valid = {
  type: "relational_query",
  inputs: [table],
  queries: [query, { ...query, id: "other", label: "Other" }],
  initialQueryId: "all",
};
describe("bounded relational query examples", () => {
  it("preserves SQL null and rejects mismatched cell widths and duplicated row labels", () => {
    expect(LearningDiagramSchema.safeParse(valid).success).toBe(true);
    expect(
      LearningDiagramSchema.safeParse({
        ...valid,
        inputs: [{ ...table, rows: [{ id: "one", cells: [1] }] }],
      }).success,
    ).toBe(false);
    expect(
      LearningDiagramSchema.safeParse({
        ...valid,
        inputs: [{ ...table, rows: [table.rows[0], table.rows[0]] }],
      }).success,
    ).toBe(false);
  });
  it("rejects unavailable queries and oversized tables", () => {
    expect(LearningDiagramSchema.safeParse({ ...valid, initialQueryId: "missing" }).success).toBe(
      false,
    );
    expect(LearningDiagramSchema.safeParse({ ...valid, queries: [query, query] }).success).toBe(
      false,
    );
    expect(
      LearningDiagramSchema.safeParse({
        ...valid,
        inputs: [
          {
            ...table,
            rows: Array.from({ length: 25 }, (_, i) => ({ id: String(i), cells: [i, 1] })),
          },
        ],
      }).success,
    ).toBe(false);
  });
});
