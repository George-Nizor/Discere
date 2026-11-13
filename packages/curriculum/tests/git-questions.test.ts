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
 * Git and Version Control follows the way History asks questions (docs/question-writing-guide.md),
 * adapted to a tool used in situations: most questions put a short `git status` or `git log` output,
 * a commit graph, a conflict block or a command and its message in front of the learner and ask what
 * to run, what the output means or what state the repository is in. The outputs were copied from real
 * runs of Git 2.43 in a scratch repository. Numeric questions stay only where the number is the point.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/git-and-version-control/bundle.json", import.meta.url),
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

describe("questions in Git and Version Control", () => {
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

  it("puts a command, an output or a repository state in front of the learner in most questions", () => {
    const situation = /`[^`]*\b(git|HEAD|main|origin)\b[^`]*`|\byou\b|\byour\b/iu;
    const outputs = bundle.questions.filter((question) => /^`[^`]+`$/mu.test(question.prompt));
    expect(outputs.length).toBeGreaterThanOrEqual(20);
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
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
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
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

  it("teaches the unsafe moves with questions about force-pushing, a hard reset and a pushed secret", () => {
    const text = bundle.questions.map((question) =>
      [
        question.prompt,
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.sort?.items ?? []).map((item) => item.label),
        ...(question.misconceptions ?? []).map((item) => item.feedback),
      ].join(" "),
    );
    for (const phrase of [/force/iu, /reset --hard/u, /secret|API key/iu, /detach/iu])
      expect(text.some((entry) => phrase.test(entry)), String(phrase)).toBe(true);
  });

  it("asks for the safe fix after a rejected push and never offers a force-push as the answer", () => {
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.find(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      if (/--force(?!-with-lease)/u.test(right?.label ?? ""))
        throw new Error(`${question.id} makes a plain force-push the right option`);
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
});
