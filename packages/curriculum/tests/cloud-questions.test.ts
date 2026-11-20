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
 * reading. Numeric questions stay only where the number is the cloud decision: addresses in a block. The
 * availability, cost, recovery and sizing questions ask for a judgement, such as which design is cheaper or
 * roughly how much downtime a pair has. The CIDR and policy answers are recomputed here from the text of
 * each question, and the figures behind each judgement answer are recomputed from the scenario.
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

  it("ends each lesson with three questions, and mixes types in most lessons", () => {
    // Three lessons ended with a calculation beside two multiple-choice questions. Those calculations now
    // ask for a judgement, so those lessons end with three multiple-choice questions.
    const singleType: string[] = [];
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(get(id)));
      expect(types, lesson.id).toHaveLength(3);
      if (new Set(types).size < 2) singleType.push(lesson.id);
    }
    expect(singleType.length, singleType.join(", ")).toBeLessThanOrEqual(3);
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

  it("recomputes the figures behind each judgement answer", () => {
    const label = (id: string) => rightChoice(get(id))[0]?.label;
    // Required parts add their downtime: a 99.95% web tier and a 99.9% database are down about
    // 0.15% of the time, half as much again as the database alone.
    const seriesDowntime = (1 - 0.9995 * 0.999) / (1 - 0.999);
    expect(seriesDowntime).toBeGreaterThan(1.4);
    expect(seriesDowntime).toBeLessThan(1.6);
    expect(label("clof-regions-zones-and-availability-worked-series")).toBe("About 50% more");
    // Either of two 99.5% components can serve, so the pair is down 0.005 x 0.005 of the time,
    // which is a 200th of one component's downtime.
    expect((0.005 * 0.005) / 0.005).toBeCloseTo(1 / 200, 12);
    expect(label("clof-regions-zones-and-availability-faded-pair")).toBe("About a 200th as much");
    // A second balancer lifts the whole further than a third web server or better web servers.
    const whole = (balancer: number, servers: number[]) =>
      balancer * (1 - servers.reduce((down, availability) => down * (1 - availability), 1));
    const base = whole(0.9999, [0.999, 0.999]);
    const secondBalancer = (1 - (1 - 0.9999) ** 2) * (1 - 0.001 ** 2);
    expect(secondBalancer - base).toBeGreaterThan(whole(0.9999, [0.999, 0.999, 0.999]) - base);
    expect(secondBalancer - base).toBeGreaterThan(whole(0.9999, [0.9999, 0.9999]) - base);
    expect(label("clof-regions-zones-and-availability-transfer")).toBe("Add a second load balancer");
    // 99.95% of a year of 525,600 minutes leaves 262.8 minutes, and 40 + 95 + 80 are spent,
    // which leaves under the hour that the migration might take.
    expect(525600 * (1 - 0.9995) - (40 + 95 + 80)).toBeLessThan(60);
    expect(label("clof-regions-zones-and-availability-budget-left")).toMatch(/^No, less than an hour/u);
    // Three instances at $0.10 an hour for 730 hours come to $219, closest to $220.
    expect(3 * 0.1 * 730).toBeCloseTo(219, 9);
    expect(label("clof-compute-options-monthly")).toBe("About $220");
    // The function crosses the machine at 73 / 3.54 = 20.6 million requests.
    expect(73 / 3.54).toBeGreaterThan(19);
    expect(73 / 3.54).toBeLessThan(22);
    expect(label("clof-compute-options-crossover")).toBe("About 20 million");
    // 10,000 GB in infrequent access with 2,000 GB read back costs $145 against $230 for standard.
    const infrequent = 10000 * 0.0125 + 2000 * 0.01;
    const standard = 10000 * 0.023;
    expect(1 - infrequent / standard).toBeGreaterThan(0.3);
    expect(1 - infrequent / standard).toBeLessThan(0.4);
    expect(label("clof-storage-types-cost")).toBe("About a third cheaper");
    // 10 + 25 + 15 = 50 minutes of outage against an RTO of 30 is 20 minutes over.
    expect(10 + 25 + 15 - 30).toBe(20);
    expect(label("clof-managed-databases-transfer")).toBe("It misses the RTO by about 20 minutes");
    // Four workers handle 240 a second against 260 arriving, and five handle 300.
    expect(4 * 60).toBeLessThan(260);
    expect(5 * 60).toBeGreaterThanOrEqual(260);
    expect(label("clof-scaling-and-decoupling-worked")).toMatch(/^It keeps growing/u);
    // 900 / 150 = 6 servers carry the peak, and one more survives any one failure.
    expect(Math.ceil(900 / 150) + 1).toBe(7);
    expect(label("clof-scaling-and-decoupling-peak-servers")).toBe("One more");
    // Storage at $0.023 against transfer at $0.09 for the same 650 GB is about a quarter.
    expect((650 * 0.023) / (650 * 0.09)).toBeGreaterThan(0.2);
    expect((650 * 0.023) / (650 * 0.09)).toBeLessThan(0.3);
    expect(label("clof-cost-and-pricing-storage")).toBe("About a quarter as much");
    // 12 hours on 21 days is 252 of 730 hours, a little over a third.
    expect((12 * 21) / 730).toBeGreaterThan(0.3);
    expect((12 * 21) / 730).toBeLessThan(0.4);
    expect(label("clof-cost-and-pricing-schedule")).toBe("About a third");
    // A 45% discount costs 55% of the full price, so on demand reaches it at 55% use.
    expect(100 - 45).toBe(55);
    expect(label("clof-cost-and-pricing-breakeven")).toBe("Lower, at about 55%");
    // The hourly charge covers 730 hours and the data charge 2,000 GB at the same price.
    expect((0.045 * 2000) / (0.045 * 730)).toBeGreaterThan(2.5);
    expect((0.045 * 2000) / (0.045 * 730)).toBeLessThan(3);
    expect(label("clof-cost-and-pricing-nat-bill")).toBe("The data charge, at about three times the hourly");
    // Two remaining zones carry the peak: 8 needs 3 x 4 = 12 servers, and 12 needs 4 x 4 = 16.
    expect(((8 / 2) * 3) / 8).toBe(1.5);
    expect(label("clof-designing-for-failure-three-zones")).toBe("Half as much again");
    expect(((12 / 3) * 4) / 12).toBeCloseTo(4 / 3, 12);
    expect(label("clof-designing-for-failure-four-zones")).toBe("A third as much again");
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
