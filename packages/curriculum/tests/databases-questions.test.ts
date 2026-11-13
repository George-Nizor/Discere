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
 * Databases and Data Modelling follows the way System Design and History ask questions
 * (docs/question-writing-guide.md), adapted to a course about schemas, queries and transactions.
 * Questions put a small schema, a few rows, a query, a plan or an interleaving of two transactions in
 * front of the learner and ask for a judgement. Numeric questions stay where a count of rows, pages or
 * keys is the point. Every query result and every plan line quoted in a question is rerun below in
 * SQLite (Node's built-in `node:sqlite`) against the rows shown in the question.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/databases-and-data-modelling/bundle.json", import.meta.url),
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
  const found = questions.get(`datdm-${id}`);
  if (!found) throw new Error(`no question ${id}`);
  return found;
};

// node:sqlite is loaded through require, because Vite does not list it among Node's built-in modules.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (
    path: string,
  ) => {
    exec(sql: string): void;
    prepare(sql: string): { all(...args: unknown[]): Record<string, unknown>[] };
  };
};
const open = (setup: string) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(setup);
  return db;
};
const rows = (db: ReturnType<typeof open>, sql: string) =>
  db
    .prepare(sql)
    .all()
    .map((row) => Object.values(row));
const scalar = (db: ReturnType<typeof open>, sql: string) => Number(rows(db, sql)[0]?.[0]);
const plan = (db: ReturnType<typeof open>, sql: string) =>
  db
    .prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .all()
    .map((row) => String(row["detail"]))
    .join(" / ");
const fails = (db: ReturnType<typeof open>, sql: string) => {
  try {
    db.exec(sql);
    return "";
  } catch (error) {
    return String((error as Error).message);
  }
};
const strip = (text: string) => text.replaceAll("`", "");
/** Every string must appear in the question's prompt or its choices, so the code here is the code shown. */
const shown = (id: string, ...texts: string[]) => {
  const question = q(id);
  const all = strip(
    [question.prompt, ...(question.choices ?? []).map((choice) => choice.label)].join("\n"),
  );
  for (const text of texts) expect(all, `${id} shows ${text}`).toContain(strip(text));
};

const STUDENTS = `
  CREATE TABLE students(id INTEGER PRIMARY KEY, name TEXT);
  CREATE TABLE enrollments(student_id INT, course_id INT, PRIMARY KEY(student_id, course_id));`;
const MEMBERS_OF_COURSES = `${STUDENTS}
  INSERT INTO students VALUES (1,'Ana'),(2,'Ben'),(3,'Chloe'),(4,'Dev');
  INSERT INTO enrollments VALUES (1,10),(1,11),(2,10),(3,11),(3,10),(3,12),(4,12);`;

/**
 * Each numeric answer is recomputed here. `uses` lists numbers that must appear in the prompt, so the
 * calculation cannot drift from the wording. A question asked in a worked or faded example continues the
 * example's text, so its inputs (marked `example`) come from that text and not from the prompt.
 */
const recompute: Record<string, { value: () => number; uses?: number[]; example?: string }> = {
  "from-a-story-to-entities-pair-rows": { value: () => 3 * 12, uses: [3, 12] },
  "one-to-many-and-many-to-many-after-where": {
    value: () =>
      scalar(
        open(`${MEMBERS_OF_COURSES}
          CREATE TABLE courses(id INT, title TEXT);
          INSERT INTO courses VALUES (10,'Databases'),(11,'Algorithms'),(12,'Compilers');`),
        "SELECT COUNT(*) FROM students s JOIN enrollments e ON e.student_id = s.id JOIN courses c ON c.id = e.course_id WHERE c.title IN ('Databases','Algorithms')",
      ),
    example: "the seven enrollments rows joined to the course titles",
  },
  "one-to-many-and-many-to-many-databases-and-compilers": {
    value: () =>
      rows(
        open(`${MEMBERS_OF_COURSES}
          CREATE TABLE courses(id INT, title TEXT);
          INSERT INTO courses VALUES (10,'Databases'),(11,'Algorithms'),(12,'Compilers');`),
        "SELECT s.id FROM students s JOIN enrollments e ON e.student_id = s.id JOIN courses c ON c.id = e.course_id WHERE c.title IN ('Databases','Compilers') GROUP BY s.id HAVING COUNT(DISTINCT c.title) = 2",
      ).length,
    example: "the pairs (1,10), (2,10), (3,10), (3,12) and (4,12)",
  },
  "one-to-many-and-many-to-many-joined-students-rows": {
    value: () =>
      rows(
        open(`${STUDENTS}
          INSERT INTO students VALUES (1,'Ana'),(2,'Ben'),(3,'Chloe'),(4,'Dev'),(5,'Eli');
          INSERT INTO enrollments VALUES (1,10),(1,11),(2,10),(3,10),(3,11),(3,12),(5,12);`),
        "SELECT s.name, COUNT(*) FROM students s JOIN enrollments e ON e.student_id = s.id GROUP BY s.id",
      ).length,
    uses: [5],
  },
  "keys-and-constraints-rows-left": {
    value: () => {
      const db = open(
        "CREATE TABLE products(id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, price NUMERIC CHECK (price >= 0)); INSERT INTO products VALUES (1,'P-100',2),(2,'P-200',3);",
      );
      const statements = [
        "INSERT INTO products VALUES (3,'P-300',4)",
        "INSERT INTO products VALUES (2,'P-400',4)",
        "INSERT INTO products VALUES (4,'P-100',4)",
        "INSERT INTO products VALUES (5,'P-500',-1)",
        "INSERT INTO products VALUES (6,NULL,4)",
      ];
      for (const sql of statements) fails(db, sql);
      return scalar(db, "SELECT COUNT(*) FROM products");
    },
    uses: [5, 2],
  },
  "keys-and-constraints-cascade-rows-left": {
    value: () => {
      const db = open(`CREATE TABLE customers(id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE orders(id INTEGER PRIMARY KEY, customer_id INT REFERENCES customers(id) ON DELETE CASCADE, total INT);
        INSERT INTO customers VALUES (1,'Ana'),(2,'Ben');
        INSERT INTO orders VALUES (101,1,20),(102,1,35),(103,2,10),(104,2,5);`);
      db.exec("DELETE FROM customers WHERE id = 1");
      return scalar(db, "SELECT COUNT(*) FROM orders");
    },
    uses: [101, 102, 103, 104],
  },
  "normal-forms-and-decomposition-join-orders": { value: () => 4, uses: [4, 3] },
  "normal-forms-and-decomposition-ben-revenue": { value: () => 4 * 2, uses: [4, 2] },
  "normal-forms-and-decomposition-invented-rows": {
    value: () =>
      scalar(
        open(`CREATE TABLE t(employee TEXT, project TEXT, skill TEXT);
          INSERT INTO t VALUES ('Ana','P1','SQL'),('Ana','P2','Rust'),('Ben','P1','Rust');
          CREATE TABLE ep AS SELECT DISTINCT employee, project FROM t;
          CREATE TABLE ps AS SELECT DISTINCT project, skill FROM t;`),
        "SELECT COUNT(*) FROM (SELECT ep.employee, ep.project, ps.skill FROM ep JOIN ps ON ps.project = ep.project EXCEPT SELECT employee, project, skill FROM t)",
      ),
    example: "the three rows of t and the five rows that the join returns",
  },
  "reporting-models-and-denormalisation-kitchen-november": {
    value: () => {
      const sales = [
        [1, 1, "Mug", 1],
        [2, 1, "Whisk", 2],
        [3, 2, "Notebook", 5],
        [4, 3, "Notebook", 3],
        [5, 3, "Whisk", 2],
        [6, 4, "Notebook", 2],
      ] as const;
      return sales
        .filter(([, date, product]) => date <= 2 && (product === "Mug" || product === "Whisk"))
        .reduce((sum, [, , , units]) => sum + units, 0);
    },
    uses: [1, 2, 5, 3],
  },
  "reporting-models-and-denormalisation-read-to-write": {
    value: () => 1000 / 20,
    uses: [1000, 20],
  },
  "how-an-index-finds-rows-scan-pages": { value: () => 3_000_000 / 60, uses: [3000000, 60] },
  "how-an-index-finds-rows-levels-ten-million": {
    value: () => {
      let levels = 0;
      while (100 ** levels < 10_000_000) levels += 1;
      return levels;
    },
    uses: [100, 10000000],
  },
  "how-an-index-finds-rows-levels-hundred-million": {
    value: () => {
      let levels = 0;
      while (100 ** levels < 100_000_000) levels += 1;
      return levels;
    },
    uses: [100, 100000000],
  },
  "how-an-index-finds-rows-ratio-ten-million": {
    value: () => 10_000_000 / 50 / (4 + 1),
    uses: [10000000, 50, 100, 4],
  },
  "how-an-index-finds-rows-break-even-five": { value: () => 20_000 / 5, uses: [5, 20000] },
  "composite-indexes-and-selectivity-rows-per-dept": { value: () => 12_000 / 4, uses: [12000, 4] },
  "composite-indexes-and-selectivity-rows-per-country": {
    value: () => 2_000_000 / 250,
    uses: [2000000, 250],
  },
  "reading-query-plans-reads-per-outer-row": { value: () => 3 + 1, uses: [3] },
  "reading-query-plans-indexed-two-thousand": { value: () => 2000 * (3 + 1), uses: [2000, 3] },
  "transactions-and-acid-faded-replay": { value: () => 900 - 250, uses: [900, 100, 250] },
  "locks-versions-and-conflicts-atomic-updates": {
    value: () => 200 + 15 + 40,
    uses: [200, 15, 40],
  },
  "locks-versions-and-conflicts-retry-result": { value: () => 150 + 30, uses: [30, 150, 4] },
  "replication-sharding-and-choosing-mod-six": {
    value: () =>
      Array.from({ length: 12 }, (_, key) => key).filter((key) => key % 3 !== key % 6).length,
    uses: [12, 3, 6],
  },
  "replication-sharding-and-choosing-add-node-25": {
    value: () => {
      const nodes = [10, 40, 70];
      const owner = (key: number, ring: number[]) =>
        [...ring].sort((a, b) => a - b).find((node) => node >= key) ?? Math.min(...ring);
      return Array.from({ length: 100 }, (_, key) => key).filter(
        (key) => owner(key, nodes) !== owner(key, [...nodes, 25]),
      ).length;
    },
    uses: [10, 40, 70, 25],
  },
};
const mentions = (prompt: string, value: number) => {
  const text = prompt.replace(/,/gu, "");
  return new RegExp(
    `(^|[^\\d.])${String(value).replace(".", "\\.")}([^\\d]|\\.\\D|\\.$|$)`,
    "u",
  ).test(text);
};

describe("questions in Databases and Data Modelling", () => {
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

  it("ends each lesson with three questions of at least two types and at most one sum", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
      expect(types.filter((type) => type === "numeric").length, lesson.id).toBeLessThanOrEqual(1);
    }
  });

  it("keeps numeric questions to counts that are the point and to worked-example steps", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(26);
    const blanks = new Set(
      bundle.lessons.flatMap((lesson) =>
        lesson.steps.flatMap((step) =>
          (step.workedSteps ?? []).map((line) => line.blank?.questionId ?? ""),
        ),
      ),
    );
    expect(numeric.filter((question) => !blanks.has(question.id)).length).toBeLessThanOrEqual(11);
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
    expect(numeric.map((question) => question.id.replace(/^datdm-/u, "")).sort()).toEqual(
      Object.keys(recompute).sort(),
    );
    for (const question of numeric) {
      const entry = recompute[question.id.replace(/^datdm-/u, "")];
      if (!entry || question.answerAuthority.kind !== "numeric") throw new Error(question.id);
      const { value, absoluteTolerance } = question.answerAuthority;
      expect(
        Math.abs(entry.value() - value),
        `${question.id} recomputed ${entry.value()}`,
      ).toBeLessThanOrEqual(absoluteTolerance + 1e-9);
      for (const number of entry.uses ?? [])
        expect(mentions(question.prompt, number), `${question.id} mentions ${number}`).toBe(true);
      if (!entry.uses) expect(entry.example, question.id).toBeTruthy();
    }
  });

  it("gives the results of the join questions on the rows shown", () => {
    shown(
      "one-to-many-and-many-to-many-course-11",
      "SELECT s.name FROM students s JOIN enrollments e ON e.student_id = s.id WHERE e.course_id = 10",
      "SELECT s.name FROM students s JOIN enrollments e ON e.student_id = s.id WHERE s.id = 10",
      "SELECT s.name FROM students s JOIN enrollments e ON e.course_id = s.id WHERE e.student_id = 10",
      "SELECT s.name FROM students s, enrollments e WHERE e.course_id = 10",
    );
    const db = open(MEMBERS_OF_COURSES);
    expect(
      rows(
        db,
        "SELECT s.name FROM students s JOIN enrollments e ON e.student_id = s.id WHERE e.course_id = 10",
      ),
    ).toEqual([["Ana"], ["Ben"], ["Chloe"]]);
    expect(
      rows(
        db,
        "SELECT s.name FROM students s JOIN enrollments e ON e.student_id = s.id WHERE s.id = 10",
      ),
    ).toEqual([]);
    expect(
      rows(
        db,
        "SELECT s.name FROM students s JOIN enrollments e ON e.course_id = s.id WHERE e.student_id = 10",
      ),
    ).toEqual([]);
    const cross = rows(db, "SELECT s.name FROM students s, enrollments e WHERE e.course_id = 10");
    expect(cross).toHaveLength(12);
    expect(new Set(cross.map((row) => row[0])).size).toBe(4);
    // A repeat booking is refused by the pair key, and accepted once the date is part of the key.
    shown(
      "one-to-many-and-many-to-many-repeat-booking-key",
      "UNIQUE constraint failed: bookings.member_id, bookings.class_id",
    );
    const pair = open(
      "CREATE TABLE bookings(member_id INT, class_id INT, booked_on TEXT, PRIMARY KEY(member_id, class_id)); INSERT INTO bookings VALUES (1,5,'2026-11-02');",
    );
    expect(fails(pair, "INSERT INTO bookings VALUES (1,5,'2026-11-09')")).toContain(
      "UNIQUE constraint failed: bookings.member_id, bookings.class_id",
    );
    const withDate = open(
      "CREATE TABLE bookings(member_id INT, class_id INT, booked_on TEXT, PRIMARY KEY(member_id, class_id, booked_on)); INSERT INTO bookings VALUES (1,5,'2026-11-02');",
    );
    expect(fails(withDate, "INSERT INTO bookings VALUES (1,5,'2026-11-09')")).toBe("");
    expect(fails(withDate, "INSERT INTO bookings VALUES (1,5,'2026-11-09')")).not.toBe("");
  });

  it("gives the results of the key and constraint questions", () => {
    const products = open("CREATE TABLE products(id INTEGER PRIMARY KEY, sku TEXT, name TEXT);");
    expect(
      fails(
        products,
        "INSERT INTO products(sku, name) VALUES ('P-100','Pen'); INSERT INTO products(sku, name) VALUES ('P-100','Pen')",
      ),
    ).toBe("");
    expect(rows(products, "SELECT sku, COUNT(*) FROM products GROUP BY sku")).toEqual([
      ["P-100", 2],
    ]);
    shown("keys-and-constraints-surrogate-needs-unique", "('P-100', 2)");
    const setup = (action: string) =>
      open(`CREATE TABLE customers(id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE orders(id INTEGER PRIMARY KEY, customer_id INT REFERENCES customers(id) ${action});
        INSERT INTO customers VALUES (1,'Ana'); INSERT INTO orders VALUES (1,1);`);
    expect(fails(setup("ON DELETE RESTRICT"), "DELETE FROM customers WHERE id = 1")).toContain(
      "FOREIGN KEY constraint failed",
    );
    const nulled = setup("ON DELETE SET NULL");
    expect(fails(nulled, "DELETE FROM customers WHERE id = 1")).toBe("");
    expect(rows(nulled, "SELECT customer_id FROM orders")).toEqual([[null]]);
    expect(scalar(setup("ON DELETE CASCADE"), "SELECT COUNT(*) FROM orders")).toBe(1);
    const cascaded = setup("ON DELETE CASCADE");
    cascaded.exec("DELETE FROM customers WHERE id = 1");
    expect(scalar(cascaded, "SELECT COUNT(*) FROM orders")).toBe(0);
  });

  it("gives the results of the anomaly and decomposition questions on the rows shown", () => {
    const flat =
      open(`CREATE TABLE orders_flat(order_id INT, customer TEXT, email TEXT, product TEXT, qty INT);
      INSERT INTO orders_flat VALUES (1,'Ana','ana@old.org','Pen',10),(1,'Ana','ana@old.org','Ink',2),(2,'Ben','ben@x.org','Pen',4),(3,'Ana','ana@old.org','Pad',1);`);
    flat.exec("UPDATE orders_flat SET email = 'ana@new.org' WHERE order_id = 1");
    expect(
      rows(flat, "SELECT DISTINCT email FROM orders_flat WHERE customer = 'Ana' ORDER BY email"),
    ).toEqual([["ana@new.org"], ["ana@old.org"]]);
    shown(
      "anomalies-and-dependencies-two-emails",
      "UPDATE orders_flat SET email = 'ana@new.org' WHERE order_id = 1",
    );
    // The dependency the staff rows break is dept -> dept_head, and only that one among the options.
    shown(
      "anomalies-and-dependencies-which-dependency-breaks",
      "(1, Ana, Sales, Kim)",
      "(4, Dee, Ops, Pat)",
      "(5, Eve, Sales, Kim)",
    );
    const staff = open(`CREATE TABLE s(staff_id INT, name TEXT, dept TEXT, dept_head TEXT);
      INSERT INTO s VALUES (1,'Ana','Sales','Kim'),(2,'Ben','Sales','Kim'),(3,'Cy','Ops','Lee'),(4,'Dee','Ops','Pat'),(5,'Eve','Sales','Kim');`);
    const breaks = (from: string, to: string) =>
      rows(staff, `SELECT ${from} FROM s GROUP BY ${from} HAVING COUNT(DISTINCT ${to}) > 1`)
        .length > 0;
    expect(breaks("dept", "dept_head")).toBe(true);
    expect(breaks("staff_id", "dept")).toBe(false);
    expect(breaks("dept_head", "dept")).toBe(false);
    expect(breaks("staff_id", "name")).toBe(false);
    // Cuts of staff_flat: only the first gives back the four rows with each head stored once.
    shown(
      "normal-forms-and-decomposition-which-cut",
      "(1, Ana, Sales, Kim)",
      "(4, Dee, Support, Kim)",
    );
    const cut = open(`CREATE TABLE staff_flat(staff_id INT, name TEXT, dept TEXT, dept_head TEXT);
      INSERT INTO staff_flat VALUES (1,'Ana','Sales','Kim'),(2,'Ben','Sales','Kim'),(3,'Cy','Ops','Lee'),(4,'Dee','Support','Kim');`);
    const joined = (left: string, right: string) =>
      scalar(
        cut,
        `SELECT COUNT(*) FROM (SELECT DISTINCT ${left} FROM staff_flat) a NATURAL JOIN (SELECT DISTINCT ${right} FROM staff_flat) b`,
      );
    expect(joined("staff_id, name, dept", "dept, dept_head")).toBe(4);
    expect(joined("staff_id, name", "dept, dept_head")).toBe(12);
    expect(joined("staff_id, name, dept_head", "dept, dept_head")).toBe(7);
    expect(joined("staff_id, name, dept, dept_head", "dept, dept_head")).toBe(4);
  });

  it("gives the plan lines that the index questions quote", () => {
    // function on an indexed column
    const users = open(
      "CREATE TABLE users(id INTEGER PRIMARY KEY, email TEXT, name TEXT); CREATE INDEX idx_email ON users(email);",
    );
    for (let i = 0; i < 2000; i += 1)
      users.exec(`INSERT INTO users(email, name) VALUES ('u${i}@Example.org', 'n${i}')`);
    users.exec("ANALYZE");
    shown(
      "composite-indexes-and-selectivity-function-on-column",
      "SEARCH users USING INDEX idx_email (email=?)",
      "SCAN users",
    );
    expect(plan(users, "SELECT * FROM users WHERE lower(email) = 'u5@example.org'")).toBe(
      "SCAN users",
    );
    expect(plan(users, "SELECT * FROM users WHERE email = 'u5@Example.org'")).toBe(
      "SEARCH users USING INDEX idx_email (email=?)",
    );
    users.exec("CREATE INDEX idx_email_lower ON users(lower(email))");
    expect(plan(users, "SELECT * FROM users WHERE lower(email) = 'u5@example.org'")).toBe(
      "SEARCH users USING INDEX idx_email_lower (<expr>=?)",
    );
    // seek or scan on (last_name, first_name)
    const emp =
      open(`CREATE TABLE emp(id INTEGER PRIMARY KEY, last_name TEXT, first_name TEXT, salary INT, dept TEXT);
      CREATE INDEX idx_name ON emp(last_name, first_name);`);
    for (let i = 0; i < 3000; i += 1)
      emp.exec(
        `INSERT INTO emp(last_name, first_name, salary, dept) VALUES ('L${i % 300}','F${i % 7}',${30000 + i * 10},'D${i % 4}')`,
      );
    emp.exec("ANALYZE");
    const sorted = q("composite-indexes-and-selectivity-seek-or-scan");
    expect(sorted.sort?.items).toHaveLength(8);
    for (const item of sorted.sort?.items ?? []) {
      const detail = plan(emp, `SELECT * FROM emp WHERE ${strip(item.label)}`);
      expect(detail.startsWith("SEARCH emp USING INDEX idx_name"), `${item.label}: ${detail}`).toBe(
        item.bin === "seek",
      );
      if (item.bin === "scan") expect(detail, item.label).toBe("SCAN emp");
      else expect(strip(item.explanation ?? ""), item.label).toContain(detail);
    }
    // covering index
    shown(
      "composite-indexes-and-selectivity-covering-index",
      "SEARCH emp USING INDEX idx_name (last_name=?)",
    );
    expect(plan(emp, "SELECT last_name, first_name, salary FROM emp WHERE last_name = 'L3'")).toBe(
      "SEARCH emp USING INDEX idx_name (last_name=?)",
    );
    emp.exec("CREATE INDEX idx_name_sal ON emp(last_name, first_name, salary)");
    expect(plan(emp, "SELECT last_name, first_name, salary FROM emp WHERE last_name = 'L3'")).toBe(
      "SEARCH emp USING COVERING INDEX idx_name_sal (last_name=?)",
    );
    // the plan of the two-column predicate in the lesson's own question
    expect(
      plan(
        emp,
        "SELECT * FROM emp INDEXED BY idx_name WHERE last_name = 'L3' AND first_name = 'F3'",
      ),
    ).toBe("SEARCH emp USING INDEX idx_name (last_name=? AND first_name=?)");
    // a join whose outer filter has no index
    const shop = open(`CREATE TABLE customers(id INTEGER PRIMARY KEY, name TEXT, city TEXT);
      CREATE TABLE orders(id INTEGER PRIMARY KEY, customer_id INT, status TEXT, total INT);`);
    for (let i = 0; i < 200; i += 1)
      shop.exec(`INSERT INTO customers(name, city) VALUES ('c${i}','X')`);
    for (let i = 0; i < 3000; i += 1)
      shop.exec(
        `INSERT INTO orders(customer_id, status, total) VALUES (${(i % 200) + 1}, '${i % 100 === 0 ? "open" : "done"}', ${i})`,
      );
    shop.exec("ANALYZE");
    const join =
      "SELECT c.name, o.total FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'open'";
    shown(
      "reading-query-plans-index-for-outer-filter",
      "SCAN o",
      "SEARCH c USING INTEGER PRIMARY KEY (rowid=?)",
    );
    expect(plan(shop, join)).toBe("SCAN o / SEARCH c USING INTEGER PRIMARY KEY (rowid=?)");
    expect(scalar(shop, "SELECT COUNT(*) FROM orders WHERE status = 'open'")).toBe(30);
    shop.exec("CREATE INDEX idx_o_status ON orders(status)");
    shop.exec("ANALYZE");
    expect(plan(shop, join)).toBe(
      "SEARCH o USING INDEX idx_o_status (status=?) / SEARCH c USING INTEGER PRIMARY KEY (rowid=?)",
    );
  });

  it("gives the outcome of the write skew schedule and the lost update", () => {
    // Both sessions read a count of 2 from the same snapshot and set different rows. Run in turn here.
    const oncall = open(
      "CREATE TABLE oncall(doctor TEXT PRIMARY KEY, on_call INT); INSERT INTO oncall VALUES ('Ana',1),('Ben',1);",
    );
    const seen = [
      scalar(oncall, "SELECT COUNT(*) FROM oncall WHERE on_call"),
      scalar(oncall, "SELECT COUNT(*) FROM oncall WHERE on_call"),
    ];
    expect(seen).toEqual([2, 2]);
    oncall.exec(
      "UPDATE oncall SET on_call = 0 WHERE doctor = 'Ana'; UPDATE oncall SET on_call = 0 WHERE doctor = 'Ben'",
    );
    expect(scalar(oncall, "SELECT COUNT(*) FROM oncall WHERE on_call")).toBe(0);
    shown("isolation-anomalies-last-doctor", "SELECT COUNT(*) FROM oncall WHERE on_call");
    // Read, then write: the second write replaces the first. The atomic form adds both.
    const account = open(
      "CREATE TABLE accounts(id INT PRIMARY KEY, balance INT); INSERT INTO accounts VALUES (7, 100);",
    );
    const read = scalar(account, "SELECT balance FROM accounts WHERE id = 7");
    account.exec(`UPDATE accounts SET balance = ${read + 30} WHERE id = 7`);
    account.exec(`UPDATE accounts SET balance = ${read + 30} WHERE id = 7`);
    expect(scalar(account, "SELECT balance FROM accounts WHERE id = 7")).toBe(130);
    const atomic = open(
      "CREATE TABLE accounts(id INT PRIMARY KEY, balance INT); INSERT INTO accounts VALUES (7, 100);",
    );
    atomic.exec(
      "UPDATE accounts SET balance = balance + 30 WHERE id = 7; UPDATE accounts SET balance = balance + 30 WHERE id = 7",
    );
    expect(scalar(atomic, "SELECT balance FROM accounts WHERE id = 7")).toBe(160);
    // The version guard reports 0 rows once someone else has saved.
    const guarded = open(
      "CREATE TABLE accounts(id INT PRIMARY KEY, balance INT, version INT); INSERT INTO accounts VALUES (7, 100, 3);",
    );
    guarded.exec(
      "UPDATE accounts SET balance = 150, version = version + 1 WHERE id = 7 AND version = 3",
    );
    expect(scalar(guarded, "SELECT version FROM accounts WHERE id = 7")).toBe(4);
    expect(
      guarded
        .prepare(
          "UPDATE accounts SET balance = 130, version = 4 WHERE id = 7 AND version = 3 RETURNING id",
        )
        .all(),
    ).toHaveLength(0);
  });

  it("sorts the isolation anomalies the way the PostgreSQL documentation does", () => {
    // PostgreSQL documentation, Table 13.1 and the Repeatable Read section (transaction-iso.html).
    const table: Record<string, string> = {
      "A non-repeatable read": "rc",
      "A phantom read": "rc",
      "A lost update from reading a value and writing it back": "rc",
      "Write skew between two transactions that update different rows": "both",
      "A dirty read of another transaction's uncommitted change": "none",
    };
    const sorted = q("isolation-anomalies-level-and-anomaly");
    for (const item of sorted.sort?.items ?? [])
      expect(item.bin, item.label).toBe(table[item.label]);
    expect(sorted.sort?.items).toHaveLength(Object.keys(table).length);
  });

  it("checks the numbers that choices and feedback quote", () => {
    expect(10_000_000 / 50).toBe(200_000);
    expect(100 * 100).toBe(10_000);
    expect(1_000_000 / 500).toBe(2000);
    expect(2000 / 1_000_000).toBeCloseTo(0.002, 9); // 0.2 percent
    expect(0.06 * 1_000_000).toBe(60_000);
    expect(120_000 / 40).toBe(3000);
    expect(200 * 3000).toBe(600_000);
    expect(200 + 3000).toBe(3200);
    expect(1000 / 20).toBe(50);
    expect(600 / 300).toBe(2);
    expect(150_000_000 / 2000).toBe(75_000);
    // quorum rules used by the questions: R + W > N guarantees an overlap
    const overlaps = (n: number, w: number, r: number) => r + w > n;
    expect(overlaps(5, 4, 1)).toBe(false);
    expect(overlaps(5, 4, 2)).toBe(true);
    expect(overlaps(5, 2, 3)).toBe(false);
    expect(overlaps(7, 4, 3)).toBe(false);
    expect(overlaps(7, 4, 4)).toBe(true);
    // the retry in the Repeatable Read question reads the committed 110
    expect(100 + 10 + 25).toBe(135);
  });

  it("puts a situation in front of the learner in most questions", () => {
    const situation =
      /\byou\b|\byour\b|\b(team|shop|clinic|gym|school|library|bookshop|store|table|tables|column|row|rows|query|index|plan|transaction|transactions|session|sessions|replicas?|shards?|orders?|customers?|accounts?|users?|staff|products?|students?|doctors?|bike|riders?|report|application|service|server|cache|document|documents|keys?|payments|events|emp|extract|cluster|ledger|feed|posts?|bank)\b/iu;
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.9);
    const withCode = bundle.questions.filter(
      (question) =>
        question.prompt.split("\n").filter((line) => /^\s*`[^`]+`$/u.test(line)).length >= 2,
    );
    expect(withCode.length).toBeGreaterThanOrEqual(1);
    for (const question of withCode)
      expect(question.prompt, question.id).toMatch(/\?\s*$|\?\s*\n/u);
    // Most prompts show rows, a schema, a statement or a plan.
    const showsData = bundle.questions.filter((question) =>
      /`[^`]+`|\(\d|\bx = \d|\bN = \d/u.test(question.prompt),
    );
    expect(showsData.length).toBeGreaterThanOrEqual(bundle.questions.length * 0.5);
  });

  it("keeps dashes out of questions, hints and feedback", () => {
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
  });

  it("marks one option right, keeps options alike in length and form, and explains each wrong one", () => {
    const places = new Set<number>();
    let threeOrMore = 0;
    let rightLongest = 0;
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      const rightLength = right[0]?.label.length ?? 0;
      if (question.choices.length >= 3) {
        threeOrMore += 1;
        if (rightLength > longestOther) rightLongest += 1;
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
    expect([...places].sort()).toEqual([0, 1, 2, 3]);
  });

  it("keeps most questions multiple choice, with a few to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(4);
    expect(counts.sort).toBeGreaterThanOrEqual(4);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.6);
    expect(counts.numeric).toBeLessThanOrEqual(26);
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

  it("covers the judgements a schema, a query or a transaction gets wrong", () => {
    const text = bundle.questions.map((question) =>
      [
        question.prompt,
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.sort?.items ?? []).map((item) => item.label),
        ...(question.order?.items ?? []),
        ...(question.misconceptions ?? []).map((item) => item.feedback),
      ].join(" "),
    );
    for (const phrase of [
      /update anomaly|delete anomaly|insert anomaly/iu,
      /lossless|spurious|invented|never there/iu,
      /composite|leading column|`\(last_name, first_name\)`|idx_name/iu,
      /function|lower\(email\)/iu,
      /EXPLAIN ANALYZE/u,
      /lost update/iu,
      /write skew/iu,
      /phantom/iu,
      /non-repeatable/iu,
      /deadlock|version column|FOR UPDATE/iu,
      /surrogate|generated `id`/iu,
      /ON DELETE (CASCADE|RESTRICT|SET NULL)/u,
      /every column|index on every/iu,
      /measure|before changing the schema/iu,
      /hot spot/iu,
      /R \+ W/u,
    ])
      expect(
        text.some((entry) => phrase.test(entry)),
        String(phrase),
      ).toBe(true);
  });

  it("does not mark a typed answer right when it only repeats the prompt", () => {
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
  });

  it("gives hints that guide, with no first letters and no bare sums", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
      }
      if (kind(question) !== "numeric")
        expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps a review card for each lesson that asks for a name, a number or a choice, or is self-rated", () => {
    for (const card of bundle.flashcards)
      expect(Boolean(card.answerAuthority) || card.recall === "self", card.id).toBe(true);
    for (const card of bundle.flashcards) {
      if (card.answerAuthority?.kind !== "text") continue;
      expect(assessTextAnswer(card.front, card.answerAuthority).correct, card.id).toBe(false);
    }
    // No card drills arithmetic that a replaced question used to ask.
    for (const card of bundle.flashcards)
      expect(card.front, card.id).not.toMatch(
        /how many (rows|levels|build and probe operations)\b/iu,
      );
  });
});
