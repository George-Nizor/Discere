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
 * Writing Longer Pieces asks questions the way the finished courses do
 * (docs/question-writing-guide.md), adapted to planning, drafting and revising an essay or report:
 * most put a short draft, an outline, a summary or a plan in front of the learner and ask which
 * revision serves a stated reader, what a paragraph needs, or which cut or change comes first.
 * Every draft is invented for the exercise and labelled so; no real work is quoted. Numbers stay
 * where the lesson teaches a calculation (the word budget, a percentage, a percent change, a
 * drafting plan), and each one that is not a worked-example blank carries a decision.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/writing-longer-pieces/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const get = (id: string): Question => {
  const question = questions.get(id);
  if (!question) throw new Error(`No question ${id}`);
  return question;
};
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
const numericValue = (id: string): number => {
  const authority = get(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const rightChoice = (question: Question) => {
  if (question.answerAuthority.kind !== "text") return undefined;
  const authority = question.answerAuthority;
  return question.choices?.find((choice) => assessTextAnswer(choice.label, authority).correct);
};
const optionText = (id: string): string =>
  (get(id).choices ?? []).map((choice) => choice.label).join(" | ");

describe("questions in Writing Longer Pieces", () => {
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
    for (const lesson of bundle.lessons) {
      expect(lesson.flashcardIds.length, lesson.id).toBe(3);
      for (const id of lesson.flashcardIds)
        expect(
          bundle.flashcards.some((card) => card.id === id),
          id,
        ).toBe(true);
    }
  });

  it("ends each lesson with three questions of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(get(id)));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps numeric questions to nine, each with three hints, where the number is the lesson", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id).sort()).toEqual([
      "wrilp-a-process-that-finishes-drafting-days",
      "wrilp-a-process-that-finishes-shorter-piece",
      "wrilp-clear-and-short-remaining-v2",
      "wrilp-evidence-and-analysis-second-percent",
      "wrilp-numbers-tables-figures-back-to-the-start",
      "wrilp-numbers-tables-figures-rise",
      "wrilp-reader-purpose-and-form-points-that-fit",
      "wrilp-reader-purpose-and-form-section-length",
      "wrilp-shape-of-a-report-second-saving",
    ]);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
    // Six of the nine are the last line of a faded example; the other three carry a decision.
    const blanks = new Set(
      bundle.lessons.flatMap((lesson) =>
        lesson.steps.flatMap((step) =>
          (step.workedSteps ?? []).map((line) => line.blank?.questionId ?? ""),
        ),
      ),
    );
    expect(numeric.filter((question) => !blanks.has(question.id)).map((q) => q.id)).toEqual([
      "wrilp-reader-purpose-and-form-points-that-fit",
      "wrilp-a-process-that-finishes-drafting-days",
      "wrilp-numbers-tables-figures-back-to-the-start",
    ]);
  });

  it("recomputes every number the numeric questions state", () => {
    // Faded-example blanks.
    expect(numericValue("wrilp-reader-purpose-and-form-section-length")).toBe(
      (2000 * (1 - 0.15 - 0.1)) / 3,
    );
    expect(numericValue("wrilp-evidence-and-analysis-second-percent")).toBe((36 / 150) * 100);
    expect(numericValue("wrilp-clear-and-short-remaining-v2")).toBe(((250 - 200) / 250) * 100);
    expect(numericValue("wrilp-a-process-that-finishes-shorter-piece")).toBe(2400 / 3);
    expect(numericValue("wrilp-shape-of-a-report-second-saving")).toBe(0.08 * 150000);
    expect(numericValue("wrilp-numbers-tables-figures-rise")).toBe(((65 - 50) / 50) * 100);
    // Decisions.
    expect(numericValue("wrilp-reader-purpose-and-form-points-that-fit")).toBe(
      Math.floor((2000 * 0.8) / 200),
    );
    expect(numericValue("wrilp-a-process-that-finishes-drafting-days")).toBe(3000 / 500);
    expect(numericValue("wrilp-numbers-tables-figures-back-to-the-start")).toBeCloseTo(
      (1 / (1 - 0.2) - 1) * 100,
      9,
    );
    // The wrong answers named in the feedback.
    expect(2000 / 200).toBe(10);
    expect(2000 * 0.8).toBe(1600);
    expect(3000 / 4).toBe(750);
    // The short decisions the blanks now carry: 24% is under a quarter, a fifth is short of the
    // quarter the brief asked for, and 800 words a day is more than the 600 she can write.
    expect((36 / 150) * 100).toBeLessThan(25);
    expect((250 - 200) / 250).toBeLessThan(0.25);
    expect(2400 / 3).toBeGreaterThan(600);
  });

  it("recomputes the figures that sit in prompts, options and feedback", () => {
    // The word limit: every cut saves 400 words, and the equal share is a little over a fifth.
    const draft = { summary: 150, background: 600, findings: 700, options: 300, steps: 150 };
    const total = Object.values(draft).reduce((sum, words) => sum + words, 0);
    expect(total).toBe(1900);
    expect(total - 1500).toBe(400);
    expect(600 - 200).toBe(400);
    expect(700 - 300).toBe(400);
    expect(150 + (300 - 50)).toBe(400);
    expect(400 / total).toBeGreaterThan(0.2);
    expect(400 / total).toBeLessThan(0.25);
    const wording = (id: string) => `${get(id).prompt} ${optionText(id)}`;
    expect(wording("wrilp-reader-purpose-and-form-which-section-to-cut")).toContain("1,900");
    // The merge: 2,400 words to 2,000, saving 450 by merging two 200-word paragraphs and cutting 250.
    expect(2400 - (400 - 200) - 250).toBe(1950);
    expect(2400 - 250 - 150).toBe(2000);
    expect(2400 - 200 - 200).toBe(2000);
    // The cut by a sixth that loses three of fourteen facts.
    expect(1800 - 1800 / 6).toBe(1500);
    expect(14 - 11).toBe(3);
    // The backward plan: 14 days, then 10.
    expect(3 + 1 + 4 + 4 + 2).toBe(14);
    expect(14 - 10).toBe(4);
    // The summary and the saving.
    expect(0.09 * 80000).toBeCloseTo(7200, 9);
    expect(600 / 2500).toBeGreaterThan(0.2);
    expect(600 / 2500).toBeLessThan(0.25);
    // Percent and percentage points.
    expect(20 - 14).toBe(6);
    expect((20 - 14) / 20).toBeCloseTo(0.3, 9);
    expect(Math.round(((20 - 14) / 14) * 100)).toBe(43);
    expect((7 - 5) / 5).toBeCloseTo(0.4, 9);
    // The surveys.
    expect(63 / 250).toBeCloseTo(0.252, 9);
    expect(Math.round((92 / 400) * 100)).toBe(23);
    expect(Math.floor(250 / 2) + 1).toBe(126);
    expect(250 / 4).toBeLessThan(63);
    // The bar chart: with the axis at 4.5 the bars are 0.1 and 0.3 long.
    expect((4.8 - 4.5) / (4.6 - 4.5)).toBeCloseTo(3, 9);
    expect(4.8 - 4.6).toBeCloseTo(0.2, 9);
    expect(get("wrilp-numbers-tables-figures-honest-axis").prompt).toContain("three times");
    // The review cards.
    const back = (id: string) => bundle.flashcards.find((card) => card.id === id)?.back ?? "";
    expect(back("wrilp-evidence-and-analysis-card-4")).toContain("126");
    expect(back("wrilp-reader-purpose-and-form-card-4")).toContain("background");
  });

  it("puts a draft in front of the learner in at least seven questions across six lessons", () => {
    const withExtract = bundle.questions.filter((question) => extractsOf(question).length > 0);
    expect(withExtract.length).toBeGreaterThanOrEqual(7);
    const lessons = bundle.lessons.filter((lesson) =>
      [...lesson.questionIds, ...lesson.steps.map((step) => step.checkQuestionId)].some(
        (id) => extractsOf(questions.get(id)).length > 0,
      ),
    );
    expect(lessons.length).toBeGreaterThanOrEqual(6);
  });

  it("labels every draft as invented and quotes no real work", () => {
    for (const question of bundle.questions) {
      for (const extract of question.extracts ?? []) {
        expect(extract.who, question.id).toMatch(/invented/iu);
        expect(extract.when, question.id).toMatch(/written for this lesson/u);
        expect(extract.text.split(/\s+/u).length, question.id).toBeLessThanOrEqual(80);
        for (const part of [extract.who, extract.when, extract.kind])
          expect(part.trim().length, question.id).toBeGreaterThan(3);
      }
      if (question.extracts?.length) {
        expect(question.prompt.trim(), question.id).toMatch(/\?$/u);
        expect(question.prompt, question.id).not.toContain("\n> ");
      }
    }
  });

  it("keeps dashes out of everything", () => {
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
          extract.text,
          extract.who,
          extract.when,
          extract.kind,
        ]),
      ].join(" ");
      expect(text, question.id).not.toMatch(/[—–]/u);
    }
    for (const lesson of bundle.lessons)
      for (const step of lesson.steps)
        for (const block of step.reveal ?? [])
          expect(JSON.stringify(block), `${lesson.id} ${step.id}`).not.toMatch(/[—–]/u);
    for (const card of bundle.flashcards)
      expect(`${card.front} ${card.back}`, card.id).not.toMatch(/[—–]/u);
  });

  it("keeps verdict words out of feedback", () => {
    for (const question of bundle.questions) {
      const text = [
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((item) => item.feedback),
      ].join(" ");
      expect(text, question.id).not.toMatch(
        /\b(Correct|Not quite|Great job|Well done|Incorrect)\b/u,
      );
    }
  });

  it("marks one option right, keeps lengths from giving it away, and explains each wrong one", () => {
    const withOptions = bundle.questions.filter((question) => (question.choices?.length ?? 0) >= 3);
    let longest = 0;
    let shortest = 0;
    const places = new Set<number>();
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
      const stops = new Set(question.choices.map((choice) => choice.label.trimEnd().endsWith(".")));
      expect(stops.size, `${question.id} mixes options with and without a full stop`).toBe(1);
      if (question.choices.length < 3) continue;
      const rightLength = right[0]?.label.length ?? 0;
      const lengths = others.map((choice) => choice.label.length);
      expect(rightLength, question.id).toBeLessThanOrEqual(Math.max(...lengths) * 1.15);
      if (rightLength > Math.max(...lengths)) longest += 1;
      if (rightLength < Math.min(...lengths)) shortest += 1;
      places.add(question.choices.indexOf(right[0] as (typeof question.choices)[number]));
    }
    expect(longest).toBeLessThanOrEqual(Math.floor(withOptions.length * 0.3));
    expect(longest).toBeGreaterThanOrEqual(Math.floor(withOptions.length * 0.1));
    expect(shortest).toBeLessThanOrEqual(Math.floor(withOptions.length * 0.4));
    expect([...places].sort()).toEqual([0, 1, 2, 3]);
  });

  it("keeps most questions multiple choice, with some to order and to sort and one typed", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(5);
    expect(counts.sort).toBeGreaterThanOrEqual(7);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.typed).toBeLessThanOrEqual(2);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
  });

  it("asks no question that only names a term from its definition", () => {
    for (const question of bundle.questions) {
      expect(question.prompt, question.id).not.toMatch(
        /^(What|Which) (one )?(word|name|term)\b|^What (is|are) .*\b(called|named)\?$|^Name the\b/iu,
      );
      expect(question.prompt, question.id).not.toMatch(/\bWhat (word|name) /u);
    }
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

  it("sets the two paragraphs side by side as Source A and Source B", () => {
    const pairs = bundle.questions.filter((question) => question.extracts?.length === 2);
    expect(pairs.map((question) => question.id)).toEqual([
      "wrilp-revising-the-whole-merge-the-pair",
    ]);
    for (const question of pairs) expect(question.prompt, question.id).toMatch(/Source A/u);
  });

  it("says in the prompt which case is invented when there is no draft to carry the label", () => {
    for (const id of [
      "wrilp-paragraphs-order-the-paragraph",
      "wrilp-counterargument-and-qualifying-answer-in-order",
    ])
      expect(get(id).prompt, id).toMatch(/invented/iu);
  });

  it("keeps an extract question to a choice of at least three options with two hints", () => {
    for (const question of bundle.questions) {
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
      if (!question.extracts?.length) continue;
      if (question.answerAuthority.kind !== "text") continue;
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

  it("accepts the likely right answers to the typed question and refuses the likely wrong ones", () => {
    const check = (id: string, answer: string) => {
      const authority = get(id).answerAuthority;
      if (authority.kind !== "text") throw new Error(id);
      return assessTextAnswer(answer, authority).correct;
    };
    const id = "wrilp-numbers-tables-figures-which-unit";
    for (const answer of [
      "percentage points",
      "Percentage points",
      "percentage point",
      "points",
      "2 percentage points",
      "it should be percentage points",
    ])
      expect(check(id, answer), answer).toBe(true);
    for (const answer of [
      "percent",
      "per cent",
      "percentage",
      "percent change",
      "a rate",
      "%",
      "percentile",
    ])
      expect(check(id, answer), answer).toBe(false);
  });

  it("gives hints that guide, with no first letters and no bare sums", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
      }
    }
  });

  it("keeps the right choice of a question out of its own prompt", () => {
    for (const question of bundle.questions) {
      const right = rightChoice(question);
      if (!right) continue;
      expect(question.prompt.includes(right.label), question.id).toBe(false);
    }
  });

  it("replaces the review cards that drilled arithmetic with cards about the decision", () => {
    const numericCards = bundle.flashcards.filter(
      (card) => card.answerAuthority?.kind === "numeric",
    );
    expect(numericCards.map((card) => card.id)).toEqual([]);
    const replaced = [
      "wrilp-reader-purpose-and-form-card-4",
      "wrilp-evidence-and-analysis-card-4",
      "wrilp-revising-the-whole-card-4",
      "wrilp-clear-and-short-card-4",
      "wrilp-a-process-that-finishes-card-4",
      "wrilp-numbers-tables-figures-card-4",
    ];
    for (const id of replaced) {
      const card = bundle.flashcards.find((item) => item.id === id);
      expect(card, id).toBeDefined();
      expect(card?.recall, id).toBe("self");
      expect(card?.back.length, id).toBeGreaterThan(40);
    }
  });

  it("cites a verified source for the honest-axis question and every source the course lists", () => {
    const sources = new Map(bundle.sources.map((source) => [source.id, source]));
    const source = sources.get("analysis-function-charts");
    expect(source?.checked?.status).toBe("verified");
    expect(source?.url).toContain("analysisfunction.civilservice.gov.uk");
    expect(bundle.course.sourceIds).toContain("analysis-function-charts");
    expect(get("wrilp-numbers-tables-figures-honest-axis").sourceIds).toContain(
      "analysis-function-charts",
    );
    for (const question of bundle.questions)
      for (const id of question.sourceIds)
        expect(bundle.course.sourceIds, `${question.id} cites ${id}`).toContain(id);
  });
});
