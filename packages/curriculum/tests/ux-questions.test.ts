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
 * UX and HCI follows the way Psychology asks questions (docs/question-writing-guide.md), adapted to
 * design judgement: most questions describe a screen, a flow or a finding in words and ask what a
 * designer should conclude. Two questions quote a success criterion of WCAG 2.2 (W3C Document
 * License, short quotations with attribution). Numeric questions stay only where the number is the
 * point, such as an index of difficulty, a margin of error or a contrast ratio.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/ux-and-hci/bundle.json", import.meta.url), "utf8"),
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
const rightOption = (question: Question) => {
  const authority = question.answerAuthority;
  if (authority.kind !== "text") return undefined;
  return (question.choices ?? []).filter((choice) =>
    authority.acceptedIdeas.includes(choice.label),
  );
};

describe("questions in UX and Human-Computer Interaction", () => {
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

  it("keeps numeric questions to the places where the number is the point", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(15);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("asks no fill-in-the-blank question for a term", () => {
    for (const question of bundle.questions)
      expect(question.prompt, question.id).not.toContain("____");
  });

  it("quotes two success criteria of WCAG 2.2 with attribution and a verified source", () => {
    const withExtract = bundle.questions.filter((question) => extractsOf(question).length > 0);
    expect(withExtract.map((question) => question.id)).toEqual([
      "uxh-forms-errors-feedback-red-outline",
      "uxh-contrast-and-wcag-links-by-hue",
    ]);
    const source = bundle.sources.find((item) => item.id === "wcag22");
    expect(source?.licence).toMatch(/^W3C Document License/u);
    expect(source?.checked?.status).toBe("verified");
    expect((source?.checked?.at ?? "") >= "2026-11-13").toBe(true);
    for (const question of withExtract) {
      expect(question.sourceIds, question.id).toContain("wcag22");
      for (const text of extractsOf(question)) {
        const words = text.split(/\s+/u).length;
        expect(words, question.id).toBeGreaterThanOrEqual(20);
        expect(words, question.id).toBeLessThanOrEqual(40);
      }
      expect(question.prompt.trim(), question.id).toMatch(/\?$/u);
      expect(question.prompt, question.id).not.toContain("\n> ");
      for (const extract of question.extracts ?? [])
        for (const part of [extract.who, extract.when, extract.kind])
          expect(part.trim().length, question.id).toBeGreaterThan(3);
    }
  });

  it("keeps dashes out of questions, hints, feedback and options", () => {
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
      expect(text, question.id).not.toMatch(/[\u2014\u2013]/u);
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
        return { question, rightLength: right[0]?.label.length ?? 0, longestOther };
      });
    const longest = rows.filter((row) => row.rightLength > row.longestOther);
    expect(longest.length).toBeLessThanOrEqual(Math.floor(rows.length * 0.3));
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
    expect(counts.order).toBeGreaterThanOrEqual(3);
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

  it("describes a screen, a flow, a test or a finding in at least sixty questions", () => {
    const case_ =
      /\b(page|screen|form|button|menu|toolbar|field|checkout|app|site|website|survey|test|participants?|users?|team|designer|developer|evaluators?|label|icon|door|cooker|spreadsheet|tool|version|toolbar|message|text|links?)\b/iu;
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

  it("gives hints that guide, with no first letters and no bare sums", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+\u2212\u00d7\u00f7*/=-]+\.?$/u);
      }
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
    }
  });
});
