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
 * Software Testing and Quality follows the way History asks questions (docs/question-writing-guide.md),
 * adapted to judgement about what a test proves: a small function and its tests, a pytest or coverage
 * report, a flaky run, a mock that hides the code under test, a level chosen for a stated risk.
 * Every snippet and report quoted in a question was run with Python 3.12, pytest 9, coverage.py 7 and
 * Hypothesis 6, and the numbers below are recomputed here. Numeric questions stay only where the
 * number is the point (the worked examples and a few measures).
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/software-testing-and-quality/bundle.json", import.meta.url),
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

describe("questions in Software Testing and Quality", () => {
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

  it("keeps numeric questions to places where the number is the point", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(15);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
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
    for (const question of withThree) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.find(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      const others = question.choices.filter((choice) => choice !== right);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      const length = right?.label.length ?? 0;
      if (length > longestOther) {
        longest += 1;
        expect(length, question.id).toBeLessThanOrEqual(longestOther * 1.15);
      }
      const stops = new Set(question.choices.map((choice) => /\.$/u.test(choice.label)));
      expect(stops.size, `${question.id} mixes full stops`).toBe(1);
    }
    expect(longest).toBeLessThanOrEqual(withThree.length * 0.3);
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
      if (kind(question) !== "numeric")
        expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
  });

  it("recomputes the numbers that questions and their feedback quote", () => {
    const answer = (id: string) => {
      const question = questions.get(id) as Question;
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
      return authority.value;
    };
    const times = [
      12, 13, 13, 14, 15, 15, 16, 17, 18, 19, 21, 22, 24, 26, 29, 33, 41, 58, 120, 450,
    ];
    const nearestRank = (values: number[], p: number) =>
      [...values].sort((a, b) => a - b)[Math.ceil(p * values.length) - 1] as number;
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    expect(answer("softq-performance-and-non-functional-p90")).toBe(nearestRank(times, 0.8));
    expect(answer("softq-performance-and-non-functional-p90-ten")).toBe(
      nearestRank([100, 110, 120, 130, 140, 150, 160, 170, 180, 900], 0.9),
    );
    // the mean rises by 200 ms when the slowest request takes 4,450 ms, and the median stays put
    const slower = [...times.slice(0, -1), 4450];
    expect(mean(slower) - mean(times)).toBeCloseTo(200, 9);
    expect(mean(times)).toBeCloseTo(48.8, 9);
    const median = (values: number[]) => ((values[9] as number) + (values[10] as number)) / 2;
    expect(median(times)).toBe(20);
    expect(median(slower)).toBe(20);
    // services A and B: equal means, different tails
    const a = Array(20).fill(100) as number[];
    const b = [...(Array(18).fill(20) as number[]), 820, 820];
    expect(mean(a)).toBe(100);
    expect(mean(b)).toBe(100);
    expect(nearestRank(b, 0.95)).toBe(820);
    expect(nearestRank(a, 0.95)).toBe(100);
    expect(nearestRank(b, 0.5)).toBe(20);
    // Little's law
    expect(120 * 0.5).toBe(60);
    // flaky runs
    const red = (n: number, p: number) => 100 * (1 - (1 - p) ** n);
    expect(red(40, 0.01)).toBeCloseTo(answer("softq-levels-and-the-pyramid-flake-50"), 1);
    expect(red(200, 0.005)).toBeCloseTo(63.3, 1);
    expect((1 - 0.005) ** 200).toBeCloseTo(0.367, 3);
    // input pairs and the time to try them all
    expect(answer("softq-what-a-test-shows-years")).toBe(
      Math.round(2 ** 64 / 1e9 / (365.25 * 86400)),
    );
    // defect detection and change failure
    expect((45 / 50) * 100).toBe(90);
    expect((30 / 50) * 100).toBe(60);
    expect((63 / 90) * 100).toBe(70);
    expect((6 / 80) * 100).toBe(7.5);
    expect((15 / 300) * 100).toBe(5);
    // the shipping bands, the delivery edge and the 37.5 that the specification would give
    expect(10 * 3 * 1.25).toBe(37.5);
    expect(answer("softq-choosing-inputs-three-value-ages")).toBe(6);
    expect(answer("softq-coverage-and-mutation-mutation-score")).toBe(75);
    expect(answer("softq-tdd-and-refactoring-buggy-total")).toBe(
      Math.floor((Math.floor((200 * 50) / 100) * 50) / 100),
    );
  });

  it("recomputes which mutants survive the two checks of can_vote", () => {
    const sortQuestion = questions.get("softq-coverage-and-mutation-sort-mutants") as Question;
    const mutants: Record<string, (age: number) => boolean> = {
      "`age >= 19`": (age) => age >= 19,
      "`age > 18`": (age) => age > 18,
      "`age >= 17`": (age) => age >= 17,
      "`age <= 18`": (age) => age <= 18,
      "`return True`": () => true,
      "`age >= 1`": (age) => age >= 1,
    };
    for (const item of sortQuestion.sort?.items ?? []) {
      const mutant = mutants[item.label] as (age: number) => boolean;
      const killed = mutant(30) !== true || mutant(10) !== false;
      expect(item.bin, item.label).toBe(killed ? "killed" : "survived");
    }
  });

  it("recomputes the sizing tests the shipping and delivery questions rely on", () => {
    const code = (w: number) => (w <= 0 ? "error" : w < 5 ? 4 : w < 20 ? 9 : 15);
    const spec = (w: number) => (w <= 0 ? "error" : w <= 5 ? 4 : w <= 20 ? 9 : 15);
    const failing = (weights: number[]) => weights.filter((w) => code(w) !== spec(w));
    expect(failing([5, 20])).toEqual([5, 20]);
    expect(failing([3, 25])).toEqual([]);
    expect(failing([6, 21])).toEqual([]);
    expect(failing([0, 100])).toEqual([]);
    const free = (total: number) => total > 50;
    expect([49, 50, 51, 100].filter((t) => free(t) !== t >= 50)).toEqual([50]);
  });

  it("puts code in backticks in the prompts that show it", () => {
    for (const question of bundle.questions) {
      const outside = question.prompt.replace(/`[^`]*`/gu, "");
      expect(outside, question.id).not.toMatch(/\b(def|SELECT)\b/u);
    }
  });
});
