import { describe, expect, it } from "vitest";
import { IsolatedSqlRuntime, sameSqlResult } from "../src/sql-projects/runtime.js";
import type { SqlTable } from "@discere/contracts";
import { sqlProjects } from "../../../content/sql-from-rows-to-reports/authoring/projects.js";
const runtime = new IsolatedSqlRuntime();
const tables: SqlTable[] = [
  {
    name: "values_table",
    columns: [{ name: "amount", type: "INTEGER" }],
    rows: [[2], [2], [null], [5]],
  },
];
describe("isolated SQLite execution", () => {
  it("bounds concurrent workers and remains usable after they finish", async () => {
    const runner = new IsolatedSqlRuntime();
    const running = Array.from({ length: 4 }, () =>
      runner.execute(
        "WITH RECURSIVE x(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM x) SELECT SUM(n) FROM x",
        tables,
      ),
    );
    expect(await runner.execute("SELECT 1", tables)).toMatchObject({
      error: "runtime",
      message: "SQL practice is busy. Try again in a moment.",
    });
    await Promise.all(running);
    expect(await runner.execute("SELECT 1 AS ready", tables)).toEqual({
      result: { columns: ["ready"], rows: [[1]] },
    });
  });

  it.each(sqlProjects.projects.flatMap((p) => p.tasks))(
    "executes the manually checked outputs for $id",
    async (task) => {
      for (const fixture of task.cases) {
        const output = await runtime.execute(task.solution, fixture.tables);
        expect(output).toHaveProperty("result");
        if ("result" in output)
          expect(sameSqlResult(output.result, fixture.expected, task.ordered)).toBe(true);
      }
    },
  );
  it.each([
    "DROP TABLE values_table",
    "DELETE FROM values_table",
    "UPDATE values_table SET amount = 9",
    "ATTACH DATABASE '/tmp/discere-should-never-exist.sqlite' AS other",
    "PRAGMA database_list",
    "SELECT * FROM sqlite_master",
    "SELECT * FROM pragma_database_list",
    "SELECT load_extension('/tmp/no-extension')",
    "SELECT readfile('/etc/passwd')",
    "VACUUM INTO '/tmp/discere-should-never-exist.sqlite'",
    "SELECT 1; SELECT 2",
    "CREATE TEMP TABLE hidden(value)",
    "SELECT randomblob(1000000000)",
    "SELECT ?",
  ])("rejects changes, external access and unsupported execution: %s", async (query) => {
    expect(await runtime.execute(query, tables)).toHaveProperty("error");
  });
  it("accepts a CTE and uses a fresh database for each query", async () => {
    expect(
      await runtime.execute(
        "WITH known AS (SELECT amount FROM values_table WHERE amount IS NOT NULL) SELECT SUM(amount) AS total FROM known",
        tables,
      ),
    ).toEqual({ result: { columns: ["total"], rows: [[9]] } });
    expect(await runtime.execute("SELECT COUNT(*) AS n FROM values_table", tables)).toEqual({
      result: { columns: ["n"], rows: [[4]] },
    });
  });
  it("bounds recursion and row counts without blocking later work", async () => {
    const start = Date.now();
    expect(
      await runtime.execute(
        "WITH RECURSIVE x(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM x) SELECT SUM(n) FROM x",
        tables,
      ),
    ).toHaveProperty("error", "limit");
    expect(Date.now() - start).toBeLessThan(4500);
    expect(
      await runtime.execute(
        "WITH RECURSIVE x(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM x WHERE n<201) SELECT n FROM x",
        tables,
      ),
    ).toHaveProperty("error", "limit");
    expect(await runtime.execute("SELECT 1 AS ready", tables)).toEqual({
      result: { columns: ["ready"], rows: [[1]] },
    });
  });
  it("reports a missing interpreter without affecting ordinary requests", async () => {
    expect(
      await new IsolatedSqlRuntime("/not-an-interpreter").execute("SELECT 1", tables),
    ).toHaveProperty("error", "runtime");
  });
  it("compares bags, NULLs, numeric tolerance, aliases and ordering", () => {
    const expected = { columns: ["x"], rows: [[2], [2], [null]] };
    expect(sameSqlResult({ columns: ["x"], rows: [[null], [2], [2]] }, expected, false)).toBe(true);
    expect(sameSqlResult({ columns: ["x"], rows: [[null], [2], [2]] }, expected, true)).toBe(false);
    expect(sameSqlResult({ columns: ["x"], rows: [[2], [null], [null]] }, expected, false)).toBe(
      false,
    );
    expect(sameSqlResult({ columns: ["x"], rows: [[2], [2], ["NULL"]] }, expected, false)).toBe(
      false,
    );
    expect(sameSqlResult({ columns: ["y"], rows: expected.rows }, expected, false)).toBe(false);
    expect(
      sameSqlResult(
        { columns: ["x"], rows: [[1 / 3]] },
        { columns: ["x"], rows: [[0.3333333333]] },
        false,
      ),
    ).toBe(true);
  });
});
