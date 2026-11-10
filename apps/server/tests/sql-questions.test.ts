import { spawnSync } from "node:child_process";
import type { SqlTable } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { assessSql, sqlTask } from "../src/sql-projects/questions.js";
import { IsolatedSqlRuntime, type SqlExecution, type SqlRuntime } from "../src/sql-projects/runtime.js";

const course = "sql-from-rows-to-reports";
const lesson = "filter-the-rows";
const exercise = "sql-filter-the-rows-code-paid-books";
const SOLUTION = "SELECT id, amount\nFROM orders\nWHERE status = 'paid' AND item = 'Book';\n";
const STARTER = "SELECT id, amount\nFROM orders\nWHERE status = 'paid' OR item = 'Book';\n";

// The runner needs Python 3.12 with SQLite 3.39, as the SQL projects do.
const python = process.env["DISCERE_SQL_PYTHON"] ?? "python3";
const probe = spawnSync(
  python,
  ["-I", "-c", "import sys, sqlite3; print(sys.version_info >= (3, 12) and sqlite3.sqlite_version_info >= (3, 39))"],
  { encoding: "utf8", timeout: 15000 },
);
const runnable = probe.status === 0 && probe.stdout.trim() === "True";

const start = (sqlRuntime: SqlRuntime) =>
  createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0, sqlRuntime });
type App = Awaited<ReturnType<typeof createApp>>["app"];
const step = { courseId: course, lessonId: lesson, stepId: "write-paid-books" };
const check = (app: App, response: string, questionId = exercise, at = step, mode = "coach") =>
  app.inject({
    method: "POST",
    url: "/api/attempts",
    payload: { questionId, response, mode, lesson: at },
  });
const run = (app: App, code: string, questionId = exercise) =>
  app.inject({ method: "POST", url: `/api/questions/${questionId}/run`, payload: { code } });

/** A runtime that cannot start, as on a computer with no usable Python. */
const absent: SqlRuntime = {
  available: async () => false,
  execute: async (): Promise<SqlExecution> => ({ error: "runtime", message: "SQL practice is not set up." }),
};

describe("a lesson question answered with SQL where SQL cannot run", () => {
  it("says so, records nothing, and still lets the lesson finish", async () => {
    const { app, store } = await start(absent);
    try {
      expect((await app.inject({ url: "/api/sql-runtime" })).json()).toEqual({ ready: false });
      const refused = await check(app, SOLUTION);
      expect(refused.statusCode).toBe(503);
      expect(refused.json()).toMatchObject({ code: "SQL_UNAVAILABLE" });
      expect(store.hasQuestionEvidence(exercise, false)).toBe(false);
      expect(await finishLesson(app)).toMatchObject({ statusCode: 200 });
    } finally {
      await app.close();
    }
  });
});

/** Answers every step of the lesson that is not an SQL exercise, then asks to complete it. */
async function finishLesson(app: App) {
  const journey = (await app.inject({ url: `/api/courses/${course}/lessons/${lesson}/journey` })).json();
  const stage = journey.stages.find((item: { type: string }) => item.type === "explainer");
  for (const item of stage.steps) {
    const question = item.question;
    if (!question || question.code) continue;
    for (let turn = 0; turn < 4; turn += 1) {
      const response = question.choices
        ? question.choices[turn % question.choices.length].label
        : question.responseType === "numeric"
          ? "-987654"
          : "zzz";
      const marked = (
        await app.inject({
          method: "POST",
          url: "/api/attempts",
          payload: {
            questionId: question.id,
            response,
            mode: "coach",
            lesson: { courseId: course, lessonId: lesson, stepId: item.id },
          },
        })
      ).json();
      if (marked.correct || marked.closed) break;
    }
  }
  return app.inject({
    method: "PUT",
    url: `/api/courses/${course}/lessons/${lesson}/progress`,
    payload: { stageId: stage.id, state: "completed" },
  });
}

describe.skipIf(!runnable)("lesson questions answered with SQL", () => {
  it("sends the starter and the visible tables, and never the tests or the reference query", async () => {
    const { app } = await start(new IsolatedSqlRuntime(python));
    try {
      expect((await app.inject({ url: "/api/sql-runtime" })).json()).toEqual({ ready: true });
      const journey = await app.inject({ url: `/api/courses/${course}/lessons/${lesson}/journey` });
      expect(journey.statusCode).toBe(200);
      expect(journey.body).toContain('"language":"sql"');
      expect(journey.body).toContain("WHERE status = 'paid' OR item = 'Book'");
      // Table and column names with their types, and the rows Run uses.
      expect(journey.body).toContain('"name":"orders","columns":[{"name":"id","type":"INTEGER"}');
      expect(journey.body).toContain('[101,1,"Desk",80,"paid","2026-09-01"]');
      expect(journey.body).not.toContain("sqlCases");
      expect(journey.body).not.toContain("AND item = 'Book'");
      // A row of the hidden tables.
      expect(journey.body).not.toContain('"Chair"');
    } finally {
      await app.close();
    }
  });

  it("runs the query on the visible rows without marking it, and reports SQLite's own error", async () => {
    const { app, store } = await start(new IsolatedSqlRuntime(python));
    try {
      expect((await run(app, STARTER)).json()).toEqual({
        status: "ok",
        diagnostics: "",
        stdout: "",
        stderr: "",
        table: {
          columns: ["id", "amount"],
          rows: [
            [101, 80],
            [102, 20],
            [103, 80],
            [105, 20],
          ],
        },
      });
      expect((await run(app, "SELECT id, amount FROM orders WHERE statu = 'paid'")).json()).toMatchObject({
        status: "runtime_error",
        message: "no such column: statu",
      });
      expect(store.hasQuestionEvidence(exercise, false)).toBe(false);
    } finally {
      await app.close();
    }
  });

  it("runs one read-only statement against a fresh database each time", async () => {
    const { app } = await start(new IsolatedSqlRuntime(python));
    try {
      for (const write of [
        "DELETE FROM orders",
        "DROP TABLE orders",
        "INSERT INTO orders (id) VALUES (999)",
        "UPDATE orders SET amount = 0",
        "CREATE TABLE notes (body TEXT)",
        "ATTACH DATABASE 'other.db' AS other",
      ]) {
        const refused = (await run(app, write)).json();
        expect(refused.status, write).toBe("runtime_error");
        expect(refused.table, write).toBeUndefined();
      }
      expect((await run(app, "SELECT id FROM orders; SELECT id FROM orders")).json()).toMatchObject({
        status: "runtime_error",
        message: "Run one SELECT statement at a time.",
      });
      // Nothing an earlier run tried has changed the rows the next run reads.
      expect((await run(app, "SELECT COUNT(*) FROM orders")).json().table.rows).toEqual([[6]]);
      // A query that would take far too long is stopped at the time limit.
      const endless = (
        await run(
          app,
          "SELECT COUNT(*) FROM orders AS a, orders AS b, orders AS c, orders AS d, orders AS e, orders AS f, orders AS g, orders AS h, orders AS i, orders AS j",
        )
      ).json();
      expect(endless.status).toBe("limit");
    } finally {
      await app.close();
    }
  });

  it("shows at most fifty rows of a long result and says how many were left out", async () => {
    const long: SqlRuntime = {
      execute: async () => ({
        result: { columns: ["n"], rows: Array.from({ length: 120 }, (_, index) => [index]) },
      }),
    };
    const { app } = await start(long);
    try {
      const shown = (await run(app, "SELECT 1")).json();
      expect(shown.table.rows).toHaveLength(50);
      expect(shown.table.more).toBe(70);
    } finally {
      await app.close();
    }
  });

  it("says in plain words how a wrong result differs, without the reference query", async () => {
    const { app } = await start(new IsolatedSqlRuntime(python));
    try {
      const tooMany = (await check(app, STARTER)).json();
      expect(tooMany).toMatchObject({
        correct: false,
        qualifying: true,
        misses: 1,
        closed: false,
        codeRun: {
          status: "ok",
          passed: 0,
          total: 3,
          failed: { test: 1, given: "the rows shown", expected: "2 rows", actual: "4 rows" },
        },
      });
      expect(tooMany.feedback).toBe("With the rows shown, your query returned 4 rows and 2 were expected.");
      const otherValues = (
        await check(app, "SELECT id, id FROM orders WHERE status = 'paid' AND item = 'Book'")
      ).json();
      expect(otherValues.feedback).toBe(
        "With the rows shown, your query returned the row `(102, 102)`, which is not in the expected result. The expected result has `(102, 20)` instead.",
      );
      const oneColumn = (
        await check(app, "SELECT id FROM orders WHERE status = 'paid' AND item = 'Book'")
      ).json();
      expect(oneColumn.feedback).toBe(
        "With the rows shown, your query returned 1 column and 2 were expected.",
      );
      for (const marked of [tooMany, otherValues, oneColumn])
        expect(JSON.stringify(marked)).not.toContain("AND item = 'Book';");
    } finally {
      await app.close();
    }
  });

  it("fails a query written to the visible rows on the rows it cannot see", async () => {
    const { app } = await start(new IsolatedSqlRuntime(python));
    try {
      const fixed = (await check(app, "SELECT id, amount FROM orders WHERE id IN (102, 105)")).json();
      expect(fixed).toMatchObject({
        correct: false,
        qualifying: true,
        codeRun: {
          // The third set of rows has no paid Book, so returning nothing happens to be right there.
          passed: 2,
          total: 3,
          failed: { test: 2, given: "other rows in the same tables", expected: "1 row", actual: "0 rows" },
        },
      });
      expect(fixed.feedback).toBe(
        "With other rows in the same tables (test 2 of 3), your query returned 0 rows and 1 was expected.",
      );
      // The console still shows what the query returned from the rows on screen.
      expect(fixed.codeRun.table.rows).toEqual([
        [102, 20],
        [105, 20],
      ]);
    } finally {
      await app.close();
    }
  });

  it("does not count a query SQLite refuses as a wrong answer, and accepts the reference query", async () => {
    const { app } = await start(new IsolatedSqlRuntime(python));
    try {
      const refused = (await check(app, "SELECT id, amount FROM orders WHERE statu = 'paid'")).json();
      expect(refused).toMatchObject({
        correct: false,
        qualifying: false,
        misses: 0,
        codeRun: { status: "runtime_error", message: "no such column: statu" },
      });
      expect(refused.feedback).toBe(
        "SQLite could not run the query. The console shows what it said. An error is not counted as a wrong answer.",
      );
      // Any query that returns the same rows passes: column names and row order are not compared here.
      const right = (
        await check(
          app,
          "select o.id as order_id, o.amount as cost from orders as o where o.item = 'Book' and o.status = 'paid' order by o.id desc",
        )
      ).json();
      expect(right).toMatchObject({ correct: true, misses: 0, codeRun: { passed: 3, total: 3 } });
      expect(right.codeRun.failed).toBeUndefined();
      expect(right.feedback).toBe("It returns the expected rows in all 3 tests.");
    } finally {
      await app.close();
    }
  });

  it("compares row order only where the prompt asks for one, and headings only in the lesson on aliases", async () => {
    const { app } = await start(new IsolatedSqlRuntime(python));
    try {
      const ordered = (
        await check(app, "SELECT id, item FROM orders ORDER BY id", "sql-sort-and-limit-code-newest-first", {
          courseId: course,
          lessonId: "sort-and-limit",
          stepId: "write-newest-first",
        })
      ).json();
      expect(ordered.feedback).toBe(
        "With the rows shown, your query returned the right rows in a different order. Row 1 should be `(106, 'Lamp')` and yours is `(101, 'Desk')`.",
      );
      const at = { courseId: course, lessonId: "select-and-name", stepId: "write-a-heading" };
      const heading = (
        await check(app, "SELECT id, amount FROM orders", "sql-select-and-name-code-price-heading", at)
      ).json();
      expect(heading.feedback).toBe(
        "With the rows shown, column 2 is headed `amount` and the heading `price` was expected.",
      );
      expect(
        (await check(app, "SELECT id, amount AS price FROM orders", "sql-select-and-name-code-price-heading", at)).json(),
      ).toMatchObject({ correct: true });
    } finally {
      await app.close();
    }
  });

  it("never closes a query for wrong results, and shows the reference query only on request", async () => {
    const { app, store } = await start(new IsolatedSqlRuntime(python));
    try {
      for (let turn = 1; turn <= 3; turn += 1) {
        const wrong = (await check(app, STARTER + "-- try " + turn + "\n")).json();
        expect(wrong).toMatchObject({ correct: false, closed: false, misses: turn });
        expect(wrong.allowedMisses).toBeUndefined();
      }
      const attemptId = (await check(app, STARTER)).json().attemptId;
      const shown = await app.inject({
        method: "POST",
        url: `/api/attempts/${attemptId}/lesson-feedback`,
        payload: step,
      });
      expect(shown.statusCode).toBe(200);
      expect(shown.json()).toMatchObject({ correct: false, reviewRequired: true });
      expect(shown.json().answer).toBe(SOLUTION);
      expect(store.questionCards()).toMatchObject([{ questionId: exercise }]);
    } finally {
      await app.close();
    }
  });

  it("requires the exercise before the lesson can be completed where SQL can run", async () => {
    const { app } = await start(new IsolatedSqlRuntime(python));
    try {
      const finished = await finishLesson(app);
      expect(finished.statusCode).toBe(409);
      expect(finished.json()).toMatchObject({
        code: "STAGE_NEEDS_RESPONSE",
        detail: "step:write-more-than-twenty",
      });
    } finally {
      await app.close();
    }
  });

  it("passes every reference query and fails every starter, through the app's runner", async () => {
    const runtime = new IsolatedSqlRuntime(python);
    const { app, content } = await start(runtime);
    try {
      const exercises = content
        .bundle(course)!
        .questions.filter((question) => question.code?.language === "sql");
      // Three in each of the 15 lessons.
      expect(exercises.length).toBe(45);
      const tables = new Set<string>();
      // Four at a time, which is as many queries as the runner takes at once.
      for (let at = 0; at < exercises.length; at += 4)
        await Promise.all(
          exercises.slice(at, at + 4).map(async (question) => {
            const task = sqlTask(question)!;
            for (const table of question.sqlCases![0]!.tables as SqlTable[]) tables.add(table.name);
            const reference =
              question.answerAuthority.kind === "text" ? question.answerAuthority.exampleAnswer : "";
            const solved = await assessSql(runtime, task, reference);
            expect(solved.correct, question.id + ": " + solved.feedback).toBe(true);
            const started = await assessSql(runtime, task, question.code!.starter);
            expect(started.correct, question.id).toBe(false);
          }),
        );
      // One small dataset for the whole course.
      expect([...tables].sort()).toEqual(["customers", "orders"]);
    } finally {
      await app.close();
    }
  }, 600000);
});
