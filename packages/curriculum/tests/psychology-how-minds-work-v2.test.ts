import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Psychology: How Minds Work, all twelve lessons in the v2 format. Every numeric key is
 * recomputed here from the arithmetic the item describes, not read back from its authority.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/psychology-how-minds-work/.authoring/candidate.json", import.meta.url),
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
const combinedSd = (a: number, b: number) => 1 / Math.sqrt(1 / a ** 2 + 1 / b ** 2);
const recall = (t: number, s: number) => 1 / (1 + t / (9 * s));
const rw = (rate: number, targets: number[]) =>
  targets.reduce((v, lambda) => v + rate * (lambda - v), 0);
const atLeastOne = (n: number, p: number) => 100 * (1 - (1 - p) ** n);
const switches = (seq: string) => [...seq].filter((c, i) => i > 0 && c !== seq[i - 1]).length;
const seqTime = (seq: string, trial: number, cost: number) =>
  seq.length * trial + switches(seq) * cost;
const index = (m1: number, m2: number, a1: number, a2: number) => (m2 - m1) / (a2 - a1);
const positives = (n: number, base: number, hit: number, fa: number) => {
  const sick = n * base;
  return { tp: sick * hit, fp: (n - sick) * fa };
};

describe("Psychology v2: every lesson validates", () => {
  it("has twelve v2 lessons with three skill-check items and a transfer each", () => {
    expect(bundle.lessons).toHaveLength(12);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro, lesson.id).toBeDefined();
      expect(lesson.recap, lesson.id).toBeDefined();
      expect(lesson.questionIds, lesson.id).toHaveLength(3);
      expect(lesson.steps.some((s) => s.kind === "transfer"), lesson.id).toBe(true);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.length).toBeLessThanOrEqual(7);
    }
  });
  it("keeps multiple choice to 35% of the course", () => {
    const share = bundle.questions.filter((q) => q.choices?.length).length / bundle.questions.length;
    expect(share).toBeLessThanOrEqual(0.35);
  });
});

describe("Lessons 1 to 4: correlation, assignment, effect size, signal detection", () => {
  it("recomputes the numeric keys", () => {
    close("correlation-and-cause-1", (-0.6) ** 2 * 100);
    close("correlation-and-cause-shared", 0.5 ** 2 * 100);
    close("correlation-and-cause-4", pct(6, 20) - pct(30, 100));
    close("correlation-and-cause-5", (-0.3) ** 2 * 100);
    close("correlation-and-cause-rates", pct(40, 100) - pct(9, 30));
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    close("experiments-and-assignment-1", mean([9, 8, 8, 7]) - mean([3, 2, 2, 1]));
    close("experiments-and-assignment-4", 12 - 8);
    close("experiments-and-assignment-5", mean([4, 6, 5, 7]) - mean([6, 5, 4, 5]));
    // Worked example: groups of 5, 9, 4, 6 and 7, 3, 8, 10, and 10% of 500 with 60% and 20%.
    expect(mean([5, 9, 4, 6])).toBe(6);
    expect(mean([7, 3, 8, 10])).toBe(7);
    close("effect-size-and-replication-1", (106 - 100) / 15);
    close("effect-size-and-replication-d-check", 8 / 20);
    const pooled = (a: number, b: number) => Math.sqrt((a ** 2 + b ** 2) / 2);
    expect(pooled(2, 14)).toBeCloseTo(10);
    close("effect-size-and-replication-2", (46.5 - 40) / pooled(7, 17));
    close("effect-size-and-replication-3", 16 / 0.4 ** 2, 6);
    close("effect-size-and-replication-4", (50.4 - 50) / 10);
    close("effect-size-and-replication-5", pct(35, 97), 1);
    close("signal-detection-1", pct(40, 50));
    close("signal-detection-dprime-check", 1.5 - -0.5);
    close("signal-detection-2", 0.84 - -0.84);
    close("signal-detection-3", 1.68 - 0);
    close("signal-detection-4", -(1.68 + 0) / 2);
    close("signal-detection-5", 0.5 - -1.48);
  });
  it("marks the right option in every choice item", () => {
    expect(marked("correlation-and-cause-3")).toEqual(["1"]);
    expect(marked("effect-size-and-replication-6")).toEqual(["1"]);
  });
});

describe("Lessons 5 to 8: attention, inference, working memory, forgetting", () => {
  it("recomputes the numeric keys", () => {
    close("attention-and-multitasking-1", pct(14, 30), 1);
    expect(switches("ABBA")).toBe(2);
    close("attention-and-multitasking-switches-check", switches("ABBA"));
    close("attention-and-multitasking-2", seqTime("ABABABAB", 600, 200));
    close("attention-and-multitasking-3", seqTime("ABABABAB", 600, 200) - seqTime("AAAABBBB", 600, 200));
    close("attention-and-multitasking-4", pct(5, 200));
    close("attention-and-multitasking-5", seqTime("AABBAABB", 500, 150));
    close("attention-and-multitasking-compare", seqTime("AABBAABB", 500, 150) - seqTime("AAAABBBB", 500, 150));
    expect(seqTime("AABAB", 400, 100)).toBe(2300);
    close("perception-as-inference-reliability-check", 1 / 2 ** 2 / (1 / 4 ** 2));
    close("perception-as-inference-1", combine(50, 2, 56, 4));
    close("perception-as-inference-2", combine(50, 4, 56, 2));
    expect(combine(20, 1, 30, 3)).toBeCloseTo(21);
    close("perception-as-inference-3", combinedSd(3, 4));
    close("perception-as-inference-4", combine(0, 1, 10, 3));
    close("perception-as-inference-5", combine(10, 8, 0, 4));
    close("perception-as-inference-estimate", combine(12, 2, 18, 6));
    close("working-memory-1", 9 - 4);
    close("working-memory-acronym-check", 3);
    close("working-memory-2", 4 * 3 - 4 * 1);
    close("working-memory-3", 20 / 4);
    close("working-memory-5", 16 / 4);
    close("working-memory-gain", 4 * 5 - 4 * 1);
    close("forgetting-and-spacing-curve-check", 2);
    expect(recall(2, 2)).toBeCloseTo(0.9, 0);
    close("forgetting-and-spacing-1", recall(90, 10) * 100);
    close("forgetting-and-spacing-2", recall(13.5, 6) * 100);
    expect(recall(15, 5)).toBeCloseTo(0.75);
    close("forgetting-and-spacing-3", 12);
    close("forgetting-and-spacing-4", 56 - 42);
    close("forgetting-and-spacing-5", recall(108, 4) * 100);
    close("forgetting-and-spacing-interval", 6 * 3);
  });
  it("marks the right option in every choice item", () => {
    expect(marked("working-memory-4")).toEqual(["1"]);
  });
});

describe("Lessons 9 to 12: conditioning, base rates, anchors, social influence", () => {
  it("recomputes the numeric keys", () => {
    close("conditioning-gap-check", rw(0.5, [1]));
    close("conditioning-1", rw(0.3, [1, 1]));
    expect(0.5 + 0.2 * (0 - 0.5)).toBeCloseTo(0.4);
    close("conditioning-2", rw(0.5, [1, 1, 0]));
    close("conditioning-rw", rw(0.6, [1, 1]));
    close("conditioning-3", 30 / 5);
    // Fixed interval: presses every 3 s, the first press at least 10 s after the last reward.
    let last = 0;
    let rewards = 0;
    for (let t = 3; t <= 60; t += 3) if (t - last >= 10) { rewards += 1; last = t; }
    close("conditioning-4", rewards);
    close("base-rates-count-check", 500 * 0.04);
    close("base-rates-1", positives(1000, 0.01, 0.9, 0.1).fp);
    close("base-rates-positives-check", pct(4, 4 + 16));
    const worked = positives(500, 0.1, 0.6, 0.2);
    expect(pct(worked.tp, worked.tp + worked.fp)).toBeCloseTo(25);
    const a = positives(1000, 0.01, 0.9, 0.1);
    close("base-rates-2", pct(a.tp, a.tp + a.fp), 1);
    const b = positives(1000, 0.1, 0.9, 0.1);
    close("base-rates-3", pct(b.tp, b.tp + b.fp));
    const cab = positives(1000, 0.2, 0.75, 0.25);
    close("base-rates-4", pct(cab.tp, cab.tp + cab.fp), 1);
    const c = positives(2000, 0.05, 0.8, 0.1);
    close("base-rates-5", c.tp + c.fp);
    const d = positives(1000, 0.05, 0.8, 0.1);
    close("base-rates-ppv", pct(d.tp, d.tp + d.fp), 1);
    close("anchors-and-intuition-1", 45 - 25);
    close("anchors-and-intuition-index-check", index(10, 30, 0, 40));
    expect(index(30, 51, 10, 70)).toBeCloseTo(0.35);
    close("anchors-and-intuition-2", index(35, 59, 20, 80));
    close("anchors-and-intuition-3", pct(200, 600), 1);
    // Ball x, bat x + 100: 2x + 100 = 110.
    close("anchors-and-intuition-4", (110 - 100) / 2);
    close("anchors-and-intuition-5", index(220, 340, 100, 500));
    // Pen x, notebook x + 200: 2x + 200 = 220.
    close("anchors-and-intuition-checks", (220 - 200) / 2);
    close("social-influence-conform-check", pct(15, 50));
    close("social-influence-1", pct(72, 18 * 12), 1);
    close("social-influence-obey-check", pct(16, 40));
    close("social-influence-2", pct(26, 40));
    close("social-influence-3", pct(26, 40) - pct(12, 40));
    close("social-influence-witness-check", atLeastOne(2, 0.5));
    close("social-influence-4", atLeastOne(5, 0.2), 1);
    close("social-influence-5", atLeastOne(3, 0.5));
    close("social-influence-drop", pct(26, 40) - pct(16, 40));
  });
  it("marks the right option in every choice item", () => {
    expect(marked("conditioning-6")).toEqual(["1"]);
    expect(marked("social-influence-6")).toEqual(["1"]);
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
