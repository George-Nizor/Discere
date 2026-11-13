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
 * DevOps and Delivery follows the way History and Git ask questions (docs/question-writing-guide.md),
 * adapted to a practice learned in situations: most questions put a pipeline log, a workflow file, a
 * Dockerfile, a Compose file, a kubectl output, a plan or a dashboard reading in front of the learner and
 * ask what broke, which change fixes it or what a line does. Numeric questions stay only where the number
 * is the operational point: a rate from a log, a pipeline's wall-clock time, a canary's traffic, a rolling
 * update's limits, an autoscaler's replicas or an error budget.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/devops-and-delivery/bundle.json", import.meta.url), "utf8"),
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
const codeLines = (question: Question) =>
  question.prompt.split("\n").filter((line) => /^\s*`[^`]+`$/u.test(line));

describe("questions in DevOps and Delivery", () => {
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
    expect([...cards].filter((id) => !bundle.flashcards.some((card) => card.id === id))).toEqual([]);
  });

  it("ends each lesson with three questions of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps numeric questions to places where the number is the point", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(22);
    for (const question of numeric) {
      expect(question.hints.length, question.id).toBe(3);
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(`${question.id} is not numeric`);
      // A tolerance finer than half the last digit of the answer marks a rounded answer wrong.
      const decimals = (String(authority.value).split(".")[1] ?? "").length;
      if (decimals > 0)
        expect(authority.absoluteTolerance, question.id).toBeGreaterThanOrEqual(
          0.5 * 10 ** -decimals - 1e-12,
        );
    }
    // The end checks of the first lessons used to be three sums each.
    for (const lesson of bundle.lessons) {
      const ends = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(ends.filter((type) => type === "numeric").length, lesson.id).toBeLessThanOrEqual(1);
    }
  });

  it("puts a log, a file or an output in front of the learner in many questions", () => {
    const withCode = bundle.questions.filter((question) => codeLines(question).length >= 2);
    expect(withCode.length).toBeGreaterThanOrEqual(20);
    for (const question of withCode) {
      // The question comes after the code, or the code follows a one-sentence setup.
      expect(question.prompt, question.id).toMatch(/\?\s*$|\?\s*\n\s*`/u);
      for (const line of codeLines(question)) expect(line, question.id).not.toMatch(/\t/u);
    }
    const situation = /\byou\b|\byour\b|\b(team|service|pipeline|deployment|container|pod|server)s?\b/iu;
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.6);
  });

  it("shows YAML and Dockerfiles with consistent indentation and valid instructions", () => {
    const dockerfile = /^(FROM|WORKDIR|COPY|RUN|CMD|ENV|ARG)\b/u;
    for (const question of bundle.questions) {
      const lines = codeLines(question).map((line) => line.replace(/^(\s*)`(.*)`$/u, "$1$2"));
      if (lines.length === 0) continue;
      if (dockerfile.test(lines[0] ?? "")) {
        for (const line of lines) expect(line, question.id).toMatch(dockerfile);
        expect(lines[0], question.id).toMatch(/^FROM /u);
      }
      if (/^(on|jobs|services|steps|spec|resources):/u.test(lines[0] ?? "")) {
        for (const line of lines) {
          const indent = /^ */u.exec(line)?.[0].length ?? 0;
          expect(indent % 2, `${question.id}: ${line}`).toBe(0);
          expect(line, question.id).not.toMatch(/\t/u);
        }
      }
    }
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
      if (longestOther >= 20)
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
    expect(counts.order).toBeGreaterThanOrEqual(4);
    expect(counts.sort).toBeGreaterThanOrEqual(4);
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
        expect(sort.items.length, question.id).toBeGreaterThanOrEqual(5);
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

  it("covers the practices a team gets wrong: secrets in layers, mutable tags, unpinned actions, hand edits and a spent budget", () => {
    const text = bundle.questions.map((question) =>
      [
        question.prompt,
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.sort?.items ?? []).map((item) => item.label),
        ...(question.misconceptions ?? []).map((item) => item.feedback),
      ].join(" "),
    );
    for (const phrase of [
      /--mount=type=secret/u,
      /`latest`|node:latest/u,
      /@main/u,
      /revoke/iu,
      /error budget/iu,
      /rollout undo/u,
      /symptom|page/iu,
    ])
      expect(text.some((entry) => phrase.test(entry)), String(phrase)).toBe(true);
  });

  it("never offers a commit that gives a secret away as the right answer", () => {
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.find(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right?.label ?? "", question.id).not.toMatch(/\bENV\b.*TOKEN|--build-arg|rm \.env/u);
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
      const needsTwo = question.order || question.sort || kind(question) === "numeric";
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(needsTwo ? 2 : 1);
    }
  });

  it("gives every judgement question two hints", () => {
    for (const question of bundle.questions)
      if (kind(question) !== "numeric" && !question.id.endsWith("-term"))
        expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
  });

  it("keeps a review card for each lesson that asks for a name, a number or a choice, or is self-rated", () => {
    for (const card of bundle.flashcards)
      expect(Boolean(card.answerAuthority) || card.recall === "self", card.id).toBe(true);
  });
});
