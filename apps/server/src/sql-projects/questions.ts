import {
  type Question,
  type RustTaskRun,
  RustTaskRunSchema,
  type SqlCase,
  type SqlExerciseTarget,
  type SqlResult,
  judgeSqlResult,
} from "@discere/contracts";
import { HttpError } from "../errors.js";
import type { SqlExecution, SqlRuntime } from "./runtime.js";

/** A lesson question answered by writing a query: how its result is compared, and its tests. */
export interface SqlQuestionTask {
  target: SqlExerciseTarget;
  cases: SqlCase[];
}

export function sqlTask(question: Question): SqlQuestionTask | undefined {
  if (question.code?.language !== "sql" || !question.sqlCases) return undefined;
  return {
    target: {
      ordered: question.code.ordered,
      ...(question.code.namedColumns ? { namedColumns: true } : {}),
    },
    cases: question.sqlCases,
  };
}

/** True when the runtime can run a query now. A runtime that cannot say is taken to be ready. */
export async function sqlReady(runtime: SqlRuntime | undefined): Promise<boolean> {
  if (!runtime) return false;
  return runtime.available ? runtime.available() : true;
}

/** Run shows at most this many rows; the runner itself refuses a result of more than 200. */
const SHOWN_ROWS = 50;

function shown(result: SqlResult): NonNullable<RustTaskRun["table"]> {
  const more = result.rows.length - SHOWN_ROWS;
  return {
    columns: result.columns,
    rows: result.rows.slice(0, SHOWN_ROWS),
    ...(more > 0 ? { more } : {}),
  };
}

function failedRun(error: Extract<SqlExecution, { error: string }>) {
  return {
    status:
      error.error === "query"
        ? ("runtime_error" as const)
        : error.error === "limit"
          ? ("limit" as const)
          : ("unavailable" as const),
    diagnostics: "",
    stdout: "",
    stderr: "",
    message: error.message,
  };
}

/** Run, without marking: the query against the visible tables, with the rows it returns. */
export async function runSqlExample(
  runtime: SqlRuntime,
  task: SqlQuestionTask,
  query: string,
): Promise<RustTaskRun> {
  const executed = await runtime.execute(query, task.cases[0]!.tables);
  return RustTaskRunSchema.parse(
    "error" in executed
      ? failedRun(executed)
      : { status: "ok", diagnostics: "", stdout: "", stderr: "", table: shown(executed.result) },
  );
}

export interface SqlAssessment {
  correct: boolean;
  feedback: string;
  run: RustTaskRun;
  /** False when SQLite refused the query: that is something to fix, not a wrong answer. */
  qualifying: boolean;
}

/**
 * Marks a query by running it against every case, each in a fresh database, and comparing the
 * rows it returns with the stored rows. The verdict is about the first case that differs and
 * says what differs in plain words. The reference query is never part of it.
 */
export async function assessSql(
  runtime: SqlRuntime,
  task: SqlQuestionTask,
  query: string,
): Promise<SqlAssessment> {
  const total = task.cases.length;
  const where = (index: number) =>
    index === 0
      ? "With the rows shown"
      : `With other rows in the same tables (test ${index + 1} of ${total})`;
  let passed = 0;
  let table: RustTaskRun["table"];
  let failed: RustTaskRun["failed"];
  let difference = "";
  for (const [index, item] of task.cases.entries()) {
    const executed = await runtime.execute(query, item.tables);
    if ("error" in executed) {
      if (executed.error === "runtime") throw new HttpError(503, executed.message, "SQL_UNAVAILABLE");
      const run = RustTaskRunSchema.parse({ ...failedRun(executed), passed, total });
      return {
        correct: false,
        qualifying: false,
        run,
        feedback:
          executed.error === "limit"
            ? executed.message
            : (index === 0 ? "SQLite could not run the query" : where(index) + ", SQLite could not run the query") +
              ". The console shows what it said. An error is not counted as a wrong answer.",
      };
    }
    if (index === 0) table = shown(executed.result);
    const verdict = judgeSqlResult(task.target, item.expected, executed.result);
    if (verdict.passed) passed += 1;
    else if (!failed) {
      failed = {
        test: index + 1,
        given: index === 0 ? "the rows shown" : "other rows in the same tables",
        expected: verdict.expected!,
        actual: verdict.actual!,
      };
      difference =
        where(index) + ", " + verdict.difference!.charAt(0).toLowerCase() + verdict.difference!.slice(1);
    }
  }
  const run = RustTaskRunSchema.parse({
    status: "ok",
    diagnostics: "",
    stdout: "",
    stderr: "",
    passed,
    total,
    ...(table ? { table } : {}),
    ...(failed ? { failed } : {}),
  });
  return {
    correct: !failed,
    qualifying: true,
    run,
    feedback: failed ? difference : `It returns the expected rows in all ${total} tests.`,
  };
}
