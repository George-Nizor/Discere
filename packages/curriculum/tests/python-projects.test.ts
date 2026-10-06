import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadCourseBundle,
  loadPythonProjects,
  validatePythonProjects,
  assertPythonProjectReview,
} from "../src/index.js";
const directory = path.resolve(import.meta.dirname, "../../../content/python-for-data-analysis");
describe("reviewed Python construction projects", () => {
  it("covers every published lesson with independent changed-input cases", async () => {
    const bundle = await loadCourseBundle(path.join(directory, "bundle.json"));
    const projects = (await loadPythonProjects(directory, bundle))!;
    expect(projects.projects).toHaveLength(3);
    const tasks = projects.projects.flatMap((p) => p.tasks);
    expect(tasks).toHaveLength(22);
    expect(new Set(tasks.map((t) => t.lessonId))).toEqual(new Set(bundle.lessons.map((l) => l.id)));
    expect(tasks.reduce((n, t) => n + t.cases.length, 0)).toBe(66);
    expect(
      tasks.every((t) => new Set(t.cases.map((c) => JSON.stringify(c.inputs))).size === 3),
    ).toBe(true);
    expect(tasks.find((t) => t.id === "define-job-cost")?.call?.name).toBe("job_cost");
    expect(validatePythonProjects(projects, bundle).warnings).toEqual([]);
  });
  it("rejects content changed after its exact review", async () => {
    const bundle = await loadCourseBundle(path.join(directory, "bundle.json"));
    const collection = JSON.parse(
      await readFile(path.join(directory, "python-projects.json"), "utf8"),
    );
    const review = JSON.parse(
      await readFile(path.join(directory, "review/python-projects.json"), "utf8"),
    );
    collection.projects[0].tasks[0].prompt += " Changed.";
    expect(() => assertPythonProjectReview(collection, review, bundle)).toThrow(
      "changed after review",
    );
  });
  it("rejects wrong lesson references and repeated datasets", async () => {
    const bundle = await loadCourseBundle(path.join(directory, "bundle.json"));
    const collection = JSON.parse(
      await readFile(path.join(directory, "python-projects.json"), "utf8"),
    );
    collection.projects[0].tasks[0].sourceIds = ["unknown-primary-source"];
    expect(() => validatePythonProjects(collection, bundle)).toThrow("references");
    const repeated = JSON.parse(
      await readFile(path.join(directory, "python-projects.json"), "utf8"),
    );
    repeated.projects[0].tasks[0].cases[1] = structuredClone(
      repeated.projects[0].tasks[0].cases[0],
    );
    expect(() => validatePythonProjects(repeated, bundle)).toThrow("different input");
  });
});
