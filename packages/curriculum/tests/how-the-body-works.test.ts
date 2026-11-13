import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * How the Body Works asks most of its questions about a passage of OpenStax or a health body's page,
 * and every number in it can be recomputed. This file checks the shape of the questions, the length of
 * the right options, the quoted extracts against passages copied from the source pack, and each numeric
 * answer against the sum that produces it.
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

  it("recomputes every numeric answer", () => {
    const expected: Record<string, number> = {
      "keeping-the-body-steady-read-a-range": 38.1 - 37.5,
      "bones-and-muscles-faded-low": 60 + 0.2 * 60,
      "bones-and-muscles-faded-high": 60 + 0.3 * 60,
      "bones-and-muscles-highest-expected": 50 + 0.3 * 50,
      "the-heart-faded-millilitres": 130 * 150,
      "the-heart-faded-litres": 19500 / 1000,
      "the-heart-work-backwards": (5.4 * 1000) / 60,
      "the-heart-resting-output": (80 * 90) / 1000,
      "blood-vessels-and-blood-pressure-difference-120-80": 120 - 80,
      "lungs-and-breathing-membrane-in-millimetres": 0.5 / 1000,
      "lungs-and-breathing-breaths-a-minute": Math.round(25000 / (24 * 60)),
      "lungs-and-breathing-relative-increase": 10 + 0.3 * 10,
      "lungs-and-breathing-micrometres-to-millimetres": 3 / 1000,
      "nutrition-and-energy-split-2200": 0.2 * 2200,
      "nutrition-and-energy-free-sugars-limit": 0.1 * 2000,
      "nutrition-and-energy-salt-portions": Math.floor(5 / 2.4),
      "nutrition-and-energy-split-1600": 0.7 * 1600,
      "kidneys-and-water-balance-female-urine": 0.01 * 150,
      "kidneys-and-water-balance-two-percent": 0.02 * 180,
      "kidneys-and-water-balance-check-gfr": (110 * 1440) / 1000,
      "nerves-and-senses-voltage-rise": 30 - -70,
      "nerves-and-senses-check-above-zero": 30 - 0,
      "hormones-and-blood-sugar-convert-3": 3.0 * 18,
      "hormones-and-blood-sugar-type-2-share": 0.95 * 400,
      "hormones-and-blood-sugar-check-convert": 4.4 * 18,
      "immune-system-and-vaccines-district": 0.84 * 2000,
      "immune-system-and-vaccines-check-coverage": (100 - 84) * 10,
    };
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id.replace(/^howbw-/u, "")).sort()).toEqual(
      Object.keys(expected).sort(),
    );
    for (const question of numeric) {
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(question.id);
      const key = question.id.replace(/^howbw-/u, "");
      expect(authority.value, question.id).toBeCloseTo(expected[key] as number, 6);
    }
  });
});
