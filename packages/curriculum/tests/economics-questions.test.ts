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
 * Economics follows the way History and Psychology ask questions (docs/question-writing-guide.md),
 * adapted to a subject with both calculation and judgement. A number stays only where the
 * calculation is the economic reasoning: an elasticity from two points, a deadweight loss, a
 * quantity where marginal revenue meets marginal cost. Everything else asks what a policy or an
 * event does, what a claim confuses, or which structure fits a case. Adam Smith, Ricardo, Mill and
 * Veblen appear as extracts. Every numeric answer, and every figure that a choice or its feedback
 * relies on, is recomputed below from the situation, never read back from the bundle.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/economics-markets-and-strategy/bundle.json", import.meta.url),
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
const extractsOf = (question: Question | undefined): string[] =>
  (question?.extracts ?? []).map((extract) => extract.text);
const everyQuestion = [
  ...bundle.questions,
  ...(bundle.courseChecks ?? []).flatMap((check) => check.items.map((item) => item.question)),
];

describe("questions in Economics: Markets and Strategy", () => {
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

  it("keeps numeric questions to calculations that are the economic reasoning", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(34);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(5);
    expect(counts.sort).toBeGreaterThanOrEqual(3);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.6);
  });

  it("puts a classic text in front of the learner in five to eight questions", () => {
    const withExtract = bundle.questions.filter((question) => extractsOf(question).length > 0);
    expect(withExtract.length).toBeGreaterThanOrEqual(5);
    expect(withExtract.length).toBeLessThanOrEqual(8);
    const lessons = bundle.lessons.filter((lesson) =>
      [...lesson.questionIds, ...lesson.steps.map((step) => step.checkQuestionId)].some(
        (id) => extractsOf(questions.get(id)).length > 0,
      ),
    );
    expect(lessons.length).toBeGreaterThanOrEqual(5);
  });

  it("cites a verified public-domain source for every extract and keeps extracts to 30 to 120 words", () => {
    const sources = new Map(bundle.sources.map((source) => [source.id, source]));
    for (const question of bundle.questions) {
      const extracts = extractsOf(question);
      if (extracts.length === 0) continue;
      const cited = question.sourceIds
        .map((id) => sources.get(id))
        .filter((source) => source?.licence.startsWith("Public domain"));
      expect(cited.length, question.id).toBeGreaterThanOrEqual(1);
      for (const source of cited) {
        expect(source?.checked?.status, question.id).toBe("verified");
        expect((source?.checked?.at ?? "") >= "2026-11-14", question.id).toBe(true);
      }
      for (const extract of extracts) {
        const words = extract.split(/\s+/u).length;
        expect(words, question.id).toBeGreaterThanOrEqual(30);
        expect(words, question.id).toBeLessThanOrEqual(120);
      }
      expect(question.prompt.trim(), question.id).toMatch(/\?$/u);
      expect(question.prompt, question.id).not.toContain("\n> ");
    }
    for (const lesson of bundle.lessons)
      for (const id of lesson.questionIds)
        for (const sourceId of questions.get(id)?.sourceIds ?? [])
          if (/-(1776|1817|1848|1899)$/u.test(sourceId))
            expect(lesson.sourceIds, `${lesson.id} ${sourceId}`).toContain(sourceId);
  });

  it("gives every extract its author, its date and the kind of work it comes from", () => {
    for (const question of bundle.questions)
      for (const extract of question.extracts ?? [])
        for (const part of [extract.who, extract.when, extract.kind])
          expect(part.trim().length, question.id).toBeGreaterThan(3);
  });

  it("sets Smith beside Ricardo as the one pair of sources", () => {
    const pairs = bundle.questions.filter((question) => question.extracts?.length === 2);
    expect(pairs.map((question) => question.id)).toEqual(["econ-comparative-advantage-smith-ricardo"]);
    for (const question of pairs) expect(question.prompt, question.id).toMatch(/Source [AB]/u);
  });

  it("keeps dashes out of everything but the quotations", () => {
    for (const question of everyQuestion) {
      const text = [
        question.prompt,
        ...question.hints,
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((item) => item.feedback),
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.order?.items ?? []),
        ...(question.sort?.bins ?? []).map((bin) => bin.label),
        ...(question.sort?.items ?? []).flatMap((item) => [item.label, item.explanation ?? ""]),
        ...(question.extracts ?? []).flatMap((extract) => [
          extract.who,
          extract.when,
          extract.kind,
        ]),
      ].join(" ");
      expect(text, question.id).not.toMatch(/[—–]/u);
    }
  });

  it("marks one option right, keeps the right option from standing out by length, and explains each wrong one", () => {
    const places = new Set<string>();
    let strictlyLongest = 0;
    let counted = 0;
    for (const question of everyQuestion) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      const rightLength = right[0]?.label.length ?? 0;
      expect(rightLength, question.id).toBeLessThanOrEqual(longestOther * 1.15);
      if (question.choices.length >= 3 && bundle.questions.includes(question)) {
        counted += 1;
        if (rightLength > longestOther) strictlyLongest += 1;
      }
      const stops = question.choices.map((choice) => choice.label.endsWith("."));
      expect(new Set(stops).size, `${question.id} mixes full stops`).toBe(1);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of others)
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
      places.add(`${question.choices.indexOf(right[0] as (typeof question.choices)[number])}`);
    }
    expect(strictlyLongest).toBeLessThanOrEqual(Math.floor(counted * 0.3));
    expect([...places].sort()).toEqual(["0", "1", "2", "3"]);
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

  it("marks the likely right and wrong typed answers correctly", () => {
    const check = (id: string, answer: string, correct: boolean) => {
      const authority = (questions.get(id) as Question).answerAuthority;
      if (authority.kind !== "text") throw new Error(id);
      expect(assessTextAnswer(answer, authority).correct, `${id}: ${answer}`).toBe(correct);
    };
    const P = "econ-";
    check(P + "opportunity-cost-and-the-frontier-free-gig", "opportunity cost", true);
    check(P + "opportunity-cost-and-the-frontier-free-gig", "The opportunity cost of the wedding", true);
    check(P + "opportunity-cost-and-the-frontier-free-gig", "sunk cost", false);
    check(P + "opportunity-cost-and-the-frontier-free-gig", "price", false);
    check(P + "comparative-advantage-kind-of-advantage", "comparative advantage", true);
    check(P + "comparative-advantage-kind-of-advantage", "He has a comparative advantage", true);
    check(P + "comparative-advantage-kind-of-advantage", "absolute advantage", false);
    check(P + "thinking-at-the-margin-6", "sunk", true);
    check(P + "thinking-at-the-margin-6", "a sunk cost", true);
    check(P + "thinking-at-the-margin-6", "fixed", false);
    check(P + "demand-and-supply-gap-name", "shortage", true);
    check(P + "demand-and-supply-gap-name", "a shortage", true);
    check(P + "demand-and-supply-gap-name", "surplus", false);
    check(P + "price-elasticity-medicine-word", "inelastic", true);
    check(P + "price-elasticity-medicine-word", "elastic", false);
    check(P + "price-elasticity-medicine-word", "unit elastic", false);
    check(P + "controls-and-externalities-6", "Pigou", true);
    check(P + "controls-and-externalities-6", "Pigovian", true);
    check(P + "controls-and-externalities-6", "Coase", false);
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

  it("rewrites the course checks as situations, with choices on the kept visuals", () => {
    for (const check of bundle.courseChecks ?? []) {
      const choice = check.items.filter((item) => item.question.choices).length;
      expect(choice, check.id).toBeGreaterThanOrEqual(8);
      for (const item of check.items) expect(item.question.hints, item.question.id).toEqual([]);
    }
    const kinds = bundle.flashcards.map((card) => card.answerAuthority?.kind);
    expect(kinds.filter((k) => k === "numeric").length).toBeLessThanOrEqual(2);
  });
});

/** Equilibrium of Qd = a − bP and Qs = c + d(P − tax). */
const equilibrium = (a: number, b: number, c: number, d: number, tax = 0) => {
  const price = (a - c + d * tax) / (b + d);
  return { price, quantity: a - b * price };
};
/** Midpoint elasticity, absolute value. */
const elasticity = (q1: number, q2: number, p1: number, p2: number) =>
  Math.abs((q2 - q1) / ((q1 + q2) / 2) / ((p2 - p1) / ((p1 + p2) / 2)));
const tri = (base: number, height: number) => (base * height) / 2;
const key = (id: string): number => {
  const authority = (questions.get(id) as Question | undefined)?.answerAuthority;
  if (authority?.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const checkKey = (id: string): number => {
  for (const check of bundle.courseChecks ?? [])
    for (const item of check.items)
      if (item.question.id === id && item.question.answerAuthority.kind === "numeric")
        return item.question.answerAuthority.value;
  throw new Error(`no numeric check ${id}`);
};
const near = (id: string, expected: number) => expect(key(id)).toBeCloseTo(expected, 9);
/** Number of pure Nash equilibria in a two-player payoff grid [row][col] = [rowPay, colPay]. */
const nash = (grid: number[][][]) => {
  const cells: Array<[number, number]> = [];
  grid.forEach((row, r) =>
    row.forEach((cell, c) => {
      const rowBest = grid.every((other) => (other[c] as number[])[0]! <= cell[0]!);
      const colBest = row.every((other) => other[1]! <= cell[1]!);
      if (rowBest && colBest) cells.push([r, c]);
    }),
  );
  return cells;
};
const choiceHas = (id: string, text: string) => {
  const authority = (questions.get(id) as Question).answerAuthority;
  expect(authority.kind === "text" ? authority.exampleAnswer : "").toContain(text);
};

describe("numbers in Economics, recomputed from the situations", () => {
  it("recomputes every numeric answer in the lessons", () => {
    const frontier = [[40, 70], [60, 40]] as const;
    near("econ-opportunity-cost-and-the-frontier-3", frontier[0][1] - frontier[1][1]);
    near("econ-opportunity-cost-and-the-frontier-unit-cost", (frontier[0][1] - frontier[1][1]) / (frontier[1][0] - frontier[0][0]));
    near("econ-comparative-advantage-received", 2 * 1.75);
    near("econ-comparative-advantage-3", 2 * 1.75 - 3);
    const benefits = [90, 70, 55, 40, 30];
    const costs = [30, 35, 45, 50, 60];
    near("econ-thinking-at-the-margin-1", benefits.filter((b, i) => b >= costs[i]!).length);
    near("econ-thinking-at-the-margin-hour-2-net", 70 - 35);
    near("econ-thinking-at-the-margin-2", [0, 1, 2].reduce((s, i) => s + benefits[i]! - costs[i]!, 0));
    near("econ-demand-and-supply-2", equilibrium(100, 2, -20, 4).price);
    near("econ-demand-and-supply-3", equilibrium(100, 2, -20, 4).quantity);
    near("econ-shifts-and-movements-2", equilibrium(130, 2, -20, 4).price);
    near("econ-shifts-and-movements-new-quantity", equilibrium(130, 2, -20, 4).quantity);
    near("econ-price-elasticity-1", elasticity(35, 65, 11, 9));
    near("econ-price-elasticity-3", elasticity(95, 105, 6, 4));
    near("econ-price-elasticity-quantity-percent", ((105 - 95) / ((95 + 105) / 2)) * 100);
    const gig = equilibrium(100, 2, -20, 4);
    near("econ-consumer-and-producer-surplus-2", tri(gig.quantity, 100 / 2 - gig.price));
    near("econ-consumer-and-producer-surplus-3", tri(gig.quantity, gig.price - 20 / 4));
    near("econ-consumer-and-producer-surplus-check-3", tri(50 - 40, 12 - 8));
    const taxed = equilibrium(100, 2, -20, 4, 6);
    near("econ-taxes-and-deadweight-loss-2", 6 * Math.round(taxed.quantity));
    near("econ-taxes-and-deadweight-loss-3", tri(gig.quantity - Math.round(taxed.quantity), 6));
    near("econ-taxes-and-deadweight-loss-4", equilibrium(120, 4, -30, 2, 6).price - equilibrium(120, 4, -30, 2).price);
    near("econ-controls-and-externalities-1", 100 - 2 * 12 - (4 * 12 - 20));
    near("econ-controls-and-externalities-offered-at-floor", 4 * 30 - 20);
    near("econ-controls-and-externalities-2", 4 * 30 - 20 - (100 - 2 * 30));
    near("econ-costs-and-profit-2", Math.sqrt(100));
    near("econ-costs-and-profit-atc-low", 100 / 10 + 10);
    near("econ-costs-and-profit-3", 30 / 2);
    near("econ-monopoly-output-mr-mc", (100 - 20) / 2);
    near("econ-monopoly-2", 100 - (100 - 20) / 2);
    near("econ-monopoly-4", tri(80 - 40, 60 - 20));
    near("econ-monopoly-check-2", (90 - (90 - 30) / 2 - 30) * ((90 - 30) / 2));
    const plug = [[[6, 6], [0, 0]], [[0, 0], [4, 4]]];
    near("econ-game-theory-5", nash(plug).length);
    near("econ-game-theory-switch-payoff", plug[1]![0]![0]!);
    const rc = [[[5, 5], [1, 7]], [[7, 1], [3, 3]]];
    const eq = nash(rc);
    expect(eq).toEqual([[1, 1]]);
    near("econ-game-theory-check-2", rc[1]![1]![0]! + rc[1]![1]![1]!);
  });

  it("recomputes every numeric answer in the course checks", () => {
    expect(checkKey("econ-check-placement-margin")).toBe([500, 400, 300, 200].filter((v) => v >= 350).length);
    expect(checkKey("econ-check-placement-equilibrium")).toBeCloseTo(equilibrium(120, 4, 0, 2).price, 9);
    const scarves = equilibrium(60, 2, -20, 2);
    expect(checkKey("econ-check-placement-surplus")).toBeCloseTo(tri(scarves.quantity, 60 / 2 - scarves.price), 9);
    expect(checkKey("econ-check-placement-monopoly")).toBeCloseTo(90 - (90 - 30) / 2, 9);
    const boots = equilibrium(100, 2, -20, 2);
    expect(checkKey("econ-check-mixed-producer")).toBeCloseTo(tri(boots.quantity, boots.price - 10), 9);
    expect(checkKey("econ-check-mixed-profit")).toBeCloseTo(24 * 10 - (50 + 4 * 10 + 10 ** 2), 9);
    expect(checkKey("econ-check-later-equilibrium")).toBeCloseTo(equilibrium(70, 1, -30, 4).price, 9);
    expect(checkKey("econ-check-later-profit")).toBeCloseTo(20 * 8 - (64 + 4 * 8 + 8 ** 2), 9);
  });

  it("recomputes the figures behind the lesson questions and their feedback", () => {
    const L = (name: string) => `econ-${name}`;
    expect(5 * (60 / 20)).toBe(15); // order cost
    expect(30 / 20).toBeLessThan(40 / 20); // the second step of the frontier costs more per unit
    expect(3 / 1.5).toBe(2); // Priya's essay is two problem sets
    expect(100 - 80).toBeLessThan((10 / 25) * 100); // the farm's 80 wheat leaves land for 5 barley, not 10
    expect(25 * ((100 - 80) / 100)).toBe(5);
    expect(8 * 2 - 8 * 1.75).toBe(2);
    expect(12 / 6).toBe(2);
    expect(2 / 6 < 4 / 8).toBe(true); // Tom's report costs fewer pages than Mira's
    expect(80 - 2 * 3).toBe(74);
    expect(100 - 2 * 5 + (100 - 2 * 0) - 100).toBe(90); // the quantity at a £5 price, a distractor
    expect([100 - 2 * 25, 4 * 25 - 20]).toEqual([50, 80]);
    expect(equilibrium(112, 2, -20, 4).price).toBeGreaterThan(20); // fad pushes the price up
    expect(112 - 2 * 20 - (4 * 20 - 20)).toBe(12);
    expect(equilibrium(130, 2, 10, 4).price).toBe(20); // equal shifts leave the price
    expect(5 * 60).toBe(300);
    expect(4 * 90).toBe(360);
    expect([11 * (200 - 110), 9 * (200 - 90)]).toEqual([990, 990]);
    expect(30 - 22 + (25 - 22)).toBe(11);
    expect(20 * 60).toBe(1200);
    expect(tri(60, 50 - 20)).toBe(900);
    expect(17 - 15).toBe(2);
    expect(17 - 5 - 15).toBe(-3);
    expect(tri(4, 10) / tri(2, 5)).toBe(4);
    expect(equilibrium(100, 2, -20, 4, 6).price).toBe(24);
    expect(equilibrium(100, 2, -20, 4, 9)).toEqual({ price: 26, quantity: 48 });
    expect(equilibrium(100, 4, -20, 4, 4)).toEqual({ price: 17, quantity: 32 });
    expect(4 * equilibrium(100, 4, -20, 4, 4).quantity).toBeGreaterThan(120);
    expect(tri(60 - 48, 9)).toBe(54);
    expect(30 - 22 + (25 - 22) - (30 - 22)).toBe(3);
    expect(105 - 85).toBe(20);
    expect(105 / 3).toBe(35);
    const q = 16 / 2;
    expect([16 * q, 100 + q * q, 16 * q - 100 - q * q]).toEqual([128, 164, -36]);
    expect(16 * q - q * q).toBeGreaterThan(-100); // revenue less variable cost beats the fixed cost
    expect(31 * 69 - 30 * 70).toBe(39);
    expect(100 - 2 * 30).toBe(40);
    expect(100 - 80).toBe(20);
    expect(60 - 4 * 12).toBe(12);
    expect(60 - 2 * 12).toBe(36);
    expect(L("x")).toBe("econ-x");
    // Cost classes and layers of the step questions on the shifts: the second step cost per unit.
    expect(0.9 > 0.6 && 0.6 > 0.4).toBe(true);
  });

  it("recomputes the figures behind the course-check questions", () => {
    expect(3 * (80 / 20)).toBe(12);
    expect(6 / 3 > 2 / 2).toBe(true); // Kim's door costs 2 walls, Lee's 1
    expect(equilibrium(150, 4, 0, 2)).toEqual({ price: 25, quantity: 50 });
    expect(120 - 4 * 20).toBe(40);
    expect(elasticity(55, 45, 9, 11)).toBeCloseTo(1, 9);
    expect([9 * 55, 11 * 45]).toEqual([495, 495]);
    expect(3 * 34).toBe(102);
    expect(tri(40 - 34, 3)).toBe(9);
    expect(80 - 2 * 15 - 2 * 15).toBe(20);
    expect(80 - 2 * 15).toBe(50);
    const steps = [[0, 60], [10, 55], [20, 45], [30, 30], [40, 0]] as const;
    expect(steps.slice(1).map(([x, y], i) => steps[i]![1] - y)).toEqual([5, 10, 15, 30]);
    expect(20 / 40 > 10 / 30).toBe(true);
    const nets = [60, 45, 35, 20].map((b, i) => b - [15, 25, 30, 40][i]!);
    expect(nets).toEqual([45, 20, 5, -20]);
    expect([200 - 5 * 35, 3 * 35 - 40]).toEqual([25, 65]);
    expect(equilibrium(200, 5, -56, 3)).toEqual({ price: 32, quantity: 40 });
    expect(equilibrium(200, 5, -40, 3)).toEqual({ price: 30, quantity: 50 });
    expect([5 * 80, 10 * 60]).toEqual([400, 600]);
    expect(elasticity(80, 60, 5, 10)).toBeLessThan(1);
    expect(equilibrium(100, 2, -20, 2, 4).price - equilibrium(100, 2, -20, 2).price).toBe(2);
    expect(equilibrium(90, 3, -30, 3)).toEqual({ price: 20, quantity: 30 });
    expect(equilibrium(90, 3, -30 - 3 * 6, 3).quantity).toBe(21);
    expect((150 - 30) / 6).toBe(20);
    expect((150 - 30) / 3).toBe(40);
    expect(150 - 3 * 20).toBe(90);
    expect([0 + 2 + 2 + 2, 9 + 2 + 2 + 2]).toEqual([6, 15]);
    expect(2 * (12 / 4)).toBe(6);
    expect(20 / 10 < 30 / 10).toBe(true);
    expect([80, 70, 50, 30].filter((b) => b > 40)).toHaveLength(3);
    expect(equilibrium(95, 1, -30, 4)).toEqual({ price: 25, quantity: 70 });
    expect(elasticity(1050, 950, 9, 11)).toBeCloseTo(0.5, 9);
    expect([9 * 1050, 11 * 950]).toEqual([9450, 10450]);
    const tickets = equilibrium(120, 1, -60, 2);
    expect([tri(tickets.quantity, 120 - tickets.price), tri(tickets.quantity, tickets.price - 30)]).toEqual([1800, 900]);
    expect(equilibrium(60, 1, -30, 2, 6).price - equilibrium(60, 1, -30, 2).price).toBe(4);
    expect([2 * 35 - 30, 60 - 35]).toEqual([40, 25]);
    expect((25 - 10) * 15).toBe(225);
    expect((10 - 10) * 30).toBe(0);
    expect(nash([[[3, 1], [2, 4], [0, 2]], [[1, 3], [4, 2], [2, 5]]])).toEqual([[1, 2]]);
    expect(nash([[[4, 4], [1, 6]], [[6, 1], [2, 2]]])).toEqual([[1, 1]]);
    choiceHas("econ-comparative-advantage-buy-or-bake", "2 loaves");
  });
});
