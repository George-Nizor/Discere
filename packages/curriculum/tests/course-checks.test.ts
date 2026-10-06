import { readFileSync } from "node:fs";
import { CourseBundleSchema, CourseCheckDefinitionSchema } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { mathsCourseChecks } from "../../../content/maths-foundations/authoring/course-checks.js";
import { validateCourseBundle } from "../src/validate.js";
const base = JSON.parse(
  readFileSync(new URL("../../../content/maths-foundations/bundle.json", import.meta.url), "utf8"),
);
describe("Maths course checks", () => {
  it("covers every course lesson with three distinct sourced problem sets", () => {
    const bundle = CourseBundleSchema.parse({ ...base, courseChecks: mathsCourseChecks });
    expect(validateCourseBundle(bundle).passed).toBe(true);
    expect(mathsCourseChecks.map((c) => c.items.length)).toEqual([6, 8, 6]);
    expect(
      new Set(mathsCourseChecks.flatMap((c) => c.items.map((i) => i.question.prompt))).size,
    ).toBe(20);
  });
  const values = [
    2 * -3 + 7,
    (17 + 3) / 4,
    -4,
    (7 - -1) / (2 - -2),
    -2 * 0 + 6,
    (-3 - 5) / (1 - -3),
    2 * 8 - 5,
    (-11 - 4) / 5,
    4 - 5,
    3 * -2 - 2,
    (10 - 4) / (3 - 1),
    9 + 4 * 3,
    (24 - 6) / 3,
    3 - 5,
    (16 - 28) / (6 - 2),
    19 - 4 * 3,
  ];
  const numeric = mathsCourseChecks
    .flatMap((c) => c.items)
    .filter((i) => i.question.answerAuthority.kind === "numeric");
  for (const [index, item] of numeric.entries())
    it("independently calculates " + item.question.id, () => {
      expect(item.question.answerAuthority.kind).toBe("numeric");
      if (item.question.answerAuthority.kind === "numeric")
        expect(item.question.answerAuthority.value).toBe(values[index]);
    });
  it("rejects missing lessons, reused questions, bad prerequisites and unsupported responses", () => {
    const wrong = structuredClone(mathsCourseChecks);
    wrong[0]!.items[0]!.lessonId = "missing";
    expect(validateCourseBundle({ ...base, courseChecks: wrong }).passed).toBe(false);
    const reused = structuredClone(mathsCourseChecks);
    reused[1]!.items[0]!.question.id = reused[0]!.items[0]!.question.id;
    expect(validateCourseBundle({ ...base, courseChecks: reused }).passed).toBe(false);
    const partial = structuredClone(mathsCourseChecks);
    partial[1]!.requiredLessonIds = [];
    expect(validateCourseBundle({ ...base, courseChecks: partial }).passed).toBe(false);
    expect(
      CourseCheckDefinitionSchema.safeParse({ ...mathsCourseChecks[2], afterCheckId: undefined })
        .success,
    ).toBe(false);
  });
});
