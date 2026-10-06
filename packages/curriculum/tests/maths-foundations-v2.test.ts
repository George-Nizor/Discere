import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * Maths Foundations v2 lessons 2 to 6. Every key is recomputed here from the arithmetic the item
 * describes. Each lesson is read from its migration draft and merged onto the published bundle in
 * memory, so the test holds before and after the course is published.
 */
const root = new URL("../../../content/maths-foundations/", import.meta.url);
type Lesson = CourseBundle["lessons"][number];
const published = JSON.parse(readFileSync(new URL("bundle.json", root), "utf8")) as CourseBundle;
type Draft = {
  lesson: Lesson;
  questions: Question[];
  citations: NonNullable<CourseBundle["authoringMetadata"]>[number]["citations"];
};
const load = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`.authoring/migration/${name}.json`, root), "utf8"),
  ) as Draft;
const drafts = {
  balance: load("keeping-the-balance"),
  undoing: load("undoing-in-the-right-order"),
  point: load("a-point-is-a-pair"),
  steep: load("how-steep-is-it"),
  line: load("from-equation-to-line"),
};
const reader = (draft: Draft, prefix: string) => {
  const question = (suffix: string): Question =>
    draft.questions.find((item) => item.id === `${prefix}${suffix}`)!;
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
  const slips = (suffix: string) =>
    (question(suffix).misconceptions ?? []).flatMap((m) => m.match.numeric ?? []).sort();
  return { question, key, choiceMarked, slips };
};
const sorted = (values: number[]) => [...values].sort();

const balance = reader(drafts.balance, "maths-keeping-the-balance-");
const undoing = reader(drafts.undoing, "maths-undoing-in-the-right-order-");
const letter = reader(drafts.undoing, "maths-what-a-letter-stands-for-");
const point = reader(drafts.point, "maths-a-point-is-a-pair-");
const steep = reader(drafts.steep, "maths-how-steep-is-it-");
const line = reader(drafts.line, "maths-from-equation-to-line-");
const lesson = drafts.balance.lesson;
const draft = drafts.balance;
const key = balance.key;
const question = balance.question;
const choiceMarked = balance.choiceMarked;

/** Solves a·x + b = c by balancing: subtract b from both sides, then divide both by a. */
const solve = (a: number, b: number, c: number) => (c - b) / a;

describe("Maths Foundations lesson 2 (v2, keeping the balance)", () => {
  it("has the v2 anatomy", () => {
    expect(lesson.steps.map((step) => step.kind)).toEqual([
      "explain",
      "predict",
      "explain",
      "worked_example",
      "faded_example",
      "try",
      "transfer",
    ]);
    expect(lesson.questionIds).toHaveLength(3);
    expect(lesson.calculator).toBe("off");
  });

  it("has keys that match the arithmetic each item describes", () => {
    // Hook: a bag plus 3 spare marbles balances 11 marbles.
    expect(key("hook")).toBe(11 - 3);
    // Predict: subtracting 6 from both sides is the only listed move that keeps 2x + 6 = 18.
    expect(choiceMarked("1")).toEqual(["a"]);
    expect(solve(2, 6, 18)).toBe(6); // x = 6 satisfies both 2x + 6 = 18 and 2x = 12
    expect(2 * 6).toBe(18 - 6);
    // Worked example: 3x + 2 = 23, x = 7, and the check line.
    expect(solve(3, 2, 23)).toBe(7);
    expect(3 * 7 + 2).toBe(23);
    expect(choiceMarked("why-both")).toEqual(["a"]);
    // Faded: 2x + 8 = 20 becomes 2x = 12, so x = 6, and the check gives 20.
    expect(20 - 8).toBe(12);
    expect(key("2")).toBe(12 / 2);
    expect(key("2")).toBe(solve(2, 8, 20));
    expect(key("verify")).toBe(2 * 6 + 8);
    expect(key("verify")).toBe(20);
    // Try: 4x = 20.
    expect(key("3")).toBe(solve(4, 0, 20));
    // Transfer: 3x − 9 = −15, add 9 first, then divide by 3.
    expect(key("4")).toBe(solve(3, -9, -15));
    expect(-15 + 9).toBe(-6);
    expect(3 * key("4") - 9).toBe(-15);
    // Skill check.
    expect(key("practice-1")).toBe(solve(5, 2, 27));
    expect(choiceMarked("practice-2")).toEqual(["a"]);
    expect(key("practice-3")).toBe(solve(2, -5, 13));
    expect(2 * key("practice-3") - 5).toBe(13);
  });

  it("matches each slip to the value it really produces, never the key", () => {
    const slips: Record<string, number[]> = {
      hook: [11 + 3, 11],
      "2": [12 - 2, 12 * 2],
      "3": [20 - 4, 20 * 4],
      "4": [(-15 - 9) / 3, -15 + 9, 2],
      "practice-1": [27 - 2, (27 + 2) / 5],
      "practice-3": [(13 - 5) / 2, 13 + 5],
    };
    for (const [suffix, values] of Object.entries(slips)) {
      const matched = (question(suffix).misconceptions ?? []).flatMap((m) => m.match.numeric ?? []);
      expect(matched.sort()).toEqual([...values].sort());
      expect(matched).not.toContain(key(suffix));
    }
    for (const item of draft.questions) {
      if (item.answerAuthority.kind !== "numeric") continue;
      const value = item.answerAuthority.value;
      for (const m of item.misconceptions ?? [])
        expect(m.feedback).not.toMatch(new RegExp(`(^|[^\\d.])[-−]?${Math.abs(value)}($|[^\\d.a-z])`, "u"));
    }
  });

  it("grades only taught skills", () => {
    const skills = new Set(lesson.taughtSkills);
    for (const id of lesson.questionIds)
      expect(skills.has(draft.questions.find((q) => q.id === id)!.skill!)).toBe(true);
  });
});

const all = Object.values(drafts);
const mergeAll = (): CourseBundle => {
  const ids = new Set(all.flatMap((item) => item.questions.map((q) => q.id)));
  const byLesson = new Map(all.map((item) => [item.lesson.id, item]));
  return {
    ...published,
    lessons: published.lessons.map((item) => byLesson.get(item.id)?.lesson ?? item),
    questions: [
      ...published.questions.filter((q) => !ids.has(q.id)),
      ...all.flatMap((item) => item.questions),
    ],
    authoringMetadata: (published.authoringMetadata ?? []).map((entry) => {
      const item = byLesson.get(entry.lessonId);
      return item ? { ...entry, citations: item.citations } : entry;
    }),
  };
};

describe("Maths Foundations lessons 2 to 6 (v2)", () => {
  it("validates once merged onto the course", () => {
    const errors = validateCourseBundle(mergeAll()).issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });

  it("gives every lesson the v2 anatomy: 5 to 7 steps, a transfer, exactly 3 check items", () => {
    for (const { lesson: item } of all) {
      expect(item.steps.length).toBeGreaterThanOrEqual(5);
      expect(item.steps.length).toBeLessThanOrEqual(7);
      expect(item.steps.some((step) => step.kind === "transfer")).toBe(true);
      expect(item.questionIds).toHaveLength(3);
      expect(item.calculator).toBe("off");
    }
  });

  it("lesson 3, undoing in the right order: keys match the arithmetic", () => {
    expect(undoing.key("hook")).toBe((20 - 4) / 2);
    expect(undoing.choiceMarked("1")).toEqual(["a"]);
    // Worked example 5x − 3 = 12 and the faded 2x + 3 = 17.
    expect((12 + 3) / 5).toBe(3);
    expect(5 * 3 - 3).toBe(12);
    expect(undoing.key("2")).toBe((17 - 3) / 2);
    expect(undoing.key("verify")).toBe(2 * 7 + 3);
    expect(letter.key("4")).toBe((14 + 4) / 3);
    expect(3 * letter.key("4") - 4).toBe(14);
    expect(undoing.key("3")).toBe(21 / 3 - 2);
    expect(3 * (undoing.key("3") + 2)).toBe(21);
    expect(undoing.key("4")).toBe((1.5 + 2) * 4);
    expect(undoing.key("4") / 4 - 2).toBe(1.5);
    expect(undoing.key("practice-1")).toBe((14 - 2) / 4 + 1);
    expect(4 * (undoing.key("practice-1") - 1) + 2).toBe(14);
    expect(undoing.key("practice-2")).toBe((4 - 1) / 4);
    expect(letter.key("practice-1")).toBe((4 - 1) * 2);
    expect(letter.key("practice-1") / 2 + 1).toBe(4);
    expect(undoing.choiceMarked("why-last-first")).toEqual(["a"]);
    // Slips: each wrong value is what the named mistake really produces.
    expect(undoing.slips("hook")).toEqual(sorted([(20 + 4) / 2, 20 - 4]));
    expect(undoing.slips("2")).toEqual(sorted([14, (17 + 3) / 2, 17 / 2 - 3]));
    expect(undoing.slips("3")).toEqual(sorted([21 / 3, 21 - 2]));
    expect(undoing.slips("4")).toEqual(sorted([1.5 + 2, 1.5 * 4]));
    expect(undoing.slips("practice-1")).toEqual(sorted([(14 - 2) / 4, 14 - 2]));
    expect(undoing.slips("practice-2")).toEqual(sorted([4 - 1, (4 + 1) / 4]));
    expect(letter.slips("4")).toEqual(sorted([3 * 6, 14 - 4]));
    expect(letter.slips("practice-1")).toEqual(sorted([4 - 1, (4 + 1) * 2]));
  });

  it("lesson 4, a point is a pair: keys match the coordinates", () => {
    // Hook: treasure (3, 2), friend (2, 3): one square along each axis.
    expect(point.key("hook")).toBe(Math.abs(3 - 2) + Math.abs(2 - 3));
    expect(point.key("1")).toBe([3, 2][0]);
    expect(point.choiceMarked("2")).toEqual(["a"]);
    expect(point.key("3")).toBe([-3, 2][0]);
    expect(point.key("4")).toBe([4, -2][1]);
    expect(point.choiceMarked("why-left")).toEqual(["a"]);
    expect(point.key("walk")).toBe(Math.abs(-2) + Math.abs(-3));
    expect(point.key("practice-1")).toBe(-5);
    expect(point.key("practice-2")).toBe(0);
    const swapped = [7, -4].reverse();
    expect(point.key("practice-3")).toBe(swapped[0]);
    expect(point.slips("3")).toEqual(sorted([3, 2]));
    expect(point.slips("4")).toEqual(sorted([2, 4]));
    expect(point.slips("practice-3")).toEqual(sorted([4, 7]));
  });

  it("lesson 5, how steep is it: keys match rise over run", () => {
    const gradient = (a: number[], b: number[]) => (b[1]! - a[1]!) / (b[0]! - a[0]!);
    expect(steep.key("hook")).toBe(18 / 6);
    expect(steep.key("1")).toBe(5 - 1);
    expect(gradient([1, 2], [3, 12])).toBe(5);
    expect(steep.key("2")).toBe(gradient([0, 1], [2, 5]));
    expect(steep.key("3")).toBe(gradient([-2, 3], [2, -1]));
    expect(steep.key("4")).toBe(gradient([-2, -1], [2, 1]));
    expect(steep.choiceMarked("why-same-order")).toEqual(["a"]);
    expect(steep.choiceMarked("practice-1")).toEqual(["a"]);
    expect(steep.key("practice-2")).toBe(gradient([1, 4], [5, 4]));
    expect(steep.key("practice-3")).toBe(gradient([2, 9], [4, 3]));
    expect(steep.slips("hook")).toEqual(sorted([18 * 6, 18 - 6]));
    expect(steep.slips("1")).toEqual(sorted([5, 1 + 5]));
    expect(steep.slips("2")).toEqual(sorted([2 / 4, 4]));
    expect(steep.slips("3")).toEqual(sorted([1, -4]));
    expect(steep.slips("practice-3")).toEqual(sorted([3, 3 - 9]));
  });

  it("lesson 6, from equation to line: keys match the equations", () => {
    expect(line.key("hook")).toBe(12 - 3 * 2);
    expect(line.key("1")).toBe(2 * 0 + 1);
    expect(3 * 0 - 1).toBe(-1);
    expect(3 * 2 - 1).toBe(5);
    expect((5 - -1) / 2).toBe(3);
    expect(line.key("2")).toBe(-2 + 3);
    // Through (0, −2) and (2, 2): c = −2, m = (2 − −2) / 2 = 2, so y = 2x − 2.
    expect(line.choiceMarked("3")).toEqual(["a"]);
    expect((2 - -2) / 2).toBe(2);
    expect(2 * 2 - 2).toBe(2);
    expect(line.key("4")).toBe(0.5 * 4 + 2);
    expect(line.key("practice-1")).toBe((6 - 2) / (3 - 1));
    expect(line.key("practice-2")).toBe(10 / 2);
    expect(line.key("practice-3")).toBe(3 * 2 + 4);
    expect(line.choiceMarked("why-two-points")).toEqual(["a"]);
    expect(line.slips("hook")).toEqual(sorted([12 - 2, 12 + 3 * 2]));
    expect(line.slips("1")).toEqual(sorted([2 + 1, 0]));
    expect(line.slips("2")).toEqual(sorted([2 + 3, -2 - 3]));
    expect(line.slips("4")).toEqual(sorted([0.5 * 4, 4 + 2]));
    expect(line.slips("practice-1")).toEqual(sorted([2 / 4, 4]));
    expect(line.slips("practice-2")).toEqual(sorted([2 * 10, 10 - 2]));
    expect(line.slips("practice-3")).toEqual(sorted([3 * 2, 3 + 4 + 2]));
  });

  it("one-tap checks on the explain steps match their arithmetic", () => {
    expect(balance.key("check-both-sides")).toBe(9 - 2);
    expect(balance.slips("check-both-sides")).toEqual(sorted([9 + 2, 9]));
    expect(balance.choiceMarked("check-inverse")).toEqual(["a"]);
    expect(undoing.choiceMarked("check-package")).toEqual(["a"]);
    expect(steep.key("check-run")).toBe(6 - 2);
    expect(steep.slips("check-run")).toEqual(sorted([9 - 1, 2 - 6]));
    // (1, 7) to (3, 1): y falls as x rises, so the gradient is negative.
    expect(Math.sign((1 - 7) / (3 - 1))).toBe(-1);
    expect(steep.choiceMarked("check-direction")).toEqual(["b"]);
    expect(line.key("check-intercept")).toBe(5 * 0 + 2);
    expect(line.slips("check-intercept")).toEqual(sorted([5, 5 + 2]));
    for (const { lesson: item } of all)
      for (const step of item.steps) expect(step.checkQuestionId || step.workedSteps?.length).toBeTruthy();
  });

  it("never lets a misconception match the key or print it", () => {
    for (const { questions } of all)
      for (const item of questions) {
        if (item.answerAuthority.kind !== "numeric") continue;
        const value = item.answerAuthority.value;
        for (const m of item.misconceptions ?? []) {
          expect(m.match.numeric ?? []).not.toContain(value);
          expect(m.feedback).not.toMatch(
            new RegExp(`(^|[^\\d.])[-−]?${Math.abs(value)}($|[^\\d.a-z])`, "u"),
          );
        }
      }
  });

  it("grades only skills taught so far", () => {
    const taught = new Set(["find-by-trying", "read-notation", "evaluate-expression", "check-solution"]);
    for (const { lesson: item, questions } of all) {
      for (const skill of item.taughtSkills ?? []) taught.add(skill);
      for (const id of item.questionIds)
        expect(taught.has(questions.find((q) => q.id === id)!.skill!)).toBe(true);
    }
  });
});
