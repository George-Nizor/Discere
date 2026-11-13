import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import {
  type CourseBundle,
  ORDER_ANSWER_IDEA,
  type Question,
  SORT_ANSWER_IDEA,
} from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Cybersecurity follows the way History asks questions (docs/question-writing-guide.md), adapted to
 * judgement about threats and defences: a log and what it shows, a firewall list and what it allows,
 * a query and the fix that closes it, a leaked table and what an attacker can do with it, a threat
 * and the control that answers it. Facts were checked against the NIST SP 800-63B and SP 800-61
 * Revision 2 texts, the OWASP cheat sheets (SQL injection, XSS, CSRF, SSRF, passwords, sessions,
 * logging), RFC 8446, RFC 9116 and the CVSS 3.1 specification. Numeric questions stay only where
 * the number carries a decision (an ALE, a search time, a key space, a dwell time, a backup gap).
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/cybersecurity/bundle.json", import.meta.url), "utf8"),
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
const get = (id: string): Question => {
  const question = questions.get(`cyb-${id}`);
  if (!question) throw new Error(`no question ${id}`);
  return question;
};
const numericValue = (id: string): number => {
  const authority = get(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const rightLabel = (id: string): string => {
  const question = get(id);
  const authority = question.answerAuthority;
  if (authority.kind !== "text") throw new Error(`${id} is not text`);
  return authority.acceptedIdeas[0] ?? "";
};

describe("questions in Cybersecurity", () => {
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
    expect(bundle.questions.filter((question) => !asked.has(question.id)).map((q) => q.id)).toEqual(
      [],
    );
    const cards = new Set(bundle.lessons.flatMap((lesson) => lesson.flashcardIds));
    expect(bundle.flashcards.filter((card) => !cards.has(card.id)).map((card) => card.id)).toEqual(
      [],
    );
  });

  it("ends each lesson with three questions of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps numeric questions to places where the number carries a decision", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(12);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("recomputes every numeric answer", () => {
    // Annualised loss expectancy: cost of one loss times the yearly rate.
    expect(120000 * 0.2 - 120000 * 0.15 - 2000).toBe(
      numericValue("risk-and-the-cia-triad-cheap-control"),
    );
    expect(30000 * 0.4 - 30000 * 0.1 - 6000).toBe(
      numericValue("risk-and-the-cia-triad-practice-3"),
    );
    // Layers multiply their pass fractions.
    expect(+(0.006 * 0.5 * 100).toFixed(3)).toBe(
      numericValue("attackers-and-defence-in-depth-four-layers"),
    );
    expect(+(0.1 * 0.2 * 100).toFixed(3)).toBe(
      numericValue("attackers-and-defence-in-depth-lose-host"),
    );
    // Search spaces and times.
    const space = (k: number, n: number) => Number(BigInt(k) ** BigInt(n));
    expect(+(space(36, 10) / 1e10 / 3600).toFixed(2)).toBe(
      numericValue("passwords-and-authentication-tenth-character"),
    );
    expect(+(space(62, 7) / 1e10 / 60).toFixed(1)).toBe(
      numericValue("passwords-and-authentication-seven-minutes"),
    );
    expect(+(2 ** 40 / 1e9 / 60).toFixed(1)).toBe(
      numericValue("cryptography-basics-forty-bit-minutes"),
    );
    // Dates and clock times.
    const days = (from: string, to: string) =>
      Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
    expect(days("2026-04-20", "2026-05-30")).toBe(numericValue("tls-and-certificates-days-left"));
    const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    expect(minutes("13:35") - minutes("08:50")).toBe(
      numericValue("logging-and-detection-practice-1"),
    );
    expect(1440 - minutes("22:40") + minutes("03:10")).toBe(
      numericValue("logging-and-detection-overnight-dwell"),
    );
    expect(minutes("14:20") - minutes("12:00")).toBe(numericValue("incident-response-backup-loss"));
    // The lesson's priority rule: score times weight, plus 10 if attacks have been seen.
    expect(+(6.4 * 3 + 10).toFixed(1)).toBe(
      numericValue("vulnerabilities-and-secure-development-score-six"),
    );
  });

  it("holds the figures that the prompts quote", () => {
    const md5 = (text: string) => createHash("md5").update(text).digest("hex");
    expect(get("passwords-and-authentication-leaked-table").prompt).toContain(md5("password"));
    expect(get("passwords-and-authentication-leaked-table").prompt).toContain(md5("password123"));
    const sha = (text: string) => createHash("sha256").update(text).digest("hex");
    const [first, second] = [sha("invoice 100 paid"), sha("invoice 101 paid")];
    expect(first).toHaveLength(64);
    expect([...first].filter((char, index) => char !== second[index]).length).toBeGreaterThan(55);
    // 62^6 against 26^8, quoted as about 57 and 209 billion.
    expect(Math.round(62 ** 6 / 1e9)).toBe(57);
    expect(Math.round(26 ** 8 / 1e9)).toBe(209);
    expect(rightLabel("passwords-and-authentication-length-or-alphabet")).toContain("209 billion");
    // XOR with the same key twice returns the original.
    expect(11 ^ 6).toBe(13);
    expect(11 ^ 6 ^ 6).toBe(11);
    expect(rightLabel("cryptography-basics-xor-bits")).toMatch(/^11,/u);
    // Key space: each extra bit doubles it, and 128 bits has 2^88 times as many keys as 40.
    expect(2 ** 41 / 2 ** 40).toBe(2);
    expect(128 - 40).toBe(88);
    // Impossible travel: 5,570 km in half an hour.
    expect(5570 / 0.5).toBe(11140);
  });

  it("ranks the findings of the order question by the lesson's rule", () => {
    const weight = { internet: 3, internal: 2, isolated: 1 } as const;
    const priority = (score: number, exposure: keyof typeof weight, seen: boolean) =>
      +(score * weight[exposure] + (seen ? 10 : 0)).toFixed(1);
    const ranked = [
      ["X", priority(6.5, "internet", true)],
      ["Y", priority(7.8, "internal", false)],
      ["Z", priority(5.0, "internet", false)],
      ["W", priority(9.0, "isolated", false)],
      ["V", priority(8.2, "isolated", false)],
    ] as const;
    const sorted = [...ranked].sort((a, b) => b[1] - a[1]).map(([name]) => name);
    const items = get("vulnerabilities-and-secure-development-order-patches").order?.items ?? [];
    expect(items.map((item) => item.slice(8, 9))).toEqual(sorted);
    expect(priority(8.8, "internal", false)).toBe(17.6);
    expect(priority(5.9, "internet", true)).toBe(27.7);
    expect(rightLabel("vulnerabilities-and-secure-development-which-first")).toContain("27.7");
    expect(rightLabel("vulnerabilities-and-secure-development-which-first")).toContain("17.6");
  });

  it("reads the firewall lists as the questions say", () => {
    type Rule = { allow: boolean; port?: number; from?: string; to?: string };
    const decide = (rules: Rule[], packet: { port: number; from: string; to: string }) => {
      const index = rules.findIndex(
        (rule) =>
          (rule.port === undefined || rule.port === packet.port) &&
          (rule.from === undefined || rule.from === packet.from) &&
          (rule.to === undefined || rule.to === packet.to),
      );
      return { rule: index + 1, allow: rules[index]?.allow ?? false };
    };
    // Allow, then a deny for one address: the allow rule matches first.
    expect(
      decide(
        [
          { allow: true, port: 80, to: "web" },
          { allow: false, port: 80, from: "203.0.113.7", to: "web" },
          { allow: false },
        ],
        { port: 80, from: "203.0.113.7", to: "web" },
      ),
    ).toEqual({ rule: 1, allow: true });
    expect(rightLabel("network-security-practice-2")).toContain("rule 1 matches it first");
    // Deny 5432 from any host, then allow it from web: the deny matches first.
    expect(
      decide(
        [
          { allow: false, port: 5432, to: "db" },
          { allow: true, port: 5432, from: "web", to: "db" },
          { allow: false },
        ],
        { port: 5432, from: "web", to: "db" },
      ),
    ).toEqual({ rule: 1, allow: false });
    // A list that ends in allow all lets a new service on 5432 through.
    expect(
      decide([{ allow: false, port: 3389 }, { allow: true }], {
        port: 5432,
        from: "internet",
        to: "db",
      }),
    ).toEqual({ rule: 2, allow: true });
    // The web shop's list: ssh from the internet falls through to the final deny.
    expect(
      decide(
        [
          { allow: true, port: 443, to: "web" },
          { allow: true, port: 5432, from: "web", to: "db" },
          { allow: true, port: 22, from: "office", to: "web" },
          { allow: false },
        ],
        { port: 22, from: "internet", to: "web" },
      ),
    ).toEqual({ rule: 4, allow: false });
    expect(rightLabel("network-security-which-rule")).toMatch(/^Rule 4/u);
  });

  it("runs the SQL of the injection questions", async () => {
    let sqlite: typeof import("node:sqlite");
    try {
      sqlite = await import("node:sqlite");
    } catch {
      return;
    }
    const db = new sqlite.DatabaseSync(":memory:");
    db.exec(
      "create table orders(id integer primary key, customer text, total real);" +
        "insert into orders values (1,'ada',20),(2,'ben',35),(3,'ada',12.5),(4,'cora',90),(5,'dev',7);" +
        "create table users(name text, password text);" +
        "insert into users values ('Ada','s3cret'),('Ben','hunter2'),('Cora','pa55'),('Dev','letmein');",
    );
    const joined = (name: string) =>
      db.prepare(`SELECT id, total FROM orders WHERE customer = '${name}'`).all().length;
    expect(joined("ada")).toBe(2);
    expect(joined("' OR '1'='1")).toBe(5);
    expect(
      db.prepare("SELECT id, total FROM orders WHERE customer = ?").all("' OR '1'='1"),
    ).toHaveLength(0);
    // AND binds more tightly than OR.
    const login = "SELECT * FROM users WHERE name = 'Ada' AND password = '' OR '1'='1'";
    expect(db.prepare(login).all()).toHaveLength(4);
    expect(
      db.prepare("SELECT * FROM users WHERE name = 'Ada' AND (password = '' OR '1'='1')").all(),
    ).toHaveLength(1);
    expect(
      db.prepare("SELECT * FROM users WHERE name = ? AND password = ?").all("Ada", "' OR '1'='1"),
    ).toHaveLength(0);
    // A marker in ORDER BY is a constant: the rows do not come back sorted by the column.
    const byColumn = (
      db.prepare("SELECT id FROM orders ORDER BY total").all() as { id: number }[]
    ).map((row) => row.id);
    const byMarker = (
      db.prepare("SELECT id FROM orders ORDER BY ?").all("total") as { id: number }[]
    ).map((row) => row.id);
    expect(byColumn).toEqual([5, 3, 1, 2, 4]);
    expect(byMarker).toEqual([1, 2, 3, 4, 5]);
    expect(get("web-injection-predict-rows").prompt).toContain("3 rows");
    expect(rightLabel("web-injection-parameter-rows")).toMatch(/^No rows/u);
  });

  it("encodes the comment as the lesson says", () => {
    const encodeHtml = (text: string) =>
      text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
    expect(encodeHtml("a<b")).toBe("a&lt;b");
    expect(rightLabel("web-injection-encoded-comment")).toBe("`a&lt;b`");
  });

  it("verifies the token of the audience question", () => {
    const b64 = (input: string | Buffer) => Buffer.from(input).toString("base64url");
    const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const claims = {
      iss: "https://login.example",
      aud: "billing-api",
      sub: "ana",
      exp: 1893456000,
    };
    const prompt = get("authorisation-and-sessions-wrong-audience").prompt;
    expect(prompt).toContain(JSON.stringify(claims));
    const token = `${header}.${b64(JSON.stringify(claims))}`;
    const signature = createHmac("sha256", "k3y").update(token).digest();
    expect(signature).toHaveLength(32);
    // The checks a receiver makes: the audience is wrong though the expiry and issuer pass.
    expect(1893454200 < claims.exp).toBe(true);
    expect(claims.aud).not.toBe("shop-api");
    expect(rightLabel("authorisation-and-sessions-wrong-audience")).toContain("audience");
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
      ].join(" ");
      expect(text, question.id).not.toMatch(/[—–]/u);
    }
    for (const card of bundle.flashcards)
      expect(`${card.front} ${card.back}`, card.id).not.toMatch(/[—–]/u);
  });

  it("marks one option right and explains each wrong one", () => {
    const places = new Set<string>();
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of others)
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
      places.add(`${question.choices.indexOf(right[0] as (typeof question.choices)[number])}`);
    }
    expect([...places].sort()).toEqual(["0", "1", "2", "3"]);
  });

  it("keeps the right option from standing out by length", () => {
    const withThree = bundle.questions.filter(
      (question) => question.choices && question.choices.length >= 3,
    );
    let longest = 0;
    let shortest = 0;
    for (const question of withThree) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.find(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      const others = question.choices.filter((choice) => choice !== right);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      const shortestOther = Math.min(...others.map((choice) => choice.label.length));
      const length = right?.label.length ?? 0;
      if (length > longestOther) {
        longest += 1;
        expect(length, question.id).toBeLessThanOrEqual(longestOther * 1.15);
      }
      if (length < shortestOther) shortest += 1;
      const stops = new Set(question.choices.map((choice) => /\.$/u.test(choice.label)));
      expect(stops.size, `${question.id} mixes full stops`).toBe(1);
    }
    expect(longest).toBeLessThanOrEqual(withThree.length * 0.3);
    expect(shortest).toBeLessThanOrEqual(withThree.length * 0.4);
  });

  it("keeps most questions multiple choice or short text, with some to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(3);
    expect(counts.sort).toBeGreaterThanOrEqual(3);
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

  it("sorts and orders the lesson's own sets of kinds", () => {
    const sorts = bundle.questions.filter((question) => question.sort);
    const labels = sorts.flatMap((question) => question.sort?.bins.map((bin) => bin.label) ?? []);
    for (const phrase of [
      /Confidentiality/u,
      /Elevation of privilege/u,
      /Parameterised query/u,
      /Broken access control/u,
      /Message authentication code/u,
      /Revocation/u,
      /Containment, eradication and recovery/u,
    ])
      expect(
        labels.some((label) => phrase.test(label)),
        String(phrase),
      ).toBe(true);
    const orders = bundle.questions.filter((question) => question.order);
    expect(orders.map((question) => question.skill).sort()).toEqual([
      "order-phases",
      "order-stages",
      "prioritise-patches",
      "read-chain",
    ]);
  });

  it("asks about the flaws it teaches in a situation", () => {
    const text = bundle.questions.map((question) =>
      [
        question.prompt,
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.misconceptions ?? []).map((item) => item.feedback),
      ].join(" "),
    );
    for (const phrase of [
      /salt/iu,
      /MD5/u,
      /ECB/u,
      /obscur|keep the design secret/iu,
      /escap/iu,
      /allow-?list|fixed list/iu,
      /SameSite/u,
      /HttpOnly/u,
      /composition rules/u,
      /ownership|who owns|the owner/iu,
    ])
      expect(
        text.some((entry) => phrase.test(entry)),
        String(phrase),
      ).toBe(true);
  });

  it("puts a situation in front of the learner in most questions", () => {
    const situation =
      /\b(server|user|attacker|log|rule|firewall|password|token|cookie|team|site|page|query|scan|key|certificate|browser|service|app|company|shop|hospital|clinic|account|threat|incident|flaw|finding|alert|request)\b/iu;
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.8);
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
    }
  });

  it("gives every judgement question two hints and every calculation three", () => {
    for (const question of bundle.questions)
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(
        kind(question) === "numeric" ? 3 : 2,
      );
  });

  it("puts the paths and commands of a prompt in backticks", () => {
    for (const question of bundle.questions) {
      const outside = question.prompt.replace(/`[^`]*`/gu, "");
      expect(outside, question.id).not.toMatch(/\/\.well-known|document\.cookie|\bORDER BY\b/u);
      expect(outside, question.id).not.toMatch(/(^|\s)\/[a-z]/u);
    }
  });
});
