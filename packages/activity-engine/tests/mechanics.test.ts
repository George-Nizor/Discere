import { describe, expect, it } from "vitest";
import {
  MechanicsModelSchema,
  MechanicsDiagramSchema,
  type MechanicsModel,
} from "@discere/contracts";
import { mechanicsFrame, mechanicsBounds, mechanicsMeasures } from "../src/mechanics.js";
describe("mechanics models obey physical constraints", () => {
  it("separates total travel from signed displacement on a return trip", () => {
    const m: MechanicsModel = {
      kind: "journey",
      points: [
        { t: 0, x: 2 },
        { t: 3, x: 11 },
        { t: 5, x: 3 },
      ],
      display: "track",
    };
    expect(mechanicsFrame(m, 0.6).bodies[0]!.x).toBe(11);
    const end = mechanicsFrame(m, 1);
    expect(end.bodies[0]!.x).toBe(3);
    expect(end.distance).toBe(17);
    expect(mechanicsMeasures(m)).toContainEqual({ label: "Average velocity", value: "0.2 m/s" });
    expect(mechanicsMeasures(m)).toContainEqual({ label: "Average speed", value: "3.4 m/s" });
  });
  it("integrates constant acceleration and counts both legs of a reversal", () => {
    const m: MechanicsModel = {
      kind: "motion",
      x0: 0,
      v0: 6,
      acceleration: -2,
      duration: 6,
      axis: "horizontal",
      display: "track",
    };
    expect(mechanicsFrame(m, 0.5).bodies[0]).toMatchObject({ x: 9, velocity: 0 });
    expect(mechanicsFrame(m, 1).bodies[0]).toMatchObject({ x: 0, velocity: -6 });
    expect(mechanicsFrame(m, 1).distance).toBe(18);
  });
  it("keeps downward acceleration at the top of a vertical throw", () => {
    const f = mechanicsFrame(
      {
        kind: "motion",
        x0: 0,
        v0: 20,
        acceleration: -10,
        duration: 4,
        axis: "vertical",
        display: "track",
      },
      0.5,
    );
    expect(f.bodies[0]).toMatchObject({ x: 20, velocity: 0 });
    expect(f.acceleration).toBe(-10);
  });
  it("gives different masses the same free-fall trajectory without drag", () => {
    const base = {
      kind: "motion" as const,
      x0: 20,
      v0: 0,
      acceleration: -10,
      duration: 2,
      axis: "vertical" as const,
      display: "track" as const,
    };
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      const a = mechanicsFrame({ ...base, mass: 1 }, p).bodies[0]!;
      const b = mechanicsFrame({ ...base, mass: 5 }, p).bodies[0]!;
      expect(a.x).toBe(b.x);
      expect(a.velocity).toBe(b.velocity);
    }
  });
  it("uses velocity change with its sign, not change in speed", () => {
    const f = mechanicsFrame({ kind: "velocity_change", v0: -9, v1: -3, duration: 2 }, 1);
    expect(f.acceleration).toBe(3);
    expect(f.bodies[0]).toMatchObject({ x: -12, velocity: -3 });
  });
  it("sums external forces before dividing by mass", () => {
    const f = mechanicsFrame(
      { kind: "forces", mass: 4, left: 8, right: 20, v0: 1, duration: 2 },
      1,
    );
    expect(f.acceleration).toBe(3);
    expect(f.bodies[0]).toMatchObject({ x: 8, velocity: 7 });
    expect(f.impulse).toBe(24);
  });
  it("balances internal interaction momentum despite unequal accelerations", () => {
    const model: MechanicsModel = {
      kind: "interaction",
      massA: 2,
      massB: 5,
      force: 10,
      duration: 2,
    };
    for (const p of [0, 0.1, 0.4, 0.75, 1]) {
      const [a, b] = mechanicsFrame(model, p).bodies;
      expect(2 * a!.velocity + 5 * b!.velocity).toBeCloseTo(0, 12);
      if (p > 0) expect(Math.abs(a!.velocity / b!.velocity)).toBeCloseTo(2.5, 12);
    }
  });
  it("lets static friction match a small applied force instead of always taking its limit", () => {
    const f = mechanicsFrame(
      {
        kind: "friction",
        mass: 4,
        gravity: 10,
        applied: 8,
        muStatic: 0.5,
        muKinetic: 0.3,
        v0: 0,
        duration: 4,
      },
      1,
    );
    expect(f.friction).toBe(8);
    expect(f.acceleration).toBe(0);
    expect(f.bodies[0]!.x).toBe(0);
  });
  it("remains at rest at the maximum static friction and moves above it", () => {
    const model = {
      kind: "friction" as const,
      mass: 4,
      gravity: 10,
      applied: 20,
      muStatic: 0.5,
      muKinetic: 0.3,
      v0: 0,
      duration: 2,
    };
    expect(mechanicsFrame(model, 1).bodies[0]!.velocity).toBe(0);
    expect(mechanicsFrame({ ...model, applied: 24 }, 1).bodies[0]!.velocity).toBe(6);
  });
  it("stops sliding without allowing friction to reverse a stationary body", () => {
    const m: MechanicsModel = {
      kind: "friction",
      mass: 2,
      gravity: 10,
      applied: 0,
      muStatic: 0.5,
      muKinetic: 0.2,
      v0: 4,
      duration: 4,
    };
    const before = mechanicsFrame(m, 0.25),
      after = mechanicsFrame(m, 1);
    expect(before.bodies[0]).toMatchObject({ x: 3, velocity: 2 });
    expect(after.bodies[0]).toMatchObject({ x: 4, velocity: 0 });
    expect(after.acceleration).toBe(0);
    expect(after.friction).toBe(0);
    expect(after.thermal).toBe(16);
  });
  it("accounts for an accelerating support rather than setting support equal to weight", () => {
    expect(mechanicsMeasures({ kind: "support", mass: 4, gravity: 10, acceleration: 2 })).toEqual([
      { label: "Weight", value: "40 N" },
      { label: "Support force", value: "48 N" },
    ]);
  });
  it.each([
    ["with", 35],
    ["against", -35],
    ["perpendicular", 0],
  ] as const)("assigns signed work for %s", (alignment, work) => {
    expect(mechanicsFrame({ kind: "work", force: 7, distance: 5, alignment }, 1).work).toBe(work);
  });
  it("uses speed squared and preserves the sign of potential-energy changes", () => {
    expect(mechanicsFrame({ kind: "kinetic", mass: 3, speed: 4 }, 1).kinetic).toBe(24);
    expect(mechanicsFrame({ kind: "kinetic", mass: 3, speed: 8 }, 1).kinetic).toBe(96);
    expect(
      mechanicsFrame({ kind: "lift", mass: 3, gravity: 10, fromHeight: 8, toHeight: 2 }, 1).work,
    ).toBe(-180);
  });
  it.each([0, 0.25, 0.5, 0.75, 1])(
    "conserves energy during a descent at fraction %s",
    (fraction) => {
      const f = mechanicsFrame(
        { kind: "energy_drop", mass: 2, gravity: 10, height: 5, initialSpeed: 2, thermalLoss: 30 },
        fraction,
      );
      expect(f.kinetic + f.potential + f.thermal).toBeCloseTo(104, 10);
      expect(f.kinetic).toBeGreaterThanOrEqual(0);
    },
  );
  it.each([
    [2, 2, 6, 0],
    [3, 1, 4, -2],
    [1, 4, 2, -3],
    [5, 2, -1, -4],
  ])("conserves momentum through sticking collision %j", (massA, massB, velocityA, velocityB) => {
    const m: MechanicsModel = { kind: "collision", massA, massB, velocityA, velocityB };
    const momentum = massA * velocityA + massB * velocityB;
    for (const p of [0, 0.3, 0.499, 0.5, 0.8, 1]) {
      const frame = mechanicsFrame(m, p),
        [a, b] = frame.bodies;
      expect(massA * a!.velocity + massB * b!.velocity).toBeCloseTo(momentum, 10);
      expect(frame.thermal).toBeGreaterThanOrEqual(-1e-10);
      if (p >= 0.5) {
        expect(a!.velocity).toBe(b!.velocity);
        expect(a!.x).toBe(b!.x);
      }
    }
  });
  it("makes impulse equal the change of signed momentum", () => {
    const f = mechanicsFrame({ kind: "impulse", mass: 3, v0: 8, force: -6, duration: 4 }, 1);
    expect(f.bodies[0]!.velocity).toBe(0);
    expect(f.impulse).toBe(-24);
  });
  it("uses one spatial scale for both comparison cases", () => {
    const models: MechanicsModel[] = [
      {
        kind: "motion",
        x0: 0,
        v0: 2,
        acceleration: 0,
        duration: 3,
        axis: "horizontal",
        display: "track",
      },
      {
        kind: "motion",
        x0: 0,
        v0: 4,
        acceleration: 0,
        duration: 3,
        axis: "horizontal",
        display: "track",
      },
    ];
    const [lo, hi] = mechanicsBounds(models);
    expect(lo).toBeLessThan(0);
    expect(hi).toBeGreaterThan(12);
    expect(
      mechanicsFrame(models[1]!, 1).bodies[0]!.x / mechanicsFrame(models[0]!, 1).bodies[0]!.x,
    ).toBe(2);
  });
  it("rejects invalid time, unsupported energy, receding collisions and answer fields", () => {
    const bad = [
      {
        kind: "journey",
        points: [
          { t: 0, x: 0 },
          { t: 0, x: 3 },
        ],
        display: "track",
      },
      { kind: "energy_drop", mass: 2, gravity: 10, height: 2, initialSpeed: 0, thermalLoss: 41 },
      { kind: "collision", massA: 2, massB: 2, velocityA: 0, velocityB: 4 },
      { kind: "kinetic", mass: 2, speed: 3, answer: 9 },
      { kind: "support", mass: 1, gravity: 1, acceleration: -2 },
      { kind: "forces", mass: 0, left: 0, right: 2, v0: 0, duration: 1 },
    ];
    for (const m of bad) expect(MechanicsModelSchema.safeParse(m).success).toBe(false);
    expect(
      MechanicsDiagramSchema.safeParse({
        type: "mechanics_explorer",
        initialCaseId: "a",
        cases: [
          { id: "a", label: "a", model: { kind: "kinetic", mass: 2, speed: 3 } },
          { id: "a", label: "b", model: { kind: "kinetic", mass: 2, speed: 6 } },
        ],
      }).success,
    ).toBe(false);
  });
});
