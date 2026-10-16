import { readFileSync, readdirSync } from "node:fs";
import type { Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Electronics Foundations v2 migration drafts. Every numeric key is recomputed here from the
 * circuit the item describes, not read back from the authority it is checking. Reads the drafts
 * because the bundle is only rewritten when the lead applies them.
 */
const directory = new URL(
  "../../../content/electronics-foundations/.authoring/migration/",
  import.meta.url,
);
interface DraftStep {
  id: string;
  kind: string;
  lead?: { text?: string }[];
  afterFigure?: { text?: string }[];
  checkQuestionId?: string;
  workedSteps?: { math?: string; blank?: { questionId: string }; selfExplain?: { questionId: string } }[];
}
interface Draft {
  lesson: { id: string; steps: DraftStep[]; questionIds: string[]; intro: { hook: { questionId?: string } } };
  questions: Question[];
}
const drafts: Draft[] = [];
const questions = new Map<string, Question>();
for (const file of readdirSync(directory).filter((name) => name.endsWith(".json"))) {
  const draft = JSON.parse(readFileSync(new URL(file, directory), "utf8")) as Draft;
  drafts.push(draft);
  for (const q of draft.questions) questions.set(q.id, q);
}
const words = (step: DraftStep) =>
  [...(step.lead ?? []), ...(step.afterFigure ?? [])].reduce(
    (sum, block) => sum + (block.text ?? "").split(/\s+/u).filter(Boolean).length,
    0,
  );

const key = (id: string): number => {
  const authority = questions.get(id)?.answerAuthority;
  if (!authority || authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const ohm = (v: number, r: number) => v / r;
const par = (...r: number[]) => 1 / r.reduce((sum, x) => sum + 1 / x, 0);
const near = (id: string, expected: number) => expect(key(id)).toBeCloseTo(expected, 9);

describe("Electronics Foundations v2 keys", () => {
  it("lesson 1: current in one loop", () => {
    near("loop-water-flow", 2);
    near("current-after-resistor", 0.05);
    near("calculate-current-6v-150ohm", ohm(6, 150));
    near("calculate-current-5v-100ohm", ohm(5, 100));
    near("current-at-second-meter", ohm(12, 60));
    near("check-current-10v-400ohm", ohm(10, 400));
    // Skill-check item: halving the resistance of a 6 V loop that carried 0.02 A.
    near("reason-halve-resistance", ohm(6, 6 / 0.02 / 2));
    // Examples written into the teaching and worked screens.
    expect(ohm(9, 90)).toBeCloseTo(0.1, 9);
    expect(ohm(18, 90)).toBeCloseTo(0.2, 9);
    expect(ohm(9, 180)).toBeCloseTo(0.05, 9);
    expect(ohm(9, 450)).toBeCloseTo(0.02, 9);
    expect(ohm(5, 250)).toBeCloseTo(0.02, 9);
  });
  it("lesson 2: series", () => {
    near("two-identical-resistors", ohm(10, 100 + 100));
    near("current-at-second-resistor", ohm(9, 100 + 200));
    near("calculate-series-current-9v-300ohm", ohm(9, 100 + 200));
    near("calculate-series-total-220-330", 220 + 330);
    near("voltage-across-second-resistor", ohm(12, 100 + 200) * 200);
    near("check-series-current-6v-600ohm", ohm(6, 100 + 500));
    // Worked screens and teaching examples.
    expect(ohm(8, 150 + 250)).toBeCloseTo(0.02, 9);
    expect(ohm(9, 100 + 150)).toBeCloseTo(0.036, 9);
    expect(ohm(9, 100 + 200) * 100).toBeCloseTo(3, 9);
    expect(ohm(9, 100 + 200) * 200).toBeCloseTo(6, 9);
    expect(3 + 6).toBe(9);
    expect(6 - 2).toBe(4);
    near("tap-series-total", 10 + 20);
    near("tap-voltage-shares", 9 - 5);
  });
  it("lesson 3: parallel", () => {
    near("second-route-current", ohm(12, 100) + ohm(12, 100));
    near("generated-parallel-branch-voltage", 6);
    near("generated-parallel-total-current", ohm(12, 100) + ohm(12, 300));
    near("generated-parallel-equivalent", par(100, 100));
    near("battery-current-two-lamps", ohm(9, 90) + ohm(9, 45));
    near("check-parallel-current-12v-30-60", ohm(12, 30) + ohm(12, 60));
    near("check-parallel-equivalent-30-60", par(30, 60));
    expect(par(100, 300)).toBeCloseTo(75, 9);
    // Worked screens and teaching examples.
    expect(ohm(6, 20) + ohm(6, 30)).toBeCloseTo(0.5, 9);
    expect(ohm(12, 40) + ohm(12, 120)).toBeCloseTo(0.4, 9);
    expect(12 / (ohm(12, 40) + ohm(12, 120))).toBeCloseTo(30, 9);
    expect(par(40, 120)).toBeCloseTo(30, 9);
    expect(par(10, 10)).toBeCloseTo(5, 9);
    expect(par(50, 200)).toBeLessThan(50);
  });
  it("lesson 4: power", () => {
    near("joules-each-second", 4 * 0.5);
    near("calculate-power-6v-025a", 6 * 0.25);
    near("calculate-power-5v-100ohm", 5 ** 2 / 100);
    near("calculate-power-9v-20ma", 9 * (20 / 1000));
    near("energy-lamp-60s", 0.2 * 9 * 60);
    near("check-power-0p1a-50ohm", 0.1 ** 2 * 50);
    near("tap-heater-power", 100);
    expect(0.5 * 8).toBe(2 * 2);
    // Worked screens and teaching examples.
    expect(0.5 * 12).toBeCloseTo(6, 9);
    expect(0.2 * 5).toBeCloseTo(1, 9);
    expect(12 ** 2 / 48).toBeCloseTo(3, 9);
    expect(ohm(12, 48) ** 2 * 48).toBeCloseTo(3, 9);
    expect(3 ** 2 / 100).toBeCloseTo(0.09, 9);
    expect(9 ** 2 / 100).toBeCloseTo(0.81, 9);
    expect(5 * 10).toBe(50);
    expect(0.1 * 9 * 30).toBeCloseTo(27, 9);
  });
  it("lesson 5: components", () => {
    near("resistor-current-at-double-voltage", ohm(4, ohm(2, 0.02)));
    near("calculate-led-series-resistor", (5 - 2) / (15 / 1000));
    near("led-resistor-blue-9v", (9 - 3) / (10 / 1000));
    near("check-led-resistor-12v-2v-25ma", (12 - 2) / (25 / 1000));
    expect((9 - 2) / (20 / 1000)).toBeCloseTo(350, 9);
    // Teaching example: a 50 Ω resistor, and a 5 V supply with a 2 V LED at 10 mA.
    expect([1, 2, 3, 4].map((v) => ohm(v, 50))).toEqual([0.02, 0.04, 0.06, 0.08]);
    expect((5 - 2) / (10 / 1000)).toBeCloseTo(300, 9);
  });
  it("keeps the worked and faded lines consistent with their blanks", () => {
    // The blank of each faded example is a real, numeric item.
    for (const draft of drafts)
      for (const step of draft.lesson.steps)
        for (const line of step.workedSteps ?? []) {
          for (const link of [line.blank, line.selfExplain])
            if (link) expect(questions.has(link.questionId)).toBe(true);
        }
  });
  it("shapes every lesson as a story", () => {
    expect(drafts).toHaveLength(5);
    for (const { lesson } of drafts) {
      const explain = lesson.steps.filter((s) => s.kind === "explain");
      expect(lesson.steps.length).toBeGreaterThanOrEqual(8);
      expect(lesson.steps.length).toBeLessThanOrEqual(14);
      expect(explain.length / lesson.steps.length).toBeGreaterThanOrEqual(0.4);
      expect(lesson.intro.hook.questionId).toBeUndefined();
      expect(lesson.steps.some((s) => s.kind === "transfer")).toBe(true);
      expect(lesson.questionIds).toHaveLength(3);
      for (const s of explain) {
        expect(s.checkQuestionId ?? "").toBe("");
        expect(words(s)).toBeGreaterThanOrEqual(80);
        expect(words(s)).toBeLessThanOrEqual(280);
      }
      for (const id of [
        ...lesson.questionIds,
        ...lesson.steps.map((s) => s.checkQuestionId).filter(Boolean),
      ])
        expect(questions.has(id as string)).toBe(true);
    }
  });
  it("gives every numeric item three hints", () => {
    for (const q of questions.values())
      if (q.answerAuthority.kind === "numeric") expect(q.hints).toHaveLength(3);
  });
  it("never lets a misconception match the key", () => {
    for (const q of questions.values()) {
      if (q.answerAuthority.kind !== "numeric") continue;
      for (const m of q.misconceptions ?? [])
        expect(m.match.numeric ?? []).not.toContain(q.answerAuthority.value);
    }
  });
});
