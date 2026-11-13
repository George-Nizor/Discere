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
 * Speaking, Argument and Debate follows the way History and Philosophy ask questions
 * (docs/question-writing-guide.md): short speeches, rebuttals and questions from the floor put in
 * front of the learner, famous speeches in the public domain quoted word for word, numbers only
 * where the number is the point, options of similar length with a reason given for each wrong one,
 * and order and sort questions where the sequence or the kinds are the point.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/speaking-argument-and-debate/bundle.json", import.meta.url),
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
const words = (text: string): number => text.trim().split(/\s+/u).length;
const choiceQuestions = bundle.questions.filter(
  (question) => (question.choices?.length ?? 0) >= 3 && question.answerAuthority.kind === "text",
);
const rightOf = (question: Question) => {
  const authority = question.answerAuthority;
  if (authority.kind !== "text") throw new Error(question.id);
  return (question.choices ?? []).filter(
    (choice) => assessTextAnswer(choice.label, authority).correct,
  );
};

describe("questions in Speaking, Argument and Debate", () => {
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

  it("keeps eight numbers at most, each where the number is the point", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id).sort()).toEqual(
      [
        "spead-framing-and-ethical-persuasion-expected-deaths-d",
        "spead-numbers-in-argument-final-points",
        "spead-numbers-in-argument-poll-share",
        "spead-numbers-in-argument-risk-halved",
        "spead-structure-of-a-spoken-answer-final-words",
        "spead-structure-of-a-spoken-answer-seconds-per-point",
        "spead-voice-pace-and-nerves-final-pace",
        "spead-case-building-and-weighing-final-compare",
      ].sort(),
    );
    expect(numeric.length).toBeLessThanOrEqual(8);
  });

  it("recomputes every numeric answer from the figures in its prompt", () => {
    const value = (id: string): number => {
      const authority = (questions.get(id) as Question).answerAuthority;
      if (authority.kind !== "numeric") throw new Error(id);
      return authority.value;
    };
    // expected deaths: a two-in-three chance that all 600 die
    expect(value("spead-framing-and-ethical-persuasion-expected-deaths-d")).toBeCloseTo(
      (2 / 3) * 600,
    );
    // 5 in 1,000 falls to 3 in 1,000, in percentage points
    expect(value("spead-numbers-in-argument-final-points")).toBeCloseTo(
      (5 / 1000 - 3 / 1000) * 100,
    );
    // 50 votes from 400 staff
    expect(value("spead-numbers-in-argument-poll-share")).toBeCloseTo((50 / 400) * 100);
    // 10 in 1,000 falls to 7 in 1,000, relative to the start
    expect(value("spead-numbers-in-argument-risk-halved")).toBeCloseTo(((10 - 7) / 10) * 100);
    // 2 minutes 30 seconds at 150 words a minute
    expect(value("spead-structure-of-a-spoken-answer-final-words")).toBeCloseTo(2.5 * 150);
    // 2 minutes less two 15-second ends, shared by three points
    expect(value("spead-structure-of-a-spoken-answer-seconds-per-point")).toBeCloseTo(
      (120 - 30) / 3,
    );
    // 520 words in 4 minutes
    expect(value("spead-voice-pace-and-nerves-final-pace")).toBeCloseTo(520 / 4);
    // 50,000 x 0.002 against 80 x 0.9
    expect(value("spead-case-building-and-weighing-final-compare")).toBeCloseTo(
      50000 * 0.002 - 80 * 0.9,
    );
  });

  it("recomputes the figures that the multiple-choice questions quote", () => {
    const rate = (count: number, base: number, per: number) => (count / base) * per;
    // the two slides, per 1,000 users
    expect(rate(6, 12000, 1000)).toBeCloseTo(0.5);
    expect(rate(9, 30000, 1000)).toBeCloseTo(0.3);
    // the pill: 1 extra case in 1,000 is 100 among 100,000, and 3 in 2 is a half more
    expect(rate(1, 1000, 100000)).toBeCloseTo(100);
    expect((3 - 2) / 2).toBeCloseTo(0.5);
    // unemployment 5 to 8 and 5 to 6
    expect(8 - 5).toBe(3);
    expect(((8 - 5) / 5) * 100).toBeCloseTo(60);
    expect(((6 - 5) / 5) * 100).toBeCloseTo(20);
    expect(5 * 1.01).toBeCloseTo(5.05);
    // the cough syrup: 9 of 12
    expect(9 / 12).toBeCloseTo(0.75);
    // the bus trial saves 12 of 40 minutes
    expect(12 / 40).toBeCloseTo(0.3);
    // the rota survey asked 3 of 60
    expect(3 / 60).toBeCloseTo(1 / 20);
    // a 600-word answer, 150 words a minute, 2-minute slot
    expect(600 / 150).toBe(4);
    expect(2 * 150).toBe(300);
    // 30 and 50 second slots at 150 words a minute
    expect((30 / 60) * 150).toBe(75);
    expect((50 / 60) * 150).toBe(125);
    // slot cut to 90 seconds with a 15-second opening and close
    expect((90 - 30) / 3).toBe(20);
    // 18 fillers in 3 minutes, 7 in one; 11 in 4 minutes against a target of 2 a minute
    expect(18 / 3).toBe(6);
    expect(11 / 4).toBeCloseTo(2.75);
    expect(2 * 4).toBe(8);
    // the two recordings
    expect(310 / 2).toBe(155);
    expect(9 / 2).toBe(4.5);
    expect(560 / 4).toBe(140);
    expect(12 / 4).toBe(3);
    expect(300 / 2).toBe(150);
    expect(10 / 2).toBe(5);
    expect(420 / 3).toBe(140);
    expect(9 / 3).toBe(3);
    // a 1,200-word script in a 7-minute slot at 140 words a minute
    expect(7 * 140).toBe(980);
    expect(1200 / 7).toBeCloseTo(171.4, 1);
    expect(1200 / 140).toBeCloseTo(8.57, 2);
    // the pitches
    expect(30 + 30 + 30 + 15).toBe(105);
    expect(120 - 105).toBe(15);
    expect(40 + 40 + 50 + 20).toBe(150);
    expect(180 - 150).toBe(30);
    expect(45 - 30).toBe(15);
    expect(300 / 400).toBe(0.75);
    // the survival rate for 200 patients and the plan that lets 150 of 500 die
    expect(0.9 * 200).toBe(180);
    expect(0.1 * 200).toBe(20);
    expect(500 - 150).toBe(350);
    // 90 x 1/5 against a sure 20, and 200 x 1/2 against a sure 100
    expect(90 / 5).toBe(18);
    expect(200 / 2).toBe(100);
    // British Parliamentary time
    expect(2 * 7).toBe(14);
    expect(8 * (7 - 2)).toBe(40);
    expect(8 * 7 - 8 * 5).toBe(16);
    expect(2 / 5).toBeCloseTo(0.4);
    expect(2 / 7).toBeCloseTo(0.2857, 3);
    // weighing
    expect(200 * 0.9).toBeCloseTo(180);
    expect(200 / 0.9).toBeCloseTo(222.2, 1);
    expect(900 / 150).toBe(6);
    expect(4 * 150).toBe(600);
    expect(900 - 600).toBe(300);
    expect(7 * 150).toBe(1050);
    expect(900 / 4).toBe(225);
    expect(40000 * 0.25).toBe(10000);
    expect(40000 / 0.25).toBe(160000);
    expect(12000 * 0.3).toBeCloseTo(3600);
    expect(12000 / 30).toBe(400);
    expect(1000 * 0.3).toBe(300);
    expect(200 * 0.9).toBeCloseTo(180);
  });

  it("checks the length of the key messages against the limit of 20 words", () => {
    const q = questions.get(
      "spead-questions-and-staying-on-message-which-message-fits",
    ) as Question;
    const lengths = Object.fromEntries(
      (q.choices ?? []).map((choice) => [choice.label.slice(0, 12), words(choice.label)]),
    );
    expect(lengths["The plan, wh"]).toBe(26);
    expect(lengths["We care deep"]).toBeLessThanOrEqual(20);
    expect(lengths["Weekend open"]).toBe(8);
  });

  it("puts a speech in front of the learner in at least six questions across six lessons", () => {
    const withExtract = bundle.questions.filter((question) => extractsOf(question).length > 0);
    expect(withExtract.length).toBeGreaterThanOrEqual(6);
    expect(withExtract.length).toBeLessThanOrEqual(8);
    const lessons = bundle.lessons.filter((lesson) =>
      [...lesson.questionIds, ...lesson.steps.map((step) => step.checkQuestionId)].some(
        (id) => extractsOf(questions.get(id)).length > 0,
      ),
    );
    expect(lessons.length).toBeGreaterThanOrEqual(6);
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
      for (const source of cited) {
        expect(source?.checked?.status, question.id).toBe("verified");
        expect((source?.checked?.at ?? "") >= "2026-11-14", question.id).toBe(true);
      }
      for (const extract of extracts) {
        expect(words(extract), question.id).toBeGreaterThanOrEqual(25);
        expect(words(extract), question.id).toBeLessThanOrEqual(90);
      }
      expect(question.prompt.trim(), question.id).toMatch(/\?$/u);
      expect(question.prompt, question.id).not.toContain("\n> ");
    }
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

  it("marks one option right and explains each wrong one", () => {
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const right = rightOf(question);
      expect(right, question.id).toHaveLength(1);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of question.choices.filter((item) => item !== right[0]))
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
    }
  });

  it("keeps the right option from standing out by length, and varies where it sits", () => {
    let longest = 0;
    let shortest = 0;
    const places = new Set<number>();
    for (const question of choiceQuestions) {
      const right = rightOf(question)[0];
      const others = (question.choices ?? []).filter((choice) => choice !== right);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      const shortestOther = Math.min(...others.map((choice) => choice.label.length));
      const length = right?.label.length ?? 0;
      expect(length, question.id).toBeLessThanOrEqual(longestOther * 1.15);
      if (length > longestOther) longest += 1;
      if (length < shortestOther) shortest += 1;
      const stops = (question.choices ?? []).map((choice) => /[.?!]$/u.test(choice.label.trim()));
      expect(new Set(stops).size, `${question.id} mixes full stops`).toBe(1);
      places.add((question.choices ?? []).indexOf(right as NonNullable<typeof right>));
    }
    expect(longest).toBeLessThanOrEqual(Math.floor(choiceQuestions.length * 0.3));
    expect(shortest).toBeLessThanOrEqual(Math.floor(choiceQuestions.length * 0.4));
    expect([...places].sort()).toEqual([0, 1, 2, 3]);
  });

  it("keeps most questions multiple choice or short text, with some to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(3);
    expect(counts.sort).toBeGreaterThanOrEqual(5);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
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
        expect(order.items.length, question.id).toBeLessThanOrEqual(7);
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
        expect(sort.items.length, question.id).toBeGreaterThanOrEqual(4);
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

  it("marks the typed answers the lesson teaches and turns away the likely wrong ones", () => {
    const check = (id: string, right: string[], wrong: string[]) => {
      const authority = (questions.get(id) as Question).answerAuthority;
      if (authority.kind !== "text") throw new Error(id);
      for (const answer of right)
        expect(assessTextAnswer(answer, authority).correct, `${id} ${answer}`).toBe(true);
      for (const answer of wrong)
        expect(assessTextAnswer(answer, authority).correct, `${id} ${answer}`).toBe(false);
    };
    check(
      "spead-questions-and-staying-on-message-final-missing-letter",
      ["acknowledge", "Acknowledge the question", "the acknowledgement"],
      ["bridge", "the bridge", "communicate", "key message", "ABC", "I don't know"],
    );
    check(
      "spead-fallacies-at-speed-library-reply",
      ["straw man", "a straw man", "strawman"],
      ["ad hominem", "false dilemma", "hasty generalisation"],
    );
    check(
      "spead-fallacies-at-speed-final-generalisation",
      ["hasty generalisation", "a hasty generalisation"],
      ["straw man", "ad hominem", "false dilemma"],
    );
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

  it("keeps verdict words out of the feedback", () => {
    for (const question of bundle.questions) {
      const text = [
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((m) => m.feedback),
      ];
      for (const line of text)
        expect(line, question.id).not.toMatch(/^(Correct|Not quite|Incorrect|Wrong|Well done)/iu);
    }
  });
});
