import { readFileSync } from "node:fs";
import type { CourseBundle } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Physics: Motion and Forces, v2 lessons. Every numeric key the migration wrote is recomputed
 * here from the physics it describes, not read back from the answer it is checking.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/physics-motion-and-forces/.authoring/candidate.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;

const numeric = (id: string): number => {
  const item = bundle.questions.find((q) => q.id === `phys-${id}`);
  if (!item) throw new Error(`missing ${id}`);
  if (item.answerAuthority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return item.answerAuthority.value;
};
const g = 10;
const near = (id: string, expected: number) => expect(numeric(id)).toBeCloseTo(expected, 6);

describe("Physics: Motion and Forces (v2 numeric keys)", () => {
  it("measuring motion: displacement and distance", () => {
    near("measuring-motion-hook", 5 - 2);
    near("measuring-motion-direction", 2 - 6);
    near("measuring-motion-stretches", 4 + 4);
    near("measuring-motion-1", 9 - 2);
    near("measuring-motion-2", (7 - 1) + (7 - 1));
    near("measuring-motion-4", 8 + (8 - 3));
    near("measuring-motion-5", -4 - 5);
    near("measuring-motion-check-3", (2 - -4) + (2 - -3));
  });

  it("speed and direction", () => {
    near("speed-and-direction-hook", 20 / 4);
    near("speed-and-direction-sign", -10 / 5);
    near("speed-and-direction-1", 18 / 6);
    near("speed-and-direction-2", -12 / 3);
    near("speed-and-direction-3", (0 - 0) / 5);
    near("speed-and-direction-5", 42 / 7);
    near("speed-and-direction-check-3", (30 - 6) / (5 + 1));
  });

  it("reading motion graphs", () => {
    near("reading-motion-graphs-hook", 3 * (6 / 2));
    near("reading-motion-graphs-rise", (10 - 4) / (3 - 1));
    near("reading-motion-graphs-1", (14 - 2) / 3);
    near("reading-motion-graphs-3", (2 - 10) / 4);
    near("reading-motion-graphs-4", (2 - 0) / 6);
    near("reading-motion-graphs-5", (15 - 3) / (4 - 1));
    near("reading-motion-graphs-check-3", (5 - 20) / 3);
  });

  it("changing velocity", () => {
    near("changing-velocity-hook", 10 + 4 * 3);
    near("changing-velocity-rate", (15 - 3) / 4);
    near("changing-velocity-1", (10 - 2) / 4);
    near("changing-velocity-2", (-2 - -8) / 3);
    near("changing-velocity-4", (6 - 6) / 4);
    near("changing-velocity-5", (-3 - 9) / 4);
    near("changing-velocity-check-3", (-4 - -10) / 3);
  });

  it("predicting a motion", () => {
    const u = (u0: number, a: number, t: number) => u0 + a * t;
    const dx = (u0: number, a: number, t: number) => ((u0 + u(u0, a, t)) / 2) * t;
    near("predicting-a-motion-hook", 5 * 8);
    near("predicting-a-motion-braking", u(14, -3, 4));
    near("predicting-a-motion-1", u(3, 2, 4));
    near("predicting-a-motion-2", dx(3, 2, 4));
    expect(dx(3, 2, 4)).toBeCloseTo(3 * 4 + 0.5 * 2 * 16, 9);
    near("predicting-a-motion-4", ((12 + 0) / 2) * 4);
    near("predicting-a-motion-5", 5 + 2 * 4 + 0.5 * 1 * 16);
    near("predicting-a-motion-check-3", dx(8, 2, 3));
    // from rest, doubling the time quadruples the distance
    expect(dx(0, 2, 4) / dx(0, 2, 2)).toBe(4);
  });

  it("falling and rising", () => {
    near("falling-and-rising-hook", 10 * 5);
    near("falling-and-rising-direction", 0 + -g * 3);
    near("falling-and-rising-1", 0 + -g * 2);
    near("falling-and-rising-2", 45 - 0.5 * g * 2 ** 2);
    near("falling-and-rising-3", -g);
    near("falling-and-rising-5", 30 * 2 - 0.5 * g * 2 ** 2);
    near("falling-and-rising-check-3", 25 - g * 2);
  });

  it("balanced forces", () => {
    near("balanced-forces-hook", 400 - 350);
    near("balanced-forces-signs", 25 - 10);
    near("balanced-forces-1", 14 - 6);
    near("balanced-forces-3", 9 - 9);
    near("balanced-forces-4", 8 - 20);
    near("balanced-forces-5", 7 + 11 - 5);
    near("balanced-forces-check-3", 50);
  });

  it("force, mass and acceleration", () => {
    near("force-mass-acceleration-hook", 6 / 2);
    near("force-mass-acceleration-divide", 20 / 4);
    near("force-mass-acceleration-1", (18 - 6) / 3);
    near("force-mass-acceleration-3", 24 / 2);
    near("force-mass-acceleration-4", (4 - 12) / 4);
    near("force-mass-acceleration-5", 4 * 3);
    near("force-mass-acceleration-check-3", 45 / 9);
  });

  it("weight and support", () => {
    near("weight-and-support-hook", 6 * 10);
    near("weight-and-support-other-planet", 3 * 4);
    near("weight-and-support-shelf", 7 * g);
    near("weight-and-support-1", 3 * g);
    near("weight-and-support-3", 4 * g);
    near("weight-and-support-4", 4 * (g + 2));
    near("weight-and-support-5", 7 * 9.8);
    near("weight-and-support-check-3", 6 * (g - 3));
  });

  it("pairs of forces", () => {
    near("pairs-of-forces-hook", 40);
    near("pairs-of-forces-signed", -10);
    near("pairs-of-forces-1", 10);
    near("pairs-of-forces-2", 10 / 5);
    near("pairs-of-forces-3", -10 / 2);
    near("pairs-of-forces-5", 18 / 6);
    near("pairs-of-forces-check-3", -16 / 4);
  });

  it("friction and motion", () => {
    near("friction-and-motion-hook", 30);
    near("friction-and-motion-limit", 0.6 * 2 * g);
    near("friction-and-motion-1", 12);
    near("friction-and-motion-2", 0.5 * 4 * g);
    near("friction-and-motion-3", 0.3 * 4 * g);
    near("friction-and-motion-4", (24 - 12) / 4);
    near("friction-and-motion-check-3", 0.25 * 6 * g);
    // the worked example's push (15 N) beats its limit
    expect(15 > 0.4 * 3 * g).toBe(true);
  });

  it("work by a force", () => {
    near("work-by-a-force-hook", (20 / 2) * 8);
    near("work-by-a-force-along", 9 * 6);
    near("work-by-a-force-1", 15 * 4);
    near("work-by-a-force-2", -6 * 5);
    near("work-by-a-force-3", 20 * 3 * Math.cos(Math.PI / 2) + 0);
    near("work-by-a-force-4", 10 * 7);
    near("work-by-a-force-check-3", 12 * 5 - 9 * 5);
  });

  it("energy of motion", () => {
    const k = (m: number, v: number) => 0.5 * m * v ** 2;
    near("energy-of-motion-hook", 1 * (6 / 3) ** 2);
    near("energy-of-motion-first-energy", k(1, 6));
    near("energy-of-motion-1", k(2, 3));
    near("energy-of-motion-2", k(1, 6) / k(1, 3));
    near("energy-of-motion-energy-gain", 25 - 10);
    near("energy-of-motion-4", k(2, 5) - k(2, 3));
    near("energy-of-motion-5", k(4, 5));
    near("energy-of-motion-check-3", k(2, 1) - k(2, 5));
  });

  it("lifting and falling energy", () => {
    near("lifting-and-falling-energy-hook", 4 * g * 2);
    near("lifting-and-falling-energy-rise", 5 * g * 3);
    near("lifting-and-falling-energy-1", 3 * g * (5 - 1));
    near("lifting-and-falling-energy-gravity-up", -(3 * g * 2));
    near("lifting-and-falling-energy-3", 2 * g * (3 - 8));
    near("lifting-and-falling-energy-4", -(2 * g * (3 - 8)));
    near("lifting-and-falling-energy-5", 4 * g * 1.5);
    near("lifting-and-falling-energy-check-3", 5 * g * -4);
  });

  it("keeping the energy account", () => {
    near("keeping-energy-account-hook", 1 * g * 5);
    near("keeping-energy-account-with-heat", 90 - 30);
    near("keeping-energy-account-1", 2 * g * 10);
    near("keeping-energy-account-2", 2 * g * 10 - 40);
    near("keeping-energy-account-speed", Math.sqrt((2 * 36) / 2));
    near("keeping-energy-account-4", Math.sqrt((2 * 100) / 2));
    near("keeping-energy-account-5", 12 + 90 - 18);
    near("keeping-energy-account-check-3", 1 * g * 20 - 50);
  });

  it("power and efficiency", () => {
    near("power-and-efficiency-hook", 600 / 3);
    near("power-and-efficiency-first-power", 2000 / 5);
    near("power-and-efficiency-first-efficiency", (100 / 400) * 100);
    near("power-and-efficiency-1", 1200 / 4);
    near("power-and-efficiency-2", (1200 / 2000) * 100);
    near("power-and-efficiency-3", 2000 - 1200);
    near("power-and-efficiency-5", (350 / 500) * 100);
    near("power-and-efficiency-check-3", 120 / 0.4);
  });

  it("momentum and impulse", () => {
    near("momentum-and-impulse-hook", (40 * 0.5) / 2);
    near("momentum-and-impulse-left", 5 * -2);
    near("momentum-and-impulse-1", 3 * 4);
    near("momentum-and-impulse-2", 6 * 3);
    near("momentum-and-impulse-3", (3 * 4 + 18) / 3);
    near("momentum-and-impulse-try", (2 * 5 - 6) / 2);
    near("momentum-and-impulse-5", (0 - 4 * 6) / 3);
    near("momentum-and-impulse-check-3", (0 - 0.5 * 8) / 0.2);
  });

  it("carts that stick", () => {
    const v = (m1: number, u1: number, m2: number, u2: number) => (m1 * u1 + m2 * u2) / (m1 + m2);
    const k = (m: number, s: number) => 0.5 * m * s ** 2;
    near("carts-that-stick-hook", v(1, 8, 1, 0));
    near("carts-that-stick-first-stick", v(2, 9, 1, 0));
    near("carts-that-stick-1", v(2, 6, 4, 0));
    near("carts-that-stick-2", v(2, 6, 4, -3));
    near("carts-that-stick-3", k(2, 6) - k(6, 2));
    near("carts-that-stick-first-loss", k(1, 4) - k(2, v(1, 4, 1, 0)));
    near("carts-that-stick-5", v(3, 4, 1, 0));
    near("carts-that-stick-check-3", v(4, 5, 4, -1));
  });

  it("keeps multiple choice under the course cap and gives every lesson three check items", () => {
    const choices = bundle.questions.filter((q) => q.choices && q.choices.length > 0).length;
    expect(choices / bundle.questions.length).toBeLessThanOrEqual(0.35);
    for (const lesson of bundle.lessons) {
      expect(lesson.questionIds).toHaveLength(3);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.length).toBeLessThanOrEqual(7);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
    }
  });
});
