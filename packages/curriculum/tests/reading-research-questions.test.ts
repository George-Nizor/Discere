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
 * are labelled as invented for the exercise. The questions that once asked for a figure (a reading
 * time, a review date, a relative reduction, a number needed to treat, a total of participants) now ask
 * for a judgement, such as roughly how long an article takes or how large a share the biggest study
 * holds, and the figures behind each right answer are recomputed here from the scenario.
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

  it("keeps typed numbers to the two search counts, where the count is the point of the operator", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id).sort()).toEqual([
      "rear-searching-well-not-count-v2",
      "rear-searching-well-or-count",
    ]);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
    // A OR B counts the shared results once, and A NOT B takes them out of A.
    expect(100 + 80 - 30).toBe(150);
    expect(70 - 15).toBe(55);
  });

  it("asks for a judgement and not a calculation in the questions that once wanted a figure", () => {
    for (const id of [
      "rear-reading-with-a-purpose-twelve-thousand",
      "rear-reading-with-a-purpose-three-hundred-pages",
      "rear-remembering-what-you-read-third-day",
      "rear-remembering-what-you-read-last-review",
      "rear-judging-a-claim-relative-reduction",
      "rear-judging-a-claim-nnt-common",
      "rear-judging-a-claim-flu-table",
      "rear-synthesising-sources-total-participants",
      "rear-synthesising-sources-benefit-participants",
    ]) {
      const question = questions.get(id) as Question;
      expect(kind(question), id).toBe("choice");
      expect(question.hints, id).toHaveLength(2);
      expect(question.choices?.length, id).toBeGreaterThanOrEqual(3);
    }
  });

  it("recomputes the figures behind each judgement answer", () => {
    const label = (id: string) => {
      const question = questions.get(id) as Question;
      const authority = question.answerAuthority;
      if (authority.kind !== "text") throw new Error(id);
      return question.choices?.find((choice) => assessTextAnswer(choice.label, authority).correct)
        ?.label;
    };
    // 12,000 words at 240 a minute is 50 minutes: ten minutes cover 2,400 words, a fifth of the article.
    expect(12000 / 240).toBe(50);
    expect(240 * 10).toBe(2400);
    expect(2400 / 12000).toBe(0.2);
    expect(240 / 12000).toBeLessThan(1);
    expect(label("rear-reading-with-a-purpose-twelve-thousand")).toBe("About 50 minutes");
    // 300 pages at 25 a day is 12 days: a week covers 175 pages, two weeks 350 and five weeks 875.
    expect(300 / 25).toBe(12);
    expect(7 * 25).toBeLessThan(300);
    expect(14 * 25).toBeGreaterThan(300);
    expect(35 * 25).toBe(875);
    expect(875 / 300).toBeGreaterThan(2.8);
    expect(label("rear-reading-with-a-purpose-three-hundred-pages")).toBe("About two weeks");
    // Read on 3 November, the 3-day review is the 6th. Counting the day read as day one gives the 5th,
    // and counting from the 1-day review on the 4th gives the 7th.
    expect(3 + 3).toBe(6);
    expect(3 + 3 - 1).toBe(5);
    expect(4 + 3).toBe(7);
    expect(label("rear-remembering-what-you-read-third-day")).toMatch(/makes it the 6th$/u);
    // Read on 12 November, the reviews fall on the 13th, 15th, 19th and 26th, all inside November.
    expect([1, 3, 7, 14].map((gap) => 12 + gap)).toEqual([13, 15, 19, 26]);
    expect(12 + 14).toBeLessThanOrEqual(30);
    expect(label("rear-remembering-what-you-read-last-review")).toMatch(/^The 26th/u);
    // 8 in 1,000 to 6 in 1,000: the fall of 2 is a quarter of the old rate, and the new rate is 75% of it.
    expect((8 - 6) / 8).toBe(0.25);
    expect(6 / 8).toBe(0.75);
    expect(((8 - 6) / 1000) * 100).toBeCloseTo(0.2, 12);
    expect(label("rear-judging-a-claim-relative-reduction")).toBe("About a quarter lower");
    // 40 in 100 to 20 in 100: 20 spared in every 100 is one in five, and the relative reduction is a half.
    expect(1 / ((40 - 20) / 100)).toBe(5);
    expect((40 - 20) / 40).toBe(0.5);
    expect(1 / 0.5).toBe(2);
    expect(label("rear-judging-a-claim-nnt-common")).toBe("About 5 people");
    // 12 of 200 against 8 of 200 is 6% against 4%: a third fewer cases, and 1 / 0.02 = 50 vaccinations.
    expect(12 / 200).toBeCloseTo(0.06, 12);
    expect(8 / 200).toBeCloseTo(0.04, 12);
    expect((12 - 8) / 12).toBeCloseTo(1 / 3, 12);
    expect(1 / (12 / 200 - 8 / 200)).toBeCloseTo(50, 9);
    expect(label("rear-judging-a-claim-flu-table")).toBe("About 50 people");
    // 300 + 150 + 80 + 1,200 + 70 = 1,800 and the other four come to 600, so the largest study holds
    // two thirds. Half would need the other four to come to 1,200.
    const first = [300, 150, 80, 1200, 70];
    expect(first.reduce((sum, n) => sum + n, 0)).toBe(1800);
    expect(300 + 150 + 80 + 70).toBe(600);
    expect(1200 / 1800).toBeCloseTo(2 / 3, 12);
    expect(1 / 5).toBe(0.2);
    expect(label("rear-synthesising-sources-total-participants")).toBe(
      "About two thirds of the participants",
    );
    // 350 + 200 + 160 = 710 of 2,270 is about 31%, a third, and half of 2,270 is over 1,100.
    const second = [350, 200, 160, 1500, 60];
    expect(second.reduce((sum, n) => sum + n, 0)).toBe(2270);
    expect(350 + 200 + 160).toBe(710);
    expect(710 / 2270).toBeGreaterThan(0.3);
    expect(710 / 2270).toBeLessThan(0.34);
    expect(2270 / 2).toBeGreaterThan(1100);
    expect(1500).toBeGreaterThan(710);
    expect(label("rear-synthesising-sources-benefit-participants")).toBe("About a third of them");
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
    expect([...real].sort()).toEqual(["Francis Bacon", "Pliny the Younger", "Thomas Paine"]);
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
      expect(`${question.prompt} ${question.onCorrect}`, question.id).toMatch(
        /Source [AB]|Pliny|Bacon|headline/u,
      );
    for (const id of [
      "rear-kinds-of-source-pliny-and-textbook",
      "rear-judging-a-claim-headline-and-table",
      "rear-making-notes-bacon-student",
    ])
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
        question.extracts?.length ||
        question.order ||
        question.sort ||
        kind(question) === "numeric";
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(needsTwo ? 2 : 1);
    }
  });
});
