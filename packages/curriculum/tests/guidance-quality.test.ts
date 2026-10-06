import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CourseBundleSchema } from "@discere/contracts";
import { bundleDigest, assertEditorialApproval, validateCourseBundle } from "../src/index.js";
import { restorePreGuidanceBundle } from "./helpers/guidance-history.js";
import { historicalBundle } from "./helpers/published-history.js";
const read = (p: string) =>
  JSON.parse(readFileSync(new URL("../../../" + p, import.meta.url), "utf8"));
const baseline = read("docs/quality-pass/content-baseline.json") as {
  courses: { name: string; sha256: string }[];
};
describe("current-library quality release", () => {
  for (const entry of baseline.courses)
    it(entry.name + " preserves content outside reviewed guidance deltas", () => {
      const current = CourseBundleSchema.parse(read("content/" + entry.name + "/bundle.json"));
      // History is checked on the bundle that release published; approval on the current one.
      const bundle = CourseBundleSchema.parse(historicalBundle(entry.name));
      if (bundle.course.catalogueVisibility === "archived") {
        const raw = readFileSync(
          new URL("../../../content/" + entry.name + "/bundle.json", import.meta.url),
        );
        expect(createHash("sha256").update(raw).digest("hex")).toBe(entry.sha256);
      } else expect(bundleDigest(restorePreGuidanceBundle(entry.name, bundle))).toBe(entry.sha256);
      if (bundle.course.catalogueVisibility !== "archived") {
        expect(() =>
          assertEditorialApproval(
            current,
            read("content/" + entry.name + "/review/publication.json"),
            validateCourseBundle(current),
          ),
        ).not.toThrow();
        for (const question of current.questions) {
          // A v2 skill-check choice has no hints: it is retrieval, and the player offers none.
          if (!question.skill) expect(question.hints.length, question.id).toBeGreaterThan(0);
          const feedback =
            question.answerAuthority.kind === "numeric"
              ? question.answerAuthority.workedAnswer
              : question.answerAuthority.kind === "text"
                ? question.answerAuthority.exampleAnswer
                : "";
          if (
            question.answerAuthority.kind === "numeric" ||
            question.answerAuthority.kind === "text"
          )
            expect(feedback?.trim().length, question.id).toBeGreaterThan(0);
        }
      }
    });
  it("publishes every approved prompt correction and subject-specific hint", () => {
    const guidance = read("docs/quality-pass/foundation-guidance.json");
    const all = baseline.courses.flatMap(
      (e) => CourseBundleSchema.parse(historicalBundle(e.name)).questions,
    );
    for (const [id, prompt] of Object.entries(guidance.prompts))
      expect(all.find((q) => q.id === id)?.prompt).toBe(prompt);
    for (const [id, explanation] of Object.entries(guidance.explanations)) {
      const a = all.find((q) => q.id === id)!.answerAuthority;
      expect(a.kind).toBe("text");
      if (a.kind === "text") expect(a.exampleAnswer).toBe(explanation);
    }
    for (const [id, group] of Object.entries({
      "maths-foundations": guidance.maths,
      "logic-and-reasoning": guidance.logic,
      "cs-basics": guidance.cs,
    })) {
      const b = CourseBundleSchema.parse(historicalBundle(id));
      for (const lesson of b.lessons) {
        const questions = [...lesson.steps.map((s) => s.checkQuestionId), ...lesson.questionIds];
        expect(questions.map((id) => b.questions.find((q) => q.id === id)!.hints)).toEqual(
          (group as Record<string, string[][]>)[lesson.id],
        );
      }
    }
  });
});
