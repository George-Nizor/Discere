import { existsSync, readFileSync } from "node:fs";
import { auditArgument } from "@discere/activity-engine";
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
// The candidate carries the story-format rewrites until they are published; after that it matches
// the published bundle, so preferring it keeps this file checking the newest content.
const bundle: CourseBundle = existsSync(candidatePath)
  ? (JSON.parse(readFileSync(candidatePath, "utf8")) as CourseBundle)
  : published;

const question = (n: string): Question => bundle.questions.find((q) => q.id === `phil-${n}`)!;
const lessonOf = (id: string) => bundle.lessons.find((l) => l.id === id)!;
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
      expect(lesson.steps.length, lesson.id).toBeLessThanOrEqual(14);
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

  it("keeps the story shape in the three argument lessons", () => {
    for (const id of ["reconstructing-arguments", "validity-and-soundness", "fallacies-and-charity"]) {
      const lesson = lessonOf(id);
      const steps = lesson.steps;
      const teaching = steps.filter((s) => s.kind === "explain" && !s.checkQuestionId);
      const asking = steps.filter((s) => s.checkQuestionId);
      expect(steps.length, id).toBeGreaterThanOrEqual(8);
      expect(steps.length, id).toBeLessThanOrEqual(12);
      expect(teaching.length / steps.length, id).toBeGreaterThanOrEqual(0.4);
      expect(asking.length, id).toBeGreaterThanOrEqual(3);
      expect(asking.length, id).toBeLessThanOrEqual(6);
      expect(steps[0]!.kind, id).toBe("explain");
      expect(steps.some((s) => s.kind === "transfer" && s.checkQuestionId), id).toBe(true);
      expect(steps.some((s) => s.diagram), id).toBe(true);
      expect(lesson.intro?.hook.questionId, id).toBeUndefined();
      expect(lesson.recap?.nextHook, id).toBeTruthy();
      let run = 0;
      for (const step of steps) {
        run = step.kind === "explain" && !step.checkQuestionId ? run + 1 : 0;
        expect(run, `${id}/${step.id}`).toBeLessThanOrEqual(3);
        // A figure beside a question never shows its results before the response.
        if (step.checkQuestionId && step.diagram)
          expect(step.answerVisibility, `${id}/${step.id}`).toBe("hidden-until-response");
      }
    }
  });

  it("keeps the story shape in the five knowledge and mind lessons", () => {
    const ids = [
      "justified-true-belief",
      "scepticism-and-closure",
      "bayesian-evidence",
      "mind-and-body",
      "functionalism-and-the-chinese-room",
    ];
    const count = (text: string) => text.split(/\s+/u).filter(Boolean).length;
    const prose = (blocks: Array<{ kind: string; text?: string }> | undefined) =>
      (blocks ?? []).map((b) => b.text ?? "").join(" ");
    for (const id of ids) {
      const lesson = lessonOf(id);
      const steps = lesson.steps;
      const teaching = steps.filter((s) => s.kind === "explain" && !s.checkQuestionId);
      const asking = steps.filter(
        (s) =>
          s.checkQuestionId ||
          (s.workedSteps ?? []).some((line) => line.blank?.questionId || line.selfExplain?.questionId),
      );
      expect(steps.length, id).toBeGreaterThanOrEqual(8);
      expect(steps.length, id).toBeLessThanOrEqual(14);
      expect(teaching.length / steps.length, id).toBeGreaterThanOrEqual(0.4);
      expect(asking.length, id).toBeGreaterThanOrEqual(3);
      expect(asking.length, id).toBeLessThanOrEqual(7);
      expect(steps[0]!.kind, id).toBe("explain");
      expect(steps.some((s) => s.kind === "transfer" && s.checkQuestionId), id).toBe(true);
      expect(steps.some((s) => s.diagram), id).toBe(true);
      expect(lesson.intro?.hook.questionId, id).toBeUndefined();
      const opener = count(prose(lesson.intro?.hook.blocks));
      expect(opener, id).toBeGreaterThanOrEqual(120);
      expect(opener, id).toBeLessThanOrEqual(200);
      expect(count(lesson.intro!.promise), id).toBeLessThanOrEqual(25);
      expect(lesson.recap?.nextHook, id).toBeTruthy();
      for (const step of teaching) {
        const words = count(prose(step.lead)) + count(prose(step.afterFigure));
        expect(words, `${id}/${step.id}`).toBeGreaterThanOrEqual(80);
        expect(words, `${id}/${step.id}`).toBeLessThanOrEqual(280);
      }
      let run = 0;
      for (const step of steps) {
        run = step.kind === "explain" && !step.checkQuestionId ? run + 1 : 0;
        expect(run, `${id}/${step.id}`).toBeLessThanOrEqual(3);
        if ((step.checkQuestionId || step.kind === "faded_example") && step.diagram)
          expect(step.answerVisibility, `${id}/${step.id}`).toBe("hidden-until-response");
      }
    }
    // Each recap leads into the next lesson's opener, in the order the course teaches them.
    expect(lessonOf("fallacies-and-charity").recap?.nextHook).toMatch(/knowledge/u);
    expect(lessonOf("justified-true-belief").recap?.nextHook).toMatch(/sceptic/u);
    expect(lessonOf("scepticism-and-closure").recap?.nextHook).toMatch(/degrees/u);
    expect(lessonOf("bayesian-evidence").recap?.nextHook).toMatch(/mind/u);
    expect(lessonOf("mind-and-body").recap?.nextHook).toMatch(/machine/u);
  });

  it("recomputes the Gettier lesson's checklist for each person it names", () => {
    const stepFigure = (stepId: string, caseId: string) => {
      const diagram = lessonOf("justified-true-belief").steps.find((s) => s.id === stepId)!.diagram;
      if (diagram?.type !== "philosophy_explorer") throw new Error(`${stepId} has no philosophy figure`);
      const model = diagram.cases.find((c) => c.id === caseId)!.model;
      if (model.kind !== "knowledge_case") throw new Error(`${stepId}/${caseId} is not a knowledge case`);
      return model;
    };
    const conditionsMet = (m: { believes: boolean; justified: boolean; beliefTrue: boolean }) =>
      [m.believes, m.justified, m.beliefTrue].filter(Boolean).length;
    // Smith's coins meets all three conditions, which is the key to the first item.
    expect(conditionsMet(stepFigure("smiths-coins", "smith"))).toBe(key("justified-true-belief-1"));
    // Tess lacks justification only, and Kofi meets every condition with his evidence connected.
    const tess = stepFigure("three-conditions", "tess");
    expect([tess.believes, tess.beliefTrue, tess.justified]).toEqual([true, true, false]);
    const kofi = stepFigure("three-conditions", "kofi");
    expect(conditionsMet(kofi)).toBe(3);
    expect(kofi.evidenceConnected).toBe(true);
    // The Gettier cases pass the checklist with the evidence cut off from the fact.
    for (const [step, id] of [
      ["true-by-luck", "smith"],
      ["no-false-lemmas", "ford"],
      ["no-false-lemmas", "smith"],
      ["the-barn-county", "barn"],
      ["the-stopped-clock", "ana"],
    ] as const) {
      const model = stepFigure(step, id);
      expect(conditionsMet(model), `${step}/${id}`).toBe(3);
      expect(model.evidenceConnected, `${step}/${id}`).toBe(false);
    }
    expect(conditionsMet(stepFigure("the-stopped-clock", "ravi"))).toBe(3);
    expect(stepFigure("the-stopped-clock", "ravi").evidenceConnected).toBe(true);
  });

  it("recomputes the sceptic's truth-table counts from the forms in the lesson", () => {
    const imp = (a: boolean, b: boolean) => !a || b;
    const rows = [true, false].flatMap((p) => [true, false].map((q) => ({ p, q })));
    // Modus tollens, the sceptic's form: one row keeps both premises true and ¬p holds in it.
    const tollens = rows.filter(({ p, q }) => imp(p, q) && !q);
    expect(tollens).toHaveLength(key("scepticism-and-closure-3"));
    expect(tollens.every(({ p }) => !p)).toBe(true);
    // The two tempting variants on the testing screen each have a counterexample row.
    const denying = rows.filter(({ p, q }) => imp(p, q) && !p);
    expect(denying).toHaveLength(2);
    expect(denying.filter(({ q }) => q)).toHaveLength(1); // ¬q fails where q is true
    const affirming = rows.filter(({ p, q }) => imp(p, q) && q);
    expect(affirming).toHaveLength(2);
    expect(affirming.filter(({ p }) => !p)).toHaveLength(1); // p fails where p is false
    // Moore's form, modus ponens, has no counterexample.
    expect(rows.filter(({ p, q }) => imp(p, q) && p && !q)).toHaveLength(0);
    const audited = (stepId: string, caseId: string) => {
      const diagram = lessonOf("scepticism-and-closure").steps.find((s) => s.id === stepId)!.diagram;
      if (diagram?.type !== "philosophy_explorer") throw new Error(`${stepId} has no philosophy figure`);
      const model = diagram.cases.find((c) => c.id === caseId)!.model;
      if (model.kind !== "argument_map") throw new Error(`${stepId}/${caseId} is not an argument map`);
      const audit = auditArgument(model);
      return { premisesTrue: audit.premisesTrueRows, counter: audit.counterexamples.length };
    };
    expect(audited("testing-the-form", "first")).toEqual({ premisesTrue: 2, counter: 1 });
    expect(audited("testing-the-form", "second")).toEqual({ premisesTrue: 2, counter: 1 });
    expect(audited("no-counterexample", "first")).toEqual({ premisesTrue: key("scepticism-and-closure-3"), counter: 0 });
    expect(audited("the-sceptics-argument", "first")).toEqual({ premisesTrue: 1, counter: 0 });
    expect(audited("the-sceptics-argument", "second")).toEqual({ premisesTrue: 1, counter: 0 });
    expect(audited("the-standoff", "first")).toEqual({ premisesTrue: 1, counter: 0 });
  });

  it("recomputes the town counts, odds and symbols the Bayesian lesson states in prose", () => {
    const town = (n: number, prior: number, hit: number, alarm: number) => {
      const ill = n * prior;
      const well = n - ill;
      const flaggedIll = ill * hit;
      const flaggedWell = well * alarm;
      return { ill, well, flaggedIll, flaggedWell, flagged: flaggedIll + flaggedWell };
    };
    const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 9);
    // Counting screen and prior-and-posterior screen: 200 ill, 120 and 40 flagged, 75% of 160.
    const first = town(1000, 0.2, 0.6, 0.05);
    near(first.well, 800);
    near(first.flaggedIll, 120);
    near(first.flaggedWell, 40);
    near(first.flagged, 160);
    near((100 * first.flaggedIll) / first.flagged, 75);
    // Opening town of the lesson: 90 flagged from each group, 180 in all.
    near(town(1000, 0.1, 0.9, 0.1).flagged, key("bayesian-evidence-7"));
    // Rare-condition screen: 18 ill flagged, 49 false alarms, 67 flagged, about 27%.
    const rare = town(1000, 0.02, 0.9, 0.05);
    near(rare.flaggedIll, 18);
    near(rare.flaggedWell, 49);
    near(rare.flagged, 67);
    expect(Math.round((100 * rare.flaggedIll) / rare.flagged)).toBe(27);
    // Odds screen: prior odds 1 to 4, ratio 0.6 ÷ 0.05 = 12, posterior odds 3 to 1, which is 75%.
    const ratio = 0.6 / 0.05;
    near(ratio, 12);
    near((1 / 4) * ratio, 3);
    near((3 / (3 + 1)) * 100, 75);
    // Symbols screen: P(E) = 0.2 × 0.6 + 0.8 × 0.05 = 0.16 and P(H | E) = 0.12 ÷ 0.16.
    near(0.2 * 0.6 + 0.8 * 0.05, 0.16);
    near((0.2 * 0.6) / (0.2 * 0.6 + 0.8 * 0.05), 0.75);
    // The rare-condition item sits on a town with a 1% prior, and the worked example on 20%.
    near(town(1000, 0.01, 0.9, 0.1).flagged, key("bayesian-evidence-2"));
    const worked = town(1000, 0.2, 0.8, 0.05);
    near((100 * worked.flaggedIll) / worked.flagged, 80);
    // Every bayes_grid figure in the lesson is a thousand-person town.
    const grids = lessonOf("bayesian-evidence").steps.flatMap((s) =>
      s.diagram?.type === "philosophy_explorer"
        ? s.diagram.cases.flatMap((c) => (c.model.kind === "bayes_grid" ? [c.model] : []))
        : [],
    );
    expect(grids.length).toBeGreaterThan(6);
    for (const g of grids) expect(g.population).toBe(1000);
    // The teaching figures carry the numbers the prose quotes.
    const teachingGrid = (stepId: string, caseId: string) => {
      const diagram = lessonOf("bayesian-evidence").steps.find((s) => s.id === stepId)!.diagram;
      if (diagram?.type !== "philosophy_explorer") throw new Error("no figure");
      const model = diagram.cases.find((c) => c.id === caseId)!.model;
      if (model.kind !== "bayes_grid") throw new Error("not a bayes grid");
      return [model.prior, model.hitRate, model.falseAlarmRate];
    };
    expect(teachingGrid("counting-the-flagged", "town")).toEqual([0.2, 0.6, 0.05]);
    expect(teachingGrid("when-the-condition-is-rare", "rare")).toEqual([0.02, 0.9, 0.05]);
  });

  it("checks Elisabeth's argument and the machine table that the mind lessons draw", () => {
    const imp = (a: boolean, b: boolean) => !a || b;
    const bools = [true, false];
    const rows3 = bools.flatMap((p) => bools.flatMap((q) => bools.map((r) => ({ p, q, r }))));
    const premisesTrue = rows3.filter(({ p, q, r }) => imp(p, q) && imp(q, r) && !r);
    expect(rows3).toHaveLength(8);
    expect(premisesTrue).toHaveLength(key("mind-and-body-3"));
    expect(premisesTrue.every(({ p }) => !p)).toBe(true);
    const figure = lessonOf("mind-and-body").steps.find((s) => s.id === "testing-elisabeth")!.diagram;
    if (figure?.type !== "philosophy_explorer") throw new Error("no figure");
    const elisabeth = figure.cases.find((c) => c.id === "first")!.model;
    if (elisabeth.kind !== "argument_map") throw new Error("not an argument map");
    const audit = auditArgument(elisabeth);
    expect(audit.rows).toHaveLength(8);
    expect(audit.premisesTrueRows).toBe(1);
    expect(audit.counterexamples).toHaveLength(0);
    // Drinks machine: the same table in every material, run on the sequences the lesson uses.
    const tables = (stepId: string) => {
      const diagram = lessonOf("functionalism-and-the-chinese-room").steps.find((s) => s.id === stepId)!.diagram;
      if (diagram?.type !== "philosophy_explorer") throw new Error("no figure");
      return diagram.cases.flatMap((c) => (c.model.kind === "machine_table" ? [c.model] : []));
    };
    for (const stepId of ["a-drinks-machine", "three-coins", "twenty-ten-twenty", "many-makers"]) {
      const found = tables(stepId);
      expect(found.length, stepId).toBeGreaterThanOrEqual(2);
      for (const m of found) {
        expect(JSON.stringify(m.transitions), stepId).toBe(JSON.stringify(found[0]!.transitions));
        const run = (coins: string[]) => {
          let state = m.start;
          const out: string[] = [];
          for (const coin of coins) {
            const t = m.transitions.find((x) => x.from === state && x.input === coin)!;
            state = t.to;
            if (t.output) out.push(t.output);
          }
          return { state, out, cans: out.filter((o) => o.startsWith("can")).length };
        };
        expect(run(["10p", "20p", "10p"])).toMatchObject({ state: "S1", out: ["can + 10p"] });
        expect(run(["10p", "10p", "10p"]).cans).toBe(key("functionalism-and-the-chinese-room-1"));
        expect(run(["20p", "10p", "20p"]).cans).toBe(key("functionalism-and-the-chinese-room-2"));
        expect(run(["20p", "20p", "10p", "10p"]).cans).toBe(key("functionalism-and-the-chinese-room-10"));
      }
    }
  });

  it("recomputes the counts and times the argument lessons state in prose", () => {
    // Doubling: two letters give four rows, three give eight, four give sixteen, ten over a thousand.
    expect([2 ** 2, 2 ** 3, 2 ** 4]).toEqual([4, 8, 16]);
    expect(2 ** 10).toBeGreaterThan(1000);
    // Maya's chain: leave the restaurant half an hour before seven, sit down an hour before that.
    const minutes = (h: number, m: number) => h * 60 + m;
    expect(minutes(19, 0) - 30).toBe(minutes(18, 30));
    expect(minutes(18, 30) - 60).toBe(minutes(17, 30));
    // Counting claims: the bridge passage has two premises, the freezer chain two conclusions.
    expect(key("reconstructing-arguments-1")).toBe(2);
    expect(key("reconstructing-arguments-4")).toBe(2);
  });

  it("recomputes every truth-table figure in the validity lesson from its own formulas", () => {
    const imp = (a: boolean, b: boolean) => !a || b;
    const bools = [true, false];
    const rows2 = bools.flatMap((p) => bools.map((q) => [p, q] as const));
    const rows3 = rows2.flatMap(([p, q]) => bools.map((r) => [p, q, r] as const));
    const tally = (
      rows: ReadonlyArray<readonly boolean[]>,
      premises: (v: readonly boolean[]) => boolean[],
      conclusion: (v: readonly boolean[]) => boolean,
    ) => {
      const supported = rows.filter((v) => premises(v).every(Boolean));
      return { premisesTrue: supported.length, counter: supported.filter((v) => !conclusion(v)).length };
    };
    const figure = (stepId: string, caseId: string) => {
      const diagram = lessonOf("validity-and-soundness").steps.find((s) => s.id === stepId)!.diagram;
      if (diagram?.type !== "philosophy_explorer") throw new Error(`${stepId} has no philosophy figure`);
      const model = diagram.cases.find((c) => c.id === caseId)!.model;
      if (model.kind !== "argument_map") throw new Error(`${stepId}/${caseId} is not an argument map`);
      const audit = auditArgument(model);
      return { premisesTrue: audit.premisesTrueRows, counter: audit.counterexamples.length, rows: audit.rows.length };
    };
    const modusPonens = tally(rows2, ([p, q]) => [imp(p!, q!), p!], ([, q]) => q!);
    const denyingAntecedent = tally(rows2, ([p, q]) => [imp(p!, q!), !p], ([, q]) => !q);
    const affirming = tally(rows2, ([p, q]) => [imp(p!, q!), q!], ([p]) => p!);
    const disjunctive = tally(rows2, ([p, q]) => [p! || q!, !p], ([, q]) => q!);
    const chain = tally(rows3, ([p, q, r]) => [imp(p!, q!), imp(q!, r!)], ([p, , r]) => imp(p!, r!));
    const reversed = tally(rows3, ([p, q, r]) => [imp(p!, q!), imp(q!, r!)], ([p, , r]) => imp(r!, p!));
    const shared = tally(rows3, ([p, q, r]) => [imp(p!, q!), imp(r!, q!)], ([p, , r]) => imp(p!, r!));

    expect(modusPonens).toEqual({ premisesTrue: 1, counter: 0 });
    expect(figure("test-a-form", "first")).toMatchObject(modusPonens);
    expect(figure("test-a-form", "second")).toMatchObject(denyingAntecedent);
    expect(denyingAntecedent.counter).toBe(1);
    // The pavement form: both premises true in two rows, one of them a counterexample.
    expect(affirming).toEqual({ premisesTrue: key("validity-and-soundness-2"), counter: 1 });
    expect(figure("count-the-rows", "pavement")).toMatchObject(affirming);
    expect(figure("count-the-rows", "lamp")).toMatchObject(affirming);
    expect(figure("forms-that-turn-up", "mp")).toMatchObject(modusPonens);
    expect(figure("forms-that-turn-up", "ac")).toMatchObject(affirming);
    expect(figure("forms-that-turn-up", "ds")).toMatchObject(disjunctive);
    expect(disjunctive.counter).toBe(0);
    // The chain is valid; checking only the two rows where p → r fails settles it.
    expect(rows3.filter(([p, , r]) => p! && !r!)).toHaveLength(2);
    expect(chain.counter).toBe(0);
    expect(figure("three-letters-eight-rows", "chain")).toMatchObject({ ...chain, rows: 8 });
    expect(reversed.counter).toBe(2);
    expect(figure("three-letters-eight-rows", "reverse")).toMatchObject(reversed);
    // The transfer item and both of its figure cases.
    expect(shared.counter).toBe(key("validity-and-soundness-4"));
    expect(figure("shared-consequent", "alarm")).toMatchObject(shared);
    expect(figure("shared-consequent", "kettle")).toMatchObject(shared);
  });

  it("marks the free-text answers rewritten in the argument lessons", () => {
    const accepts = (id: string, answer: string) => correct(question(id), answer);
    // Reconstructing arguments: the conclusion of the playing-field passage, now typed.
    for (const right of [
      "The council should not sell the playing field.",
      "The council shouldn't sell the playing field",
      "don't sell the playing field",
    ])
      expect(accepts("reconstructing-arguments-2", right), right).toBe(true);
    for (const wrong of [
      "It is the only open space in the ward",
      "Selling a ward's only open space breaks the council's planning policy",
      "The council should sell the playing field",
    ])
      expect(accepts("reconstructing-arguments-2", wrong), wrong).toBe(false);
    // Validity: the pavement form is invalid; "not valid" says the same.
    for (const right of ["invalid", "Invalid: another cause", "not valid"])
      expect(accepts("validity-and-soundness-1", right), right).toBe(true);
    expect(accepts("validity-and-soundness-1", "valid")).toBe(false);
    // The badge item: no gap is possible.
    for (const right of ["no", "No, she must have got one", "not possible", "impossible"])
      expect(accepts("validity-and-soundness-7", right), right).toBe(true);
    expect(accepts("validity-and-soundness-7", "yes")).toBe(false);
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

  it("keeps the story shape in the five ethics and identity lessons", () => {
    const ids = [
      "personal-identity",
      "consequentialism",
      "kant-and-the-footbridge",
      "virtue-and-the-mean",
      "the-social-contract",
    ];
    const count = (text: string) => text.split(/\s+/u).filter(Boolean).length;
    const prose = (blocks: Array<{ kind: string; text?: string }> | undefined) =>
      (blocks ?? []).map((b) => b.text ?? "").join(" ");
    for (const id of ids) {
      const lesson = lessonOf(id);
      const steps = lesson.steps;
      const teaching = steps.filter((s) => s.kind === "explain" && !s.checkQuestionId);
      const asking = steps.filter(
        (s) =>
          s.checkQuestionId ||
          (s.workedSteps ?? []).some((line) => line.blank?.questionId || line.selfExplain?.questionId),
      );
      expect(steps.length, id).toBeGreaterThanOrEqual(8);
      expect(steps.length, id).toBeLessThanOrEqual(14);
      expect(teaching.length / steps.length, id).toBeGreaterThanOrEqual(0.4);
      expect(asking.length, id).toBeGreaterThanOrEqual(3);
      expect(asking.length, id).toBeLessThanOrEqual(7);
      expect(steps[0]!.kind, id).toBe("explain");
      expect(steps.some((s) => s.kind === "transfer" && s.checkQuestionId), id).toBe(true);
      expect(steps.some((s) => s.diagram), id).toBe(true);
      expect(lesson.intro?.hook.questionId, id).toBeUndefined();
      const opener = count(prose(lesson.intro?.hook.blocks));
      expect(opener, id).toBeGreaterThanOrEqual(120);
      expect(opener, id).toBeLessThanOrEqual(200);
      expect(count(lesson.intro!.promise), id).toBeLessThanOrEqual(25);
      for (const step of teaching) {
        const words = count(prose(step.lead)) + count(prose(step.afterFigure));
        expect(words, `${id}/${step.id}`).toBeGreaterThanOrEqual(80);
        expect(words, `${id}/${step.id}`).toBeLessThanOrEqual(280);
      }
      let run = 0;
      for (const step of steps) {
        run = step.kind === "explain" && !step.checkQuestionId ? run + 1 : 0;
        expect(run, `${id}/${step.id}`).toBeLessThanOrEqual(3);
        if (step.kind !== "explain") expect(count(prose(step.lead)), `${id}/${step.id}`).toBeLessThanOrEqual(60);
        if ((step.checkQuestionId || step.kind === "faded_example") && step.diagram)
          expect(step.answerVisibility, `${id}/${step.id}`).toBe("hidden-until-response");
      }
    }
    // Each recap leads into the next lesson's opener, in the order the course teaches them.
    expect(lessonOf("functionalism-and-the-chinese-room").recap?.nextHook).toMatch(/photographs/u);
    expect(lessonOf("personal-identity").recap?.nextHook).toMatch(/coin/u);
    expect(lessonOf("consequentialism").recap?.nextHook).toMatch(/footbridge/u);
    expect(lessonOf("kant-and-the-footbridge").recap?.nextHook).toMatch(/coach/u);
    expect(lessonOf("virtue-and-the-mean").recap?.nextHook).toMatch(/government/u);
    expect(lessonOf("the-social-contract").recap?.nextHook).toBeTruthy();
  });

  it("recomputes the identity keys from the stage links the figures draw", () => {
    type Persistence = { scenario: string; stages: Array<{ id: string }>; links: Array<{ from: string; to: string; relation: string }> };
    const figure = (lessonId: string, stepId: string, caseId: string): Persistence => {
      const diagram = lessonOf(lessonId).steps.find((s) => s.id === stepId)!.diagram;
      if (diagram?.type !== "philosophy_explorer") throw new Error(`${stepId} has no philosophy figure`);
      const model = diagram.cases.find((c) => c.id === caseId)!.model;
      if (model.kind !== "persistence") throw new Error(`${stepId}/${caseId} is not a persistence figure`);
      return model as Persistence;
    };
    const memory = (m: Persistence) => m.links.filter((l) => l.relation === "memory");
    // Reid: the general is linked directly to the officer only, whichever screen draws it.
    for (const stepId of ["reids-officer", "the-brave-officer", "chains-of-memory"]) {
      const reid = figure("personal-identity", stepId, "first");
      expect(memory(reid).filter((l) => l.to === "general").map((l) => l.from)).toEqual(["officer"]);
      expect(memory(reid).filter((l) => l.to === "general")).toHaveLength(key("personal-identity-1"));
    }
    // The body links of the same story join all three stages, so the bodily criterion says one person.
    const byBody = figure("personal-identity", "reids-officer", "bybody");
    expect(byBody.links.every((l) => l.relation === "body")).toBe(true);
    // A chain of four: the last stage is linked directly to one stage, and the chain reaches three from A.
    const life = figure("personal-identity", "overlapping-chains", "second");
    expect(memory(life).filter((l) => l.to === "d")).toHaveLength(key("personal-identity-10"));
    const reach = new Set<string>(["a"]);
    for (let pass = 0; pass < life.stages.length; pass++)
      for (const l of memory(life)) if (reach.has(l.from)) reach.add(l.to);
    reach.delete("a");
    expect(reach.size).toBe(key("personal-identity-5"));
    // Fission: two survivors are linked to the person before the surgery.
    const fission = figure("personal-identity", "a-brain-split-in-two", "first");
    expect(memory(fission).filter((l) => l.from === "you")).toHaveLength(key("personal-identity-3"));
    // Branch line: the body stays on Earth and the memories reach both places.
    const branch = figure("personal-identity", "the-teleporter-machine", "second");
    expect(branch.links.filter((l) => l.relation === "body").map((l) => l.to)).toEqual(["stay"]);
    expect(memory(branch).map((l) => l.to).sort()).toEqual(["mars", "stay"]);
    const teleporter = figure("personal-identity", "the-teleporter", "first");
    expect(teleporter.links.every((l) => l.relation === "memory")).toBe(true);
  });

  it("recomputes the expected-utility and trolley numbers the consequentialism and Kant lessons state", () => {
    type Model = { options: Array<{ label: string; outcomes: Array<{ probability: number; value: number }> }> };
    const utilities = (lessonId: string, stepId: string, caseId: string) => {
      const diagram = lessonOf(lessonId).steps.find((s) => s.id === stepId)!.diagram;
      if (diagram?.type !== "philosophy_explorer") throw new Error(`${stepId} has no philosophy figure`);
      const model = diagram.cases.find((c) => c.id === caseId)!.model as unknown as Model;
      return model.options.map((o) => expectedUtility(o.outcomes.map((x) => [x.probability, x.value])));
    };
    // The spinner on the first screen: a third of 300 plays at £30 comes to £10 a play.
    expect((300 / 3) * 30).toBe(3000);
    expect(3000 / 300).toBe(10);
    expect(30 / 3).toBe(10);
    // Two gambles in the teaching figure and the prose: 56 against 60, so the bold one wins.
    const [modest, bold] = utilities("consequentialism", "choosing-between-gambles", "second");
    expect([modest, bold]).toEqual([expect.closeTo(56, 9), expect.closeTo(60, 9)]);
    expect(0.9 * 60 + 0.1 * 20).toBeCloseTo(56, 9);
    expect(0.5 * 120 + 0.5 * 0).toBe(60);
    // The sure thing and the gamble in the predict figure.
    const [sure, gamble] = utilities("consequentialism", "sure-or-gamble", "first");
    expect(sure).toBeCloseTo(50, 9);
    expect(gamble).toBeCloseTo(key("consequentialism-1"), 9);
    // The clinic: 0.5 × 30 + 0.5 × (−10) = 10, against 0 for doing nothing.
    expect(expectedUtility([[0.5, 30], [0.5, -10]])).toBe(10);
    // The vaccination figure carries the faded example's numbers.
    const [programme, nothing] = utilities("consequentialism", "vaccination", "first");
    expect(programme).toBeCloseTo(key("consequentialism-2"), 9);
    expect(nothing).toBe(0);
    // Aggregation example in the prose: two gains of 3 and a loss of 4 total 2.
    expect(3 + 3 - 4).toBe(2);
    // Lever and footbridge: five against one in both figures, so four more survive either way.
    for (const [lessonId, stepId] of [
      ["consequentialism", "counting-lives"],
      ["kant-and-the-footbridge", "two-plans"],
      ["kant-and-the-footbridge", "same-count"],
    ] as const) {
      const diagram = lessonOf(lessonId).steps.find((s) => s.id === stepId)!.diagram;
      if (diagram?.type !== "philosophy_explorer") throw new Error("no figure");
      const trolley = diagram.cases.flatMap((c) => (c.model.kind === "trolley" ? [c.model] : []));
      expect(trolley.length, stepId).toBeGreaterThanOrEqual(2);
      const first = trolley[0]!;
      if (stepId !== "counting-lives") expect(first.ahead - first.other, stepId).toBe(key("kant-and-the-footbridge-1"));
      else expect(first.ahead - first.other).toBe(key("consequentialism-3"));
    }
  });

  it("recomputes the midpoints, bands and incomes the virtue and contract lessons state", () => {
    type Mean = { low: number; high: number; band: [number, number] };
    const bands = (stepId: string) => {
      const diagram = lessonOf("virtue-and-the-mean").steps.find((s) => s.id === stepId)!.diagram;
      if (diagram?.type !== "philosophy_explorer") throw new Error("no figure");
      return diagram.cases.map((c) => c.model as unknown as Mean);
    };
    // Milo and the beginner on the scale from 2 to 10 minae: the midpoint is 6, Milo above it, the beginner below it.
    const [milo, beginner] = bands("the-mean-relative-to-us");
    expect([milo!.low, milo!.high]).toEqual([2, 10]);
    const midpoint = (milo!.low + milo!.high) / 2;
    expect(midpoint).toBe(key("virtue-and-the-mean-1"));
    expect(milo!.band[0]).toBeGreaterThan(midpoint);
    expect(beginner!.band[1]).toBeLessThan(midpoint);
    // The transfer figure shows the beginner's range, whose top is one mina under the midpoint.
    const shown = bands("measure-it")[0]!;
    expect(shown.band).toEqual([3, 5]);
    expect(midpoint - shown.band[1]).toBe(key("virtue-and-the-mean-4"));
    // The prose example: 20 laps too few, 40 too many, midpoint 30.
    expect((20 + 40) / 2).toBe(30);
    // The courage figure puts the firefighter's range above the passer-by's.
    const [firefighter, passer] = bands("courage-between-two-faults");
    expect(firefighter!.band[0]).toBeGreaterThan(passer!.band[1]);
    // The contract lesson's teaching figures.
    type Veil = { positions: string[]; shares?: number[]; societies: Array<{ label: string; values: number[] }> };
    const veil = (stepId: string, caseId: string) => {
      const diagram = lessonOf("the-social-contract").steps.find((s) => s.id === stepId)!.diagram;
      if (diagram?.type !== "philosophy_explorer") throw new Error("no figure");
      return diagram.cases.find((c) => c.id === caseId)!.model as unknown as Veil;
    };
    const average = (m: Veil, i: number) => {
      const shares = m.shares ?? m.societies[i]!.values.map(() => 1 / m.societies[i]!.values.length);
      return m.societies[i]!.values.reduce((sum, v, k) => sum + v * shares[k]!, 0);
    };
    const worst = (m: Veil, i: number) => Math.min(...m.societies[i]!.values);
    // P and Q tie on the average at 30, and maximin picks P (20 against 12).
    const pq = veil("two-ways-to-choose", "first");
    expect([average(pq, 0), average(pq, 1)]).toEqual([expect.closeTo(30, 9), expect.closeTo(30, 9)]);
    expect([worst(pq, 0), worst(pq, 1)]).toEqual([20, 12]);
    // X and Y with a quarter and three quarters: 50 against 40 on the average, 20 against 28 at the bottom.
    const xy = veil("unequal-groups", "first");
    expect(xy.shares).toEqual([0.25, 0.75]);
    expect([average(xy, 0), average(xy, 1)]).toEqual([expect.closeTo(50, 9), expect.closeTo(40, 9)]);
    expect([worst(xy, 0), worst(xy, 1)]).toEqual([20, 28]);
    // The predict figure holds the items' societies, and the weighing figure holds society D.
    const ab = veil("expected-income", "first");
    expect(average(ab, 0)).toBeCloseTo(key("the-social-contract-2"), 9);
    expect(worst(ab, 1)).toBeGreaterThan(worst(ab, 0)); // maximin picks B, as the key of item 3 says
    expect(question("the-social-contract-3").answerAuthority.kind).toBe("text");
    expect(correct(question("the-social-contract-3"), "B")).toBe(true);
    const cd = veil("weighing-by-share", "first");
    expect(average(cd, 1)).toBeCloseTo(key("the-social-contract-4"), 9);
    // Worked example: A averages 40 and C about 53, and C leads at the bottom too (20 against 10).
    expect([mean([10, 40, 70]), mean([20, 45, 95])]).toEqual([40, expect.closeTo(53.33, 1)]);
    expect(Math.min(20, 45, 95)).toBeGreaterThan(Math.min(10, 40, 70));
    // The sweets: three equal piles of four give the largest smallest pile.
    expect(12 / 3).toBe(key("the-social-contract-7"));
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
