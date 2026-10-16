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
    new URL(
      "../../../content/psychology-how-minds-work/.authoring/candidate.json",
      import.meta.url,
    ),
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
  return item
    .choices!.filter((c) => assessTextAnswer(c.label, authority).correct)
    .map((c) => c.id);
};
const close = (id: string, expected: number, digits = 6) =>
  expect(key(id)).toBeCloseTo(expected, digits);
const pct = (part: number, whole: number) => (part / whole) * 100;
const combine = (a: number, sa: number, b: number, sb: number) => {
  const wa = 1 / sa ** 2;
  const wb = 1 / sb ** 2;
  return (wa * a + wb * b) / (wa + wb);
};
const combinedSd = (a: number, b: number) =>
  1 / Math.sqrt(1 / a ** 2 + 1 / b ** 2);
const recall = (t: number, s: number) => 1 / (1 + t / (9 * s));
const rw = (rate: number, targets: number[]) =>
  targets.reduce((v, lambda) => v + rate * (lambda - v), 0);
const atLeastOne = (n: number, p: number) => 100 * (1 - (1 - p) ** n);
const switches = (seq: string) =>
  [...seq].filter((c, i) => i > 0 && c !== seq[i - 1]).length;
const seqTime = (seq: string, trial: number, cost: number) =>
  seq.length * trial + switches(seq) * cost;
const index = (m1: number, m2: number, a1: number, a2: number) =>
  (m2 - m1) / (a2 - a1);
const positives = (n: number, base: number, hit: number, fa: number) => {
  const sick = n * base;
  return { tp: sick * hit, fp: (n - sick) * fa };
};

type Blocks = ReadonlyArray<{ kind: string; text?: string }> | undefined;
const proseOf = (blocks: Blocks) =>
  (blocks ?? []).map((block) => block.text ?? "").join(" ");
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
const lessonById = (id: string) =>
  bundle.lessons.find((lesson) => lesson.id === id)!;
const teachingOnly = (step: { kind: string; checkQuestionId: string }) =>
  step.kind === "explain" && !step.checkQuestionId;
const isStory = (lesson: {
  steps: Array<{ kind: string; checkQuestionId: string }>;
}) => lesson.steps.some(teachingOnly);
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
      [step.headline ?? "", proseOf(step.lead), proseOf(step.afterFigure)].join(
        " ",
      ),
    ),
    proseOf(lesson.recap?.blocks),
    lesson.recap?.nextHook ?? "",
  ].join(" ");
};
const asks = (step: {
  checkQuestionId: string;
  workedSteps?: Array<{ selfExplain?: unknown }> | undefined;
}) =>
  Boolean(step.checkQuestionId) ||
  Boolean(step.workedSteps?.some((line) => line.selfExplain));

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
      expect(lesson.steps.length).toBeGreaterThanOrEqual(
        isStory(lesson) ? 8 : 5,
      );
      expect(lesson.steps.length).toBeLessThanOrEqual(isStory(lesson) ? 14 : 7);
    }
  });
  it("keeps multiple choice to 35% of the course", () => {
    const share =
      bundle.questions.filter((q) => q.choices?.length).length /
      bundle.questions.length;
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
    close(
      "experiments-and-assignment-1",
      mean([9, 8, 8, 7]) - mean([3, 2, 2, 1]),
    );
    close("experiments-and-assignment-4", 12 - 8);
    close(
      "experiments-and-assignment-5",
      mean([4, 6, 5, 7]) - mean([6, 5, 4, 5]),
    );
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
    close(
      "attention-and-multitasking-3",
      seqTime("ABABABAB", 600, 200) - seqTime("AAAABBBB", 600, 200),
    );
    close("attention-and-multitasking-4", pct(5, 200));
    close("attention-and-multitasking-5", seqTime("AABBAABB", 500, 150));
    close(
      "attention-and-multitasking-compare",
      seqTime("AABBAABB", 500, 150) - seqTime("AAAABBBB", 500, 150),
    );
    expect(seqTime("AABAB", 400, 100)).toBe(2300);
    close(
      "perception-as-inference-reliability-check",
      1 / 2 ** 2 / (1 / 4 ** 2),
    );
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
    for (let t = 3; t <= 60; t += 3)
      if (t - last >= 10) {
        rewards += 1;
        last = t;
      }
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
        expect(m.match.numeric ?? [], item.id).not.toContain(
          item.answerAuthority.value,
        );
    }
  });
});

describe("Lessons 1 to 12 are story lessons", () => {
  it("shapes each as opener, teaching screens, practice and close", () => {
    for (const id of storyIds) {
      const lesson = lessonById(id);
      expect(isStory(lesson), id).toBe(true);
      expect(
        lesson.intro?.hook.questionId,
        `${id} opens with a question`,
      ).toBeUndefined();
      const opener = wordCount(proseOf(lesson.intro?.hook.blocks));
      expect(opener, `${id} opener`).toBeGreaterThanOrEqual(120);
      expect(opener, `${id} opener`).toBeLessThanOrEqual(200);
      expect(
        wordCount(lesson.intro!.promise),
        `${id} promise`,
      ).toBeLessThanOrEqual(25);
      expect(lesson.intro!.estimatedMinutes).toBe(12);
      const teaching = lesson.steps.filter(teachingOnly);
      expect(
        teaching.length / lesson.steps.length,
        `${id} teaching share`,
      ).toBeGreaterThanOrEqual(0.4);
      const questions = lesson.steps.filter(asks);
      expect(questions.length, `${id} question screens`).toBeGreaterThanOrEqual(
        3,
      );
      expect(questions.length, `${id} question screens`).toBeLessThanOrEqual(7);
      expect(
        lesson.steps.some((step) => step.diagram),
        `${id} has a figure`,
      ).toBe(true);
      let run = 0;
      for (const step of lesson.steps) {
        run = teachingOnly(step) ? run + 1 : 0;
        expect(run, `${id} teaching run at ${step.id}`).toBeLessThanOrEqual(3);
      }
      for (const step of teaching) {
        const words = wordCount(stepProse(id, step.id));
        expect(words, `${id}/${step.id}`).toBeGreaterThanOrEqual(100);
        expect(words, `${id}/${step.id}`).toBeLessThanOrEqual(250);
        expect(step.headline, `${id}/${step.id}`).toBeTruthy();
      }
      for (const step of lesson.steps.filter((item) => !teachingOnly(item)))
        expect(
          wordCount(proseOf(step.lead)),
          `${id}/${step.id} lead`,
        ).toBeLessThanOrEqual(60);
      expect(lesson.recap?.nextHook, `${id} nextHook`).toBeTruthy();
    }
  });

  it("keeps their prose free of questions and dashes", () => {
    for (const id of storyIds) {
      const text = lessonProse(id);
      expect(text, id).not.toMatch(/\?/u);
      expect(text, id).not.toMatch(/[—–]/u);
    }
  });

  it("chains each lesson into the next", () => {
    expect(lessonById("correlation-and-cause").recap?.nextHook).toMatch(/gym/u);
    expect(
      proseOf(lessonById("experiments-and-assignment").intro?.hook.blocks),
    ).toMatch(/gym/u);
    expect(lessonById("experiments-and-assignment").recap?.nextHook).toMatch(
      /training course that raised scores by 6 points/u,
    );
    expect(
      proseOf(lessonById("effect-size-and-replication").intro?.hook.blocks),
    ).toMatch(/training course lifts test scores by 6 points/u);
    expect(lessonById("effect-size-and-replication").recap?.nextHook).toMatch(
      /two guards who watch a car park/u,
    );
    expect(proseOf(lessonById("signal-detection").intro?.hook.blocks)).toMatch(
      /Two guards watch the same car park/u,
    );
    expect(lessonById("signal-detection").recap?.nextHook).toMatch(
      /eight cards to sort, four sums and four word puzzles/u,
    );
    expect(
      proseOf(lessonById("attention-and-multitasking").intro?.hook.blocks),
    ).toMatch(/eight cards/u);
    expect(lessonById("attention-and-multitasking").recap?.nextHook).toMatch(
      /block that looks 50 mm tall and feels 56 mm/u,
    );

    const opener = (id: string) => proseOf(lessonById(id).intro?.hook.blocks);
    const hook = (id: string) => lessonById(id).recap?.nextHook ?? "";
    expect(opener("perception-as-inference")).toMatch(
      /50 mm tall.*thick gloves.*56 mm/u,
    );
    expect(hook("perception-as-inference")).toMatch(
      /two lists of nine digits and a ten-second wait/u,
    );
    expect(opener("working-memory")).toMatch(
      /List A: 4 9 1 7 2 8 5 3 6\. List B: 1 2 3 4 5 6 7 8 9/u,
    );
    expect(hook("working-memory")).toMatch(
      /100 new words, 60 of them still known a day later/u,
    );
    expect(opener("forgetting-and-spacing")).toMatch(
      /You learn 100 new words\. A day later you still know 60/u,
    );
    expect(hook("forgetting-and-spacing")).toMatch(
      /dog that hears a bell before every meal/u,
    );
    expect(opener("conditioning")).toMatch(
      /A dog hears a bell just before it is fed/u,
    );
    expect(hook("conditioning")).toMatch(/airport scanner beeps at a bag/u);
    expect(opener("base-rates")).toMatch(/At an airport, 1,000 bags/u);
    expect(hook("base-rates")).toMatch(/first number we meet/u);
    expect(opener("anchors-and-intuition")).toMatch(
      /“was £200, now £120”.*£120 is the only price/u,
    );
    expect(hook("anchors-and-intuition")).toMatch(
      /station platform, where a stranger collapses/u,
    );
    expect(opener("social-influence")).toMatch(
      /empty station platform, a stranger collapses/u,
    );
  });

  it("recomputes the numbers in correlation-and-cause", () => {
    const text = stepProse("correlation-and-cause", "how-much-they-share");
    expect(text).toContain(`0.4 × 0.4 = ${Math.round(0.4 * 0.4 * 100) / 100}`);
    expect(Math.round(0.4 ** 2 * 100)).toBe(16);
    expect(text).toContain("16% of their variation");
    expect(text).toContain(`The other ${100 - 16}%`);
    // The car owner: 4 of 10 washed days and 36 of the other 90 are the same rate.
    const car = stepProse("correlation-and-cause", "patterns-memory-builds");
    expect(pct(4, 10)).toBe(40);
    expect(pct(36, 90)).toBe(40);
    expect(car).toContain("4 out of 10 is 40%, and 36 out of 90 is also 40%");
    expect(10 + 90).toBe(100);
    // The town's figures: r of the three pictures matches what the text says.
    const rOf = (points: Array<{ x: number; y: number }>) => {
      const mx = points.reduce((a, p) => a + p.x, 0) / points.length;
      const my = points.reduce((a, p) => a + p.y, 0) / points.length;
      const sxy = points.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
      const sxx = points.reduce((a, p) => a + (p.x - mx) ** 2, 0);
      const syy = points.reduce((a, p) => a + (p.y - my) ** 2, 0);
      return sxy / Math.sqrt(sxx * syy);
    };
    const scatterR = (stepId: string, caseId: string) => {
      const step = lessonById("correlation-and-cause").steps.find(
        (item) => item.id === stepId,
      )!;
      const found =
        step.diagram?.type === "psychology_explorer"
          ? step.diagram.cases.find((item) => item.id === caseId)
          : undefined;
      if (found?.model.kind !== "scatter") throw new Error("not a scatter");
      return rOf(found.model.points);
    };
    expect(scatterR("two-lists-as-dots", "first")).toBeCloseTo(0.75, 2);
    expect(scatterR("two-lists-as-dots", "second")).toBeCloseTo(-0.6, 2);
    expect(scatterR("a-number-for-the-pattern", "second")).toBeCloseTo(0.4, 2);
    expect(scatterR("something-behind-both", "second")).toBeCloseTo(0, 1);
    expect(scatterR("which-way-the-arrow-points", "first")).toBeCloseTo(0.3, 2);
    expect(scatterR("which-way-the-arrow-points", "second")).toBeCloseTo(
      0.3,
      2,
    );
    expect(scatterR("share-of-sleep", "first")).toBeCloseTo(-0.6, 2);
  });

  it("recomputes the numbers in experiments-and-assignment", () => {
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const text = stepProse("experiments-and-assignment", "chance-gaps");
    expect(text).toContain(
      `Group A adds up to ${5 + 9 + 4 + 6}, and ${5 + 9 + 4 + 6} divided by 4 gives an average of ${mean([5, 9, 4, 6])}`,
    );
    expect(text).toContain(
      `Group B adds up to ${7 + 3 + 8 + 10}, which gives an average of ${mean([7, 3, 8, 10])}`,
    );
    expect(mean([7, 3, 8, 10]) - mean([5, 9, 4, 6])).toBe(1);
    expect(text).toContain("Group B starts one point ahead");
    // The skill-check drug gap and the volunteers' head start.
    close(
      "experiments-and-assignment-1",
      mean([9, 8, 8, 7]) - mean([3, 2, 2, 1]),
    );
    expect(text).not.toMatch(/\?/u);
    expect(
      proseOf(lessonById("experiments-and-assignment").recap?.blocks),
    ).toContain(`12 − 8 = ${12 - 8}`);
  });

  it("recomputes the numbers in effect-size-and-replication", () => {
    const d = stepProse("effect-size-and-replication", "gain-in-spreads");
    expect(d).toContain(`6 ÷ 3 = ${6 / 3}`);
    expect(d).toContain(`6 ÷ 30 = ${6 / 30}`);
    const lehr = (effect: number) => Math.round(16 / effect ** 2);
    const power = stepProse("effect-size-and-replication", "how-many-people");
    expect(power).toContain(`16 ÷ 0.64 = ${lehr(0.8)}`);
    expect(power).toContain(`16 ÷ 0.25 = ${lehr(0.5)}`);
    expect(power).toContain(`16 ÷ 0.04 = ${lehr(0.2)}`);
    expect(0.8 ** 2).toBeCloseTo(0.64);
    expect(0.5 ** 2).toBeCloseTo(0.25);
    expect(0.2 ** 2).toBeCloseTo(0.04);
    // The class figure carries the spreads the text names, and a gain of 6 in each.
    const step = lessonById("effect-size-and-replication").steps.find(
      (item) => item.id === "gain-in-spreads",
    )!;
    const cases =
      step.diagram?.type === "psychology_explorer" ? step.diagram.cases : [];
    const models = cases.map((item) => item.model);
    expect(
      models.map((m) =>
        m.kind === "effect" ? [m.meanB - m.meanA, m.sdA] : [],
      ),
    ).toEqual([
      [6, 3],
      [6, 30],
    ]);
    // The worked example: pooled spread of 2 and 14, then d for means 30 and 38.
    const lines = lessonById("effect-size-and-replication").steps.find(
      (item) => item.id === "pooling-in-numbers",
    )!.workedSteps!;
    expect(lines[0]!.math).toBe(`2² = ${2 ** 2} and 14² = ${14 ** 2}`);
    expect(lines[1]!.math).toContain(
      `= √${(4 + 196) / 2} = ${Math.sqrt((4 + 196) / 2)}`,
    );
    expect(lines[2]!.math).toContain(
      `= ${(38 - 30) / Math.sqrt((4 + 196) / 2)}`,
    );
    // The skill check shows the replication counts in the text: 97 significant, 35 repeated.
    expect(
      stepProse("effect-size-and-replication", "a-result-that-does-not-repeat"),
    ).toContain("97 had been significant");
  });

  it("recomputes the numbers in signal-detection", () => {
    const rates = stepProse("signal-detection", "four-outcomes");
    expect(rates).toContain(
      `${10} hits out of ${10} and a hit rate of ${pct(10, 10)}%`,
    );
    expect(rates).toContain(`the false-alarm rate is ${pct(9, 10)}%`);
    const skill = stepProse("signal-detection", "a-number-for-skill");
    // Guard B: 8 of 10 thief nights (z 0.84) and 1 of 10 quiet nights (z −1.28).
    expect(pct(8, 10)).toBe(80);
    expect(pct(1, 10)).toBe(10);
    expect(skill).toContain(
      `d′ = 0.84 − (−1.28) = ${(0.84 + 1.28).toFixed(2)}`,
    );
    const how = stepProse("signal-detection", "how-ready-to-say-yes");
    const sum = 0.84 + -1.28;
    expect(how).toContain(`so the sum is −${Math.abs(sum).toFixed(2)}`);
    expect(how).toContain(`Halving it gives −${Math.abs(sum / 2).toFixed(2)}`);
    expect(how).toContain(`c = +${(-sum / 2).toFixed(2)}`);
    // The worked example: z(H) 1.28 and z(FA) −1.28.
    const lines = lessonById("signal-detection").steps.find(
      (item) => item.id === "distance-in-numbers",
    )!.workedSteps!;
    expect(lines[1]!.math).toBe("d′ = 1.28 − (−1.28)");
    expect(lines[2]!.math).toBe(`d′ = ${(1.28 + 1.28).toFixed(2)}`);
    // The table the lesson gives is symmetric about a rate of one half.
    for (const [z, negative] of [
      [0.84, "0.20"],
      [1.28, "0.10"],
    ] as const)
      expect(skill).toContain(`${negative} gives −${z}`);
  });

  it("recomputes the numbers in attention-and-multitasking", () => {
    const text = stepProse(
      "attention-and-multitasking",
      "the-price-of-changing-job",
    );
    expect(switches("AAB")).toBe(1);
    expect(switches("ABAB")).toBe(3);
    expect(text).toContain("AAB has one switch");
    expect(text).toContain("ABAB has three");
    // The worked example: five trials of 400 ms and three switches of 100 ms.
    const lines = lessonById("attention-and-multitasking").steps.find(
      (item) => item.id === "five-trials-in-numbers",
    )!.workedSteps!;
    expect(lines[0]!.math).toBe(
      `5 × 400 = ${(5 * 400).toLocaleString("en-GB")} ms`,
    );
    expect(lines[1]!.math).toBe(`${switches("AABAB")} switches`);
    expect(lines[2]!.math).toBe(
      `${switches("AABAB")} × 100 = ${switches("AABAB") * 100} ms`,
    );
    expect(lines[3]!.math).toBe(
      `${(5 * 400).toLocaleString("en-GB")} + ${switches("AABAB") * 100} = ${seqTime("AABAB", 400, 100).toLocaleString("en-GB")} ms`,
    );
    // The recap: alternating against blocked at 600 ms and 200 ms.
    const recap = proseOf(
      lessonById("attention-and-multitasking").recap?.blocks,
    );
    expect(recap).toContain(
      `${seqTime("ABABABAB", 600, 200).toLocaleString("en-GB")} ms`,
    );
    expect(recap).toContain(
      `${seqTime("AAAABBBB", 600, 200).toLocaleString("en-GB")} ms`,
    );
    expect(recap).toContain(
      `${(seqTime("ABABABAB", 600, 200) - seqTime("AAAABBBB", 600, 200)).toLocaleString("en-GB")} ms`,
    );
    expect(recap).toContain(`${pct(14, 30).toFixed(1)}%`);
    expect(recap).toContain(`${pct(5, 200)}%`);
  });

  /** The model drawn in one case of a step's figure. */
  const modelOf = (lessonId: string, stepId: string, caseId: string) => {
    const step = lessonById(lessonId).steps.find((item) => item.id === stepId)!;
    const found =
      step.diagram?.type === "psychology_explorer"
        ? step.diagram.cases.find((item) => item.id === caseId)
        : undefined;
    if (!found) throw new Error(`no figure case ${stepId}/${caseId}`);
    return found.model;
  };
  const linesOf = (lessonId: string, stepId: string) =>
    lessonById(lessonId).steps.find((item) => item.id === stepId)!.workedSteps!;
  const tidy = (x: number) => String(Math.round(x * 1e9) / 1e9);
  const average = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  it("recomputes the numbers in perception-as-inference", () => {
    const id = "perception-as-inference";
    const rules = stepProse(id, "weighing-by-reliability");
    expect(1 / 1 ** 2).toBe(1);
    expect(1 / 3 ** 2).toBeCloseTo(1 / 9);
    expect(rules).toContain("1 ÷ (1 × 1) = 1");
    expect(rules).toContain("1 ÷ (3 × 3) = 1/9");
    // The second block: sight 30 mm (SD 1), touch 36 mm (SD 3).
    expect(combine(30, 1, 36, 3)).toBeCloseTo(30.6);
    expect((30 + 36) / 2).toBe(33);
    const lines = linesOf(id, "two-cues-in-numbers");
    const total = 1 + 1 / 9;
    expect(total).toBeCloseTo(10 / 9);
    expect(lines[0]!.math).toBe("1 ÷ 1 = 1 and 1 ÷ 9 = 1/9");
    expect(lines[1]!.math).toBe(
      `1 ÷ (10/9) = ${tidy(1 / total)} and (1/9) ÷ (10/9) = ${tidy(1 / 9 / total)}`,
    );
    expect(lines[2]!.math).toBe(
      `0.9 × 30 + 0.1 × 36 = ${tidy(0.9 * 30)} + ${tidy(0.1 * 36)} = ${tidy(0.9 * 30 + 0.1 * 36)}`,
    );
    expect(lines[3]!.text).toContain("30.6 mm");
    expect(lines[3]!.text).toContain("midpoint of 33 mm");
    const why = byId("perception-as-inference-why-near");
    expect(why.prompt).toContain("nearer 30 than the midpoint, 33");
    // The figure the lesson draws carries the readings the text names.
    for (const [stepId, sdA, sdB] of [
      ["weighing-by-reliability", 1, 3],
      ["two-cues-in-numbers", 1, 3],
    ] as const) {
      const m = modelOf(id, stepId, "first");
      if (m.kind !== "cues") throw new Error("not cues");
      expect([m.meanA, m.sdA, m.meanB, m.sdB]).toEqual([30, sdA, 36, sdB]);
    }
    // The first block, as the practice step draws it: 50 mm (SD 2) and 56 mm (SD 4).
    const first = modelOf(id, "sight-and-touch-together", "first");
    if (first.kind !== "cues") throw new Error("not cues");
    expect([first.meanA, first.sdA, first.meanB, first.sdB]).toEqual([
      50, 2, 56, 4,
    ]);
    // Two cues with SDs of 5 and 12 combine to 60/13, about 4.6.
    const sharper = stepProse(id, "sharper-together");
    expect(1 / 25 + 1 / 144).toBeCloseTo(169 / 3600);
    expect(Math.sqrt(169 / 3600)).toBeCloseTo(13 / 60);
    expect(combinedSd(5, 12)).toBeCloseTo(60 / 13);
    expect(combinedSd(5, 12).toFixed(1)).toBe("4.6");
    for (const piece of ["1/25 and 1/144", "169/3600", "13/60", "60/13", "about 4.6 mm"])
      expect(sharper).toContain(piece);
    // The expectation in the teaching figure: 0° (SD 2°) against a glimpse of 8° (SD 4°).
    const prior = modelOf(id, "expectation-is-a-cue", "first");
    if (prior.kind !== "cues") throw new Error("not cues");
    expect([prior.meanA, prior.sdA, prior.meanB, prior.sdB]).toEqual([
      0, 2, 8, 4,
    ]);
    expect(stepProse(id, "expectation-is-a-cue")).toContain(
      "0°, SD 2°) and the glimpse says 8° (SD 4°",
    );
    expect(combine(0, 2, 8, 4)).toBeCloseTo(1.6);
    const recap = proseOf(lessonById(id).recap?.blocks);
    expect(recap).toContain(`${combine(50, 2, 56, 4)} mm`);
    expect(recap).toContain(`${combinedSd(3, 4)} mm`);
    expect(recap).toContain(`${combine(0, 1, 10, 3)}°`);
  });

  it("recomputes the numbers in working-memory", () => {
    const id = "working-memory";
    const opener = proseOf(lessonById(id).intro?.hook.blocks);
    // Both lists use the same nine digits once each.
    expect([..."491728536"].sort().join("")).toBe("123456789");
    expect(opener).toContain("same digits");
    const chunks = stepProse(id, "what-counts-as-one");
    const phone = modelOf(id, "what-counts-as-one", "second");
    if (phone.kind !== "span") throw new Error("not span");
    expect(phone.items).toHaveLength(11);
    expect(phone.chunks).toEqual([5, 3, 3]);
    expect(phone.chunks.length).toBeLessThanOrEqual(phone.capacity);
    expect(chunks).toContain("eleven-digit phone number");
    expect(chunks).toContain("groups of five, three and three");
    const grouped = stepProse(id, "making-chunks-bigger");
    expect(grouped).toContain("Four single-letter chunks hold " + "four letters");
    expect(4 * 1).toBe(4);
    expect(4 * 3).toBe(12);
    expect(grouped).toContain("hold twelve");
    // The master's simplified position: twelve pieces in three chunks of four.
    const master = modelOf(id, "how-a-chess-master-remembers", "first");
    const novice = modelOf(id, "how-a-chess-master-remembers", "second");
    if (master.kind !== "span" || novice.kind !== "span")
      throw new Error("not span");
    expect(master.items).toHaveLength(12);
    expect(master.chunks).toEqual([4, 4, 4]);
    expect(master.chunks.length).toBeLessThanOrEqual(master.capacity);
    expect(novice.chunks.length).toBeGreaterThan(novice.capacity);
    expect(stepProse(id, "how-a-chess-master-remembers")).toContain(
      "position of twelve pieces",
    );
    // The practice position: 20 pieces in four chunks of five.
    const real = modelOf(id, "pieces-in-a-chunk", "first");
    if (real.kind !== "span") throw new Error("not span");
    expect(real.items).toHaveLength(20);
    expect(real.chunks).toEqual([5, 5, 5, 5]);
    const recap = proseOf(lessonById(id).recap?.blocks);
    expect(recap).toContain(`by ${9 - 4}.`);
    expect(recap).toContain(`keeps ${4 * 5} pieces where a novice keeps ${4 * 1}`);
  });

  it("recomputes the numbers in forgetting-and-spacing", () => {
    const id = "forgetting-and-spacing";
    expect(proseOf(lessonById(id).intro?.hook.blocks)).toContain(
      `lost ${100 - 60}`,
    );
    const curve = stepProse(id, "a-number-for-durability");
    // Stability is the day recall reaches 90%, and the fraction at t = S is 1/9.
    expect(recall(3, 3)).toBeCloseTo(0.9);
    expect(1 / (1 + 1 / 9)).toBeCloseTo(0.9);
    // S = 3 at day 18: 9S = 27, 18/27 = 2/3, recall 3/5.
    expect(9 * 3).toBe(27);
    expect(18 / 27).toBeCloseTo(2 / 3);
    expect(recall(18, 3)).toBeCloseTo(3 / 5);
    for (const piece of ["9S = 27", "18 ÷ 27 = 2/3", "= 3/5", "60%"])
      expect(curve).toContain(piece);
    // A review that multiplies stability by 2.5 turns 2 days into 5.
    expect(2 * 2.5).toBe(5);
    expect(stepProse(id, "what-a-review-does")).toContain("S = 5 days");
    // Reviewed when due: gaps of 2, 5 and 12.5 days, with reviews on days 2 and 7.
    expect(2 * 2.5 * 2.5).toBe(12.5);
    const due = modelOf(id, "when-the-next-review-is-due", "first");
    if (due.kind !== "forgetting") throw new Error("not forgetting");
    expect(due.stability).toBe(2);
    expect(due.growth).toBe(2.5);
    expect(due.reviews).toEqual([2, 2 + 2 * 2.5]);
    expect(stepProse(id, "when-the-next-review-is-due")).toContain(
      "The gaps are 2, 5 and 12.5 days",
    );
    // The worked example: stability 5, 15 days on.
    const lines = linesOf(id, "recall-after-a-review");
    expect(lines[0]!.math).toBe(`9 × 5 = ${9 * 5}`);
    expect(lines[1]!.math).toBe(`15 ÷ ${9 * 5} = 1/3`);
    expect(recall(15, 5)).toBeCloseTo(0.75);
    // The recap's three results, and the gap between recall practice and rereading.
    const recap = proseOf(lessonById(id).recap?.blocks);
    expect(recall(90, 10) * 100).toBeCloseTo(50);
    expect(recap).toContain("fall to 50% by day 90");
    expect(Math.round(recall(17.5, 2) * 100)).toBe(51);
    expect(recap).toContain("from about 51% to 80%");
    expect(recap).toContain(`${56 - 42} points`);
  });

  it("recomputes the numbers in conditioning", () => {
    const id = "conditioning";
    const rule = stepProse(id, "how-much-each-pairing-teaches");
    // Rate 0.25: 0.25, then 0.25 × 0.75 = 0.1875 more, making 0.4375.
    expect(rw(0.25, [1])).toBeCloseTo(0.25);
    expect(0.25 * (1 - 0.25)).toBeCloseTo(0.1875);
    expect(rw(0.25, [1, 1])).toBeCloseTo(0.4375);
    for (const piece of ["0.25 × 1 = 0.25", "1 − 0.25 = 0.75", "0.25 × 0.75 = 0.1875", "reaches 0.4375"])
      expect(rule).toContain(piece);
    // Extinction in the text: V = 0.8 falls by 0.25 × 0.8 = 0.2 to 0.6.
    const fading = stepProse(id, "when-the-food-stops");
    expect(0.25 * 0.8).toBeCloseTo(0.2);
    expect(0.8 + 0.25 * (0 - 0.8)).toBeCloseTo(0.6);
    expect(fading).toContain("0.25 × 0.8 = 0.2 to 0.6");
    // The worked example: V = 0.5 at a rate of 0.2 with the bell alone.
    const lines = linesOf(id, "a-bell-alone-in-numbers");
    expect(lines[1]!.math).toBe(`ΔV = 0.2 × (0 − 0.5) = −${tidy(0.2 * 0.5)}`);
    expect(lines[2]!.math).toBe(`V = 0.5 − 0.1 = ${tidy(0.5 + 0.2 * (0 - 0.5))}`);
    // The schedules the figures draw really average four, five and ten.
    const ratio = (stepId: string) => {
      const m = modelOf(id, stepId, "second");
      if (m.kind !== "schedule") throw new Error("not schedule");
      return average(m.requirements);
    };
    expect(ratio("how-often-rewards-arrive")).toBe(4);
    expect(ratio("a-pigeon-on-a-ratio")).toBe(5);
    expect(ratio("a-rat-on-an-interval")).toBe(10);
    expect(stepProse(id, "how-often-rewards-arrive")).toContain(
      "averages 4",
    );
    const recap = proseOf(lessonById(id).recap?.blocks);
    expect(recap).toContain(`V = ${tidy(rw(0.3, [1, 1]))}`);
    expect(recap).toContain(`earned ${30 / 5} rewards`);
    expect(recap).toContain(`allowed only ${5}`);
  });

  it("recomputes the numbers in base-rates", () => {
    const id = "base-rates";
    const opener = proseOf(lessonById(id).intro?.hook.blocks);
    // The airport: 2 real beeps and 98 false ones among 998 harmless bags.
    expect(1000 - 2).toBe(998);
    expect(98 / 998).toBeLessThan(0.1);
    expect(opener).toContain("98 of the 998 bags");
    const beeps = stepProse(id, "counting-the-beeps");
    expect(2 + 98).toBe(100);
    expect(beeps).toContain("2 + 98 = 100");
    expect(pct(2, 100)).toBe(2);
    expect(beeps).toContain("about 2 times in 100");
    expect(1000 * 0.02).toBe(20);
    expect(20 * 0.5).toBe(10);
    // Screening 1,000 people at a base rate of 2%: 10 true and 49 false positives.
    const screen = positives(1000, 0.02, 0.5, 0.05);
    expect(screen.tp).toBeCloseTo(10);
    expect(screen.fp).toBeCloseTo(49);
    expect(1000 - 1000 * 0.02).toBe(980);
    const text = stepProse(id, "screening-a-thousand-people");
    expect(text).toContain("5% of 980 is 49");
    expect(screen.fp / screen.tp).toBeGreaterThan(4.5);
    expect(screen.fp / screen.tp).toBeLessThan(5);
    // The flagged group: 10 ÷ 59, about 17%.
    const flagged = stepProse(id, "the-flagged-group");
    expect(screen.tp + screen.fp).toBeCloseTo(59);
    expect(10 / 59).toBeCloseTo(0.17, 2);
    expect(Math.round(pct(screen.tp, screen.tp + screen.fp))).toBe(17);
    expect(flagged).toContain("makes 59 flagged people");
    expect(flagged).toContain("about a 17% chance");
    // The clinic with 20% affected: 100 of 140 flagged, about 71%.
    const clinic = positives(1000, 0.2, 0.5, 0.05);
    expect(clinic.tp).toBeCloseTo(100);
    expect(clinic.fp).toBeCloseTo(40);
    expect(Math.round(pct(clinic.tp, clinic.tp + clinic.fp))).toBe(71);
    expect(
      pct(clinic.tp, clinic.tp + clinic.fp) /
        pct(screen.tp, screen.tp + screen.fp),
    ).toBeGreaterThan(4);
    const crowd = stepProse(id, "the-same-test-in-another-crowd");
    for (const piece of ["200 people have the condition and 100 of them are flagged", "Of the 800 healthy people, 40 are flagged", "140 people", "about 71%"])
      expect(crowd).toContain(piece);
    // The worked example's figure matches its numbers: 500 people, 10%, 60% and 20%.
    const worked = modelOf(id, "positives-in-numbers", "first");
    if (worked.kind !== "base_rate") throw new Error("not base_rate");
    expect([worked.population, worked.baseRate, worked.hitRate, worked.falseAlarmRate]).toEqual([500, 0.1, 0.6, 0.2]);
    const recap = proseOf(lessonById(id).recap?.blocks);
    const a = positives(1000, 0.01, 0.9, 0.1);
    expect(recap).toContain(`${a.tp} true positives against ${a.fp} false positives`);
    expect(recap).toContain(`${pct(a.tp, a.tp + a.fp).toFixed(1)}%`);
    const cab = positives(1000, 0.2, 0.75, 0.25);
    expect(recap).toContain(`${pct(cab.tp, cab.tp + cab.fp).toFixed(1)}%`);
  });

  it("recomputes the numbers in anchors-and-intuition", () => {
    const id = "anchors-and-intuition";
    const anchor = (stepId: string, caseId: string) => {
      const m = modelOf(id, stepId, caseId);
      if (m.kind !== "anchor") throw new Error("not anchor");
      return m;
    };
    // The wheel: anchors 10 and 65, medians 25 and 45, so the gap is 20 and the index about 0.36.
    const wheel = anchor("what-the-wheel-did", "first");
    expect([wheel.lowAnchor, wheel.highAnchor]).toEqual([10, 65]);
    expect([wheel.lowEstimate, wheel.highEstimate]).toEqual([25, 45]);
    const wheelText = stepProse(id, "what-the-wheel-did");
    expect(wheelText).toContain("25% after the 10 and 45% after the 65");
    const explain = stepProse(id, "pull-index");
    expect(65 - 10).toBe(55);
    expect(45 - 25).toBe(20);
    expect(index(25, 45, 10, 65)).toBeCloseTo(0.36, 2);
    for (const piece of ["65 − 10 = 55", "45 − 25 = 20", "about 0.36"])
      expect(explain).toContain(piece);
    expect(index(30, 50, 0, 100)).toBeCloseTo(0.2);
    expect(explain).toContain("20 ÷ 100 = 0.2");
    expect(index(25, 45, 10, 65)).toBeGreaterThan(1 / 3);
    const demo = anchor("pull-index", "second");
    expect([demo.lowAnchor, demo.highAnchor, demo.lowEstimate, demo.highEstimate]).toEqual([0, 100, 30, 50]);
    // The worked example: 51 − 30 = 21, 70 − 10 = 60, 21 ÷ 60 = 0.35.
    const lines = linesOf(id, "work").map((line) => line.math);
    expect(51 - 30).toBe(21);
    expect(70 - 10).toBe(60);
    expect(lines).toEqual(["51 − 30 = 21", "70 − 10 = 60", `21 ÷ 60 = ${tidy(21 / 60)}`]);
    // The oak trees: anchors 20 and 80, medians 35 and 59, so the index is 0.4.
    const oak = anchor("work-two", "first");
    expect([oak.lowAnchor, oak.highAnchor, oak.lowEstimate, oak.highEstimate]).toEqual([20, 80, 35, 59]);
    expect(stepProse(id, "work-two")).toContain("35 years and 59 years");
    expect(index(35, 59, 20, 80)).toBeCloseTo(0.4);
    // k words: 200 start with k and 400 have it third, so words with k third are twice as common.
    const k = modelOf(id, "counting-k-words", "first");
    if (k.kind !== "tally") throw new Error("not tally");
    expect([k.total, k.count]).toEqual([600, 200]);
    expect((k.total - k.count) / k.count).toBe(2);
    expect(stepProse(id, "easy-to-recall")).toContain("about twice as common");
    // Cap and scarf: x + (x + 4) = 6 gives x = 1. The quick answer of 2 makes the pair cost 2 + 6 = 8.
    const slow = stepProse(id, "quick-answer-slow-check");
    expect((6 - 4) / 2).toBe(1);
    expect(2 + (2 + 4)).toBe(8);
    for (const piece of ["2x + 4 = 6", "x = 1", "makes the scarf £6", "cost £8", "costs £1"])
      expect(slow).toContain(piece);
    // Bat and ball: the quick 10p makes the total 120p, the answer is 5p.
    expect(10 + (10 + 100)).toBe(120);
    const recap = proseOf(lessonById(id).recap?.blocks);
    expect(recap).toContain(`${45 - 25} points`);
    expect(recap).toContain(`index of ${index(35, 59, 20, 80)}`);
    expect(recap).toContain(`${(110 - 100) / 2}p`);
  });

  it("recomputes the numbers in social-influence", () => {
    const id = "social-influence";
    const tallyOf = (stepId: string, caseId: string) => {
      const m = modelOf(id, stepId, caseId);
      if (m.kind !== "tally") throw new Error("not tally");
      return m;
    };
    const lines = stepProse(id, "matching-lines");
    expect(10 * 8).toBe(80);
    expect(pct(24, 10 * 8)).toBe(30);
    expect(lines).toContain("10 × 8 = 80");
    expect(lines).toContain("24 ÷ 80 = 30%");
    const critical = tallyOf("matching-lines", "first");
    expect([critical.total, critical.count]).toEqual([100, 37]);
    const people = tallyOf("matching-lines", "second");
    expect([people.total, people.count]).toEqual([100, 75]);
    expect(lines).toContain("37 critical answers in every 100");
    expect(lines).toContain("75 people in every 100");
    expect(stepProse(id, "counting-conforming-answers")).toContain("18 people");
    expect(18 * 12).toBe(216);
    // Milgram: 26, 16 and 12 of 40 reach 450 volts.
    expect(stepProse(id, "obedience-rate")).toContain("26 of the 40");
    const counts = ["first", "second", "third"].map((c) => tallyOf("bringing-the-victim-closer", c));
    expect(counts.map((c) => [c.total, c.count])).toEqual([[40, 26], [40, 16], [40, 12]]);
    const closer = stepProse(id, "bringing-the-victim-closer");
    expect(closer).toContain("16 of 40");
    expect(closer).toContain("12 of 40");
    expect(50 - 40).toBe(10);
    expect(closer).toContain("from 50% to 40% has fallen 10 percentage points");
    // Burger 2009 and the myth of 38 witnesses.
    const later = stepProse(id, "how-the-results-held-up");
    expect(later).toContain("70% willing to continue");
    expect(later).toContain("82.5%");
    expect(later).toContain("65%");
    expect(pct(26, 40)).toBe(65);
    // Darley and Latané: 85% alone, 31% with four others.
    const crowd = stepProse(id, "a-crowd-and-a-collapse");
    expect(crowd).toContain("85% of the time");
    expect(crowd).toContain("31% of the time");
    // Three people at 0.3: 0.7 × 0.7 × 0.7 = 0.343, so 65.7% that somebody acts.
    const somebody = stepProse(id, "somebody-acts");
    expect(0.7 * 0.7 * 0.7).toBeCloseTo(0.343);
    expect(1 - 0.7 ** 3).toBeCloseTo(0.657);
    expect(atLeastOne(3, 0.3)).toBeCloseTo(65.7, 1);
    for (const piece of ["0.7 × 0.7 × 0.7 = 0.343", "1 − 0.343 = 0.657", "65.7%"])
      expect(somebody).toContain(piece);
    expect(0.85).toBeGreaterThan(atLeastOne(3, 0.3) / 100);
    const witnesses = modelOf(id, "somebody-acts", "second");
    if (witnesses.kind !== "bystander") throw new Error("not bystander");
    expect([witnesses.bystanders, witnesses.helpProbability]).toEqual([3, 0.3]);
    const five = modelOf(id, "five-bystanders", "second");
    if (five.kind !== "bystander") throw new Error("not bystander");
    expect([five.bystanders, five.helpProbability]).toEqual([5, 0.2]);
    expect(stepProse(id, "cameras-in-real-streets")).toContain("219");
    expect(stepProse(id, "cameras-in-real-streets")).toContain("91%");
    const recap = proseOf(lessonById(id).recap?.blocks);
    expect(recap).toContain(`72 of ${18 * 12} critical answers conformed, ${pct(72, 216).toFixed(1)}%`);
    expect(recap).toContain(`${pct(26, 40) - pct(12, 40)} points`);
    expect(recap).toContain(`${atLeastOne(5, 0.2).toFixed(1)}%`);
  });
});
