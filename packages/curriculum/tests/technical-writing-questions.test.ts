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
 * Technical Writing asks questions the way the finished courses do (docs/question-writing-guide.md),
 * adapted to documentation: most put a short piece of documentation in front of the learner, such as
 * a sentence, a step list, a table row or a code sample, and ask which revision serves a stated
 * reader, what the reader cannot do with it, or which kind of page it belongs on. The pieces are
 * labelled as invented for the exercise, except four word-for-word quotations from the Google
 * developer documentation style guide (CC BY 4.0) and RFC 9110. Numbers are kept where the lesson
 * teaches a calculation: the Flesch score, the share of a draft cut, a success rate.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/technical-writing/bundle.json", import.meta.url), "utf8"),
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
const flesch = (wordsPerSentence: number, syllablesPerWord: number): number =>
  206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
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

describe("questions in Technical Writing", () => {
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
      const types = lesson.questionIds.map((id) => kind(get(id)));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps numeric questions to eight, each with three hints, where the number is the lesson", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id).sort()).toEqual([
      "tecw-editing-a-draft-percent-50",
      "tecw-editing-a-draft-percent-60",
      "tecw-examples-and-code-samples-prints",
      "tecw-sentences-and-paragraphs-after-split",
      "tecw-sentences-and-paragraphs-flesch-10",
      "tecw-sentences-and-paragraphs-halving-sentences",
      "tecw-testing-docs-with-readers-nine-of-fifteen",
      "tecw-testing-docs-with-readers-tickets-drop",
    ]);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("recomputes every number the numeric questions and their feedback state", () => {
    const rounded = (value: number) => Math.round(value);
    expect(numericValue("tecw-sentences-and-paragraphs-flesch-10")).toBe(rounded(flesch(10, 1.5)));
    expect(numericValue("tecw-sentences-and-paragraphs-after-split")).toBe(
      rounded(flesch(52 / 4, 1.6)),
    );
    expect(rounded(flesch(52 / 4, 1.6)) - rounded(flesch(52, 1.6))).toBe(39);
    expect(numericValue("tecw-sentences-and-paragraphs-halving-sentences")).toBe(
      rounded(flesch(11, 1.6) - flesch(22, 1.6)),
    );
    expect(flesch(11, 1.6) - flesch(22, 1.6)).toBeCloseTo(11.165, 3);
    expect(84.6 * 0.1).toBeCloseTo(8.46, 2);
    expect(numericValue("tecw-editing-a-draft-percent-60")).toBe(((60 - 45) / 60) * 100);
    expect(numericValue("tecw-editing-a-draft-percent-50")).toBe((9 / 50) * 100);
    expect(numericValue("tecw-testing-docs-with-readers-nine-of-fifteen")).toBe((9 / 15) * 100);
    expect(numericValue("tecw-testing-docs-with-readers-tickets-drop")).toBe(((30 - 6) / 30) * 100);
    // The sample in the faded example, run by hand: the dictionary holds b = 2.
    const data = JSON.parse('{"a": 1, "b": 2}') as Record<string, number>;
    expect(numericValue("tecw-examples-and-code-samples-prints")).toBe(data["b"]);
    // Figures that sit in prompts and feedback.
    expect(((40 - 28) / 40) * 100).toBe(30);
    expect((14 / 2000) * 1000).toBeCloseTo(7, 9);
    expect((3 / 300) * 1000).toBeCloseTo(10, 9);
    expect(
      get("tecw-docs-as-code-worse-page")
        .choices?.map((c) => c.label)
        .join(" "),
    ).toContain("10 issues per 1,000 words against 7");
    expect(3 / 120).toBeCloseTo(0.025, 9);
    expect(0.5 / (3 / 120)).toBeCloseTo(20, 9);
  });

  it("puts a piece of documentation in front of the learner in at least twenty questions across ten lessons", () => {
    const withExtract = bundle.questions.filter((question) => extractsOf(question).length > 0);
    expect(withExtract.length).toBeGreaterThanOrEqual(20);
    const lessons = bundle.lessons.filter((lesson) =>
      [...lesson.questionIds, ...lesson.steps.map((step) => step.checkQuestionId)].some(
        (id) => extractsOf(questions.get(id)).length > 0,
      ),
    );
    expect(lessons.length).toBeGreaterThanOrEqual(8);
  });

  it("labels every invented piece as invented and cites a verified licensed source for every real one", () => {
    const sources = new Map(bundle.sources.map((source) => [source.id, source]));
    for (const question of bundle.questions) {
      for (const extract of question.extracts ?? []) {
        const label = `${extract.who} ${extract.when}`;
        if (/invented/iu.test(label)) {
          expect(extract.when, question.id).toMatch(/written for this lesson/u);
          continue;
        }
        const cited = question.sourceIds
          .map((id) => sources.get(id))
          .filter((source) => /^(CC BY 4\.0|IETF Trust)/u.test(source?.licence ?? ""));
        expect(cited.length, question.id).toBeGreaterThanOrEqual(1);
        for (const source of cited) {
          expect(source?.checked?.status, question.id).toBe("verified");
          expect((source?.checked?.at ?? "") >= "2026-11-14", question.id).toBe(true);
        }
      }
      if (question.extracts?.length) {
        expect(question.prompt.trim(), question.id).toMatch(/\?$/u);
        expect(question.prompt, question.id).not.toContain("\n> ");
      }
    }
  });

  it("holds the four real quotations to the words of their sources", () => {
    const real = bundle.questions.flatMap((question) =>
      (question.extracts ?? [])
        .filter((extract) => !/invented/iu.test(extract.who))
        .map((extract) => ({ id: question.id, text: extract.text })),
    );
    expect(real).toEqual([
      {
        id: "tecw-clear-words-hidden-actor",
        text: "The service is queried, and an acknowledgment is sent.",
      },
      {
        id: "tecw-writing-procedures-guide-location",
        text: "Tell the reader where to complete an action—for example, in a particular tool or UI field—before you state the action.",
      },
      {
        id: "tecw-documenting-an-api-valid-key-read-only",
        text: "The 401 (Unauthorized) status code indicates that the request has not been applied because it lacks valid authentication credentials for the target resource.",
      },
      {
        id: "tecw-documenting-an-api-valid-key-read-only",
        text: "The 403 (Forbidden) status code indicates that the server understood the request but refuses to fulfill it.",
      },
    ]);
  });

  it("gives every extract its author, its date and the kind of document it comes from", () => {
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
    for (const lesson of bundle.lessons)
      for (const step of lesson.steps)
        for (const block of step.reveal ?? [])
          expect(JSON.stringify(block), `${lesson.id} ${step.id}`).not.toMatch(/[—–]/u);
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
    expect(shortest).toBeLessThanOrEqual(Math.floor(withOptions.length * 0.4));
    expect([...places].sort()).toEqual([0, 1, 2, 3]);
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

  it("sets the two RFC sentences side by side as Source A and Source B", () => {
    const pairs = bundle.questions.filter((question) => question.extracts?.length === 2);
    expect(pairs.map((question) => question.id)).toEqual([
      "tecw-four-kinds-of-page-pooled-connections",
      "tecw-documenting-an-api-valid-key-read-only",
    ]);
    for (const question of pairs) {
      const text = `${question.prompt} ${(question.choices ?? []).map((c) => c.label).join(" ")}`;
      expect(text, question.id).toMatch(/Source [AB]/u);
    }
  });

  it("says in the prompt which case is invented", () => {
    const text = (id: string) => {
      const question = get(id);
      return `${question.prompt} ${(question.extracts ?? []).map((e) => e.who).join(" ")}`;
    };
    for (const id of [
      "tecw-who-is-reading-sort-assumptions",
      "tecw-writing-procedures-tally-routine",
    ])
      expect(text(id), id).toMatch(/invented/iu);
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

  it("accepts the likely right answers to the typed questions and refuses the likely wrong ones", () => {
    const check = (id: string, answer: string) => {
      const authority = get(id).answerAuthority;
      if (authority.kind !== "text") throw new Error(id);
      return assessTextAnswer(answer, authority).correct;
    };
    for (const answer of ["expected result", "the expected result", "result", "Expected outcome"])
      expect(check("tecw-writing-procedures-result-line", answer), answer).toBe(true);
    for (const answer of ["prerequisites", "step 1", "a warning", "the title"])
      expect(check("tecw-writing-procedures-result-line", answer), answer).toBe(false);
    for (const answer of ["Fixed", "fix", "bug fixes"])
      expect(check("tecw-docs-as-code-bug-fix-heading", answer), answer).toBe(true);
    for (const answer of ["Changed", "Added", "Security"])
      expect(check("tecw-docs-as-code-bug-fix-heading", answer), answer).toBe(false);
    for (const answer of ["Removed", "removed", "Deprecated"]) {
      const expected = answer !== "Deprecated";
      expect(check("tecw-docs-as-code-removed-heading", answer), answer).toBe(expected);
    }
    for (const answer of ["import json", "Import json"])
      expect(check("tecw-examples-and-code-samples-missing-import", answer), answer).toBe(true);
    for (const answer of ["import os", "json", "print(data)"])
      expect(check("tecw-examples-and-code-samples-missing-import", answer), answer).toBe(false);
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
});
