import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CourseBundleSchema, SqlProjectCollectionSchema } from "@discere/contracts";
import { assertSqlProjectReview, validateSqlProjects } from "../src/sql-projects.js";
const base = new URL("../../../content/sql-from-rows-to-reports/", import.meta.url);
const read = (name: string) => JSON.parse(readFileSync(new URL(name, base), "utf8"));
const bundle = CourseBundleSchema.parse(read("bundle.json"));
const projects = read("projects.json"),
  review = read("review/projects.json");
describe("reviewed construction projects", () => {
  it("covers every SQL lesson with original tasks and three different checked datasets", () => {
    const result = assertSqlProjectReview(projects, review, bundle);
    expect(result.projects).toHaveLength(3);
    const tasks = result.projects.flatMap((p) => p.tasks);
    expect(tasks.map((t) => t.lessonId).sort()).toEqual(bundle.lessons.map((l) => l.id).sort());
    expect(tasks.reduce((n, t) => n + t.cases.length, 0)).toBe(45);
    expect(tasks.every((t) => !bundle.questions.some((q) => q.prompt === t.prompt))).toBe(true);
  });
  it("refuses changed content, missing citations, fake cases and unchecked prose", () => {
    const copy = () => structuredClone(projects);
    const altered = copy();
    altered.projects[0].tasks[0].prompt += " Changed.";
    expect(() => assertSqlProjectReview(altered, review, bundle)).toThrow("changed after review");
    const citations = copy();
    citations.projects[0].tasks[0].sourceIds = ["missing-source"];
    expect(() => validateSqlProjects(citations, bundle)).toThrow("source references");
    const repeated = copy();
    repeated.projects[0].tasks[0].cases[1] = repeated.projects[0].tasks[0].cases[0];
    expect(() => validateSqlProjects(repeated, bundle)).toThrow("different input data");
    const prose = copy();
    prose.projects[0].tasks[0].prompt = "TODO placeholder";
    expect(() => validateSqlProjects(prose, bundle)).toThrow("writing");
  });
  it("rejects malformed, mismatched and type-confused input tables", () => {
    const bad = structuredClone(projects);
    bad.projects[0].tasks[0].tables[0].rows[0][0] = "twelve";
    expect(SqlProjectCollectionSchema.safeParse(bad).success).toBe(false);
  });
});
