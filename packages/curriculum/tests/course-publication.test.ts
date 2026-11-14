import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertEditorialApproval, loadCourseBundle, validateCourseBundle } from "../src/index.js";

/**
 * What the courses first written in October 2026 must still be as published: reviewed against
 * their own bundle, drawn with the cover that was reviewed, and checked at the start, in the
 * middle and a week later. These were once asserted against the first-draft generator files, which
 * are gone; bundle.json is the only source now.
 */
const contentRoot = path.resolve(import.meta.dirname, "../../../content");
const courses = [
  "astronomy-sky-to-cosmos",
  "biology-cells-to-ecosystems",
  "calculus-change-and-accumulation",
  "chemistry-atoms-to-reactions",
  "economics-markets-and-strategy",
  "engineering-structures-and-machines",
  "english-reading-writing-and-rhetoric",
  "geometry-shape-and-space",
  "linear-algebra-vectors-and-maps",
  "philosophy-knowledge-mind-and-ethics",
  "physics-motion-and-forces",
  "probability-statistics",
  "psychology-how-minds-work",
];

describe.each(courses)("%s as published", (id) => {
  const root = path.join(contentRoot, id);

  it("matches the editorial review of the current bundle", async () => {
    const bundle = await loadCourseBundle(path.join(root, "bundle.json"));
    const review = JSON.parse(await readFile(path.join(root, "review/publication.json"), "utf8"));
    expect(() =>
      assertEditorialApproval(bundle, review, validateCourseBundle(bundle)),
    ).not.toThrow();
  });

  it("ships the cover that was reviewed", async () => {
    const provenance = JSON.parse(
      await readFile(path.join(root, "assets/provenance.json"), "utf8"),
    );
    const cover = await readFile(path.join(root, "assets/cover.svg"));
    expect(createHash("sha256").update(cover).digest("hex")).toBe(provenance.sha256);
  });

  it("starts with a check that needs no lesson, then a mixed check, then one a week later", async () => {
    const bundle = await loadCourseBundle(path.join(root, "bundle.json"));
    const checks = bundle.courseChecks ?? [];
    expect(checks).toHaveLength(3);
    expect(checks[0]!.requiredLessonIds).toEqual([]);
    expect(checks[1]!.requiredLessonIds).toEqual(bundle.lessons.map((lesson) => lesson.id));
    expect(checks[2]!.afterCheckId).toBe(checks[1]!.id);
    expect(checks[2]!.delayDays).toBe(7);
  });

  it("asks one fresh problem per lesson in each check, none repeated from teaching", async () => {
    const bundle = await loadCourseBundle(path.join(root, "bundle.json"));
    const lessonIds = bundle.lessons.map((lesson) => lesson.id).sort();
    const taught = new Set([
      ...bundle.questions.map((question) => question.prompt),
      ...bundle.flashcards.map((card) => card.front),
    ]);
    const asked = new Set<string>();
    for (const check of bundle.courseChecks ?? []) {
      expect(check.items.map((item) => item.lessonId).sort()).toEqual(lessonIds);
      for (const { question } of check.items) {
        expect(taught.has(question.prompt), question.id).toBe(false);
        // Linear algebra asks one prompt over different given data; its own test checks the pair.
        if (id !== "linear-algebra-vectors-and-maps")
          expect(asked.has(question.prompt), question.id).toBe(false);
        asked.add(question.prompt);
      }
    }
  });
});
