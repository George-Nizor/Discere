import {
  choose,
  demo,
  number,
  numericCard,
  termCard,
  termQuestion,
  type SqlLesson,
} from "./definition.js";

export const summaryLessons: SqlLesson[] = [
  {
    id: "distinct-results",
    title: "Count distinct things",
    summary: "Distinguish result rows, distinct values and distinct combinations of values.",
    moduleId: "sql-summaries",
    sourceId: "sqlite-select",
    beats: [
      {
        title: "Remove repeated result values",
        text: "The original orders contain six customer references: 1, 1, 2, 2, 3, 3. SELECT DISTINCT customer_id removes repeated result rows and leaves three ids. It does not delete orders from the input table.",
        diagram: demo([
          ["Every reference", "SELECT customer_id FROM orders ORDER BY customer_id, id;"],
          ["Distinct customers", "SELECT DISTINCT customer_id FROM orders ORDER BY customer_id;"],
        ]),
      },
      {
        title: "The whole selected row matters",
        text: "DISTINCT compares the full SELECT list. DISTINCT item returns three item names. DISTINCT item, id returns six pairs because every order id is different. Adding a column can stop two rows from being duplicates.",
        diagram: demo([
          ["Distinct items", "SELECT DISTINCT item FROM orders ORDER BY item;"],
          ["Distinct item and id", "SELECT DISTINCT item, id FROM orders ORDER BY id;"],
        ]),
      },
      {
        title: "One missing result value",
        text: "The amount column contains 80, 20, 80, 40, 20 and NULL. DISTINCT amount retains 20, 40, 80 and one NULL result. COUNT(DISTINCT amount) counts only the three known distinct amounts. The two queries answer different counting questions.",
        diagram: demo([
          ["Distinct amounts", "SELECT DISTINCT amount FROM orders ORDER BY amount;"],
          [
            "Count known distinct amounts",
            "SELECT COUNT(DISTINCT amount) AS known_amounts FROM orders;",
          ],
        ]),
        sourceId: "sqlite-aggregate",
      },
      {
        title: "A combination can repeat",
        text: "In these orders, every Desk and Book is paid, and every Lamp is pending. DISTINCT item, status returns three combinations. DISTINCT customer_id, status returns five: customer 2 and customer 3 each have both statuses.",
        diagram: demo([
          ["Item and status", "SELECT DISTINCT item, status FROM orders ORDER BY item, status;"],
          [
            "Customer and status",
            "SELECT DISTINCT customer_id, status FROM orders ORDER BY customer_id, status;",
          ],
        ]),
      },
    ],
    questions: [
      number(
        "How many rows does SELECT DISTINCT customer_id FROM orders return?",
        3,
        "The distinct ids are 1, 2 and 3.",
        [
          "Collect the different customer ids.",
          "Repeated references collapse into one result row.",
        ],
      ),
      choose(
        "Why does DISTINCT item, id still return six rows?",
        [
          "DISTINCT is ignored for text",
          "Each item-and-id pair is different",
          "Every item is different",
        ],
        1,
        "DISTINCT compares the entire selected row.",
      ),
      number(
        "What does COUNT(DISTINCT amount) return for the original orders?",
        3,
        "The known distinct amounts are 20, 40 and 80. COUNT does not include NULL.",
        ["Ignore missing values for this count.", "Count different known amounts, not orders."],
        "sqlite-aggregate",
      ),
      number(
        "How many rows does SELECT DISTINCT customer_id, status FROM orders return?",
        5,
        "Customer 1 has paid; customer 2 has paid and pending; customer 3 has paid and pending. That makes five pairs.",
        ["List the statuses separately for each customer.", "Compare the full two-column row."],
      ),
      number(
        "A result column contains North, South, North and NULL. How many rows remain after SELECT DISTINCT?",
        3,
        "North, South and NULL form three distinct result rows.",
        ["Remove repeated North only.", "One NULL remains as a distinct result value."],
      ),
      choose(
        "What does DISTINCT change?",
        ["Only the query result", "The stored source table", "The primary key definition"],
        0,
        "SELECT reads; DISTINCT shapes its returned rows.",
      ),
    ],
    cards: [
      numericCard(
        "A query selects values 7, 7, 9 and NULL. How many rows does SELECT DISTINCT value return?",
        3,
        "The distinct result values are 7, 9 and NULL: three rows.",
      ),
      termCard(
        "Which SELECT keyword removes duplicate result rows?",
        "DISTINCT",
        "DISTINCT compares the entire selected row and removes repeated result rows.",
      ),
    ],
  },
  {
    id: "aggregate-known-values",
    title: "Choose the right denominator",
    summary: "Use COUNT, SUM, AVG, MIN and MAX while keeping missing values visible.",
    moduleId: "sql-summaries",
    sourceId: "sqlite-aggregate",
    beats: [
      {
        title: "Count rows or known values",
        text: "COUNT(*) counts all six orders. COUNT(amount) counts the five non-NULL amounts. The difference exposes a missing value. Counting rows is useful for activity; counting a column is useful when you need to know how many observations are known.",
        diagram: demo([
          ["Count every order", "SELECT COUNT(*) AS orders FROM orders;"],
          ["Count known amounts", "SELECT COUNT(amount) AS known_amounts FROM orders;"],
        ]),
      },
      {
        title: "Average the known amounts",
        text: "SUM(amount) is 240. AVG(amount) divides that sum by the five known amounts, giving 48. It does not divide by all six orders. COALESCE(amount, 0) replaces the missing value with zero and changes the resulting average to 40.",
        diagram: demo([
          [
            "Keep missing separate",
            "SELECT SUM(amount) AS total, AVG(amount) AS mean FROM orders;",
          ],
          [
            "Fill missing with zero",
            "SELECT SUM(COALESCE(amount, 0)) AS total, AVG(COALESCE(amount, 0)) AS mean FROM orders;",
          ],
        ]),
      },
      {
        title: "Minimum and maximum",
        text: "MIN(amount) and MAX(amount) select the smallest and largest known amounts: 20 and 80. The pending orders contain one known amount, 40, and one NULL. Their minimum and maximum are both 40; that does not mean the missing amount was 40.",
        diagram: demo([
          ["All orders", "SELECT MIN(amount) AS minimum, MAX(amount) AS maximum FROM orders;"],
          [
            "Pending only",
            "SELECT MIN(amount) AS minimum, MAX(amount) AS maximum FROM orders WHERE status = 'pending';",
          ],
        ]),
      },
      {
        title: "No matches still has a meaning",
        text: "No order has amount greater than 100. An aggregate query without GROUP BY still returns one result row: COUNT(*) is zero, while SUM(amount) and AVG(amount) are NULL. An absent total and a measured zero total are different claims.",
        diagram: demo([
          [
            "Known orders",
            "SELECT COUNT(*) AS orders, SUM(amount) AS total, AVG(amount) AS mean FROM orders;",
          ],
          [
            "No matches",
            "SELECT COUNT(*) AS orders, SUM(amount) AS total, AVG(amount) AS mean FROM orders WHERE amount > 100;",
          ],
        ]),
      },
    ],
    questions: [
      number(
        "What does COUNT(amount) return for the original orders?",
        5,
        "Five rows have a non-NULL amount; order 106 is missing.",
        ["Count known values in the column.", "COUNT(amount) excludes the NULL row."],
      ),
      number(
        "What is AVG(amount) for the original orders?",
        48,
        "The known total is 240 across five known amounts: 240 ÷ 5 = 48.",
        ["Add only known amounts.", "Use the count of known amounts as the denominator."],
      ),
      number(
        "What is MIN(amount) for pending orders?",
        40,
        "Order 104 is the only pending order with a known amount; MIN is 40.",
        [
          "Filter to pending orders first.",
          "Ignore the missing amount; do not replace it with zero.",
        ],
      ),
      termQuestion(
        "With no matching rows, type the value SUM(amount) returns in SQLite.",
        "NULL",
        "No observed sum is different from a known zero sum.",
      ),
      number(
        "Known values are 10 and 30, with one NULL. What does AVG(value) return?",
        20,
        "AVG uses the two known values: (10 + 30) ÷ 2 = 20.",
        ["The missing value does not add to the count.", "Divide the known total by two."],
      ),
      choose(
        "What changes when you use AVG(COALESCE(amount, 0))?",
        [
          "Missing amounts count as zeros",
          "Missing amounts are still excluded",
          "Only the column heading changes",
        ],
        0,
        "The replacement becomes an input value to AVG.",
        "sqlite-expr",
      ),
    ],
    cards: [
      numericCard(
        "A column contains 5, NULL and 15. What is AVG(value)?",
        10,
        "The two known values average to (5 + 15) ÷ 2 = 10.",
      ),
      termCard(
        "Which SQL aggregate counts every input row, including rows with missing column values?",
        "COUNT(*)",
        "COUNT(*) counts rows. COUNT(column) counts only non-NULL values in that column.",
      ),
    ],
  },
  {
    id: "group-and-filter-groups",
    title: "Build a grouped report",
    summary: "Build a report whose rows represent groups, then filter its calculated totals.",
    moduleId: "sql-summaries",
    sourceId: "sqlite-select",
    beats: [
      {
        title: "One result per group",
        text: "GROUP BY item puts orders with the same item together. SUM(amount) then adds known amounts inside each group. The result has three rows: Book totals 40, Desk totals 160, and Lamp totals 40. The report's rows now represent items rather than orders.",
        diagram: demo([
          [
            "Group by item",
            "SELECT item, SUM(amount) AS total FROM orders GROUP BY item ORDER BY item;",
          ],
          [
            "Group by status",
            "SELECT status, SUM(amount) AS total FROM orders GROUP BY status ORDER BY status;",
          ],
        ]),
      },
      {
        title: "Count the data inside a group",
        text: "Each item has two orders. Lamp has only one known amount, so COUNT(*) is two and COUNT(amount) is one for that group. A grouped report can show both counts next to a total, making incomplete measurements visible.",
        diagram: demo([
          [
            "Order counts",
            "SELECT item, COUNT(*) AS orders FROM orders GROUP BY item ORDER BY item;",
          ],
          [
            "Known amount counts",
            "SELECT item, COUNT(*) AS orders, COUNT(amount) AS known_amounts FROM orders GROUP BY item ORDER BY item;",
          ],
        ]),
        sourceId: "sqlite-aggregate",
      },
      {
        title: "Filter totals with HAVING",
        text: "HAVING tests a completed group. HAVING SUM(amount) >= 100 keeps only Desk. Raising the threshold to 200 leaves no groups. WHERE cannot replace this group-total test: it operates on individual input rows before the grouping.",
        diagram: demo([
          [
            "Total at least 100",
            "SELECT item, SUM(amount) AS total FROM orders GROUP BY item HAVING SUM(amount) >= 100 ORDER BY item;",
          ],
          [
            "Total at least 200",
            "SELECT item, SUM(amount) AS total FROM orders GROUP BY item HAVING SUM(amount) >= 200 ORDER BY item;",
          ],
        ]),
      },
      {
        title: "Define the eligible rows first",
        text: "WHERE status = 'paid' removes pending orders before groups are made. The resulting item report contains Book and Desk only. HAVING can then keep groups whose paid total reaches a threshold. Read the row filter and group filter separately.",
        diagram: demo([
          [
            "Every status",
            "SELECT item, SUM(amount) AS total FROM orders GROUP BY item ORDER BY item;",
          ],
          [
            "Paid total at least 50",
            "SELECT item, SUM(amount) AS total FROM orders WHERE status = 'paid' GROUP BY item HAVING SUM(amount) >= 50 ORDER BY item;",
          ],
        ]),
      },
    ],
    questions: [
      number(
        "How many result rows does GROUP BY item produce in the original data?",
        3,
        "There are three item groups: Book, Desk and Lamp.",
        ["Identify different item names.", "One result row represents one item group."],
      ),
      number(
        "Within the Lamp group, what is COUNT(amount)?",
        1,
        "Only order 104 has a known Lamp amount; order 106 is NULL.",
        ["COUNT(column) counts known values.", "Compare the two Lamp amount cells."],
        "sqlite-aggregate",
      ),
      termQuestion(
        "Name the SQL clause that can filter groups on SUM(amount).",
        "HAVING",
        "The total exists after the rows are grouped.",
      ),
      number(
        "After WHERE status = 'paid', what is the Desk group's SUM(amount)?",
        160,
        "Paid Desk orders 101 and 103 have amounts 80 and 80; their total is 160.",
        ["Keep only paid Desk orders.", "Add the two eligible amounts."],
        "sqlite-aggregate",
      ),
      number(
        "How many item groups survive HAVING SUM(amount) >= 40 in the original data?",
        3,
        "Book is 40, Desk is 160 and Lamp is 40. All three meet the inclusive threshold.",
        ["Compute each group total first.", "The threshold includes totals equal to forty."],
      ),
      choose(
        "What does WHERE status = 'paid' change in a grouped query?",
        [
          "It filters the finished totals",
          "It filters individual rows before grouping",
          "It renames the status column",
        ],
        1,
        "WHERE defines the rows supplied to the groups.",
      ),
    ],
    cards: [
      numericCard(
        "Rows are A: 10, A: 30, B: 15. What is SUM(value) for group A?",
        40,
        "Group A contains 10 and 30, whose total is 40.",
      ),
      termCard(
        "Which SQL clause filters groups after aggregation?",
        "HAVING",
        "HAVING applies to groups. WHERE applies to individual input rows.",
      ),
    ],
  },
];
