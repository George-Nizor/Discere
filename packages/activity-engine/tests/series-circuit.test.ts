import { describe, expect, it } from "vitest";
import type { SeriesCircuitActivity } from "@discere/contracts";
import { compareSeriesResistance, getSeriesCircuitState, updateSeriesCircuitState } from "../src/index.js";

const activity: SeriesCircuitActivity = {
  id: "series-circuit-explorer",
  type: "series_circuit_explorer",
  title: "Explore a series circuit",
  conceptIds: ["series-circuits"],
  instructions: "Change one resistor and predict the total resistance.",
  voltage: { value: 9, min: 1, max: 12, step: 1 },
  resistors: [
    { id: "r1", label: "R1", value: 100, min: 10, max: 500, step: 10 },
    { id: "r2", label: "R2", value: 200, min: 10, max: 500, step: 10 },
  ],
  predictionPrompt: "What happens to total resistance when R2 increases?",
};

describe("series circuit activity", () => {
  it("adds resistances and calculates shared current", () => {
    expect(getSeriesCircuitState(activity)).toMatchObject({ totalResistance: 300, current: 0.03 });
  });

  it("updates a resistor inside its configured range", () => {
    const before = getSeriesCircuitState(activity);
    const after = updateSeriesCircuitState(activity, { resistances: [100, 300] });
    expect(after.totalResistance).toBe(400);
    expect(compareSeriesResistance(before, after)).toBe("increases");
  });
});
