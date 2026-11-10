import { existsSync, readdirSync, readFileSync } from "node:fs";
import { assessNumericAnswer, assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Marking checked against every reviewed bundle, read-only. A change to the numeric parser or the
 * text matcher must keep each question answerable by its own worked answer, keep authored slips
 * wrong, and keep exactly one option right on every multiple-choice question.
 */
const contentRoot = new URL("../../../content/", import.meta.url);
const courses = readdirSync(contentRoot).filter((name) =>
  existsSync(new URL(`${name}/bundle.json`, contentRoot)),
);
const bundles = courses.map((course) => ({
  course,
  bundle: JSON.parse(
    readFileSync(new URL(`${course}/bundle.json`, contentRoot), "utf8"),
  ) as CourseBundle,
}));
const known = JSON.parse(
  readFileSync(new URL("./fixtures/unmarkable-worked-answers.json", import.meta.url), "utf8"),
) as { example: string[]; back: string[] };

function questionsOf(bundle: CourseBundle): Question[] {
  return [
    ...bundle.questions,
    ...(bundle.courseChecks ?? []).flatMap((check) => check.items.map((item) => item.question)),
  ];
}

// Each check walks every bundle, which takes seconds when the whole suite runs at once.
describe("marking against every bundle", { timeout: 60_000 }, () => {
  it("reads the content", () => {
    expect(bundles.length).toBeGreaterThan(60);
  });

  it("accepts each numeric answer's own value, with and without its unit", () => {
    const failures: string[] = [];
    let checked = 0;
    for (const { course, bundle } of bundles) {
      const items = [
        ...questionsOf(bundle).map((q) => ({ id: q.id, authority: q.answerAuthority })),
        ...bundle.flashcards.flatMap((card) =>
          card.answerAuthority ? [{ id: card.id, authority: card.answerAuthority }] : [],
        ),
      ];
      for (const { id, authority } of items) {
        if (authority.kind !== "numeric") continue;
        checked++;
        const inputs = [String(authority.value)];
        if (authority.unit) inputs.push(`${authority.value} ${authority.unit}`);
        for (const input of inputs)
          if (!assessNumericAnswer(input, authority).correct)
            failures.push(`${course}/${id}: ${input}`);
      }
    }
    expect(checked).toBeGreaterThan(6000);
    expect(failures).toEqual([]);
  });

  it("rejects every numeric misconception value that lies outside the tolerance band", () => {
    const failures: string[] = [];
    let checked = 0;
    for (const { course, bundle } of bundles)
      for (const question of questionsOf(bundle)) {
        const authority = question.answerAuthority;
        if (authority.kind !== "numeric") continue;
        const allowed = Math.max(
          authority.absoluteTolerance ?? 1e-9,
          Math.abs(authority.value) * (authority.relativeTolerance ?? 0.01),
        );
        for (const misconception of question.misconceptions ?? [])
          for (const value of misconception.match.numeric ?? []) {
            if (Math.abs(value - authority.value) <= allowed) continue;
            checked++;
            const inputs = [String(value)];
            if (authority.unit) inputs.push(`${value} ${authority.unit}`);
            for (const input of inputs)
              if (assessNumericAnswer(input, authority).correct)
                failures.push(`${course}/${question.id}: ${input}`);
          }
      }
    expect(checked).toBeGreaterThan(10000);
    expect(failures).toEqual([]);
  });

  it("accepts exactly one option on every multiple-choice question", () => {
    const failures: string[] = [];
    let checked = 0;
    for (const { course, bundle } of bundles)
      for (const question of questionsOf(bundle)) {
        if (!question.choices?.length) continue;
        const authority = question.answerAuthority;
        checked++;
        const accepted =
          authority.kind === "text"
            ? question.choices.filter((choice) => assessTextAnswer(choice.label, authority).correct)
            : [];
        if (accepted.length !== 1)
          failures.push(`${course}/${question.id}: ${accepted.map((c) => c.id).join(",")}`);
      }
    expect(checked).toBeGreaterThan(3500);
    expect(failures).toEqual([]);
  });

  it("accepts each free-text worked answer and typed-card back that passed in November 2026", () => {
    const examples = new Set(known.example);
    const backs = new Set(known.back);
    const failures: string[] = [];
    for (const { course, bundle } of bundles) {
      for (const question of questionsOf(bundle)) {
        const authority = question.answerAuthority;
        if (authority.kind !== "text" || question.choices?.length) continue;
        const key = `${course}/${question.id}`;
        if (!examples.has(key) && !assessTextAnswer(authority.exampleAnswer, authority).correct)
          failures.push(`${key}: example`);
      }
      for (const card of bundle.flashcards) {
        const authority = card.answerAuthority;
        if (authority?.kind !== "text") continue;
        const key = `${course}/${card.id}`;
        if (!examples.has(key) && !assessTextAnswer(authority.exampleAnswer, authority).correct)
          failures.push(`${key}: example`);
        const back = assessTextAnswer(card.back, authority);
        if (!backs.has(key) && !(back.coverage === 1 && back.rejectedIdeasFound.length === 0))
          failures.push(`${key}: back`);
      }
    }
    expect(failures).toEqual([]);
  });
});
