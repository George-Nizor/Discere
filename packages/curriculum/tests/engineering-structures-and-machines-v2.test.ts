import { existsSync, readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * Engineering: Structures and Machines, v2 lessons. Every numeric key is recomputed here from the
 * arithmetic the item describes, not read back from the authority it is checking. The course is
 * read from the published bundle once it carries v2 lessons, and from the reviewed candidate until
 * then.
 */
const root = new URL("../../../content/engineering-structures-and-machines/", import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), "utf8")) as CourseBundle;
const published = read("bundle.json");
const bundle =
  published.lessons.every((item) => item.intro) || !existsSync(new URL(".authoring/candidate.json", root))
    ? published
    : read(".authoring/candidate.json");

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

describe("Engineering: Structures and Machines (v2)", () => {
  it("is twelve v2 lessons that validate with no errors", () => {
    const validation = validateCourseBundle(bundle);
    expect(validation.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(bundle.lessons).toHaveLength(12);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro, lesson.id).toBeDefined();
      expect(lesson.recap, lesson.id).toBeDefined();
      expect(lesson.questionIds, lesson.id).toHaveLength(3);
      expect(lesson.steps.length, lesson.id).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.length, lesson.id).toBeLessThanOrEqual(7);
      expect(
        lesson.steps.some((step) => step.kind === "transfer"),
        lesson.id,
      ).toBe(true);
    }
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

  it("keeps multiple choice to at most 35% of the course and every graded figure hidden", () => {
    const choices = bundle.questions.filter((item) => item.choices?.length).length;
    expect(choices / bundle.questions.length).toBeLessThanOrEqual(0.35);
    for (const lesson of bundle.lessons)
      for (const step of lesson.steps.filter((item) => item.diagram))
        expect(step.answerVisibility, `${lesson.id}/${step.id}`).toBe("hidden-until-response");
  });
});
