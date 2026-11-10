import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * History is the model for how a humanities course asks questions (docs/question-writing-guide.md).
 * These checks hold the rules that guide sets: source extracts with a verified public-domain
 * record, few numeric questions, end checks of more than one type, options of similar length
 * and plain prose around the quotations.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/history/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const kind = (question: Question): "numeric" | "choice" | "typed" =>
  question.responseType === "numeric" ? "numeric" : question.choices ? "choice" : "typed";
/** The quoted paragraphs of a prompt, and the prose around them. */
const quoted = (prompt: string): string[] =>
  prompt
    .split("\n")
    .filter((line) => line.startsWith("> "))
    .map((line) => line.slice(2));
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
    const withExtract = bundle.questions.filter((question) => quoted(question.prompt).length > 0);
    expect(withExtract.length).toBeGreaterThanOrEqual(20);
    const lessons = bundle.lessons.filter((lesson) =>
      [...lesson.questionIds, ...lesson.steps.map((step) => step.checkQuestionId)].some(
        (id) => quoted(questions.get(id)?.prompt ?? "").length > 0,
      ),
    );
    expect(lessons.length).toBeGreaterThanOrEqual(11);
  });

  it("cites a verified public-domain source for every extract and keeps extracts short", () => {
    const sources = new Map(bundle.sources.map((source) => [source.id, source]));
    for (const question of bundle.questions) {
      const extracts = quoted(question.prompt);
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
