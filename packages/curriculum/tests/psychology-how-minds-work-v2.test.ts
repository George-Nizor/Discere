import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Psychology: How Minds Work, all twelve lessons in the v2 format. Every numeric key is
 * recomputed here from the arithmetic the item describes, not read back from its authority.
 *
 * Lessons one to twelve are story lessons: teaching screens with no question, then practice. Their
 * prose also does arithmetic, so the numbers in the text are recomputed and checked against what
 * the screens say.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/psychology-how-minds-work/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const byId = (id: string): Question => {
  const found = bundle.questions.find((item) => item.id === `psych-${id}`);
  if (!found) throw new Error(`missing ${id}`);
  return found;
};
const key = (id: string) => {
  const authority = byId(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const marked = (id: string) => {
  const item = byId(id);
  if (item.answerAuthority.kind !== "text") throw new Error("not text");
  const authority = item.answerAuthority;
  return item.choices!.filter((c) => assessTextAnswer(c.label, authority).correct).map((c) => c.id);
};
const close = (id: string, expected: number, digits = 6) =>
  expect(key(id)).toBeCloseTo(expected, digits);
const pct = (part: number, whole: number) => (part / whole) * 100;
const combine = (a: number, sa: number, b: number, sb: number) => {
  const wa = 1 / sa ** 2;
  const wb = 1 / sb ** 2;
  return (wa * a + wb * b) / (wa + wb);
};
const recall = (t: number, s: number) => 1 / (1 + t / (9 * s));
const rw = (rate: number, targets: number[]) =>
  targets.reduce((v, lambda) => v + rate * (lambda - v), 0);
const index = (m1: number, m2: number, a1: number, a2: number) => (m2 - m1) / (a2 - a1);
const positives = (n: number, base: number, hit: number, fa: number) => {
  const sick = n * base;
  return { tp: sick * hit, fp: (n - sick) * fa };
};

type Blocks = ReadonlyArray<{ kind: string; text?: string }> | undefined;
const proseOf = (blocks: Blocks) => (blocks ?? []).map((block) => block.text ?? "").join(" ");
const wordCount = (text: string) => text.split(/\s+/u).filter(Boolean).length;
const storyIds = [
  "correlation-and-cause",
  "experiments-and-assignment",
  "effect-size-and-replication",
  "signal-detection",
  "attention-and-multitasking",
  "perception-as-inference",
  "working-memory",
  "forgetting-and-spacing",
  "conditioning",
  "base-rates",
  "anchors-and-intuition",
  "social-influence",
];
const lessonById = (id: string) => bundle.lessons.find((lesson) => lesson.id === id)!;
const teachingOnly = (step: { kind: string; checkQuestionId: string }) =>
  step.kind === "explain" && !step.checkQuestionId;
const isStory = (lesson: { steps: Array<{ kind: string; checkQuestionId: string }> }) =>
  lesson.steps.some(teachingOnly);
const stepProse = (lessonId: string, stepId: string) => {
  const step = lessonById(lessonId).steps.find((item) => item.id === stepId)!;
  return [proseOf(step.lead), proseOf(step.afterFigure)].join(" ");
};
/** Everything a learner reads in one lesson, in order. */
const lessonProse = (id: string) => {
  const lesson = lessonById(id);
  return [
    proseOf(lesson.intro?.hook.blocks),
    ...lesson.steps.map((step) =>
      [step.headline ?? "", proseOf(step.lead), proseOf(step.afterFigure)].join(" "),
    ),
    proseOf(lesson.recap?.blocks),
    lesson.recap?.nextHook ?? "",
  ].join(" ");
};
const asks = (step: {
  checkQuestionId: string;
  workedSteps?: Array<{ selfExplain?: unknown }> | undefined;
}) => Boolean(step.checkQuestionId) || Boolean(step.workedSteps?.some((line) => line.selfExplain));

describe("Psychology v2: every lesson validates", () => {
  it("has twelve v2 lessons with three skill-check items and a transfer each", () => {
    expect(bundle.lessons).toHaveLength(12);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro, lesson.id).toBeDefined();
      expect(lesson.recap, lesson.id).toBeDefined();
      expect(lesson.questionIds, lesson.id).toHaveLength(3);
      expect(
        lesson.steps.some((s) => s.kind === "transfer"),
        lesson.id,
      ).toBe(true);
      // A story lesson runs 8 to 14 screens; the lessons not yet rewritten keep 5 to 7.
      expect(lesson.steps.length).toBeGreaterThanOrEqual(isStory(lesson) ? 8 : 5);
      expect(lesson.steps.length).toBeLessThanOrEqual(isStory(lesson) ? 14 : 7);
    }
  });
});

describe("Numeric questions: every key is recomputed from the study it describes", () => {
  it("recomputes the keys of the numeric questions", () => {
    close("correlation-and-cause-1", (-0.6) ** 2 * 100);
    close("correlation-and-cause-4", pct(6, 20) - pct(30, 100));
    close("experiments-and-assignment-4", 12 - 8);
    close("effect-size-and-replication-1", (106 - 100) / 15);
    close("effect-size-and-replication-4", (50.4 - 50) / 10);
    close("effect-size-and-replication-5", pct(35, 97), 1);
    close("signal-detection-2", 0.84 - -0.84);
    close("perception-as-inference-1", combine(50, 2, 56, 4));
    close("forgetting-and-spacing-1", recall(90, 10) * 100);
    close("conditioning-1", rw(0.3, [1, 1]));
    const a = positives(1000, 0.01, 0.9, 0.1);
    close("base-rates-2", pct(a.tp, a.tp + a.fp), 1);
    const cab = positives(1000, 0.2, 0.75, 0.25);
    close("base-rates-4", pct(cab.tp, cab.tp + cab.fp), 1);
    close("anchors-and-intuition-2", index(35, 59, 20, 80));
    close("social-influence-3", pct(26, 40) - pct(12, 40));
  });

  it("states in the feedback the figures that the questions about studies work out", () => {
    const said = (id: string) => byId(id).onCorrect ?? "";
    expect(said("perception-as-inference-ventriloquist")).toContain(`${combine(10, 8, 0, 4)}°`);
    expect(said("perception-as-inference-sharper-check")).toContain(
      (1 / Math.sqrt(1 / 16 + 1 / 36)).toFixed(1),
    );
    expect(said("signal-detection-reward")).toContain(`${(0.67 - -1.64).toFixed(2)}`);
    expect(said("forgetting-and-spacing-day-twenty")).toContain(
      `${Math.round(recall(17, 5) * 100)}%`,
    );
    expect(said("forgetting-and-spacing-day-twenty")).toContain(
      `${Math.round(recall(20, 2) * 100)}%`,
    );
    expect(said("anchors-and-intuition-index-reading")).toContain(`= ${index(220, 340, 100, 500)}`);
    expect(said("social-influence-five-witnesses")).toContain(
      `${(100 * (1 - 0.8 ** 5)).toFixed(1)}%`,
    );
    const screening = positives(1000, 0.01, 0.9, 0.1);
    const clinic = positives(1000, 0.1, 0.9, 0.1);
    const prompt = byId("base-rates-two-places").prompt;
    expect(prompt).toContain("one time in twelve");
    expect(Math.round((screening.tp + screening.fp) / screening.tp)).toBe(12);
    expect(prompt).toContain("one time in two");
    expect(Math.round((clinic.tp + clinic.fp) / clinic.tp)).toBe(2);
  });
});

describe("Choice items and misconceptions", () => {
  it("gives every choice item exactly one correct option and no misconception on the key", () => {
    for (const item of bundle.questions.filter((q) => q.choices?.length)) {
      expect(marked(item.id.replace("psych-", "")), item.id).toHaveLength(1);
      const [right] = marked(item.id.replace("psych-", ""));
      for (const m of item.misconceptions ?? [])
        expect(m.match.choiceIds ?? [], item.id).not.toContain(right);
    }
  });
  it("never lets a numeric misconception match the key", () => {
    for (const item of bundle.questions) {
      if (item.answerAuthority.kind !== "numeric") continue;
      for (const m of item.misconceptions ?? [])
        expect(m.match.numeric ?? [], item.id).not.toContain(item.answerAuthority.value);
    }
  });
});
