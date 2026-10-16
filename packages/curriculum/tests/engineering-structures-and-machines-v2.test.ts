import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { lessonQuestionRefs, validateCourseBundle } from "../src/index.js";

/**
 * Engineering: Structures and Machines, v2 lessons. Every numeric key is recomputed here from the
 * arithmetic the item describes, not read back from the authority it is checking.
 *
 * The first five lessons (forces-as-vectors, moments, supported-beam, trusses-by-joints and
 * stress-and-strain) are written as story lessons: teaching screens with no question, then practice.
 * Their prose also does arithmetic, so the numbers in the text and in the figures are recomputed
 * here too. The course is read from the reviewed candidate, which is where the rewrite lives until
 * it is published.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL(
      "../../../content/engineering-structures-and-machines/.authoring/candidate.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as CourseBundle;

const question = (id: string): Question => bundle.questions.find((item) => item.id === id)!;
const key = (id: string) => {
  const authority = question(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const choiceMarked = (id: string) => {
  const item = question(id);
  if (item.answerAuthority.kind !== "text") throw new Error("not a choice");
  const authority = item.answerAuthority;
  return item
    .choices!.filter((choice) => assessTextAnswer(choice.label, authority).correct)
    .map((c) => c.id);
};
const textAccepts = (id: string, answer: string) => {
  const authority = question(id).answerAuthority;
  if (authority.kind !== "text") throw new Error("not text");
  return assessTextAnswer(answer, authority).correct;
};

type Blocks = ReadonlyArray<{ kind: string; text?: string }> | undefined;
const proseOf = (blocks: Blocks) => (blocks ?? []).map((block) => block.text ?? "").join(" ");
const wordCount = (text: string) => text.split(/\s+/u).filter(Boolean).length;
const storyIds = [
  "forces-as-vectors",
  "moments",
  "supported-beam",
  "trusses-by-joints",
  "stress-and-strain",
  "factor-of-safety",
  "shear-and-moment",
  "bending-stress",
  "deflection-and-stiffness",
  "levers-and-pulleys",
  "gear-trains",
  "efficiency-and-power",
];
const lessonById = (id: string) => bundle.lessons.find((lesson) => lesson.id === id)!;
const teachingOnly = (step: { kind: string; checkQuestionId: string }) =>
  step.kind === "explain" && !step.checkQuestionId;
const isStory = (lesson: { steps: Array<{ kind: string; checkQuestionId: string }> }) =>
  lesson.steps.some(teachingOnly);
/** Everything a learner reads in one lesson, in order, for checks on the text itself. */
const lessonProse = (id: string) => {
  const lesson = lessonById(id);
  return [
    proseOf(lesson.intro?.hook.blocks),
    // A worked or faded example's headline is the problem it works, which may end in a question mark.
    ...lesson.steps.map((step) =>
      [teachingOnly(step) ? (step.headline ?? "") : "", proseOf(step.lead), proseOf(step.afterFigure)].join(" "),
    ),
    proseOf(lesson.recap?.blocks),
    lesson.recap?.nextHook ?? "",
  ].join(" ");
};
const stepProse = (lessonId: string, stepId: string) => {
  const step = lessonById(lessonId).steps.find((item) => item.id === stepId)!;
  return [proseOf(step.lead), proseOf(step.afterFigure)].join(" ");
};
const models = (lessonId: string, stepId: string) => {
  const diagram = lessonById(lessonId).steps.find((item) => item.id === stepId)!.diagram;
  if (diagram?.type !== "engineering_explorer") throw new Error(`${stepId} has no engineering figure`);
  return diagram.cases.map((item) => item.model);
};
const rad = (degrees: number) => (degrees * Math.PI) / 180;
const two = (value: number) => value.toFixed(2);

describe("Engineering: Structures and Machines (v2)", () => {
  it("is twelve v2 lessons that validate with no errors", () => {
    const validation = validateCourseBundle(bundle);
    expect(validation.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(bundle.lessons).toHaveLength(12);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro, lesson.id).toBeDefined();
      expect(lesson.recap, lesson.id).toBeDefined();
      expect(lesson.questionIds, lesson.id).toHaveLength(3);
      // A story lesson runs 8 to 14 screens; the lessons not yet rewritten keep 5 to 7.
      expect(lesson.steps.length, lesson.id).toBeGreaterThanOrEqual(isStory(lesson) ? 8 : 5);
      expect(lesson.steps.length, lesson.id).toBeLessThanOrEqual(isStory(lesson) ? 14 : 7);
      expect(
        lesson.steps.some((step) => step.kind === "transfer"),
        lesson.id,
      ).toBe(true);
    }
  });

  it("writes the first five lessons as story lessons", () => {
    for (const id of storyIds) {
      const lesson = lessonById(id);
      expect(isStory(lesson), id).toBe(true);
      expect(lesson.intro?.hook.questionId, `${id} opens with a question`).toBeUndefined();
      const opener = wordCount(proseOf(lesson.intro?.hook.blocks));
      expect(opener, `${id} opener`).toBeGreaterThanOrEqual(120);
      expect(opener, `${id} opener`).toBeLessThanOrEqual(200);
      expect(wordCount(lesson.intro!.promise)).toBeLessThanOrEqual(25);
      expect(lesson.intro!.estimatedMinutes).toBe(12);
      const teaching = lesson.steps.filter(teachingOnly);
      expect(teaching.length / lesson.steps.length, `${id} teaching share`).toBeGreaterThanOrEqual(
        0.4,
      );
      // Worked and faded examples ask through their blanks and self-explanations.
      const asking = lesson.steps.filter((step) => !teachingOnly(step));
      expect(asking.length, `${id} question screens`).toBeGreaterThanOrEqual(3);
      expect(asking.length, `${id} question screens`).toBeLessThanOrEqual(7);
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
        expect(words, `${id}/${step.id}`).toBeGreaterThanOrEqual(80);
        expect(words, `${id}/${step.id}`).toBeLessThanOrEqual(280);
        expect(step.headline, `${id}/${step.id}`).toBeTruthy();
      }
      for (const step of asking)
        expect(wordCount(proseOf(step.lead)), `${id}/${step.id} lead`).toBeLessThanOrEqual(60);
      expect(lesson.recap?.nextHook, `${id} nextHook`).toBeTruthy();
    }
  });

  it("keeps the story lessons free of questions in prose and of em dashes", () => {
    for (const id of storyIds) {
      const text = lessonProse(id);
      expect(text, id).not.toMatch(/\?/u);
      expect(text, id).not.toMatch(/[—–]/u);
    }
  });

  it("chains each story lesson into the next", () => {
    // The recap's nextHook names what the next opener starts from.
    expect(lessonById("forces-as-vectors").recap?.nextHook).toMatch(/spanner/u);
    expect(proseOf(lessonById("moments").intro?.hook.blocks)).toMatch(/spanner/u);
    expect(lessonById("moments").recap?.nextHook).toMatch(/two supports/u);
    expect(proseOf(lessonById("supported-beam").intro?.hook.blocks)).toMatch(/plank/u);
    expect(lessonById("supported-beam").recap?.nextHook).toMatch(/truss/u);
    expect(proseOf(lessonById("trusses-by-joints").intro?.hook.blocks)).toMatch(/straight bars/u);
    expect(lessonById("trusses-by-joints").recap?.nextHook).toMatch(/force in each bar/u);
    expect(proseOf(lessonById("stress-and-strain").intro?.hook.blocks)).toMatch(
      /force in each bar of a truss/u,
    );
    expect(lessonById("stress-and-strain").recap?.nextHook).toMatch(/how much margin to leave below the yield stress/u);
    expect(proseOf(lessonById("factor-of-safety").intro?.hook.blocks)).toMatch(/stops springing back/u);
    expect(lessonById("factor-of-safety").recap?.nextHook).toMatch(/cuts one in half/u);
    expect(proseOf(lessonById("shear-and-moment").intro?.hook.blocks)).toMatch(/saws the plank in two/u);
    expect(lessonById("shear-and-moment").recap?.nextHook).toMatch(/squeezes one face/u);
    expect(proseOf(lessonById("bending-stress").intro?.hook.blocks)).toMatch(/narrow edge/u);
    expect(lessonById("bending-stress").recap?.nextHook).toMatch(/sag/u);
    expect(proseOf(lessonById("deflection-and-stiffness").intro?.hook.blocks)).toMatch(/diving board/u);
    expect(lessonById("deflection-and-stiffness").recap?.nextHook).toMatch(/spanner/u);
    expect(proseOf(lessonById("levers-and-pulleys").intro?.hook.blocks)).toMatch(/spanner/u);
    expect(lessonById("levers-and-pulleys").recap?.nextHook).toMatch(/Gears/u);
    expect(proseOf(lessonById("gear-trains").intro?.hook.blocks)).toMatch(/lowest gear/u);
    expect(lessonById("gear-trains").recap?.nextHook).toMatch(/runs warm/u);
    expect(proseOf(lessonById("efficiency-and-power").intro?.hook.blocks)).toMatch(/gearbox that has been running/u);
  });

  it("asks only questions that exist, and keeps the ones it no longer asks", () => {
    const asked = new Set(storyIds.flatMap((id) => lessonQuestionRefs(lessonById(id))));
    for (const id of asked) expect(question(id), id).toBeDefined();
    for (const id of [
      "engr-forces-as-vectors-10",
      "engr-supported-beam-8",
      "engr-stress-and-strain-8",
      "engr-factor-of-safety-8",
      "engr-shear-and-moment-8",
      "engr-deflection-and-stiffness-1",
      "engr-levers-and-pulleys-8",
      "engr-gear-trains-7",
      "engr-gear-trains-8",
      "engr-efficiency-and-power-11",
    ]) {
      expect(question(id), id).toBeDefined();
      expect(asked.has(id), id).toBe(false);
    }
  });

  it("recomputes the numbers in forces-as-vectors", () => {
    const line = stepProse("forces-as-vectors", "pulls-along-a-line");
    expect(line).toContain(`the post feels ${6 + 2} kN in that direction`);
    const split = stepProse("forces-as-vectors", "sine-and-cosine");
    expect(split).toContain(`8 × cos 45° = ${two(8 * Math.cos(rad(45)))} kN`);
    expect(split).toContain(`8 × sin 45° = ${two(8 * Math.sin(rad(45)))} kN`);
    const slope = stepProse("forces-as-vectors", "slopes-instead-of-angles");
    expect(slope).toContain(`√(3² + 4²) = ${Math.hypot(3, 4)}`);
    expect(slope).toContain(`10 × 3/5 = ${(10 * 3) / 5} kN`);
    expect(slope).toContain(`10 × 4/5 = ${(10 * 4) / 5} kN`);
    const together = stepProse("forces-as-vectors", "forces-at-right-angles");
    expect(together).toContain(`${8 ** 2} + ${15 ** 2} = ${8 ** 2 + 15 ** 2}`);
    expect(together).toContain(`square root of ${8 ** 2 + 15 ** 2} is ${Math.hypot(8, 15)} kN`);
    expect(together).toContain(`${Math.hypot(8, 15)} kN is less than 8 + 15 = ${8 + 15} kN`);
    // The slope figures carry the angle their rise and run give.
    for (const model of models("forces-as-vectors", "slopes-instead-of-angles")) {
      if (model.kind !== "concurrent") throw new Error("expected forces");
      const only = model.forces[0]!;
      expect(only.angle).toBeCloseTo((Math.atan2(only.slope!.rise, only.slope!.run) * 180) / Math.PI, 6);
      expect(Math.hypot(only.slope!.run, only.slope!.rise)).toBeGreaterThan(0);
    }
    // The balancing force in the last figure cancels the 5 kN and 12 kN pulls.
    const balance = models("forces-as-vectors", "forces-in-balance")[1];
    if (balance?.kind !== "concurrent") throw new Error("expected forces");
    const sum = balance.forces.reduce(
      (total, item) => ({
        x: total.x + item.magnitude * Math.cos(rad(item.angle)),
        y: total.y + item.magnitude * Math.sin(rad(item.angle)),
      }),
      { x: 0, y: 0 },
    );
    expect(sum.x).toBeCloseTo(0, 9);
    expect(sum.y).toBeCloseTo(0, 9);
  });

  it("recomputes the numbers in moments", () => {
    const first = stepProse("moments", "force-times-distance");
    expect(first).toContain(`gives ${100 * 0.2} N·m`);
    expect(first).toContain(`gives ${100 * 0.4} N·m`);
    const children = stepProse("moments", "unequal-children");
    expect(children).toContain(`a moment of ${200 * 1.5} N·m`);
    expect(children).toContain(`also has ${300 * 1} N·m`);
    // The balanced case in the figure has moments that cancel; the other case does not.
    const [balanced, unbalanced] = models("moments", "unequal-children").map((model) => {
      if (model.kind !== "moment") throw new Error("expected moments");
      return model.forces.reduce((total, item) => total + item.magnitude * item.position, 0);
    });
    expect(balanced).toBe(0 + 300 * 1 - 200 * 1.5);
    expect(unbalanced).not.toBe(0);
    // A force at right angles to the bar uses the whole distance; a slanted one uses its sine.
    const [square, slanted] = models("moments", "push-at-a-slant").map((model) => {
      if (model.kind !== "moment") throw new Error("expected moments");
      const only = model.forces[0]!;
      return only.magnitude * Math.sin(rad(only.angle)) * only.position;
    });
    expect(square).toBeCloseTo(120 * 0.25, 9);
    expect(slanted).toBeCloseTo(120 * Math.sin(rad(60)) * 0.25, 9);
    expect(slanted).toBeLessThan(square!);
  });

  it("recomputes the numbers in supported-beam", () => {
    expect(stepProse("supported-beam", "what-a-support-does")).toContain(`each carries ${20 / 2} kN`);
    const moments = stepProse("supported-beam", "moments-about-a-support");
    const rb = (16 * 3) / 8;
    expect(moments).toContain(`16 × 3 = ${16 * 3} kN·m`);
    expect(moments).toContain(`RB = ${rb} kN`);
    expect(moments).toContain(`16 − ${rb} = ${16 - rb} kN`);
    // The nearer support carries more, and the reactions add up to the load.
    expect(16 - rb).toBeGreaterThan(rb);
    const spread = stepProse("supported-beam", "a-spread-load");
    expect(spread).toContain(`that is ${2 * 5} kN`);
    expect(spread).toContain(`${5 / 2} m along`);
    const [spreadModel, pointModel] = models("supported-beam", "a-spread-load");
    if (spreadModel?.kind !== "beam" || pointModel?.kind !== "beam") throw new Error("expected beams");
    const load = spreadModel.spreadLoads[0]!;
    const total = load.intensity * (load.end - load.start);
    expect(pointModel.pointLoads[0]!.magnitude).toBe(total);
    expect(pointModel.pointLoads[0]!.position).toBe((load.start + load.end) / 2);
    const overhang = stepProse("supported-beam", "beyond-a-support");
    const far = (9 * 8) / 6;
    expect(overhang).toContain(`6 × RB = 9 × 8, so RB = ${far} kN`);
    expect(overhang).toContain(`RA + ${far} = 9 and RA = −${far - 9} kN`);
  });

  it("recomputes the numbers in trusses-by-joints", () => {
    const apex = stepProse("trusses-by-joints", "the-apex-joint");
    const length = Math.hypot(4, 3);
    const member = 30 / (2 * (3 / length));
    expect(apex).toContain(`each sloping member is ${length} m long`);
    expect(apex).toContain(`2 × F × 3/5 = 30, which gives F = ${member} kN`);
    expect(apex).toContain(`${member > 30 / 2 ? "more" : "less"} than the ${30 / 2} kN half`);
    const bottom = stepProse("trusses-by-joints", "the-bottom-chord");
    expect(bottom).toContain(`25 × 4/5 = ${(member * 4) / 5} kN`);
    expect(bottom).toContain(`${(member * 4) / 5} kN along the ground`);
    // Every triangle in a figure has the member lengths the text and questions use.
    for (const id of ["a-frame-of-bars", "the-apex-joint"])
      for (const model of models("trusses-by-joints", id)) {
        if (model.kind !== "truss") throw new Error("expected a truss");
        expect(model.nodes).toHaveLength(3);
        expect(model.members).toHaveLength(3);
      }
    const [wide, narrow] = models("trusses-by-joints", "a-frame-of-bars");
    if (wide?.kind !== "truss" || narrow?.kind !== "truss") throw new Error("expected trusses");
    expect(wide.nodes[2]).toMatchObject({ x: 4, y: 3 });
    expect(narrow.nodes[2]).toMatchObject({ x: 3, y: 4 });
  });

  it("recomputes the numbers in stress-and-strain", () => {
    expect(stepProse("stress-and-strain", "sharing-a-load")).toContain(`each carries ${24 / 3} kN`);
    const stress = stepProse("stress-and-strain", "force-on-each-square-millimetre");
    expect(stress).toContain(`24,000 N ÷ 200 mm² = ${24000 / 200} N/mm²`);
    expect(stress).toContain(`which is only ${8000 / 200} MPa`);
    expect(stress).toContain(`that rod is at ${24000 / 200} MPa`);
    const strain = stepProse("stress-and-strain", "stretch-as-a-fraction");
    expect(strain).toContain(`4 ÷ 5,000 = ${4 / 5000}`);
    const stiff = stepProse("stress-and-strain", "stiffness-of-a-material");
    expect(stiff).toContain(`80 ÷ 200,000 = ${80 / 200000}`);
    expect(200 / 70).toBeGreaterThan(2.5);
    expect(200 / 70).toBeLessThan(3);
    // The figures load the bars to the stresses the labels give.
    const stressOf = (model: { kind: string; load?: number; area?: number }) =>
      ((model.load ?? 0) * 1000) / (model.area ?? 1);
    const [thin, thick] = models("stress-and-strain", "force-on-each-square-millimetre");
    expect(stressOf(thin!)).toBe(24000 / 200);
    expect(stressOf(thick!)).toBe(24000 / 600);
    const [belowYield, aboveYield] = models("stress-and-strain", "beyond-yield");
    if (belowYield?.kind !== "stress_strain" || aboveYield?.kind !== "stress_strain")
      throw new Error("expected stress figures");
    expect(stressOf(belowYield)).toBe(250);
    expect(stressOf(aboveYield)).toBe(400);
    expect(stressOf(belowYield)).toBeLessThan(belowYield.yieldStress);
    expect(stressOf(aboveYield)).toBeGreaterThan(aboveYield.yieldStress);
    expect(stressOf(aboveYield)).toBeLessThan(aboveYield.ultimateStress);
  });

  it("recomputes the numbers in factor-of-safety", () => {
    const margin = stepProse("factor-of-safety", "how-much-room-is-left");
    expect(margin).toContain(`24,000 N ÷ 200 mm² = ${24000 / 200} MPa`);
    expect(margin).toContain(`${360 / (24000 / 200)}`);
    expect(margin).toContain(`factor falls to ${360 / (48000 / 200)}`);
    const allowable = stepProse("factor-of-safety", "working-backwards");
    expect(allowable).toContain(`300 ÷ 2 = ${300 / 2} MPa`);
    expect(allowable).toContain(
      `${((300 / 2) * 200).toLocaleString("en-US")} N, which is ${((300 / 2) * 200) / 1000} kN`,
    );
    expect(allowable).toContain(`42,000 N ÷ 150 N/mm² = ${42000 / 150} mm²`);
    const stock = stepProse("factor-of-safety", "stock-sizes");
    expect(stock).toContain(`${12 ** 2} mm² and ${16 ** 2} mm²`);
    expect(stock).toContain(`25,000 ÷ 144, about ${Math.round(25000 / 144)} MPa`);
    expect(stock).toContain(`about ${Math.round(25000 / 256)} MPa`);
    expect(25000 / 144).toBeGreaterThan(125);
    expect(25000 / 256).toBeLessThan(125);
    expect(25000 / 125).toBe(200);
    const stretch = stepProse("factor-of-safety", "strong-is-not-stiff");
    expect(stretch).toContain(`30,000 ÷ 400 = ${30000 / 400} MPa`);
    expect(stretch).toContain(`75 ÷ 200,000 = ${75 / 200000}`);
    expect(stretch).toContain(`${(75 / 200000) * 4000} mm`);
    // The figures load the bars to the working stresses the text gives.
    const stressOf = (model: { kind: string; load?: number; area?: number }) =>
      ((model.load ?? 0) * 1000) / (model.area ?? 1);
    const [low, high] = models("factor-of-safety", "how-much-room-is-left");
    expect(stressOf(low!)).toBe(120);
    expect(stressOf(high!)).toBe(240);
    const [small, large] = models("factor-of-safety", "stock-sizes");
    expect(stressOf(small!)).toBeCloseTo(25000 / 144, 9);
    expect(stressOf(large!)).toBeCloseTo(25000 / 256, 9);
  });

  it("recomputes the numbers in shear-and-moment", () => {
    // The 10 m plank: 15 kN at 4 m.
    const ra = (15 * 6) / 10;
    const rb = 15 - ra;
    expect(proseOf(lessonById("shear-and-moment").intro?.hook.blocks)).toContain(
      `pushes up with ${ra} kN and the right post with ${rb} kN`,
    );
    const sawn = stepProse("shear-and-moment", "sawing-the-plank");
    expect(sawn).toContain(`V = +${ra} kN`);
    expect(sawn).toContain(`${ra} kN downward`);
    expect(15 - rb).toBe(ra);
    const along = stepProse("shear-and-moment", "the-shear-along-the-plank");
    expect(along).toContain(`V = ${ra} − 15 = −${15 - ra} kN`);
    expect(along).toContain(`${15} kN`);
    const turning = stepProse("shear-and-moment", "turning-at-a-cut");
    expect(turning).toContain(`M = ${ra} × 4 = ${ra * 4} kN·m`);
    expect(turning).toContain(`${ra} × 2 = ${ra * 2} kN·m`);
    const spread = stepProse("shear-and-moment", "a-spread-load");
    expect(spread).toContain(`2 × 6 = ${2 * 6} kN`);
    expect(spread).toContain(`2 × 3 = ${2 * 3} kN`);
    expect(spread).toContain(`M = 6 × 3 − 6 × 1.5 = ${6 * 3} − ${6 * 1.5} = ${6 * 3 - 6 * 1.5} kN·m`);
    expect(spread).toContain(`2 × 36 ÷ 8 = ${(2 * 36) / 8} kN·m`);
    const single = stepProse("shear-and-moment", "one-load-and-a-cantilever");
    expect(single).toContain(`12 × 6 ÷ 4 = ${(12 * 6) / 4} kN·m`);
    expect(single).toContain(`M = 6 × 4 = ${6 * 4} kN·m`);
    const slope = stepProse("shear-and-moment", "where-the-moment-peaks");
    expect(slope).toContain(`${ra} kN·m per metre while the shear is +${ra} kN`);
    expect(slope).toContain(`${-(ra - 15)} kN·m per metre`);
    expect(slope).toContain(`${ra * 4} kN·m at the crate`);
    // The moment falls from its peak to zero over the 6 m beyond the crate.
    expect(ra * 4 + (ra - 15) * 6).toBeCloseTo(0, 9);
    // The figures show the beams the text describes.
    for (const id of ["the-shear-along-the-plank", "where-the-moment-peaks"])
      for (const model of models("shear-and-moment", id)) {
        if (model.kind !== "beam") throw new Error("expected a beam");
        expect(model.length).toBe(10);
        expect(model.pointLoads).toEqual([{ position: 4, magnitude: 15 }]);
      }
    const [uniform, midspan] = models("shear-and-moment", "a-spread-load");
    if (uniform?.kind !== "beam" || midspan?.kind !== "beam") throw new Error("expected beams");
    const load = uniform.spreadLoads[0]!;
    expect(load.intensity * (load.end - load.start)).toBe(midspan.pointLoads[0]!.magnitude);
    expect(midspan.pointLoads[0]!.position).toBe((load.start + load.end) / 2);
  });

  it("recomputes the numbers in bending-stress", () => {
    const rectangle = stepProse("bending-stress", "the-rectangle");
    const i = (120 * 100 ** 3) / 12;
    expect(rectangle).toContain(`I = 120 × 100³ ÷ 12 = ${i / 1e6} × 10⁶ mm⁴`);
    expect(rectangle).toContain(`σ = 4 × 10⁶ × 50 ÷ (10 × 10⁶) = ${(4e6 * 50) / i} MPa`);
    const depth = stepProse("bending-stress", "why-depth-wins");
    expect(depth).toContain(`${(20e6 * 100) / ((100 * 200 ** 3) / 12)} MPa`);
    expect(depth).toContain(`${(20e6 * 50) / ((200 * 100 ** 3) / 12)} MPa`);
    expect(depth).toContain(`3³ = ${3 ** 3} times`);
    expect(3 / 3 ** 3).toBeCloseTo(1 / 9, 9);
    const section = stepProse("bending-stress", "moving-the-material-out");
    const hollow = (80 * 150 ** 3 - 72 * 130 ** 3) / 12;
    const solid = (80 * 150 ** 3) / 12;
    expect(section).toContain(`(80 − 8) ÷ 2 = ${(80 - 8) / 2} mm wide and 150 − 20 = ${150 - 20} mm deep`);
    expect(section).toContain(`= ${(hollow / 1e6).toFixed(2)} × 10⁶ mm⁴`);
    expect(section).toContain(`${(solid / 1e6).toFixed(1)} × 10⁶ mm⁴`);
    expect(section).toContain(`keeps ${Math.round((hollow / solid) * 100)} percent`);
    expect(section).toContain(`${Math.round(((80 * 150 - 72 * 130) / (80 * 150)) * 100)} percent of the area`);
    const [upright, turned] = models("bending-stress", "the-rectangle");
    if (upright?.kind !== "section" || turned?.kind !== "section") throw new Error("expected sections");
    expect([upright.width, upright.depth]).toEqual([120, 100]);
    expect([turned.width, turned.depth]).toEqual([100, 120]);
    // The recap's percentages for the 200 mm I-section.
    const recap = proseOf(lessonById("bending-stress").recap?.blocks);
    const iSection = (100 * 200 ** 3 - 94 * 180 ** 3) / 12;
    expect(recap).toContain(`about ${Math.round((iSection / ((100 * 200 ** 3) / 12)) * 100)} percent`);
    expect(recap).toContain(`about ${Math.round(((100 * 200 - 94 * 180) / (100 * 200)) * 100)} percent of its material`);
  });

  it("recomputes the numbers in deflection-and-stiffness", () => {
    const rule = stepProse("deflection-and-stiffness", "load-and-sag");
    expect(rule).toContain(`sags ${(4 / 2) * 4} mm under 4 kN and ${(4 / 2) * 1} mm under 1 kN`);
    const formula = stepProse("deflection-and-stiffness", "length-and-rigidity");
    expect(formula).toContain(`${3 ** 3} times as far`);
    expect(200 / 70).toBeGreaterThan(2.5);
    expect(200 / 70).toBeLessThan(3);
    const [short, long] = models("deflection-and-stiffness", "length-and-rigidity");
    if (short?.kind !== "cantilever" || long?.kind !== "cantilever") throw new Error("expected cantilevers");
    const tip = (m: { length: number; load: number; modulus: number; secondMoment: number }) =>
      (m.load * 1000 * m.length ** 3) / (3 * m.modulus * 1e9 * m.secondMoment * 1e-6);
    expect(tip(long) / tip(short)).toBeCloseTo(3 ** 3, 9);
    const units = stepProse("deflection-and-stiffness", "base-units");
    expect(units).toContain(`EI = 200 × 10⁹ × 3 × 10⁻⁶ = ${(200e9 * 3e-6).toLocaleString("en-US")} N·m²`);
    const sizing = stepProse("deflection-and-stiffness", "sizing-for-a-limit");
    const needed = (1000 * 27) / (3 * 200e9 * 0.01);
    expect(sizing).toContain(`27,000 ÷ (6 × 10⁹) = ${needed * 1e6} × 10⁻⁶ m⁴`);
    expect(sizing).toContain(`${(needed * 1e12) / 1e6} × 10⁶ mm⁴`);
    const stiff = stepProse("deflection-and-stiffness", "load-per-millimetre");
    const k = (3 * 600000) / 2 ** 3;
    expect(stiff).toContain(`k = 3 × 600,000 ÷ 8 = ${k.toLocaleString("en-US")} N/m, which is ${k / 1000} kN/m`);
    expect(stiff).toContain(`0.9 ÷ ${k / 1000} = ${0.9 / (k / 1000)} m, or ${(0.9 / (k / 1000)) * 1000} mm`);
    // The worked example's arithmetic.
    expect((2000 * 27) / (3 * 200e9 * 4e-6) * 1000).toBeCloseTo(22.5, 9);
  });

  it("recomputes the numbers in levers-and-pulleys", () => {
    const lever = stepProse("levers-and-pulleys", "the-spanner-as-a-lever");
    expect(lever).toContain(`so the effort is ${600 * 0.1} ÷ 0.5 = ${(600 * 0.1) / 0.5} N`);
    const advantage = stepProse("levers-and-pulleys", "mechanical-advantage");
    expect(advantage).toContain(`600 ÷ 120 = ${600 / 120}`);
    expect(advantage).toContain(`0.5 ÷ 0.1 = ${0.5 / 0.1}`);
    const pulleys = stepProse("levers-and-pulleys", "block-and-tackle");
    expect(pulleys).toContain(`A 500 N load on 2 strands needs ${500 / 2} N, and on 5 strands it needs ${500 / 5} N`);
    const cost = stepProse("levers-and-pulleys", "what-the-saving-costs");
    expect(cost).toContain(`500 × 0.4 = ${500 * 0.4} J`);
    expect(cost).toContain(`${(500 * 0.4) / (500 / 5)} m of rope`);
    expect(cost).toContain(`5 × 0.4 = ${5 * 0.4} m`);
    // The classes in the figure: the load, effort and fulcrum are in the order the labels say.
    const [first, second, third] = models("levers-and-pulleys", "three-kinds-of-lever");
    if (first?.kind !== "lever" || second?.kind !== "lever" || third?.kind !== "lever")
      throw new Error("expected levers");
    expect([first.leverClass, second.leverClass, third.leverClass]).toEqual(["first", "second", "third"]);
    expect(third.effortArm).toBeLessThan(third.loadArm);
    expect(second.effortArm).toBeGreaterThan(second.loadArm);
    const [two, five] = models("levers-and-pulleys", "block-and-tackle");
    if (two?.kind !== "pulley" || five?.kind !== "pulley") throw new Error("expected pulleys");
    expect([two.strands, five.strands, two.load, five.load]).toEqual([2, 5, 500, 500]);
    expect(five.lift).toBe(0.4);
  });

  it("recomputes the numbers in gear-trains", () => {
    const teeth = stepProse("gear-trains", "teeth-that-meet");
    expect(teeth).toContain(`600 × 20 for the driver and 300 × 40 for the driven gear are both ${(600 * 20).toLocaleString("en-US")}`);
    expect(teeth).toContain(`${40} ÷ ${20} = ${40 / 20}`);
    expect(600 * 20).toBe(300 * 40);
    const torque = stepProse("gear-trains", "trading-speed-for-torque");
    expect(torque).toContain(`100 × 0.2 = ${100 * 0.2} N·m`);
    expect(torque).toContain(`${(10 * 40) / 20} N·m`);
    const idler = stepProse("gear-trains", "a-gear-in-the-middle");
    expect(idler).toContain(`600 × 24 ÷ 36 = ${(600 * 24) / 36} rpm`);
    expect(idler).toContain(`400 × 36 ÷ 48 = ${(400 * 36) / 48} rpm`);
    expect(idler).toContain(`600 × 24 ÷ 48 is also ${(600 * 24) / 48} rpm`);
    const chain = stepProse("gear-trains", "chains-and-sprockets");
    expect(chain).toContain(`50 × 40 ÷ 20 = ${(50 * 40) / 20} rpm`);
    const compound = stepProse("gear-trains", "two-pairs-on-one-shaft");
    expect(compound).toContain(`36 ÷ 12 = ${36 / 12}, which takes 1,500 rpm down to ${1500 / 3} rpm`);
    expect(compound).toContain(`50 ÷ 10 = ${50 / 10}, which takes ${1500 / 3} rpm down to ${1500 / 3 / 5} rpm`);
    expect(compound).toContain(`3 × 5 = ${3 * 5}, and 1,500 ÷ ${15} = ${1500 / 15} rpm`);
    expect(compound).toContain(`from 4 N·m to ${4 * 15} N·m`);
    expect(compound).toContain(`a ratio of ${1500 / 100}`);
    expect(compound).toContain(`${10 * 15}-tooth gear`);
    // The figures carry the numbers the prose quotes.
    const [equal, double] = models("gear-trains", "teeth-that-meet");
    if (equal?.kind !== "gears" || double?.kind !== "gears") throw new Error("expected gears");
    expect([double.stages[0]?.driver, double.stages[0]?.driven, double.inputSpeed]).toEqual([20, 40, 600]);
    expect(equal.stages[0]?.driven).toBe(20);
    const [withIdler] = models("gear-trains", "a-gear-in-the-middle");
    if (withIdler?.kind !== "gears") throw new Error("expected gears");
    expect([withIdler.idler, withIdler.stages[0]?.driver, withIdler.stages[0]?.driven]).toEqual([36, 24, 48]);
    const [train] = models("gear-trains", "two-pairs-on-one-shaft");
    if (train?.kind !== "gears") throw new Error("expected gears");
    expect(train.stages.map((stage) => stage.driven / stage.driver)).toEqual([3, 5]);
    expect([train.inputSpeed, train.inputTorque]).toEqual([1500, 4]);
  });

  it("recomputes the numbers in efficiency-and-power", () => {
    const winch = stepProse("efficiency-and-power", "how-fast-energy-is-delivered");
    expect(winch).toContain(`500 × 3 = ${(500 * 3).toLocaleString("en-US")} J`);
    expect(winch).toContain(`1,500 ÷ 5 = ${1500 / 5} J per second`);
    expect(winch).toContain(`${3 / 5} m/s, and force × speed = 500 × ${3 / 5} = ${500 * (3 / 5)} W`);
    const [slow, fast] = models("efficiency-and-power", "how-fast-energy-is-delivered");
    if (slow?.kind !== "pulley" || fast?.kind !== "pulley") throw new Error("expected pulleys");
    expect([slow.load, slow.lift, slow.liftSpeed, fast.liftSpeed]).toEqual([500, 3, 0.6, 1.2]);
    const omega = (120 * 2 * Math.PI) / 60;
    const radians = stepProse("efficiency-and-power", "turning-speed-in-radians");
    expect(radians).toContain(`ω = 120 × 2π ÷ 60 = ${two(omega)} rad/s`);
    expect(radians).toContain(`about ${two(2 * Math.PI)}`);
    const shaft = stepProse("efficiency-and-power", "power-of-a-shaft");
    expect(shaft).toContain(`5 × ${two(omega)} ≈ ${Math.round(5 * omega)} W`);
    expect(shaft).toContain(`would give ${5 * 120}, nearly ten times too large`);
    expect((5 * 120) / (5 * omega)).toBeGreaterThan(9);
    const losses = stepProse("efficiency-and-power", "losses-multiply");
    expect(losses).toContain(`0.9 × 0.9 = ${two(0.9 * 0.9).replace(/0$/u, "")}, or ${Math.round(0.9 * 0.9 * 100)}%`);
    expect(losses).toContain(`${100 - 10 - 10}%`);
    const where = stepProse("efficiency-and-power", "where-the-loss-shows");
    expect(where).toContain(`10 × 3 = ${10 * 3} N·m, and the real one is 30 × 0.8 = ${30 * 0.8} N·m`);
    const sizing = stepProse("efficiency-and-power", "sizing-the-motor");
    expect(sizing).toContain(`600 ÷ 0.75 = ${600 / 0.75} W`);
    expect(sizing).toContain(`4 × 0.75 = ${4 * 0.75}, so a 900 N load needs an effort of 900 ÷ 3 = ${900 / 3} N`);
    expect(sizing).toContain(`would have been ${900 / 4} N`);
    const [first, second] = models("efficiency-and-power", "power-of-a-shaft");
    if (first?.kind !== "gears" || second?.kind !== "gears") throw new Error("expected gears");
    expect([first.inputSpeed, first.inputTorque, second.inputSpeed]).toEqual([120, 5, 240]);
    const [two_, one] = models("efficiency-and-power", "losses-multiply");
    if (two_?.kind !== "gears" || one?.kind !== "gears") throw new Error("expected gears");
    expect([two_.stages.length, one.stages.length, two_.efficiency]).toEqual([2, 1, 0.9]);
  });

  it("has keys that match the arithmetic each item describes", () => {
  // forces-as-vectors
    expect(key("engr-forces-as-vectors-7")).toBeCloseTo(3+4, 0);
    expect(choiceMarked("engr-forces-as-vectors-8")).toEqual(["a"]);
    expect(key("engr-forces-as-vectors-1")).toBeCloseTo(10*Math.cos(30*Math.PI/180), 2);
    expect(choiceMarked("engr-forces-as-vectors-9")).toEqual(["a"]);
    expect(key("engr-forces-as-vectors-2")).toBeCloseTo(5*3/Math.hypot(3,4), 0);
    expect(choiceMarked("engr-forces-as-vectors-10")).toEqual(["a"]);
    expect(key("engr-forces-as-vectors-3")).toBeCloseTo(Math.hypot(3,4), 0);
    expect(key("engr-forces-as-vectors-4")).toBeCloseTo(Math.hypot(6,8), 0);
    expect(key("engr-forces-as-vectors-5")).toBeCloseTo(Math.hypot(12,5), 0);
    expect(key("engr-forces-as-vectors-11")).toBeCloseTo(26*5/Math.hypot(5,12), 0);
    expect(choiceMarked("engr-forces-as-vectors-6")).toEqual(["1"]);
  // moments
    expect(key("engr-moments-7")).toBeCloseTo(300, 0);
    expect(choiceMarked("engr-moments-8")).toEqual(["a"]);
    expect(key("engr-moments-1")).toBeCloseTo(150*0.3, 0);
    expect(choiceMarked("engr-moments-9")).toEqual(["a"]);
    expect(key("engr-moments-2")).toBeCloseTo(150*0.3*Math.sin(30*Math.PI/180), 1);
    expect(key("engr-moments-3")).toBeCloseTo(0, 0);
    expect(key("engr-moments-4")).toBeCloseTo(300*2/400, 1);
    expect(key("engr-moments-5")).toBeCloseTo(40*0.8, 0);
    expect(key("engr-moments-10")).toBeCloseTo(60*0.5*Math.sin(30*Math.PI/180), 1);
    expect(choiceMarked("engr-moments-6")).toEqual(["1"]);
  // supported-beam
    expect(key("engr-supported-beam-7")).toBeCloseTo(12/2, 0);
    expect(choiceMarked("engr-supported-beam-8")).toEqual(["a"]);
    expect(key("engr-supported-beam-1")).toBeCloseTo(12*2/6, 0);
    expect(choiceMarked("engr-supported-beam-9")).toEqual(["a"]);
    expect(key("engr-supported-beam-2")).toBeCloseTo(12-12*2/6, 0);
    expect(choiceMarked("engr-supported-beam-11")).toEqual(["a"]);
    expect(key("engr-supported-beam-3")).toBeCloseTo((4*3)*1.5/6, 0);
    expect(key("engr-supported-beam-4")).toBeCloseTo(10-10*6/4, 0);
    expect(key("engr-supported-beam-5")).toBeCloseTo((20*7+10*2)/10, 0);
    expect(key("engr-supported-beam-10")).toBeCloseTo(3*10/2, 0);
    expect(textAccepts("engr-supported-beam-6", "roller")).toBe(true);
  // trusses-by-joints
    expect(key("engr-trusses-by-joints-7")).toBeCloseTo(12/2, 0);
    expect(choiceMarked("engr-trusses-by-joints-8")).toEqual(["a"]);
    expect(key("engr-trusses-by-joints-1")).toBeCloseTo(12/(2*1.5/2.5), 0);
    expect(choiceMarked("engr-trusses-by-joints-9")).toEqual(["a"]);
    expect(key("engr-trusses-by-joints-3")).toBeCloseTo(10*2/2.5, 0);
    expect(textAccepts("engr-trusses-by-joints-2", "tension")).toBe(true);
    expect(key("engr-trusses-by-joints-4")).toBeCloseTo(0, 0);
    expect(key("engr-trusses-by-joints-5")).toBeCloseTo((16/(2*2/2.5))*1.5/2.5, 0);
    expect(key("engr-trusses-by-joints-10")).toBeCloseTo(32/(2*4/5), 0);
    expect(textAccepts("engr-trusses-by-joints-6", "compression")).toBe(true);
  // stress-and-strain
    expect(key("engr-stress-and-strain-7")).toBeCloseTo(20/2, 0);
    expect(choiceMarked("engr-stress-and-strain-8")).toEqual(["a"]);
    expect(key("engr-stress-and-strain-1")).toBeCloseTo(20000/400, 0);
    expect(key("engr-stress-and-strain-11")).toBeCloseTo(1/2000, 4);
    expect(choiceMarked("engr-stress-and-strain-9")).toEqual(["a"]);
    expect(key("engr-stress-and-strain-2")).toBeCloseTo(50/200000*2000, 1);
    expect(key("engr-stress-and-strain-3")).toBeCloseTo(50*1400/70000, 0);
    expect(choiceMarked("engr-stress-and-strain-4")).toEqual(["2"]);
    expect(key("engr-stress-and-strain-5")).toBeCloseTo(15000/(10*10), 0);
    expect(key("engr-stress-and-strain-10")).toBeCloseTo(200000*0.0012, 0);
    expect(key("engr-stress-and-strain-6")).toBeCloseTo(100/200000*5000, 1);
  // factor-of-safety
    expect(key("engr-factor-of-safety-7")).toBeCloseTo(100/20, 0);
    expect(choiceMarked("engr-factor-of-safety-8")).toEqual(["a"]);
    expect(key("engr-factor-of-safety-1")).toBeCloseTo(250/(40000/400), 1);
    expect(choiceMarked("engr-factor-of-safety-9")).toEqual(["a"]);
    expect(key("engr-factor-of-safety-2")).toBeCloseTo(60000/(250/2), 0);
    expect(key("engr-factor-of-safety-3")).toBeCloseTo(25, 0);
    expect(key("engr-factor-of-safety-4")).toBeCloseTo((60000/625)/200000*3000, 2);
    expect(key("engr-factor-of-safety-5")).toBeCloseTo(355/2.5, 0);
    expect(key("engr-factor-of-safety-6")).toBeCloseTo(300*250/1.5/1000, 0);
    expect(key("engr-factor-of-safety-10")).toBeCloseTo(240/(30000/200), 1);
  // shear-and-moment
    expect(key("engr-shear-and-moment-7")).toBeCloseTo(8, 0);
    expect(choiceMarked("engr-shear-and-moment-8")).toEqual(["a"]);
    expect(key("engr-shear-and-moment-1")).toBeCloseTo(8-12, 0);
    expect(key("engr-shear-and-moment-11")).toBeCloseTo(5*2, 0);
    expect(choiceMarked("engr-shear-and-moment-9")).toEqual(["a"]);
    expect(key("engr-shear-and-moment-2")).toBeCloseTo(8*2, 0);
    expect(key("engr-shear-and-moment-3")).toBeCloseTo(3*8*8/8, 0);
    expect(textAccepts("engr-shear-and-moment-4", "zero")).toBe(true);
    expect(key("engr-shear-and-moment-5")).toBeCloseTo(5*3, 0);
    expect(key("engr-shear-and-moment-6")).toBeCloseTo(10*5, 0);
    expect(key("engr-shear-and-moment-10")).toBeCloseTo(6-24, 0);
  // bending-stress
    expect(choiceMarked("engr-bending-stress-7")).toEqual(["a"]);
    expect(key("engr-bending-stress-8")).toBeCloseTo(120/2, 0);
    expect(key("engr-bending-stress-1")).toBeCloseTo(20e6*100/(100*200**3/12), 0);
    expect(choiceMarked("engr-bending-stress-9")).toEqual(["a"]);
    expect(key("engr-bending-stress-2")).toBeCloseTo(20e6*50/(200*100**3/12), 0);
    expect(key("engr-bending-stress-3")).toBeCloseTo(60*100**3/12/1e6, 0);
    expect(key("engr-bending-stress-4")).toBeCloseTo((100*200**3-94*180**3)/12/1e6, 2);
    expect(key("engr-bending-stress-5")).toBeCloseTo(5e6*50/(100**4/12), 0);
    expect(key("engr-bending-stress-10")).toBeCloseTo(2**3, 0);
    expect(textAccepts("engr-bending-stress-6", "neutral axis")).toBe(true);
  // deflection-and-stiffness
    expect(key("engr-deflection-and-stiffness-7")).toBeCloseTo(20*6/3, 0);
    expect(key("engr-deflection-and-stiffness-8")).toBeCloseTo(200e9*2e-6, 0);
    expect(key("engr-deflection-and-stiffness-1")).toBeCloseTo(3000*8/(3*200e9*2e-6)*1000, 0);
    expect(choiceMarked("engr-deflection-and-stiffness-9")).toEqual(["a"]);
    expect(key("engr-deflection-and-stiffness-3")).toBeCloseTo(2100/(3*70000)*1000, 0);
    expect(key("engr-deflection-and-stiffness-2")).toBeCloseTo(2**3, 0);
    expect(key("engr-deflection-and-stiffness-11")).toBeCloseTo(10/5, 0);
    expect(key("engr-deflection-and-stiffness-4")).toBeCloseTo(3*400000/8/1000, 0);
    expect(key("engr-deflection-and-stiffness-5")).toBeCloseTo(3000*8/(3*200e9*0.008)*1e12/1e6, 0);
    expect(choiceMarked("engr-deflection-and-stiffness-6")).toEqual(["1"]);
    expect(key("engr-deflection-and-stiffness-10")).toBeCloseTo(3000*1/(3*200e9*5e-6)*1000, 0);
  // levers-and-pulleys
    expect(key("engr-levers-and-pulleys-7")).toBeCloseTo(100/2, 0);
    expect(choiceMarked("engr-levers-and-pulleys-8")).toEqual(["a"]);
    expect(key("engr-levers-and-pulleys-1")).toBeCloseTo(1.2/0.2, 0);
    expect(choiceMarked("engr-levers-and-pulleys-9")).toEqual(["a"]);
    expect(key("engr-levers-and-pulleys-2")).toBeCloseTo(900*0.2/1.2, 0);
    expect(choiceMarked("engr-levers-and-pulleys-11")).toEqual(["c"]);
    expect(key("engr-levers-and-pulleys-3")).toBeCloseTo(800/4, 0);
    expect(key("engr-levers-and-pulleys-4")).toBeCloseTo(4*0.5, 0);
    expect(key("engr-levers-and-pulleys-5")).toBeCloseTo(50*0.32/0.04, 0);
    expect(key("engr-levers-and-pulleys-10")).toBeCloseTo(900/3, 0);
    expect(textAccepts("engr-levers-and-pulleys-6", "second")).toBe(true);
  // gear-trains
    expect(key("engr-gear-trains-7")).toBeCloseTo(100, 0);
    expect(choiceMarked("engr-gear-trains-8")).toEqual(["a"]);
    expect(key("engr-gear-trains-1")).toBeCloseTo(1200*20/60, 0);
    expect(key("engr-gear-trains-11")).toBeCloseTo(5, 0);
    expect(choiceMarked("engr-gear-trains-9")).toEqual(["a"]);
    expect(key("engr-gear-trains-2")).toBeCloseTo(10*60/20, 0);
    expect(key("engr-gear-trains-3")).toBeCloseTo(1200*20/30, 0);
    expect(key("engr-gear-trains-4")).toBeCloseTo(1800/((45/15)*(60/20)), 0);
    expect(key("engr-gear-trains-5")).toBeCloseTo(60*48/16, 0);
    expect(key("engr-gear-trains-10")).toBeCloseTo(6*45/15, 0);
    expect(textAccepts("engr-gear-trains-6", "same")).toBe(true);
  // efficiency-and-power
    expect(key("engr-efficiency-and-power-7")).toBeCloseTo(600*2, 0);
    expect(key("engr-efficiency-and-power-8")).toBeCloseTo(60*2*Math.PI/60, 2);
    expect(key("engr-efficiency-and-power-1")).toBeCloseTo(20*1500*2*Math.PI/60, 0);
    expect(choiceMarked("engr-efficiency-and-power-9")).toEqual(["a"]);
    expect(key("engr-efficiency-and-power-11")).toBeCloseTo(100*0.9**3, 1);
    expect(key("engr-efficiency-and-power-2")).toBeCloseTo(100*0.95*0.95, 2);
    expect(key("engr-efficiency-and-power-3")).toBeCloseTo(20*4*0.9, 0);
    expect(key("engr-efficiency-and-power-4")).toBeCloseTo(2000*0.5/0.8, 0);
    expect(key("engr-efficiency-and-power-5")).toBeCloseTo(1600/(4*0.8), 0);
    expect(key("engr-efficiency-and-power-10")).toBeCloseTo(30*600*2*Math.PI/60, 0);
    expect(choiceMarked("engr-efficiency-and-power-6")).toEqual(["1"]);
  });

  it("gives every misconception a distinct wrong answer, never the key", () => {
    for (const item of bundle.questions) {
      const authority = item.answerAuthority;
      for (const misconception of item.misconceptions ?? []) {
        if (authority.kind === "numeric") {
          expect(misconception.match.numeric ?? [], item.id).not.toContain(authority.value);
          // Feedback shown before the reveal must not state the key.
          expect(misconception.feedback, item.id).not.toMatch(
            new RegExp(`(^|[^\\d.])${String(authority.value).replace(".", "\\.")}($|[^\\d.])`, "u"),
          );
        }
      }
    }
  });

  it("marks exactly one choice correct on every multiple-choice item", () => {
    for (const q of bundle.questions.filter((item) => item.choices?.length)) {
      expect(choiceMarked(q.id), q.id).toHaveLength(1);
    }
  });

  it("keeps multiple choice to at most 35% of the course and every graded figure hidden", () => {
    const choices = bundle.questions.filter((item) => item.choices?.length).length;
    expect(choices / bundle.questions.length).toBeLessThanOrEqual(0.35);
    for (const lesson of bundle.lessons)
      for (const step of lesson.steps.filter((item) => item.diagram)) {
        // A figure on a teaching screen shows its results; one beside a question hides them.
        if (teachingOnly(step)) continue;
        expect(step.answerVisibility, `${lesson.id}/${step.id}`).toBe("hidden-until-response");
      }
  });
});
