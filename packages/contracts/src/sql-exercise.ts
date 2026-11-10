import { z } from "zod";
import {
  SqlQuerySchema,
  type SqlResult,
  SqlResultSchema,
  type SqlTable,
  SqlTablesSchema,
} from "./sql-project.js";

/**
 * A lesson question answered by writing one SQL query. The learner sees `tables`, the rows the
 * query runs against when they press Run. Marking runs the query against every case in
 * `Question.sqlCases` (the visible tables first, then tables with other rows) and compares the
 * rows it returns with the stored result.
 */
export const SqlExerciseSchema = z
  .object({
    language: z.literal("sql"),
    starter: SqlQuerySchema.min(1),
    tables: SqlTablesSchema,
    /** True when the prompt asks for an order, so the rows are compared in sequence. */
    ordered: z.boolean(),
    /** True when the lesson is about headings, so the column names are compared too. */
    namedColumns: z.boolean().optional(),
  })
  .strict();
export type SqlExercise = z.infer<typeof SqlExerciseSchema>;

export const SqlCaseSchema = z
  .object({ tables: SqlTablesSchema, expected: SqlResultSchema })
  .strict();
export type SqlCase = z.infer<typeof SqlCaseSchema>;

/** What a result is compared on. */
export type SqlExerciseTarget = Pick<SqlExercise, "ordered" | "namedColumns">;

type Cell = SqlResult["rows"][number][number];
type Row = SqlResult["rows"][number];

/** A value written the way SQL writes it: text in single quotes, a missing value as NULL. */
export function sqlLiteral(value: Cell): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return "'" + value.replace(/'/gu, "''") + "'";
}

/** One row as a learner would read it: `(101, 'Desk', 80)`. */
export function sqlRowText(row: Row): string {
  return "(" + row.map(sqlLiteral).join(", ") + ")";
}

/** Numbers compare within 1e-9, so an average of 48.0 matches 48. NULL equals only NULL. */
function sameCell(a: Cell, b: Cell): boolean {
  return typeof a === "number" && typeof b === "number"
    ? Math.abs(a - b) <= Math.max(1e-9, 1e-9 * Math.abs(b))
    : a === b;
}
const sameRow = (a: Row, b: Row) =>
  a.length === b.length && a.every((value, index) => sameCell(value, b[index] ?? null));

export interface SqlVerdict {
  passed: boolean;
  /** One sentence in plain words saying how the result differs. Absent on a pass. */
  difference?: string;
  /** The expected and returned thing the sentence is about, for the console. */
  expected?: string;
  actual?: string;
}

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/**
 * Compares the rows a query returned with the expected rows. Column count and values always
 * count; row order only for an ordered exercise; headings only when the exercise names them.
 * The verdict says what differs without ever showing the reference query.
 */
export function judgeSqlResult(
  target: SqlExerciseTarget,
  expected: SqlResult,
  actual: SqlResult,
): SqlVerdict {
  if (actual.columns.length !== expected.columns.length)
    return {
      passed: false,
      difference: `Your query returned ${count(actual.columns.length, "column")} and ${
        expected.columns.length
      } ${expected.columns.length === 1 ? "was" : "were"} expected.`,
      expected: count(expected.columns.length, "column"),
      actual: count(actual.columns.length, "column"),
    };
  if (target.namedColumns) {
    const at = expected.columns.findIndex((name, index) => name !== actual.columns[index]);
    if (at >= 0)
      return {
        passed: false,
        difference: `Column ${at + 1} is headed \`${actual.columns[at]}\` and the heading \`${
          expected.columns[at]
        }\` was expected.`,
        expected: expected.columns.join(", "),
        actual: actual.columns.join(", "),
      };
  }
  if (actual.rows.length !== expected.rows.length)
    return {
      passed: false,
      difference: `Your query returned ${count(actual.rows.length, "row")} and ${
        expected.rows.length
      } ${expected.rows.length === 1 ? "was" : "were"} expected.`,
      expected: count(expected.rows.length, "row"),
      actual: count(actual.rows.length, "row"),
    };
  // Compared as bags first, so a result that is only out of order is told apart from a wrong one.
  const missing = [...expected.rows];
  let extra: Row | undefined;
  for (const row of actual.rows) {
    const at = missing.findIndex((item) => sameRow(row, item));
    if (at >= 0) missing.splice(at, 1);
    else extra ??= row;
  }
  if (extra && missing[0])
    return {
      passed: false,
      difference: `Your query returned the row \`${sqlRowText(extra)}\`, which is not in the expected result. The expected result has \`${sqlRowText(missing[0])}\` instead.`,
      expected: sqlRowText(missing[0]),
      actual: sqlRowText(extra),
    };
  if (!target.ordered) return { passed: true };
  const at = expected.rows.findIndex((row, index) => !sameRow(row, actual.rows[index] ?? []));
  if (at < 0) return { passed: true };
  return {
    passed: false,
    difference: `Your query returned the right rows in a different order. Row ${at + 1} should be \`${sqlRowText(
      expected.rows[at]!,
    )}\` and yours is \`${sqlRowText(actual.rows[at]!)}\`.`,
    expected: `row ${at + 1}: ${sqlRowText(expected.rows[at]!)}`,
    actual: `row ${at + 1}: ${sqlRowText(actual.rows[at]!)}`,
  };
}

const shape = (tables: SqlTable[]) => JSON.stringify(tables.map((t) => [t.name, t.columns]));

/**
 * Shape rules shared by the content validator and the server: the visible tables are the first
 * case, every case uses the same table and column names, and no two cases hold the same rows.
 */
export function sqlExerciseIssues(exercise: SqlExercise, cases: SqlCase[]): string[] {
  const issues: string[] = [];
  if (JSON.stringify(exercise.tables) !== JSON.stringify(cases[0]?.tables))
    issues.push("The visible tables must be the first case.");
  if (cases.some((item) => shape(item.tables) !== shape(exercise.tables)))
    issues.push("Every case uses the tables and columns the learner is shown.");
  if (new Set(cases.map((item) => JSON.stringify(item.tables))).size !== cases.length)
    issues.push("Each case needs different rows.");
  if (cases.some((item) => item.expected.columns.length !== cases[0]!.expected.columns.length))
    issues.push("Every case expects the same number of columns.");
  return issues;
}
