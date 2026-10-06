import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * Philosophy: Knowledge, Mind and Ethics, all thirteen lessons in the v2 format. Numeric keys are
 * recomputed from the arithmetic the item describes. Text items have no arithmetic, so they are
 * checked structurally: every choice item has exactly one correct option, and no misconception
 * matches the key.
 */
const dir = new URL("../../../content/philosophy-knowledge-mind-and-ethics/", import.meta.url);
const published = JSON.parse(readFileSync(new URL("bundle.json", dir), "utf8")) as CourseBundle;
const candidatePath = new URL(".authoring/candidate.json", dir);
const bundle: CourseBundle = published.lessons.every((lesson) => lesson.intro)
  ? published
  : (JSON.parse(readFileSync(candidatePath, "utf8")) as CourseBundle);

const question = (n: string): Question => bundle.questions.find((q) => q.id === `phil-${n}`)!;
const key = (n: string) => {
  const authority = question(n).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${n} is not numeric`);
  return authority.value;
};
const correctChoices = (q: Question) => {
  const authority = q.answerAuthority;
  if (authority.kind !== "text") throw new Error("not a text item");
  return q.choices!.filter((c) => assessTextAnswer(c.label, authority).correct).map((c) => c.id);
};
const correct = (q: Question, answer: string) => {
  const authority = q.answerAuthority;
  return authority.kind === "text" && assessTextAnswer(answer, authority).correct;
};
const expectedUtility = (outcomes: Array<[number, number]>) =>
  outcomes.reduce((sum, [p, v]) => sum + p * v, 0);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("Philosophy: Knowledge, Mind and Ethics (v2 lessons)", () => {
  it("validates with no errors and has the v2 anatomy in every lesson", () => {
    const errors = validateCourseBundle(bundle).issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
    expect(bundle.lessons).toHaveLength(13);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro, lesson.id).toBeDefined();
      expect(lesson.recap, lesson.id).toBeDefined();
      expect(lesson.questionIds, lesson.id).toHaveLength(3);
      expect(lesson.steps.length, lesson.id).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.length, lesson.id).toBeLessThanOrEqual(7);
      expect(lesson.steps.some((s) => s.kind === "transfer"), lesson.id).toBe(true);
      expect(lesson.calculator).toBe("off");
    }
  });

  it("keeps multiple choice within the course limit", () => {
    const choices = bundle.questions.filter((q) => (q.choices?.length ?? 0) > 0).length;
    expect(choices / bundle.questions.length).toBeLessThanOrEqual(0.35);
  });

  it("has numeric keys that match the arithmetic each item describes", () => {
    // Reconstructing arguments: counted claims.
    expect(key("reconstructing-arguments-7")).toBe(2); // film time, walking distance
    expect(key("reconstructing-arguments-1")).toBe(2); // bridge date, inspection rule
    expect(key("reconstructing-arguments-4")).toBe(2); // bottle cracks, freezer needs cleaning
    expect(key("reconstructing-arguments-5")).toBe(3); // reptiles, snakes, basking
    // Validity: rows of p, q where both premises of p → q, q hold.
    const rows2 = [true, false].flatMap((p) => [true, false].map((q) => ({ p, q })));
    const imp = (a: boolean, b: boolean) => !a || b;
    expect(rows2.filter(({ p, q }) => imp(p, q) && q)).toHaveLength(key("validity-and-soundness-2"));
    // Copper: premise 1 (all metals magnetic) is the false one.
    expect(key("validity-and-soundness-3")).toBe(1);
    // p → q, r → q, so p → r: counterexample rows.
    const rows3 = rows2.flatMap(({ p, q }) => [true, false].map((r) => ({ p, q, r })));
    expect(
      rows3.filter(({ p, q, r }) => imp(p, q) && imp(r, q) && !imp(p, r)),
    ).toHaveLength(key("validity-and-soundness-4"));
    expect(2 ** 4).toBe(key("validity-and-soundness-6"));
    // Scepticism: p → q, ¬q: rows where both premises hold.
    expect(rows2.filter(({ p, q }) => imp(p, q) && !q)).toHaveLength(key("scepticism-and-closure-3"));
    // Mind and body: p → q, q → r, ¬r.
    expect(
      rows3.filter(({ p, q, r }) => imp(p, q) && imp(q, r) && !r),
    ).toHaveLength(key("mind-and-body-3"));
    // Justified true belief: truth, belief, justification all hold in Smith's case.
    expect([true, true, true].filter(Boolean)).toHaveLength(key("justified-true-belief-1"));
  });

  it("recomputes the Bayesian counts from natural frequencies", () => {
    const positives = (n: number, prior: number, hit: number, alarm: number) => ({
      ill: n * prior * hit,
      well: n * (1 - prior) * alarm,
    });
    const a = positives(1000, 0.1, 0.9, 0.1);
    expect(a.ill + a.well).toBeCloseTo(key("bayesian-evidence-7"), 9); // hook: 90 + 90
    expect((100 * a.ill) / (a.ill + a.well)).toBeCloseTo(key("bayesian-evidence-1"), 9);
    const b = positives(1000, 0.01, 0.9, 0.1);
    expect(b.ill + b.well).toBeCloseTo(key("bayesian-evidence-2"), 9);
    expect(0.9 / 0.1).toBeCloseTo(key("bayesian-evidence-3"), 9);
    const c = positives(1000, 0.1, 0.8, 0.05);
    expect((100 * c.ill) / (c.ill + c.well)).toBeCloseTo(key("bayesian-evidence-4"), 9);
    // P(H | E) with P(H) = 0.2, P(E | H) = 0.5, P(E | not-H) = 0.25.
    const joint = 0.2 * 0.5;
    expect(joint / (joint + 0.8 * 0.25)).toBeCloseTo(key("bayesian-evidence-5"), 9);
    const d = positives(1000, 0.5, 0.9, 0.1);
    expect((100 * d.ill) / (d.ill + d.well)).toBeCloseTo(key("bayesian-evidence-10"), 9);
    // Worked example: 200 ill, 160 caught, 40 false alarms, 80%.
    const w = positives(1000, 0.2, 0.8, 0.05);
    expect([w.ill, w.well, (100 * w.ill) / (w.ill + w.well)]).toEqual([160, 40, 80]);
  });

  it("recomputes the machine-table counts", () => {
    // Block's machine: 20p a can, 10p and 20p coins, nothing owed at the start.
    const run = (coins: number[]) => {
      let credit = 0;
      let cans = 0;
      for (const coin of coins) {
        credit += coin;
        if (credit >= 20) {
          cans += 1;
          credit -= 20;
        }
      }
      return cans;
    };
    expect(run([10, 10, 10])).toBe(key("functionalism-and-the-chinese-room-1"));
    expect(run([20, 10, 20])).toBe(key("functionalism-and-the-chinese-room-2"));
    expect(run([20, 20, 10, 10])).toBe(key("functionalism-and-the-chinese-room-10"));
  });

  it("recomputes the identity, trolley and expected-utility keys", () => {
    // Reid: the general remembers the officer only, so one of the two earlier stages.
    expect([["officer", true], ["boy", false]].filter(([, remembers]) => remembers)).toHaveLength(
      key("personal-identity-1"),
    );
    // A chain of four where each remembers only its predecessor: direct memory reaches one stage.
    expect(1).toBe(key("personal-identity-10"));
    // Fission: both hemisphere survivors are continuous with you.
    expect(["left", "right"]).toHaveLength(key("personal-identity-3"));
    // A chain from age 10: B, C and D each linked to the stage before.
    expect(["B", "C", "D"]).toHaveLength(key("personal-identity-5"));
    expect(expectedUtility([[0.5, 100], [0.5, 0]])).toBe(key("consequentialism-7"));
    expect(expectedUtility([[0.6, 100], [0.4, 0]])).toBeCloseTo(key("consequentialism-1"), 9);
    expect(expectedUtility([[0.9, 20], [0.1, -30]])).toBeCloseTo(key("consequentialism-2"), 9);
    expect(expectedUtility([[0.7, 10], [0.3, -20]])).toBeCloseTo(1, 9); // worked example
    expect(expectedUtility([[0.8, 50], [0.2, -10]])).toBeCloseTo(key("consequentialism-10"), 9);
    expect(5 - 1).toBe(key("consequentialism-3"));
    expect(5 - 1).toBe(key("kant-and-the-footbridge-1"));
    expect(4 + 4 - 5).toBe(3); // policy X total
    expect(2 + 2 + 2 - (4 + 4 - 5)).toBe(key("consequentialism-6"));
  });

  it("recomputes the virtue and social contract keys", () => {
    expect((2 + 10) / 2).toBe(key("virtue-and-the-mean-1"));
    expect((2 + 10) / 2 - 5).toBe(key("virtue-and-the-mean-4"));
    expect(10 - (4 + 12) / 2).toBe(key("virtue-and-the-mean-10"));
    // Hook: the smallest pile is largest when the piles are equal.
    const piles = [] as number[][];
    for (let a = 0; a <= 12; a++) for (let b = a; a + b <= 12; b++) piles.push([a, b, 12 - a - b]);
    expect(Math.max(...piles.map((p) => Math.min(...p)))).toBe(key("the-social-contract-7"));
    expect(mean([10, 40, 70])).toBe(key("the-social-contract-2"));
    expect(mean([25, 30, 35])).toBe(30);
    expect(0.25 * 30 + 0.75 * 50).toBe(key("the-social-contract-4"));
    expect(mean([15, 30, 60]) - mean([20, 25, 30])).toBe(key("the-social-contract-11"));
    // Maximin picks B (worst 25 against 10); the average picks A (40 against 30).
    expect(Math.min(25, 30, 35) > Math.min(10, 40, 70)).toBe(true);
    expect(mean([10, 40, 70]) > mean([25, 30, 35])).toBe(true);
    expect(mean([20, 45, 95])).toBeGreaterThan(mean([10, 40, 70]));
  });

  it("gives every choice item exactly one correct option", () => {
    const choiceItems = bundle.questions.filter((q) => (q.choices?.length ?? 0) > 0);
    expect(choiceItems.length).toBeGreaterThan(20);
    for (const q of choiceItems) expect(correctChoices(q), q.id).toHaveLength(1);
  });

  it("never lets a misconception match the key", () => {
    for (const q of bundle.questions) {
      for (const m of q.misconceptions ?? []) {
        const { numeric, choiceIds, textIdeas } = m.match;
        if (q.answerAuthority.kind === "numeric")
          expect(numeric ?? [], q.id).not.toContain(q.answerAuthority.value);
        if (choiceIds) expect(choiceIds, q.id).not.toContain(correctChoices(q)[0]);
        if (textIdeas && q.answerAuthority.kind === "text")
          for (const idea of textIdeas) expect(correct(q, idea), `${q.id}: ${idea}`).toBe(false);
      }
    }
  });

  it("marks the intended answers on the new yes/no and one-word items", () => {
    const yes = ["validity-and-soundness-10", "scepticism-and-closure-7", "personal-identity-7", "personal-identity-11", "functionalism-and-the-chinese-room-7"];
    const no = ["validity-and-soundness-7", "fallacies-and-charity-7", "justified-true-belief-7", "mind-and-body-7", "virtue-and-the-mean-7", "kant-and-the-footbridge-10"];
    for (const id of yes) {
      expect(correct(question(id), "yes"), id).toBe(true);
      expect(correct(question(id), "no"), id).toBe(false);
    }
    for (const id of no) {
      expect(correct(question(id), "no"), id).toBe(true);
      expect(correct(question(id), "yes"), id).toBe(false);
    }
    expect(correct(question("scepticism-and-closure-10"), "valid")).toBe(true);
    expect(correct(question("scepticism-and-closure-10"), "invalid")).toBe(false);
    expect(correct(question("mind-and-body-10"), "invalid")).toBe(true);
    expect(correct(question("mind-and-body-10"), "valid")).toBe(false);
    expect(correct(question("kant-and-the-footbridge-7"), "B")).toBe(true);
    expect(correct(question("kant-and-the-footbridge-7"), "A")).toBe(false);
    expect(correct(question("justified-true-belief-10"), "justification")).toBe(true);
  });
});
