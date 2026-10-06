import { readFileSync } from "node:fs";
import type { CourseBundle, CourseCheckVisual } from "../../../packages/contracts/src/index.js";
import { authors } from "../../_authoring/course-checks.js";
const id = "sql-from-rows-to-reports";
const bundle = JSON.parse(
  readFileSync(new URL("../bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
const author = authors(id, bundle.lessons);
type Query = Extract<CourseCheckVisual, { type: "query" }>;
type Read = "rows" | "columns" | { row: number; column: number };
type Spec = {
  lesson: number;
  prompt: string;
  visual: Query;
  value: number | string | null;
  read: Read;
  explanation: string;
  choices?: string[] | undefined;
  correct?: number | undefined;
};
const table = (
  name: string,
  columns: string[],
  rows: (number | string | null)[][],
): Query["tables"][number] => ({ name, columns, rows });
const item = (
  lesson: number,
  prompt: string,
  tables: Query["tables"],
  sql: string,
  value: number | string | null,
  explanation: string,
  read: Read = { row: 0, column: 0 },
  choices?: string[],
  correct?: number,
): Spec => ({
  lesson,
  prompt,
  visual: {
    type: "query",
    tables: tables.map((table) => {
      // These authored queries use explicit column names. Omit unrelated columns to keep the
      // givens readable on a phone; each resulting input is independently executed in tests.
      const named = table.columns.filter((column) =>
        new RegExp("\\b" + column + "\\b", "i").test(sql),
      );
      const columns = named.length ? named : [table.columns[0]!];
      return {
        ...table,
        columns,
        rows: table.rows.map((row) => columns.map((column) => row[table.columns.indexOf(column)]!)),
      };
    }),
    sql,
  },
  value,
  read,
  explanation,
  choices,
  correct,
});

const repairs = table(
  "repairs",
  ["id", "tech", "fee", "status", "day"],
  [
    [11, 1, 30, "done", 1],
    [12, 1, 60, "done", 2],
    [13, 2, null, "open", 2],
    [14, 2, 60, "done", 3],
    [15, null, 15, "open", 4],
  ],
);
const techs = table(
  "techs",
  ["id", "name"],
  [
    [1, "Ira"],
    [2, "Sol"],
    [3, "Uma"],
  ],
);
const placement = [
  item(
    0,
    "Each row is one repair. How many repairs refer to technician 1?",
    [repairs],
    "SELECT id FROM repairs WHERE tech = 1;",
    2,
    "Repairs 11 and 12 refer to technician 1. Repeating a technician key is compatible with one repair per row.",
    "rows",
  ),
  item(
    1,
    "The workshop adds a fixed 8 to each known fee. What is quoted for repair 11?",
    [repairs],
    "SELECT fee + 8 AS quoted\nFROM repairs WHERE id = 11;",
    38,
    "The selected fee is 30, so the quoted value is 30 + 8 = 38. The alias names the output column.",
  ),
  item(
    2,
    "How many repairs meet this condition, including both fee boundaries?",
    [repairs],
    "SELECT id FROM repairs\nWHERE status = 'done' AND fee BETWEEN 30 AND 60;",
    3,
    "Repairs 11, 12 and 14 are done and have fees in the inclusive interval 30 to 60.",
    "rows",
  ),
  item(
    3,
    "Which repair id appears first after this ordering?",
    [repairs],
    "SELECT id FROM repairs\nWHERE fee IS NOT NULL\nORDER BY fee DESC, id ASC LIMIT 1;",
    12,
    "Repairs 12 and 14 tie at 60. The ascending id tie-breaker puts 12 first.",
  ),
  item(
    4,
    "How many distinct technician entries are returned, counting a returned NULL entry?",
    [repairs],
    "SELECT DISTINCT tech FROM repairs;",
    3,
    "The distinct entries are 1, 2 and NULL. DISTINCT retains one NULL entry.",
    "rows",
  ),
  item(
    5,
    "What average fee does this query return?",
    [repairs],
    "SELECT AVG(fee) FROM repairs;",
    41.25,
    "The four known fees sum to 165. AVG skips the missing fee, so 165 / 4 = 41.25.",
  ),
  item(
    6,
    "How many status groups survive this HAVING condition?",
    [repairs],
    "SELECT status, COUNT(*) AS jobs\nFROM repairs GROUP BY status HAVING COUNT(*) >= 3;",
    1,
    "The done group has three rows and the open group has two. Only done survives.",
    "rows",
  ),
  item(
    7,
    "How many matching repair rows does this inner join return?",
    [techs, repairs],
    "SELECT t.name, r.id FROM techs AS t\nJOIN repairs AS r ON r.tech = t.id;",
    4,
    "Technicians 1 and 2 each match two repairs. The unassigned repair and technician 3 produce no inner-join row.",
    "rows",
  ),
  item(
    8,
    "What job count does the left join report for Uma?",
    [techs, repairs],
    "SELECT t.name, COUNT(r.id) AS jobs\nFROM techs AS t LEFT JOIN repairs AS r ON r.tech = t.id\nWHERE t.name = 'Uma' GROUP BY t.id, t.name;",
    0,
    "Uma is preserved in the left join, but her right-side repair id is NULL. COUNT(r.id) is zero.",
    { row: 0, column: 1 },
  ),
  item(
    9,
    "How many rows does this full outer join return?",
    [techs, repairs],
    "SELECT t.name, r.id FROM techs AS t\nFULL OUTER JOIN repairs AS r ON r.tech = t.id;",
    6,
    "There are four matching pairs, Uma's unmatched row and repair 15's unmatched row: six rows.",
    "rows",
  ),
  item(
    10,
    "How many technicians have at least one done repair?",
    [techs, repairs],
    "SELECT t.id FROM techs AS t\nWHERE EXISTS (SELECT 1 FROM repairs AS r\n  WHERE r.tech = t.id AND r.status = 'done');",
    2,
    "Ira and Sol each have a done repair. EXISTS returns each qualifying outer technician once.",
    "rows",
  ),
  item(
    11,
    "How many ids remain after UNION removes repeats?",
    [repairs],
    "SELECT id FROM repairs WHERE status = 'done'\nUNION\nSELECT id FROM repairs WHERE fee >= 60;",
    3,
    "The first set contains 11, 12 and 14; the second contains 12 and 14. Their union has three ids.",
    "rows",
  ),
  item(
    12,
    "What rank does repair 11 receive when fees alone define ties?",
    [repairs],
    "SELECT id, RANK() OVER (ORDER BY fee DESC) AS place\nFROM repairs WHERE fee IS NOT NULL ORDER BY id;",
    3,
    "Two fees of 60 share rank 1. The next fee, 30, receives rank 3.",
    { row: 0, column: 1 },
  ),
  item(
    13,
    "What position is assigned to repair 14 inside its technician's partition?",
    [repairs],
    "SELECT id, ROW_NUMBER() OVER (\n  PARTITION BY tech ORDER BY id) AS position\nFROM repairs ORDER BY id;",
    2,
    "Technician 2 has repairs 13 and 14, so repair 14 is second in that partition.",
    { row: 3, column: 1 },
  ),
  item(
    14,
    "What previous fee is attached to repair 14?",
    [repairs],
    "SELECT id, LAG(fee) OVER (ORDER BY id) AS previous_fee\nFROM repairs ORDER BY id;",
    null,
    "The previous repair is 13, whose fee is missing. LAG reads that missing value rather than skipping to repair 12.",
    { row: 3, column: 1 },
    ["60", "Unknown (NULL)", "Zero"],
    1,
  ),
];

const samples = table(
  "samples",
  ["id", "site", "reading", "day"],
  [
    [21, "A", 4, 1],
    [22, "A", null, 1],
    [23, "B", 10, 2],
    [24, "B", 10, 2],
    [25, "C", 2, 3],
    [26, null, 6, 3],
  ],
);
const sites = table(
  "sites",
  ["code", "zone"],
  [
    ["A", "East"],
    ["B", "East"],
    ["D", "West"],
  ],
);
const checkpoint = [
  item(
    0,
    "A sample id identifies one collected sample. Does the missing reading make sample 22 disappear from this result?",
    [samples],
    "SELECT id, reading FROM samples WHERE id = 22;",
    null,
    "Sample 22 still exists. Its reading is unknown, so the returned row has id 22 and a NULL reading.",
    { row: 0, column: 1 },
    [
      "The row remains with an unknown reading",
      "The query returns no row",
      "The reading becomes zero",
    ],
    0,
  ),
  item(
    1,
    "Which value is returned in adjusted for sample 22?",
    [samples],
    "SELECT reading * 2 AS adjusted FROM samples WHERE id = 22;",
    null,
    "Multiplication involving NULL produces NULL. Renaming the result does not supply a missing measurement.",
    { row: 0, column: 0 },
    ["Zero", "Two", "Unknown (NULL)"],
    2,
  ),
  item(
    2,
    "How many samples are from site A or have an unknown reading?",
    [samples],
    "SELECT id FROM samples WHERE site = 'A' OR reading IS NULL;",
    2,
    "Samples 21 and 22 meet at least one condition. Sample 22 meeting both does not duplicate the row.",
    "rows",
  ),
  item(
    3,
    "The lowest known reading is wanted. Which id does this query return?",
    [samples],
    "SELECT id FROM samples WHERE reading IS NOT NULL\nORDER BY reading ASC, id DESC LIMIT 1;",
    25,
    "The smallest known reading is 2, from sample 25. The missing value is excluded before sorting.",
  ),
  item(
    4,
    "How many distinct site-and-reading pairs remain?",
    [samples],
    "SELECT DISTINCT site, reading FROM samples;",
    5,
    "Samples 23 and 24 repeat the same pair (B, 10). All other pairs differ, including the two A pairs.",
    "rows",
  ),
  item(
    5,
    "Which calculation gives the average when each unknown reading is explicitly filled with zero?",
    [samples],
    "SELECT AVG(COALESCE(reading, 0)) FROM samples;",
    32 / 6,
    "The chosen policy makes six values: 4, 0, 10, 10, 2 and 6. Their sum is 32, so the mean is 32 / 6.",
    { row: 0, column: 0 },
    ["32 / 5", "32 / 6", "32 / 4"],
    1,
  ),
  item(
    6,
    "How many site groups have at least two known readings after the row filter?",
    [samples],
    "SELECT site, COUNT(reading) AS n FROM samples\nWHERE reading >= 4 GROUP BY site\nHAVING COUNT(reading) >= 2;",
    1,
    "The row filter retains 21, 23, 24 and 26. Only site B contributes two of those known readings.",
    "rows",
  ),
  item(
    7,
    "How many sample rows survive a join to the listed sites?",
    [sites, samples],
    "SELECT s.code, m.id FROM sites AS s\nJOIN samples AS m ON m.site = s.code;",
    4,
    "A matches samples 21 and 22; B matches 23 and 24. C and the unknown site have no listed match.",
    "rows",
  ),
  item(
    8,
    "The query keeps sites even without a reading of at least 8. Which site appears first?",
    [sites, samples],
    "SELECT s.code, COUNT(m.id) AS n FROM sites AS s\nLEFT JOIN samples AS m\n  ON m.site = s.code AND m.reading >= 8\nGROUP BY s.code ORDER BY s.code;",
    "A",
    "A and D each have zero qualifying samples. The first ordered row is A; the condition in ON preserves it.",
    { row: 0, column: 0 },
    ["A", "B", "No row is preserved"],
    0,
  ),
  item(
    9,
    "How many input samples does this right join preserve?",
    [sites, samples],
    "SELECT s.code, m.id FROM sites AS s\nRIGHT JOIN samples AS m ON m.site = s.code;",
    6,
    "All six samples survive because samples is the right table. C and the unknown site receive NULL site-table fields.",
    "rows",
  ),
  item(
    10,
    "How many samples exceed the average of the known readings?",
    [samples],
    "SELECT id FROM samples\nWHERE reading > (SELECT AVG(reading) FROM samples);",
    2,
    "The known mean is 32 / 5 = 6.4. Only samples 23 and 24, each with reading 10, exceed it.",
    "rows",
  ),
  item(
    11,
    "How many rows are retained when both reports are concatenated?",
    [samples],
    "SELECT id FROM samples WHERE site = 'A'\nUNION ALL\nSELECT id FROM samples WHERE reading IS NULL;",
    3,
    "The first report has ids 21 and 22; the second has id 22. UNION ALL retains both copies of 22.",
    "rows",
  ),
  item(
    12,
    "What dense rank is assigned to the reading of sample 26?",
    [samples],
    "SELECT id, DENSE_RANK() OVER (ORDER BY reading DESC) AS place\nFROM samples WHERE reading IS NOT NULL ORDER BY id;",
    2,
    "The distinct readings descend as 10, 6, 4 and 2. Reading 6 receives dense rank 2 despite the two top rows.",
    { row: 4, column: 1 },
  ),
  item(
    13,
    "How many rows are kept when the first sample per recorded site is selected?",
    [samples],
    "SELECT id FROM (\n  SELECT id, ROW_NUMBER() OVER (\n    PARTITION BY site ORDER BY id) AS position\n  FROM samples WHERE site IS NOT NULL\n) WHERE position = 1;",
    3,
    "The recorded sites A, B and C each contribute their first sample. The unknown site is filtered before partitioning.",
    "rows",
  ),
  item(
    14,
    "What running total appears for sample 23 when the frame includes all rows from its day?",
    [samples],
    "SELECT id, SUM(reading) OVER (\n  ORDER BY day RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n) AS cumulative FROM samples ORDER BY id;",
    24,
    "By day 2, the frame contains readings 4, NULL, 10 and 10. SUM skips NULL and returns 24 for both day-2 samples.",
    { row: 2, column: 1 },
  ),
];

const deliveries = table(
  "deliveries",
  ["id", "hub", "weight", "status", "day"],
  [
    [31, "N", 12, "sent", 1],
    [32, "N", 8, "sent", 2],
    [33, "S", 12, "held", 2],
    [34, "S", 3, "sent", 3],
    [35, "X", null, "held", 3],
    [36, null, 5, "sent", 4],
  ],
);
const hubs = table(
  "hubs",
  ["code", "capacity"],
  [
    ["N", 20],
    ["S", 30],
    ["W", 15],
  ],
);
const transfer = [
  item(
    0,
    "A row represents one delivery, with id as its identifier. How many delivery rows have no assigned hub?",
    [deliveries],
    "SELECT id FROM deliveries WHERE hub IS NULL;",
    1,
    "Delivery 36 has no assigned hub. Delivery 35 has a recorded hub X even though X is absent from the hub lookup.",
    "rows",
  ),
  item(
    1,
    "How many columns are in this report?",
    [deliveries],
    "SELECT id AS delivery, weight * 1000 AS grams\nFROM deliveries WHERE id = 31;",
    2,
    "The SELECT list contains two expressions. Their aliases are delivery and grams; the stored table is unchanged.",
    "columns",
  ),
  item(
    2,
    "How many rows satisfy the intended sent-and-chosen-hub condition?",
    [deliveries],
    "SELECT id FROM deliveries\nWHERE status = 'sent' AND (hub = 'N' OR hub = 'S');",
    3,
    "Deliveries 31, 32 and 34 are sent and belong to N or S. The parentheses keep the sent requirement on both hubs.",
    "rows",
  ),
  item(
    3,
    "Which delivery wins the latest-day ordering after the sent filter?",
    [deliveries],
    "SELECT id FROM deliveries WHERE status = 'sent'\nORDER BY day DESC, id ASC LIMIT 1;",
    36,
    "The sent rows occur on days 1, 2, 3 and 4. Delivery 36 is the latest.",
  ),
  item(
    4,
    "How many known distinct hub codes does COUNT(DISTINCT hub) count?",
    [deliveries],
    "SELECT COUNT(DISTINCT hub) FROM deliveries;",
    3,
    "N, S and X are the three known codes. COUNT(DISTINCT hub) excludes the NULL entry.",
  ),
  item(
    5,
    "What does SUM return when no delivery matches the filter?",
    [deliveries],
    "SELECT SUM(weight) FROM deliveries WHERE status = 'cancelled';",
    null,
    "With no matching input rows, SUM returns NULL. COUNT(*) would return zero for the same input.",
    { row: 0, column: 0 },
    ["Zero", "Unknown (NULL)", "The table's total weight"],
    1,
  ),
  item(
    6,
    "Which recorded hub has a sent-weight total above 10?",
    [deliveries],
    "SELECT hub, SUM(weight) AS sent_weight FROM deliveries\nWHERE status = 'sent' AND hub IS NOT NULL\nGROUP BY hub HAVING SUM(weight) > 10 ORDER BY hub;",
    "N",
    "N has sent weights 12 and 8, totaling 20. S has only 3 after the sent filter.",
    { row: 0, column: 0 },
    ["S", "N", "X"],
    1,
  ),
  item(
    7,
    "A route lookup has duplicate hub keys. How many joined rows does the query produce?",
    [
      table(
        "dispatch",
        ["id", "hub"],
        [
          [1, "N"],
          [2, "N"],
        ],
      ),
      table(
        "routes",
        ["hub", "route"],
        [
          ["N", "rail"],
          ["N", "road"],
          ["N", "air"],
        ],
      ),
    ],
    "SELECT d.id, r.route FROM dispatch AS d\nJOIN routes AS r ON r.hub = d.hub;",
    6,
    "Each of the two dispatch rows matches each of the three N routes. The join produces 2 × 3 = 6 rows.",
    "rows",
  ),
  item(
    8,
    "How many hubs does a WHERE filter on the right-hand status leave?",
    [hubs, deliveries],
    "SELECT h.code FROM hubs AS h\nLEFT JOIN deliveries AS d ON d.hub = h.code\nWHERE d.status = 'sent' GROUP BY h.code;",
    2,
    "N and S have sent matches. W's NULL-extended row fails the WHERE condition, so W disappears.",
    "rows",
  ),
  item(
    9,
    "How many unmatched rows appear as well as the four matching pairs?",
    [hubs, deliveries],
    "SELECT h.code, d.id FROM hubs AS h\nFULL OUTER JOIN deliveries AS d ON d.hub = h.code\nWHERE h.code IS NULL OR d.id IS NULL;",
    3,
    "Hub W is unmatched on the left. Deliveries 35 and 36 are unmatched on the right. That makes three unmatched rows.",
    "rows",
  ),
  item(
    10,
    "Which hub has no delivery rows at all?",
    [hubs, deliveries],
    "SELECT h.code FROM hubs AS h\nWHERE NOT EXISTS (SELECT 1 FROM deliveries AS d\n  WHERE d.hub = h.code) ORDER BY h.code;",
    "W",
    "N and S each have deliveries. No delivery has hub W, so only W passes NOT EXISTS.",
    { row: 0, column: 0 },
    ["N", "W", "S"],
    1,
  ),
  item(
    11,
    "The source label is part of each selected row. How many rows survive UNION?",
    [deliveries],
    "SELECT hub, 'sent' AS source FROM deliveries\nWHERE status = 'sent' AND hub IS NOT NULL\nUNION\nSELECT hub, 'held' AS source FROM deliveries\nWHERE status = 'held';",
    4,
    "The distinct full rows are (N, sent), (S, sent), (S, held) and (X, held). The two S rows have different source labels.",
    "rows",
  ),
  item(
    12,
    "What rank does delivery 33 receive when id is also inside the window ordering?",
    [deliveries],
    "SELECT id, RANK() OVER (ORDER BY weight DESC, id ASC) AS place\nFROM deliveries WHERE weight IS NOT NULL ORDER BY id;",
    2,
    "The weight-12 rows have ids 31 and 33, so they no longer tie across the complete window ordering. Delivery 33 has rank 2.",
    { row: 2, column: 1 },
  ),
  item(
    13,
    "What N-partition total is repeated beside delivery 32?",
    [deliveries],
    "SELECT id, SUM(weight) OVER (PARTITION BY hub) AS hub_weight\nFROM deliveries ORDER BY id;",
    20,
    "The two N deliveries weigh 12 and 8. The window adds 20 beside each without collapsing their rows.",
    { row: 1, column: 1 },
  ),
  item(
    14,
    "What is the next delivery's weight after delivery 34 in id order?",
    [deliveries],
    "SELECT id, LEAD(weight) OVER (ORDER BY id) AS next_weight\nFROM deliveries ORDER BY id;",
    null,
    "Delivery 35 is next, and its weight is missing. LEAD returns that NULL rather than delivery 36's weight.",
    { row: 3, column: 1 },
    ["5", "Unknown (NULL)", "Zero"],
    1,
  ),
];
export const sqlCheckSpecs = [placement, checkpoint, transfer];
export const sqlCourseChecks = author.sets(
  ...(sqlCheckSpecs.map((set) =>
    set.map((s) =>
      s.choices
        ? author.choice(s.lesson, s.prompt, s.visual, s.choices, s.correct!, s.explanation)
        : author.numeric(s.lesson, s.prompt, s.visual, s.value as number, s.explanation),
    ),
  ) as [
    ReturnType<typeof author.numeric>[],
    ReturnType<typeof author.numeric>[],
    ReturnType<typeof author.numeric>[],
  ]),
  [
    "Trace repair records through a query. Use the result to choose where to begin.",
    "Audit a new field-sampling report across filters, joins, summaries and windows.",
    "Apply the same ideas to a delivery report after a week away.",
  ],
);
