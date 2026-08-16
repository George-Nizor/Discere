import { describe, expect, it } from "vitest";
import { compareCurrent, getOhmsLawState, updateOhmsLawState } from "../src/index.js";
const activity = { id: "ohms-law", type: "ohms_law_explorer" as const, title: "Ohm's law explorer", conceptIds: ["ohms-law"], instructions: "Change resistance and inspect current.", voltage: { value: 5, min: 1, max: 12, step: 1 }, resistance: { value: 100, min: 10, max: 1000, step: 10 }, predictionPrompt: "What happens to current?" };
describe("Ohm's law activity", () => {
  it("updates current deterministically", () => {
    const before = getOhmsLawState(activity);
    const after = updateOhmsLawState(activity, { resistance: 200 });
    expect(after.current).toBeCloseTo(0.025);
    expect(compareCurrent(before, after)).toBe("decreases");
  });
});
