import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertNoContentLoss, contentLoss } from "../src/index.js";

/**
 * The SQL and Python exercises and the writing tasks live only in bundle.json. A prepare script
 * rebuilds a candidate from authoring files that do not have them, so it has to stop before the
 * candidate can replace the bundle.
 */
const published = JSON.parse(
  readFileSync(new URL("../../../content/sql-from-rows-to-reports/bundle.json", import.meta.url), "utf8"),
);

describe("a candidate that would drop published content", () => {
  it("is accepted when it keeps everything, even with additions", () => {
    const candidate = structuredClone(published);
    candidate.questions.push({ id: "a-new-question" });
    candidate.essays.push({ id: "a-new-task" });
    expect(contentLoss(published, candidate)).toEqual({ questions: [], steps: [], essays: [] });
    expect(() => assertNoContentLoss("sql-from-rows-to-reports", published, candidate)).not.toThrow();
  });

  it("is refused with the counts and the way to force it", () => {
    const candidate = structuredClone(published);
    const exercises = candidate.questions.filter((question: { responseType: string }) => question.responseType === "code");
    expect(exercises.length).toBeGreaterThan(0);
    candidate.questions = candidate.questions.filter((question: { responseType: string }) => question.responseType !== "code");
    candidate.lessons[0].steps.pop();
    const withTask = { ...published, essays: [{ id: "task-one" }] };
    expect(() => assertNoContentLoss("sql-from-rows-to-reports", withTask, candidate)).toThrow(
      new RegExp(
        `sql-from-rows-to-reports.*${exercises.length} question\\(s\\), 1 lesson step\\(s\\) and 1 writing task\\(s\\).*--force.*DISCERE_ALLOW_CONTENT_LOSS=1`,
        "u",
      ),
    );
  });

  it("is let through when forced, and still reports what goes", () => {
    const candidate = { ...published, questions: published.questions.slice(1) };
    const loss = assertNoContentLoss("sql-from-rows-to-reports", published, candidate, { force: true });
    expect(loss.questions).toEqual([published.questions[0].id]);
  });

  it("counts a step by its lesson, so the same step id in two lessons is two steps", () => {
    const before = { lessons: [{ id: "a", steps: [{ id: "intro" }] }, { id: "b", steps: [{ id: "intro" }] }] };
    const after = { lessons: [{ id: "a", steps: [{ id: "intro" }] }, { id: "b", steps: [] }] };
    expect(contentLoss(before, after).steps).toEqual(["b/intro"]);
  });
});
