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
 * Cloud Fundamentals follows the way DevOps and Delivery asks questions (docs/question-writing-guide.md),
 * adapted to a subject learned by choosing and configuring services: most questions put a policy statement,
 * a route table, a bill, a dashboard or an architecture in front of the learner and ask for a decision or a
 * reading. Numeric questions stay only where the number is the cloud decision: addresses in a block,
 * availability, a monthly cost from a stated price, or the servers a design must run. The CIDR, policy and
 * availability answers are recomputed here from the text of each question.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/cloud-fundamentals/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
type Statement = { Effect: string; Action: string; Resource: string };
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const get = (id: string): Question => {
  const question = questions.get(id);
  if (!question) throw new Error(`missing question ${id}`);
  return question;
};
const kind = (question: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  question.responseType === "numeric"
    ? "numeric"
    : question.responseType === "order" || question.responseType === "sort"
      ? question.responseType
      : question.choices
        ? "choice"
        : "typed";
const codeLines = (question: Question) =>
  question.prompt.split("\n").filter((line) => /^\s*`[^`]+`$/u.test(line));
const unwrap = (line: string) => line.replace(/^\s*`(.*)`$/u, "$1");
const rightChoice = (question: Question) => {
  const authority = question.answerAuthority;
  if (!question.choices || authority.kind !== "text") throw new Error(`${question.id} has no choices`);
  return question.choices.filter((choice) => assessTextAnswer(choice.label, authority).correct);
};
const numericValue = (id: string) => {
  const authority = get(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};

describe("questions in Cloud Fundamentals", () => {
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
    expect([...cards].filter((id) => !bundle.flashcards.some((card) => card.id === id))).toEqual([]);
  });

  it("ends each lesson with three questions of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(get(id)));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps numeric questions to places where the number is the point", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(18);
    for (const question of numeric) {
      expect(question.hints.length, question.id).toBe(3);
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(`${question.id} is not numeric`);
      // A tolerance finer than half the last digit of the answer marks a rounded answer wrong.
      const decimals = (String(authority.value).split(".")[1] ?? "").length;
      if (decimals > 0)
        expect(authority.absoluteTolerance, question.id).toBeGreaterThanOrEqual(
          0.5 * 10 ** -decimals - 1e-12,
        );
    }
    for (const lesson of bundle.lessons) {
      const ends = lesson.questionIds.map((id) => kind(get(id)));
      expect(ends.filter((type) => type === "numeric").length, lesson.id).toBeLessThanOrEqual(1);
    }
  });

  it("puts a policy, a route table, a bill or a dashboard in front of the learner in many questions", () => {
    const withCode = bundle.questions.filter((question) => codeLines(question).length >= 1);
    expect(withCode.length).toBeGreaterThanOrEqual(12);
    for (const question of withCode) {
      // The question comes after the code, or the code follows a short setup.
      expect(question.prompt, question.id).toMatch(/\?\s*$|\?\s*\n\s*`/u);
      for (const line of codeLines(question)) expect(line, question.id).not.toMatch(/\t/u);
    }
    const situation = /\byou\b|\byour\b|\b(team|company|service|server|servers|bucket|database|subnet|bill|user|engineer|workload|workloads|web|function|region|account|organisation)s?\b/iu;
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
  });

  it("writes every IAM statement shown in a question as valid JSON with an effect, an action and a resource", () => {
    let statements = 0;
    for (const question of bundle.questions)
      for (const line of codeLines(question).map(unwrap)) {
        if (!line.startsWith("{")) continue;
        const statement = JSON.parse(line) as Statement;
        statements += 1;
        expect(["Allow", "Deny"], question.id).toContain(statement.Effect);
        expect(statement.Action, question.id).toMatch(/^[a-z0-9]+:[A-Za-z*]+$/u);
        expect(statement.Resource, question.id).toMatch(/^arn:aws:[a-z0-9]+:::?[^\s]+$/u);
      }
    expect(statements).toBeGreaterThanOrEqual(5);
  });

  it("recomputes the policy decisions with IAM's order: explicit deny, then allow, then default deny", () => {
    const matches = (pattern: string, value: string) =>
      new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/gu, "\\$&").replace(/\*/gu, ".*")}$`, "u").test(
        value,
      );
    const decide = (
      statements: Statement[],
      action: string,
      resource: string,
    ): "Allowed" | "Denied by an explicit deny" | "Denied by default" => {
      const applies = (effect: string) =>
        statements.some(
          (s) => s.Effect === effect && matches(s.Action ?? "", action) && matches(s.Resource ?? "", resource),
        );
      if (applies("Deny")) return "Denied by an explicit deny";
      return applies("Allow") ? "Allowed" : "Denied by default";
    };
    const statementsOf = (question: Question) =>
      codeLines(question)
        .map(unwrap)
        .filter((line) => line.startsWith("{"))
        .map((line) => JSON.parse(line) as Statement);

    const four = get("clof-identity-and-access-four-requests");
    const requests = codeLines(four)
      .map(unwrap)
      .map((line) => /^(\d)\s+(\S+)\s+(\S+)$/u.exec(line))
      .filter((match): match is RegExpExecArray => match !== null);
    expect(requests).toHaveLength(4);
    const allowed = requests
      .filter((match) => decide(statementsOf(four), match[2] ?? "", match[3] ?? "") === "Allowed")
      .map((match) => match[1]);
    expect(rightChoice(four)[0]?.label).toBe(`Only (${allowed.join(") and (")})`);

    const mismatch = get("clof-identity-and-access-arn-mismatch");
    const asked = /asks for `([^`]+)` on `([^`]+)`/u.exec(mismatch.prompt);
    const decision = decide(statementsOf(mismatch), asked?.[1] ?? "", asked?.[2] ?? "");
    expect(decision).toBe("Denied by default");
    expect(rightChoice(mismatch)[0]?.label.startsWith(decision)).toBe(true);

    const objectArn = get("clof-identity-and-access-object-arn");
    const [statement] = statementsOf(objectArn);
    expect(decide([statement as Statement], "s3:PutObject", "arn:aws:s3:::site-assets/app.js")).toBe(
      "Denied by default",
    );
    expect(rightChoice(objectArn)[0]?.label).toContain("arn:aws:s3:::site-assets/*");
    expect(decide([{ ...(statement as Statement), Resource: "arn:aws:s3:::site-assets/*" }], "s3:PutObject", "arn:aws:s3:::site-assets/app.js")).toBe(
      "Allowed",
    );
  });

  it("recomputes every CIDR answer from the prefix lengths in the question", () => {
    const addresses = (prefix: number) => 2 ** (32 - prefix);
    const prefixOf = (question: Question) => Number(/\/(\d+)/u.exec(question.prompt)?.[1]);

    expect(numericValue("clof-virtual-networks-cidr20")).toBe(addresses(prefixOf(get("clof-virtual-networks-cidr20"))));
    expect(numericValue("clof-virtual-networks-usable28")).toBe(
      addresses(prefixOf(get("clof-virtual-networks-usable28"))) - 5,
    );

    // The smallest AWS subnet block that holds the servers once 5 addresses are reserved.
    const fit = get("clof-virtual-networks-fit-300");
    const needed = Number(/for ([\d,]+) servers/u.exec(fit.prompt)?.[1]?.replace(/,/gu, ""));
    let smallest = 28;
    while (addresses(smallest) - 5 < needed) smallest -= 1;
    expect(rightChoice(fit)).toHaveLength(1);
    expect(rightChoice(fit)[0]?.label).toBe(`\`/${smallest}\``);
    // Every other option either does not fit or is a larger block than needed.
    for (const choice of (fit.choices ?? []).filter((c) => c !== rightChoice(fit)[0])) {
      const prefix = Number(/\/(\d+)/u.exec(choice.label)?.[1]);
      expect(prefix === smallest || addresses(prefix) - 5 >= needed ? prefix < smallest : prefix > smallest, choice.label).toBe(true);
    }

    // Every address in 10.0.1.0/24 begins with 10.0.1, and a /16 fixes two numbers.
    const inside = get("clof-virtual-networks-inside-prefix");
    expect(rightChoice(inside)[0]?.label).toBe("10.0.1");
    const first = BigInt(10 * 2 ** 24 + 1 * 2 ** 8);
    const last = first + BigInt(addresses(24) - 1);
    expect(Number(last >> 8n)).toBe(Number(first >> 8n));
  });

  it("recomputes the availability, allowance, cost and sizing answers", () => {
    expect(numericValue("clof-regions-zones-and-availability-worked-series")).toBeCloseTo(
      0.9995 * 0.999 * 100,
      9,
    );
    expect(numericValue("clof-regions-zones-and-availability-faded-pair")).toBeCloseTo(
      (1 - 0.005 * 0.005) * 100,
      9,
    );
    expect(numericValue("clof-regions-zones-and-availability-transfer")).toBeCloseTo(
      0.9999 * (1 - 0.001 * 0.001) * 100,
      3,
    );
    // 99.95% of a year of 525,600 minutes leaves 262.8 minutes, and 40 + 95 + 80 are spent.
    expect(numericValue("clof-regions-zones-and-availability-budget-left")).toBeCloseTo(
      525600 * (1 - 0.9995) - (40 + 95 + 80),
      6,
    );
    expect(numericValue("clof-compute-options-monthly")).toBeCloseTo(3 * 0.1 * 730, 9);
    expect(numericValue("clof-compute-options-crossover")).toBeCloseTo(73 / 3.54, 1);
    expect(numericValue("clof-storage-types-cost")).toBeCloseTo(10000 * 0.0125 + 2000 * 0.01, 9);
    expect(numericValue("clof-managed-databases-transfer")).toBe(10 + 25 + 15 - 30);
    expect(numericValue("clof-scaling-and-decoupling-worked")).toBe(Math.ceil(260 / 60));
    expect(numericValue("clof-scaling-and-decoupling-peak-servers")).toBe(Math.ceil(900 / 150) + 1);
    expect(numericValue("clof-cost-and-pricing-storage")).toBeCloseTo(650 * 0.023, 9);
    expect(numericValue("clof-cost-and-pricing-schedule")).toBeCloseTo(0.1 * 12 * 21, 9);
    expect(numericValue("clof-cost-and-pricing-breakeven")).toBe(100 - 45);
    expect(numericValue("clof-cost-and-pricing-nat-bill")).toBeCloseTo(0.045 * 730 + 0.045 * 2000, 9);
    expect(numericValue("clof-designing-for-failure-three-zones")).toBe((8 / 2) * 3);
    expect(numericValue("clof-designing-for-failure-four-zones")).toBe((12 / 3) * 4);
    // The bill in the cost question adds up to the totals it quotes.
    const bill = get("clof-cost-and-pricing-bill-jump");
    expect(bill.prompt).toContain("$410.50");
    expect(219 + 11.5 + 180).toBeCloseTo(410.5, 9);
    expect(219 + 11.5 + 510.3).toBeCloseTo(740.8, 9);
    expect(510.3 / 0.09).toBeCloseTo(5670, 6);
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
  });

  it("marks one option right, never makes it the longest by a quarter, and explains each wrong one", () => {
    const places = new Set<string>();
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const right = rightChoice(question);
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      if (longestOther >= 20)
        expect(right[0]?.label.length ?? 0, question.id).toBeLessThanOrEqual(longestOther * 1.25);
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

  it("keeps most questions multiple choice or short text, with some to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(4);
    expect(counts.sort).toBeGreaterThanOrEqual(4);
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

  it("covers the mistakes people make in the cloud: an explicit deny, a stateless network ACL, a public bucket, multi-AZ for multi-region, serverless limits and keys in code", () => {
    const text = bundle.questions.map((question) =>
      [
        question.prompt,
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.sort?.items ?? []).map((item) => item.label),
        ...(question.misconceptions ?? []).map((item) => item.feedback),
      ].join(" "),
    );
    for (const phrase of [
      /explicit deny/iu,
      /stateless/iu,
      /anyone on the internet/iu,
      /multi-AZ/u,
      /15 minutes|cold start/iu,
      /access key/iu,
      /internet gateway/iu,
      /replic/iu,
      /service control policy|SCP/u,
      /data residency/iu,
    ])
      expect(text.some((entry) => phrase.test(entry)), String(phrase)).toBe(true);
  });

  it("never offers a long-lived key in code as the right answer", () => {
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      expect(rightChoice(question)[0]?.label ?? "", question.id).not.toMatch(
        /keep the access key|key in the repository|key in the config/iu,
      );
    }
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
      const needsTwo = question.order || question.sort || kind(question) === "numeric";
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(needsTwo ? 2 : 1);
    }
  });

  it("gives every judgement question two hints", () => {
    for (const question of bundle.questions)
      if (kind(question) !== "numeric" && !question.id.endsWith("-term"))
        expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
  });

  it("keeps a review card for each lesson that asks for a name, a number or a choice, or is self-rated", () => {
    for (const card of bundle.flashcards)
      expect(Boolean(card.answerAuthority) || card.recall === "self", card.id).toBe(true);
  });
});
