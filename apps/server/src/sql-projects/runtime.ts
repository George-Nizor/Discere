import { spawn } from "node:child_process";
import path from "node:path";
import {
  SqlQuerySchema,
  SqlResultSchema,
  SqlTablesSchema,
  type SqlResult,
  type SqlTable,
} from "@discere/contracts";
import { z } from "zod";

const OutputSchema = z.union([
  z.object({ result: SqlResultSchema }).strict(),
  z.object({ error: z.enum(["query", "limit", "runtime"]), message: z.string().max(500) }).strict(),
]);
export type SqlExecution = z.infer<typeof OutputSchema>;
export interface SqlRuntime {
  execute(query: string, tables: SqlTable[]): Promise<SqlExecution>;
}
const runtimeFailure = (): SqlExecution => ({
  error: "runtime",
  message:
    "SQL practice needs an available Python 3.12+ interpreter with SQLite 3.39+. Set DISCERE_SQL_PYTHON on the server.",
});
/** One bounded child process per query. It receives only reviewed input tables and learner SQL. */
export class IsolatedSqlRuntime implements SqlRuntime {
  private active = 0;
  constructor(
    private readonly executable = process.env["DISCERE_SQL_PYTHON"] ??
      (process.platform === "win32" ? "python" : "python3"),
  ) {}
  execute(query: string, tables: SqlTable[]): Promise<SqlExecution> {
    SqlQuerySchema.parse(query);
    SqlTablesSchema.parse(tables);
    if (this.active >= 4)
      return Promise.resolve({
        error: "runtime",
        message: "SQL practice is busy. Try again in a moment.",
      });
    this.active += 1;
    return new Promise((resolve) => {
      const env: NodeJS.ProcessEnv = {};
      for (const key of ["PATH", "SystemRoot", "WINDIR", "SYSTEMDRIVE"])
        if (process.env[key]) env[key] = process.env[key];
      const child = spawn(
        this.executable,
        ["-I", "-S", "-B", path.join(import.meta.dirname, "runner.py")],
        {
          shell: false,
          windowsHide: true,
          env,
          stdio: ["pipe", "pipe", "ignore"],
        },
      );
      let output = "",
        finished = false;
      const finish = (result: SqlExecution) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(result);
      };
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish({
          error: "limit",
          message: "This query took too long. Check for a repeated join or an unbounded recursion.",
        });
      }, 3000);
      child.once("error", () => finish(runtimeFailure()));
      child.once("close", () => {
        this.active -= 1;
        if (finished) return;
        try {
          finish(OutputSchema.parse(JSON.parse(output)));
        } catch {
          finish(runtimeFailure());
        }
      });
      child.stdout.on("data", (data: Buffer) => {
        output += data.toString("utf8");
        if (output.length > 262144) {
          child.kill("SIGKILL");
          finish({
            error: "limit",
            message: "The result is too large. Return only the requested columns and rows.",
          });
        }
      });
      child.stdin.on("error", () => {});
      child.stdin.end(JSON.stringify({ query, tables }));
    });
  }
}
const cellEqual = (a: SqlResult["rows"][number][number], b: SqlResult["rows"][number][number]) =>
  typeof a === "number" && typeof b === "number"
    ? Math.abs(a - b) <= Math.max(1e-9, 1e-9 * Math.abs(b))
    : a === b;
/** Unordered results are bags, preserving repeated rows. NULL is different from the text "NULL". */
export function sameSqlResult(actual: SqlResult, expected: SqlResult, ordered: boolean): boolean {
  if (
    JSON.stringify(actual.columns) !== JSON.stringify(expected.columns) ||
    actual.rows.length !== expected.rows.length
  )
    return false;
  const rowEqual = (a: SqlResult["rows"][number], b: SqlResult["rows"][number]) =>
    a.length === b.length && a.every((v, i) => cellEqual(v, b[i] ?? null));
  if (ordered) return actual.rows.every((r, i) => rowEqual(r, expected.rows[i] ?? []));
  const remaining = [...expected.rows];
  for (const row of actual.rows) {
    const at = remaining.findIndex((r) => rowEqual(row, r));
    if (at < 0) return false;
    remaining.splice(at, 1);
  }
  return true;
}
