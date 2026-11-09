import { readFileSync } from "node:fs";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * SQL: from rows to reports, v2 rewrite. Every numeric key the rewrite added is recomputed here
 * from the small data set its question describes, not read back from the authority.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/sql-from-rows-to-reports/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const lessonOf = (id: string) => bundle.lessons.find((item) => item.id === id)!;
const question = (id: string): Question => bundle.questions.find((item) => item.id === id)!;
const keyOf = (id: string) => {
  const authority = question(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
/** The story lessons ask their old opening question on a practice screen after the teaching. */
const storyLessons = [
  "rows-and-keys",
  "select-and-name",
  "filter-the-rows",
  "sort-and-limit",
  "distinct-results",
  "aggregate-known-values",
  "group-and-filter-groups",
  "join-matching-rows",
  "preserve-the-left-table",
  "preserve-either-side",
  "ask-a-query-inside-a-query",
  "combine-result-sets",
  "rank-with-ties",
  "partition-the-window",
  "running-totals-and-neighbours",
];
/** The label of the one choice an item marks as correct (ignoring the backticks that format code). */
const markedLabel = (id: string) => {
  const item = question(id);
  const authority = item.answerAuthority;
  if (authority.kind !== "text") throw new Error(`${id} is not a choice item`);
  const plain = (text: string) => text.replaceAll("`", "").trim().toLowerCase();
  const accepted = authority.acceptedIdeas.map(plain);
  const marked = (item.choices ?? []).filter((choice) => accepted.includes(plain(choice.label)));
  expect(marked, id).toHaveLength(1);
  return marked[0]!;
};
const asksOnAScreen = (lesson: string, id: string) =>
  expect(lessonOf(lesson).steps.map((step) => step.checkQuestionId)).toContain(id);
const numberWord = (n: number) =>
  ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n]!;
const storyOpener = (lesson: string) => {
  const id = `sql-${lesson}-7`;
  expect(lessonOf(lesson).steps.map((step) => step.checkQuestionId)).toContain(id);
  return keyOf(id);
};
const stepKey = (lesson: string, id: string) => {
  const step = lessonOf(lesson).steps.find((item) => item.checkQuestionId === `sql-${lesson}-${id}`);
  expect(step, `${lesson} asks question ${id} on a screen`).toBeDefined();
  return keyOf(`sql-${lesson}-${id}`);
};
const orders = [
  { id: 101, customer: 1, item: "Desk", amount: 80, status: "paid", day: "2026-09-01" },
  { id: 102, customer: 1, item: "Book", amount: 20, status: "paid", day: "2026-09-02" },
  { id: 103, customer: 2, item: "Desk", amount: 80, status: "paid", day: "2026-09-02" },
  { id: 104, customer: 2, item: "Lamp", amount: 40, status: "pending", day: "2026-09-03" },
  { id: 105, customer: 3, item: "Book", amount: 20, status: "paid", day: "2026-09-03" },
  { id: 106, customer: 3, item: "Lamp", amount: null as number | null, status: "pending", day: "2026-09-04" },
];
const known = orders.filter((order) => order.amount !== null) as Array<(typeof orders)[number] & { amount: number }>;
const skill = (lesson: string) => keyOf(lessonOf(lesson).questionIds[2]!);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const mean = (values: number[]) => sum(values) / values.length;
const distinct = <T>(values: T[]) => new Set(values.map((value) => JSON.stringify(value))).size;

describe("SQL from rows to reports (v2)", () => {
  it("validates with fifteen v2 lessons of three skill-check items each", () => {
    const issues = validateCourseBundle(bundle).issues.filter((issue) => issue.severity === "error");
    expect(issues).toEqual([]);
    expect(bundle.lessons).toHaveLength(15);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro).toBeDefined();
      expect(lesson.questionIds).toHaveLength(3);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
    }
  });

  it("recomputes the numeric keys of the hooks", () => {
    expect(storyOpener("rows-and-keys")).toBe(3 + 2); // one line per cup
    // Hiding columns deletes none: the opener is a choice now. A six-column sheet with three
    // shown still has six columns, and the item words that as "It still has all six columns".
    const sheet = { columns: 6, shown: 3 };
    const columnsAfterSharing = sheet.columns; // a view hides columns; it does not remove them
    asksOnAScreen("select-and-name", "sql-select-and-name-7");
    expect(markedLabel("sql-select-and-name-7").label).toBe(
      `It still has all ${numberWord(columnsAfterSharing)} columns`,
    );
    expect(markedLabel("sql-select-and-name-7").id).toBe("a");
    expect(question("sql-select-and-name-7").choices!.map((c) => c.label)).toEqual([
      `It still has all ${numberWord(sheet.columns)} columns`,
      `It has only the ${numberWord(sheet.shown)} columns you showed`,
      `It has ${numberWord(sheet.columns)} columns, but the hidden ${numberWord(sheet.columns - sheet.shown)} are now empty`,
    ]);
    expect(storyOpener("filter-the-rows")).toBe([5, 12, 20, 25, 30].filter((p) => p >= 20).length);
    expect([...[31, 28, 35, 30, 29]].sort((a, b) => a - b)[2]).toBe(storyOpener("sort-and-limit"));
    expect(storyOpener("distinct-results")).toBe(
      distinct(["bun", "loaf", "bun", "roll", "bun", "bagel", "loaf"]),
    );
    expect(storyOpener("aggregate-known-values")).toBe(mean([4, 6, 8]));
    const slips: Array<[string, number]> = [["tea", 2], ["coffee", 3], ["tea", 4], ["coffee", 1], ["tea", 1]];
    expect(storyOpener("group-and-filter-groups")).toBe(sum(slips.filter(([d]) => d === "tea").map(([, v]) => v)));
    const clubs = { Ann: 1, Bo: 2, Cy: 1, Di: 3 };
    expect(storyOpener("join-matching-rows")).toBe(Object.values(clubs).filter((c) => c === 1).length);
    expect(storyOpener("preserve-the-left-table")).toBe(2 + 1 + Math.max(1, 0)); // Ann 2, Bo 1, Cy none
    expect(storyOpener("preserve-either-side")).toBe(distinct(["Ana", "Ben", "Cy", "Ben", "Cy", "Dot"]));
    const scores = [10, 50, 60, 70, 80, 90];
    expect(storyOpener("ask-a-query-inside-a-query")).toBe(scores.filter((s) => s > mean(scores)).length);
    expect(storyOpener("combine-result-sets")).toBe(
      distinct(["Ann", "Bo", "Cy", "Di", "Cy", "Di", "Ed", "Flo"]),
    );
    const times = [10, 10, 12, 14];
    expect(storyOpener("rank-with-ties")).toBe(1 + times.filter((t) => t < 14).length);
    expect(storyOpener("partition-the-window")).toBe(6 + 8);
    expect(storyOpener("running-totals-and-neighbours")).toBe(sum([30, 10, 50]));
  });

  it("recomputes the numeric keys of the third skill-check items", () => {
    expect(skill("rows-and-keys")).toBe([20, 30, null, 10].filter((v) => v !== null).length);
    expect(skill("select-and-name")).toBe(12 - 5);
    expect(skill("filter-the-rows")).toBe([10, 20, 30, null, 40].filter((v) => v !== null && v >= 20 && v <= 40).length);
    expect(skill("sort-and-limit")).toBe(sum([50, 70, 70, 90].sort((a, b) => a - b).slice(0, 2)));
    expect(skill("distinct-results")).toBe(
      distinct([["A", "x"], ["A", "y"], ["B", "x"], ["B", "y"], ["A", "x"]]),
    );
    expect(skill("aggregate-known-values")).toBe([5, null, 7, 8].filter((v) => v !== null).length);
    const rows: Array<[string, string, number]> = [["tea", "paid", 3], ["tea", "pending", 5], ["coffee", "paid", 4]];
    expect(skill("group-and-filter-groups")).toBe(
      sum(rows.filter(([item, status]) => item === "tea" && status === "paid").map(([, , v]) => v)),
    );
    expect(skill("join-matching-rows")).toBe([3, 1, 0].filter((n) => n > 0).length);
    expect(skill("preserve-the-left-table")).toBe([4, 0, 0].reduce((t, n) => t + Math.max(n, 1), 0));
    const a = [1, 2, 3];
    const b = [2, 4, 5];
    expect(skill("preserve-either-side")).toBe(b.length); // RIGHT JOIN keeps every row of b
    expect(a.filter((x) => b.includes(x)).length).toBe(1);
    expect(skill("ask-a-query-inside-a-query")).toBe([0, 2, 0, 0, 5].filter((n) => n === 0).length);
    expect(skill("combine-result-sets")).toBe(
      distinct([[1, "x"], [2, "x"], [1, "y"], [2, "x"]]),
    );
    expect(skill("rank-with-ties")).toBe(1 + new Set([90, 90, 70, 50].filter((v) => v > 70)).size);
    expect(skill("partition-the-window")).toBe(sum([10, 30]));
    expect(skill("running-totals-and-neighbours")).toBe([7, 9, 12][1]);
  });

  it("gives every misconception a wrong value, never the key", () => {
    for (const item of bundle.questions) {
      if (item.answerAuthority.kind !== "numeric") continue;
      for (const misconception of item.misconceptions ?? [])
        expect(misconception.match.numeric ?? []).not.toContain(item.answerAuthority.value);
    }
  });

  it("recomputes the keys of the story lessons' practice screens from the shop's orders", () => {
    // rows-and-keys
    expect(stepKey("rows-and-keys", "2")).toBe(orders.filter((order) => order.customer === 1).length);
    expect(stepKey("rows-and-keys", "4")).toBe(["Ada", "Ben", "Cy", "Dee"].length + 1); // Elm joins
    expect(keyOf("sql-rows-and-keys-5")).toBe(3 * 2);
    // select-and-name
    expect(stepKey("select-and-name", "1")).toBe("id, amount".split(",").length);
    expect(stepKey("select-and-name", "3")).toBe(80 * 2);
    expect(stepKey("select-and-name", "4")).toBe(20 + 10);
    expect(keyOf("sql-select-and-name-5")).toBe(15 * 3);
    // filter-the-rows
    expect(stepKey("filter-the-rows", "1")).toBe(orders.filter((o) => o.amount !== null && o.amount >= 40).length);
    expect(stepKey("filter-the-rows", "2")).toBe(
      orders.filter((o) => o.status === "paid" && o.amount !== null && o.amount >= 40).length,
    );
    expect(stepKey("filter-the-rows", "4")).toBe(orders.filter((o) => ["Book", "Lamp"].includes(o.item)).length);
    expect(keyOf("sql-filter-the-rows-5")).toBe(
      orders.filter((o) => o.amount !== null && o.amount > 20 && o.amount < 80).length,
    );
    // sort-and-limit
    const byAmountThenId = [...known].sort((a, b) => b.amount - a.amount || a.id - b.id);
    expect(stepKey("sort-and-limit", "2")).toBe(byAmountThenId[0]!.id);
    // LIMIT 10 over a WHERE that keeps four rows returns four rows (the item is a choice now).
    const survivors = 4;
    const limit = 10;
    const returned = Math.min(survivors, limit);
    expect(lessonOf("sort-and-limit").questionIds).toContain("sql-sort-and-limit-5");
    expect(markedLabel("sql-sort-and-limit-5").label).toBe(`${numberWord(returned)[0]!.toUpperCase()}${numberWord(returned).slice(1)} rows`);
    expect(markedLabel("sql-sort-and-limit-5").id).toBe("a");
    expect(question("sql-sort-and-limit-5").choices!.map((c) => c.label)).toEqual([
      "Four rows",
      `Ten rows, ${numberWord(limit - survivors)} of them empty`,
      "An error, because fewer than ten rows exist",
    ]);
    // distinct-results
    expect(stepKey("distinct-results", "1")).toBe(distinct(orders.map((o) => o.customer)));
    expect(stepKey("distinct-results", "3")).toBe(distinct(known.map((o) => o.amount)));
    expect(stepKey("distinct-results", "4")).toBe(distinct(orders.map((o) => [o.customer, o.status])));
    expect(keyOf("sql-distinct-results-5")).toBe(distinct(["North", "South", "North", null]));
  });
  it("recomputes the keys of the second batch of story lessons", () => {
    const guestOrder = { id: 107, customer: null as number | null, item: "Mug", amount: 30 as number | null, status: "paid", day: "2026-09-04" };
    const allOrders = [...orders, guestOrder] as Array<Omit<(typeof orders)[number], "customer"> & { customer: number | null }>;
    // aggregate-known-values
    expect(stepKey("aggregate-known-values", "1")).toBe(known.length);
    expect(stepKey("aggregate-known-values", "2")).toBe(mean(known.map((o) => o.amount)));
    const pendingKnown = known.filter((o) => o.status === "pending").map((o) => o.amount);
    expect(stepKey("aggregate-known-values", "3")).toBe(Math.min(...pendingKnown));
    expect(mean([4, 6, 8, 0])).toBe(4.5); // the survey with the blank filled by COALESCE
    // 4-v2: no order has an amount over 100, so MIN(amount) over no rows is NULL, not 0 and not "no row".
    const overHundred = known.filter((o) => o.amount > 100).map((o) => o.amount);
    expect(overHundred).toEqual([]);
    const minOfNone = overHundred.length ? Math.min(...overHundred) : null; // an aggregate over no rows gives one row holding NULL
    asksOnAScreen("aggregate-known-values", "sql-aggregate-known-values-4-v2");
    expect(markedLabel("sql-aggregate-known-values-4-v2").label).toBe(`\`${minOfNone === null ? "NULL" : minOfNone}\``);
    expect(markedLabel("sql-aggregate-known-values-4-v2").id).toBe("a");
    expect(mean(known.filter((o) => o.customer === 3).map((o) => o.amount))).toBe(20);
    // group-and-filter-groups
    expect(stepKey("group-and-filter-groups", "1")).toBe(distinct(orders.map((o) => o.item)));
    expect(stepKey("group-and-filter-groups", "2")).toBe(known.filter((o) => o.item === "Lamp").length);
    // Item 5: Desk 80 + 80, Book 20 + 20, Lamp 40 + NULL (NULL is left out of the sum). Every group's
    // sum is at least 40, so all three survive HAVING SUM(amount) >= 40.
    const groupSums = ["Desk", "Book", "Lamp"].map((item) =>
      sum(known.filter((o) => o.item === item).map((o) => o.amount)),
    );
    expect(groupSums).toEqual([160, 40, 40]);
    expect(keyOf("sql-group-and-filter-groups-5")).toBe(groupSums.filter((total) => total >= 40).length);
    expect(stepKey("group-and-filter-groups", "4")).toBe(
      sum(known.filter((o) => o.status === "paid" && o.item === "Desk").map((o) => o.amount)),
    );
    const byCustomer = (rows: typeof known) =>
      [1, 2, 3].map((c) => sum(rows.filter((o) => o.customer === c).map((o) => o.amount)));
    expect(byCustomer(known)).toEqual([100, 120, 20]);
    expect(byCustomer(known.filter((o) => o.status === "paid"))).toEqual([100, 80, 20]);
    // join-matching-rows
    const customerIds = [1, 2, 3, 4];
    expect(stepKey("join-matching-rows", "1")).toBe(orders.filter((o) => customerIds.includes(o.customer)).length);
    expect(stepKey("join-matching-rows", "3")).toBe(customerIds.length * orders.length);
    expect(2 * 3).toBe(6); // lunch menu: two mains, three drinks
    // preserve-the-left-table
    const withoutOrders = customerIds.filter((c) => !orders.some((o) => o.customer === c));
    expect(stepKey("preserve-the-left-table", "1")).toBe(orders.length + withoutOrders.length);
    expect(stepKey("preserve-the-left-table", "2")).toBe(orders.filter((o) => o.customer === 4).length);
    // Item 5: customers LEFT JOIN orders with the paid test in ON. Ada has two paid orders, Ben and Cy
    // one paid and one pending, Dee none: each customer gives one row per paid order, or one row if none.
    const leftJoinPaid = customerIds.flatMap((c) => {
      const paidOrders = orders.filter((o) => o.customer === c && o.status === "paid");
      return paidOrders.length ? paidOrders : [null];
    });
    expect(orders.filter((o) => o.customer === 2).map((o) => o.status).sort()).toEqual(["paid", "pending"]);
    expect(keyOf("sql-preserve-the-left-table-5")).toBe(leftJoinPaid.length);
    // Item 6: after the plain LEFT JOIN, the rows with a missing amount are order 106 and Dee's row.
    const leftJoin = customerIds.flatMap((c) => {
      const theirs = orders.filter((o) => o.customer === c);
      return theirs.length ? theirs : [null];
    });
    expect(keyOf("sql-preserve-the-left-table-6")).toBe(
      leftJoin.filter((row) => row === null || row.amount === null).length,
    );
    // preserve-either-side
    const matched = allOrders.filter((o) => o.customer !== null && customerIds.includes(o.customer)).length;
    const unmatchedCustomers = customerIds.filter((c) => !allOrders.some((o) => o.customer === c)).length;
    const unmatchedOrders = allOrders.filter((o) => o.customer === null).length;
    expect(stepKey("preserve-either-side", "2")).toBe(matched + unmatchedCustomers + unmatchedOrders);
    expect(stepKey("preserve-either-side", "4")).toBe(
      allOrders.filter((o) => !(o.customer !== null && o.status === "paid")).length,
    );
    // 1-v2: customers RIGHT JOIN orders keeps every order once, since each order has at most one
    // customer: six matched orders and guest order 107 whose customer_id is NULL.
    const rightJoinRows = allOrders.flatMap((o) => {
      const customersForOrder = customerIds.filter((c) => c === o.customer);
      return customersForOrder.length ? customersForOrder : [null];
    });
    expect(stepKey("preserve-either-side", "1-v2")).toBe(rightJoinRows.length);
    expect(rightJoinRows.length).toBe(allOrders.length);
    // The slips it flags: the inner join (six), the full join (eight, with Dee) and the customers (four).
    expect(question("sql-preserve-either-side-1-v2").misconceptions!.flatMap((m) => m.match.numeric ?? [])).toEqual([
      matched,
      matched + unmatchedCustomers + unmatchedOrders,
      customerIds.length,
    ]);
    const guests = ["Ana", "Ben", "Cy"];
    const badges = ["Ben", "Cy", "Dot"];
    expect(guests.filter((g) => badges.includes(g)).length + 1 + 1).toBe(4); // two matches, Ana and Dot
  });

  it("recomputes the keys of the third batch of story lessons", () => {
    // ask-a-query-inside-a-query
    const knownAmounts = known.map((o) => o.amount);
    expect(mean(knownAmounts)).toBe(48);
    expect(stepKey("ask-a-query-inside-a-query", "1")).toBe(knownAmounts.filter((a) => a > mean(knownAmounts)).length);
    const northIds = [1, 3]; // Ada and Cy
    expect(stepKey("ask-a-query-inside-a-query", "2")).toBe(orders.filter((o) => northIds.includes(o.customer)).length);
    const aboveOwnItem = known.filter(
      (o) => o.amount > mean(known.filter((other) => other.item === o.item).map((other) => other.amount)),
    );
    expect(stepKey("ask-a-query-inside-a-query", "4")).toBe(aboveOwnItem.length);
    const aboveOwnCustomer = known.filter(
      (o) => o.amount > mean(known.filter((other) => other.customer === o.customer).map((other) => other.amount)),
    );
    expect(aboveOwnCustomer.map((o) => o.id)).toEqual([101, 103]); // the teaching screen's figure
    // combine-result-sets
    const paid = orders.filter((o) => o.status === "paid").map((o) => o.id);
    const large = known.filter((o) => o.amount >= 40).map((o) => o.id);
    expect(stepKey("combine-result-sets", "2")).toBe(distinct([...paid, ...large]));
    expect(stepKey("combine-result-sets", "3")).toBe(distinct([...paid.map((id) => [id, "paid"]), ...large.map((id) => [id, "large"])]));
    expect(stepKey("combine-result-sets", "4")).toBe([...new Set([...paid, ...large])].sort((a, b) => a - b)[2]);
    const chess = ["Ann", "Bo", "Cy", "Di"];
    const drama = ["Cy", "Di", "Ed", "Flo"];
    expect(distinct([...chess, ...drama])).toBe(6); // UNION on the teaching screen
    expect(chess.length + drama.length).toBe(8); // UNION ALL
    expect([...new Set([...chess, ...drama])].sort()[2]).toBe("Cy");
    // rank-with-ties
    const amountsDesc = known.map((o) => o.amount).sort((a, b) => b - a);
    const rankOf = (value: number) => 1 + amountsDesc.filter((a) => a > value).length;
    const denseRankOf = (value: number) => 1 + new Set(amountsDesc.filter((a) => a > value)).size;
    expect(stepKey("rank-with-ties", "8")).toBe(Math.max(30, 10, 20));
    expect(stepKey("rank-with-ties", "2")).toBe(rankOf(40));
    expect(stepKey("rank-with-ties", "3")).toBe(denseRankOf(40));
    const points = [9, 9, 9, 7]; // the diving contest on the teaching screens
    expect(1 + points.filter((p) => p > 7).length).toBe(4);
    expect(1 + new Set(points.filter((p) => p > 7)).size).toBe(2);
    // partition-the-window
    const classes: Array<[string, number]> = [["A", 6], ["A", 8], ["B", 5]];
    expect(stepKey("partition-the-window", "7")).toBe(sum(classes.filter(([c]) => c === "A").map(([, v]) => v)));
    expect(stepKey("partition-the-window", "2")).toBe(
      sum(known.filter((o) => o.status === "paid").map((o) => o.amount)),
    );
    expect(stepKey("partition-the-window", "1")).toBe(
      1 + orders.filter((o) => o.customer === 2 && o.id < 103).length,
    );
    const bucketSizes = (rows: number, buckets: number) =>
      Array.from({ length: buckets }, (_, i) => Math.floor(rows / buckets) + (i < rows % buckets ? 1 : 0));
    // 4-v2: ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount ASC), keep position 1. Customer 2
    // has order 103 (80) and order 104 (40); ascending, 104 is first.
    const customerTwo = known.filter((o) => o.customer === 2).sort((a, b) => a.amount - b.amount);
    expect(customerTwo.map((o) => [o.id, o.amount])).toEqual([[104, 40], [103, 80]]);
    expect(stepKey("partition-the-window", "4-v2")).toBe(customerTwo[0]!.id);
    expect(question("sql-partition-the-window-4-v2").misconceptions!.flatMap((m) => m.match.numeric ?? [])).toEqual([
      customerTwo.at(-1)!.id, // the largest order, from ordering the other way
    ]);
    expect(stepKey("partition-the-window", "3")).toBe(bucketSizes(known.length, 3)[0]);
    expect(bucketSizes(10, 4)).toEqual([3, 3, 2, 2]); // the teaching screen's ten rows
    expect(bucketSizes(10, 3)).toEqual([4, 3, 3]);
    expect(sum(classes.map(([, v]) => v))).toBe(19); // the whole-sheet total in the opener
    // running-totals-and-neighbours
    const running = (values: Array<number | null>) => {
      let total = 0;
      return values.map((value) => (total += value ?? 0));
    };
    expect(stepKey("running-totals-and-neighbours", "7")).toBe(running([30, 10, 50])[2]);
    expect(stepKey("running-totals-and-neighbours", "1")).toBe(running(orders.map((o) => o.amount))[2]);
    expect(running([20, 5, 15, 10])).toEqual([20, 25, 40, 50]); // the jar on the teaching screen
    const ids = orders.map((o) => o.id);
    const amountAt = (id: number) => orders.find((o) => o.id === id)!.amount;
    expect(stepKey("running-totals-and-neighbours", "3")).toBe(amountAt(ids[ids.indexOf(104) - 1]!)!);
    expect(stepKey("running-totals-and-neighbours", "4")).toBe(amountAt(ids[ids.indexOf(103) + 1]!)!);
  });
});
