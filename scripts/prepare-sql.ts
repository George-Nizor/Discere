import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { bundleDigest, validateCourseBundle } from "@discere/curriculum";
import { LearningDiagramSchema, TopicMapSchema } from "../packages/contracts/src/index.js";
import { numericLastHints } from "../content/sql-from-rows-to-reports/authoring/hints.js";
import {
  sources,
  type QueryCase,
} from "../content/sql-from-rows-to-reports/authoring/definition.js";
import { readingLessons } from "../content/sql-from-rows-to-reports/authoring/reading-lessons.js";
import { summaryLessons } from "../content/sql-from-rows-to-reports/authoring/summary-lessons.js";
import { combiningLessons } from "../content/sql-from-rows-to-reports/authoring/combining-lessons.js";
import { windowLessons } from "../content/sql-from-rows-to-reports/authoring/window-lessons.js";

const root = path.resolve(import.meta.dirname, "..");
const Database = createRequire(path.join(root, "apps/server/package.json"))("better-sqlite3");
const definitions = [...readingLessons, ...summaryLessons, ...combiningLessons, ...windowLessons];
const courseId = "sql-from-rows-to-reports";
function identifier(value: string) {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) throw new Error("Invalid authored SQL identifier");
  return '"' + value + '"';
}
function diagram(example: QueryCase) {
  const db = new Database(":memory:");
  try {
    for (const table of example.inputs) {
      const columns = table.columns.map(
        (column) =>
          identifier(column) +
          (column === "id"
            ? " INTEGER PRIMARY KEY"
            : column === "customer_id"
              ? " INTEGER"
              : column === "amount"
                ? " REAL"
                : " TEXT"),
      );
      db.exec("CREATE TABLE " + identifier(table.name) + " (" + columns.join(", ") + ");");
      const insert = db.prepare(
        "INSERT INTO " +
          identifier(table.name) +
          " VALUES (" +
          table.columns.map(() => "?").join(", ") +
          ")",
      );
      for (const row of table.rows) insert.run(...row);
    }
    return LearningDiagramSchema.parse({
      type: "relational_query",
      inputs: example.inputs.map((table) => ({
        ...table,
        rows: table.rows.map((cells, index) => ({ id: table.name + "-" + index, cells })),
      })),
      queries: example.queries.map((query, index) => {
        const statement = db.prepare(query.sql);
        if (!statement.reader || !/^SELECT\s/i.test(query.sql))
          throw new Error("A teaching comparison must only select data");
        return {
          id: "query-" + index,
          label: query.label,
          sql: query.sql,
          result: {
            name: "Result",
            columns: statement.columns().map((column: { name: string }) => column.name),
            rows: statement
              .raw()
              .all()
              .map((cells: unknown[], rowIndex: number) => ({ id: "result-" + rowIndex, cells })),
          },
        };
      }),
      initialQueryId: "query-0",
    });
  } finally {
    db.close();
  }
}
const concepts = definitions.map((lesson, index) => ({
  id: "sql-" + lesson.id,
  moduleId: lesson.moduleId,
  title: lesson.title,
  summary: lesson.summary,
  prerequisiteIds: index > 0 ? ["sql-" + definitions[index - 1]!.id] : [],
  misconceptionIds: [],
  assuranceLevel: "source_backed",
}));
const lessons = definitions.map((definition) => ({
  id: definition.id,
  courseId,
  conceptIds: ["sql-" + definition.id],
  title: definition.title,
  steps: definition.beats.map((beat, index) => ({
    id: ["predict", "work", "check", "transfer"][index]!,
    kind: ["hook", "worked_example", "check", "transfer"][index]!,
    blocks: [
      { kind: "heading", text: beat.title },
      { kind: "paragraph", text: beat.text },
    ],
    visualStateId: "",
    checkQuestionId: "sql-" + definition.id + "-" + (index + 1),
    activityId: "",
    diagram: diagram(beat.diagram),
  })),
  orientation: definition.summary,
  visualStates: [],
  visualKind: "none",
  activityId: "",
  questionIds: [5, 6].map((index) => "sql-" + definition.id + "-" + index),
  flashcardIds: [1, 2].map((index) => "sql-" + definition.id + "-card-" + index),
  reviewLabel: definition.title,
  nextAction: "Apply the idea to the next query.",
  stageTitles: {
    quiz: "Use the idea",
    review: "Recall it later",
    completion: "Ready for the next idea",
  },
  sourceIds: [
    ...new Set([
      definition.sourceId,
      ...definition.beats.map((beat) => beat.sourceId ?? definition.sourceId),
      ...definition.questions.map((question) => question.sourceId ?? definition.sourceId),
    ]),
  ],
  assuranceLevel: "source_backed",
}));
const questions = definitions.flatMap((lesson) =>
  lesson.questions.map(({ sourceId, ...question }, index) => ({
    ...question,
    id: "sql-" + lesson.id + "-" + (index + 1),
    hints:
      question.responseType === "numeric"
        ? [...question.hints, numericLastHints[lesson.id + "-" + (index + 1)]!]
        : question.hints,
    conceptIds: ["sql-" + lesson.id],
    sourceIds: [sourceId ?? lesson.sourceId],
  })),
);
const flashcards = definitions.flatMap((lesson) =>
  lesson.cards.map(({ sourceId, ...card }, index) => ({
    ...card,
    id: "sql-" + lesson.id + "-card-" + (index + 1),
    conceptIds: ["sql-" + lesson.id],
    sourceIds: [sourceId ?? lesson.sourceId],
  })),
);
const exactSections: Record<string, string> = {
  "select-and-name":
    "SELECT 2.4: result-column expressions and aliases; SQL Expressions 2: arithmetic and NULL",
  "filter-the-rows": "SQL Expressions 2: comparisons and NULL; 5: LIKE; 6: BETWEEN; 8: IN",
  "sort-and-limit": "SELECT 4: ORDER BY and ties; 5: LIMIT",
  "distinct-results":
    "SELECT 2.6: duplicate rows and NULL; Aggregate Functions: count(X), count(*) and DISTINCT",
  "aggregate-known-values":
    "Aggregate Functions: avg(X), count(X), count(*), min(X), max(X), sum(X)",
  "group-and-filter-groups": "SELECT 2.4: grouping, HAVING and result rows",
  "join-matching-rows": "SELECT 2.1: matching rows and cross products",
  "preserve-the-left-table":
    "SELECT 2.1: outer joins; 2.3: WHERE filtering after outer-join NULL rows",
  "preserve-either-side": "SELECT 2.1: RIGHT and FULL outer-join unmatched rows",
  "ask-a-query-inside-a-query":
    "SQL Expressions 8: IN; 10: EXISTS; 11: scalar subqueries; 12: correlated subqueries",
  "combine-result-sets": "SELECT 3: compound queries, UNION and UNION ALL; 4: ORDER BY; 5: LIMIT",
  "rank-with-ties": "Window Functions 3: row_number(), rank(), dense_rank() and peer ordering",
  "partition-the-window": "Window Functions 2.1: PARTITION BY; 3: row_number(), ntile()",
  "running-totals-and-neighbours": "Window Functions 2.2: ROWS and RANGE frames; 3: lag(), lead()",
};
const authoringMetadata = definitions.map((lesson, index) => {
  const cited = (
    targetKind: "step" | "question" | "flashcard",
    targetId: string,
    claim: string,
    sourceId: string,
  ) => ({
    claim,
    sourceId,
    section:
      sourceId === lesson.sourceId
        ? (exactSections[lesson.id] ?? sources.find((source) => source.id === sourceId)!.section!)
        : sources.find((source) => source.id === sourceId)!.section!,
    targetKind,
    targetId,
  });
  return {
    lessonId: lesson.id,
    prerequisiteLessonIds: index > 0 ? [definitions[index - 1]!.id] : [],
    citations: [
      ...lesson.beats.map((beat, index) =>
        cited(
          "step",
          ["predict", "work", "check", "transfer"][index]!,
          beat.text,
          beat.sourceId ?? lesson.sourceId,
        ),
      ),
      ...lesson.questions.map((question, index) =>
        cited(
          "question",
          "sql-" + lesson.id + "-" + (index + 1),
          question.answerAuthority.kind === "numeric"
            ? question.answerAuthority.workedAnswer
            : question.prompt + " Accepted response: " + question.answerAuthority.exampleAnswer,
          question.sourceId ?? lesson.sourceId,
        ),
      ),
      ...lesson.cards.map((card, index) =>
        cited(
          "flashcard",
          "sql-" + lesson.id + "-card-" + (index + 1),
          card.back,
          card.sourceId ?? lesson.sourceId,
        ),
      ),
    ],
    uncertainty: [],
  };
});
const moduleDefinitions = [
  {
    id: "sql-reading",
    title: "Read the rows",
    description: "Identity, result columns, conditions and ordering.",
  },
  {
    id: "sql-summaries",
    title: "Build a summary",
    description: "Distinct values, missing observations, groups and totals.",
  },
  {
    id: "sql-combining",
    title: "Connect and combine",
    description: "Matching pairs, preserved rows, nested questions and result sets.",
  },
  {
    id: "sql-windows",
    title: "Keep rows while calculating",
    description: "Ranks, partitions, buckets, running frames and neighbouring rows.",
  },
];
const candidate = {
  course: {
    id: courseId,
    version: "1.0.0",
    title: "SQL: From Rows to Reports",
    description: "Read a table, compare queries, and build reports with joins, groups and windows.",
    audience:
      "An adult beginning SQL; arithmetic and familiarity with rows and columns are sufficient.",
    assuranceLevel: "source_backed",
    moduleIds: moduleDefinitions.map((module) => module.id),
    sourceIds: sources.map((source) => source.id),
    accent: "#b8552d",
    coverAsset: "cover.svg",
    status: "available",
    subjects: ["Computer science", "Data literacy"],
  },
  modules: moduleDefinitions.map((module) => ({
    ...module,
    conceptIds: concepts
      .filter((concept) => concept.moduleId === module.id)
      .map((concept) => concept.id),
  })),
  concepts,
  lessons,
  activities: [],
  questions,
  flashcards,
  essays: [],
  sources,
  authoringMetadata,
};
const validation = validateCourseBundle(candidate);
if (!validation.passed) {
  console.error(validation.issues.filter((issue) => issue.severity === "error"));
  process.exitCode = 1;
} else {
  const directory = path.join(root, "content", courseId, ".authoring");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "candidate.json"),
    JSON.stringify(candidate, null, 2) + "\n",
  );
  const map = {
    courseId,
    title: candidate.course.title,
    description: candidate.course.description,
    audience: candidate.course.audience,
    accent: candidate.course.accent,
    coverAsset: candidate.course.coverAsset,
    sources,
    modules: candidate.modules.map((module) => ({
      id: module.id,
      title: module.title,
      summary: module.description,
      concepts: concepts
        .filter((concept) => concept.moduleId === module.id)
        .map((concept) => ({
          id: concept.id,
          title: concept.title,
          summary: concept.summary,
          prerequisiteIds: concept.prerequisiteIds,
        })),
      lessons: definitions
        .filter((lesson) => lesson.moduleId === module.id)
        .map((lesson) => ({
          slug: lesson.id,
          title: lesson.title,
          conceptIds: ["sql-" + lesson.id],
          outcome: lesson.summary,
          outline: lesson.beats.map((beat) => beat.title),
          prerequisiteLessonIds:
            definitions.indexOf(lesson) > 0
              ? [definitions[definitions.indexOf(lesson) - 1]!.id]
              : [],
          activityKinds: ["explorer"],
        })),
    })),
  };
  await writeFile(
    path.join(root, "content/_topic-maps", courseId + ".json"),
    JSON.stringify(TopicMapSchema.parse(map), null, 2) + "\n",
  );
  const versionDb = new Database(":memory:");
  const sqliteVersion = versionDb.prepare("SELECT sqlite_version() AS version").get().version;
  versionDb.close();
  console.log(
    JSON.stringify(
      {
        courseId,
        sqlite: sqliteVersion,
        lessons: lessons.length,
        diagrams: lessons.length * 4,
        questions: questions.length,
        cards: flashcards.length,
        sha256: bundleDigest(candidate),
        warnings: validation.issues,
      },
      null,
      2,
    ),
  );
}
