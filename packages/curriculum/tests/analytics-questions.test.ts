import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { assessTextAnswer } from "@discere/assessment-engine";
import {
  type CourseBundle,
  ORDER_ANSWER_IDEA,
  type Question,
  SORT_ANSWER_IDEA,
} from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Analytics Engineering and Data Governance follows the way Databases and DevOps ask questions
 * (docs/question-writing-guide.md), adapted to a course about data models, tests and definitions.
 * Questions put a small table, a query, a graph or a scenario in front of the learner and ask for a
 * judgement: which grain a table has and what a join repeats, why two dashboards disagree, which
 * test catches a bug, which slowly changing dimension fits a need, what a lineage change reaches,
 * who owns a definition and how a governance rule applies. Numeric questions stay where the number
 * is the point. Every SQL result quoted in a question is rerun below in SQLite (Node's built-in
 * `node:sqlite`) against the rows the question shows; the dbt behaviour that questions rely on is
 * from the dbt documentation pages on data tests, incremental models, snapshots, model contracts,
 * unit tests and metrics, fetched on 14 November 2026.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/analytics-engineering-and-governance/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const kind = (question: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  question.responseType === "numeric"
    ? "numeric"
    : question.responseType === "order" || question.responseType === "sort"
      ? question.responseType
      : question.choices
        ? "choice"
        : "typed";
const q = (id: string): Question => {
  const found = questions.get(`anaeg-${id}`);
  if (!found) throw new Error(`no question ${id}`);
  return found;
};
const strip = (text: string) => text.replaceAll("`", "");
const allText = (question: Question) =>
  strip(
    [
      question.prompt,
      ...(question.choices ?? []).map((choice) => choice.label),
      ...(question.misconceptions ?? []).map((item) => item.feedback),
      question.onCorrect ?? "",
    ].join("\n"),
  );

// node:sqlite is loaded through require, because Vite does not list it among Node's built-in modules.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (
    path: string,
  ) => {
    exec(sql: string): void;
    prepare(sql: string): { all(...args: unknown[]): Record<string, unknown>[] };
  };
};
type Fixture = {
  setup: string;
  after: string;
  shows: string[];
  queries: { sql: string; rows: (string | number | null)[][] }[];
};
const open = (fixture: Fixture) => {
  const db = new DatabaseSync(":memory:");
  db.exec(fixture.setup);
  if (fixture.after) db.exec(fixture.after);
  return db;
};
const run = (db: ReturnType<typeof open>, sql: string) =>
  db
    .prepare(sql)
    .all()
    .map((row) => Object.values(row));
const literal = (value: unknown) =>
  typeof value === "string" ? `'${value}'` : value === null ? "NULL" : String(value);
const tuple = (row: unknown[]) => `(${row.map(literal).join(", ")})`;

/** Every SQL fixture: the setup that the question shows, and the queries whose results it quotes. */
const FIXTURES: Record<string, Fixture> = {
  "from-questions-to-grain-fee-distinct": {
    setup:
      "CREATE TABLE order_lines(order_id INT, line INT, amount INT, shipping_fee INT);\nINSERT INTO order_lines VALUES (1001,1,20,5),(1001,2,30,5),(1002,1,45,5),(1003,1,10,8),(1003,2,15,8),(1003,3,12,8);",
    queries: [
      {
        sql: "SELECT SUM(shipping_fee) FROM order_lines",
        rows: [[39]],
      },
      {
        sql: "SELECT SUM(DISTINCT shipping_fee) FROM order_lines",
        rows: [[13]],
      },
      {
        sql: "SELECT SUM(fee) FROM (SELECT order_id, MAX(shipping_fee) AS fee FROM order_lines GROUP BY order_id)",
        rows: [[18]],
      },
    ],
    shows: ["order_lines"],
    after: "",
  },
  "facts-and-dimensions-dim-key-clash": {
    setup:
      "CREATE TABLE dim_customer(customer_id INT, source TEXT, name TEXT);\nINSERT INTO dim_customer VALUES (17,'shop','Ada'),(17,'web','Cy');\nCREATE TABLE sales(sale_id INT, customer_id INT, amount INT);\nINSERT INTO sales VALUES (1,17,40),(2,17,10);",
    queries: [
      {
        sql: "SELECT d.name, SUM(s.amount) FROM sales s JOIN dim_customer d ON d.customer_id = s.customer_id GROUP BY d.name",
        rows: [
          ["Ada", 50],
          ["Cy", 50],
        ],
      },
      {
        sql: "SELECT d.name, SUM(s.amount) FROM sales s JOIN dim_customer d ON d.customer_id = s.customer_id WHERE d.source = 'shop' GROUP BY d.name",
        rows: [["Ada", 50]],
      },
      {
        sql: "SELECT DISTINCT d.name, SUM(s.amount) FROM sales s JOIN dim_customer d ON d.customer_id = s.customer_id GROUP BY d.name",
        rows: [
          ["Ada", 50],
          ["Cy", 50],
        ],
      },
    ],
    shows: ["dim_customer", "sales"],
    after: "",
  },
  "history-in-dimensions-join-without-range": {
    setup:
      "CREATE TABLE dim_customer(sk INT, cust_id TEXT, city TEXT, valid_from TEXT, valid_to TEXT);\nINSERT INTO dim_customer VALUES (1,'C1','Leeds','2025-01-01','2026-03-01'),(2,'C1','York','2026-03-01','2026-06-01'),(3,'C1','Hull','2026-06-01','9999-12-31');\nCREATE TABLE sales(id INT, cust_id TEXT, sale_date TEXT, amount INT);\nINSERT INTO sales VALUES (1,'C1','2026-01-10',70),(2,'C1','2026-04-02',50);",
    queries: [
      {
        sql: "SELECT d.city, SUM(s.amount) FROM sales s JOIN dim_customer d ON d.cust_id = s.cust_id GROUP BY d.city ORDER BY d.city",
        rows: [
          ["Hull", 120],
          ["Leeds", 120],
          ["York", 120],
        ],
      },
      {
        sql: "SELECT d.city, SUM(s.amount) FROM sales s JOIN dim_customer d ON d.cust_id = s.cust_id AND s.sale_date >= d.valid_from AND s.sale_date < d.valid_to GROUP BY d.city ORDER BY d.city",
        rows: [
          ["Leeds", 70],
          ["York", 50],
        ],
      },
    ],
    shows: ["dim_customer", "sales"],
    after: "",
  },
  "history-in-dimensions-check-york": {
    setup:
      "CREATE TABLE dim_customer(sk INT, cust_id TEXT, city TEXT, valid_from TEXT, valid_to TEXT);\nINSERT INTO dim_customer VALUES (1,'C1','Leeds','2025-01-01','2026-03-01'),(2,'C1','York','2026-03-01','9999-12-31'),(3,'C2','Leeds','2025-01-01','9999-12-31');\nCREATE TABLE sales(id INT,cust_id TEXT,sale_date TEXT,amount INT);\nINSERT INTO sales VALUES (1,'C1','2026-01-15',50),(2,'C1','2026-02-20',30),(3,'C1','2026-04-02',70),(4,'C2','2026-04-03',20);",
    queries: [
      {
        sql: "SELECT SUM(s.amount) FROM sales s JOIN dim_customer d ON d.cust_id = s.cust_id AND s.sale_date >= d.valid_from AND s.sale_date < d.valid_to WHERE d.city = 'York'",
        rows: [[70]],
      },
      {
        sql: "SELECT SUM(s.amount) FROM sales s JOIN dim_customer d ON d.cust_id = s.cust_id AND d.valid_to = '9999-12-31' WHERE d.city = 'York'",
        rows: [[150]],
      },
    ],
    shows: [],
    after: "",
  },
  "choosing-a-model-shape-check-join": {
    setup:
      "CREATE TABLE o(id INT, total INT);\nINSERT INTO o VALUES (1,100),(2,200),(3,300);\nCREATE TABLE i(oid INT, sku TEXT);\nINSERT INTO i VALUES (1,'a'),(1,'b'),(2,'c'),(3,'a'),(3,'b'),(3,'c');",
    queries: [
      {
        sql: "SELECT SUM(o.total) FROM o JOIN i ON i.oid = o.id",
        rows: [[1300]],
      },
    ],
    shows: [],
    after: "",
  },
  "choosing-a-model-shape-credit-sum-fix": {
    setup:
      "CREATE TABLE customers(id INT, credit_limit INT);\nINSERT INTO customers VALUES (1,500),(2,500),(3,800);\nCREATE TABLE orders(id INT, customer_id INT);\nINSERT INTO orders VALUES (10,1),(11,1),(12,1),(13,2),(14,3),(15,3);",
    queries: [
      {
        sql: "SELECT SUM(c.credit_limit) FROM customers c JOIN orders o ON o.customer_id = c.id",
        rows: [[3600]],
      },
      {
        sql: "SELECT SUM(DISTINCT credit_limit) FROM customers",
        rows: [[1300]],
      },
      {
        sql: "SELECT SUM(credit_limit) FROM customers",
        rows: [[1800]],
      },
      {
        sql: "SELECT SUM(c.credit_limit) / COUNT(*) FROM customers c JOIN orders o ON o.customer_id = c.id",
        rows: [[600]],
      },
    ],
    shows: ["customers", "orders"],
    after: "",
  },
  "choosing-a-model-shape-payments-sum-mc": {
    setup:
      "CREATE TABLE orders(id INT, total INT);\nINSERT INTO orders VALUES (1,80),(2,120),(3,50);\nCREATE TABLE payments(order_id INT, amount INT);\nINSERT INTO payments VALUES (1,40),(1,40),(2,120),(3,10),(3,10),(3,10),(3,20);",
    queries: [
      {
        sql: "SELECT SUM(o.total) FROM orders o JOIN (SELECT order_id, SUM(amount) AS paid FROM payments GROUP BY order_id) p ON p.order_id = o.id",
        rows: [[250]],
      },
      {
        sql: "SELECT SUM(o.total) FROM orders o JOIN payments p ON p.order_id = o.id",
        rows: [[480]],
      },
      {
        sql: "SELECT COUNT(*) FROM payments",
        rows: [[7]],
      },
    ],
    shows: [],
    after: "",
  },
  "choosing-a-model-shape-aggregate-first": {
    setup:
      "CREATE TABLE o(id INT, total INT);\nINSERT INTO o VALUES (1,100),(2,200),(3,200);\nCREATE TABLE i(oid INT, sku TEXT);\nINSERT INTO i VALUES (1,'a'),(1,'b'),(2,'c'),(3,'a'),(3,'b'),(3,'c');",
    queries: [
      {
        sql: "SELECT SUM(o.total), COUNT(*) FROM o JOIN i ON i.oid = o.id",
        rows: [[1000, 6]],
      },
      {
        sql: "SELECT SUM(o.total), SUM(x.items) FROM o JOIN (SELECT oid, COUNT(*) AS items FROM i GROUP BY oid) x ON x.oid = o.id",
        rows: [[500, 6]],
      },
      {
        sql: "SELECT SUM(DISTINCT o.total), COUNT(*) FROM o JOIN i ON i.oid = o.id",
        rows: [[300, 6]],
      },
    ],
    shows: ["o", "i"],
    after: "",
  },
  "incremental-builds-predict-read": {
    setup:
      "CREATE TABLE tgt(id INT, updated_at TEXT);\nINSERT INTO tgt VALUES (1,'2026-06-08'),(2,'2026-06-09'),(3,'2026-06-10');\nCREATE TABLE src(id INT, updated_at TEXT);\nINSERT INTO src VALUES (1,'2026-06-08'),(2,'2026-06-11'),(3,'2026-06-10'),(4,'2026-06-09'),(5,'2026-06-11'),(6,'2026-06-12');",
    queries: [
      {
        sql: "SELECT id FROM src WHERE updated_at > (SELECT MAX(updated_at) FROM tgt) ORDER BY id",
        rows: [[2], [5], [6]],
      },
      {
        sql: "SELECT id FROM src WHERE updated_at >= (SELECT MAX(updated_at) FROM tgt) ORDER BY id",
        rows: [[2], [3], [5], [6]],
      },
      {
        sql: "SELECT id FROM src WHERE id NOT IN (SELECT id FROM tgt) ORDER BY id",
        rows: [[4], [5], [6]],
      },
    ],
    shows: ["tgt", "src"],
    after: "",
  },
  "incremental-builds-no-unique-key": {
    setup:
      "CREATE TABLE tgt(id INT, updated_at TEXT);\nINSERT INTO tgt VALUES (1,'2026-06-08'),(2,'2026-06-09'),(3,'2026-06-10');\nCREATE TABLE src(id INT, updated_at TEXT);\nINSERT INTO src VALUES (1,'2026-06-08'),(2,'2026-06-11'),(3,'2026-06-10'),(4,'2026-06-09'),(5,'2026-06-11'),(6,'2026-06-12');",
    queries: [
      {
        sql: "SELECT COUNT(*) FROM tgt",
        rows: [[6]],
      },
      {
        sql: "SELECT id, COUNT(*) FROM tgt GROUP BY id HAVING COUNT(*) > 1",
        rows: [[2, 2]],
      },
    ],
    shows: ["tgt"],
    after:
      "INSERT INTO tgt SELECT * FROM src WHERE updated_at > (SELECT MAX(updated_at) FROM tgt);",
  },
  "incremental-builds-lookback-one": {
    setup:
      "CREATE TABLE src(id INT, updated_at TEXT);\nINSERT INTO src VALUES (1,'2026-09-15'),(2,'2026-09-21'),(3,'2026-09-18'),(4,'2026-09-20'),(5,'2026-09-18'),(6,'2026-09-22');",
    queries: [
      {
        sql: "SELECT COUNT(*) FROM src WHERE updated_at > '2026-09-18'",
        rows: [[3]],
      },
    ],
    shows: [],
    after: "",
  },
  "incremental-builds-lookback-choice": {
    setup:
      "CREATE TABLE src(id INT, updated_at TEXT);\nINSERT INTO src VALUES (1,'2026-06-12'),(2,'2026-06-10');",
    queries: [
      {
        sql: "SELECT id FROM src WHERE updated_at > date('2026-06-12', '-1 day') ORDER BY id",
        rows: [[1]],
      },
      {
        sql: "SELECT id FROM src WHERE updated_at > date('2026-06-12', '-2 day') ORDER BY id",
        rows: [[1]],
      },
      {
        sql: "SELECT id FROM src WHERE updated_at > date('2026-06-12', '-3 day') ORDER BY id",
        rows: [[1], [2]],
      },
    ],
    shows: [],
    after: "",
  },
  "incremental-builds-same-timestamp": {
    setup:
      "CREATE TABLE tgt(id INT, updated_at TEXT);\nINSERT INTO tgt VALUES (1,'2026-05-02'),(2,'2026-05-03'),(4,'2026-05-04');\nCREATE TABLE src(id INT, updated_at TEXT);\nINSERT INTO src VALUES (1,'2026-05-02'),(2,'2026-05-03'),(4,'2026-05-04'),(7,'2026-05-04');",
    queries: [
      {
        sql: "SELECT id FROM src WHERE updated_at > (SELECT MAX(updated_at) FROM tgt) ORDER BY id",
        rows: [],
      },
      {
        sql: "SELECT id FROM src WHERE updated_at >= (SELECT MAX(updated_at) FROM tgt) ORDER BY id",
        rows: [[4], [7]],
      },
    ],
    shows: ["tgt"],
    after: "",
  },
  "incremental-builds-check-rows": {
    setup:
      "CREATE TABLE tgt(id INT PRIMARY KEY, v INT, updated_at TEXT);\nINSERT INTO tgt VALUES (1,10,'2026-05-01'),(2,20,'2026-05-02'),(3,30,'2026-05-03');\nCREATE TABLE src(id INT, v INT, updated_at TEXT);\nINSERT INTO src VALUES (1,10,'2026-05-01'),(2,25,'2026-05-04'),(3,30,'2026-05-03'),(4,40,'2026-05-04'),(5,50,'2026-05-02');",
    queries: [
      {
        sql: "SELECT COUNT(*) FROM tgt",
        rows: [[4]],
      },
    ],
    shows: [],
    after:
      "INSERT OR REPLACE INTO tgt SELECT * FROM src WHERE updated_at > (SELECT MAX(updated_at) FROM tgt);",
  },
  "testing-data-relationships-rows": {
    setup:
      "CREATE TABLE customers(id INT);\nINSERT INTO customers VALUES (1),(2),(3);\nCREATE TABLE orders(id INT, customer_id INT, status TEXT);\nINSERT INTO orders VALUES (10,1,'paid'),(11,2,'shipped'),(12,9,'paid'),(13,NULL,'paid'),(14,3,'refunded'),(15,7,'shipped');",
    queries: [
      {
        sql: "SELECT o.id FROM orders o LEFT JOIN customers c ON c.id = o.customer_id WHERE o.customer_id IS NOT NULL AND c.id IS NULL ORDER BY o.id",
        rows: [[12], [15]],
      },
      {
        sql: "SELECT o.id FROM orders o LEFT JOIN customers c ON c.id = o.customer_id WHERE c.id IS NULL ORDER BY o.id",
        rows: [[12], [13], [15]],
      },
    ],
    shows: ["orders"],
    after: "",
  },
  "testing-data-status-rows": {
    setup:
      "CREATE TABLE orders(id INT, status TEXT);\nINSERT INTO orders VALUES (1,'paid'),(2,'refunded'),(3,'shipped'),(4,'void'),(5,'paid'),(6,'refunded'),(7,'paid');",
    queries: [
      {
        sql: "SELECT id FROM orders WHERE status NOT IN ('paid', 'shipped') ORDER BY id",
        rows: [[2], [4], [6]],
      },
      {
        sql: "SELECT id FROM orders WHERE status IN ('paid', 'shipped') ORDER BY id",
        rows: [[1], [3], [5], [7]],
      },
    ],
    shows: ["orders"],
    after: "",
  },
  "testing-data-ship-rule": {
    setup:
      "CREATE TABLE orders(id INT, ordered_on TEXT, shipped_on TEXT);\nINSERT INTO orders VALUES (1,'2026-05-01','2026-05-03'),(2,'2026-05-04','2026-05-02'),(3,'2026-05-05','2026-05-05'),(4,'2026-05-06','2026-05-04');",
    queries: [
      {
        sql: "SELECT id FROM orders WHERE shipped_on < ordered_on ORDER BY id",
        rows: [[2], [4]],
      },
    ],
    shows: ["orders"],
    after: "",
  },
  "semantic-layers-and-metrics-revenue-gap": {
    setup:
      "CREATE TABLE orders(id INT, status TEXT, amount INT);\nINSERT INTO orders VALUES (1,'paid',420),(2,'shipped',260),(3,'cancelled',90);",
    queries: [
      {
        sql: "SELECT SUM(amount) FROM orders",
        rows: [[770]],
      },
      {
        sql: "SELECT SUM(amount) FROM orders WHERE status != 'cancelled'",
        rows: [[680]],
      },
    ],
    shows: ["orders"],
    after: "",
  },
  "semantic-layers-and-metrics-distinct-sum": {
    setup:
      "CREATE TABLE purchases(region TEXT, customer_id INT);\nINSERT INTO purchases VALUES ('North',7),('North',8),('North',9),('North',10),('South',9),('South',10),('South',11);",
    queries: [
      {
        sql: "SELECT region, COUNT(DISTINCT customer_id) FROM purchases GROUP BY region ORDER BY region",
        rows: [
          ["North", 4],
          ["South", 3],
        ],
      },
      {
        sql: "SELECT COUNT(DISTINCT customer_id) FROM purchases",
        rows: [[5]],
      },
    ],
    shows: ["purchases"],
    after: "",
  },
  "semantic-layers-and-metrics-time-zone": {
    setup:
      "CREATE TABLE orders(id INT, created_utc TEXT, amount INT);\nINSERT INTO orders VALUES (1,'2026-01-31 23:30:00',100),(2,'2026-02-01 01:15:00',80),(3,'2026-02-01 12:00:00',60);",
    queries: [
      {
        sql: "SELECT COALESCE(SUM(amount), 0) FROM orders WHERE strftime('%Y-%m', created_utc) = '2026-01'",
        rows: [[100]],
      },
      {
        sql: "SELECT COALESCE(SUM(amount), 0) FROM orders WHERE strftime('%Y-%m', created_utc, '+1 hour') = '2026-01'",
        rows: [[0]],
      },
    ],
    shows: ["orders"],
    after: "",
  },
  "measuring-quality-uniqueness-rate": {
    setup:
      "CREATE TABLE orders(order_id INT);\nINSERT INTO orders VALUES (1),(2),(3),(4),(5),(6),(7),(8),(3),(5);",
    queries: [
      {
        sql: "SELECT 100.0 * COUNT(DISTINCT order_id) / COUNT(*) FROM orders",
        rows: [[80]],
      },
      {
        sql: "SELECT order_id FROM orders GROUP BY order_id HAVING COUNT(*) > 1 ORDER BY order_id",
        rows: [[3], [5]],
      },
    ],
    shows: [],
    after: "",
  },
  "classifying-and-protecting-data-k-query": {
    setup:
      "CREATE TABLE people(age_band TEXT, postcode TEXT);\nINSERT INTO people VALUES ('20-29','N1'),('20-29','N1'),('20-29','N1'),('20-29','N1'),('20-29','N1'),('30-39','N1'),('30-39','N1'),('30-39','N2'),('30-39','N2'),('30-39','N2'),('40-49','N1'),('40-49','N2');",
    queries: [
      {
        sql: "SELECT age_band, postcode, COUNT(*) FROM people GROUP BY age_band, postcode ORDER BY age_band, postcode",
        rows: [
          ["20-29", "N1", 5],
          ["30-39", "N1", 2],
          ["30-39", "N2", 3],
          ["40-49", "N1", 1],
          ["40-49", "N2", 1],
        ],
      },
      {
        sql: "SELECT MIN(n) FROM (SELECT COUNT(*) AS n FROM people GROUP BY age_band, postcode)",
        rows: [[1]],
      },
      {
        sql: "SELECT COUNT(*) FROM (SELECT COUNT(*) AS n FROM people GROUP BY age_band, postcode HAVING n < 3)",
        rows: [[3]],
      },
    ],
    shows: [],
    after: "",
  },
  "classifying-and-protecting-data-check-k": {
    setup:
      "CREATE TABLE t(age_band TEXT, postcode TEXT, sex TEXT);\nINSERT INTO t VALUES ('30-39','LS1','F'),('30-39','LS1','F'),('30-39','LS1','F'),('40-49','LS2','M'),('40-49','LS2','M'),('40-49','LS2','M'),('20-29','LS1','M'),('30-39','LS1','M');",
    queries: [
      {
        sql: "SELECT MIN(n) FROM (SELECT COUNT(*) AS n FROM t GROUP BY age_band, postcode, sex)",
        rows: [[1]],
      },
    ],
    shows: [],
    after: "",
  },
  "governance-in-practice-retention-monitor": {
    setup:
      "CREATE TABLE events(months_ago INT);\nINSERT INTO events WITH RECURSIVE m(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM m WHERE x < 48) SELECT x FROM m;",
    queries: [
      {
        sql: "SELECT COUNT(*) FROM events WHERE months_ago > 36",
        rows: [[0]],
      },
      {
        sql: "SELECT COUNT(*) FROM events",
        rows: [[36]],
      },
      {
        sql: "SELECT MIN(months_ago) FROM events",
        rows: [[1]],
      },
    ],
    shows: [],
    after: "DELETE FROM events WHERE months_ago > 36;",
  },
  "governance-in-practice-first-run-18": {
    setup:
      "CREATE TABLE events(months_ago INT);\nINSERT INTO events WITH RECURSIVE m(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM m WHERE x < 26) SELECT x FROM m;",
    queries: [
      {
        sql: "SELECT COUNT(*) FROM events WHERE months_ago > 18",
        rows: [[8]],
      },
    ],
    shows: [],
    after: "",
  },
};
/** Directed edges of the graph in the blast-radius sort question. */
const EDGES: [string, string][] = [
  ["raw_payments", "stg_payments"],
  ["raw_orders", "stg_orders"],
  ["raw_customers", "stg_customers"],
  ["stg_payments", "int_refunds"],
  ["stg_payments", "fct_payments"],
  ["int_refunds", "fct_orders"],
  ["stg_orders", "fct_orders"],
  ["fct_payments", "dash_finance"],
  ["fct_orders", "dash_sales"],
  ["stg_customers", "dim_customers"],
  ["dim_customers", "dash_sales"],
];
/** Questions that print their setup statements one by one in the prompt. */
const PRINTS_SETUP = [
  "history-in-dimensions-check-york",
  "choosing-a-model-shape-check-join",
  "incremental-builds-check-rows",
];

const downstream = (edges: [string, string][], start: string) => {
  const seen = new Set<string>();
  const walk = (node: string) => {
    for (const [from, to] of edges)
      if (from === node && !seen.has(to)) {
        seen.add(to);
        walk(to);
      }
  };
  walk(start);
  return seen;
};
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const sd = (values: number[]) =>
  Math.sqrt(mean(values.map((value) => (value - mean(values)) ** 2)));
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h as number) * 60 + (m as number);
};
/** Hours that a table is past its freshness target, where `now` may fall on the next day. */
const breach = (updated: string, now: string, targetHours: number) => {
  const gap = (minutes(now) - minutes(updated) + 24 * 60) % (24 * 60);
  return gap / 60 - targetHours;
};
const scalar = (id: string, index = 0) => Number(FIXTURES[id]?.queries[index]?.rows[0]?.[0]);

/**
 * Each numeric answer is recomputed here. `uses` lists numbers that must appear in the prompt, so the
 * calculation cannot drift from the wording. A question asked in a worked or faded example continues
 * the example's text, so its inputs come from that text and not from the prompt.
 */
const recompute: Record<string, { value: () => number; uses?: number[] }> = {
  "from-questions-to-grain-faded-sum": {
    value: () => 50 * 2 + 70 * 4 + 90 * 1,
    uses: [50, 70, 90, 2, 4, 1],
  },
  "facts-and-dimensions-avg-price": {
    value: () => (300 + 100) / (10 + 5),
    uses: [10, 300, 5, 100],
  },
  "history-in-dimensions-east-total": {
    value: () => {
      const db = new DatabaseSync(":memory:");
      db.exec(`CREATE TABLE dim(rep TEXT, region TEXT, valid_from TEXT, valid_to TEXT);
        INSERT INTO dim VALUES ('R3','West','2025-01-01','2026-02-01'),('R3','East','2026-02-01','9999-12-31'),('R4','East','2025-01-01','9999-12-31');
        CREATE TABLE sales(rep TEXT, sale_date TEXT, amount INT);
        INSERT INTO sales VALUES ('R3','2026-01-05',10),('R3','2026-02-01',20),('R3','2026-03-15',35),('R4','2026-03-20',5);`);
      return Number(
        Object.values(
          db
            .prepare(
              "SELECT SUM(s.amount) FROM sales s JOIN dim d ON d.rep = s.rep AND s.sale_date >= d.valid_from AND s.sale_date < d.valid_to WHERE d.region = 'East'",
            )
            .all()[0] as object,
        )[0],
      );
    },
    uses: [10, 20, 35, 5],
  },
  "history-in-dimensions-check-york": {
    value: () => scalar("history-in-dimensions-check-york", 0),
  },
  "choosing-a-model-shape-check-join": {
    value: () => scalar("choosing-a-model-shape-check-join", 0),
  },
  "incremental-builds-lookback-one": {
    value: () => scalar("incremental-builds-lookback-one", 0),
    uses: [1, 2, 3, 4, 5, 6, 2],
  },
  "incremental-builds-check-rows": { value: () => scalar("incremental-builds-check-rows", 0) },
  "semantic-layers-and-metrics-check-aov": {
    value: () => (100 + 900) / (10 + 30),
    uses: [100, 10, 900, 30],
  },
  "lineage-count-ads-down": {
    value: () =>
      downstream(
        [
          ["crm", "stg_crm"],
          ["shop", "stg_shop"],
          ["ads", "stg_ads"],
          ["stg_crm", "int_customer_orders"],
          ["stg_shop", "int_customer_orders"],
          ["int_customer_orders", "mart_revenue"],
          ["int_customer_orders", "mart_marketing"],
          ["stg_ads", "mart_marketing"],
          ["mart_revenue", "dash_sales"],
          ["mart_revenue", "dash_exec"],
          ["mart_marketing", "dash_exec"],
        ],
        "stg_shop",
      ).size,
  },
  "lineage-check-down": {
    value: () =>
      downstream(
        [
          ["s1", "stg1"],
          ["s2", "stg2"],
          ["stg1", "int1"],
          ["stg2", "int1"],
          ["int1", "mart1"],
          ["stg2", "mart2"],
          ["mart1", "d1"],
          ["mart1", "d2"],
          ["mart2", "d2"],
        ],
        "stg1",
      ).size,
    uses: [],
  },
  "measuring-quality-z-faded": {
    value: () => (380 - mean([300, 340, 300, 340])) / sd([300, 340, 300, 340]),
    uses: [300, 340, 380],
  },
  "measuring-quality-breach-hours": { value: () => breach("02:15", "09:00", 4), uses: [4] },
  "measuring-quality-check-breach": { value: () => breach("22:40", "06:10", 6), uses: [6] },
  "contracts-ownership-and-slos-budget-98": { value: () => 720 * (1 - 0.98), uses: [98, 720] },
  "classifying-and-protecting-data-k-wider": {
    value: () => {
      const rows = ["20-39 N1", "20-39 N1", "20-39 N1", "20-39 N2", "20-39 N2", "20-39 N2"];
      const sizes = Object.values(
        rows.reduce<Record<string, number>>((acc, row) => {
          acc[row] = (acc[row] ?? 0) + 1;
          return acc;
        }, {}),
      );
      return Math.min(...sizes);
    },
  },
  "classifying-and-protecting-data-check-k": {
    value: () => scalar("classifying-and-protecting-data-check-k", 0),
  },
  "privacy-law-in-practice-vacuum-day": { value: () => 2 + 14, uses: [2, 14] },
};
const mentions = (prompt: string, value: number) => {
  const text = prompt.replace(/,/gu, "");
  return new RegExp(
    `(^|[^\\d.])${String(value).replace(".", "\\.")}([^\\d]|\\.\\D|\\.$|$)`,
    "u",
  ).test(text);
};

describe("questions in Analytics Engineering and Data Governance", () => {
  it("asks every question from a lesson, and every lesson question exists", () => {
    const asked = new Set(
      bundle.lessons.flatMap((lesson) => [
        lesson.intro?.hook.questionId ?? "",
        ...lesson.questionIds,
        ...lesson.steps.flatMap((step) => [
          step.checkQuestionId,
          ...(step.workedSteps ?? []).flatMap((line) => [
            line.blank?.questionId ?? "",
            line.selfExplain?.questionId ?? "",
          ]),
        ]),
      ]),
    );
    asked.delete("");
    expect([...asked].filter((id) => !questions.has(id))).toEqual([]);
    expect(
      bundle.questions.filter((question) => !asked.has(question.id)).map((item) => item.id),
    ).toEqual([]);
    const cards = new Set(bundle.lessons.flatMap((lesson) => lesson.flashcardIds));
    expect(bundle.flashcards.filter((card) => !cards.has(card.id)).map((card) => card.id)).toEqual(
      [],
    );
    expect([...cards].filter((id) => !bundle.flashcards.some((card) => card.id === id))).toEqual(
      [],
    );
  });

  it("ends each lesson with three questions of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
      expect(types.filter((type) => type === "numeric").length, lesson.id).toBeLessThanOrEqual(1);
    }
  });

  it("keeps numeric questions to the few where the number is the point", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(17);
    for (const question of numeric) {
      expect(question.hints.length, question.id).toBe(3);
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(`${question.id} is not numeric`);
      const decimals = (String(authority.value).split(".")[1] ?? "").length;
      if (decimals > 0)
        expect(authority.absoluteTolerance, question.id).toBeGreaterThanOrEqual(
          0.5 * 10 ** -decimals - 1e-12,
        );
      for (const item of question.misconceptions ?? [])
        for (const wrong of item.match.numeric ?? [])
          expect(Math.abs(wrong - authority.value), question.id).toBeGreaterThan(
            authority.absoluteTolerance,
          );
    }
  });

  it("recomputes every numeric answer, running the SQL where there is any", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id.replace(/^anaeg-/u, "")).sort()).toEqual(
      Object.keys(recompute).sort(),
    );
    for (const question of numeric) {
      const entry = recompute[question.id.replace(/^anaeg-/u, "")];
      if (!entry || question.answerAuthority.kind !== "numeric") throw new Error(question.id);
      const { value, absoluteTolerance } = question.answerAuthority;
      expect(
        Math.abs(entry.value() - value),
        `${question.id} recomputed ${entry.value()}`,
      ).toBeLessThanOrEqual(absoluteTolerance + 1e-9);
      for (const number of entry.uses ?? [])
        expect(mentions(question.prompt, number), `${question.id} mentions ${number}`).toBe(true);
    }
  });

  it("reruns every SQL fixture and finds the rows and results that the questions quote", () => {
    expect(Object.keys(FIXTURES).length).toBeGreaterThanOrEqual(20);
    for (const [id, fixture] of Object.entries(FIXTURES)) {
      const question = q(id);
      const db = open(fixture);
      const text = allText(question);
      for (const { sql, rows } of fixture.queries) {
        expect(run(db, sql), `${id}: ${sql}`).toEqual(rows);
        // A query that the question prints must have its results printed with it, unless the
        // question asks for the result as a number.
        if (kind(question) !== "numeric" && text.includes(strip(sql)))
          for (const row of rows)
            for (const cell of row)
              expect(text, `${id} prints ${sql} but not ${cell}`).toContain(String(cell));
      }
      // The rows shown are the rows as they stood before any hidden statement ran.
      const before = open({ ...fixture, after: "" });
      for (const table of fixture.shows)
        for (const row of run(before, `SELECT * FROM ${table}`))
          expect(strip(question.prompt), `${id} shows ${table}`).toContain(
            tuple(Object.values(row)),
          );
      if (PRINTS_SETUP.includes(id))
        for (const statement of fixture.setup.split("\n"))
          expect(strip(question.prompt), `${id} prints ${statement}`).toContain(strip(statement));
    }
  });

  it("quotes the results of the join, key and test questions", () => {
    // Fan-out: a fee copied onto each line is repeated, and DISTINCT collapses equal fees.
    const fee = FIXTURES["from-questions-to-grain-fee-distinct"]?.queries.map(
      (item) => item.rows[0]?.[0],
    );
    expect(fee).toEqual([39, 13, 18]);
    expect(allText(q("from-questions-to-grain-fee-distinct"))).toContain("13");
    // Two systems that number their own customers: a join on the source id credits the wrong customer.
    const clash = FIXTURES["facts-and-dimensions-dim-key-clash"]?.queries.map((item) => item.rows);
    expect(clash?.[0]).toEqual([
      ["Ada", 50],
      ["Cy", 50],
    ]);
    expect(clash?.[1]).toEqual([["Ada", 50]]);
    // Type 2 without a validity range matches each sale to every version; with it, to one.
    const scd = FIXTURES["history-in-dimensions-join-without-range"]?.queries.map(
      (item) => item.rows,
    );
    expect(scd?.[0]).toEqual([
      ["Hull", 120],
      ["Leeds", 120],
      ["York", 120],
    ]);
    expect(scd?.[1]).toEqual([
      ["Leeds", 70],
      ["York", 50],
    ]);
    // The as-of join gives 70 for York, a join to current rows 150.
    expect(scalar("history-in-dimensions-check-york", 0)).toBe(70);
    expect(scalar("history-in-dimensions-check-york", 1)).toBe(150);
    // A sum after a join repeats the customer's limit; the right query sums the customers alone.
    const credit = FIXTURES["choosing-a-model-shape-credit-sum-fix"]?.queries.map(
      (item) => item.rows[0]?.[0],
    );
    expect(credit).toEqual([3600, 1300, 1800, 600]);
    // Aggregating the many side first keeps each total once.
    const agg = FIXTURES["choosing-a-model-shape-aggregate-first"]?.queries.map(
      (item) => item.rows[0],
    );
    expect(agg).toEqual([
      [1000, 6],
      [500, 6],
      [300, 6],
    ]);
    const payments = FIXTURES["choosing-a-model-shape-payments-sum-mc"]?.queries.map(
      (item) => item.rows[0]?.[0],
    );
    expect(payments).toEqual([250, 480, 7]);
    // The relationships test leaves out a missing key, which is what not_null is for.
    const rel = FIXTURES["testing-data-relationships-rows"]?.queries.map((item) =>
      item.rows.map((row) => row[0]),
    );
    expect(rel).toEqual([
      [12, 15],
      [12, 13, 15],
    ]);
    const status = FIXTURES["testing-data-status-rows"]?.queries.map((item) =>
      item.rows.map((row) => row[0]),
    );
    expect(status).toEqual([
      [2, 4, 6],
      [1, 3, 5, 7],
    ]);
    const ship = FIXTURES["testing-data-ship-rule"]?.queries.map((item) =>
      item.rows.map((row) => row[0]),
    );
    expect(ship).toEqual([[2, 4]]);
  });

  it("quotes the results of the incremental and metric questions", () => {
    // A strict filter reads ids 2, 5 and 6, and misses id 4, which is stamped before the target's latest.
    const read = FIXTURES["incremental-builds-predict-read"]?.queries.map((item) =>
      item.rows.map((row) => row[0]),
    );
    expect(read).toEqual([
      [2, 5, 6],
      [2, 3, 5, 6],
      [4, 5, 6],
    ]);
    // Without a unique key most adapters append, so id 2 appears twice and there are six rows.
    const append = FIXTURES["incremental-builds-no-unique-key"]?.queries.map((item) => item.rows);
    expect(append?.[0]).toEqual([[6]]);
    expect(append?.[1]).toEqual([[2, 2]]);
    // The row stamped 2026-06-10 is read only when the cut-off is 2026-06-09 or earlier.
    const lookback = FIXTURES["incremental-builds-lookback-choice"]?.queries.map((item) =>
      item.rows.map((row) => row[0]),
    );
    expect(lookback).toEqual([[1], [1], [1, 2]]);
    // >= reads the row stamped on the latest day, and with no unique key it would append id 4 again.
    const same = FIXTURES["incremental-builds-same-timestamp"]?.queries.map((item) =>
      item.rows.map((row) => row[0]),
    );
    expect(same).toEqual([[], [4, 7]]);
    // Two definitions of revenue, and two ways of cutting a month.
    const revenue = FIXTURES["semantic-layers-and-metrics-revenue-gap"]?.queries.map(
      (item) => item.rows[0]?.[0],
    );
    expect(revenue).toEqual([770, 680]);
    const zone = FIXTURES["semantic-layers-and-metrics-time-zone"]?.queries.map(
      (item) => item.rows[0]?.[0],
    );
    expect(zone).toEqual([100, 0]);
    const distinct = FIXTURES["semantic-layers-and-metrics-distinct-sum"]?.queries.map(
      (item) => item.rows,
    );
    expect(distinct?.[0]).toEqual([
      ["North", 4],
      ["South", 3],
    ]);
    expect(distinct?.[1]).toEqual([[5]]);
    // Average order value rebuilt from totals, against the average of regional averages.
    expect((150 + 750) / (10 + 15)).toBe(36);
    expect((150 / 10 + 750 / 15) / 2).toBe(32.5);
    expect((150 + 750) / 2).toBe(450);
    expect(allText(q("semantic-layers-and-metrics-ratio-both-parts"))).toContain("32.5");
  });

  it("quotes the quality, budget, privacy and retention figures", () => {
    const uniq = FIXTURES["measuring-quality-uniqueness-rate"]?.queries;
    expect(uniq?.[0]?.rows).toEqual([[80]]);
    expect(uniq?.[1]?.rows).toEqual([[3], [5]]);
    const history = [400, 440, 400, 440];
    expect(mean(history)).toBe(420);
    expect(sd(history)).toBe(20);
    expect((370 - 420) / 20).toBe(-2.5);
    const saturdays = [80, 100, 80, 100];
    expect(mean(saturdays)).toBe(90);
    expect(sd(saturdays)).toBe(10);
    expect((130 - 90) / 10).toBe(4);
    // Error budgets: 99.9% of 720 hours is 43.2 minutes, and 80% of 30 days leaves 6 failed days.
    expect(Math.round(720 * 60 * 0.001 * 100) / 100).toBe(43.2);
    expect(Math.round((50 - 43.2) * 100) / 100).toBe(6.8);
    expect(Math.round(30 * (1 - 0.8))).toBe(6);
    expect(Math.round(720 * 60 * 0.0001 * 10) / 10).toBe(4.3);
    // k-anonymity of the twelve-row table: smallest group 1, three groups below 3 holding 4 rows.
    const k = FIXTURES["classifying-and-protecting-data-k-query"]?.queries;
    expect(k?.[0]?.rows).toEqual([
      ["20-29", "N1", 5],
      ["30-39", "N1", 2],
      ["30-39", "N2", 3],
      ["40-49", "N1", 1],
      ["40-49", "N2", 1],
    ]);
    expect(k?.[1]?.rows).toEqual([[1]]);
    expect(k?.[2]?.rows).toEqual([[3]]);
    expect(12 / 5).toBe(2.4);
    expect(9 - 2).toBe(7);
    expect(50_000 * 1000).toBe(50_000_000);
    // GDPR Article 83: 4% of 2.5 billion is higher than 20 million, and 2% of it is 50 million.
    expect(Math.max(20_000_000, 0.04 * 2_500_000_000)).toBe(100_000_000);
    expect(Math.max(10_000_000, 0.02 * 2_500_000_000)).toBe(50_000_000);
    // Article 33: 72 hours from Monday 14:00 is Thursday 14:00.
    expect((14 + 72) % 24).toBe(14);
    expect(Math.floor(72 / 24)).toBe(3);
    // Retention: after the job nothing is older than 36 months, 36 rows stay, and 8 of 26 go.
    const retention = FIXTURES["governance-in-practice-retention-monitor"]?.queries.map(
      (item) => item.rows[0]?.[0],
    );
    expect(retention).toEqual([0, 36, 1]);
    expect(scalar("governance-in-practice-first-run-18")).toBe(8);
  });

  it("sorts the table, measure, test and metadata questions the way the sources do", () => {
    const table = (id: string, expected: Record<string, string>) => {
      const sorted = q(id);
      for (const item of sorted.sort?.items ?? [])
        expect(item.bin, `${id}: ${item.label}`).toBe(expected[strip(item.label)]);
      expect(sorted.sort?.items).toHaveLength(Object.keys(expected).length);
    };
    table("facts-and-dimensions-measure-kinds", {
      "Units sold on each sale line": "additive",
      "Revenue on each sale line": "additive",
      "Closing stock of a product at the end of each day": "semi",
      "An account's balance at the end of each month": "semi",
      "Conversion rate, orders divided by visits, on each daily row": "non",
      "Unit price of a product": "non",
      "Margin percentage on a sales line": "non",
    });
    // dbt's four generic tests: unique and not_null compile to a select on duplicates and on nulls;
    // relationships leaves out nulls; accepted_values checks the non-null values against a list.
    table("testing-data-bug-to-test", {
      "The same order id is loaded twice": "unique",
      "Two customer rows share one customer id": "unique",
      "An order arrives with no customer id": "not-null",
      "A required email is empty in a staging row": "not-null",
      "An order points at customer 9, who does not exist": "relationships",
      "A payment refers to an invoice that was deleted at the source": "relationships",
      "An order has the status 'shiped'": "accepted-values",
      "A payment arrives by a method the code has never seen": "accepted-values",
    });
    table("contracts-ownership-and-slos-breaking-sort", {
      "Remove the discount column": "breaking",
      "Rename order_total to total": "breaking",
      "Change quantity from an integer to text": "breaking",
      "Change price from tax included to tax excluded": "breaking",
      "Add an optional delivery_note column": "compatible",
      "Add a new table of returns to the warehouse": "compatible",
    });
    table("governance-in-practice-metadata-kinds", {
      "The data type of each column": "technical",
      "The primary key columns": "technical",
      "The description of what 'active customer' means": "business",
      "The named owner of the dataset": "business",
      "The glossary term for 'headcount'": "business",
      "The time of the last refresh": "operational",
      "The number of rows": "operational",
      "How often the dataset is queried": "operational",
    });
    table("classifying-and-protecting-data-personal-or-not", {
      "Emails replaced by unsalted hashes": "personal",
      "Customer ids replaced by random tokens, with the lookup table kept by the data team":
        "personal",
      "Salted hashes of emails, with the salts kept next to the table": "personal",
      "Names removed, but age band, postcode prefix and sex kept, with one person alone in their group":
        "personal",
      "Total orders for each country over the whole year, with no rows about individuals":
        "anonymous",
      "The average basket value for the whole shop": "anonymous",
    });
    table("layers-of-models-layer-sort", {
      "A model that renames orderid to order_id and casts the amount from text to a number":
        "staging",
      "A model that casts a date column from text and does nothing else": "staging",
      "A model that joins orders to customers": "intermediate",
      "A model that reduces payments to one row per order so another model can join them":
        "intermediate",
      "rpt_daily_revenue, the table the finance dashboard reads": "mart",
      "fct_orders, the orders fact table that analysts query": "mart",
    });
  });

  it("places each node of the lineage graph from the arrows in the prompt", () => {
    const sorted = q("lineage-blast-radius");
    const edges = [...sorted.prompt.matchAll(/`(\w+)` to `(\w+)`/gu)].map(
      (m) => [m[1], m[2]] as [string, string],
    );
    expect(edges).toEqual(EDGES);
    const reach = downstream(edges, "stg_payments");
    const direct = new Set(edges.filter(([from]) => from === "stg_payments").map(([, to]) => to));
    for (const item of sorted.sort?.items ?? []) {
      const node = strip(item.label);
      expect(item.bin, node).toBe(
        direct.has(node) ? "direct" : reach.has(node) ? "indirect" : "none",
      );
    }
  });

  it("puts a situation in front of the learner in most questions", () => {
    const situation =
      /\b(you|your|team|shop|bank|firm|company|analyst|table|tables|column|columns|row|rows|query|model|models|dashboard|dashboards|dataset|data|source|job|order|orders|customer|customers|report|reports|metric|figure|count|counts|objective|producer|consumer|pipeline|lesson)\b/iu;
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.9);
    const showsData = bundle.questions.filter((question) =>
      /`[^`]+`|\(\d|\d/u.test(question.prompt),
    );
    expect(showsData.length).toBeGreaterThanOrEqual(bundle.questions.length * 0.6);
    const withCode = bundle.questions.filter((question) =>
      /`(SELECT|select|models:|\{\{)[^`]*`/u.test(
        question.prompt + (question.choices ?? []).map((choice) => choice.label).join(" "),
      ),
    );
    expect(withCode.length).toBeGreaterThanOrEqual(12);
    for (const question of bundle.questions)
      if (question.responseType !== "numeric") expect(question.prompt, question.id).toMatch(/\?/u);
  });

  it("keeps dashes and verdict words out of questions, hints and feedback", () => {
    for (const question of bundle.questions) {
      const text = [
        question.prompt,
        ...question.hints,
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((item) => item.feedback),
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.order?.items ?? []),
        ...(question.sort?.bins ?? []).map((bin) => bin.label),
        ...(question.sort?.items ?? []).flatMap((item) => [item.label, item.explanation ?? ""]),
        question.answerAuthority.kind === "text" ? question.answerAuthority.exampleAnswer : "",
      ].join(" ");
      expect(text, question.id).not.toMatch(/[—–]/u);
      expect(text, question.id).not.toMatch(/\b(Correct|Not quite|Great job|Well done)\b/u);
    }
    for (const card of bundle.flashcards)
      expect(`${card.front} ${card.back}`, card.id).not.toMatch(/[—–]/u);
  });

  it("marks one option right, keeps options alike in length and form, and explains each wrong one", () => {
    const places = new Set<number>();
    let threeOrMore = 0;
    let rightLongest = 0;
    let rightShortest = 0;
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      const shortestOther = Math.min(...others.map((choice) => choice.label.length));
      const rightLength = right[0]?.label.length ?? 0;
      if (question.choices.length >= 3) {
        threeOrMore += 1;
        if (rightLength > longestOther) rightLongest += 1;
        if (rightLength < shortestOther) rightShortest += 1;
        expect(rightLength, question.id).toBeLessThanOrEqual(longestOther * 1.15);
      }
      const stops = new Set(question.choices.map((choice) => /[.!?]$/u.test(choice.label)));
      expect(stops.size, `${question.id} mixes final stops`).toBe(1);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of others)
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
      places.add(question.choices.indexOf(right[0] as (typeof question.choices)[number]));
    }
    expect(rightLongest / threeOrMore).toBeLessThanOrEqual(0.3);
    expect(rightShortest / threeOrMore).toBeLessThanOrEqual(0.4);
    expect([...places].sort()).toEqual([0, 1, 2, 3]);
  });

  it("keeps most questions multiple choice, with a few to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(4);
    expect(counts.sort).toBeGreaterThanOrEqual(5);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
  });

  it("writes an order question as distinct items and a sort question with every bin used", () => {
    for (const question of bundle.questions) {
      if (question.answerAuthority.kind !== "text") continue;
      const { order, sort } = question;
      if (order) {
        expect(new Set(order.items).size, question.id).toBe(order.items.length);
        expect(order.items.length, question.id).toBeGreaterThanOrEqual(4);
        expect(order.items.length, question.id).toBeLessThanOrEqual(6);
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([ORDER_ANSWER_IDEA]);
        expect(
          order.items.filter((item) => /^\d/u.test(item)),
          question.id,
        ).toEqual([]);
      }
      if (sort) {
        expect(new Set(sort.items.map((item) => item.label)).size, question.id).toBe(
          sort.items.length,
        );
        expect(sort.items.length, question.id).toBeGreaterThanOrEqual(5);
        for (const bin of sort.bins)
          expect(
            sort.items.some((item) => item.bin === bin.id),
            `${question.id} ${bin.id}`,
          ).toBe(true);
        for (const item of sort.items) expect(item.explanation, question.id).toBeTruthy();
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([SORT_ANSWER_IDEA]);
      }
      if (order || sort) {
        expect(question.answerAuthority.exampleAnswer.length, question.id).toBeGreaterThan(40);
        expect(question.onCorrect, question.id).toBeTruthy();
      }
    }
  });

  it("orders the four design decisions, the new-source steps, the investigation and the erasure", () => {
    expect(
      q("from-questions-to-grain-four-steps-order").order?.items.map((item) => item.split(" ")[0]),
    ).toEqual(["Choose", "Declare", "Identify", "Identify"]);
    expect(q("from-questions-to-grain-four-steps-order").order?.items[3]).toContain("facts");
    const source = q("layers-of-models-add-source-order").order?.items ?? [];
    expect(source[0]).toContain("sources");
    expect(source[1]).toContain("staging");
    expect(source.findIndex((item) => item.includes("tests"))).toBeLessThan(
      source.findIndex((item) => item.includes("intermediate")),
    );
    expect(source[source.length - 1]).toContain("mart");
    const probe = q("semantic-layers-and-metrics-investigate-order").order?.items ?? [];
    expect(probe[0]).toContain("Write down both figures");
    expect(probe[probe.length - 1]).toContain("semantic layer");
    // The erasure stages follow the lesson's figure: DELETE, retention, vacuum, backup expiry, then the reply.
    const erase = q("privacy-law-in-practice-erasure-order").order?.items ?? [];
    expect(erase.map((item) => item.split(" ").slice(0, 3).join(" "))).toEqual([
      "The DELETE is",
      "The retention period",
      "A vacuum removes",
      "The last backup",
      "You tell the",
    ]);
  });

  it("states the dbt behaviour that the documentation gives", () => {
    const text = (id: string) => allText(q(id));
    // Data tests return failing rows; unique and not_null do not report each other's cases.
    expect(text("testing-data-null-test-pick")).toContain("`not_null`".replaceAll("`", ""));
    expect(text("testing-data-relationships-rows")).toMatch(/foreign key/u);
    expect(text("testing-data-ship-rule")).toMatch(/singular test/u);
    expect(text("testing-data-logic-bug")).toMatch(/unit test/u);
    expect(text("testing-data-logic-bug")).toMatch(/development and CI/u);
    // Incremental models: without unique_key most adapters append; the documentation filter uses >=.
    expect(text("incremental-builds-no-unique-key")).toMatch(/most adapters/u);
    expect(text("incremental-builds-same-timestamp")).toContain("unique_key = 'id'");
    expect(text("incremental-builds-same-timestamp")).toContain(">=");
    // Metrics: simple, ratio, cumulative and derived; gross profit is the documentation's derived example.
    expect(text("semantic-layers-and-metrics-pick-metric-type")).toContain("derived");
    // Materialisation: a view is dbt's default, an ephemeral model is never stored.
    expect(text("layers-of-models-slow-dashboard")).toContain("default");
    expect(text("layers-of-models-slow-dashboard")).toContain("ephemeral");
    // No question uses a config key that the fetched pages do not give.
    const keys = new Set<string>();
    for (const question of bundle.questions)
      for (const match of `${question.prompt} ${(question.choices ?? []).map((choice) => choice.label).join(" ")}`.matchAll(
        /`([a-z]+(?:_[a-z]+)+)`/gu,
      ))
        keys.add(match[1] as string);
    const known = new Set([
      "unique_key",
      "data_tests",
      "not_null",
      "accepted_values",
      "order_total",
      "shipped_on",
      "ordered_on",
      "credit_limit",
      "customer_id",
      "order_id",
      "valid_from",
      "valid_to",
      "updated_at",
      "sale_date",
      "cust_id",
      "shipping_fee",
      "months_ago",
      "created_utc",
      "stg_orders",
      "stg_customers",
      "stg_payments",
      "int_orders_joined",
      "int_payments_by_order",
      "dim_customers",
      "fct_orders",
      "rpt_daily_revenue",
      "int_refunds",
      "fct_events",
      "stg_crm",
      "stg_shop",
      "stg_ads",
      "int_customer_orders",
      "mart_revenue",
      "mart_marketing",
      "dash_sales",
      "dash_exec",
      "dash_finance",
      "raw_payments",
      "fct_payments",
      "raw_orders",
      "raw_customers",
      "dim_product_sales",
      "dim_product_returns",
      "region_code",
      "month_end_close",
      "orders_daily",
      "hr_headcount",
      "gross_profit",
      "invoice_lines",
      "invoice_id",
      "age_band",
      "unit_price",
      "line_amount",
      "order_lines",
      "dim_customer",
    ]);
    expect([...keys].filter((key) => !known.has(key))).toEqual([]);
  });

  it("covers the judgements that models, tests and definitions get wrong", () => {
    const text = bundle.questions.map((question) =>
      [
        question.prompt,
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.sort?.items ?? []).map((item) => item.label),
        ...(question.order?.items ?? []),
        ...(question.misconceptions ?? []).map((item) => item.feedback),
        question.onCorrect ?? "",
      ].join(" "),
    );
    for (const phrase of [
      /grain/iu,
      /fan-?out|repeat/iu,
      /SUM\(DISTINCT/u,
      /semi-additive|closing stock/iu,
      /surrogate key/iu,
      /Type 1|Type 2|validity range/iu,
      /as-of|valid_from/iu,
      /conformed/iu,
      /staging|intermediate|mart/iu,
      /unique_key/u,
      /late|lookback/iu,
      /relationships/u,
      /not_null/u,
      /accepted_values/u,
      /unit test/iu,
      /semantic layer/iu,
      /time zone|UTC/iu,
      /downstream|upstream/iu,
      /column-level|run event/iu,
      /volume check|z-score/iu,
      /breaking|compatible/iu,
      /error budget|budget/iu,
      /pseudonymis/iu,
      /k-anonym|k is|k = 3/iu,
      /vacuum/iu,
      /legal obligation/iu,
      /owner|steward|custodian/iu,
      /retention/iu,
    ])
      expect(
        text.some((entry) => phrase.test(entry)),
        String(phrase),
      ).toBe(true);
  });

  it("does not mark a typed answer right when it only repeats the prompt, and accepts the right terms", () => {
    for (const question of bundle.questions) {
      if (question.choices || question.answerAuthority.kind !== "text") continue;
      if (question.order || question.sort) continue;
      expect(assessTextAnswer(question.prompt, question.answerAuthority).correct, question.id).toBe(
        false,
      );
      expect(
        assessTextAnswer(question.answerAuthority.exampleAnswer, question.answerAuthority).correct,
        question.id,
      ).toBe(true);
    }
    const typed = (id: string) => {
      const authority = q(id).answerAuthority;
      if (authority.kind !== "text") throw new Error(id);
      return authority;
    };
    for (const answer of ["accepted_values", "accepted values", "the accepted_values test"])
      expect(assessTextAnswer(answer, typed("testing-data-typo-test")).correct, answer).toBe(true);
    for (const answer of ["unique", "not_null", "relationships"])
      expect(assessTextAnswer(answer, typed("testing-data-typo-test")).correct, answer).toBe(false);
    for (const answer of ["uniqueness", "unique", "Uniqueness"])
      expect(
        assessTextAnswer(answer, typed("measuring-quality-which-dimension-dup")).correct,
        answer,
      ).toBe(true);
    for (const answer of ["completeness", "accuracy", "validity"])
      expect(
        assessTextAnswer(answer, typed("measuring-quality-which-dimension-dup")).correct,
        answer,
      ).toBe(false);
  });

  it("gives hints that guide, with no first letters and no bare sums", () => {
    for (const question of bundle.questions) {
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
      }
    }
  });

  it("gives review cards that ask for a judgement and no longer drill arithmetic", () => {
    expect(bundle.flashcards).toHaveLength(42);
    for (const card of bundle.flashcards) {
      expect(card.answerAuthority?.kind, card.id).not.toBe("numeric");
      expect(card.front.length, card.id).toBeGreaterThan(20);
    }
  });
});
