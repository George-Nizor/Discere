import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * How the Body Works asks most of its questions about a passage of OpenStax or a health body's page.
 * This file checks the shape of the questions, the length of the right options, the quoted extracts
 * against passages copied from the source pack, and that no question asks for an exact sum: figures
 * are judged by size and direction from options, as in the other conceptual courses.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/how-the-body-works/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
const passages = JSON.parse(
  readFileSync(new URL("./fixtures/how-the-body-works-passages.json", import.meta.url), "utf8"),
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

describe("questions in How the Body Works", () => {
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
    // The sum that closed each of these lessons (the day's filtrate, a glucose conversion) became a
    // multiple-choice judgement question, so all three of their checks are now multiple choice.
    const choiceOnly = new Set(["kidneys-and-water-balance", "hormones-and-blood-sugar"]);
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      if (choiceOnly.has(lesson.id)) expect(new Set(types), lesson.id).toEqual(new Set(["choice"]));
      else expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
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

  it("keeps dashes and verdict words out of the course text, apart from quoted extracts", () => {
    const withoutExtracts = JSON.stringify(
      { course: bundle.course, lessons: bundle.lessons, flashcards: bundle.flashcards },
      (_key, value) => value,
    );
    expect(withoutExtracts).not.toMatch(/[—–]/u);
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

  it("asks for a judgement and never for an exact sum", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id)).toEqual([]);
    for (const question of bundle.questions) {
      expect(question.calculator, question.id).not.toBe("available");
      expect(question.prompt, question.id).not.toMatch(/calculator|nearest whole number|decimal place/iu);
    }
  });
});
