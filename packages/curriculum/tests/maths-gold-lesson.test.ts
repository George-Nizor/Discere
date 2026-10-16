import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { lessonQuestionRefs, validateCourseBundle } from "../src/index.js";

/**
 * Maths Foundations lesson 1: the gold v2 lesson, rewritten in the story format. Every key is
 * recomputed here from the arithmetic the item describes, not read back from the authority it is
 * checking. The lesson is read from its migration draft and merged onto the published bundle in
 * memory, so the test holds before and after the course is published.
 */
const root = new URL("../../../content/maths-foundations/", import.meta.url);
const published = JSON.parse(readFileSync(new URL("bundle.json", root), "utf8")) as CourseBundle;
const draft = JSON.parse(
  readFileSync(new URL(".authoring/migration/what-a-letter-stands-for.json", root), "utf8"),
) as {
  lesson: CourseBundle["lessons"][number];
  questions: Question[];
  citations: NonNullable<CourseBundle["authoringMetadata"]>[number]["citations"];
};
const drafted = new Set(draft.questions.map((item) => item.id));
const bundle: CourseBundle = {
  ...published,
  lessons: published.lessons.map((item) => (item.id === draft.lesson.id ? draft.lesson : item)),
  questions: [...published.questions.filter((item) => !drafted.has(item.id)), ...draft.questions],
  authoringMetadata: (published.authoringMetadata ?? []).map((entry) =>
    entry.lessonId === draft.lesson.id ? { ...entry, citations: draft.citations } : entry,
  ),
};
const lesson = bundle.lessons.find((item) => item.id === "what-a-letter-stands-for")!;
const question = (suffix: string): Question =>
  bundle.questions.find((item) => item.id === `maths-what-a-letter-stands-for-${suffix}`)!;
const key = (suffix: string) => {
  const authority = question(suffix).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${suffix} is not numeric`);
  return authority.value;
};
const choiceMarked = (suffix: string) => {
  const item = question(suffix);
  if (item.answerAuthority.kind !== "text") throw new Error("not a choice");
  const authority = item.answerAuthority;
  return item
    .choices!.filter((choice) => assessTextAnswer(choice.label, authority).correct)
    .map((c) => c.id);
};

/** "yes" when the substituted left side equals the right side, computed rather than typed. */
const solves = (left: number, right: number) => (left === right ? "yes" : "no");

describe("Maths Foundations lesson 1 (v2 gold lesson, story format)", () => {
  it("is a v2 lesson that validates, with the anatomy the brief sets", () => {
    const validation = validateCourseBundle(bundle);
    expect(validation.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(lesson.intro).toBeDefined();
    expect(lesson.intro?.hook.questionId).toBeUndefined();
    expect(lesson.recap).toBeDefined();
    expect(lesson.steps.map((step) => step.kind)).toEqual([
      "explain",
      "try",
      "explain",
      "explain",
      "worked_example",
      "explain",
      "explain",
      "try",
      "explain",
      "faded_example",
      "try",
      "transfer",
    ]);
    expect(lesson.questionIds).toHaveLength(3);
    expect(lesson.calculator).toBe("off");
    // 1.2.0 shipped this lesson; later releases rewrote lessons 2–6 around it.
    expect(bundle.course.version).toMatch(/^1\.([2-9]|\d{2,})\./);
  });

  it("has keys that match the arithmetic each item describes", () => {
    // Hook: a number plus 5 is 12.
    expect(key("hook")).toBe(12 - 5);
    // The machine screen: x + 5 reaches its target 12 only at the slider value the puzzle asks for.
    const machine = (x: number) => x + 5;
    expect([...Array(21).keys()].filter((x) => machine(x) === 12)).toEqual([key("3")]);
    expect(key("hook")).toBe(key("3"));
    // Practice: 3x − 4 at x = 6.
    expect(key("order")).toBe(3 * 6 - 4);
    // Worked example: x + x + 4 at x = 5 reads 5 + 5 + 4.
    expect(5 + 5 + 4).toBe(14);
    // Faded: left side of 2x + 1 at x = 4, and whether it equals 9.
    expect(key("left-side")).toBe(2 * 4 + 1);
    expect(choiceMarked("is-solution")).toEqual([solves(2 * 4 + 1, 9)]);
    // Try: left side of 5x − 2 at x = 3; 3 is not a solution of 5x − 2 = 12.
    expect(key("try")).toBe(5 * 3 - 2);
    expect(5 * 3 - 2 === 12).toBe(false);
    // Transfer: 3 + 2m at m = 7.
    expect(key("taxi")).toBe(3 + 2 * 7);
    // Skill check.
    expect(key("check-1")).toBe(3 * 4 + 2);
    expect(choiceMarked("check-2")).toEqual([solves(2 * 5 - 3, 7)]);
    expect(choiceMarked("check-3")).toEqual(["a"]);
    expect(choiceMarked("notation")).toEqual(["a"]);
    expect(choiceMarked("same-letter")).toEqual(["a"]);
  });

  it("gives every misconception a distinct wrong value, never the key", () => {
    for (const item of bundle.questions.filter((q) => q.id.startsWith("maths-what-a-letter"))) {
      for (const misconception of item.misconceptions ?? []) {
        if (item.answerAuthority.kind === "numeric")
          expect(misconception.match.numeric ?? []).not.toContain(item.answerAuthority.value);
        // Feedback shown before the reveal must not state the key.
        if (item.answerAuthority.kind === "numeric")
          expect(misconception.feedback).not.toMatch(
            new RegExp(`(^|[^\\d.])${item.answerAuthority.value}($|[^\\d.])`, "u"),
          );
      }
    }
  });

  it("matches each slip to the value its mistake produces", () => {
    const slips = (suffix: string) =>
      (question(suffix).misconceptions ?? []).flatMap((m) => m.match.numeric ?? []).sort();
    const sorted = (values: number[]) => [...values].sort();
    // Hook: adding the 5 instead of taking it back off.
    expect(slips("hook")).toEqual(sorted([12 + 5]));
    // Order: subtracting first, skipping the multiplication, reading 3x as 3 + x, stopping after
    // the first box, and reading 3x as the digits 3 and 6.
    expect(slips("order")).toEqual(
      sorted([3 * (6 - 4), 6 - 4, 3 + 6 - 4, 3 * 6, Number("36") - 4]),
    );
    // Left side of 2x + 1 at 4: forgetting the + 1, and reading 2x as 2 + x.
    expect(slips("left-side")).toEqual(sorted([2 * 4, 2 + 4 + 1]));
    // Left side of 5x − 2 at 3: forgetting the − 2, mistaking it for the right side, 5 + x − 2.
    expect(slips("try")).toEqual(sorted([5 * 3, 12, 5 + 3 - 2]));
    // Taxi: (3 + 2) × 7, 3 + 2 + 7, and the miles part alone.
    expect(slips("taxi")).toEqual(sorted([(3 + 2) * 7, 3 + 2 + 7, 2 * 7]));
    // Skill check: 3 + a + 2, and 3 × (a + 2).
    expect(slips("check-1")).toEqual(sorted([3 + 4 + 2, 3 * (4 + 2)]));
  });

  it("grades only what it teaches: solving by inverse operations moved to lesson 3", () => {
    const lesson3 = bundle.lessons.find((item) => item.id === "undoing-in-the-right-order")!;
    // Asked somewhere in lesson 3: as a step's question or in its skill check.
    expect(lessonQuestionRefs(lesson3)).toEqual(
      expect.arrayContaining([
        "maths-what-a-letter-stands-for-4",
        "maths-what-a-letter-stands-for-practice-1",
      ]),
    );
    const asked = new Set(lessonQuestionRefs(lesson));
    const skills = new Set(
      bundle.questions.filter((q) => asked.has(q.id) && q.skill).map((q) => q.skill),
    );
    // Everything asked is taught. Reading notation is taught on the letter and 3x screens, and the
    // one item that checked it (…-notation) is no longer asked by a step.
    for (const skill of skills) expect(lesson.taughtSkills).toContain(skill);
    expect(asked.has("maths-what-a-letter-stands-for-notation")).toBe(false);
    expect([...skills].sort()).toEqual(["check-solution", "evaluate-expression", "find-by-trying"]);
  });

  it("keeps the recall cards and every graded figure hidden until the response", () => {
    expect(lesson.flashcardIds).toEqual([
      "maths-what-a-letter-stands-for-card-1",
      "maths-what-a-letter-stands-for-card-2",
    ]);
    for (const step of lesson.steps.filter((item) => item.diagram))
      expect(step.answerVisibility).toBe(
        step.kind === "explain" && !step.checkQuestionId ? undefined : "hidden-until-response",
      );
  });
});

describe("v2 validator rules", () => {
  const mutate = (change: (copy: CourseBundle) => void) => {
    const copy = structuredClone(bundle);
    change(copy);
    return validateCourseBundle(copy).issues.map((issue) => issue.code);
  };
  const l1 = (copy: CourseBundle) => copy.lessons.find((item) => item.id === lesson.id)!;
  const step = (copy: CourseBundle, id: string) => l1(copy).steps.find((item) => item.id === id)!;
  it("reports a term asked about before the step that introduces it", () => {
    expect(
      mutate((copy) => {
        copy.questions.find((q) => q.id === "maths-what-a-letter-stands-for-hook")!.prompt =
          "Which variable is my number?";
      }),
    ).toContain("TERM_BEFORE_INTRODUCTION");
    expect(
      mutate((copy) => {
        copy.questions.find((q) => q.id === "maths-what-a-letter-stands-for-hook")!.usesTerms = [
          "solution",
        ];
      }),
    ).toContain("TERM_NOT_INTRODUCED");
  });
  it("reports an item that needs a skill no lesson so far teaches", () => {
    expect(
      mutate((copy) => {
        copy.questions.find((q) => q.id === "maths-what-a-letter-stands-for-check-1")!.skill =
          "solve-two-step";
      }),
    ).toContain("ITEM_OUTSIDE_SCOPE");
  });
  it("enforces the anatomy", () => {
    expect(
      mutate((copy) => {
        step(copy, "play-a-round").lead = [{ kind: "paragraph", text: "word ".repeat(61).trim() }];
      }),
    ).toContain("LEAD_TOO_LONG");
    expect(
      mutate((copy) => {
        delete step(copy, "run-the-machine").answerVisibility;
      }),
    ).toContain("ANSWER_VISIBILITY_UNDECLARED");
    expect(
      mutate((copy) => {
        l1(copy).steps[0]!.kind = "try";
        l1(copy).steps[0]!.checkQuestionId = "maths-what-a-letter-stands-for-hook";
      }),
    ).toContain("FIRST_LESSON_OPENS_WITH_TRY");
    expect(
      mutate((copy) => {
        delete l1(copy).recap;
      }),
    ).toContain("V2_MISSING_CLOSE");
    expect(
      mutate((copy) => {
        l1(copy).questionIds = l1(copy).questionIds.slice(0, 2);
      }),
    ).toContain("SKILL_CHECK_SIZE");
    expect(
      mutate((copy) => {
        copy.questions.find((q) => q.id === "maths-what-a-letter-stands-for-order")!
          .misconceptions![0]!.match.numeric = [14];
      }),
    ).toContain("MISCONCEPTION_IS_KEY");
  });
});
