import type { ParallelCircuitActivity } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import {
  compareParallelResistance,
  getParallelCircuitState,
  updateParallelCircuitState,
} from "../src/index.js";

const activity: ParallelCircuitActivity = {
  id: "parallel-circuit-explorer",
  type: "parallel_circuit_explorer",
  title: "Explore two parallel branches",
  conceptIds: ["parallel-circuits"],
  instructions: "Change one branch and predict the effect on the total resistance.",
  voltage: { value: 12, min: 1, max: 12, step: 1 },
  branches: [
    { id: "r1", label: "R1", value: 100, min: 10, max: 500, step: 10 },
    { id: "r2", label: "R2", value: 100, min: 10, max: 500, step: 10 },
  ],
  predictionPrompt: "What happens to the total resistance when R2 increases?",
};

describe("the parallel circuit engine", () => {
  it("halves the equivalent resistance of two equal branches", () => {
    const state = getParallelCircuitState(activity);
    expect(state.totalResistance).toBeCloseTo(50, 10);
    expect(state.current).toBeCloseTo(0.24, 10);
    expect(state.branchCurrents).toEqual([0.12, 0.12]);
  });

  it("keeps the equivalent resistance below the smallest branch", () => {
    const state = updateParallelCircuitState(activity, { resistances: [100, 300] });
    // 1 / (1/100 + 1/300) = 75 Ω, which is smaller than either branch.
    expect(state.totalResistance).toBeCloseTo(75, 10);
    expect(state.totalResistance).toBeLessThan(Math.min(...state.resistances));
    expect(state.current).toBeCloseTo(0.16, 10);
  });

  it("splits current between branches so the branch currents sum to the total", () => {
    const state = updateParallelCircuitState(activity, { voltage: 6, resistances: [100, 200] });
    expect(state.branchCurrents[0]).toBeCloseTo(0.06, 10);
    expect(state.branchCurrents[1]).toBeCloseTo(0.03, 10);
    expect(state.branchCurrents.reduce((total, value) => total + value, 0)).toBeCloseTo(
      state.current,
      10,
    );
  });

  it("reports that adding resistance to one branch raises the total resistance", () => {
    const before = getParallelCircuitState(activity);
    const after = updateParallelCircuitState(activity, { resistances: [100, 400] });
    expect(compareParallelResistance(before, after)).toBe("increases");
  });

  it("refuses values outside the declared ranges", () => {
    expect(() => updateParallelCircuitState(activity, { voltage: 24 })).toThrow(RangeError);
    expect(() => updateParallelCircuitState(activity, { resistances: [5, 100] })).toThrow(
      RangeError,
    );
    expect(() => updateParallelCircuitState(activity, { resistances: [100] })).toThrow(RangeError);
  });
});
