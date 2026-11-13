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
 * Decision Theory follows the way Economics asks questions (docs/question-writing-guide.md). A
 * number stays where the calculation is the decision: the expected value of a gamble or an option,
 * rolling a tree back, a regret, an expected utility or certainty equivalent, a Bayesian update from
 * stated rates, the value of information, a breakeven win. Everything else asks which rule fits an
 * attitude, whether a choice shows a bias, why expected value misleads in a case, or which axiom a
 * pattern breaks. Every numeric answer, and every figure that a choice or its feedback relies on,
 * is recomputed below from the situation, never read back from the bundle.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/decision-theory/bundle.json", import.meta.url), "utf8"),
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

describe("questions in Decision Theory", () => {
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

  it("keeps numeric questions to calculations that carry a decision, and uses order and sort", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(32);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(3);
    expect(counts.sort).toBeGreaterThanOrEqual(5);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.55);
    const cardKinds = bundle.flashcards.map((card) => card.answerAuthority?.kind);
    expect(cardKinds.filter((k) => k === "numeric").length).toBeLessThanOrEqual(1);
  });

  it("keeps dashes out of everything a learner reads", () => {
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
      expect(text, question.id).not.toMatch(/\b(Correct|Not quite|Great job)\b/u);
    }
    for (const card of bundle.flashcards) expect(`${card.front} ${card.back}`).not.toMatch(/[—–]/u);
  });

  it("marks one option right, keeps the right option from standing out by length, and explains each wrong one", () => {
    const places = new Set<string>();
    let strictlyLongest = 0;
    let strictlyShortest = 0;
    let counted = 0;
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
      expect(rightLength, question.id).toBeLessThanOrEqual(longestOther * 1.15);
      if (question.choices.length >= 3) {
        counted += 1;
        if (rightLength > longestOther) strictlyLongest += 1;
        if (rightLength < shortestOther) strictlyShortest += 1;
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
    expect(strictlyShortest).toBeLessThanOrEqual(Math.floor(counted * 0.4));
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

  it("gives hints that guide, with no first letters and no bare sums", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
      }
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
    }
  });
});

const key = (id: string): number => {
  const authority = (questions.get(id) as Question | undefined)?.answerAuthority;
  if (authority?.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const near = (id: string, expected: number, digits = 9) =>
  expect(key(id)).toBeCloseTo(expected, digits);
const ev = (pairs: Array<[number, number]>) => pairs.reduce((sum, [p, x]) => sum + p * x, 0);
const posterior = (prior: number, sens: number, fp: number) =>
  (prior * sens) / (prior * sens + (1 - prior) * fp);
/** The label of a question's right option. */
const rightLabel = (id: string): string => {
  const authority = (questions.get(id) as Question).answerAuthority;
  if (authority.kind !== "text") throw new Error(id);
  return authority.exampleAnswer;
};
/** Items placed in a sort question's bin. */
const binned = (id: string, bin: string): string[] =>
  ((questions.get(id) as Question).sort?.items ?? [])
    .filter((item) => item.bin === bin)
    .map((item) => item.label);

describe("numbers in Decision Theory, recomputed from the situations", () => {
  it("recomputes every numeric answer in the lessons", () => {
    const P = "dect-";
    // Lesson 1 and 2
    near(`${P}options-states-outcomes-cafe-outdoor-rain`, 50 - 40);
    near(`${P}expected-value-worked-gamble-last-term`, 0.5 * -10);
    near(`${P}expected-value-ticket-net`, 0.1 * 30 - 4);
    near(
      `${P}expected-value-practice-1`,
      ev([
        [0.1, 200],
        [0.6, 30],
        [0.3, -20],
      ]),
    );
    // Lesson 3
    near(`${P}decision-trees-worked-chance`, 0.3 * 200 + 0.7 * 20);
    near(`${P}decision-trees-inner-node`, 0.2 * 100 + 0.8 * 20);
    near(`${P}decision-trees-helper-dearer`, 0.6 * Math.max(800, 700) + 0.4 * Math.max(100, -120));
    const second = 0.3 * 300 + 0.7 * 0;
    near(`${P}decision-trees-practice-3`, 0.4 * 120 + 0.6 * second);
    // Lesson 4: regret from the best payoff in each state
    const table = { A: [50, 30, 10], C: [80, 20, -20], D: [40, 40, 35] };
    const best = [0, 1, 2].map((s) =>
      Math.max(...Object.values(table).map((row) => row[s] as number)),
    );
    near(
      `${P}when-probabilities-are-unknown-c-slump-regret`,
      (best[2] as number) - (table.C[2] as number),
    );
    near(
      `${P}when-probabilities-are-unknown-a-boom-regret`,
      (best[0] as number) - (table.A[0] as number),
    );
    const pqr = { P: [60, 20, 0], Q: [30, 30, 25], R: [100, 10, -30] };
    const bestPqr = [0, 1, 2].map((s) =>
      Math.max(...Object.values(pqr).map((row) => row[s] as number)),
    );
    const largestRegret = (row: number[]) =>
      Math.max(...row.map((x, s) => (bestPqr[s] as number) - x));
    near(`${P}when-probabilities-are-unknown-practice-2`, largestRegret(pqr.Q));
    // Lesson 5 and 6
    near(`${P}utility-and-st-petersburg-half-of-eight`, 0.5 * Math.sqrt(64));
    near(`${P}utility-and-st-petersburg-practice-1`, 0.5 * Math.sqrt(4) + 0.5 * Math.sqrt(36));
    near(`${P}risk-attitudes-ce-four-thirty-six`, (0.5 * Math.sqrt(4) + 0.5 * Math.sqrt(36)) ** 2);
    near(`${P}risk-attitudes-insurance-ceiling`, 100 - (0.5 * 10 + 0.5 * 8) ** 2);
    near(`${P}risk-attitudes-take-the-bet`, 0.5 * Math.sqrt(120) + 0.5 * Math.sqrt(90), 2);
    near(`${P}risk-attitudes-practice-1`, (0.5 * Math.sqrt(16) + 0.5 * Math.sqrt(100)) ** 2);
    // Lesson 7
    near(`${P}bayes-updating-percent-diseased`, (40 / 135) * 100, 1);
    near(`${P}bayes-updating-positives-1000`, 1000 * (0.05 * 0.8 + 0.95 * 0.1));
    near(`${P}bayes-updating-spam-prize`, posterior(0.2, 0.6, 0.03), 2);
    near(`${P}bayes-updating-practice-2`, posterior(0.02, 0.8, 0.1) * 100, 1);
    // Lesson 8
    const now = ev([
      [0.25, 200],
      [0.75, -20],
    ]);
    near(`${P}value-of-perfect-information-practice-1`, 0.25 * 200 + 0.75 * 0 - Math.max(now, 0));
    near(
      `${P}value-of-perfect-information-evpi-second`,
      0.5 * 60 +
        0.5 * 0 -
        Math.max(
          ev([
            [0.5, 60],
            [0.5, -20],
          ]),
          0,
        ),
    );
    near(
      `${P}value-of-perfect-information-mostly-sure`,
      0.8 * 100 -
        Math.max(
          ev([
            [0.8, 100],
            [0.2, -30],
          ]),
          0,
        ),
    );
    // Lesson 9
    near(
      `${P}imperfect-information-invest-after-good`,
      ev([
        [0.64, 100],
        [0.36, -30],
      ]),
    );
    const pBad = 0.4 * 0.2 + 0.6 * 0.7;
    expect(pBad).toBeCloseTo(0.5, 9);
    near(`${P}imperfect-information-posterior-bad`, (0.4 * 0.2) / 0.5);
    near(`${P}imperfect-information-prior-matters-v2`, posterior(0.15, 0.8, 0.3), 2);
    const good = 0.3 * 0.9 + 0.7 * 0.2;
    const withTest = good * (((0.3 * 0.9) / good) * 100 - ((0.7 * 0.2) / good) * 20);
    near(
      `${P}imperfect-information-practice-2`,
      withTest -
        ev([
          [0.3, 100],
          [0.7, -20],
        ]),
      1,
    );
    // Lesson 10
    near(`${P}expected-utility-and-allais-threshold`, 0.11 / 0.1, 9);
    // Lesson 11
    near(`${P}prospect-theory-and-framing-loss-term`, 0.5 * -2 * 60);
    near(`${P}prospect-theory-and-framing-break-even-win`, 2 * 70);
    // Lesson 12
    near(`${P}decisions-with-other-players-switch-payoff`, 0);
  });

  it("recomputes the figures behind the choices and their feedback", () => {
    const P = "dect-";
    // Launch table: A, B and C under 0.3, 0.5, 0.2.
    const launch = {
      A: ev([
        [0.3, 50],
        [0.5, 30],
        [0.2, 10],
      ]),
      B: ev([
        [0.3, 40],
        [0.5, 30],
        [0.2, 5],
      ]),
      C: ev([
        [0.3, 80],
        [0.5, 20],
        [0.2, -20],
      ]),
    };
    expect(launch).toEqual({ A: 32, B: 28, C: 30 });
    expect(rightLabel(`${P}expected-value-launch-pick`)).toBe("Launch A, worth 32");
    expect(rightLabel(`${P}expected-value-one-play`)).toContain("one of the three prizes");
    expect(
      ev([
        [0.2, 100],
        [0.5, 40],
        [0.3, -10],
      ]),
    ).toBe(37);
    expect((100 + 40 - 10) / 3).toBeCloseTo(43.3, 1);
    // Roulette wheels
    expect(18 / 39 - 21 / 39).toBeCloseTo(-0.077, 3);
    expect(35 / 37 - 36 / 37).toBeCloseTo(-0.027, 3);
    expect(35 / 38 - 37 / 38).toBeCloseTo(-0.053, 3);
    // A $8 ticket with a 0.1 chance of $50
    expect(0.1 * 50 - 8).toBe(-3);
    expect(0.1 * 50).toBe(5);
    // The 100 or nothing gamble against 45
    expect(
      ev([
        [0.5, 100],
        [0.5, 0],
      ]) - 45,
    ).toBe(5);
    // A fee on every stall leaf
    expect([500 - 150, 200 - 150]).toEqual([350, 50]);
    // Roll back the lesson's market tree: 0.6 × 950 + 0.4 × 100
    expect(0.6 * 950 + 0.4 * 100).toBeCloseTo(610, 9);
    expect(0.5 * (800 - 250) + 0.5 * (200 - 250)).toBe(250);
    // Equal weights on D and C
    expect((40 + 40 + 35) / 3).toBeCloseTo(38.3, 1);
    expect((80 + 20 - 20) / 3).toBeCloseTo(26.7, 1);
    // The cap on the St Petersburg game: every toss contributes (1/2)^n × 2^n = 1
    const capped = (cap: number) =>
      Array.from({ length: cap }, (_, i) => 0.5 ** (i + 1) * 2 ** (i + 1)).reduce(
        (s, x) => s + x,
        0,
      );
    expect(capped(12)).toBe(12);
    expect(capped(25)).toBe(25);
    expect(25 - 12).toBe(13);
    // Sure amounts against a 0 or 100 gamble with u = sqrt
    const eu = 0.5 * Math.sqrt(0) + 0.5 * Math.sqrt(100);
    expect(eu).toBe(5);
    expect([16, 20, 25, 30].filter((x) => Math.sqrt(x) > eu)).toEqual([30]);
    expect(Math.sqrt(20)).toBeCloseTo(4.47, 2);
    expect(rightLabel(`${P}utility-and-st-petersburg-sure-over-gamble`)).toBe("A sure 30");
    // log utility: expected utility of the game is sum n/2^n = 2, a sure 2^2 = 4
    const euGame = Array.from({ length: 80 }, (_, i) => (i + 1) / 2 ** (i + 1)).reduce(
      (s, x) => s + x,
      0,
    );
    expect(euGame).toBeCloseTo(2, 9);
    expect(2 ** Math.round(euGame)).toBe(4);
    // Risk premium rises with the spread of the prizes
    const premium = (lo: number, hi: number) =>
      (lo + hi) / 2 - ((Math.sqrt(lo) + Math.sqrt(hi)) / 2) ** 2;
    expect(premium(16, 64)).toBeCloseTo(4, 9);
    expect(premium(36, 44)).toBeCloseTo(0.1, 2);
    expect(40 - premium(36, 44)).toBeCloseTo(39.9, 1);
    // Three sellers of a 16 or 100 gamble
    expect(
      ev([
        [0.5, 16],
        [0.5, 100],
      ]),
    ).toBe(58);
    expect([49, 58, 70].map((x) => Math.sign(x - 58))).toEqual([-1, 0, 1]);
    // Insurance in the lesson: wealth 100, 10% chance of losing 50
    const expectedUtility = 0.9 * 10 + 0.1 * Math.sqrt(50);
    expect(expectedUtility ** 2).toBeCloseTo(94.23, 2);
    expect(100 - expectedUtility ** 2).toBeCloseTo(5.77, 2);
    // Odds and ratios
    expect(((0.2 / 0.8) * 10) / (1 + (0.2 / 0.8) * 10)).toBeCloseTo(0.714, 3);
    expect(4 * 4 * 4).toBe(64);
    expect(4 + 4 + 4).toBe(12);
    expect(posterior(0.01, 0.9, 0.09) * 100).toBeCloseTo(9.17, 2);
    expect(posterior(0.1, 0.9, 0.09) * 100).toBeCloseTo(52.6, 1);
    expect(0.02 * 10000 * 0.8 + 0.98 * 10000 * 0.1).toBe(1140);
    expect(160 / 1140).toBeCloseTo(0.14, 2);
    // Value of information: project with success 0.4, +100, failure -30
    expect(
      ev([
        [0.4, 100],
        [0.6, -30],
      ]),
    ).toBe(22);
    expect(0.4 * 100).toBe(40);
    expect(0.4 * 100 - 22).toBe(18);
    expect(40 - 14 - 22).toBe(4);
    expect(0.6 * 50).toBe(30);
    expect(0.4 * 30).toBe(12);
    expect(
      ev([
        [0.4, 150],
        [0.6, -30],
      ]),
    ).toBe(42);
    expect(0.4 * 150 - 42).toBe(18);
    expect(
      ev([
        [0.5, 60],
        [0.5, -20],
      ]),
    ).toBe(20);
    expect(60 - 20).toBe(40);
    expect(
      ev([
        [0.4, 100],
        [0.6, 0],
      ]),
    ).toBe(40);
    // A test with EVSI 4.6 costing 4 or 5
    expect(26.6 - 22).toBeCloseTo(4.6, 9);
    expect(26.6 - 4 - 22).toBeCloseTo(0.6, 9);
    expect(0.45 * 100 - 0.55 * 30).toBeCloseTo(28.5, 9);
    expect(0.3 * 100 - 0.7 * 30).toBeCloseTo(9, 9);
    // Allais, Allais and the axioms
    expect(
      ev([
        [0.89, 1],
        [0.1, 5],
        [0.01, 0],
      ]),
    ).toBeCloseTo(1.39, 9);
    // Prospect theory
    expect(0.5 * 130 - 0.5 * 2 * 70).toBe(-5);
    expect(0.5 * 150 - 0.5 * 2 * 90).toBe(-15);
    expect(450 / 3).toBe(150);
    expect(450 - 150).toBe(300);
    expect(25 - 45).toBe(-20);
    expect(-100 - 45 + 25).toBe(-120);
    expect(0.8 - 1).toBeCloseTo(-0.2, 9);
  });

  it("sorts the cases the way the lessons define them", () => {
    const P = "dect-";
    expect(binned(`${P}when-probabilities-are-unknown-sort-rules`, "maximax")).toHaveLength(2);
    expect(binned(`${P}risk-attitudes-sort-behaviour`, "neutral").join(" ")).toContain("10");
    expect(binned(`${P}decisions-with-other-players-sort-state-or-player`, "player")).toHaveLength(
      3,
    );
    expect(binned(`${P}expected-utility-and-allais-sort-axioms`, "completeness")).toHaveLength(2);
    expect(binned(`${P}prospect-theory-and-framing-sort-biases`, "sunk")).toHaveLength(2);
  });
});
