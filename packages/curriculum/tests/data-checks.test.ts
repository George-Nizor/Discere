import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CourseBundleSchema } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { bundleDigest, validateCourseBundle } from "../src/index.js";
import { restorePreGuidanceBundle } from "./helpers/guidance-history.js";
import { historicalBundle } from "./helpers/published-history.js";

const read = (id: string, file = "bundle.json") =>
  JSON.parse(readFileSync(new URL("../../../content/" + id + "/" + file, import.meta.url), "utf8"));
describe("SQL and Python independent assessments", () => {
  for (const id of ["sql-from-rows-to-reports", "python-for-data-analysis"]) {
    it(id + " covers the taught scope with fresh source-grounded problems", () => {
      const bundle = CourseBundleSchema.parse(read(id));
      const sets = bundle.courseChecks!;
      expect(validateCourseBundle(bundle).passed).toBe(true);
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
      // Preservation is checked on the bundle that release published (archived once a course is
      // rewritten to v2); the publication binding and checks on the current one.
      const bundle = CourseBundleSchema.parse(read(id)),
        released = CourseBundleSchema.parse(historicalBundle(id)),
        preserved = structuredClone(restorePreGuidanceBundle(id, released)) as {
          course: { version?: string };
          courseChecks?: unknown;
        };
      delete preserved.course.version;
      delete preserved.courseChecks;
      const evidence = read(id, "review/check-extension.json");
      expect(createHash("sha256").update(JSON.stringify(preserved)).digest("hex")).toBe(
        evidence.preservedContentSha256,
      );
      expect(read(id, "review/publication.json").bundleSha256).toBe(bundleDigest(bundle));
      expect(evidence.publishedBundleSha256).toBe(
        bundleDigest(restorePreGuidanceBundle(id, released)),
      );
    });
  }
  it("binds the Python keys and displayed code to the 63 independently executed probes", () => {
    const bytes = readFileSync(
      new URL(
        "../../../content/python-for-data-analysis/review/check-probes.json",
        import.meta.url,
      ),
    );
    const { probes } = JSON.parse(bytes.toString("utf8")) as {
      probes: Record<string, { code: string; expected: unknown }>;
    };
    const evidence = read("python-for-data-analysis", "review/check-executions.json");
    expect(evidence.manifestSha256).toBe(createHash("sha256").update(bytes).digest("hex"));
    expect(evidence.verifiedProbes).toBe(63);
    expect(Object.keys(probes)).toHaveLength(63);
    expect(evidence.runtime).toEqual({ python: "3.12.14", numpy: "2.3.5", pandas: "3.0.1" });
    const items = new Map(
      CourseBundleSchema.parse(read("python-for-data-analysis"))
        .courseChecks!.flatMap((check) => check.items)
        .map((item) => [item.question.id, item] as const),
    );
    for (const [id, probe] of Object.entries(probes)) {
      const item = items.get(id)!;
      expect(item, id).toBeDefined();
      // The displayed program is the probe's program, which then assigns the checked expression.
      expect(item.visual.type, id).toBe("program");
      if (item.visual.type === "program")
        expect(probe.code.startsWith(item.visual.code + "\nanswer = "), id).toBe(true);
      // A numeric key is the value the probe computed. A choice names an outcome in words, so
      // it is not compared with the probe's raw value here.
      const a = item.question.answerAuthority;
      if (a.kind === "numeric") expect(a.value, id).toBe(probe.expected);
    }
  });
  it("uses the exclusive random interval rather than inferring a bound from sampled extrema", () => {
    const item = CourseBundleSchema.parse(read("python-for-data-analysis"))
      .courseChecks!.flatMap((check) => check.items)
      .find((entry) => entry.question.id === "python-for-data-analysis-check-transfer-11")!;
    expect(item.visual.type === "program" && item.visual.code).toContain("integers(2, 8, size=5)");
    const possible = Array.from({ length: 6 }, (_, i) => i + 2);
    const authority = item.question.answerAuthority;
    if (authority.kind !== "text") throw new Error("Expected a choice");
    expect(
      item.question.choices!.filter((c) => !possible.includes(Number(c.label))).map((c) => c.label),
    ).toEqual(authority.acceptedIdeas);
  });
});
