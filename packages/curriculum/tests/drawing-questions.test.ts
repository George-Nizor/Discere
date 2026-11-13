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
 * Drawing follows the way History asks questions (docs/question-writing-guide.md), adapted to a
 * practical skill: most questions describe a drawing, a habit or a mistake and ask the learner to
 * judge it. Public-domain writing on drawing (Ruskin, Leonardo, Speed, Cennini) appears as extracts.
 * Numeric questions stay only where the number is the point, such as heads in a figure or a step on
 * the value scale, and in the worked examples whose blanks are arithmetic by design.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL(
      "../../../content/drawing-and-visual-art-fundamentals/bundle.json",
      import.meta.url,
    ),
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

describe("questions in Drawing and Visual Art Fundamentals", () => {
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

  it("keeps numeric questions to the worked-example blanks and the few places where the number is the point", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(15);
    const blanks = new Set(
      bundle.lessons.flatMap((lesson) =>
        lesson.steps.flatMap((step) =>
          (step.workedSteps ?? []).map((line) => line.blank?.questionId ?? ""),
        ),
      ),
    );
    expect(numeric.filter((question) => !blanks.has(question.id)).length).toBeLessThanOrEqual(5);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("puts writing on drawing in front of the learner in six to ten questions", () => {
    const withExtract = bundle.questions.filter((question) => extractsOf(question).length > 0);
    expect(withExtract.length).toBeGreaterThanOrEqual(6);
    expect(withExtract.length).toBeLessThanOrEqual(10);
    const lessons = bundle.lessons.filter((lesson) =>
      [...lesson.questionIds, ...lesson.steps.map((step) => step.checkQuestionId)].some(
        (id) => extractsOf(questions.get(id)).length > 0,
      ),
    );
    expect(lessons.length).toBeGreaterThanOrEqual(5);
  });

  it("cites a verified public-domain source for every extract and keeps extracts short", () => {
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
        expect((source?.checked?.at ?? "") >= "2026-11-13", question.id).toBe(true);
      }
      for (const extract of extracts) {
        const words = extract.split(/\s+/u).length;
        expect(words, question.id).toBeGreaterThanOrEqual(20);
        expect(words, question.id).toBeLessThanOrEqual(90);
      }
      expect(question.prompt.trim(), question.id).toMatch(/\?$/u);
      expect(question.prompt, question.id).not.toContain("\n> ");
    }
  });

  it("gives every extract its author, its date and the kind of work it comes from", () => {
    for (const question of bundle.questions)
      for (const extract of question.extracts ?? [])
        for (const part of [extract.who, extract.when, extract.kind])
          expect(part.trim().length, question.id).toBeGreaterThan(3);
  });

  it("keeps dashes out of everything but the quotations", () => {
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
        ...(question.extracts ?? []).flatMap((extract) => [
          extract.who,
          extract.when,
          extract.kind,
        ]),
      ].join(" ");
      expect(text, question.id).not.toMatch(/[—–]/u);
    }
  });

  it("marks one option right, never makes it the longest by a quarter, and explains each wrong one", () => {
    const places = new Set<string>();
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
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
    expect(counts.order).toBeGreaterThanOrEqual(3);
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

  it("sets two passages side by side as Source A and Source B where a question compares them", () => {
    const pairs = bundle.questions.filter((question) => question.extracts?.length === 2);
    expect(pairs.map((question) => question.id)).toEqual([
      "dravaf-edges-and-rendering-pair-edges",
    ]);
    for (const question of pairs) expect(question.prompt, question.id).toMatch(/Source [AB]/u);
  });

  it("asks the learner to judge a drawing, a habit or a mistake in most questions", () => {
    const case_ =
      /\b(student|drawer|painter|artist|her drawing|her picture|draws|drew|drawn|sketch\w*|you are|you have)\b/iu;
    expect(
      bundle.questions.filter((question) => case_.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(60);
  });

  it("keeps every extract question to a claim the passage supports", () => {
    for (const question of bundle.questions) {
      if (!question.extracts?.length) continue;
      if (question.answerAuthority.kind !== "text") continue;
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
      expect((question.choices ?? []).length, question.id).toBeGreaterThanOrEqual(3);
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
