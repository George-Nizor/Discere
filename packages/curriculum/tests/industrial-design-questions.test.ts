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
 * Industrial and Product Design follows the way UX and HCI asks questions
 * (docs/question-writing-guide.md): most questions describe a product, a sketch, a user
 * observation or a manufacturing choice in words and ask what a designer should conclude.
 * Numeric questions stay only where the number carries a decision, such as a heating power, a
 * percentile dimension, a ramp run or the quantity at which a mould pays for itself. Every
 * figure used in a prompt or an option is recomputed below.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/industrial-and-product-design/bundle.json", import.meta.url),
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
const rightOption = (question: Question) => {
  const authority = question.answerAuthority;
  if (authority.kind !== "text") return undefined;
  return (question.choices ?? []).filter((choice) =>
    authority.acceptedIdeas.includes(choice.label),
  );
};
const numericValue = (id: string): number => {
  const authority = (questions.get(id) as Question).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const textOf = (id: string): string => {
  const question = questions.get(id) as Question;
  return [
    question.prompt,
    question.onCorrect ?? "",
    ...question.hints,
    ...(question.misconceptions ?? []).map((item) => item.feedback),
    ...(question.choices ?? []).map((choice) => choice.label),
  ].join(" ");
};
const log2 = Math.log2;
const tan = (degrees: number) => Math.tan((degrees * Math.PI) / 180);

describe("questions in Industrial and Product Design", () => {
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

  it("keeps numeric questions to the places where the number carries a decision", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(15);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("asks no fill-in-the-blank question for a term", () => {
    for (const question of bundle.questions)
      expect(question.prompt, question.id).not.toContain("___");
  });

  it("recomputes every numeric answer", () => {
    const mean = 920;
    expect(numericValue("indpd-measuring-people-seated")).toBe(Math.round(mean + 1.645 * 35));
    expect(numericValue("indpd-the-design-brief-power-1l")).toBeCloseTo(
      (4.19 * 80 * 1000) / 120,
      -1,
    );
    expect(numericValue("indpd-measuring-people-new-limit-v2")).toBeCloseTo(23 * 0.6 * 0.9, 2);
    expect(numericValue("indpd-controls-and-reaction-edge")).toBeCloseTo(
      Math.round((0.1 + 0.15 * log2(160 / 200 + 1)) * 100) / 100,
      2,
    );
    expect(numericValue("indpd-designing-for-everyone-p-ramp")).toBeCloseTo(0.3 * 12, 6);
    expect(numericValue("indpd-design-for-manufacture-draft-40")).toBeCloseTo(40 * tan(1), 1);
    expect(numericValue("indpd-design-for-manufacture-boss")).toBeCloseTo(10 - 2 * 0.6 * 2.5, 6);
    expect(numericValue("indpd-design-for-assembly-after-30")).toBeCloseTo((3 * 5) / 30, 6);
    expect(numericValue("indpd-design-for-assembly-service")).toBeCloseTo((3 * 5) / 27, 2);
    expect(numericValue("indpd-prototypes-and-user-tests-five-users")).toBeCloseTo(
      1 - 0.69 ** 5,
      2,
    );
    expect(numericValue("indpd-prototypes-and-user-tests-users-for-90-v2")).toBeCloseTo(
      1 - 0.69 ** 7,
      2,
    );
    expect(numericValue("indpd-life-cycle-and-sustainability-break-even")).toBeCloseTo(50 / 8, 6);
    expect(numericValue("indpd-choosing-a-concept-score-b")).toBeCloseTo(
      0.4 * 3 + 0.3 * 5 + 0.2 * 4 + 0.1 * 4,
      6,
    );
    // 3.5 + 0.5w = 4.5 - 1.5w
    expect(numericValue("indpd-choosing-a-concept-break-even")).toBeCloseTo((4.5 - 3.5) / 2, 6);
    expect(numericValue("indpd-design-for-manufacture-tooling-break-even")).toBe(
      Math.ceil(12000 / (8 - 0.6)),
    );
  });

  it("recomputes the figures that prompts, options and feedback quote", () => {
    // the kettle power in the fast-boil question
    const kj = 4.19 * 80;
    expect(kj).toBeCloseTo(335.2, 6);
    expect(kj / 60).toBeCloseTo(5.587, 3);
    expect(kj / 180).toBeCloseTo(1.862, 3);
    expect(textOf("indpd-the-design-brief-fast-boil")).toContain("335.2");
    expect(textOf("indpd-the-design-brief-fast-boil")).toContain("5.6 kW");
    expect(textOf("indpd-the-design-brief-fast-boil")).toContain("1.9 kW");
    // the delivery margin
    expect(90 + 30).toBe(120);
    // eight cups of 250 ml
    expect((8 * 250) / 1000).toBe(2);
    // five rings, 5!
    expect(5 * 4 * 3 * 2 * 1).toBe(120);
    expect(textOf("indpd-affordances-and-mapping-more-knobs")).toContain("120");
    // a doorway at 1735 mm is too low for 58 percent of adults (mean 1750, sd 70)
    const erf = (x: number) => {
      let sum = x;
      let term = x;
      for (let n = 1; n < 80; n++) {
        term *= (-x * x) / n;
        sum += term / (2 * n + 1);
      }
      return (2 / Math.sqrt(Math.PI)) * sum;
    };
    const taller = 1 - 0.5 * (1 + erf((1735 - 1750) / (70 * Math.SQRT2)));
    expect(Math.round(taller * 100)).toBe(58);
    expect(textOf("indpd-measuring-people-door-why-95th")).toContain("58 percent");
    // stool travel and reach
    expect(Math.round(2 * 1.645 * 25)).toBe(82);
    expect(textOf("indpd-measuring-people-adjust")).toContain("82 mm");
    expect(Math.round(640 - 1.645 * 30)).toBe(591);
    expect(Math.round(640 + 1.645 * 30)).toBe(689);
    // one standard deviation below the mean is the 16th percentile
    expect(0.5 * (1 + erf(-1 / Math.SQRT2))).toBeCloseTo(0.1587, 3);
    // lifting index
    const rwl = 23 * 0.7 * 0.9;
    expect(rwl).toBeCloseTo(14.49, 2);
    expect(12 / rwl).toBeCloseTo(0.83, 2);
    // Fitts and Hick
    const idOf = (d: number, w: number) => log2(d / w + 1);
    expect(idOf(300, 20)).toBeCloseTo(4, 6);
    expect(idOf(150, 20)).toBeCloseTo(3.09, 2);
    const mt = (d: number, w: number) => 0.1 + 0.15 * idOf(d, w);
    expect(mt(240, 40)).toBeCloseTo(0.52, 2);
    expect(mt(240, 40) - mt(240, 80)).toBeCloseTo(0.12, 2);
    expect(0.15 * (idOf(160, 10) - idOf(160, 20))).toBeCloseTo(0.14, 2);
    expect([7, 15, 31].map((n) => Math.round(0.2 * log2(n + 1) * 10) / 10)).toEqual([0.6, 0.8, 1]);
    expect(idOf(400, 15)).toBeCloseTo(4.79, 2);
    expect(idOf(200, 45)).toBeCloseTo(2.44, 2);
    // ADA numbers used in the fitting questions
    expect(1500 - 1220).toBe(280);
    expect(380 - 250).toBe(130);
    expect(1300 - 1220).toBe(80);
    expect(6 / 12).toBe(0.5);
    expect(0.6 * 12).toBeCloseTo(7.2, 6);
    expect(0.6 * 12 - 6).toBeCloseTo(1.2, 6);
    expect(0.45 * 12).toBeCloseTo(5.4, 6);
    // draft and ribs
    expect(50 * tan(1.5)).toBeCloseTo(1.31, 2);
    expect(3.5 * 0.6).toBeCloseTo(2.1, 6);
    // tooling
    expect(12000 / 1622 + 0.6).toBeLessThan(8);
    expect(12000 / 1621 + 0.6).toBeGreaterThan(8);
    expect(12000 / 30000 + 0.6).toBeCloseTo(1, 6);
    // assembly efficiency
    const efficiency = (n: number, t: number) => (3 * n) / t;
    expect(efficiency(5, 75)).toBeCloseTo(0.2, 6);
    expect(efficiency(4, 48)).toBeCloseTo(0.25, 6);
    expect(efficiency(4, 20)).toBeCloseTo(0.6, 6);
    // discovery model
    const found = (p: number, n: number) => 1 - (1 - p) ** n;
    expect(found(0.31, 5)).toBeCloseTo(0.844, 3);
    expect(found(0.31, 15)).toBeCloseTo(0.996, 3);
    expect(Math.round((found(0.31, 15) - found(0.31, 5)) * 100)).toBe(15);
    expect(found(0.15, 5)).toBeCloseTo(0.56, 2);
    expect(found(0.31, 6)).toBeLessThan(0.9);
    // footprints
    const annual = (make: number, use: number, years: number, extra = 0) =>
      (make + extra + use * years) / years;
    expect(annual(60, 15, 6)).toBe(25);
    expect(annual(40, 15, 3)).toBeCloseTo(28.33, 2);
    expect(annual(50, 20, 8, 5)).toBeCloseTo(26.875, 3);
    expect(annual(80, 20, 6)).toBeCloseTo(33.33, 2);
    expect(annual(40, 20, 5)).toBe(28);
    expect(annual(50, 15, 5)).toBe(25);
    expect(annual(60, 20, 6)).toBe(30);
    expect(annual(80, 20, 10)).toBe(28);
    expect(30 * 8).toBe(240);
    // weighted totals
    const total = (weights: number[], scores: number[]) =>
      weights.reduce((sum, weight, i) => sum + weight * (scores[i] as number), 0);
    expect(total([0.3, 0.4, 0.2, 0.1], [4, 3, 5, 2])).toBeCloseTo(3.6, 6);
    expect(total([0.3, 0.4, 0.2, 0.1], [3, 5, 4, 4])).toBeCloseTo(4.1, 6);
    expect(total([0.7, 0.1, 0.1, 0.1], [4, 3, 5, 2])).toBeCloseTo(3.8, 6);
    expect(total([0.7, 0.1, 0.1, 0.1], [3, 5, 4, 4])).toBeCloseTo(3.4, 6);
    expect(total([0.4, 0.3, 0.2, 0.1], [4, 3, 4, 3])).toBeCloseTo(3.6, 6);
    expect(total([0.4, 0.3, 0.2, 0.1], [3, 5, 4, 4])).toBeCloseTo(3.9, 6);
    expect(total([0.5, 0.2, 0.2, 0.1], [4, 3, 4, 3])).toBeCloseTo(3.7, 6);
    expect(total([0.5, 0.2, 0.2, 0.1], [3, 5, 4, 4])).toBeCloseTo(3.7, 6);
  });

  it("keeps dashes and verdict words out of questions, hints, feedback and options", () => {
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
      const feedback = [
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((item) => item.feedback),
      ].join(" ");
      expect(feedback, question.id).not.toMatch(/\b(Correct|Not quite|Well done|Great)\b/u);
    }
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

  it("keeps the right option from giving itself away by length", () => {
    const rows = bundle.questions
      .filter((question) => (question.choices?.length ?? 0) >= 3)
      .map((question) => {
        const right = rightOption(question) ?? [];
        const others = (question.choices ?? []).filter((choice) => !right.includes(choice));
        const longestOther = Math.max(...others.map((choice) => choice.label.length));
        const shortestOther = Math.min(...others.map((choice) => choice.label.length));
        return {
          question,
          rightLength: right[0]?.label.length ?? 0,
          longestOther,
          shortestOther,
        };
      });
    const longest = rows.filter((row) => row.rightLength > row.longestOther);
    expect(longest.length).toBeLessThanOrEqual(Math.floor(rows.length * 0.3));
    const shortest = rows.filter((row) => row.rightLength < row.shortestOther);
    expect(shortest.length).toBeLessThanOrEqual(Math.floor(rows.length * 0.4));
    expect(
      rows.filter((row) => row.rightLength > row.longestOther * 1.15).map((row) => row.question.id),
    ).toEqual([]);
    const mixed = rows.filter((row) => {
      const ends = new Set(
        (row.question.choices ?? []).map((choice) => choice.label.trimEnd().endsWith(".")),
      );
      return ends.size > 1;
    });
    expect(mixed.map((row) => row.question.id)).toEqual([]);
  });

  it("keeps most questions multiple choice or short text, with some to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(4);
    expect(counts.sort).toBeGreaterThanOrEqual(6);
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
        for (const bin of sort.bins)
          expect(
            sort.items.filter((item) => item.bin === bin.id).length,
            `${question.id} ${bin.id}`,
          ).toBeGreaterThanOrEqual(2);
        for (const item of sort.items) expect(item.explanation, question.id).toBeTruthy();
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([SORT_ANSWER_IDEA]);
      }
      if (order || sort) {
        expect(question.answerAuthority.exampleAnswer.length, question.id).toBeGreaterThan(40);
        expect(question.onCorrect, question.id).toBeTruthy();
      }
    }
  });

  it("describes a product, a sketch, a test or a choice in at least sixty questions", () => {
    const case_ =
      /\b(product|kettle|door|cooker|handle|button|switch|box|case|lamp|mould|moulded|chair|stool|shelf|panel|prototype|designer|team|users?|client|bottle|bag|ramp|wall|housing|torch|menu|toolbar|screen|thermostat|fan|jug)\b/iu;
    expect(
      bundle.questions.filter((question) => case_.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(60);
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

  it("marks the likely right and wrong typed answers fairly", () => {
    const check = (id: string, right: string[], wrong: string[]) => {
      const authority = (questions.get(id) as Question).answerAuthority;
      if (authority.kind !== "text") throw new Error(id);
      for (const answer of right)
        expect(assessTextAnswer(answer, authority).correct, `${id}: ${answer}`).toBe(true);
      for (const answer of wrong)
        expect(assessTextAnswer(answer, authority).correct, `${id}: ${answer}`).toBe(false);
    };
    check(
      "indpd-affordances-and-mapping-safe-default",
      ["default", "the default", "a safe default"],
      ["constraint", "signifier", "feedback", "mapping"],
    );
    check(
      "indpd-measuring-people-lift-change",
      ["A lift table", "raise the start of the lift", "put the boxes on a raised pallet"],
      ["a lighter box", "train the packer", "tell them to lift less"],
    );
    check(
      "indpd-controls-and-reaction-screen-edge-short",
      ["the edge of the screen", "the screen edge", "the cursor stops at the edge"],
      ["a bigger button", "a bright colour", "the distance"],
    );
    check(
      "indpd-designing-for-everyone-levers",
      ["low physical effort", "Low physical effort"],
      ["tolerance for error", "size and space", "perceptible information"],
    );
    check(
      "indpd-form-and-design-history-form-language",
      ["form language", "its form language"],
      ["decoration", "a signifier", "ornament"],
    );
    check(
      "indpd-life-cycle-and-sustainability-hotspot-e",
      ["use", "the use phase", "in use"],
      ["making", "manufacture", "end of life"],
    );
  });

  it("gives hints that guide, with no first letters and no bare sums", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
      }
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("replaces the review cards that drilled arithmetic or a bare term", () => {
    const ids = new Set(bundle.flashcards.map((card) => card.id));
    for (const gone of [
      "indpd-the-design-brief-card-1",
      "indpd-affordances-and-mapping-card-2",
      "indpd-measuring-people-card-1",
      "indpd-controls-and-reaction-card-2",
      "indpd-designing-for-everyone-card-2",
      "indpd-form-and-design-history-card-1",
      "indpd-design-for-manufacture-card-2",
      "indpd-design-for-assembly-card-2",
      "indpd-prototypes-and-user-tests-card-1",
      "indpd-life-cycle-and-sustainability-card-2",
      "indpd-choosing-a-concept-card-1",
    ])
      expect(ids.has(gone), gone).toBe(false);
  });
});
