import { readFileSync } from "node:fs";
import type { CourseBundle } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";
import { LEAD_WORD_LIMIT } from "../src/lesson-v2.js";

/**
 * The v2 lesson rules, each shown to fire on its own. The base is Maths Foundations as published:
 * lesson 1 opens the course and lesson 2 has graded figures. A rule that stops firing, or a base
 * that already breaks one, shows up here.
 */
const base = JSON.parse(
  readFileSync(new URL("../../../content/maths-foundations/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
const first = base.lessons[0]!;
const prefix = `maths-${first.id}-`;
const codesOf = (bundle: CourseBundle) =>
  validateCourseBundle(bundle).issues.map((issue) => issue.code);
const baseline = new Set(codesOf(base));

describe("v2 validator rules", () => {
  const mutate = (change: (copy: CourseBundle) => void) => {
    const copy = structuredClone(base);
    change(copy);
    return codesOf(copy);
  };
  const lesson = (copy: CourseBundle, id = first.id) =>
    copy.lessons.find((item) => item.id === id)!;
  const step = (copy: CourseBundle, lessonId: string, id: string) =>
    lesson(copy, lessonId).steps.find((item) => item.id === id)!;
  const question = (copy: CourseBundle, id: string) => copy.questions.find((q) => q.id === id)!;
  const opener = first.intro!.hook.questionId!;

  it("starts from a lesson that none of these rules reports", () => {
    for (const code of [
      "TERM_BEFORE_INTRODUCTION",
      "TERM_NOT_INTRODUCED",
      "ITEM_OUTSIDE_SCOPE",
      "LEAD_TOO_LONG",
      "ANSWER_VISIBILITY_UNDECLARED",
      "FIRST_LESSON_OPENS_WITH_TRY",
      "V2_MISSING_CLOSE",
      "SKILL_CHECK_SIZE",
      "MISCONCEPTION_IS_KEY",
    ])
      expect(baseline.has(code), code).toBe(false);
  });

  it("reports a term asked about before the step that introduces it", () => {
    expect(
      mutate((copy) => {
        question(copy, opener).prompt = "Which variable is my number?";
      }),
    ).toContain("TERM_BEFORE_INTRODUCTION");
    expect(
      mutate((copy) => {
        question(copy, opener).usesTerms = ["solution"];
      }),
    ).toContain("TERM_NOT_INTRODUCED");
  });

  it("reports an item that needs a skill no lesson so far teaches", () => {
    expect(
      mutate((copy) => {
        question(copy, first.questionIds[0]!).skill = "solve-two-step";
      }),
    ).toContain("ITEM_OUTSIDE_SCOPE");
  });

  it("enforces the anatomy", () => {
    const graded = first.steps.find((item) => item.kind === "try")!;
    expect(
      mutate((copy) => {
        step(copy, first.id, graded.id).lead = [
          { kind: "paragraph", text: "word ".repeat(LEAD_WORD_LIMIT + 1).trim() },
        ];
      }),
    ).toContain("LEAD_TOO_LONG");
    const second = base.lessons[1]!;
    const figure = second.steps.find((item) => item.diagram && item.answerVisibility)!;
    expect(
      mutate((copy) => {
        delete step(copy, second.id, figure.id).answerVisibility;
      }),
    ).toContain("ANSWER_VISIBILITY_UNDECLARED");
    expect(
      mutate((copy) => {
        lesson(copy).steps[0]!.kind = "try";
        lesson(copy).steps[0]!.checkQuestionId = opener;
      }),
    ).toContain("FIRST_LESSON_OPENS_WITH_TRY");
    expect(
      mutate((copy) => {
        delete lesson(copy).recap;
      }),
    ).toContain("V2_MISSING_CLOSE");
    expect(
      mutate((copy) => {
        lesson(copy).questionIds = lesson(copy).questionIds.slice(0, 2);
      }),
    ).toContain("SKILL_CHECK_SIZE");
    const numeric = base.questions.find(
      (q) =>
        q.id.startsWith(prefix) && q.answerAuthority.kind === "numeric" && q.misconceptions?.length,
    )!;
    const key = numeric.answerAuthority.kind === "numeric" ? numeric.answerAuthority.value : 0;
    expect(
      mutate((copy) => {
        question(copy, numeric.id).misconceptions![0]!.match.numeric = [key];
      }),
    ).toContain("MISCONCEPTION_IS_KEY");
  });
});
