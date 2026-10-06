import { readFileSync } from "node:fs";
import type {
  SqlProjectCollection,
  SqlTask,
  SqlTable,
  SqlResult,
} from "../../../packages/contracts/src/index.js";
const course = JSON.parse(readFileSync(new URL("../bundle.json", import.meta.url), "utf8"));
type Cell = string | number | null;
const table = (name: string, columns: string, rows: Cell[][]): SqlTable => ({
  name,
  columns: columns.split(" ").map((c) => {
    const [name, type] = c.split(":");
    return { name: name!, type: (type ?? "TEXT") as "TEXT" | "INTEGER" | "REAL" };
  }),
  rows,
});
function task(
  index: number,
  id: string,
  title: string,
  prompt: string,
  columns: string[],
  ordered: boolean,
  solution: string,
  hints: string[],
  correction: string,
  explanation: string,
  datasets: { tables: SqlTable[]; rows: Cell[][] }[],
): SqlTask {
  const lesson = course.lessons[index];
  return {
    id,
    title,
    prompt,
    lessonId: lesson.id,
    conceptIds: lesson.conceptIds,
    sourceIds: lesson.sourceIds,
    tables: datasets[0]!.tables,
    outputColumns: columns,
    ordered,
    starter: "",
    solution,
    hints,
    correction,
    explanation,
    cases: datasets.map((d) => ({
      tables: d.tables,
      expected: { columns, rows: d.rows } as SqlResult,
    })),
  };
}
const jobs = (rows: Cell[][]) => table("jobs", "id:INTEGER item", rows);
const t1 = task(
  0,
  "one-row-per-job",
  "Keep every repair",
  "The workshop logs one row per repair job. Two jobs can involve the same kind of item. Return id and item for every job, keeping repeated item names. Row order does not matter.",
  ["id", "item"],
  false,
  "SELECT id, item FROM jobs;",
  ["A job is identified by id. Two rows can name the same item without being the same job."],
  "Return every job, including jobs with repeated item names.",
  "Selecting id and item keeps the job as the unit of each row. DISTINCT item would merge separate jobs.",
  [
    {
      tables: [
        jobs([
          [12, "lamp"],
          [15, "chair"],
          [19, "lamp"],
        ]),
      ],
      rows: [
        [12, "lamp"],
        [15, "chair"],
        [19, "lamp"],
      ],
    },
    {
      tables: [
        jobs([
          [3, "radio"],
          [8, "radio"],
          [21, "radio"],
          [30, "fan"],
        ]),
      ],
      rows: [
        [3, "radio"],
        [8, "radio"],
        [21, "radio"],
        [30, "fan"],
      ],
    },
    { tables: [jobs([[101, "mixer"]])], rows: [[101, "mixer"]] },
  ],
);
const estimates = (rows: Cell[][]) => table("repairs", "id:INTEGER item minutes:INTEGER", rows);
const t2 = task(
  1,
  "estimate-labour",
  "Name the estimate",
  "Labour costs 2 credits per minute. Return item and the calculated cost named estimate for every repair. Keep NULL when minutes is unknown. Row order does not matter.",
  ["item", "estimate"],
  false,
  "SELECT item, minutes * 2 AS estimate FROM repairs;",
  ["A calculated expression can become a result column. AS supplies its name."],
  "Check the multiplication and the result column name. An unknown duration must stay unknown.",
  "minutes * 2 calculates each estimate. Arithmetic with NULL stays NULL, so an unknown duration does not become free work.",
  [
    {
      tables: [
        estimates([
          [1, "fan", 15],
          [2, "lamp", null],
          [3, "radio", 40],
        ]),
      ],
      rows: [
        ["fan", 30],
        ["lamp", null],
        ["radio", 80],
      ],
    },
    {
      tables: [
        estimates([
          [8, "mixer", 0],
          [9, "chair", 25],
        ]),
      ],
      rows: [
        ["mixer", 0],
        ["chair", 50],
      ],
    },
    {
      tables: [
        estimates([
          [5, "toaster", null],
          [6, "clock", 1],
        ]),
      ],
      rows: [
        ["toaster", null],
        ["clock", 2],
      ],
    },
  ],
);
const queue = (rows: Cell[][]) =>
  table("queue", "id:INTEGER status minutes:INTEGER urgent:INTEGER", rows);
const t3 = task(
  2,
  "choose-open-work",
  "Find the next jobs",
  "Return id for jobs whose status is 'open' and that either need at least 30 minutes or have urgent = 1. An unknown duration alone does not qualify. Row order does not matter.",
  ["id"],
  false,
  "SELECT id FROM queue WHERE status = 'open' AND (minutes >= 30 OR urgent = 1);",
  ["Both routes into the shortlist still require an open job."],
  "Group the duration and urgency alternatives together so a closed urgent job stays out.",
  "Parentheses put the two alternatives inside the open-job condition. A NULL comparison cannot qualify a row unless urgent = 1 makes the OR true.",
  [
    {
      tables: [
        queue([
          [1, "open", 30, 0],
          [2, "closed", 60, 1],
          [3, "open", 10, 1],
          [4, "open", null, 0],
        ]),
      ],
      rows: [[1], [3]],
    },
    {
      tables: [
        queue([
          [8, "closed", 5, 1],
          [9, "open", 29, 0],
          [10, "open", null, 1],
          [11, "open", 31, 0],
        ]),
      ],
      rows: [[10], [11]],
    },
    {
      tables: [
        queue([
          [20, "open", 0, 0],
          [21, "closed", 80, 0],
          [22, "open", 30, 0],
        ]),
      ],
      rows: [[22]],
    },
  ],
);
const times = (rows: Cell[][]) => table("repairs", "id:INTEGER minutes:INTEGER", rows);
const t4 = task(
  3,
  "longest-two",
  "Break the tie",
  "Return id and minutes for the two longest repairs with a known duration. Sort minutes from largest to smallest. For equal durations, the smaller id comes first.",
  ["id", "minutes"],
  true,
  "SELECT id, minutes FROM repairs WHERE minutes IS NOT NULL ORDER BY minutes DESC, id ASC LIMIT 2;",
  ["Choose the rows, then define a complete ordering before limiting the result."],
  "A tie needs the id ordering too. Exclude unknown durations before taking two rows.",
  "ORDER BY minutes DESC, id ASC makes the top two deterministic. The WHERE condition removes unknown durations.",
  [
    {
      tables: [
        times([
          [4, 40],
          [2, 40],
          [8, 10],
          [9, null],
        ]),
      ],
      rows: [
        [2, 40],
        [4, 40],
      ],
    },
    {
      tables: [
        times([
          [8, 70],
          [2, 70],
          [5, 70],
          [3, 80],
        ]),
      ],
      rows: [
        [3, 80],
        [2, 70],
      ],
    },
    {
      tables: [
        times([
          [21, null],
          [24, 5],
        ]),
      ],
      rows: [[24, 5]],
    },
  ],
);
const labels = (rows: Cell[][]) => table("jobs", "id:INTEGER category", rows);
const t5 = task(
  4,
  "category-list",
  "List the categories",
  "Return each known category once, in a column named category. Exclude NULL. Row order does not matter.",
  ["category"],
  false,
  "SELECT DISTINCT category FROM jobs WHERE category IS NOT NULL;",
  ["The result represents categories, so repeated jobs in one category should contribute one row."],
  "Check both duplicate category names and missing category values.",
  "DISTINCT removes repeated result rows after the NULL filter. Selecting id as well would make jobs distinct instead of categories.",
  [
    {
      tables: [
        labels([
          [1, "wood"],
          [2, "electrical"],
          [3, "wood"],
          [4, null],
        ]),
      ],
      rows: [["wood"], ["electrical"]],
    },
    {
      tables: [
        labels([
          [8, "textile"],
          [9, "textile"],
          [10, "metal"],
        ]),
      ],
      rows: [["textile"], ["metal"]],
    },
    {
      tables: [
        labels([
          [5, null],
          [6, null],
        ]),
      ],
      rows: [],
    },
  ],
);
const t6 = task(
  5,
  "known-durations",
  "Report what is known",
  "Return one row with jobs (all rows), measured (known durations), total_minutes (sum of known durations), and mean_minutes (their average). If no duration is known, the sum and average must stay NULL.",
  ["jobs", "measured", "total_minutes", "mean_minutes"],
  false,
  "SELECT COUNT(*) AS jobs, COUNT(minutes) AS measured, SUM(minutes) AS total_minutes, AVG(minutes) AS mean_minutes FROM repairs;",
  ["COUNT(*) counts rows. Think about how the other aggregates treat NULL."],
  "Use the count of known durations as the average's denominator. Unknown time is not zero time.",
  "COUNT(minutes), SUM(minutes) and AVG(minutes) use known values. COUNT(*) includes every job. SUM and AVG return NULL when no values are known.",
  [
    {
      tables: [
        times([
          [1, 10],
          [2, null],
          [3, 30],
        ]),
      ],
      rows: [[3, 2, 40, 20]],
    },
    {
      tables: [
        times([
          [4, 0],
          [5, 15],
          [6, 30],
          [7, null],
        ]),
      ],
      rows: [[4, 3, 45, 15]],
    },
    {
      tables: [
        times([
          [20, null],
          [21, null],
        ]),
      ],
      rows: [[2, 0, null, null]],
    },
  ],
);
const t7 = task(
  6,
  "busy-categories",
  "Find busy categories",
  "Return category and COUNT(*) named jobs for known categories with at least two jobs. Sort category alphabetically.",
  ["category", "jobs"],
  true,
  "SELECT category, COUNT(*) AS jobs FROM jobs WHERE category IS NOT NULL GROUP BY category HAVING COUNT(*) >= 2 ORDER BY category;",
  ["A row filter handles missing categories. A group filter handles the count."],
  "The count condition applies after grouping. Keep categories with exactly two jobs.",
  "WHERE removes missing categories before grouping. HAVING keeps groups whose job count is at least two.",
  [
    {
      tables: [
        labels([
          [1, "wood"],
          [2, "metal"],
          [3, "wood"],
          [4, null],
          [5, "metal"],
          [6, "textile"],
        ]),
      ],
      rows: [
        ["metal", 2],
        ["wood", 2],
      ],
    },
    {
      tables: [
        labels([
          [8, "electrical"],
          [9, "electrical"],
          [10, "electrical"],
          [11, "wood"],
        ]),
      ],
      rows: [["electrical", 3]],
    },
    {
      tables: [
        labels([
          [20, "metal"],
          [21, null],
          [22, null],
        ]),
      ],
      rows: [],
    },
  ],
);
const people = (rows: Cell[][]) => table("people", "id:INTEGER name", rows);
const assignments = (rows: Cell[][]) => table("jobs", "id:INTEGER person_id:INTEGER", rows);
const t8 = task(
  7,
  "match-owners",
  "Find each owner",
  "Match jobs.person_id to people.id. Return jobs.id as job_id and people.name as owner for matching jobs only. People can share a name. Row order does not matter.",
  ["job_id", "owner"],
  false,
  "SELECT j.id AS job_id, p.name AS owner FROM jobs j JOIN people p ON j.person_id = p.id;",
  ["Match the relationship keys. A name is a label, not a unique person identifier."],
  "Check the join condition. Every matching job should appear once, including jobs owned by people with the same name.",
  "The key comparison pairs each job with its owner. An inner join omits jobs with no matching person.",
  [
    {
      tables: [
        assignments([
          [1, 10],
          [2, 10],
          [3, 99],
        ]),
        people([
          [10, "Ari"],
          [11, "Bo"],
        ]),
      ],
      rows: [
        [1, "Ari"],
        [2, "Ari"],
      ],
    },
    {
      tables: [
        assignments([
          [8, 3],
          [9, 4],
          [10, null],
        ]),
        people([
          [3, "Kai"],
          [4, "Kai"],
        ]),
      ],
      rows: [
        [8, "Kai"],
        [9, "Kai"],
      ],
    },
    { tables: [assignments([[21, 8]]), people([[5, "Mina"]])], rows: [] },
  ],
);
const t9 = task(
  8,
  "include-idle-owners",
  "Keep people with no jobs",
  "For every person, return people.id as person_id and the number of matching jobs as jobs. Include zero for people with no jobs. Sort person_id from smallest to largest.",
  ["person_id", "jobs"],
  true,
  "SELECT p.id AS person_id, COUNT(j.id) AS jobs FROM people p LEFT JOIN jobs j ON j.person_id = p.id GROUP BY p.id ORDER BY p.id;",
  [
    "Choose the table whose rows must all survive. Count a value that exists only for matched jobs.",
  ],
  "A preserved person with no match still produces a joined row. Counting that row would incorrectly give one job.",
  "A LEFT JOIN preserves every person. COUNT(j.id) ignores the NULL value in an unmatched job row and returns zero.",
  [
    {
      tables: [
        people([
          [10, "Ari"],
          [11, "Bo"],
          [12, "Cy"],
        ]),
        assignments([
          [1, 10],
          [2, 10],
          [3, 11],
        ]),
      ],
      rows: [
        [10, 2],
        [11, 1],
        [12, 0],
      ],
    },
    {
      tables: [
        people([
          [3, "Kai"],
          [4, "Kai"],
        ]),
        assignments([
          [8, 4],
          [9, 99],
        ]),
      ],
      rows: [
        [3, 0],
        [4, 1],
      ],
    },
    { tables: [people([[20, "Mina"]]), assignments([])], rows: [[20, 0]] },
  ],
);
const inventory = (name: string, column: string, rows: Cell[][]) =>
  table(name, "code " + column + ":INTEGER", rows);
const t10 = task(
  9,
  "reconcile-parts",
  "Reconcile both lists",
  "Match stock.code to requests.code. Keep every row from either list, including unmatched rows. Return the available code as code, stock.units as stock, and requests.units as requested. Missing quantities stay NULL. NULL codes do not match each other. Row order does not matter.",
  ["code", "stock", "requested"],
  false,
  "SELECT COALESCE(s.code, r.code) AS code, s.units AS stock, r.units AS requested FROM stock s FULL OUTER JOIN requests r ON s.code = r.code;",
  ["Some codes exist on only one side. Both sides need to survive the join."],
  "Keep unmatched rows from both lists. An equality join does not pair two NULL codes.",
  "FULL OUTER JOIN preserves unmatched rows from either side. COALESCE selects the available code without turning a missing quantity into zero.",
  [
    {
      tables: [
        inventory("stock", "units", [
          ["A", 4],
          ["B", 2],
        ]),
        inventory("requests", "units", [
          ["B", 5],
          ["C", 1],
        ]),
      ],
      rows: [
        ["A", 4, null],
        ["B", 2, 5],
        ["C", null, 1],
      ],
    },
    {
      tables: [
        inventory("stock", "units", [
          ["X", 0],
          [null, 3],
        ]),
        inventory("requests", "units", [
          [null, 2],
          ["X", 4],
          ["Y", 7],
        ]),
      ],
      rows: [
        ["X", 0, 4],
        [null, 3, null],
        [null, null, 2],
        ["Y", null, 7],
      ],
    },
    {
      tables: [inventory("stock", "units", []), inventory("requests", "units", [["Z", 9]])],
      rows: [["Z", null, 9]],
    },
  ],
);
const t11 = task(
  10,
  "above-average-time",
  "Find unusually long repairs",
  "Return id and minutes for repairs strictly above the average known duration in repairs. Exclude equal durations and unknown durations. Row order does not matter.",
  ["id", "minutes"],
  false,
  "SELECT id, minutes FROM repairs WHERE minutes > (SELECT AVG(minutes) FROM repairs);",
  [
    "The threshold must come from the current table, so a typed numerical cutoff will not work for every dataset.",
  ],
  "Compute the average from the same dataset and use a strict comparison.",
  "The subquery computes one average from known values. The outer query selects durations above it; comparisons to NULL do not select a row.",
  [
    {
      tables: [
        times([
          [1, 10],
          [2, 20],
          [3, 30],
          [4, null],
        ]),
      ],
      rows: [[3, 30]],
    },
    {
      tables: [
        times([
          [8, 40],
          [9, 40],
          [10, 100],
        ]),
      ],
      rows: [[10, 100]],
    },
    {
      tables: [
        times([
          [20, 5],
          [21, 5],
          [22, null],
        ]),
      ],
      rows: [],
    },
  ],
);
const donor = (name: string, rows: Cell[][]) => table(name, "donor credits:INTEGER", rows);
const t12 = task(
  11,
  "keep-all-donations",
  "Keep every donation",
  "Combine morning and evening into donor and credits columns. Each row is a separate donation, even when the donor and amount repeat. Keep every donation. Row order does not matter.",
  ["donor", "credits"],
  false,
  "SELECT donor, credits FROM morning UNION ALL SELECT donor, credits FROM evening;",
  ["Decide whether repeated result rows represent duplicate data or separate real events."],
  "A repeated donor and amount can still describe two donations. The combined report must keep both.",
  "UNION ALL appends all rows. UNION would remove matching result rows and lose real donations.",
  [
    {
      tables: [
        donor("morning", [
          ["Ari", 5],
          ["Bo", 10],
        ]),
        donor("evening", [["Ari", 5]]),
      ],
      rows: [
        ["Ari", 5],
        ["Bo", 10],
        ["Ari", 5],
      ],
    },
    {
      tables: [
        donor("morning", [
          ["Cy", 2],
          ["Cy", 2],
        ]),
        donor("evening", [
          ["Cy", 2],
          ["Dee", 3],
        ]),
      ],
      rows: [
        ["Cy", 2],
        ["Cy", 2],
        ["Cy", 2],
        ["Dee", 3],
      ],
    },
    { tables: [donor("morning", []), donor("evening", [["Mina", 9]])], rows: [["Mina", 9]] },
  ],
);
const scores = (rows: Cell[][]) => table("teams", "name points:INTEGER", rows);
const t13 = task(
  12,
  "rank-equal-scores",
  "Share the rank",
  "Return name, points, and competition rank named place, with the largest points first in the ranking. Equal scores share a rank and leave a gap before the next rank. Sort the output by name alphabetically.",
  ["name", "points", "place"],
  true,
  "SELECT name, points, RANK() OVER (ORDER BY points DESC) AS place FROM teams ORDER BY name;",
  ["The ranking order and the display order serve different purposes."],
  "Tied scores need the same rank, followed by a gap. Do not break ties inside the ranking window.",
  "RANK() gives ties the same place and skips subsequent positions. The outer ORDER BY name controls display independently of the window order.",
  [
    {
      tables: [
        scores([
          ["Birch", 7],
          ["Ash", 10],
          ["Cedar", 7],
          ["Elm", 4],
        ]),
      ],
      rows: [
        ["Ash", 10, 1],
        ["Birch", 7, 2],
        ["Cedar", 7, 2],
        ["Elm", 4, 4],
      ],
    },
    {
      tables: [
        scores([
          ["Zinc", 8],
          ["Copper", 8],
          ["Iron", 3],
        ]),
      ],
      rows: [
        ["Copper", 8, 1],
        ["Iron", 3, 3],
        ["Zinc", 8, 1],
      ],
    },
    {
      tables: [
        scores([
          ["A", 0],
          ["B", 0],
          ["C", 0],
        ]),
      ],
      rows: [
        ["A", 0, 1],
        ["B", 0, 1],
        ["C", 0, 1],
      ],
    },
  ],
);
const regional = (rows: Cell[][]) => table("repairs", "id:INTEGER district minutes:INTEGER", rows);
const t14 = task(
  13,
  "district-benchmark",
  "Keep detail beside the average",
  "Return every repair's id and district, with the average known duration in its district named district_mean. Keep one row per repair, including repairs with unknown duration. Sort id from smallest to largest.",
  ["id", "district", "district_mean"],
  true,
  "SELECT id, district, AVG(minutes) OVER (PARTITION BY district) AS district_mean FROM repairs ORDER BY id;",
  ["A window calculation can repeat a group statistic while preserving the original rows."],
  "Keep the detail rows and calculate each district's own average. Unknown durations must not enter the denominator.",
  "PARTITION BY district gives each row its district's average. A window preserves every repair, while GROUP BY would collapse them.",
  [
    {
      tables: [
        regional([
          [1, "north", 10],
          [2, "south", 40],
          [3, "north", 30],
          [4, "south", null],
        ]),
      ],
      rows: [
        [1, "north", 20],
        [2, "south", 40],
        [3, "north", 20],
        [4, "south", 40],
      ],
    },
    {
      tables: [
        regional([
          [8, "east", 5],
          [6, "west", null],
          [7, "east", 15],
          [9, "west", null],
        ]),
      ],
      rows: [
        [6, "west", null],
        [7, "east", 10],
        [8, "east", 10],
        [9, "west", null],
      ],
    },
    {
      tables: [
        regional([
          [20, "central", 0],
          [21, "central", 20],
        ]),
      ],
      rows: [
        [20, "central", 10],
        [21, "central", 10],
      ],
    },
  ],
);
const ledger = (rows: Cell[][]) => table("entries", "seq:INTEGER credits:INTEGER", rows);
const t15 = task(
  14,
  "follow-the-ledger",
  "Follow the running balance",
  "In increasing seq order, return seq, the running sum of credits named running, and the immediately preceding row's credits named previous. Include the current row in the sum. Keep NULL for an absent or unknown previous value. A sum with no known values is NULL.",
  ["seq", "running", "previous"],
  true,
  "SELECT seq, SUM(credits) OVER (ORDER BY seq ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running, LAG(credits) OVER (ORDER BY seq) AS previous FROM entries ORDER BY seq;",
  [
    "Give both windows the same sequence. The running sum and the previous value look at different parts of that sequence.",
  ],
  "Include the current row in the sum. LAG reads the immediately preceding row, even when its value is NULL.",
  "An explicit ROWS frame accumulates through the current entry. LAG returns the previous row's value; it does not skip NULL entries.",
  [
    {
      tables: [
        ledger([
          [3, -2],
          [1, 5],
          [2, 8],
        ]),
      ],
      rows: [
        [1, 5, null],
        [2, 13, 5],
        [3, 11, 8],
      ],
    },
    {
      tables: [
        ledger([
          [8, 4],
          [5, null],
          [6, 3],
          [7, null],
        ]),
      ],
      rows: [
        [5, null, null],
        [6, 3, null],
        [7, 3, 3],
        [8, 7, null],
      ],
    },
    {
      tables: [
        ledger([
          [20, 0],
          [21, -5],
          [22, 5],
        ]),
      ],
      rows: [
        [20, 0, null],
        [21, -5, 0],
        [22, 0, -5],
      ],
    },
  ],
);
export const sqlProjects: SqlProjectCollection = {
  courseId: "sql-from-rows-to-reports",
  projects: [
    {
      id: "workshop-first-reports",
      version: "1.0.0",
      title: "Your first workshop reports",
      description:
        "Write queries for a repair workshop. Keep the right rows, calculate estimates and build a reliable shortlist.",
      tasks: [t1, t2, t3, t4, t5],
    },
    {
      id: "workshop-connections",
      version: "1.0.0",
      title: "Connect the workshop records",
      description:
        "Turn incomplete durations and related tables into reports that keep the people and parts they should.",
      tasks: [t6, t7, t8, t9, t10],
    },
    {
      id: "workshop-changing-data",
      version: "1.0.0",
      title: "Make reports that adapt",
      description:
        "Write queries that still work when the data changes. Compare averages, preserve donations and follow a running balance.",
      tasks: [t11, t12, t13, t14, t15],
    },
  ],
};
