import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  CourseBundleSchema,
  LinearAlgebraDiagramSchema,
  LinearAlgebraModelSchema,
} from "@discere/contracts";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../../../content/linear-algebra-vectors-and-maps");
const bundle = CourseBundleSchema.parse(
  JSON.parse(await readFile(path.join(root, "bundle.json"), "utf8")),
);
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
  it("agrees with the independent NumPy audit on every numerical key it still holds", () => {
    expect(audit.passed).toBe(true);
    const numeric = new Map(
      [
        ...bundle.questions,
        ...bundle.flashcards,
        ...bundle.courseChecks!.flatMap((check) => check.items.map((item) => item.question)),
      ].flatMap((item) =>
        item.answerAuthority?.kind === "numeric"
          ? [[item.id, item.answerAuthority.value] as const]
          : [],
      ),
    );
    // The audit covers the keys as first published. A key the course has rewritten since is
    // recomputed by linear-algebra-vectors-and-maps-v2.test.ts, so only the unchanged ones count.
    let compared = 0;
    for (const result of audit.results) {
      const key = numeric.get(result.id);
      if (key === undefined || key !== result.expected) continue;
      compared++;
      expect(Number.isFinite(result.independentValue), result.id).toBe(true);
      expect(Math.abs(result.independentValue - key), result.id).toBeLessThanOrEqual(1e-9);
    }
    expect(compared).toBeGreaterThan(100);
  });

  it("provides bounded distinct given-data comparisons without answer keys or numerical probes", () => {
    for (const lesson of bundle.lessons)
      for (const step of lesson.steps) {
        const diagram = step.diagram;
        if (!diagram || diagram.type !== "linear_algebra_explorer") continue;
        expect(LinearAlgebraDiagramSchema.safeParse(diagram).success, lesson.id).toBe(true);
        const models = diagram.cases.map((item) => JSON.stringify(item.model));
        expect(new Set(models).size, lesson.id).toBe(models.length);
        expect(JSON.stringify(diagram)).not.toMatch(
          /answerAuthority|workedAnswer|acceptedIdeas|numericProbes|numeric-verification/,
        );
      }
    for (const check of bundle.courseChecks!)
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
      ...bundle.courseChecks!.flatMap((check) =>
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

  it("covers every lesson in each check", () => {
    for (const check of bundle.courseChecks!)
      expect(check.items.map((item) => item.lessonId)).toEqual(
        bundle.lessons.map((lesson) => lesson.id),
      );
  });
});
