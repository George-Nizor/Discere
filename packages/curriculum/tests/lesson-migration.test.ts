import { readFileSync } from "node:fs";
import type { CourseBundle } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import {
  applyDrafts,
  remainingTodos,
  scaffoldLesson,
} from "../../../scripts/lesson-migration/scaffold.js";
import { validateCourseBundle } from "../src/index.js";

const physics = JSON.parse(
  readFileSync(
    new URL("../../../content/physics-motion-and-forces/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;

describe("lesson migration scaffold", () => {
  const draft = scaffoldLesson(physics, physics.lessons[0]!);
  it("maps legacy kinds and drops heading blocks", () => {
    expect(draft.lesson.steps.map((step) => step.kind)).toEqual([
      "predict",
      "worked_example",
      "try",
      "transfer",
    ]);
    expect(draft.lesson.steps.every((step) => step.blocks.length === 0)).toBe(true);
  });
  it("keeps every authored sentence, split into lead and reveal", () => {
    for (const [index, step] of draft.lesson.steps.entries()) {
      const before = physics.lessons[0]!.steps[index]!.blocks.filter(
        (block) => block.kind === "paragraph",
      );
      const after = [...(step.lead ?? []), ...(step.reveal ?? [])];
      const words = (blocks: ReadonlyArray<{ kind: string; text?: string }>) =>
        blocks
          .map((block) => ("text" in block ? block.text : ""))
          .join(" ")
          .split(/\s+/u)
          .sort();
      expect(words(after)).toEqual(words(before));
    }
  });
  it("hides graded figures until the response and lists the writing still to do", () => {
    expect(
      draft.lesson.steps.filter((step) => step.diagram).every((step) => step.answerVisibility),
    ).toBe(true);
    expect(draft.lesson.calculator).toBe("available");
    expect(draft.migrationNotes.some((note) => note.includes("skill check"))).toBe(true);
    expect(remainingTodos(draft).length).toBeGreaterThan(5);
  });
  it("refuses to validate a draft that still holds TODO text, and keeps question ids", () => {
    const merged = applyDrafts(physics, [draft]);
    expect(merged.questions.map((q) => q.id).sort()).toEqual(
      physics.questions.map((q) => q.id).sort(),
    );
    const validation = validateCourseBundle(merged);
    expect(validation.passed).toBe(false);
    expect(validation.issues.some((issue) => issue.code === "SKILL_CHECK_SIZE")).toBe(true);
  });
});
