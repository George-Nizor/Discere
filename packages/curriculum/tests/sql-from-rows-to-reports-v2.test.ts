import { readFileSync } from "node:fs";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * SQL: from rows to reports, v2 rewrite. Every numeric key the rewrite added is recomputed here
 * from the small data set its question describes, not read back from the authority.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/sql-from-rows-to-reports/.authoring/candidate.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const lessonOf = (id: string) => bundle.lessons.find((item) => item.id === id)!;
const question = (id: string): Question => bundle.questions.find((item) => item.id === id)!;
const keyOf = (id: string) => {
  const authority = question(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const hook = (lesson: string) => keyOf(lessonOf(lesson).intro!.hook.questionId!);
const check = (lesson: string) => keyOf(lessonOf(lesson).steps[0]!.checkQuestionId);
const skill = (lesson: string) => keyOf(lessonOf(lesson).questionIds[2]!);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const mean = (values: number[]) => sum(values) / values.length;
const distinct = <T>(values: T[]) => new Set(values.map((value) => JSON.stringify(value))).size;

describe("SQL from rows to reports (v2)", () => {
  it("validates with fifteen v2 lessons of three skill-check items each", () => {
    const issues = validateCourseBundle(bundle).issues.filter((issue) => issue.severity === "error");
    expect(issues).toEqual([]);
    expect(bundle.lessons).toHaveLength(15);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro).toBeDefined();
      expect(lesson.questionIds).toHaveLength(3);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
    }
  });

  it("recomputes the numeric keys of the hooks", () => {
    expect(hook("rows-and-keys")).toBe(3 + 2); // one line per cup
    expect(hook("select-and-name")).toBe(6); // hiding columns deletes none
    expect(hook("filter-the-rows")).toBe([5, 12, 20, 25, 30].filter((p) => p >= 20).length);
    expect([...[31, 28, 35, 30, 29]].sort((a, b) => a - b)[2]).toBe(hook("sort-and-limit"));
    expect(hook("distinct-results")).toBe(
      distinct(["bun", "loaf", "bun", "roll", "bun", "bagel", "loaf"]),
    );
    expect(hook("aggregate-known-values")).toBe(mean([4, 6, 8]));
    const slips: Array<[string, number]> = [["tea", 2], ["coffee", 3], ["tea", 4], ["coffee", 1], ["tea", 1]];
    expect(hook("group-and-filter-groups")).toBe(sum(slips.filter(([d]) => d === "tea").map(([, v]) => v)));
    const clubs = { Ann: 1, Bo: 2, Cy: 1, Di: 3 };
    expect(hook("join-matching-rows")).toBe(Object.values(clubs).filter((c) => c === 1).length);
    expect(hook("preserve-the-left-table")).toBe(2 + 1 + Math.max(1, 0)); // Ann 2, Bo 1, Cy none
    expect(hook("preserve-either-side")).toBe(distinct(["Ana", "Ben", "Cy", "Ben", "Cy", "Dot"]));
    const scores = [10, 50, 60, 70, 80, 90];
    expect(hook("ask-a-query-inside-a-query")).toBe(scores.filter((s) => s > mean(scores)).length);
    expect(hook("combine-result-sets")).toBe(
      distinct(["Ann", "Bo", "Cy", "Di", "Cy", "Di", "Ed", "Flo"]),
    );
    const times = [10, 10, 12, 14];
    expect(hook("rank-with-ties")).toBe(1 + times.filter((t) => t < 14).length);
    expect(hook("partition-the-window")).toBe(6 + 8);
    expect(hook("running-totals-and-neighbours")).toBe(sum([30, 10, 50]));
  });

  it("recomputes the numeric keys of the explain checks", () => {
    expect(check("join-matching-rows")).toBe([1, 2, 3].filter((id) => id === 2).length);
    expect(check("combine-result-sets")).toBe(distinct([1, 2, 2, 3]));
    expect(check("rank-with-ties")).toBe(Math.max(30, 10, 20));
    expect(check("partition-the-window")).toBe(["X", "X", "Y", "Y", "Y"].filter((g) => g === "Y").length);
    expect(check("running-totals-and-neighbours")).toBe(4 + 6);
  });

  it("recomputes the numeric keys of the third skill-check items", () => {
    expect(skill("rows-and-keys")).toBe([20, 30, null, 10].filter((v) => v !== null).length);
    expect(skill("select-and-name")).toBe(12 - 5);
    expect(skill("filter-the-rows")).toBe([10, 20, 30, null, 40].filter((v) => v !== null && v >= 20 && v <= 40).length);
    expect(skill("sort-and-limit")).toBe(sum([50, 70, 70, 90].sort((a, b) => a - b).slice(0, 2)));
    expect(skill("distinct-results")).toBe(
      distinct([["A", "x"], ["A", "y"], ["B", "x"], ["B", "y"], ["A", "x"]]),
    );
    expect(skill("aggregate-known-values")).toBe([5, null, 7, 8].filter((v) => v !== null).length);
    const rows: Array<[string, string, number]> = [["tea", "paid", 3], ["tea", "pending", 5], ["coffee", "paid", 4]];
    expect(skill("group-and-filter-groups")).toBe(
      sum(rows.filter(([item, status]) => item === "tea" && status === "paid").map(([, , v]) => v)),
    );
    expect(skill("join-matching-rows")).toBe([3, 1, 0].filter((n) => n > 0).length);
    expect(skill("preserve-the-left-table")).toBe([4, 0, 0].reduce((t, n) => t + Math.max(n, 1), 0));
    const a = [1, 2, 3];
    const b = [2, 4, 5];
    expect(skill("preserve-either-side")).toBe(b.length); // RIGHT JOIN keeps every row of b
    expect(a.filter((x) => b.includes(x)).length).toBe(1);
    expect(skill("ask-a-query-inside-a-query")).toBe([0, 2, 0, 0, 5].filter((n) => n === 0).length);
    expect(skill("combine-result-sets")).toBe(
      distinct([[1, "x"], [2, "x"], [1, "y"], [2, "x"]]),
    );
    expect(skill("rank-with-ties")).toBe(1 + new Set([90, 90, 70, 50].filter((v) => v > 70)).size);
    expect(skill("partition-the-window")).toBe(sum([10, 30]));
    expect(skill("running-totals-and-neighbours")).toBe([7, 9, 12][1]);
  });

  it("gives every misconception a wrong value, never the key", () => {
    for (const item of bundle.questions) {
      if (item.answerAuthority.kind !== "numeric") continue;
      for (const misconception of item.misconceptions ?? [])
        expect(misconception.match.numeric ?? []).not.toContain(item.answerAuthority.value);
    }
  });
});
