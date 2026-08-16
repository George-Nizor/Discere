import { describe, expect, it } from "vitest";
import { CircuitDiagramSpecSchema, TutoringModeSchema } from "../src/index.js";

describe("shared contracts", () => {
  it("accepts known tutoring modes", () => {
    expect(TutoringModeSchema.parse("coach")).toBe("coach");
  });

  it("rejects non-positive circuit values", () => {
    expect(() =>
      CircuitDiagramSpecSchema.parse({
        id: "bad",
        voltage: 5,
        resistance: 0,
        showCurrentArrow: true,
        showValues: true,
        batteryLabel: "Battery",
        resistorLabel: "Resistor",
      }),
    ).toThrow();
  });
});
