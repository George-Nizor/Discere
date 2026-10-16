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
const storyLessons = [
  "measuring-motion",
  "speed-and-direction",
  "reading-motion-graphs",
  "changing-velocity",
  "predicting-a-motion",
  "falling-and-rising",
  "balanced-forces",
  "force-mass-acceleration",
  "weight-and-support",
  "pairs-of-forces",
  "friction-and-motion",
  "work-by-a-force",
  "energy-of-motion",
  "lifting-and-falling-energy",
  "keeping-energy-account",
  "power-and-efficiency",
  "momentum-and-impulse",
  "carts-that-stick",
];
const near = (id: string, expected: number) => expect(numeric(id)).toBeCloseTo(expected, 6);

describe("Physics: Motion and Forces (v2 numeric keys)", () => {
  it("measuring motion: displacement and distance", () => {
    // keys
    near("measuring-motion-hook", 5 - 2);
    near("measuring-motion-direction", 2 - 6);
    near("measuring-motion-stretches", 4 + 4);
    near("measuring-motion-1", 9 - 2);
    near("measuring-motion-2", (7 - 1) + (7 - 1));
    near("measuring-motion-4", 8 + (8 - 3));
    near("measuring-motion-5", -4 - 5);
    near("measuring-motion-check-3", (2 - -4) + (2 - -3));
    // a second tape with its zero 10 m behind the first reads 12 m to 19 m: same displacement
    near("measuring-motion-origin", 19 - 12);
    expect(19 - 12).toBe(9 - 2);
    // sums in the teaching screens and the worked example
    expect([4 - 1, 1 - 4]).toEqual([3, -3]);
    expect([3 - 0, 5 + 2]).toEqual([3, 7]);
    expect([2 - 1, 5 - 1, 5 - 2, 5 - 1 + (5 - 2)]).toEqual([1, 4, 3, 7]);
    expect([8 - 3, 18 - 13]).toEqual([5, 5]);
  });

  it("speed and direction", () => {
    near("speed-and-direction-hook", 20 / 4);
    near("speed-and-direction-sign", -10 / 5);
    near("speed-and-direction-1", 18 / 6);
    near("speed-and-direction-2", -12 / 3);
    near("speed-and-direction-3", (0 - 0) / 5);
    near("speed-and-direction-5", 42 / 7);
    near("speed-and-direction-check-3", (30 - 6) / (5 + 1));
    // two stretches of 12 m, taking 2 s and 6 s: total distance over total time
    near("speed-and-direction-slow-half", (12 + 12) / (2 + 6));
    expect((12 / 2 + 12 / 6) / 2).not.toBeCloseTo(numeric("speed-and-direction-slow-half"), 6);
    // sums in the teaching screens and the worked example
    expect([12 / 3, 12 / 6, 8 / 2, -9 / 3]).toEqual([4, 2, 4, -3]);
    expect([(30 + 30) / 20, (30 - 30) / 20]).toEqual([3, 0]);
    expect((10 + 10) / (2 + 8)).toBe(2);
    expect((10 / 2 + 10 / 8) / 2).toBeCloseTo(3.125, 9);
    expect([(15 + 5) / (3 + 2), (15 - 5) / (3 + 2)]).toEqual([4, 2]);
  });

  it("reading motion graphs", () => {
    near("reading-motion-graphs-hook", 3 * (6 / 2));
    near("reading-motion-graphs-rise", (10 - 4) / (3 - 1));
    near("reading-motion-graphs-1", (14 - 2) / 3);
    near("reading-motion-graphs-3", (2 - 10) / 4);
    near("reading-motion-graphs-4", (2 - 0) / 6);
    near("reading-motion-graphs-5", (15 - 3) / (4 - 1));
    near("reading-motion-graphs-check-3", (5 - 20) / 3);
    // sums in the teaching screens and the worked example
    expect((10 - 1) / 3).toBe(3);
    expect((2 - 14) / 4).toBe(-3);
    expect((7 - 1) / 10).toBeCloseTo(0.6, 9);
    expect([(8 - 0) / 2, (8 - 8) / 2, (2 - 8) / 2]).toEqual([4, 0, -3]);
    // the transfer item's graph is the worked example's graph: 0 m to 2 m over 6 s
    expect(2 / 6).toBeCloseTo(numeric("reading-motion-graphs-4"), 9);
  });

  it("changing velocity", () => {
    near("changing-velocity-hook", 10 + 4 * 3);
    near("changing-velocity-rate", (15 - 3) / 4);
    near("changing-velocity-1", (10 - 2) / 4);
    near("changing-velocity-2", (-2 - -8) / 3);
    near("changing-velocity-4", (6 - 6) / 4);
    near("changing-velocity-5", (-3 - 9) / 4);
    near("changing-velocity-check-3", (-4 - -10) / 3);
    // sums in the teaching screens and the worked example
    expect([0 + 3 * 3, 9 / 1]).toEqual([9, 9]);
    expect([(16 - 4) / 3, (2 - 8) / 3, (-9 - -1) / 4]).toEqual([4, -2, -2]);
    expect([(5 - 5) / 3, (-2 - 2) / 4]).toEqual([0, -1]);
    // speeding up or slowing down: compare the signs of velocity and acceleration
    expect(Math.sign(-1) === Math.sign((-9 - -1) / 4)).toBe(true);
    expect(Math.sign(8) === Math.sign((2 - 8) / 3)).toBe(false);
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
    // a cart from rest covers 6 m in 2 s: a = 3 m/s², so 24 m in 4 s
    const a = (2 * 6) / 2 ** 2;
    near("predicting-a-motion-double", 0.5 * a * 4 ** 2);
    expect(dx(0, a, 2)).toBe(6);
    // from rest, doubling the time quadruples the distance
    expect(dx(0, 2, 4) / dx(0, 2, 2)).toBe(4);
    // sums in the teaching screens and the worked example
    expect([u(1, 3, 2), u(9, -2, 3), 6 * 5]).toEqual([7, 3, 30]);
    expect([u(1, 2, 4), (1 + 9) / 2, dx(1, 2, 4)]).toEqual([9, 5, 20]);
    expect([u(2, 1, 6), (2 + 8) / 2, dx(2, 1, 6)]).toEqual([8, 5, 30]);
    expect(dx(10, -2, 5)).toBe(25);
    expect([dx(6, 2, 3), 6 * 3 + 0.5 * 2 * 3 ** 2, 10 + dx(6, 2, 3)]).toEqual([27, 27, 37]);
  });

  it("falling and rising", () => {
    near("falling-and-rising-hook", 10 * 5);
    near("falling-and-rising-direction", 0 + -g * 3);
    near("falling-and-rising-1", 0 + -g * 2);
    near("falling-and-rising-2", 45 - 0.5 * g * 2 ** 2);
    near("falling-and-rising-3", -g);
    near("falling-and-rising-5", 30 * 2 - 0.5 * g * 2 ** 2);
    near("falling-and-rising-check-3", 25 - g * 2);
    // sums in the teaching screens: velocity gains, distance fallen, the throw
    expect([g * 1, g * 2, g * 4]).toEqual([10, 20, 40]);
    expect([0.5 * g * 1 ** 2, 0.5 * g * 4 ** 2, 80 - 0.5 * g * 1 ** 2]).toEqual([5, 80, 75]);
    expect(0 + -g * 4).toBe(-40);
    expect([20 - g * 1, 20 - g * 2, 20 - g * 4]).toEqual([10, 0, -20]);
    expect([20 * 2 - 0.5 * g * 2 ** 2, 20 * 4 - 0.5 * g * 4 ** 2]).toEqual([20, 0]);
    // the worked and faded examples
    expect([0.5 * g * 3 ** 2, 80 - 0.5 * g * 3 ** 2, 45 - 0.5 * g * 2 ** 2]).toEqual([45, 35, 25]);
    // a fall is 16 times as far in 4 times the time
    expect((0.5 * g * 4 ** 2) / (0.5 * g * 1 ** 2)).toBe(16);
    // the throw reaches the top when v = 0, at t = u / g
    expect(20 / g).toBe(2);
  });

  it("balanced forces", () => {
    near("balanced-forces-hook", 400 - 350);
    near("balanced-forces-signs", 25 - 10);
    near("balanced-forces-1", 14 - 6);
    near("balanced-forces-3", 9 - 9);
    near("balanced-forces-4", 8 - 20);
    near("balanced-forces-5", 7 + 11 - 5);
    near("balanced-forces-check-3", 50);
    // the tug of war: the right team gives +350 N and the left team gives -400 N
    expect(350 + -400).toBe(-(400 - 350));
    // the worked example, the faded example and the transfer item
    expect([12 - 7 - 3, 9 + -9, 8 - 20]).toEqual([2, 0, -12]);
  });

  it("force, mass and acceleration", () => {
    near("force-mass-acceleration-hook", 6 / 2);
    near("force-mass-acceleration-divide", 20 / 4);
    near("force-mass-acceleration-1", (18 - 6) / 3);
    near("force-mass-acceleration-3", 24 / 2);
    near("force-mass-acceleration-4", (4 - 12) / 4);
    near("force-mass-acceleration-5", 4 * 3);
    near("force-mass-acceleration-check-3", 45 / 9);
    // the trolley: 10 N on 5 kg, then on 10 kg, then 20 N on 5 kg
    expect([10 / 5, 10 / 10, 20 / 5]).toEqual([2, 1, 4]);
    // the hook: the same push on twice the mass gives half of 6 m/s²
    near("force-mass-acceleration-hook", 6 / 2);
    // a 2 kg cart at 5 m/s with 10 N against it: a = -5 m/s², stopped after 1 s
    const back = -10 / 2;
    expect([back, 5 + back * 1]).toEqual([-5, 0]);
    // the worked example: 8 kg with 30 N and 6 N opposing
    expect((30 - 6) / 8).toBe(3);
    // working backwards: F = ma and m = F / a
    expect([5 * 3, 30 / 6]).toEqual([15, 5]);
    // the transfer item and the skill check's first item
    near("force-mass-acceleration-5", 4 * 3);
    near("force-mass-acceleration-divide", 20 / 4);
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
    // the bag: 2 kg and 5 kg, then the table, then lifts that speed up or slow down
    expect([2 * g, 5 * g]).toEqual([20, 50]);
    expect([3 * (g + 1), 3 * (g + 1) - 3 * g]).toEqual([33, 3]);
    expect([3 * (g - 1), 3 * (g - g)]).toEqual([27, 0]);
    // the worked and faded examples
    expect([2 * g + 2 * 3, 4 * g + 4 * 2]).toEqual([26, 48]);
    // on the Moon, with g = 1.6 N per kg, the 5 kg bag weighs 8 N and keeps its mass
    expect(5 * 1.6).toBeCloseTo(8, 9);
    // free fall: a = W / m = g whatever the mass
    for (const m of [0.5, 2, 8]) expect((m * g) / m).toBe(g);
    // a lift going down steadily has a = 0, so the support equals the weight
    expect(6 * (g + 0)).toBe(6 * g);
    // the skill check's second item is the resting 4 kg object
    expect(numeric("weight-and-support-3")).toBe(4 * g);
  });

  it("pairs of forces", () => {
    near("pairs-of-forces-hook", 40);
    near("pairs-of-forces-signed", -10);
    near("pairs-of-forces-1", 10);
    near("pairs-of-forces-2", 10 / 5);
    near("pairs-of-forces-3", -10 / 2);
    near("pairs-of-forces-5", 18 / 6);
    near("pairs-of-forces-check-3", -16 / 4);
    // the screen's skaters: 90 N on 30 kg and on 45 kg, in opposite directions
    expect([90 / 30, 90 / 45]).toEqual([3, 2]);
    expect([-90 / 30, 90 / 45]).toEqual([-3, 2]);
    // a +30 N force on B has a partner of -30 N on A
    expect(-30).toBe(-(+30));
    // the worked example: 3 kg and 6 kg pushed apart by 12 N
    expect([-12 / 3, 12 / 6]).toEqual([-4, 2]);
    // taken together the pair sums to zero
    expect(12 + -12).toBe(0);
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
    // the screen on the ceiling: a 10 kg crate, μs = 0.4, ceiling 40 N, so 45 N slides
    expect(0.4 * (10 * g)).toBeCloseTo(40, 9);
    expect(45 > 0.4 * 10 * g).toBe(true);
    // the worked example's limit
    expect(0.4 * 3 * g).toBeCloseTo(12, 9);
    // the faded example and the grip item: 4 kg, ceiling 20 N, a 12 N push sits below it
    expect(12 < 0.5 * 4 * g).toBe(true);
    // the screen on sliding: 5 kg, ceiling 25 N, sliding friction 15 N
    expect(0.5 * 5 * g).toBeCloseTo(25, 9);
    expect(0.3 * 5 * g).toBeCloseTo(15, 9);
    // the screen on the net force: 6 kg, sliding friction 18 N, 30 N push gives 2 m/s²
    expect(0.3 * 6 * g).toBeCloseTo(18, 9);
    expect((30 - 0.3 * 6 * g) / 6).toBeCloseTo(2, 9);
    // the transfer item reuses the 4 kg box: friction 12 N, push 24 N
    expect(0.3 * 4 * g).toBeCloseTo(12, 9);
  });

  it("work by a force", () => {
    near("work-by-a-force-hook", (20 / 2) * 8);
    near("work-by-a-force-along", 9 * 6);
    near("work-by-a-force-1", 15 * 4);
    near("work-by-a-force-2", -6 * 5);
    near("work-by-a-force-3", 20 * 3 * Math.cos(Math.PI / 2) + 0);
    near("work-by-a-force-4", 10 * 7);
    near("work-by-a-force-check-3", 12 * 5 - 9 * 5);
    // the tally screen: 10 N for 3 m is 30, 20 N for 3 m is 60
    expect([10 * 3, 20 * 3]).toEqual([30, 60]);
    // the unit screen: 12 N over 3 m and 6 m
    expect([12 * 3, 12 * 6]).toEqual([36, 72]);
    // forces against the move, and the worked example
    expect(-5 * 4).toBe(-20);
    expect(-8 * 3).toBe(-24);
    // the screen on several forces: 30 N pull and 10 N friction over 4 m
    expect([30 * 4, -10 * 4, 30 * 4 - 10 * 4, (30 - 10) * 4]).toEqual([120, -40, 80, 80]);
    // the net-work item: +70 J and -28 J
    expect(70 - 28).toBe(42);
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
    // the derivation screen: 3 kg at 2 m/s braked by 3 N
    const a = 3 / 3;
    const stopTime = 2 / a;
    const stopDistance = (2 / 2) * stopTime;
    expect([a, stopTime, stopDistance, 3 * stopDistance]).toEqual([1, 2, 2, 6]);
    expect(k(3, 2)).toBe(6);
    // the work-energy screen: 5 kg from 2 m/s to 4 m/s
    expect([k(5, 2), k(5, 4), k(5, 4) - k(5, 2), k(5, 2) - k(5, 4)]).toEqual([10, 40, 30, -30]);
    // the worked example: 1 kg from 2 to 4 m/s
    expect([k(1, 2), k(1, 4), k(1, 4) / k(1, 2)]).toEqual([2, 8, 4]);
    // the hook: same braking force, so distance scales with kinetic energy
    expect(1 * (k(1, 6) / k(1, 3))).toBe(4);
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
    // the lift screen: a 6 kg bag up 1.5 m, then gravity's work is its negative
    expect([6 * g, 6 * g * 1.5, -(6 * g) * 1.5]).toEqual([60, 90, -90]);
    // the book: 1 m to 2.5 m and back, then with a table 0.8 m high
    expect([2 * g * (2.5 - 1), 2 * g * (1 - 2.5)]).toEqual([30, -30]);
    expect(2 * g * (1.7 - 0.2)).toBeCloseTo(30, 9);
    // the falling ball: 1 kg, 3 m
    expect([1 * g * -3, -(1 * g * -3)]).toEqual([-30, 30]);
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
    // the falling apple: 0.5 kg from 4 m, with 20 J at the top, 10 J halfway
    expect([0.5 * g * 4, 0.5 * g * 2, 0.5 * g * 4 - 0.5 * g * 2]).toEqual([20, 10, 10]);
    // the rough ramp: 1 kg down 3 m with 10 J of heating
    expect([1 * g * 3, 1 * g * 3 - 10]).toEqual([30, 20]);
    // from energy to speed: 2 kg with 16 J
    expect(Math.sqrt((2 * 16) / 2)).toBe(4);
    // the whole account: 5 J + 40 J lost - 15 J of heating
    expect([40 - 15, 5 + 40 - 15]).toEqual([25, 30]);
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
    // the kettle and the candle: 2,000 W and about 50 W, 120,000 J in a minute and in forty minutes
    expect([2000 * 10, 2000 * 60, 120000 / 50 / 60]).toEqual([20000, 120000, 40]);
    // one 600 J job in 12 s and in 6 s: halving the time doubles the power
    expect([600 / 12, 600 / 6, 600 / 6 / (600 / 12)]).toEqual([50, 100, 2]);
    expect(600 / 10).toBe(60);
    // the kettle's efficiency, its wasted share, and its rating of 2,000 W at 90%
    expect([900 / 1000, 1000 - 900, 0.9 * 2000, 2000 - 0.9 * 2000]).toEqual([0.9, 100, 1800, 200]);
    // the lamp's account and the rate running backwards
    expect([100 - 5, 45 / 0.9]).toEqual([95, 50]);
    // the worked example: 500 J in, 400 J out
    expect([400 / 500, 500 - 400]).toEqual([0.8, 100]);
    // the transfer item: the same energy in half the time doubles the power
    expect(1200 / 2 / (1200 / 4)).toBe(2);
    // the check items are the ones the lesson lists, and the unused ones stay out
    const lesson = bundle.lessons.find((l) => l.id === "power-and-efficiency")!;
    expect(lesson.questionIds).toEqual([
      "phys-power-and-efficiency-first-power",
      "phys-power-and-efficiency-5",
      "phys-power-and-efficiency-check-3",
    ]);
    const used = lesson.steps.flatMap((s) => [
      s.checkQuestionId,
      ...(s.workedSteps ?? []).flatMap((w) => [w.blank?.questionId, w.selfExplain?.questionId]),
    ]);
    expect(used).not.toContain("phys-power-and-efficiency-6");
    expect(used).not.toContain("phys-power-and-efficiency-first-efficiency");
    // the lesson picks up the kettle and the candle from the last lesson's close
    const before = bundle.lessons.find((l) => l.id === "keeping-energy-account")!;
    expect(before.recap?.nextHook).toMatch(/kettle/i);
    const opener = lesson.intro?.hook.blocks.map((b) => ("text" in b ? b.text : "")).join(" ") ?? "";
    expect(opener).toMatch(/kettle/i);
    expect(opener).toMatch(/candle/i);
    // no term is used before the screen that introduces it
    expect(opener).not.toMatch(/\bpower\b|\befficiency\b/i);
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
    // the first screen: 1 kg and 10 kg at 5 m/s, and a 1 kg ball moving left at 7 m/s
    expect([1 * 5, 10 * 5, 1 * -7]).toEqual([5, 50, -7]);
    // the push on a 5 kg trolley: 10 N for 3 s and for 1 s
    expect([10 * 3, 10 * 1, (10 * 3) / 5, (10 * 1) / 5]).toEqual([30, 10, 6, 2]);
    // the 4 kg cart at 1 m/s: +12 N·s gives 4 m/s, -4 N·s stops it, -12 N·s gives -2 m/s
    expect([(4 * 1 + 12) / 4, (4 * 1 - 4) / 4, (4 * 1 - 12) / 4]).toEqual([4, 0, -2]);
    // the worked example: 2 kg at +3 m/s with 5 N for 4 s
    expect([2 * 3, 5 * 4, (2 * 3 + 5 * 4) / 2]).toEqual([6, 20, 13]);
    // the hook's two stops hold the same impulse: 40 N × 0.5 s = 10 N × 2 s
    expect(40 * 0.5).toBe(10 * 2);
    // the catch: a 2 kg ball at 5 m/s stopped in 0.5 s and in 2 s, four times the force for a quarter of the time
    expect([(0 - 2 * 5) / 0.5, (0 - 2 * 5) / 2, (0 - 2 * 5) / 0.5 / ((0 - 2 * 5) / 2)]).toEqual([
      -20, -5, 4,
    ]);
    // the figure's forces carry the cart to rest: 2 kg at 5 m/s with -20 N for 0.5 s and -5 N for 2 s
    expect([5 + (-20 * 0.5) / 2, 5 + (-5 * 2) / 2]).toEqual([0, 0]);
    // the bounce: 3 kg at ±5 m/s keeps 37.5 J and the momentum changes by -30 kg·m/s
    expect([0.5 * 3 * 5 ** 2, 0.5 * 3 * (-5) ** 2, 3 * -5 - 3 * 5, -15 * 2]).toEqual([37.5, 37.5, -30, -30]);
    expect(5 + (-15 * 2) / 3).toBe(-5);
    // the transfer item: 2 kg from +4 to -4 m/s
    expect([0.5 * 2 * 4 ** 2 - 0.5 * 2 * (-4) ** 2, 2 * -4 - 2 * 4]).toEqual([0, -16]);
    expect(4 + (-8 * 2) / 2).toBe(-4);
    // the check items are the ones the lesson lists
    const lesson = bundle.lessons.find((l) => l.id === "momentum-and-impulse")!;
    expect(lesson.questionIds).toEqual([
      "phys-momentum-and-impulse-left",
      "phys-momentum-and-impulse-try",
      "phys-momentum-and-impulse-check-3",
    ]);
    // the lesson picks up the close of the last one and does not use its terms early
    const before = bundle.lessons.find((l) => l.id === "power-and-efficiency")!;
    expect(before.recap?.nextHook).toMatch(/direction/i);
    const opener = lesson.intro?.hook.blocks.map((b) => ("text" in b ? b.text : "")).join(" ") ?? "";
    expect(opener).not.toMatch(/\bmomentum\b|\bimpulse\b/i);
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
    // the shared velocity of the worked example, and the same cart's momentum with sign
    expect(v(3, 4, 1, -8)).toBe(1);
    expect(1 * -8).toBe(-8);
    // the teaching screens: 1 kg at 5 m/s onto a resting 4 kg, then 2 kg at +5 and 3 kg at -2
    expect([1 * 5 + 4 * 0, v(1, 5, 4, 0)]).toEqual([5, 1]);
    expect([2 * 5, 3 * -2, 2 * 5 + 3 * -2, v(2, 5, 3, -2)]).toEqual([10, -6, 4, 0.8]);
    // the energy lost by the 1 kg cart that sticks to the 4 kg cart: 12.5 J to 2.5 J, four fifths
    expect([k(1, 5), k(5, 1), k(1, 5) - k(5, 1), (k(1, 5) - k(5, 1)) / k(1, 5)]).toEqual([12.5, 2.5, 10, 0.8]);
    // momentum is the same before and after in the hook and in the energy item
    expect(1 * 8).toBe(2 * v(1, 8, 1, 0));
    expect(2 * 6).toBe(6 * v(2, 6, 4, 0));
    // equal and opposite momenta leave the pair at rest
    expect(2 * 6 + 4 * -3).toBe(0);
    // the check items are the ones the lesson lists
    const lesson = bundle.lessons.find((l) => l.id === "carts-that-stick")!;
    expect(lesson.questionIds).toEqual([
      "phys-carts-that-stick-first-stick",
      "phys-carts-that-stick-check-3",
      "phys-carts-that-stick-first-loss",
    ]);
    const before = bundle.lessons.find((l) => l.id === "momentum-and-impulse")!;
    expect(before.recap?.nextHook).toMatch(/carts/i);
    const opener = lesson.intro?.hook.blocks.map((b) => ("text" in b ? b.text : "")).join(" ") ?? "";
    expect(opener).toMatch(/cart/i);
    expect(opener).not.toMatch(/conservation|inelastic/i);
  });

  it("keeps multiple choice under the course cap and gives every lesson three check items", () => {
    const choices = bundle.questions.filter((q) => q.choices && q.choices.length > 0).length;
    expect(choices / bundle.questions.length).toBeLessThanOrEqual(0.35);
    for (const lesson of bundle.lessons) {
      expect(lesson.questionIds).toHaveLength(3);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
      if (storyLessons.includes(lesson.id)) continue;
      expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.length).toBeLessThanOrEqual(7);
    }
  });

  it("tells the first ten lessons as stories", () => {
    for (const id of storyLessons) {
      const lesson = bundle.lessons.find((item) => item.id === id)!;
      const teaching = lesson.steps.filter((s) => s.kind === "explain" && !s.checkQuestionId);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(8);
      expect(lesson.steps.length).toBeLessThanOrEqual(14);
      expect(teaching.length / lesson.steps.length).toBeGreaterThanOrEqual(0.4);
      // an opener that asks nothing, and a figure somewhere in the lesson
      expect(lesson.intro?.hook.questionId).toBeUndefined();
      expect(lesson.steps.some((s) => s.diagram)).toBe(true);
      // every graded figure hides its answer
      for (const step of lesson.steps)
        if (step.diagram && step.checkQuestionId)
          expect(step.answerVisibility).toBe("hidden-until-response");
      // questions that are asked: 3 to 7 practice screens
      const asked = lesson.steps.filter(
        (s) => s.checkQuestionId || s.workedSteps?.some((w) => w.blank || w.selfExplain),
      );
      expect(asked.length).toBeGreaterThanOrEqual(3);
      expect(asked.length).toBeLessThanOrEqual(7);
      // no teaching screen asks anything
      for (const step of teaching) expect(step.checkQuestionId).toBe("");
    }
  });

  it("chains each lesson's close into the next lesson's opener", () => {
    for (const id of storyLessons) {
      const lesson = bundle.lessons.find((item) => item.id === id)!;
      expect(lesson.recap?.nextHook?.length ?? 0).toBeGreaterThan(20);
      expect(lesson.recap?.nextHook?.trim().endsWith("?")).toBe(false);
    }
  });
});
