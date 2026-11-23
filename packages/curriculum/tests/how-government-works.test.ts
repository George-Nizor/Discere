import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * How Government Works asks most of its questions about a described case or a quoted passage: a
 * constitution's text, a political philosopher, an encyclopedia article. This file checks the shape of
 * the questions, the length of the right options, the quoted extracts against passages copied from the
 * source pack, and that no question asks for an exact sum: seats, quotas and indexes are judged by who
 * gains and which way a share moves, as in the other conceptual courses.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/how-government-works/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const passages = JSON.parse(
  readFileSync(new URL("./fixtures/how-government-works-passages.json", import.meta.url), "utf8"),
) as { files: Record<string, string[]> };
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const kind = (question: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  question.responseType === "numeric"
    ? "numeric"
    : question.responseType === "order" || question.responseType === "sort"
      ? question.responseType
      : question.choices
        ? "choice"
        : "typed";
const stepQuestionIds = (lesson: CourseBundle["lessons"][number]) =>
  lesson.steps.flatMap((step) => [
    step.checkQuestionId,
    ...(step.workedSteps ?? []).flatMap((line) => [
      line.blank?.questionId ?? "",
      line.selfExplain?.questionId ?? "",
    ]),
  ]);
const choiceQuestions = bundle.questions.filter(
  (question) =>
    question.choices &&
    question.choices.length >= 3 &&
    question.answerAuthority.kind === "text" &&
    !question.order &&
    !question.sort,
);
const rightOption = (question: Question) => {
  const authority = question.answerAuthority;
  if (authority.kind !== "text") throw new Error(question.id);
  const right = (question.choices ?? []).filter(
    (choice) => assessTextAnswer(choice.label, authority).correct,
  );
  expect(right, question.id).toHaveLength(1);
  return right[0] as NonNullable<Question["choices"]>[number];
};
const squash = (text: string) =>
  text.replace(/[‘’]/gu, "'").replace(/[“”]/gu, '"').replace(/\s+/gu, " ").trim();
/** Strings holding a control character other than a tab or a line break: a form feed is what a formula written \frac with one backslash in JSON turns into. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: this is the check for them
const CONTROL = /[\u0000-\u0008\u000b-\u001f]/u;
const withControlCharacters = (value: unknown): string[] =>
  typeof value === "string"
    ? CONTROL.test(value)
      ? [value.slice(0, 60)]
      : []
    : Array.isArray(value)
      ? value.flatMap(withControlCharacters)
      : value && typeof value === "object"
        ? Object.values(value).flatMap(withControlCharacters)
        : [];

describe("questions in How Government Works", () => {
  it("has the thirteen lessons of the curriculum, in order", () => {
    expect(bundle.lessons.map((lesson) => lesson.id)).toEqual([
      "why-obey-a-state",
      "classifying-a-regime",
      "reading-regime-data",
      "separation-of-powers",
      "reading-a-constitution",
      "executive-systems",
      "what-courts-can-do",
      "votes-to-seats",
      "factions-parties-groups",
      "opinion-policy-budget",
      "rights-and-the-majority",
      "federal-and-unitary",
      "states-among-states",
    ]);
    for (const lesson of bundle.lessons) expect(lesson.steps.length, lesson.id).toBeGreaterThan(0);
  });

  it("asks every question and every card from a lesson, and every id exists", () => {
    const asked = new Set(
      bundle.lessons.flatMap((lesson) => [
        lesson.intro?.hook.questionId ?? "",
        ...lesson.questionIds,
        ...stepQuestionIds(lesson),
      ]),
    );
    asked.delete("");
    expect([...asked].filter((id) => !questions.has(id))).toEqual([]);
    expect(bundle.questions.filter((question) => !asked.has(question.id)).map((q) => q.id)).toEqual(
      [],
    );
    const cards = bundle.lessons.flatMap((lesson) => lesson.flashcardIds);
    expect(new Set(cards).size).toBe(cards.length);
    expect(
      bundle.flashcards.filter((card) => !cards.includes(card.id)).map((card) => card.id),
    ).toEqual([]);
    const ids = [...bundle.questions.map((q) => q.id), ...bundle.flashcards.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not repeat a flashcard front across lessons", () => {
    const fronts = bundle.flashcards.map((card) => card.front.toLowerCase());
    expect(new Set(fronts).size).toBe(fronts.length);
  });

  it("ends each lesson with three checks of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps the right option the longest in at most 30 percent of choice questions, and never far longer", () => {
    let longest = 0;
    let shortest = 0;
    for (const question of choiceQuestions) {
      const right = rightOption(question).label.length;
      const rightId = rightOption(question).id;
      const others = (question.choices ?? [])
        .filter((choice) => choice.id !== rightId)
        .map((choice) => choice.label.length);
      if (right > Math.max(...others)) longest += 1;
      if (right < Math.min(...others)) shortest += 1;
      expect(right, question.id).toBeLessThanOrEqual(Math.max(...others) * 1.15);
    }
    expect(longest / choiceQuestions.length).toBeLessThanOrEqual(0.3);
    expect(shortest / choiceQuestions.length).toBeLessThanOrEqual(0.4);
  });

  it("explains every wrong option and gives two hints to every question that is not numeric", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
      }
      if (kind(question) !== "numeric") expect(question.hints.length, question.id).toBe(2);
      else expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const right = rightOption(question);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of question.choices.filter((item) => item.id !== right.id))
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
    }
  });

  it("keeps dashes, verdict words and stray control characters out of the course text, apart from quoted extracts", () => {
    const withoutExtracts = JSON.stringify(
      { course: bundle.course, lessons: bundle.lessons, flashcards: bundle.flashcards },
      (_key, value) => value,
    );
    expect(withoutExtracts).not.toMatch(/[—–]/u);
    expect(withControlCharacters(bundle)).toEqual([]);
    for (const question of bundle.questions) {
      const { extracts: _extracts, ...rest } = question;
      const text = JSON.stringify(rest);
      expect(text, question.id).not.toMatch(/[—–]/u);
      expect(text, question.id).not.toMatch(/\b(Correct|Not quite|Great job)\b/u);
    }
  });

  it("finds every quoted extract word for word in a passage copied from the source pack", () => {
    const pool = Object.values(passages.files).flat().map(squash);
    let checked = 0;
    for (const question of bundle.questions) {
      for (const extract of question.extracts ?? []) {
        checked += 1;
        expect(
          pool.some((passage) => passage.includes(squash(extract.text))),
          question.id,
        ).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("says who wrote each quoted extract and cites a source from the course for it", () => {
    const sources = new Map(bundle.sources.map((source) => [source.id, source]));
    for (const question of bundle.questions) {
      if (!question.extracts?.length) continue;
      for (const extract of question.extracts) {
        expect(extract.who.trim().length, question.id).toBeGreaterThan(0);
        expect(extract.when.trim().length, question.id).toBeGreaterThan(0);
      }
      const cited = (question.sourceIds ?? []).filter((id) => sources.has(id));
      expect(cited.length, question.id).toBeGreaterThan(0);
    }
  });

  it("asks no numeric question, so seats, quotas and indexes are judged and not computed", () => {
    expect(bundle.questions.filter((question) => kind(question) === "numeric")).toEqual([]);
    const seats = bundle.lessons.find((lesson) => lesson.id === "votes-to-seats");
    expect(seats?.questionIds.length).toBe(3);
    for (const id of seats?.questionIds ?? [])
      expect(kind(questions.get(id) as Question), id).not.toBe("numeric");
  });
});
