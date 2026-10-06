import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LinearAlgebraDiagramSchema, LinearAlgebraModelSchema } from "@discere/contracts";
import { linearLessons as lessons } from "../../../content/linear-algebra-vectors-and-maps/authoring/lessons.js";
import { linearChecks as checks } from "../../../content/linear-algebra-vectors-and-maps/authoring/course-checks.js";
import {
  assertEditorialApproval,
  bundleDigest,
  loadCourseBundle,
  validateCourseBundle,
} from "../src/index.js";

const root = path.resolve(import.meta.dirname, "../../../content/linear-algebra-vectors-and-maps");
const bundle = await loadCourseBundle(path.join(root, "bundle.json"));
const audit = JSON.parse(
  await readFile(
    path.resolve(root, "../../docs/library-expansion/linear-algebra-numeric-audit.json"),
    "utf8",
  ),
) as {
  bundleSha256: string;
  passed: boolean;
  counts: { question: number; recall: number; course_check: number };
  results: Array<{ id: string; expected: number; independentValue: number; absoluteError: number }>;
};

describe("reviewed linear algebra curriculum", () => {
  it("publishes exactly the candidate covered by editorial review and the independent numerical audit", async () => {
    const review = JSON.parse(await readFile(path.join(root, "review/publication.json"), "utf8"));
    const validation = validateCourseBundle(bundle);
    expect(validation.passed).toBe(true);
    expect(validation.issues.every((issue) => issue.severity === "warning")).toBe(true);
    expect(() => assertEditorialApproval(bundle, review, validation)).not.toThrow();
    expect(audit.passed).toBe(true);
    expect(audit.bundleSha256).toBe(bundleDigest(bundle));
  });

  it("has independent NumPy results for every numerical lesson, recall and assessment key", () => {
    const numeric = [
      ...bundle.questions,
      ...bundle.flashcards,
      ...bundle.courseChecks!.flatMap((check) => check.items.map((item) => item.question)),
    ].filter((item) => item.answerAuthority?.kind === "numeric");
    expect(audit.counts).toEqual({ question: 95, recall: 40, course_check: 60 });
    expect(audit.results).toHaveLength(numeric.length);
    expect(new Set(audit.results.map((result) => result.id)).size).toBe(numeric.length);
    expect(audit.results.map((result) => result.id).sort()).toEqual(
      numeric.map((item) => item.id).sort(),
    );
    for (const item of numeric) {
      const authority = item.answerAuthority!;
      if (authority.kind !== "numeric") throw Error("Missing numeric authority");
      const result = audit.results.find((result) => result.id === item.id)!;
      expect(result.expected, item.id).toBe(authority.value);
      expect(Number.isFinite(result.independentValue), item.id).toBe(true);
      expect(Math.abs(result.independentValue - authority.value), item.id).toBeLessThanOrEqual(
        1e-9,
      );
    }
  });

  it("keeps all four question-led beats and their original authored questions and fresh recall", () => {
    expect(lessons).toHaveLength(20);
    expect(bundle.questions).toHaveLength(120);
    expect(bundle.flashcards).toHaveLength(40);
    for (const lesson of lessons) {
      expect(lesson.beats).toHaveLength(4);
      expect(lesson.questions).toHaveLength(6);
      expect(lesson.cards).toHaveLength(2);
      const published = bundle.lessons.find((item) => item.id === lesson.id)!;
      expect(published.steps.map((step) => step.diagram)).toEqual(
        lesson.beats.map((beat) => beat.diagram),
      );
      expect(published.steps.every((step) => step.checkQuestionId)).toBe(true);
      lesson.questions.forEach((question, index) =>
        expect(
          bundle.questions.find((item) => item.id === "lin-" + lesson.id + "-" + (index + 1)),
        ).toMatchObject(question),
      );
      lesson.cards.forEach((card, index) =>
        expect(
          bundle.flashcards.find((item) => item.id === "lin-" + lesson.id + "-card-" + (index + 1)),
        ).toMatchObject(card),
      );
    }
    expect(bundle.courseChecks).toEqual(checks);
  });

  it("provides bounded distinct given-data comparisons without answer keys or numerical probes", () => {
    for (const lesson of lessons)
      for (const beat of lesson.beats) {
        expect(LinearAlgebraDiagramSchema.safeParse(beat.diagram).success, lesson.id).toBe(true);
        const models = beat.diagram.cases.map((item) => JSON.stringify(item.model));
        expect(new Set(models).size, lesson.id).toBe(models.length);
        expect(JSON.stringify(beat.diagram)).not.toMatch(
          /answerAuthority|workedAnswer|acceptedIdeas|numericProbes|numeric-verification/,
        );
      }
    for (const check of checks)
      for (const item of check.items) {
        expect(item.visual.type).toBe("linear_algebra");
        if (item.visual.type === "linear_algebra")
          expect(LinearAlgebraModelSchema.safeParse(item.visual.model).success).toBe(true);
      }
  });

  it("does not repeat a complete lesson, recall or independent check problem", () => {
    const problems = [
      ...bundle.questions.map((question) => {
        const step = bundle.lessons
          .flatMap((lesson) => lesson.steps)
          .find((step) => step.checkQuestionId === question.id);
        const diagram = step?.diagram;
        const givens =
          diagram?.type === "linear_algebra_explorer"
            ? diagram.cases.find((item) => item.id === diagram.initialCaseId)!.model
            : null;
        return JSON.stringify([question.prompt, givens]);
      }),
      ...bundle.flashcards.map((card) => JSON.stringify([card.front, null])),
      ...checks.flatMap((check) =>
        check.items.map((item) =>
          JSON.stringify([
            item.question.prompt,
            item.visual.type === "linear_algebra" ? item.visual.model : null,
          ]),
        ),
      ),
    ];
    expect(new Set(problems).size).toBe(problems.length);
  });

  it("covers every lesson in each check and requires completion and a real delay", () => {
    expect(checks).toHaveLength(3);
    for (const check of checks)
      expect(check.items.map((item) => item.lessonId)).toEqual(lessons.map((lesson) => lesson.id));
    expect(checks[1]!.requiredLessonIds).toEqual(lessons.map((lesson) => lesson.id));
    expect(checks[2]!.afterCheckId).toBe(checks[1]!.id);
    expect(checks[2]!.delayDays).toBe(7);
  });
});
