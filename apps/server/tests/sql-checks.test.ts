import Database from "better-sqlite3";
import { describe, it, expect } from "vitest";
import {
  sqlCheckSpecs,
  sqlCourseChecks,
} from "../../../content/sql-from-rows-to-reports/authoring/course-checks.js";
describe("SQL independent challenge executions", () => {
  for (const [setIndex, set] of sqlCheckSpecs.entries())
    for (const [index, s] of set.entries())
      it(sqlCourseChecks[setIndex]!.items[index]!.question.id, () => {
        const db = new Database(":memory:");
        try {
          for (const table of s.visual.tables) {
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
          const stmt = db.prepare(s.visual.sql);
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
          const question = sqlCourseChecks[setIndex]!.items[index]!.question;
          if (question.answerAuthority.kind === "numeric")
            expect(question.answerAuthority.value).toBe(s.value);
          else expect(question.answerAuthority.acceptedIdeas).toEqual([s.choices![s.correct!]!]);
        } finally {
          db.close();
        }
      });
});
