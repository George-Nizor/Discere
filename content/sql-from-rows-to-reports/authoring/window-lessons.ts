import {
  choose,
  demo,
  number,
  numericCard,
  termCard,
  termQuestion,
  type SqlLesson,
} from "./definition.js";

export const windowLessons: SqlLesson[] = [
  {
    id: "rank-with-ties",
    title: "Rank rows without collapsing them",
    summary: "Distinguish ROW_NUMBER, RANK and DENSE_RANK and choose tie behaviour deliberately.",
    moduleId: "sql-windows",
    sourceId: "sqlite-window",
    beats: [
      {
        title: "Keep the individual records",
        text: "GROUP BY amount makes one row for each known amount. A window calculation keeps each known order row and adds a value alongside it. ROW_NUMBER numbers those rows in the specified order; it does not replace them with groups.",
        diagram: demo([
          [
            "Collapse into amount groups",
            "SELECT amount, COUNT(*) AS orders FROM orders WHERE amount IS NOT NULL GROUP BY amount ORDER BY amount DESC;",
          ],
          [
            "Keep every known order",
            "SELECT id, amount, ROW_NUMBER() OVER (ORDER BY amount DESC, id ASC) AS position FROM orders WHERE amount IS NOT NULL ORDER BY amount DESC, id ASC;",
          ],
        ]),
      },
      {
        title: "Equal values share a rank",
        text: "RANK with ORDER BY amount DESC gives both 80 amounts rank 1. Two rows occupy that first rank, so the next value, 40, has rank 3. The output still lists every order. The final id tie-breaker makes the display order stable without changing the rank definition.",
        diagram: demo([
          [
            "Number each row",
            "SELECT id, amount, ROW_NUMBER() OVER (ORDER BY amount DESC, id ASC) AS position FROM orders WHERE amount IS NOT NULL ORDER BY amount DESC, id ASC;",
          ],
          [
            "Share ranks for equal amounts",
            "SELECT id, amount, RANK() OVER (ORDER BY amount DESC) AS position FROM orders WHERE amount IS NOT NULL ORDER BY amount DESC, id ASC;",
          ],
        ]),
      },
      {
        title: "Choose whether ranks have gaps",
        text: "DENSE_RANK also gives equal amounts the same rank, but the next distinct amount gets the next integer. The 40 amount has dense rank 2 and ordinary rank 3. Use the definition that matches the meaning of your report.",
        diagram: demo([
          [
            "Ranks with gaps",
            "SELECT id, amount, RANK() OVER (ORDER BY amount DESC) AS position FROM orders WHERE amount IS NOT NULL ORDER BY amount DESC, id ASC;",
          ],
          [
            "Ranks without gaps",
            "SELECT id, amount, DENSE_RANK() OVER (ORDER BY amount DESC) AS position FROM orders WHERE amount IS NOT NULL ORDER BY amount DESC, id ASC;",
          ],
        ]),
      },
      {
        title: "A tie-breaker changes a rank's meaning",
        text: "RANK orders by all expressions inside OVER. Adding id to that window order makes every order different, so the two 80 amounts no longer tie. Keep id only in the final display order when your ranking is intended to compare amounts alone.",
        diagram: demo([
          [
            "Rank the amount",
            "SELECT id, amount, RANK() OVER (ORDER BY amount DESC) AS position FROM orders WHERE amount IS NOT NULL ORDER BY amount DESC, id ASC;",
          ],
          [
            "Rank amount and id",
            "SELECT id, amount, RANK() OVER (ORDER BY amount DESC, id ASC) AS position FROM orders WHERE amount IS NOT NULL ORDER BY amount DESC, id ASC;",
          ],
        ]),
      },
    ],
    questions: [
      choose(
        "What does a window calculation preserve here?",
        ["Each individual known order row", "Only one row per amount", "Only the largest amount"],
        0,
        "Compare the five-row window result with the grouped result.",
      ),
      number(
        "Under RANK() OVER (ORDER BY amount DESC), what rank does amount 40 receive?",
        3,
        "Two 80 rows share rank 1, so the next row's rank is 3.",
        [
          "Count rows with greater amounts.",
          "Ordinary rank is one plus the number of preceding higher-valued rows.",
        ],
      ),
      number(
        "Under DENSE_RANK() OVER (ORDER BY amount DESC), what rank does amount 40 receive?",
        2,
        "80 is the first distinct amount; 40 is the second.",
        [
          "Dense ranks count different preceding values.",
          "There is one distinct amount greater than forty.",
        ],
      ),
      choose(
        "What happens to the 80 tie if id is added inside the ranking window's ORDER BY?",
        [
          "The two rows no longer tie",
          "Both rows must still have rank 1",
          "The table's amounts change",
        ],
        0,
        "The window compares the complete ordering tuple.",
      ),
      number(
        "Amounts sorted descending are 90, 90, 70, 50. What is RANK for 70?",
        3,
        "Two higher rows precede 70, so its ordinary rank is 3.",
        ["Ordinary rank includes gaps after ties.", "There are two preceding higher-valued rows."],
      ),
      termQuestion(
        "Type the function name that gives every row a separate position in the specified order.",
        "ROW_NUMBER",
        "This function assigns consecutive positions even when values tie.",
      ),
    ],
    cards: [
      numericCard(
        "Amounts are 90, 90, 70, 50 in descending order. What is DENSE_RANK for 70?",
        2,
        "90 is the first distinct value and 70 is the second. Its dense rank is 2.",
      ),
      termCard(
        "Which ranking function shares ranks for equal values and leaves no gaps between distinct values?",
        "DENSE_RANK",
        "DENSE_RANK counts distinct ordering values. RANK can leave gaps after ties.",
      ),
    ],
  },
  {
    id: "partition-the-window",
    title: "Choose which rows a window sees",
    summary: "Calculate within each row's group and filter the resulting values.",
    moduleId: "sql-windows",
    sourceId: "sqlite-window",
    beats: [
      {
        title: "Start again for each customer",
        text: "PARTITION BY customer_id creates a separate window for each customer. ROW_NUMBER ordered by id then starts at 1 for each person's first order. Without PARTITION BY, all six orders belong to one window and are numbered together.",
        diagram: demo([
          [
            "One global window",
            "SELECT id, customer_id, ROW_NUMBER() OVER (ORDER BY id) AS position FROM orders ORDER BY id;",
          ],
          [
            "One window per customer",
            "SELECT id, customer_id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY id) AS position FROM orders ORDER BY id;",
          ],
        ]),
      },
      {
        title: "Attach a group total",
        text: "SUM(amount) OVER (PARTITION BY status) places the relevant status total next to every order. Each paid row gets 200; each pending row gets 40 from its one known amount. GROUP BY would instead collapse the report to two status rows.",
        diagram: demo([
          [
            "Group the report",
            "SELECT status, SUM(amount) AS total FROM orders GROUP BY status ORDER BY status;",
          ],
          [
            "Keep rows with status totals",
            "SELECT id, status, SUM(amount) OVER (PARTITION BY status) AS total FROM orders ORDER BY id;",
          ],
        ]),
      },
      {
        title: "Divide an ordered set into buckets",
        text: "NTILE(3) distributes the five known-amount orders into three buckets as evenly as possible. Ordered by id, the bucket sizes are two, two and one; larger buckets come first. These buckets divide positions, not distinct amount values.",
        diagram: demo([
          [
            "Two buckets",
            "SELECT id, amount, NTILE(2) OVER (ORDER BY id) AS bucket FROM orders WHERE amount IS NOT NULL ORDER BY id;",
          ],
          [
            "Three buckets",
            "SELECT id, amount, NTILE(3) OVER (ORDER BY id) AS bucket FROM orders WHERE amount IS NOT NULL ORDER BY id;",
          ],
        ]),
      },
      {
        title: "Filter after the calculation",
        text: "To keep each customer's first order, first compute position in an inner query. The outer WHERE position = 1 then filters that result. Filtering input rows before the window calculation would change what the window gets to see.",
        diagram: demo([
          [
            "Number all customer orders",
            "SELECT id, customer_id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY id) AS position FROM orders ORDER BY id;",
          ],
          [
            "First order per customer",
            "SELECT id, customer_id, position FROM (SELECT id, customer_id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY id) AS position FROM orders) WHERE position = 1 ORDER BY id;",
          ],
        ]),
      },
    ],
    questions: [
      number(
        "What is the partitioned ROW_NUMBER of order 103 when partitioning by customer_id and ordering by id?",
        1,
        "103 is customer 2's first order, so its position in that customer's window is 1.",
        ["Look only at customer 2's orders.", "Number them in increasing id order."],
      ),
      number(
        "What status total is attached to every paid order by SUM(amount) OVER (PARTITION BY status)?",
        200,
        "The paid amounts are 80, 20, 80 and 20, totalling 200.",
        [
          "Sum only paid known amounts.",
          "The window repeats that status total next to each paid order.",
        ],
      ),
      number(
        "With NTILE(3) over five known-amount orders ordered by id, how many rows are in bucket 1?",
        2,
        "Five rows split into buckets of 2, 2 and 1; the first bucket contains two.",
        [
          "Make the three bucket sizes differ by at most one.",
          "Put larger buckets before smaller ones.",
        ],
      ),
      choose(
        "How do you filter to position = 1 after computing ROW_NUMBER in SQLite?",
        [
          "Use an outer query over the numbered result",
          "Put the window function directly in the same query's WHERE",
          "Rename every id to 1",
        ],
        0,
        "The filter must see the calculated column.",
      ),
      number(
        "Seven rows are distributed by NTILE(3). How many rows are in the first bucket?",
        3,
        "The three bucket sizes are 3, 2 and 2; the first bucket holds three.",
        ["Distribute rows as evenly as possible.", "The larger bucket appears first."],
      ),
      choose(
        "What does PARTITION BY change?",
        [
          "Which rows belong to each calculation window",
          "The stored order ids",
          "Every input table's primary key",
        ],
        0,
        "The calculation restarts independently within each partition.",
      ),
    ],
    cards: [
      numericCard(
        "A partition contains five rows. ROW_NUMBER orders them by a unique id. What is its largest row number?",
        5,
        "The partition's five rows are numbered 1 through 5.",
      ),
      termCard(
        "Which window clause separates rows into independent calculation groups?",
        "PARTITION BY",
        "PARTITION BY defines each window's group of rows while preserving individual result rows.",
      ),
    ],
  },
  {
    id: "running-totals-and-neighbours",
    title: "Read the rows before and after",
    summary: "Specify running frames and use LAG or LEAD with an explicit ordering.",
    moduleId: "sql-windows",
    sourceId: "sqlite-window",
    beats: [
      {
        title: "Extend a running total",
        text: "SUM(amount) with ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW adds known amounts from the first ordered row through the current row. Ordered by id, the totals are 80, 100, 180, 220, 240 and 240. The missing last amount does not add a known value.",
        diagram: demo([
          [
            "Known grand total",
            "SELECT id, amount, SUM(amount) OVER () AS total FROM orders ORDER BY id;",
          ],
          [
            "Running known total",
            "SELECT id, amount, SUM(amount) OVER (ORDER BY id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS total FROM orders ORDER BY id;",
          ],
        ]),
      },
      {
        title: "Peers can enter together",
        text: "A RANGE frame ordered by day includes the current day's peers. On September 2, both orders 102 and 103 show 180. A ROWS frame ordered by day and id includes records one by one, showing 100 and then 180. The frame describes which records contribute.",
        diagram: demo([
          [
            "One row at a time",
            "SELECT id, day, SUM(amount) OVER (ORDER BY day, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS total FROM orders ORDER BY day, id;",
          ],
          [
            "Include the day's peers",
            "SELECT id, day, SUM(amount) OVER (ORDER BY day RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS total FROM orders ORDER BY day, id;",
          ],
        ]),
      },
      {
        title: "Look at the previous row",
        text: "LAG(amount) returns the previous row's amount in the window order. With ids increasing, order 104 sees order 103's amount, 80. The first row has no predecessor, so its LAG is NULL unless a default was supplied. Reversing the order changes the neighbours.",
        diagram: demo([
          [
            "Previous in increasing id",
            "SELECT id, amount, LAG(amount) OVER (ORDER BY id ASC) AS previous FROM orders ORDER BY id ASC;",
          ],
          [
            "Previous in decreasing id",
            "SELECT id, amount, LAG(amount) OVER (ORDER BY id DESC) AS previous FROM orders ORDER BY id DESC;",
          ],
        ]),
      },
      {
        title: "Look ahead explicitly",
        text: "LEAD(amount) returns the next row's amount. In increasing id order, order 103 sees 104's amount, 40. Order 105 sees NULL because the next amount is missing; order 106 sees NULL because no next row exists. The same displayed value can have different causes.",
        diagram: demo([
          [
            "Next amount",
            "SELECT id, amount, LEAD(amount) OVER (ORDER BY id) AS next_amount FROM orders ORDER BY id;",
          ],
          ["Next id", "SELECT id, LEAD(id) OVER (ORDER BY id) AS next_id FROM orders ORDER BY id;"],
        ]),
      },
    ],
    questions: [
      number(
        "What is the running known-amount total at order 103 when ids increase?",
        180,
        "Orders 101, 102 and 103 contribute 80 + 20 + 80 = 180.",
        ["Include rows through 103, not later rows.", "Add the first three known amounts."],
      ),
      choose(
        "Why do both September 2 rows show 180 in the RANGE-by-day example?",
        [
          "The frame includes both rows with the same day",
          "SUM always returns the grand total",
          "SQL changed the order ids",
        ],
        0,
        "Rows with equal window ordering values are peers.",
      ),
      number(
        "With increasing ids, what does LAG(amount) return at order 104?",
        80,
        "The preceding row is order 103, whose amount is 80.",
        [
          "LAG reads the previous row in the window order.",
          "Use order 103's amount, not order 104's amount.",
        ],
      ),
      number(
        "With increasing ids, what does LEAD(amount) return at order 103?",
        40,
        "The next row is order 104, whose amount is 40.",
        ["LEAD reads the next row in the window order.", "Use order 104's amount."],
      ),
      number(
        "Ordered amounts are 10, NULL and 30. What is the running SUM at the third row?",
        40,
        "The known contributing amounts are 10 and 30. Their running sum is 40.",
        ["SUM ignores NULL values.", "Add known amounts from the first row through the third."],
      ),
      choose(
        "A LEAD(amount) value is NULL. What can you conclude from that value alone?",
        [
          "There is definitely no next row",
          "The next amount may be missing, or there may be no next row",
          "The next amount is zero",
        ],
        1,
        "Compare LEAD(id) if you need to distinguish no next row from a missing next amount.",
      ),
    ],
    cards: [
      numericCard(
        "Rows ordered by id have values 4, 9 and 12. What does LAG(value) return on the third row?",
        9,
        "The previous row's value is 9.",
      ),
      termCard(
        "Which window function reads a value from the preceding row in its specified order?",
        "LAG",
        "LAG reads from a preceding row. LEAD reads from a following row.",
      ),
    ],
  },
];
