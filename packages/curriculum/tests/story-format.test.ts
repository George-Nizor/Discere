import { readFileSync } from "node:fs";
import type { CourseBundle, LessonBeat, LessonStep } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { EXPLAIN_BODY_WORD_LIMIT, EXPLAIN_RUN_LIMIT, validateCourseBundle } from "../src/index.js";

/**
 * The story format: a screen that only teaches. These tests start from a real v2 lesson and
 * change one thing at a time, so each rule is shown to fire on its own.
 */
const source = JSON.parse(
  readFileSync(new URL("../../../content/maths-foundations/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;

const paragraph = (words: number) => [
  { kind: "paragraph" as const, text: Array.from({ length: words }, () => "word").join(" ") },
];

function withLesson(edit: (lesson: LessonBeat) => void): CourseBundle {
  const bundle = structuredClone(source);
  edit(bundle.lessons.find((item) => item.id === "what-a-letter-stands-for")!);
  return bundle;
}
const codes = (bundle: CourseBundle) =>
  validateCourseBundle(bundle).issues.map((issue) => issue.code);
const teaching = (id: string, lead: number, after = 0): LessonStep => ({
  id,
  kind: "explain",
  blocks: [],
  headline: "A headline",
  lead: paragraph(lead),
  ...(after ? { afterFigure: paragraph(after) } : {}),
  visualStateId: "",
  checkQuestionId: "",
  activityId: "",
});

describe("teaching-only explain screens", () => {
  it("accepts a screen with no check question and a long lead", () => {
    const bundle = withLesson((lesson) => {
      lesson.steps[0] = teaching("story", 150, 60);
    });
    const found = validateCourseBundle(bundle).issues.filter((issue) =>
      lesson(bundle).steps[0] ? issue.path.includes("steps.story") : false,
    );
    expect(found.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("rejects a screen that runs past the word limit", () => {
    const bundle = withLesson((lesson) => {
      lesson.steps[0] = teaching("story", EXPLAIN_BODY_WORD_LIMIT, 20);
    });
    expect(codes(bundle)).toContain("EXPLAIN_TOO_LONG");
  });

  it("warns when a teaching screen is too thin to tell the idea", () => {
    const bundle = withLesson((lesson) => {
      lesson.steps[0] = teaching("story", 30);
    });
    const issue = validateCourseBundle(bundle).issues.find(
      (item) => item.code === "EXPLAIN_TOO_THIN",
    );
    expect(issue?.severity).toBe("warning");
  });

  it("warns after too many teaching screens in a row", () => {
    const bundle = withLesson((lesson) => {
      const run = Array.from({ length: EXPLAIN_RUN_LIMIT + 1 }, (_, index) =>
        teaching(`story-${index}`, 120),
      );
      lesson.steps.splice(0, 1, ...run);
    });
    expect(codes(bundle)).toContain("EXPLAIN_RUN_TOO_LONG");
  });

  it("keeps the 60-word lead limit on a step that asks something", () => {
    const bundle = withLesson((lesson) => {
      const asking = lesson.steps.find((step) => step.checkQuestionId)!;
      asking.lead = paragraph(120);
    });
    expect(codes(bundle)).toContain("LEAD_TOO_LONG");
  });

  it("allows afterFigure only on a teaching screen", () => {
    const bundle = withLesson((lesson) => {
      const asking = lesson.steps.find((step) => step.checkQuestionId)!;
      asking.afterFigure = paragraph(40);
    });
    expect(codes(bundle)).toContain("AFTER_FIGURE_MISPLACED");
  });

  it("still requires a response on a step that is not an explain step", () => {
    const bundle = withLesson((lesson) => {
      const asking = lesson.steps.find((step) => step.kind === "try")!;
      asking.checkQuestionId = "";
    });
    expect(codes(bundle)).toContain("STEP_WITHOUT_RESPONSE");
  });
});

function lesson(bundle: CourseBundle): LessonBeat {
  return bundle.lessons.find((item) => item.id === "what-a-letter-stands-for")!;
}
