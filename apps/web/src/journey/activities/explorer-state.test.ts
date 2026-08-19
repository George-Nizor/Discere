import { describe, expect, it } from "vitest";
import {
  ohmsLawActivity,
  parallelActivity,
  seriesActivity,
  timelineActivity,
} from "../../test/fixtures.js";
import {
  compareValues,
  directionSentence,
  type ExplorerReading,
  evaluatePrediction,
  initialExplorerState,
  isSupportedActivity,
  predictionChoices,
  predictionTargetLabel,
  readExplorer,
  readPredictionTarget,
} from "./explorer-state.js";

function circuit(reading: ExplorerReading) {
  if (reading.kind !== "circuit") throw new Error("Expected a circuit reading.");
  return reading;
}

describe("explorer state", () => {
  it("recognises the activity types the interface can render", () => {
    expect(isSupportedActivity(ohmsLawActivity)).toBe(true);
    expect(isSupportedActivity(seriesActivity)).toBe(true);
    expect(isSupportedActivity(parallelActivity)).toBe(true);
    expect(isSupportedActivity(timelineActivity)).toBe(true);
    expect(isSupportedActivity({ type: "fault_finding_bench" })).toBe(false);
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
    expect(initialExplorerState(parallelActivity)).toEqual({
      type: "parallel_circuit_explorer",
      voltage: 12,
      resistances: [100, 100],
    });
    expect(initialExplorerState(timelineActivity)).toEqual({
      type: "timeline_explorer",
      year: -753,
    });
  });

  it("hides the current until the learner has predicted", () => {
    const state = initialExplorerState(ohmsLawActivity);
    const hidden = circuit(readExplorer(ohmsLawActivity, state, false));
    expect(hidden.rows.at(-1)).toEqual({ label: "Current", value: "Predict first" });
    expect(hidden.visualSpec).toMatchObject({ showValues: false });
    const shown = circuit(readExplorer(ohmsLawActivity, state, true));
    expect(shown.rows.at(-1)).toEqual({ label: "Current", value: "50 mA" });
    expect(shown.visualSpec).toMatchObject({ showValues: true, voltage: 5, resistance: 100 });
  });

  it("adds series resistances and lists every resistor", () => {
    const reading = circuit(
      readExplorer(seriesActivity, initialExplorerState(seriesActivity), true),
    );
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

  it("combines parallel branches into a smaller equivalent resistance", () => {
    const reading = circuit(
      readExplorer(parallelActivity, initialExplorerState(parallelActivity), true),
    );
    expect(reading.totalResistance).toBeCloseTo(50, 10);
    expect(reading.current).toBeCloseTo(0.24, 10);
    expect(reading.rows.map((row) => row.label)).toEqual([
      "Voltage",
      "R1",
      "R2",
      "R1 current",
      "R2 current",
      "Total resistance",
      "Total current",
    ]);
  });

  it("reveals timeline events only up to the selected year", () => {
    const opening = readExplorer(timelineActivity, initialExplorerState(timelineActivity), true);
    expect(opening.rows).toEqual([{ label: "753 BCE", value: "Rome founded" }]);
    const later = readExplorer(timelineActivity, { type: "timeline_explorer", year: -27 }, true);
    expect(later.rows.map((row) => row.label)).toEqual(["753 BCE", "509 BCE", "27 BCE"]);
    expect(later.readout).toEqual({ label: "Year", value: "27 BCE" });
  });

  it("predicts current for Ohm's law and total resistance in series", () => {
    expect(predictionTargetLabel(ohmsLawActivity)).toBe("current");
    expect(predictionTargetLabel(seriesActivity)).toBe("total resistance");
    const reading = readExplorer(seriesActivity, initialExplorerState(seriesActivity), true);
    expect(readPredictionTarget(seriesActivity, reading)).toBe(300);
    expect(readPredictionTarget(ohmsLawActivity, reading)).toBe(circuit(reading).current);
  });

  it("compares two readings in one direction", () => {
    expect(compareValues(0.05, 0.025)).toBe("decreases");
    expect(compareValues(0.05, 0.1)).toBe("increases");
    expect(compareValues(0.05, 0.05)).toBe("same");
    expect(directionSentence("decreases", "current")).toBe("the current decreases");
  });

  it("checks a circuit prediction against the measured change", () => {
    const baseline = readExplorer(ohmsLawActivity, initialExplorerState(ohmsLawActivity), true);
    const raised = readExplorer(
      ohmsLawActivity,
      { type: "ohms_law_explorer", voltage: 5, resistance: 400 },
      true,
    );
    expect(evaluatePrediction(ohmsLawActivity, baseline, raised, "decreases").correct).toBe(true);
    expect(evaluatePrediction(ohmsLawActivity, baseline, raised, "increases").correct).toBe(false);
  });

  it("offers the timeline's own events as its prediction choices", () => {
    expect(predictionChoices(timelineActivity).map((choice) => choice.id)).toEqual([
      "augustus",
      "republic",
    ]);
    const reading = readExplorer(timelineActivity, initialExplorerState(timelineActivity), true);
    const correct = evaluatePrediction(timelineActivity, reading, reading, "republic");
    expect(correct.correct).toBe(true);
    expect(correct.explanation).toContain("509 BCE");
    expect(evaluatePrediction(timelineActivity, reading, reading, "augustus").correct).toBe(false);
  });

  it("refuses a state that does not belong to the activity", () => {
    expect(() =>
      readExplorer(ohmsLawActivity, initialExplorerState(seriesActivity), true),
    ).toThrowError(/does not match activity/);
  });
});
