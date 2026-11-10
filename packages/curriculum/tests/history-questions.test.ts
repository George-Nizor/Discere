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
 * History is the model for how a humanities course asks questions (docs/question-writing-guide.md).
 * These checks hold the rules that guide sets: source extracts with a verified public-domain
 * record, few numeric questions, end checks of more than one type, options of similar length
 * and plain prose around the quotations. An extract is either a quoted paragraph of the prompt
 * or an entry in the question's `extracts`, which also holds its attribution. A few questions
 * are answered by putting items in order or sorting them into groups.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/history/bundle.json", import.meta.url), "utf8"),
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
/** The quoted paragraphs of a prompt, and the prose around them. */
const quoted = (prompt: string): string[] =>
  prompt
    .split("\n")
    .filter((line) => line.startsWith("> "))
    .map((line) => line.slice(2));
/** Every extract a question shows, whichever way it is written. */
const extractsOf = (question: Question | undefined): string[] =>
  question
    ? [...quoted(question.prompt), ...(question.extracts ?? []).map((extract) => extract.text)]
    : [];
const own = (prompt: string): string =>
  prompt
    .split("\n")
    .filter((line) => !line.startsWith("> "))
    .join(" ");

describe("questions in History", () => {
  it("asks every question from a lesson, and every lesson question exists", () => {
    const asked = new Set(
      bundle.lessons.flatMap((lesson) => [
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

  it("keeps numbers for chronology and counts that are the historical point", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(10);
    // The lesson on dates is the one place where reckoning years is the skill being taught.
    const elsewhere = numeric.filter(
      (question) => !question.id.startsWith("his-dates-eras-and-periods-"),
    );
    expect(elsewhere.length).toBeLessThanOrEqual(4);
  });

  it("puts a source extract in front of the learner in most lessons", () => {
    const withExtract = bundle.questions.filter((question) => extractsOf(question).length > 0);
    expect(withExtract.length).toBeGreaterThanOrEqual(20);
    const lessons = bundle.lessons.filter((lesson) =>
      [...lesson.questionIds, ...lesson.steps.map((step) => step.checkQuestionId)].some(
        (id) => extractsOf(questions.get(id)).length > 0,
      ),
    );
    expect(lessons.length).toBeGreaterThanOrEqual(11);
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
      for (const source of cited)
        expect(source?.checked, question.id).toEqual({ status: "verified", at: "2026-11-11" });
      for (const extract of extracts) {
        const words = extract.split(/\s+/u).length;
        expect(words, question.id).toBeGreaterThanOrEqual(10);
        expect(words, question.id).toBeLessThanOrEqual(120);
      }
      // The question itself comes after the extract, so the last paragraph is the one in bold.
      expect(question.prompt.trim().split("\n").at(-1), question.id).toMatch(/\?$/u);
    }
  });

  it("keeps dashes out of everything but the quotations", () => {
    for (const question of bundle.questions) {
      const text = [
        own(question.prompt),
        ...question.hints,
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((item) => item.feedback),
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.order?.items ?? []),
        ...(question.sort?.bins ?? []).map((bin) => bin.label),
        ...(question.sort?.items ?? []).flatMap((item) => [item.label, item.explanation ?? ""]),
        ...(question.extracts ?? []).flatMap((extract) => [extract.who, extract.when, extract.kind]),
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
      places.add(`${question.choices.indexOf(right[0] as (typeof question.choices)[number])}`);
    }
    // The right option is found in every position across the course.
    expect([...places].sort()).toEqual(["0", "1", "2", "3"]);
  });

  it("keeps most questions multiple choice or short text, with a few to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(3);
    expect(counts.sort).toBeGreaterThanOrEqual(3);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.8);
  });

  it("writes an order question as distinct items and a sort question with every bin used", () => {
    for (const question of bundle.questions) {
      if (question.answerAuthority.kind !== "text") continue;
      const { order, sort } = question;
      if (order) {
        expect(new Set(order.items).size, question.id).toBe(order.items.length);
        expect(order.items.length, question.id).toBeGreaterThanOrEqual(4);
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([ORDER_ANSWER_IDEA]);
        // The list never gives the order away with a date at the front of each item.
        expect(order.items.filter((item) => /^\d/u.test(item)), question.id).toEqual([]);
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
        // Every item says why it belongs where it does once the question has closed.
        for (const item of sort.items) expect(item.explanation, question.id).toBeTruthy();
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([SORT_ANSWER_IDEA]);
      }
      if (order || sort) {
        expect(question.answerAuthority.exampleAnswer.length, question.id).toBeGreaterThan(40);
        expect(question.onCorrect, question.id).toBeTruthy();
      }
    }
  });

  it("sets two sources side by side where a question compares them, each with its attribution", () => {
    const pairs = bundle.questions.filter((question) => question.extracts?.length === 2);
    expect(pairs.map((question) => question.id).sort()).toEqual([
      "his-what-it-meant-then-and-since-skill-petition-1628",
      "his-who-made-it-and-why-skill-two-accounts",
    ]);
    for (const question of bundle.questions)
      for (const extract of question.extracts ?? []) {
        for (const part of [extract.who, extract.when, extract.kind])
          expect(part.trim().length, question.id).toBeGreaterThan(3);
        // The extract is in `extracts` alone, and the prompt ends with the question.
        expect(quoted(question.prompt), question.id).toEqual([]);
        expect(question.choices?.length || question.responseType === "short_text", question.id).toBeTruthy();
      }
    // A pair is named in the prompt as Source A or Source B, the way the screen labels them.
    for (const question of pairs) expect(question.prompt, question.id).toMatch(/Source [AB]/u);
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
