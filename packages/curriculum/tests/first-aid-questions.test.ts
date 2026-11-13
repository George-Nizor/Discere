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
 * First Aid follows the way the other rewritten courses ask questions
 * (docs/question-writing-guide.md), adapted to safety guidance: most questions describe a person and
 * a situation and ask for the next action, the order of actions, or what to check. Order questions
 * cover the sequences the sources give (the primary survey, the recovery position, the AED, choking,
 * bleeding) and sort questions cover the judgements (partial or complete choking, what to do and not
 * to do for a burn or a snakebite, warning signs after a head injury, heart attack or stroke, heat
 * exhaustion or heatstroke). Numeric questions stay only where the number is the point. Every fact
 * rests on a source record of the course, and the course quotes none of them.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/first-aid/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const sources = new Map(bundle.sources.map((source) => [source.id, source]));
const kind = (question: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  question.responseType === "numeric"
    ? "numeric"
    : question.responseType === "order" || question.responseType === "sort"
      ? question.responseType
      : question.choices
        ? "choice"
        : "typed";
const lessonOf = (question: Question) =>
  bundle.lessons.find((lesson) =>
    [
      ...lesson.questionIds,
      ...lesson.steps.flatMap((step) => [
        step.checkQuestionId,
        ...(step.workedSteps ?? []).flatMap((line) => [
          line.blank?.questionId ?? "",
          line.selfExplain?.questionId ?? "",
        ]),
      ]),
    ].includes(question.id),
  );

describe("questions in First Aid", () => {
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

  it("keeps numeric questions to the places where the number is the point", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(12);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("uses order and sort questions for sequences and for judgements, between eight and twelve", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(4);
    expect(counts.sort).toBeGreaterThanOrEqual(5);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
  });

  it("cites at least one source of the course and of its lesson for every question", () => {
    for (const question of bundle.questions) {
      expect(question.sourceIds.length, question.id).toBeGreaterThanOrEqual(1);
      const lesson = lessonOf(question);
      for (const id of question.sourceIds) {
        expect(sources.has(id), `${question.id} ${id}`).toBe(true);
        expect(lesson?.sourceIds.includes(id), `${question.id} ${id}`).toBe(true);
      }
    }
    for (const lesson of bundle.lessons)
      for (const id of lesson.sourceIds) expect(bundle.course.sourceIds).toContain(id);
  });

  it("quotes nothing from a source whose licence does not allow it", () => {
    for (const question of bundle.questions) expect(question.extracts ?? [], question.id).toEqual([]);
    for (const question of bundle.questions)
      expect(question.prompt, question.id).not.toContain("\n> ");
  });

  it("has verified, dated records for the sources added to settle the five unconfirmed claims", () => {
    for (const id of ["rcuk-adult-bls", "rcuk-first-aid"]) {
      const source = sources.get(id);
      expect(source?.checked?.status, id).toBe("verified");
      expect((source?.checked?.at ?? "") >= "2026-11-13", id).toBe(true);
      expect(bundle.course.sourceIds).toContain(id);
    }
  });

  it("names adrenaline as the ERC's, the NHS's and Resuscitation Council UK's word, not the British Red Cross's", () => {
    const text = JSON.stringify(bundle.lessons);
    expect(text).toContain("the ERC, the NHS and Resuscitation Council UK call it adrenaline");
    expect(text).not.toContain("the British Red Cross and the ERC call it adrenaline");
  });

  it("keeps dashes out of questions, hints and feedback", () => {
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
      ].join(" ");
      expect(text, question.id).not.toMatch(/[—–]/u);
      expect(text, question.id).not.toMatch(/\b(Correct|Not quite|Great job)\b/u);
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
      if (longestOther >= 10)
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

  it("never offers a harmful action as the right answer", () => {
    const harmful =
      /\b(butter|cream|toothpaste|ice\b|make (him|her|them) (sick|vomit)|induce vomiting|tourniquet round|suck|cut the bite|rub (her|his|their)|brandy|alcohol|put (it|the finger) back|collar)\b/iu;
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const right = question.answerAuthority.acceptedIdeas[0] ?? "";
      const label = question.choices.find((choice) => choice.label === right)?.label ?? "";
      // A right answer may say what not to do ("never try to put it back"); it may not recommend it.
      if (/\b(never|not|no|without|nothing)\b/iu.test(label)) continue;
      // Questions that ask what not to do have the harmful action as the answer.
      if (/should you not|say not to do|should not|not to do/iu.test(question.prompt)) continue;
      expect(label, question.id).not.toMatch(harmful);
    }
  });

  it("writes an order question as distinct items and a sort question with every bin used", () => {
    for (const question of bundle.questions) {
      if (question.answerAuthority.kind !== "text") continue;
      const { order, sort } = question;
      if (order) {
        expect(new Set(order.items).size, question.id).toBe(order.items.length);
        expect(order.items.length, question.id).toBeGreaterThanOrEqual(4);
        expect(order.items.length, question.id).toBeLessThanOrEqual(6);
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

  it("orders the primary survey, the recovery position, the AED, choking and bleeding as the sources do", () => {
    const first = (id: string) => questions.get(id)?.order?.items ?? [];
    expect(first("fira-the-primary-survey-order-of-checks")[0]).toMatch(/shake his shoulders/u);
    expect(first("fira-the-primary-survey-order-of-checks").at(-1)).toMatch(/compressions/u);
    expect(first("fira-the-recovery-position-order-of-moves")[0]).toMatch(/^Kneel/u);
    expect(first("fira-the-recovery-position-order-of-moves").at(-1)).toMatch(/tilt her head/u);
    expect(first("fira-using-an-aed-order-of-steps")[0]).toMatch(/compressions/u);
    expect(first("fira-using-an-aed-order-of-steps").at(-1)).toMatch(/straight after the shock/u);
    expect(first("fira-choking-order-adult")[1]).toMatch(/blows/u);
    expect(first("fira-choking-order-adult")[2]).toMatch(/abdominal thrusts/u);
    expect(first("fira-bleeding-and-shock-order-of-steps")[0]).toMatch(/press on the wound/u);
    expect(first("fira-bleeding-and-shock-order-of-steps").at(-1)).toMatch(/tourniquet/u);
  });

  it("puts a person and a situation in front of the learner in most questions", () => {
    const scene =
      /\b(man|woman|boy|girl|child|baby|toddler|person|people|rescuer|bystander|walker|driver|hiker|cyclist|player|runner|runner's|casualty|caller|neighbour|coach|passengers|3-year-old|4-year-old|6-year-old|8-month-old|you)\b/iu;
    const withScene = bundle.questions.filter((question) => scene.test(question.prompt));
    expect(withScene.length).toBeGreaterThanOrEqual(bundle.questions.length * 0.85);
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

  it("gives two hints to every question that is not numeric, and hints that guide", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
      }
      if (kind(question) !== "numeric") expect(question.hints.length, question.id).toBe(2);
    }
  });
});
