import {
  choose,
  demo,
  extraCustomer,
  number,
  numericCard,
  termCard,
  termQuestion,
  type SqlLesson,
} from "./definition.js";

export const readingLessons: SqlLesson[] = [
  {
    id: "rows-and-keys",
    title: "Know what a row represents",
    summary:
      "Identify the thing each table row represents and keep missing values distinct from zero.",
    moduleId: "sql-reading",
    sourceId: "sqlite-tables",
    beats: [
      {
        title: "One row, one thing",
        text: "The customers table has one row per person. The orders table has one row per order. Ada appears once as a customer and twice through customer_id in orders. Repeating a customer reference does not duplicate an order.",
        diagram: demo(
          [
            ["Customers", "SELECT id, name FROM customers ORDER BY id;"],
            ["Orders", "SELECT id, customer_id FROM orders ORDER BY id;"],
          ],
          ["customers", "orders"],
        ),
        sourceId: "sqlite-select",
      },
      {
        title: "Use the identifier",
        text: "A primary key identifies a row uniquely. These tables use id for that purpose. orders.customer_id points to a customer; it can repeat because one customer can place several orders. Switch between Ada and Ben to follow their order references.",
        diagram: demo([
          ["Ada's orders", "SELECT id, item FROM orders WHERE customer_id = 1 ORDER BY id;"],
          ["Ben's orders", "SELECT id, item FROM orders WHERE customer_id = 2 ORDER BY id;"],
        ]),
      },
      {
        title: "Missing is a separate state",
        text: "Order 106 has no known amount. SQL represents that missing value as NULL. Recording zero would make a different claim: that the amount is known to be zero. These examples use numbers for amounts and text for names, items and dates.",
        diagram: demo([
          ["Unknown amount", "SELECT id, amount FROM orders WHERE amount IS NULL ORDER BY id;"],
          ["Known amounts", "SELECT id, amount FROM orders WHERE amount IS NOT NULL ORDER BY id;"],
        ]),
        sourceId: "sqlite-expr",
      },
      {
        title: "A customer can have no order",
        text: "Elm has joined the customers table without placing an order. Compare the two counts. Creating a customer row changes the customer count; it does not create an order. The unit represented by a row determines what a count means.",
        diagram: demo(
          [
            ["Count customers", "SELECT COUNT(*) AS customer_count FROM customers;"],
            ["Count orders", "SELECT COUNT(*) AS order_count FROM orders;"],
          ],
          ["customers", "orders"],
          extraCustomer(),
        ),
        sourceId: "sqlite-aggregate",
      },
    ],
    questions: [
      termQuestion(
        "Name the table that has one row per order.",
        "orders",
        "Follow the thing each id identifies.",
        "sqlite-select",
      ),
      number(
        "How many orders in the original data reference customer_id = 1?",
        2,
        "Orders 101 and 102 reference customer 1; there are two.",
        ["Read customer_id, not the order's id.", "Count the rows with customer_id = 1."],
        "sqlite-select",
      ),
      choose(
        "The amount for order 106 is unknown. Which value records that?",
        ["0", "NULL", "An empty order table"],
        1,
        "Unknown and known to be zero make different claims.",
        "sqlite-expr",
      ),
      number(
        "In the Elm example, how many rows are in customers?",
        5,
        "The four original customers plus Elm make five customer rows.",
        ["Elm adds one customer row.", "Start with four customers and add the new person."],
        "sqlite-aggregate",
      ),
      number(
        "Three customers each place two orders. How many rows should a one-row-per-order table have?",
        6,
        "Three customers times two orders each makes six order rows.",
        [
          "Count orders rather than people.",
          "Multiply the number of people by the orders per person.",
        ],
        "sqlite-select",
      ),
      choose(
        "Which column can repeat without making an order id ambiguous?",
        ["orders.id, the primary key", "orders.customer_id", "Neither column"],
        1,
        "Several orders can refer to the same customer.",
      ),
    ],
    cards: [
      numericCard(
        "A shop has four customers. Two customers place three orders each; the other two place none. How many order rows are there?",
        6,
        "There are six order rows: two customers × three orders.",
      ),
      termCard(
        "What is the name for a constraint that identifies each row uniquely?",
        "primary key",
        "A primary key identifies a table row uniquely. A reference to that key may repeat in another table.",
      ),
    ],
  },
  {
    id: "select-and-name",
    title: "Choose the columns you need",
    summary: "Use SELECT and aliases to shape a result without changing the stored table.",
    moduleId: "sql-reading",
    sourceId: "sqlite-select",
    beats: [
      {
        title: "Select the useful fields",
        text: "SELECT chooses the columns in a result. FROM names the input table. Compare all fields with just id and amount: both queries return the six orders, but the second result is two columns wide. The stored orders table stays the same.",
        diagram: demo([
          ["All fields", "SELECT * FROM orders ORDER BY id;"],
          ["Id and amount", "SELECT id, amount FROM orders ORDER BY id;"],
        ]),
      },
      {
        title: "Name the result",
        text: "AS gives a result column an alias. amount AS price prints the same values under the name price. It does not rename amount in the input table. An alias helps readers understand a report without changing its source.",
        diagram: demo([
          ["Original name", "SELECT id, amount FROM orders ORDER BY id;"],
          ["Report name", "SELECT id, amount AS price FROM orders ORDER BY id;"],
        ]),
      },
      {
        title: "Compute a new column",
        text: "A SELECT expression can calculate a value for each row. amount * 2 AS doubled multiplies each known amount by two. NULL stays NULL here: an unknown amount does not become a known number because it was multiplied.",
        diagram: demo([
          ["Original amounts", "SELECT id, amount FROM orders ORDER BY id;"],
          ["Double each amount", "SELECT id, amount * 2 AS doubled FROM orders ORDER BY id;"],
        ]),
        sourceId: "sqlite-expr",
      },
      {
        title: "Change the expression",
        text: "Changing * 2 to + 10 asks a different question. Compare the two expressions for order 102, whose amount is 20. The first scales the amount; the second adds a fixed amount. The alias describes what each result means.",
        diagram: demo([
          ["Multiply by two", "SELECT id, amount * 2 AS doubled FROM orders WHERE id = 102;"],
          ["Add ten", "SELECT id, amount + 10 AS increased FROM orders WHERE id = 102;"],
        ]),
        sourceId: "sqlite-expr",
      },
    ],
    questions: [
      number(
        "How many columns does SELECT id, amount FROM orders return?",
        2,
        "The SELECT list names id and amount: two columns.",
        ["Count names in the SELECT list.", "Rows and columns measure different things."],
      ),
      choose(
        "What does amount AS price change?",
        [
          "The values stored in amount",
          "The heading in the query result",
          "The number of input orders",
        ],
        1,
        "An alias belongs to the result.",
      ),
      number(
        "Order 101 has amount 80. What is amount * 2?",
        160,
        "80 × 2 = 160.",
        ["Apply the expression to the row's amount.", "Multiply 80 by two."],
        "sqlite-expr",
      ),
      number(
        "Order 102 has amount 20. What is amount + 10?",
        30,
        "20 + 10 = 30.",
        ["This expression adds a fixed amount.", "Add ten to twenty."],
        "sqlite-expr",
      ),
      number(
        "An amount is 15. What would SELECT amount * 3 AS tripled return for that row?",
        45,
        "15 × 3 = 45.",
        [
          "AS names the column; the multiplication produces the value.",
          "Multiply fifteen by three.",
        ],
        "sqlite-expr",
      ),
      termQuestion(
        "After SELECT amount AS price, type the column name that remains in the stored table.",
        "amount",
        "SELECT reads the table; this alias does not alter its schema.",
      ),
    ],
    cards: [
      numericCard(
        "A row contains amount = 12. What value does amount + 8 AS adjusted produce?",
        20,
        "The expression produces 20. adjusted is its result heading.",
      ),
      termCard(
        "Which keyword gives a result column an explicit alias?",
        "AS",
        "AS names a result column, as in amount AS price.",
      ),
    ],
  },
  {
    id: "filter-the-rows",
    title: "Write the condition you mean",
    summary: "Use SQL conditions to select exactly the rows your question requires.",
    moduleId: "sql-reading",
    sourceId: "sqlite-expr",
    beats: [
      {
        title: "Keep rows that pass",
        text: "WHERE keeps rows whose condition is true. amount >= 40 keeps 101, 103 and 104; amount >= 80 keeps only the two 80 amounts. The NULL amount does not satisfy either comparison. Increase the threshold and observe which rows leave.",
        diagram: demo([
          ["At least 40", "SELECT id, amount FROM orders WHERE amount >= 40 ORDER BY id;"],
          ["At least 80", "SELECT id, amount FROM orders WHERE amount >= 80 ORDER BY id;"],
        ]),
      },
      {
        title: "Both conditions or either",
        text: "AND requires both conditions. paid AND amount >= 40 keeps two rows. OR accepts either condition, so paid OR amount >= 40 also includes the smaller paid orders and pending order 104. Parentheses make the intended grouping clear in longer conditions.",
        diagram: demo([
          [
            "Both conditions",
            "SELECT id, amount, status FROM orders WHERE status = 'paid' AND amount >= 40 ORDER BY id;",
          ],
          [
            "Either condition",
            "SELECT id, amount, status FROM orders WHERE status = 'paid' OR amount >= 40 ORDER BY id;",
          ],
        ]),
      },
      {
        title: "Decide on the boundaries",
        text: "BETWEEN 20 AND 40 includes both 20 and 40. The open interval amount > 20 AND amount < 40 includes neither boundary, leaving no rows in this dataset. Inclusive and exclusive comparisons describe different sets.",
        diagram: demo([
          [
            "Include 20 and 40",
            "SELECT id, amount FROM orders WHERE amount BETWEEN 20 AND 40 ORDER BY id;",
          ],
          [
            "Exclude 20 and 40",
            "SELECT id, amount FROM orders WHERE amount > 20 AND amount < 40 ORDER BY id;",
          ],
        ]),
      },
      {
        title: "Match a set or a pattern",
        text: "IN ('Book', 'Lamp') keeps either named item. LIKE 'B%' keeps item names beginning with B; % can stand for zero or more characters. Here that finds the Book orders. Use IS NULL to find a missing amount; amount = NULL does not test missingness.",
        diagram: demo([
          [
            "Book or Lamp",
            "SELECT id, item FROM orders WHERE item IN ('Book', 'Lamp') ORDER BY id;",
          ],
          ["Starts with B", "SELECT id, item FROM orders WHERE item LIKE 'B%' ORDER BY id;"],
          ["Missing amount", "SELECT id, amount FROM orders WHERE amount IS NULL ORDER BY id;"],
        ]),
      },
    ],
    questions: [
      number(
        "How many orders satisfy amount >= 40?",
        3,
        "Orders 101, 103 and 104 satisfy the comparison; 106 has a missing amount.",
        ["Read only known amounts.", "Include the boundary amount 40."],
      ),
      number(
        "How many orders satisfy status = 'paid' AND amount >= 40?",
        2,
        "Only paid orders 101 and 103 also have amount at least 40.",
        [
          "Each row must satisfy both tests.",
          "Exclude pending 104 and the two smaller paid orders.",
        ],
      ),
      choose(
        "Which values can pass amount BETWEEN 20 AND 40?",
        [
          "Only values strictly between 20 and 40",
          "Values from 20 through 40, including both ends",
          "Every value greater than 20",
        ],
        1,
        "BETWEEN includes its two boundaries.",
      ),
      number(
        "How many orders have item IN ('Book', 'Lamp')?",
        4,
        "Two Book orders and two Lamp orders make four.",
        [
          "An item can match either value in the list.",
          "The missing amount does not stop its item from being Lamp.",
        ],
      ),
      number(
        "How many orders satisfy amount > 20 AND amount < 80?",
        1,
        "Only order 104 has amount 40; the 20 and 80 boundaries are excluded.",
        ["Both inequalities are strict.", "Count known amounts strictly between the boundaries."],
      ),
      choose(
        "Which condition finds an unknown amount?",
        ["amount = NULL", "amount IS NULL", "amount = 0"],
        1,
        "SQL provides a missing-value predicate.",
      ),
    ],
    cards: [
      numericCard(
        "Values are 10, 20, 30 and NULL. How many satisfy value BETWEEN 10 AND 20?",
        2,
        "10 and 20 satisfy the inclusive range. NULL does not make the comparison true.",
      ),
      termCard(
        "Which SQL predicate tests that a value is missing?",
        "IS NULL",
        "IS NULL tests missingness. Comparing with = NULL does not.",
      ),
    ],
  },
  {
    id: "sort-and-limit",
    title: "Make the first row meaningful",
    summary: "Use a deterministic order to decide which rows a limited result retains.",
    moduleId: "sql-reading",
    sourceId: "sqlite-select",
    beats: [
      {
        title: "Order is an instruction",
        text: "A table's apparent display order is not a promised query order. ORDER BY id ASC asks for increasing ids; DESC reverses them. Both results contain the same orders. Use an explicit order whenever first, last or next matters.",
        diagram: demo([
          ["Increasing ids", "SELECT id, amount FROM orders ORDER BY id ASC;"],
          ["Decreasing ids", "SELECT id, amount FROM orders ORDER BY id DESC;"],
        ]),
      },
      {
        title: "Break a tie",
        text: "Two known amounts are 80. ORDER BY amount DESC, id ASC puts 101 before 103. Reversing the id tie-breaker puts 103 first. Ordering by amount alone would leave their relative order unspecified. This example filters out the missing amount before sorting.",
        diagram: demo([
          [
            "Lower id wins ties",
            "SELECT id, amount FROM orders WHERE amount IS NOT NULL ORDER BY amount DESC, id ASC;",
          ],
          [
            "Higher id wins ties",
            "SELECT id, amount FROM orders WHERE amount IS NOT NULL ORDER BY amount DESC, id DESC;",
          ],
        ]),
      },
      {
        title: "Take the top rows",
        text: "LIMIT caps the number of result rows. With amount descending and id ascending, LIMIT 2 returns the two 80 orders. LIMIT 3 adds the 40 order. A limit without a meaningful order does not establish which records are the largest.",
        diagram: demo([
          [
            "Top two",
            "SELECT id, amount FROM orders WHERE amount IS NOT NULL ORDER BY amount DESC, id ASC LIMIT 2;",
          ],
          [
            "Top three",
            "SELECT id, amount FROM orders WHERE amount IS NOT NULL ORDER BY amount DESC, id ASC LIMIT 3;",
          ],
        ]),
      },
      {
        title: "Filter before selecting the top",
        text: "WHERE first defines the eligible orders. Sorting the paid orders from smallest amount upward gives 102, 105, 101, 103. LIMIT 2 then keeps the two smallest paid orders. Changing DESC selects the largest paid orders instead.",
        diagram: demo([
          [
            "Smallest paid",
            "SELECT id, amount FROM orders WHERE status = 'paid' ORDER BY amount ASC, id ASC LIMIT 2;",
          ],
          [
            "Largest paid",
            "SELECT id, amount FROM orders WHERE status = 'paid' ORDER BY amount DESC, id ASC LIMIT 2;",
          ],
        ]),
      },
    ],
    questions: [
      choose(
        "What promises that the result uses increasing order ids?",
        ["The physical table layout", "ORDER BY id ASC", "SELECT * by itself"],
        1,
        "Ordering must be part of the query.",
      ),
      number(
        "With ORDER BY amount DESC, id ASC over known amounts, which id appears first?",
        101,
        "The maximum amount is 80; the lower of its two order ids is 101.",
        ["Compare amounts before ids.", "Use increasing id to break the 80 tie."],
      ),
      number(
        "What is the sum of the amounts in the top three known orders by amount descending?",
        200,
        "80 + 80 + 40 = 200.",
        ["Take the three largest known amounts.", "Add both 80 amounts and the 40 amount."],
      ),
      choose(
        "WHERE status = 'paid' ORDER BY amount ASC, id ASC LIMIT 2 selects which set?",
        [
          "The two smallest paid orders",
          "The two largest paid orders",
          "The first two rows stored on disk",
        ],
        0,
        "Read the filter, direction and limit together.",
      ),
      number(
        "How many rows can LIMIT 10 return when only four rows satisfy WHERE?",
        4,
        "A limit does not create records; the result contains the four eligible rows.",
        ["LIMIT is an upper bound.", "There are only four eligible rows."],
      ),
      choose(
        "Two rows tie on amount. How do you make their order deterministic?",
        ["Add a unique id as a tie-breaker", "Remove ORDER BY", "Use LIMIT 1 without sorting"],
        0,
        "A unique secondary sort key separates the tied rows.",
      ),
    ],
    cards: [
      numericCard(
        "A descending result contains amounts 90, 40 and 10. What total remains after LIMIT 2?",
        130,
        "LIMIT 2 keeps 90 and 40, whose sum is 130.",
      ),
      termCard(
        "Which clause explicitly specifies the order of result rows?",
        "ORDER BY",
        "ORDER BY establishes result ordering; add a unique tie-breaker when ties matter.",
      ),
    ],
  },
];
