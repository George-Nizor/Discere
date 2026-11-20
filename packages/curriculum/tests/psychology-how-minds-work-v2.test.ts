import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Psychology: How Minds Work, all twelve lessons in the v2 format. No question asks for a computed
 * number: each one that used to is a multiple-choice judgement, and the figures its answer rests on
 * are recomputed here from the study it describes.
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
const marked = (id: string) => {
  const item = byId(id);
  if (item.answerAuthority.kind !== "text") throw new Error("not text");
  const authority = item.answerAuthority;
  return item.choices!.filter((c) => assessTextAnswer(c.label, authority).correct).map((c) => c.id);
};
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

describe("Judgement questions: the figures behind each answer are recomputed from the study", () => {
  const converted = [
    "correlation-and-cause-1",
    "correlation-and-cause-4",
    "experiments-and-assignment-4",
    "effect-size-and-replication-1",
    "effect-size-and-replication-4",
    "effect-size-and-replication-5",
    "signal-detection-2",
    "perception-as-inference-1",
    "forgetting-and-spacing-1",
    "conditioning-1",
    "base-rates-2",
    "base-rates-4",
    "anchors-and-intuition-2",
    "social-influence-3",
  ];

  it("asks no numeric question, since a figure is judged and not computed", () => {
    expect(bundle.questions.filter((item) => item.responseType === "numeric")).toEqual([]);
    for (const id of converted) {
      const item = byId(id);
      expect(item.responseType, id).toBe("short_text");
      expect(item.calculator, id).toBe("off");
      expect(item.hints, id).toHaveLength(2);
      expect(item.answerAuthority.kind, id).toBe("text");
      expect(item.choices?.length, id).toBeGreaterThanOrEqual(3);
      expect(marked(id), id).toHaveLength(1);
    }
  });

  it("recomputes the figures that the answer to each converted question rests on", () => {
    const said = (id: string) => byId(id).onCorrect ?? "";
    // Shared variation is r squared, a little over a third for r = -0.6.
    expect((-0.6) ** 2).toBeCloseTo(0.36, 9);
    expect(said("correlation-and-cause-1")).toContain("0.36");
    // 6 of 20 and 30 of 100 are the same rate, so the full moon changes nothing.
    expect(pct(6, 20)).toBeCloseTo(pct(30, 100), 9);
    expect(said("correlation-and-cause-4")).toContain("3 in 10");
    // The drug adds 12 - 8 = 4 points, a third of the drug group's gain.
    expect(12 - 8).toBe(4);
    expect((12 - 8) / 12).toBeCloseTo(1 / 3, 9);
    expect(said("experiments-and-assignment-4")).toContain("4 points");
    // d = 6 / 15 = 0.4, between Cohen's small (0.2) and medium (0.5).
    const trained = (106 - 100) / 15;
    expect(trained).toBeCloseTo(0.4, 9);
    expect(trained).toBeGreaterThan(0.2);
    expect(trained).toBeLessThan(0.5);
    expect(said("effect-size-and-replication-1")).toContain("0.4 of the 15-point");
    // The replication's d is 0.04, a fraction of the published 0.6.
    const replicated = (50.4 - 50) / 10;
    expect(replicated).toBeCloseTo(0.04, 9);
    expect(replicated).toBeLessThan(0.1);
    expect(said("effect-size-and-replication-4")).toContain("0.4 points");
    // 35 of 97 is 36%, a little over a third.
    expect(pct(35, 97)).toBeGreaterThan(100 / 3);
    expect(pct(35, 97)).toBeLessThan(40);
    // d' = 0.84 + 0.84 = 1.68 against 1.28 + 1.28 = 2.56, about a third lower.
    const second = 0.84 - -0.84;
    expect(second).toBeCloseTo(1.68, 9);
    expect(1 - second / (1.28 - -1.28)).toBeGreaterThan(0.3);
    expect(1 - second / (1.28 - -1.28)).toBeLessThan(0.4);
    expect(said("signal-detection-2")).toContain("1.68");
    // Vision has four times touch's weight, so the estimate sits a fifth of the way across.
    expect(1 / 2 ** 2 / (1 / 4 ** 2)).toBe(4);
    expect(combine(50, 2, 56, 4)).toBeCloseTo(51.2, 9);
    expect(said("perception-as-inference-1")).toContain("four times");
    // t / 9S is 1, so recall is one half.
    expect(recall(90, 10)).toBeCloseTo(0.5, 9);
    // The second pairing adds 0.3 x 0.7 = 0.21, less than the first step of 0.3.
    expect(rw(0.3, [1, 1]) - rw(0.3, [1])).toBeCloseTo(0.21, 9);
    expect(said("conditioning-1")).toContain("0.3 × 0.7");
    // 9 of the 108 positives are true, one in twelve, and 150 of 350 calls of blue are right.
    const screening = positives(1000, 0.01, 0.9, 0.1);
    expect(screening.tp).toBeCloseTo(9, 9);
    expect(screening.tp + screening.fp).toBeCloseTo(108, 9);
    expect((screening.tp + screening.fp) / screening.tp).toBeCloseTo(12, 9);
    const cab = positives(1000, 0.2, 0.75, 0.25);
    expect(cab.tp).toBeCloseTo(150, 9);
    expect(cab.tp + cab.fp).toBeCloseTo(350, 9);
    expect(pct(cab.tp, cab.tp + cab.fp)).toBeLessThan(50);
    // The medians move 24 years across anchors 60 years apart, two fifths of the way.
    expect(index(35, 59, 20, 80)).toBeCloseTo(0.4, 9);
    // 26 of 40 is 65% and 12 of 40 is 30%, a fall of 35 percentage points, roughly half.
    expect(pct(26, 40) - pct(12, 40)).toBeCloseTo(35, 9);
    expect(pct(12, 40) / pct(26, 40)).toBeCloseTo(0.46, 2);
    expect(said("social-influence-3")).toContain("35 percentage points");
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
