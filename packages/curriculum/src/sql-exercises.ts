import { spawnSync } from "node:child_process";
import { type CourseBundle, type SqlResult, judgeSqlResult } from "@discere/contracts";

/**
 * Runs every SQL exercise of a bundle the way the app marks it: the reference query must return
 * the expected rows from every case's tables, and the starter must fail at least one case. The
 * app runs a learner's query in its bounded runner (apps/server/src/sql-projects/runner.py);
 * authored queries are trusted, so this check uses the SQLite inside whatever Python 3 is on
 * the machine. Each query gets a fresh in-memory database built from its case's tables.
 */
const HARNESS = String.raw`
import json, sqlite3, sys

def run(job):
    db = sqlite3.connect(":memory:")
    try:
        for table in job["tables"]:
            cols = ", ".join('"' + c["name"] + '" ' + c["type"] for c in table["columns"])
            db.execute('CREATE TABLE "' + table["name"] + '" (' + cols + ')')
            marks = ", ".join("?" for _ in table["columns"])
            db.executemany('INSERT INTO "' + table["name"] + '" VALUES (' + marks + ')', table["rows"])
        db.commit()
        db.execute("PRAGMA query_only = ON")
        cursor = db.execute(job["query"])
        if cursor.description is None:
            return {"error": "The query returns no table."}
        return {"result": {"columns": [c[0] for c in cursor.description], "rows": cursor.fetchall()}}
    except Exception as error:
        return {"error": str(error)[:300] or "error"}
    finally:
        db.close()

print(json.dumps({"sqlite": sqlite3.sqlite_version_info[:2], "runs": [run(job) for job in json.load(sys.stdin)]}))
`;

type Ran = { result: SqlResult } | { error: string };

export interface SqlExerciseReport {
  /** How many SQL exercises the bundle holds. */
  exercises: number;
  /** One line per fault; empty when every reference query matches and no starter does. */
  issues: string[];
}

export function checkSqlExercises(bundle: CourseBundle, python: string): SqlExerciseReport {
  const exercises = bundle.questions.flatMap((question) =>
    question.code?.language === "sql" && question.sqlCases
      ? [{ question, code: question.code, cases: question.sqlCases }]
      : [],
  );
  if (exercises.length === 0) return { exercises: 0, issues: [] };
  const jobs = exercises.flatMap(({ question, code, cases }) =>
    [
      question.answerAuthority.kind === "text" ? question.answerAuthority.exampleAnswer : "",
      code.starter,
    ].flatMap((query) => cases.map((item) => ({ query, tables: item.tables }))),
  );
  const ran = spawnSync(python, ["-I", "-c", HARNESS], {
    input: JSON.stringify(jobs),
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (ran.status !== 0)
    return {
      exercises: exercises.length,
      issues: [
        `SQLite could not run the exercises: ${ran.error?.message ?? ran.stderr.slice(0, 400)}`,
      ],
    };
  const output = JSON.parse(ran.stdout) as { sqlite: [number, number]; runs: Ran[] };
  // RIGHT and FULL OUTER JOIN arrived in SQLite 3.39, which is also what the app's runner needs.
  if (output.sqlite[0] < 3 || (output.sqlite[0] === 3 && output.sqlite[1] < 39))
    return {
      exercises: exercises.length,
      issues: [`The exercises need SQLite 3.39 or later; this Python has ${output.sqlite.join(".")}.`],
    };
  const issues: string[] = [];
  let at = 0;
  for (const { question, code, cases } of exercises) {
    const solved = cases.map(() => output.runs[at++]!);
    const started = cases.map(() => output.runs[at++]!);
    solved.forEach((run, index) => {
      const fault =
        "error" in run
          ? run.error
          : judgeSqlResult({ ...code, namedColumns: true }, cases[index]!.expected, run.result)
              .difference;
      if (fault)
        issues.push(`${question.id}: the reference query fails test ${index + 1}: ${fault}`);
    });
    if (
      started.every(
        (run, index) =>
          "result" in run && judgeSqlResult(code, cases[index]!.expected, run.result).passed,
      )
    )
      issues.push(`${question.id}: the starter query already passes every test`);
  }
  return { exercises: exercises.length, issues };
}
