import {
  choose,
  demo,
  number,
  numericCard,
  tables,
  termCard,
  termQuestion,
  type SqlLesson,
} from "./definition.js";
const guestData = tables.map((table) =>
  table.name === "orders"
    ? { ...table, rows: [...table.rows, [107, null, "Mug", 30, "paid", "2026-09-04"]] }
    : table,
);

export const combiningLessons: SqlLesson[] = [
  {
    id: "join-matching-rows",
    title: "Follow a relationship between tables",
    summary: "Join keys deliberately and account for every matching pair.",
    moduleId: "sql-combining",
    sourceId: "sqlite-select",
    beats: [
      {
        title: "Bring the name to the order",
        text: "Orders store customer_id; customers store the person's name. JOIN customers ON customers.id = orders.customer_id pairs each order with its customer. Ada's two orders produce two rows. The result still represents orders, now with names attached.",
        diagram: demo(
          [
            ["Order references", "SELECT id, customer_id FROM orders ORDER BY id;"],
            [
              "Names attached",
              "SELECT o.id, c.name, o.amount FROM orders AS o JOIN customers AS c ON c.id = o.customer_id ORDER BY o.id;",
            ],
          ],
          ["customers", "orders"],
        ),
      },
      {
        title: "The matches set the count",
        text: "An INNER JOIN retains matching pairs. Dee has no order, so she has no row in this result. Selecting DISTINCT c.name changes the report to customers who ordered, leaving Ada, Ben and Cy. Choose the result's unit before interpreting its count.",
        diagram: demo(
          [
            [
              "One row per match",
              "SELECT c.name, o.id FROM customers AS c JOIN orders AS o ON c.id = o.customer_id ORDER BY o.id;",
            ],
            [
              "Customers who ordered",
              "SELECT DISTINCT c.name FROM customers AS c JOIN orders AS o ON c.id = o.customer_id ORDER BY c.name;",
            ],
          ],
          ["customers", "orders"],
        ),
      },
      {
        title: "A missing condition multiplies rows",
        text: "CROSS JOIN pairs every customer with every order. Four customers and six orders make 24 pairs. That is useful for some combinations, but it does not mean all those people placed those orders. Compare it with the key-based join.",
        diagram: demo(
          [
            [
              "Match the reference",
              "SELECT c.name, o.id FROM customers AS c JOIN orders AS o ON c.id = o.customer_id ORDER BY c.id, o.id;",
            ],
            [
              "Every possible pair",
              "SELECT c.name, o.id FROM customers AS c CROSS JOIN orders AS o ORDER BY c.id, o.id;",
            ],
          ],
          ["customers", "orders"],
        ),
      },
      {
        title: "Join first, then select the report",
        text: "A relationship predicate compares the customer's key with the order's customer reference. Comparing customers.id to orders.id is a different condition and finds no matches here. After a correct join, a row filter can keep only paid orders.",
        diagram: demo(
          [
            [
              "Paid matched orders",
              "SELECT c.name, o.id FROM customers AS c JOIN orders AS o ON c.id = o.customer_id WHERE o.status = 'paid' ORDER BY o.id;",
            ],
            [
              "Wrong columns",
              "SELECT c.name, o.id FROM customers AS c JOIN orders AS o ON c.id = o.id ORDER BY o.id;",
            ],
          ],
          ["customers", "orders"],
        ),
      },
    ],
    questions: [
      number(
        "How many rows does the correct customers-to-orders INNER JOIN return in the original data?",
        6,
        "Each of the six orders references one existing customer, so there are six matching pairs.",
        [
          "Count matches, not different names.",
          "Ada, Ben and Cy each contribute two order matches.",
        ],
      ),
      choose(
        "Why is Dee absent from the INNER JOIN result?",
        [
          "Her name is too short",
          "She has no matching order",
          "INNER JOIN keeps only the first customer",
        ],
        1,
        "An inner join requires a match.",
      ),
      number(
        "How many pairs does CROSS JOIN produce for four customers and six orders?",
        24,
        "Every customer pairs with every order: 4 × 6 = 24.",
        ["For each customer, include every order.", "Multiply the table sizes."],
      ),
      choose(
        "Which predicate follows the stored relationship?",
        ["c.id = o.id", "c.id = o.customer_id", "c.name = o.item"],
        1,
        "The order's customer_id refers to the customer's id.",
      ),
      number(
        "Customers A, B and C have two, zero and one orders respectively. How many rows does their INNER JOIN return?",
        3,
        "The matching pairs total 2 + 0 + 1 = 3.",
        ["An unmatched customer contributes no inner-join row.", "Add the order matches."],
      ),
      choose(
        "Why can a customer's name repeat in a correctly joined result?",
        [
          "A person can match several orders",
          "JOIN always duplicates every row twice",
          "Names cannot be selected in SQL",
        ],
        0,
        "A one-to-many relationship creates one row for each match.",
      ),
    ],
    cards: [
      numericCard(
        "Two customers each have four orders. Joining customers to their orders gives how many matching rows?",
        8,
        "There are eight matching pairs: two customers × four orders.",
      ),
      termCard(
        "Which join keeps only pairs that satisfy its matching condition?",
        "INNER JOIN",
        "INNER JOIN returns matching pairs; unmatched rows are not retained.",
      ),
    ],
  },
  {
    id: "preserve-the-left-table",
    title: "Keep the customers with no orders",
    summary: "Preserve unmatched customers without counting them as orders.",
    moduleId: "sql-combining",
    sourceId: "sqlite-select",
    beats: [
      {
        title: "Keep the left-hand row",
        text: "LEFT JOIN retains every customer. The six order matches remain, and Dee adds one row with NULL order fields. Those NULL fields mean no order matched; they do not describe an order with a missing amount.",
        diagram: demo(
          [
            [
              "Only matches",
              "SELECT c.name, o.id, o.amount FROM customers AS c JOIN orders AS o ON c.id = o.customer_id ORDER BY c.id, o.id;",
            ],
            [
              "Keep every customer",
              "SELECT c.name, o.id, o.amount FROM customers AS c LEFT JOIN orders AS o ON c.id = o.customer_id ORDER BY c.id, o.id;",
            ],
          ],
          ["customers", "orders"],
        ),
      },
      {
        title: "Count the matched key",
        text: "After a left join, COUNT(*) includes Dee's retained row and would report one. COUNT(o.id) counts actual matched orders and reports zero for Dee. The order key is present on every matched order, even when its amount is missing.",
        diagram: demo(
          [
            [
              "Count joined rows",
              "SELECT c.name, COUNT(*) AS rows FROM customers AS c LEFT JOIN orders AS o ON c.id = o.customer_id GROUP BY c.id, c.name ORDER BY c.id;",
            ],
            [
              "Count matched orders",
              "SELECT c.name, COUNT(o.id) AS orders FROM customers AS c LEFT JOIN orders AS o ON c.id = o.customer_id GROUP BY c.id, c.name ORDER BY c.id;",
            ],
          ],
          ["customers", "orders"],
        ),
        sourceId: "sqlite-aggregate",
      },
      {
        title: "A WHERE filter can remove the retained row",
        text: "WHERE o.status = 'paid' is tested after the join. Dee's NULL status does not pass, so her row disappears. Putting the paid test in ON limits which orders match while still preserving every customer. Compare the two result sets.",
        diagram: demo(
          [
            [
              "Paid test in WHERE",
              "SELECT c.name, o.id FROM customers AS c LEFT JOIN orders AS o ON c.id = o.customer_id WHERE o.status = 'paid' ORDER BY c.id, o.id;",
            ],
            [
              "Paid test in ON",
              "SELECT c.name, o.id FROM customers AS c LEFT JOIN orders AS o ON c.id = o.customer_id AND o.status = 'paid' ORDER BY c.id, o.id;",
            ],
          ],
          ["customers", "orders"],
        ),
      },
      {
        title: "Find the absence itself",
        text: "WHERE o.id IS NULL selects customers with no matched order. Here it finds Dee. Testing o.amount IS NULL would also find Cy's actual order 106, whose amount is unknown. Use a guaranteed matched key when you mean no relationship exists.",
        diagram: demo(
          [
            [
              "No matching order",
              "SELECT c.name, o.id FROM customers AS c LEFT JOIN orders AS o ON c.id = o.customer_id WHERE o.id IS NULL ORDER BY c.id;",
            ],
            [
              "No known amount",
              "SELECT c.name, o.id, o.amount FROM customers AS c LEFT JOIN orders AS o ON c.id = o.customer_id WHERE o.amount IS NULL ORDER BY c.id, o.id;",
            ],
          ],
          ["customers", "orders"],
        ),
        sourceId: "sqlite-expr",
      },
    ],
    questions: [
      number(
        "How many rows does the original customers LEFT JOIN orders return?",
        7,
        "Six matched order rows plus Dee's unmatched customer row make seven.",
        ["Keep each order match.", "Add one row for the customer with no match."],
      ),
      number(
        "For Dee's group, what does COUNT(o.id) return after the LEFT JOIN?",
        0,
        "Dee has no matched order id, so COUNT(o.id) is zero.",
        ["COUNT(column) ignores NULL.", "The retained customer row has a NULL order id."],
        "sqlite-aggregate",
      ),
      choose(
        "Where should o.status = 'paid' go if every customer must remain?",
        ["In ON as a matching condition", "In WHERE as the only row filter", "In the SELECT alias"],
        0,
        "Preserve the customer while restricting which orders match.",
      ),
      choose(
        "Which predicate identifies customers with no matched order?",
        ["o.amount IS NULL", "o.id IS NULL", "o.status = 'paid'"],
        1,
        "An actual order can have a missing amount.",
        "sqlite-expr",
      ),
      number(
        "How many rows remain with the paid test in ON for the original data?",
        5,
        "Ada has two paid orders, Ben one and Cy one; Dee remains once with no match. Total: five.",
        [
          "Count paid matches for each customer.",
          "Retain one row for Dee even without a paid match.",
        ],
      ),
      number(
        "How many rows pass o.amount IS NULL after the original LEFT JOIN?",
        2,
        "Cy's order 106 and Dee's unmatched customer row both have NULL amounts.",
        [
          "A missing amount is not the same as no order.",
          "Inspect both the real missing amount and the unmatched customer.",
        ],
        "sqlite-expr",
      ),
    ],
    cards: [
      numericCard(
        "Customers A and B have two and zero orders. How many rows does customers LEFT JOIN orders return?",
        3,
        "A contributes two matching rows; B contributes one unmatched row. Total: three.",
      ),
      termCard(
        "Which join preserves all rows from its left-hand table?",
        "LEFT JOIN",
        "LEFT JOIN preserves left-hand rows, filling right-hand fields with NULL when no match exists.",
      ),
    ],
  },
  {
    id: "preserve-either-side",
    title: "Keep unmatched rows on either side",
    summary:
      "Compare RIGHT JOIN and FULL OUTER JOIN with a guest order that has no customer reference.",
    moduleId: "sql-combining",
    sourceId: "sqlite-select",
    beats: [
      {
        title: "Which side stays?",
        text: "A new guest order 107 has a NULL customer reference. LEFT JOIN preserves customers, including Dee, but omits that unmatched order. RIGHT JOIN preserves orders, including the guest order, but omits Dee. Both results have seven rows here, yet they represent different records.",
        diagram: demo(
          [
            [
              "Preserve customers",
              "SELECT c.name, o.id FROM customers AS c LEFT JOIN orders AS o ON c.id = o.customer_id ORDER BY o.id, c.id;",
            ],
            [
              "Preserve orders",
              "SELECT c.name, o.id FROM customers AS c RIGHT JOIN orders AS o ON c.id = o.customer_id ORDER BY o.id, c.id;",
            ],
          ],
          ["customers", "orders"],
          guestData,
        ),
      },
      {
        title: "Keep both unmatched records",
        text: "FULL OUTER JOIN retains the six matched orders, Dee's customer-only row and the guest order's order-only row. Its eight rows include both kinds of absence. The matching condition still decides which rows can be paired.",
        diagram: demo(
          [
            [
              "Matches only",
              "SELECT c.name, o.id FROM customers AS c INNER JOIN orders AS o ON c.id = o.customer_id ORDER BY o.id, c.id;",
            ],
            [
              "Preserve both sides",
              "SELECT c.name, o.id FROM customers AS c FULL OUTER JOIN orders AS o ON c.id = o.customer_id ORDER BY o.id, c.id;",
            ],
          ],
          ["customers", "orders"],
          guestData,
        ),
      },
      {
        title: "Inspect the missing side",
        text: "In this full join, o.id IS NULL finds Dee's customer-only row. c.id IS NULL finds the guest order, which has no matching customer. Compare the tests. A row count alone cannot tell you which side of a relationship is absent.",
        diagram: demo(
          [
            [
              "Customer without order",
              "SELECT c.name, o.id FROM customers AS c FULL OUTER JOIN orders AS o ON c.id = o.customer_id WHERE o.id IS NULL ORDER BY c.id;",
            ],
            [
              "Order without customer",
              "SELECT c.name, o.id FROM customers AS c FULL OUTER JOIN orders AS o ON c.id = o.customer_id WHERE c.id IS NULL ORDER BY o.id;",
            ],
          ],
          ["customers", "orders"],
          guestData,
        ),
      },
      {
        title: "Restrict matches without hiding the rest",
        text: "Adding o.status = 'paid' to a full join's ON clause means only paid orders can match a customer. Pending orders 104 and 106 still remain as unmatched order rows, alongside the guest order. FULL preserves both sides even when an ON condition fails.",
        diagram: demo(
          [
            [
              "Match every status",
              "SELECT c.name, o.id, o.status FROM customers AS c FULL OUTER JOIN orders AS o ON c.id = o.customer_id WHERE c.id IS NULL ORDER BY o.id;",
            ],
            [
              "Only paid matches",
              "SELECT c.name, o.id, o.status FROM customers AS c FULL OUTER JOIN orders AS o ON c.id = o.customer_id AND o.status = 'paid' WHERE c.id IS NULL ORDER BY o.id;",
            ],
          ],
          ["customers", "orders"],
          guestData,
        ),
      },
    ],
    questions: [
      choose(
        "customers RIGHT JOIN orders preserves which unmatched row?",
        [
          "Dee, who has no order",
          "Guest order 107, which has no customer reference",
          "Neither unmatched row",
        ],
        1,
        "RIGHT preserves the right-hand orders table.",
      ),
      number(
        "How many rows does the FULL OUTER JOIN return with the added guest order?",
        8,
        "Six matching pairs plus Dee's unmatched row plus the guest order make eight.",
        [
          "Keep both kinds of unmatched row.",
          "Do not pair Dee with the guest order; their keys do not match.",
        ],
      ),
      choose(
        "In that full join, c.id IS NULL identifies which case?",
        [
          "An order without a matched customer",
          "A customer without an order",
          "An order with amount zero",
        ],
        0,
        "Inspect the side named by the missing key.",
      ),
      number(
        "With the paid test in ON, how many unmatched order rows pass c.id IS NULL?",
        3,
        "Pending orders 104 and 106 do not match under that ON condition; guest order 107 also has no customer match.",
        [
          "A failed ON test does not remove a preserved order.",
          "Count both pending orders and the guest order.",
        ],
      ),
      number(
        "A contains ids 1, 2, 3. B contains ids 2, 4. Each id appears once. How many rows does A FULL JOIN B ON A.id = B.id return?",
        4,
        "Id 2 matches; ids 1 and 3 remain from A; id 4 remains from B. Total: four.",
        ["Count the matching pair once.", "Retain all three unmatched ids."],
      ),
      choose(
        "Can two joins have the same row count but retain different records?",
        [
          "Yes; compare which side is preserved",
          "No; equal counts prove equal results",
          "Only when every key is duplicated",
        ],
        0,
        "LEFT and RIGHT each returned seven here, but their unmatched rows differ.",
      ),
    ],
    cards: [
      numericCard(
        "A has ids 1 and 2; B has ids 2 and 3. Ids are unique. How many rows does a full join on equal ids return?",
        3,
        "The matching id 2 appears once; unmatched ids 1 and 3 remain. Total: three.",
      ),
      termCard(
        "Which join preserves unmatched rows from both input tables?",
        "FULL OUTER JOIN",
        "FULL OUTER JOIN preserves matching pairs and unmatched rows from either side.",
      ),
    ],
  },
  {
    id: "ask-a-query-inside-a-query",
    title: "Use one query to define another",
    summary: "Use scalar subqueries, IN and EXISTS without multiplying the outer result.",
    moduleId: "sql-combining",
    sourceId: "sqlite-expr",
    beats: [
      {
        title: "Compare with a calculated value",
        text: "A subquery can supply a value to an outer condition. AVG(amount) returns 48 for the known amounts. The outer query keeps amounts above that value, finding the two 80 orders. Raising a fixed threshold to 80 instead excludes those equal amounts.",
        diagram: demo([
          [
            "Above the average",
            "SELECT id, amount FROM orders WHERE amount > (SELECT AVG(amount) FROM orders) ORDER BY id;",
          ],
          ["Strictly above 80", "SELECT id, amount FROM orders WHERE amount > 80 ORDER BY id;"],
        ]),
      },
      {
        title: "Use a returned set",
        text: "The customer subquery returns ids in the North region: 1 and 3. IN uses that set to select their orders. A different subquery can select South instead. The outer result remains one row per qualifying order, including an order with a missing amount.",
        diagram: demo(
          [
            [
              "North customers' orders",
              "SELECT id, customer_id, amount FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE region = 'North') ORDER BY id;",
            ],
            [
              "South customers' orders",
              "SELECT id, customer_id, amount FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE region = 'South') ORDER BY id;",
            ],
          ],
          ["customers", "orders"],
        ),
      },
      {
        title: "Ask whether a match exists",
        text: "EXISTS is true if the subquery returns at least one row. This correlated subquery checks orders for each current customer. Ada has two matches, but the outer customers query returns her once. NOT EXISTS finds Dee, who has no orders.",
        diagram: demo(
          [
            [
              "At least one order",
              "SELECT c.id, c.name FROM customers AS c WHERE EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id) ORDER BY c.id;",
            ],
            [
              "No orders",
              "SELECT c.id, c.name FROM customers AS c WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id) ORDER BY c.id;",
            ],
          ],
          ["customers", "orders"],
        ),
      },
      {
        title: "Compare with the appropriate group",
        text: "A correlated average can change with the outer row. Compare each known amount with the average for that same item. Both Desk amounts equal 80 and both Book amounts equal 20; Lamp's only known amount is 40. None is strictly above its own item's average.",
        diagram: demo([
          [
            "Above overall average",
            "SELECT id, item, amount FROM orders WHERE amount > (SELECT AVG(amount) FROM orders) ORDER BY id;",
          ],
          [
            "Above its item average",
            "SELECT o.id, o.item, o.amount FROM orders AS o WHERE o.amount > (SELECT AVG(i.amount) FROM orders AS i WHERE i.item = o.item) ORDER BY o.id;",
          ],
        ]),
      },
    ],
    questions: [
      number(
        "How many orders have amount greater than the original overall AVG(amount)?",
        2,
        "The known average is 48; orders 101 and 103 each have amount 80.",
        ["Calculate the average of known amounts.", "Use a strict greater-than comparison."],
      ),
      number(
        "How many orders belong to North-region customers?",
        4,
        "Customers 1 and 3 are North; each has two orders.",
        ["Find customer ids in North first.", "Count their orders even when an amount is missing."],
      ),
      choose(
        "Why does EXISTS return Ada once even though she has two orders?",
        [
          "The outer query has one row per customer",
          "EXISTS deletes the extra order",
          "EXISTS ignores every second row",
        ],
        0,
        "It tests existence without adding each matching subquery row to the outer result.",
      ),
      number(
        "How many original orders are strictly above the average for their own item?",
        0,
        "Desk amounts equal 80, Book amounts equal 20 and Lamp's known amount equals 40; each equals its item average.",
        [
          "Compare within each item group.",
          "Equality does not pass a strict greater-than condition.",
        ],
      ),
      number(
        "Three customers have zero, one and four orders. How many customers pass EXISTS for an order?",
        2,
        "Two customers have at least one order; the number of matches does not duplicate them.",
        [
          "EXISTS asks whether there is at least one match.",
          "Count customers with a nonzero number of orders.",
        ],
      ),
      termQuestion(
        "What is the term for a subquery that refers to a value from the current outer row?",
        "correlated",
        "Its condition depends on which row the outer query is considering.",
      ),
    ],
    cards: [
      numericCard(
        "Four customers have 0, 2, 3 and 0 orders. How many customers satisfy EXISTS for a related order?",
        2,
        "The two customers with at least one order satisfy EXISTS.",
      ),
      termCard(
        "Which SQL keyword tests whether a subquery returns at least one row?",
        "EXISTS",
        "EXISTS asks whether a result exists; it does not count or join every matching row.",
      ),
    ],
  },
  {
    id: "combine-result-sets",
    title: "Combine reports deliberately",
    summary: "Stack compatible results with UNION or UNION ALL and account for overlapping rows.",
    moduleId: "sql-combining",
    sourceId: "sqlite-select",
    beats: [
      {
        title: "Stack results with the same shape",
        text: "UNION combines compatible SELECT results vertically. The first result lists paid order ids; the second lists ids with amount at least 40. Both select one column. UNION does not attach customer fields to orders as a join would.",
        diagram: demo([
          ["Paid orders", "SELECT id FROM orders WHERE status = 'paid' ORDER BY id;"],
          [
            "Paid or at least 40",
            "SELECT id FROM orders WHERE status = 'paid' UNION SELECT id FROM orders WHERE amount >= 40 ORDER BY id;",
          ],
        ]),
      },
      {
        title: "Decide whether duplicates matter",
        text: "Orders 101 and 103 satisfy both selections. UNION removes repeated result rows and returns five ids. UNION ALL keeps both occurrences and returns seven rows. Repeated results can be useful when occurrences are the thing being counted.",
        diagram: demo([
          [
            "Remove repeated rows",
            "SELECT id FROM orders WHERE status = 'paid' UNION SELECT id FROM orders WHERE amount >= 40 ORDER BY id;",
          ],
          [
            "Keep occurrences",
            "SELECT id FROM orders WHERE status = 'paid' UNION ALL SELECT id FROM orders WHERE amount >= 40 ORDER BY id;",
          ],
        ]),
      },
      {
        title: "Compare the whole result row",
        text: "UNION removes duplicates across all selected columns. Adding a label such as 'paid' or 'large' makes the two occurrences of order 101 different rows. A category label changes the comparison even when the underlying id repeats.",
        diagram: demo([
          [
            "Id only",
            "SELECT id FROM orders WHERE status = 'paid' UNION SELECT id FROM orders WHERE amount >= 40 ORDER BY id;",
          ],
          [
            "Id and selection label",
            "SELECT id, 'paid' AS selection FROM orders WHERE status = 'paid' UNION SELECT id, 'large' AS selection FROM orders WHERE amount >= 40 ORDER BY id, selection;",
          ],
        ]),
      },
      {
        title: "Order the combined result",
        text: "ORDER BY at the end sorts the combined result. LIMIT at the end caps that combined result. With unique ids increasing, LIMIT 3 keeps 101, 102 and 103. Each SELECT in this example contributes the same number of columns.",
        diagram: demo([
          [
            "Combined result",
            "SELECT id FROM orders WHERE status = 'paid' UNION SELECT id FROM orders WHERE amount >= 40 ORDER BY id;",
          ],
          [
            "First three combined ids",
            "SELECT id FROM orders WHERE status = 'paid' UNION SELECT id FROM orders WHERE amount >= 40 ORDER BY id LIMIT 3;",
          ],
        ]),
      },
    ],
    questions: [
      choose(
        "How does UNION combine its inputs?",
        [
          "It stacks compatible result rows",
          "It matches customer keys to order keys",
          "It changes the stored table names",
        ],
        0,
        "UNION combines results vertically; JOIN matches related rows.",
      ),
      number(
        "How many rows does the paid-id query UNION the at-least-40-id query return?",
        5,
        "The unique ids are 101, 102, 103, 104 and 105.",
        [
          "The two result sets overlap on 101 and 103.",
          "Remove repeated ids from the combined result.",
        ],
      ),
      number(
        "How many rows result when UNION also selects the different labels 'paid' and 'large'?",
        7,
        "The four paid rows and three large rows have different labels, so all seven full rows are distinct.",
        [
          "Compare both id and selection label.",
          "An id with a different label is a different result row.",
        ],
      ),
      number(
        "What is the third id after sorting the id-only UNION in increasing order?",
        103,
        "The ordered unique ids start 101, 102, 103.",
        ["Deduplicate before finding the ordered position.", "Use the ORDER BY at the end."],
      ),
      number(
        "Query A returns ids 1, 2, 3. Query B returns 2, 4. How many rows does UNION ALL return?",
        5,
        "UNION ALL retains all three rows from A and both rows from B: five.",
        ["UNION ALL retains overlap.", "Add the sizes of both results."],
      ),
      choose(
        "Which requirement applies to the SELECT results combined by UNION?",
        [
          "They must have the same number of result columns",
          "They must read the same table",
          "They must contain no text",
        ],
        0,
        "Both results must have a compatible shape.",
      ),
    ],
    cards: [
      numericCard(
        "A selects ids 2, 4; B selects ids 4, 6. How many rows does their id-only UNION return?",
        3,
        "The unique result ids are 2, 4 and 6: three rows.",
      ),
      termCard(
        "Which operator combines result sets while retaining duplicate rows?",
        "UNION ALL",
        "UNION ALL keeps every occurrence; UNION removes duplicate full result rows.",
      ),
    ],
  },
];
