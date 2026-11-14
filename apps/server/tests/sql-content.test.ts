import { readFileSync } from "node:fs";
import path from "node:path";
import { CourseBundleSchema } from "@discere/contracts";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../../../");
const courseRoot = path.join(root, "content/sql-from-rows-to-reports");
const bundle = CourseBundleSchema.parse(
  JSON.parse(readFileSync(path.join(courseRoot, "bundle.json"), "utf8")),
);
// The customers and orders the lessons query, written out here so the keys below are computed from
// the data itself and not from what the course says.
const customers = [
  { id: 1, name: "Ada", region: "North" },
  { id: 2, name: "Ben", region: "South" },
  { id: 3, name: "Cy", region: "North" },
  { id: 4, name: "Dee", region: "West" },
];
const orders: Array<{
  id: number;
  customer: number;
  item: string;
  amount: number | null;
  status: string;
}> = [
  { id: 101, customer: 1, item: "Desk", amount: 80, status: "paid" },
  { id: 102, customer: 1, item: "Book", amount: 20, status: "paid" },
  { id: 103, customer: 2, item: "Desk", amount: 80, status: "paid" },
  { id: 104, customer: 2, item: "Lamp", amount: 40, status: "pending" },
  { id: 105, customer: 3, item: "Book", amount: 20, status: "paid" },
  { id: 106, customer: 3, item: "Lamp", amount: null, status: "pending" },
];
const known = (rows = orders) => rows.flatMap((row) => (row.amount === null ? [] : [row.amount]));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const mean = (values: number[]) => sum(values) / values.length;
const joined = customers.flatMap((customer) =>
  orders.filter((order) => order.customer === customer.id),
);
const noOrder = customers.filter(
  (customer) => !orders.some((order) => order.customer === customer.id),
);
const items = [...new Set(orders.map((order) => order.item))];
const maximums = [...orders.filter((order) => order.amount !== null)].sort(
  (a, b) => b.amount! - a.amount! || a.id - b.id,
);
const paid = orders.filter((order) => order.status === "paid");
const large = orders.filter((order) => order.amount !== null && order.amount >= 40);
const unionIds = [...new Set([...paid, ...large].map((order) => order.id))].sort((a, b) => a - b);

// These keys come from independent row/set calculations, not from the diagram generator.
const numericChecks: Record<string, Record<number, number>> = {
  "rows-and-keys": {
    2: orders.filter((order) => order.customer === 1).length,
    // Elm signs up, and Ada's and Elm's orders are recorded: 4 + 1 customers and 6 + 2 orders.
    4: customers.length + 1 + (orders.length + 2),
    5: 3 * 2,
  },
  "select-and-name": {
    1: ["id", "amount"].length,
    // amount * 2 shows a number for every order whose amount is known, and NULL for the rest.
    3: orders.filter((order) => order.amount !== null).length,
    4: orders.find((order) => order.id === 102)!.amount! + 10,
    5: 15 * 3,
  },
  "filter-the-rows": {
    1: large.length,
    2: large.filter((order) => order.status === "paid").length,
    4: orders.filter((order) => ["Book", "Lamp"].includes(order.item)).length,
    5: orders.filter((order) => order.amount !== null && order.amount > 20 && order.amount < 80)
      .length,
  },
  "sort-and-limit": { 2: maximums[0]!.id, 3: sum(known(maximums.slice(0, 3))), 5: Math.min(4, 10) },
  "distinct-results": {
    1: new Set(orders.map((order) => order.customer)).size,
    3: new Set(known()).size,
    4: new Set(orders.map((order) => order.customer + ":" + order.status)).size,
    5: new Set(["North", "South", "North", null]).size,
  },
  "aggregate-known-values": {
    1: known().length,
    2: mean(known()),
    3: Math.min(...known(orders.filter((order) => order.status === "pending"))),
    5: mean([10, 30]),
  },
  "group-and-filter-groups": {
    1: items.length,
    2: known(orders.filter((order) => order.item === "Lamp")).length,
    4: sum(known(paid.filter((order) => order.item === "Desk"))),
    5: items.filter((item) => sum(known(orders.filter((order) => order.item === item))) >= 40)
      .length,
  },
  "join-matching-rows": { 1: joined.length, 3: customers.length * orders.length, 5: 2 + 0 + 1 },
  "preserve-the-left-table": {
    1: joined.length + noOrder.length,
    2: 0,
    5: paid.length + noOrder.length,
    6: orders.filter((order) => order.amount === null).length + noOrder.length,
  },
  "preserve-either-side": {
    2: joined.length + noOrder.length + 1,
    4: orders.filter((order) => order.status !== "paid").length + 1,
    5: new Set([1, 2, 3, 2, 4]).size,
  },
  "ask-a-query-inside-a-query": {
    1: orders.filter((order) => order.amount !== null && order.amount > mean(known())).length,
    2: orders.filter((order) =>
      customers.some((customer) => customer.id === order.customer && customer.region === "North"),
    ).length,
    4: orders.filter(
      (order) =>
        order.amount !== null &&
        order.amount > mean(known(orders.filter((other) => other.item === order.item))),
    ).length,
    5: [0, 1, 4].filter((count) => count > 0).length,
  },
  "combine-result-sets": {
    2: unionIds.length,
    3: paid.length + large.length,
    4: unionIds[2]!,
    5: 3 + 2,
  },
  "rank-with-ties": {
    2: 1 + known().filter((value) => value > 40).length,
    3: 1 + new Set(known().filter((value) => value > 40)).size,
    5: 1 + [90, 90, 70, 50].filter((value) => value > 70).length,
  },
  "partition-the-window": {
    1: orders.filter((order) => order.customer === 2 && order.id <= 103).length,
    2: sum(known(paid)),
    3: Math.ceil(known().length / 3),
    5: Math.ceil(7 / 3),
  },
  "running-totals-and-neighbours": {
    1: sum(known(orders.filter((order) => order.id <= 103))),
    3: orders.find((order) => order.id === 103)!.amount!,
    4: orders.find((order) => order.id === 104)!.amount!,
    5: sum([10, 30]),
  },
};
const numericCards: Record<string, number> = {
  "rows-and-keys": 2 * 3,
  "select-and-name": 12 + 8,
  "filter-the-rows": [10, 20, 30].filter((n) => n >= 10 && n <= 20).length,
  "sort-and-limit": sum([90, 40, 10].slice(0, 2)),
  "distinct-results": new Set([7, 7, 9, null]).size,
  "aggregate-known-values": mean([5, 15]),
  "group-and-filter-groups": sum([10, 30]),
  "join-matching-rows": 2 * 4,
  "preserve-the-left-table": 2 + 1,
  "preserve-either-side": new Set([1, 2, 2, 3]).size,
  "ask-a-query-inside-a-query": [0, 2, 3, 0].filter((n) => n > 0).length,
  "combine-result-sets": new Set([2, 4, 4, 6]).size,
  "rank-with-ties": 1 + new Set([90, 90, 70, 50].filter((n) => n > 70)).size,
  "partition-the-window": [1, 2, 3, 4, 5].length,
  "running-totals-and-neighbours": [4, 9, 12].at(-2)!,
};
describe("independent SQL curriculum review", () => {
  const lessonIds = Object.keys(numericCards);
  it("recomputes every lesson of the course", () => {
    expect(bundle.lessons.map((lesson) => lesson.id).sort()).toEqual([...lessonIds].sort());
  });
  it.each(lessonIds)("recomputes every numeric assessment in %s", (id) => {
    const checks = numericChecks[id]!;
    // A question the fix pass turned into a choice is no longer numeric in the shipped course.
    const numeric = [1, 2, 3, 4, 5, 6].filter(
      (index) =>
        bundle.questions.find((question) => question.id === "sql-" + id + "-" + index)
          ?.answerAuthority.kind === "numeric",
    );
    expect(
      Object.keys(checks)
        .map(Number)
        .filter((index) => numeric.includes(index)),
    ).toEqual(numeric);
    for (const index of numeric) {
      const shipped = bundle.questions.find(
        (question) => question.id === "sql-" + id + "-" + index,
      )!;
      // The question review (1.12.0) rewrote worked answers and prompts, so the shipped key is
      // checked against the recomputed value.
      const marked = shipped.answerAuthority;
      if (marked.kind !== "numeric") throw new Error("Expected numeric marking");
      expect(marked.value).toBeCloseTo(checks[index]!, 12);
    }
  });
  it.each(lessonIds)("recomputes the standalone numeric card in %s", (id) => {
    const authority = bundle.flashcards.find(
      (card) => card.id === "sql-" + id + "-card-1",
    )!.answerAuthority;
    if (authority?.kind !== "numeric") throw new Error("Expected numeric recall");
    expect(authority.value).toBeCloseTo(numericCards[id]!, 12);
  });
  it.each(bundle.lessons)(
    "executes all published query comparisons in $id in a fresh database",
    (lesson) => {
      // A legacy lesson compares tables at every step; a v2 lesson also has explain and worked
      // steps without a figure, and may open on one. Every comparison it does show is executed.
      const diagrams = [lesson.intro?.hook.diagram, ...lesson.steps.map((step) => step.diagram)];
      const comparisons = diagrams.filter((diagram) => diagram?.type === "relational_query");
      if (!lesson.intro) expect(comparisons).toHaveLength(lesson.steps.length);
      expect(comparisons.length).toBeGreaterThan(0);
      for (const diagram of comparisons) {
        if (diagram?.type !== "relational_query") throw new Error("Expected query comparison");
        const db = new Database(":memory:");
        try {
          // Fresh schema without generator code: insert exactly the displayed input cells.
          for (const table of diagram.inputs) {
            db.exec(
              "CREATE TABLE " +
                table.name +
                " (" +
                table.columns.map((name) => '"' + name + '"').join(",") +
                ")",
            );
            const insert = db.prepare(
              "INSERT INTO " +
                table.name +
                " VALUES (" +
                table.columns.map(() => "?").join(",") +
                ")",
            );
            for (const row of table.rows) insert.run(...row.cells);
          }
          for (const query of diagram.queries) {
            const statement = db.prepare(query.sql);
            expect(statement.reader).toBe(true);
            expect(statement.columns().map((column) => column.name)).toEqual(query.result.columns);
            expect(statement.raw().all()).toEqual(query.result.rows.map((row) => row.cells));
          }
        } finally {
          db.close();
        }
      }
    },
  );
  it("keeps one accepted answer per choice and a varied response mix", () => {
    const choices = bundle.questions.filter((question) => question.choices);
    // The question review moved either/or and judgement answers off free text, which the
    // phrase marker could not mark fairly; a choice share up to 40% still leaves a varied mix.
    expect(choices.length / bundle.questions.length).toBeLessThanOrEqual(0.4);
    for (const question of choices) {
      if (question.answerAuthority.kind !== "text") throw new Error("Expected choice authority");
      const accepted = question.answerAuthority.acceptedIdeas;
      expect(question.choices!.filter((choice) => accepted.includes(choice.label))).toHaveLength(1);
    }
    expect(
      bundle.questions.filter(
        (question) => question.responseType === "short_text" && !question.choices,
      ).length,
    ).toBeGreaterThan(0);
  });
});
