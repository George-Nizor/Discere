import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * The Roman Republic asks most of its questions about a quoted passage from a public-domain translation,
 * and every number in it can be recomputed. This file checks the shape of the questions, the length of
 * the right options, the quoted extracts against passages copied from the source pack, and each numeric
 * answer against the sum that produces it.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/roman-republic/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
const passages = JSON.parse(
  readFileSync(new URL("./fixtures/roman-republic-passages.json", import.meta.url), "utf8"),
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

describe("questions in The Roman Republic", () => {
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

  it("cites a verified public-domain source for every quoted extract", () => {
    const sources = new Map(bundle.sources.map((source) => [source.id, source]));
    for (const question of bundle.questions) {
      if (!question.extracts?.length) continue;
      const usable = (question.sourceIds ?? []).filter((id) => {
        const source = sources.get(id);
        return (
          source !== undefined &&
          /^public domain/iu.test(source.licence) &&
          source.checked?.status === "verified"
        );
      });
      expect(usable.length, question.id).toBeGreaterThan(0);
    }
  });

  it("states that the Cannae count of Livy's dead is the figure in this translation", () => {
    const text = JSON.stringify(
      bundle.lessons.find((lesson) => lesson.id === "hannibal-and-the-numbers"),
    );
    expect(text).toMatch(/in this translation/iu);
    for (const id of ["romr-hannibal-and-the-numbers-total", "romr-hannibal-and-the-numbers-hedge"])
      expect(questions.get(id)?.prompt, id).toMatch(/in this translation/iu);
  });

  it("recomputes every numeric answer", () => {
    const expected: Record<string, number> = {
      "what-livy-knew-kings-years": 753 - 509,
      "what-livy-knew-first-four": 244 - (38 + 40 + 25),
      "the-constitution-from-outside-years": 220 - 168,
      "orders-and-the-twelve-tables-eighty": 367 - 287,
      "rome-and-italy-four-legions": 4 * (4200 + 300),
      "rome-and-italy-end-danger": 4 * (5000 + 300),
      "why-the-second-punic-war-began-gap": 241 - 218,
      "hannibal-and-the-numbers-total": 40000 + 2700,
      "what-empire-did-to-rome-gap": 146 - 112,
      "the-gracchi-in-plutarch-gap": 133 - 121,
      "marius-sulla-and-their-armies-whole-list": 80 + 220 + 220,
      "catiline-cicero-and-the-triumvirate-the-gap": 60 - 49,
      "caesar-in-his-own-words-not-at-home": 368000 - 110000,
      // 23 BCE to 14 CE: there is no year 0, so 23 + 14 - 1.
      "augustus-and-the-res-gestae-tribunician-power": 23 + 14 - 1,
    };
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id.replace(/^romr-/u, "")).sort()).toEqual(
      Object.keys(expected).sort(),
    );
    for (const question of numeric) {
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(question.id);
      const key = question.id.replace(/^romr-/u, "");
      expect(authority.value, question.id).toBeCloseTo(expected[key] as number, 6);
    }
  });
});
