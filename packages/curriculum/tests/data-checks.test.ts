import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { CourseBundleSchema } from "@discere/contracts";
import { bundleDigest, validateCourseBundle } from "../src/index.js";
import { sqlCourseChecks } from "../../../content/sql-from-rows-to-reports/authoring/course-checks.js";
import {
  pythonCourseChecks,
  pythonCheckSpecs,
} from "../../../content/python-for-data-analysis/authoring/course-checks.js";
import { restorePreGuidanceBundle } from "./helpers/guidance-history.js";
const read = (id: string, file = "bundle.json") =>
  JSON.parse(readFileSync(new URL("../../../content/" + id + "/" + file, import.meta.url), "utf8"));
describe("SQL and Python independent assessments", () => {
  for (const [id, sets] of Object.entries({
    "sql-from-rows-to-reports": sqlCourseChecks,
    "python-for-data-analysis": pythonCourseChecks,
  })) {
    it(id + " covers the taught scope with fresh source-grounded problems", () => {
      const bundle = CourseBundleSchema.parse(read(id));
      expect(validateCourseBundle({ ...bundle, courseChecks: sets }).passed).toBe(true);
      const ids = bundle.lessons.map((l) => l.id),
        prompts = new Set<string>();
      for (const check of sets) {
        expect(check.items.map((i) => i.lessonId)).toEqual(ids);
        expect(check.requiredLessonIds).toEqual(check.kind === "placement" ? [] : ids);
        for (const item of check.items) {
          const lesson = bundle.lessons.find((l) => l.id === item.lessonId)!;
          expect(item.question.conceptIds).toEqual(lesson.conceptIds);
          expect(item.question.sourceIds).toEqual(lesson.sourceIds);
          expect(bundle.questions.some((q) => q.prompt === item.question.prompt)).toBe(false);
          expect(prompts.has(item.question.prompt)).toBe(false);
          prompts.add(item.question.prompt);
        }
      }
      expect(sets[2]!.afterCheckId).toBe(sets[1]!.id);
      expect(sets[2]!.delayDays).toBe(7);
    });
    it(id + " preserves original teaching content and exact publication review", () => {
      const bundle = CourseBundleSchema.parse(read(id)),
        preserved = structuredClone(restorePreGuidanceBundle(id, bundle)) as {
          course: { version?: string };
          courseChecks?: unknown;
        };
      delete preserved.course.version;
      delete preserved.courseChecks;
      const evidence = read(id, "review/check-extension.json");
      expect(createHash("sha256").update(JSON.stringify(preserved)).digest("hex")).toBe(
        evidence.preservedContentSha256,
      );
      expect(bundle.courseChecks).toEqual(sets);
      expect(read(id, "review/publication.json").bundleSha256).toBe(bundleDigest(bundle));
      expect(evidence.publishedBundleSha256).toBe(
        bundleDigest(restorePreGuidanceBundle(id, bundle)),
      );
    });
  }
  it("binds all Python keys and displayed code to the 63 independently executed probes", () => {
    const manifest = {
      probes: Object.fromEntries(
        pythonCheckSpecs.flatMap((set, si) =>
          set.map((s, qi) => [
            pythonCourseChecks[si]!.items[qi]!.question.id,
            { code: s.code + "\nanswer = " + s.expression, expected: s.value },
          ]),
        ),
      ),
      examples: {},
    };
    const evidence = read("python-for-data-analysis", "review/check-executions.json");
    expect(evidence.manifestSha256).toBe(
      createHash("sha256")
        .update(JSON.stringify(manifest, null, 2) + "\n")
        .digest("hex"),
    );
    expect(evidence.verifiedProbes).toBe(63);
    expect(evidence.runtime).toEqual({ python: "3.12.14", numpy: "2.3.5", pandas: "3.0.1" });
    for (const [si, set] of pythonCheckSpecs.entries())
      for (const [qi, s] of set.entries()) {
        const item = pythonCourseChecks[si]!.items[qi]!;
        expect(item.visual).toEqual({ type: "program", language: "python", code: s.code });
        const a = item.question.answerAuthority;
        if (a.kind === "numeric") expect(a.value).toBe(s.value);
        else expect(a.acceptedIdeas).toEqual([s.choices![s.correct!]!]);
      }
  });
  it("uses the exclusive random interval rather than inferring a bound from sampled extrema", () => {
    const s = pythonCheckSpecs[2]![10]!;
    expect(s.code).toContain("integers(2, 8, size=5)");
    const possible = Array.from({ length: 6 }, (_, i) => i + 2);
    expect(s.choices!.filter((c) => !possible.includes(Number(c)))).toEqual([
      s.choices![s.correct!]!,
    ]);
  });
});
