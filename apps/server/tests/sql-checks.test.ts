import { readFileSync } from "node:fs";
import { CourseBundleSchema } from "@discere/contracts";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

/**
 * Every SQL course-check query is run in SQLite and the cell, row count or column count it names
 * is compared with the key. `read` says which part of the result the question asks about.
 */
type Read = "rows" | "columns" | { row: number; column: number };
const reads: Record<string, { read: Read; value: number | string | null }> = {
  "sql-from-rows-to-reports-check-placement-1": { read: "rows", value: 2 },
  "sql-from-rows-to-reports-check-placement-2": { read: { row: 0, column: 0 }, value: 38 },
  "sql-from-rows-to-reports-check-placement-3": { read: "rows", value: 3 },
  "sql-from-rows-to-reports-check-placement-4": { read: { row: 0, column: 0 }, value: 12 },
  "sql-from-rows-to-reports-check-placement-5": { read: "rows", value: 3 },
  "sql-from-rows-to-reports-check-placement-6": { read: { row: 0, column: 0 }, value: 41.25 },
  "sql-from-rows-to-reports-check-placement-7": { read: "rows", value: 1 },
  "sql-from-rows-to-reports-check-placement-8": { read: "rows", value: 4 },
  "sql-from-rows-to-reports-check-placement-9": { read: { row: 0, column: 1 }, value: 0 },
  "sql-from-rows-to-reports-check-placement-10": { read: "rows", value: 6 },
  "sql-from-rows-to-reports-check-placement-11": { read: "rows", value: 2 },
  "sql-from-rows-to-reports-check-placement-12": { read: "rows", value: 3 },
  "sql-from-rows-to-reports-check-placement-13": { read: { row: 0, column: 1 }, value: 3 },
  "sql-from-rows-to-reports-check-placement-14": { read: { row: 3, column: 1 }, value: 2 },
  "sql-from-rows-to-reports-check-placement-15": { read: { row: 3, column: 1 }, value: null },
  "sql-from-rows-to-reports-check-checkpoint-1": { read: { row: 0, column: 1 }, value: null },
  "sql-from-rows-to-reports-check-checkpoint-2": { read: { row: 0, column: 0 }, value: null },
  "sql-from-rows-to-reports-check-checkpoint-3": { read: "rows", value: 2 },
  "sql-from-rows-to-reports-check-checkpoint-4": { read: { row: 0, column: 0 }, value: 25 },
  "sql-from-rows-to-reports-check-checkpoint-5": { read: "rows", value: 5 },
  "sql-from-rows-to-reports-check-checkpoint-6": {
    read: { row: 0, column: 0 },
    value: 5.333333333333333,
  },
  "sql-from-rows-to-reports-check-checkpoint-7": { read: "rows", value: 1 },
  "sql-from-rows-to-reports-check-checkpoint-8": { read: "rows", value: 4 },
  "sql-from-rows-to-reports-check-checkpoint-9": { read: { row: 0, column: 0 }, value: "A" },
  "sql-from-rows-to-reports-check-checkpoint-10": { read: "rows", value: 6 },
  "sql-from-rows-to-reports-check-checkpoint-11": { read: "rows", value: 2 },
  "sql-from-rows-to-reports-check-checkpoint-12": { read: "rows", value: 3 },
  "sql-from-rows-to-reports-check-checkpoint-13": { read: { row: 4, column: 1 }, value: 2 },
  "sql-from-rows-to-reports-check-checkpoint-14": { read: "rows", value: 3 },
  "sql-from-rows-to-reports-check-checkpoint-15": { read: { row: 2, column: 1 }, value: 24 },
  "sql-from-rows-to-reports-check-transfer-1": { read: "rows", value: 1 },
  "sql-from-rows-to-reports-check-transfer-2": { read: "columns", value: 2 },
  "sql-from-rows-to-reports-check-transfer-3": { read: "rows", value: 3 },
  "sql-from-rows-to-reports-check-transfer-4": { read: { row: 0, column: 0 }, value: 36 },
  "sql-from-rows-to-reports-check-transfer-5": { read: { row: 0, column: 0 }, value: 3 },
  "sql-from-rows-to-reports-check-transfer-6": { read: { row: 0, column: 0 }, value: null },
  "sql-from-rows-to-reports-check-transfer-7": { read: { row: 0, column: 0 }, value: "N" },
  "sql-from-rows-to-reports-check-transfer-8": { read: "rows", value: 6 },
  "sql-from-rows-to-reports-check-transfer-9": { read: "rows", value: 2 },
  "sql-from-rows-to-reports-check-transfer-10": { read: "rows", value: 3 },
  "sql-from-rows-to-reports-check-transfer-11": { read: { row: 0, column: 0 }, value: "W" },
  "sql-from-rows-to-reports-check-transfer-12": { read: "rows", value: 4 },
  "sql-from-rows-to-reports-check-transfer-13": { read: { row: 2, column: 1 }, value: 2 },
  "sql-from-rows-to-reports-check-transfer-14": { read: { row: 1, column: 1 }, value: 20 },
  "sql-from-rows-to-reports-check-transfer-15": { read: { row: 3, column: 1 }, value: null },
};
const items = CourseBundleSchema.parse(
  JSON.parse(
    readFileSync(
      new URL("../../../content/sql-from-rows-to-reports/bundle.json", import.meta.url),
      "utf8",
    ),
  ),
).courseChecks!.flatMap((check) => check.items);

describe("SQL independent challenge executions", () => {
  it("has a recorded read for every check item", () => {
    expect(items.map((item) => item.question.id).sort()).toEqual(Object.keys(reads).sort());
  });
  for (const item of items)
    it(item.question.id, () => {
      const s = reads[item.question.id]!;
      const visual = item.visual;
      if (visual.type !== "query") throw new Error("Expected a query");
      const db = new Database(":memory:");
      try {
        for (const table of visual.tables) {
          db.exec(
            'CREATE TABLE "' +
              table.name +
              '" (' +
              table.columns.map((c) => '"' + c + '"').join(",") +
              ");",
          );
          const insert = db.prepare(
            'INSERT INTO "' +
              table.name +
              '" VALUES (' +
              table.columns.map(() => "?").join(",") +
              ")",
          );
          for (const row of table.rows) insert.run(...row);
        }
        const stmt = db.prepare(visual.sql);
        expect(stmt.readonly).toBe(true);
        const rows = stmt.raw().all() as (number | string | null)[][];
        const actual =
          s.read === "rows"
            ? rows.length
            : s.read === "columns"
              ? stmt.columns().length
              : rows[s.read.row]![s.read.column];
        if (typeof s.value === "number") expect(actual).toBeCloseTo(s.value, 9);
        else expect(actual).toBe(s.value);
        const authority = item.question.answerAuthority;
        if (authority.kind === "numeric") expect(authority.value).toBe(s.value);
        else
          expect(item.question.choices!.map((c) => c.label)).toEqual(
            expect.arrayContaining(authority.acceptedIdeas),
          );
      } finally {
        db.close();
      }
    });
});
