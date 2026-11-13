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
 * Reading and Research follows the way History asks questions (docs/question-writing-guide.md),
 * adapted to source work: most questions put a short passage, a claim with its figures, a search
 * or a note in front of the learner and ask what it shows, what is missing and what to do next.
 * Real passages come from Bacon, Paine and Pliny (Project Gutenberg, public domain); the others
 * are labelled as invented for the exercise. Numeric questions stay in the worked-example blanks
 * and in one place where a figure is read off a trial table.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/reading-and-research/bundle.json", import.meta.url),
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

describe("questions in Reading and Research", () => {
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

  it("keeps numeric questions to the worked-example blanks and one figure read off a trial table", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(12);
    const blanks = new Set(
      bundle.lessons.flatMap((lesson) =>
        lesson.steps.flatMap((step) =>
          (step.workedSteps ?? []).map((line) => line.blank?.questionId ?? ""),
        ),
      ),
    );
    expect(numeric.filter((question) => !blanks.has(question.id)).map((q) => q.id)).toEqual([
      "rear-judging-a-claim-flu-table",
    ]);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("puts a passage in front of the learner in at least ten questions across six lessons", () => {
    const withExtract = bundle.questions.filter((question) => extractsOf(question).length > 0);
    expect(withExtract.length).toBeGreaterThanOrEqual(10);
    const lessons = bundle.lessons.filter((lesson) =>
      [...lesson.questionIds, ...lesson.steps.map((step) => step.checkQuestionId)].some(
        (id) => extractsOf(questions.get(id)).length > 0,
      ),
    );
    expect(lessons.length).toBeGreaterThanOrEqual(6);
  });

  it("cites a verified public-domain source for every real extract and labels the rest as invented", () => {
    const sources = new Map(bundle.sources.map((source) => [source.id, source]));
    for (const question of bundle.questions) {
      for (const extract of question.extracts ?? []) {
        const words = extract.text.split(/\s+/u).length;
        expect(words, question.id).toBeLessThanOrEqual(80);
        const label = `${extract.who} ${extract.when}`;
        if (/invented/iu.test(label)) {
          expect(extract.when, question.id).toMatch(/written for this lesson/u);
          continue;
        }
        expect(words, question.id).toBeGreaterThanOrEqual(20);
        const cited = question.sourceIds
          .map((id) => sources.get(id))
          .filter((source) => source?.licence.startsWith("Public domain"));
        expect(cited.length, question.id).toBeGreaterThanOrEqual(1);
        for (const source of cited) {
          expect(source?.checked?.status, question.id).toBe("verified");
          expect((source?.checked?.at ?? "") >= "2026-11-13", question.id).toBe(true);
        }
      }
      if (question.extracts?.length) {
        expect(question.prompt.trim(), question.id).toMatch(/\?$/u);
        expect(question.prompt, question.id).not.toContain("\n> ");
      }
    }
  });

  it("uses the three real works the course quotes, and nothing else public-domain", () => {
    const real = new Set(
      bundle.questions
        .filter((question) => (question.extracts ?? []).some((e) => !/invented/iu.test(e.who)))
        .flatMap((question) => question.extracts ?? [])
        .filter((extract) => !/invented/iu.test(extract.who))
        .map((extract) => extract.who.split(",")[0]),
    );
    expect([...real].sort()).toEqual([
      "Francis Bacon",
      "Pliny the Younger",
      "Thomas Paine",
    ]);
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
      // A row of bare labels such as Primary, Secondary and Tertiary cannot be balanced by length.
      if (longestOther >= 12)
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
      "rear-kinds-of-source-pliny-and-textbook",
      "rear-judging-a-claim-headline-and-table",
      "rear-making-notes-bacon-student",
    ]);
    for (const question of pairs)
      expect(`${question.prompt} ${question.onCorrect}`, question.id).toMatch(/Source [AB]|Pliny|Bacon|headline/u);
    for (const id of ["rear-kinds-of-source-pliny-and-textbook", "rear-judging-a-claim-headline-and-table", "rear-making-notes-bacon-student"])
      expect(questions.get(id)?.prompt, id).toMatch(/Source [AB]/u);
  });

  it("says in the prompt that an invented case is invented", () => {
    for (const question of bundle.questions) {
      const text = `${question.prompt} ${(question.extracts ?? []).map((e) => e.who).join(" ")}`;
      if (/Okoye|hospital's flu outbreak|tea drinkers|sleep app|tutoring programme/iu.test(text))
        expect(text, question.id).toMatch(/invented/iu);
    }
  });

  it("holds the passages to the words of the works they quote", () => {
    const bacon = questions.get("rear-reading-with-a-purpose-bacon-tasted");
    expect(extractsOf(bacon)[0]).toContain("Some books are to be tasted, others to be swallowed");
    const pliny = questions.get("rear-judging-a-source-pliny-vouches");
    expect(extractsOf(pliny)[0]).toContain("before there was time to vary the truth");
    const paine = questions.get("rear-reading-for-argument-paine-claim");
    expect(extractsOf(paine)[0]).toContain("England to Europe, America to itself");
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
      const needsTwo =
        question.extracts?.length || question.order || question.sort || kind(question) === "numeric";
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(needsTwo ? 2 : 1);
    }
  });
});
