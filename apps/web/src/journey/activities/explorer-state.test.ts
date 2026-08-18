import { describe, expect, it } from "vitest";
import { ohmsLawActivity, seriesActivity } from "../../test/fixtures.js";
import {
  compareValues,
  directionSentence,
  initialExplorerState,
  isSupportedActivity,
  predictionTargetLabel,
  readExplorer,
  readPredictionTarget,
} from "./explorer-state.js";

describe("explorer state", () => {
  it("recognises the activity types the interface can render", () => {
    expect(isSupportedActivity(ohmsLawActivity)).toBe(true);
    expect(isSupportedActivity(seriesActivity)).toBe(true);
    expect(isSupportedActivity({ type: "timeline_scrubber" })).toBe(false);
  });

  it("starts each explorer from the values the activity declares", () => {
    expect(initialExplorerState(ohmsLawActivity)).toEqual({
      type: "ohms_law_explorer",
      voltage: 5,
      resistance: 100,
    });
    expect(initialExplorerState(seriesActivity)).toEqual({
      type: "series_circuit_explorer",
      voltage: 9,
      resistances: [100, 200],
    });
  });

  it("hides the current until the learner has predicted", () => {
    const state = initialExplorerState(ohmsLawActivity);
    const hidden = readExplorer(ohmsLawActivity, state, false);
    expect(hidden.rows.at(-1)).toEqual({ label: "Current", value: "Predict first" });
    expect(hidden.visualSrc).toContain("values=false");
    const shown = readExplorer(ohmsLawActivity, state, true);
    expect(shown.rows.at(-1)).toEqual({ label: "Current", value: "50 mA" });
    expect(shown.visualSrc).toContain("values=true");
  });

  it("adds series resistances and lists every resistor", () => {
    const reading = readExplorer(seriesActivity, initialExplorerState(seriesActivity), true);
    expect(reading.totalResistance).toBe(300);
    expect(reading.current).toBeCloseTo(0.03, 5);
    expect(reading.rows.map((row) => row.label)).toEqual([
      "Voltage",
      "R1",
      "R2",
      "Total resistance",
      "Current",
    ]);
  });

  it("predicts current for Ohm's law and total resistance in series", () => {
    expect(predictionTargetLabel(ohmsLawActivity)).toBe("current");
    expect(predictionTargetLabel(seriesActivity)).toBe("total resistance");
    const reading = readExplorer(seriesActivity, initialExplorerState(seriesActivity), true);
    expect(readPredictionTarget(seriesActivity, reading)).toBe(300);
    expect(readPredictionTarget(ohmsLawActivity, reading)).toBe(reading.current);
  });

  it("compares two readings in one direction", () => {
    expect(compareValues(0.05, 0.025)).toBe("decreases");
    expect(compareValues(0.05, 0.1)).toBe("increases");
    expect(compareValues(0.05, 0.05)).toBe("same");
    expect(directionSentence("decreases", "current")).toBe("the current decreases");
  });

  it("refuses a state that does not belong to the activity", () => {
    expect(() =>
      readExplorer(ohmsLawActivity, initialExplorerState(seriesActivity), true),
    ).toThrowError(/does not match activity/);
  });
});
