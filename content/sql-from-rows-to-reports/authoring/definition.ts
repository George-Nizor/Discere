import type { Question, CourseBundle } from "../../../packages/contracts/src/index.js";
export type Cell = string | number | null;
export interface InputTable {
  name: string;
  columns: string[];
  rows: Cell[][];
}
export interface QueryCase {
  inputs: InputTable[];
  queries: Array<{ label: string; sql: string }>;
}
export interface SqlLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceId: string;
  beats: Array<{ title: string; text: string; diagram: QueryCase; sourceId?: string }>;
  questions: Array<Omit<Question, "id" | "conceptIds" | "sourceIds"> & { sourceId?: string }>;
  cards: Array<{
    front: string;
    back: string;
    answerAuthority: Question["answerAuthority"];
    sourceId?: string;
  }>;
}
export const tables: InputTable[] = [
  {
    name: "customers",
    columns: ["id", "name", "region"],
    rows: [
      [1, "Ada", "North"],
      [2, "Ben", "South"],
      [3, "Cy", "North"],
      [4, "Dee", "West"],
    ],
  },
  {
    name: "orders",
    columns: ["id", "customer_id", "item", "amount", "status", "day"],
    rows: [
      [101, 1, "Desk", 80, "paid", "2026-09-01"],
      [102, 1, "Book", 20, "paid", "2026-09-02"],
      [103, 2, "Desk", 80, "paid", "2026-09-02"],
      [104, 2, "Lamp", 40, "pending", "2026-09-03"],
      [105, 3, "Book", 20, "paid", "2026-09-03"],
      [106, 3, "Lamp", null, "pending", "2026-09-04"],
    ],
  },
];
export function demo(
  queries: Array<[string, string]>,
  names = ["orders"],
  data = tables,
): QueryCase {
  return {
    inputs: names.map((name) => {
      const table = data.find((table) => table.name === name);
      if (!table) throw new Error("Missing demonstration table " + name);
      return table;
    }),
    queries: queries.map(([label, sql]) => ({ label, sql })),
  };
}
export function extraCustomer(): InputTable[] {
  return tables.map((table) =>
    table.name === "customers" ? { ...table, rows: [...table.rows, [5, "Elm", "North"]] } : table,
  );
}
export function number(
  prompt: string,
  value: number,
  workedAnswer: string,
  hints: string[],
  sourceId?: string,
) {
  return {
    prompt,
    responseType: "numeric" as const,
    difficulty: 1,
    hints,
    ...(sourceId ? { sourceId } : {}),
    answerAuthority: {
      kind: "numeric" as const,
      value,
      unit: "",
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer,
    },
  };
}
export function choose(
  prompt: string,
  labels: string[],
  correct: number,
  hint: string,
  sourceId?: string,
) {
  return {
    prompt,
    responseType: "short_text" as const,
    difficulty: 1,
    hints: [hint],
    ...(sourceId ? { sourceId } : {}),
    choices: labels.map((label, index) => ({ id: String.fromCharCode(97 + index), label })),
    answerAuthority: {
      kind: "text" as const,
      acceptedIdeas: [labels[correct]!],
      rejectedIdeas: [],
      exampleAnswer: labels[correct]!,
    },
  };
}
export function termQuestion(prompt: string, term: string, hint: string, sourceId?: string) {
  return {
    prompt,
    responseType: "short_text" as const,
    difficulty: 1,
    hints: [hint],
    ...(sourceId ? { sourceId } : {}),
    answerAuthority: {
      kind: "text" as const,
      acceptedIdeas: [term],
      rejectedIdeas: [],
      exampleAnswer: term,
    },
  };
}
export function numericCard(front: string, value: number, back: string) {
  return {
    front,
    back,
    answerAuthority: {
      kind: "numeric" as const,
      value,
      unit: "",
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer: back,
    },
  };
}
export function termCard(front: string, term: string, back: string, sourceId?: string) {
  return {
    front,
    back,
    ...(sourceId ? { sourceId } : {}),
    answerAuthority: {
      kind: "text" as const,
      acceptedIdeas: [term],
      rejectedIdeas: [],
      exampleAnswer: back,
    },
  };
}
const base = {
  publisher: "SQLite Project",
  accessedAt: "2026-10-01",
  licence: "Public domain",
  licenceUrl: "https://www.sqlite.org/copyright.html",
  reuse: "reference_only" as const,
  edition: "SQLite web documentation, accessed October 2026",
  attribution: "SQLite Project, official SQL language documentation.",
  notes:
    "Definitions checked against the official documentation. Discere datasets, teaching prose, queries and diagrams are original. All displayed results are executed in an isolated in-memory SQLite database during authoring and independently checked before publication.",
};
export const sources: CourseBundle["sources"] = [
  {
    ...base,
    id: "sqlite-tables",
    title: "CREATE TABLE",
    url: "https://www.sqlite.org/lang_createtable.html",
    section: "3: Column Definitions; 3.5 PRIMARY KEY constraints; 3.7 FOREIGN KEY constraints",
  },
  {
    ...base,
    id: "sqlite-select",
    title: "SELECT",
    url: "https://www.sqlite.org/lang_select.html",
    section:
      "2: Simple Select Processing; 2.1 FROM and joins; 2.3 WHERE; 2.4 grouping; 2.6 DISTINCT; 3 compound queries; 4 ORDER BY; 5 LIMIT",
  },
  {
    ...base,
    id: "sqlite-expr",
    title: "SQL Language Expressions",
    url: "https://www.sqlite.org/lang_expr.html",
    section: "2: Operators; 5 LIKE; 6 BETWEEN; 7 CASE; 8 IN and NOT IN; 10 EXISTS; 11 subqueries",
  },
  {
    ...base,
    id: "sqlite-aggregate",
    title: "Built-in Aggregate Functions",
    url: "https://www.sqlite.org/lang_aggfunc.html",
    section: "Descriptions of avg(X), count(X), count(*), min(X), max(X) and sum(X)",
  },
  {
    ...base,
    id: "sqlite-window",
    title: "Window Functions",
    url: "https://www.sqlite.org/windowfunctions.html",
    section:
      "2: Aggregate Window Functions; 2.1 PARTITION BY; 2.2 Frame Specifications; 3 Built-in Window Functions",
  },
];
