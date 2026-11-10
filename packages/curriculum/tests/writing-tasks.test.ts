import { readFileSync } from "node:fs";
import type { CourseBundle } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * Courses whose every lesson ends with an optional writing task. Each course runs one case
 * through its tasks, so the figures a task quotes are recomputed below and have to agree with
 * the material the task supplies.
 */
const COURSES = ["technical-writing"] as const;

const load = (courseId: string): CourseBundle =>
  JSON.parse(
    readFileSync(new URL(`../../../content/${courseId}/bundle.json`, import.meta.url), "utf8"),
  ) as CourseBundle;
const words = (text: string): number => text.trim().split(/\s+/u).length;
const task = (bundle: CourseBundle, id: string) => {
  const found = bundle.essays.find((essay) => essay.id === id);
  if (!found) throw new Error(`No writing task ${id}`);
  return found;
};
const paragraphs = (prompt: string): string[] => prompt.split("\n\n");

describe.each(COURSES)("writing tasks in %s", (courseId) => {
  const bundle = load(courseId);

  it("gives every lesson one task of its own with three to five criteria", () => {
    expect(bundle.essays).toHaveLength(bundle.lessons.length);
    expect(new Set(bundle.lessons.map((lesson) => lesson.essayId)).size).toBe(bundle.lessons.length);
    for (const lesson of bundle.lessons) {
      const found = task(bundle, lesson.essayId ?? "");
      expect(found.conceptIds, lesson.id).toEqual(lesson.conceptIds);
      expect(found.successCriteria.length, lesson.id).toBeGreaterThanOrEqual(3);
      expect(found.successCriteria.length, lesson.id).toBeLessThanOrEqual(5);
      const minutes = Number(/Allow about (\d+) minutes\.$/u.exec(found.expectedScope)?.[1]);
      expect(minutes, lesson.id).toBeGreaterThanOrEqual(5);
      expect(minutes, lesson.id).toBeLessThanOrEqual(15);
      expect(found.minWords, lesson.id).toBeGreaterThan(0);
      // The first paragraph is the task and the rest is the material it supplies.
      expect(paragraphs(found.prompt).length, lesson.id).toBeGreaterThan(1);
    }
  });

  it("validates with the tasks in place", () => {
    const errors = validateCourseBundle(bundle).issues.filter((issue) => issue.severity === "error");
    expect(errors).toEqual([]);
  });

  it("keeps the prose free of dashes and dollar signs, with titles in sentence case", () => {
    for (const found of bundle.essays) {
      const text = [found.title, found.prompt, found.expectedScope, ...found.successCriteria].join(" ");
      expect(text, found.id).not.toMatch(/[—–$]/u);
      expect(found.title, found.id).not.toMatch(/[.:!?]$/u);
      expect((found.prompt.match(/`/gu) ?? []).length % 2, found.id).toBe(0);
    }
  });

  it("mentions the course's writing tasks in its length line", () => {
    expect(bundle.course.introduction?.length).toMatch(/optional writing task of 5 to 15 minutes/u);
  });
});

describe("the figures in Technical Writing's tasks", () => {
  const bundle = load("technical-writing");

  it("asks for a cut of a third from a paragraph of the stated length", () => {
    const found = task(bundle, "tecw-task-cut");
    const stated = Number(/It has (\d+) words now/u.exec(found.prompt)?.[1]);
    const target = Number(/needs (\d+) or fewer/u.exec(found.prompt)?.[1]);
    expect(words(paragraphs(found.prompt)[2] ?? "")).toBe(stated);
    expect(target).toBe(Math.floor((stated * 2) / 3));
    expect(found.successCriteria[0]).toBe(`The revised paragraph is ${target} words or fewer.`);
    expect(found.expectedScope).toContain(`${target} words or fewer`);
  });

  it("keeps the incident's times and the sample's rows consistent", () => {
    const incident = task(bundle, "tecw-task-incident").prompt;
    expect(incident).toContain("22:10");
    expect(incident).toContain("23:00");
    expect(incident).toContain("a stop of 50 minutes");
    expect(23 * 60 - (22 * 60 + 10)).toBe(50);
    // With a tolerance of 2 only one of the three differences (2, 1 and 24) is still listed.
    const sample = task(bundle, "tecw-task-sample").prompt;
    const rows = [...sample.matchAll(/counted (\d+), expected (\d+)/gu)].map(
      (row) => Number(row[2]) - Number(row[1]),
    );
    expect(rows).toEqual([2, 1, 24]);
    expect(rows.filter((difference) => difference > 2)).toHaveLength(1);
  });

  it("reports a test whose counts add up to its ten readers", () => {
    const report = task(bundle, "tecw-task-test-report").prompt;
    expect(report).toContain("Ten shift supervisors");
    expect(report).toContain("Six finished. Three stopped at step 3 and one stopped at step 6.");
    expect(6 + 3 + 1).toBe(10);
  });
});
