import { readFileSync } from "node:fs";
import type { CourseBundle } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * Writing Longer Pieces ends every lesson with a writing task. The tasks share one invented
 * case, Harwell School's later start, so the figures they quote are recomputed here and have to
 * agree from one task to the next.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/writing-longer-pieces/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
const words = (text: string): number => text.trim().split(/\s+/u).length;

describe("writing tasks in Writing Longer Pieces", () => {
  it("gives every lesson one task of its own with three to five criteria", () => {
    expect(bundle.essays).toHaveLength(bundle.lessons.length);
    const used = bundle.lessons.map((lesson) => lesson.essayId);
    expect(new Set(used).size).toBe(bundle.lessons.length);
    for (const lesson of bundle.lessons) {
      const task = bundle.essays.find((essay) => essay.id === lesson.essayId);
      expect(task, lesson.id).toBeDefined();
      expect(task!.conceptIds).toEqual(lesson.conceptIds);
      expect(task!.successCriteria.length).toBeGreaterThanOrEqual(3);
      expect(task!.successCriteria.length).toBeLessThanOrEqual(5);
      expect(task!.expectedScope).toMatch(/Allow about \d+ minutes\./u);
      expect(task!.minWords).toBeGreaterThan(0);
    }
  });

  it("validates with the tasks in place", () => {
    const errors = validateCourseBundle(bundle).issues.filter((issue) => issue.severity === "error");
    expect(errors).toEqual([]);
  });

  it("keeps the prose free of dashes and dollar signs", () => {
    for (const task of bundle.essays) {
      const text = [task.title, task.prompt, task.expectedScope, ...task.successCriteria].join(" ");
      expect(text, task.id).not.toMatch(/[—–$]/u);
    }
  });

  it("quotes figures that agree with the trial's counts", () => {
    // 126 of 180 pupils, 54 of 180 families, late arrivals 45 to 27, sleep 7 h 10 to 7 h 50.
    expect((126 / 180) * 100).toBe(70);
    expect((54 / 180) * 100).toBe(30);
    expect(((45 - 27) / 45) * 100).toBe(40);
    expect(7 * 60 + 50 - (7 * 60 + 10)).toBe(40);
    const all = bundle.essays.map((task) => task.prompt).join(" ");
    expect(all).toContain("126 said");
    expect(all).toContain("70% of pupils");
    expect(all).toContain("54 said");
    expect(all).toContain("30% of families");
    expect(all).toContain("a fall of 40%");
  });

  it("asks for a cut of a third from a paragraph of the stated length", () => {
    const task = bundle.essays.find((essay) => essay.id === "wrilp-task-cut")!;
    const paragraph = task.prompt.split("invented draft of the Harwell essay. ")[1]!;
    const stated = Number(/It has (\d+) words now/u.exec(task.prompt)![1]);
    const target = Number(/in (\d+) words or fewer/u.exec(task.prompt)![1]);
    expect(words(paragraph)).toBe(stated);
    expect(target).toBe(Math.floor((stated * 2) / 3));
    expect(task.successCriteria[0]).toBe(`Is ${target} words or fewer.`);
  });
});
