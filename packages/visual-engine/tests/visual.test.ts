import { describe, expect, it } from "vitest";
import { calculateCurrent, renderCircuitSvg } from "../src/index.js";

describe("circuit visual", () => {
  it("calculates current from Ohm's law", () => expect(calculateCurrent(5, 100)).toBeCloseTo(0.05));
  it("renders an accessible deterministic SVG", () => {
    const svg = renderCircuitSvg({ id: "sample", voltage: 5, resistance: 100, showCurrentArrow: true, showValues: true, batteryLabel: "Battery", resistorLabel: "Resistor" });
    expect(svg).toContain('role="img"');
    expect(svg).toContain("0.05 A");
    expect(svg).toContain("100 Ω");
  });

  it("renders a truthful series diagram with one shared current", () => {
    const svg = renderCircuitSvg({
      id: "series-sample",
      kind: "series",
      voltage: 9,
      resistances: [100, 200],
      showCurrentArrow: true,
      showValues: true,
      batteryLabel: "Battery",
      resistorLabels: ["R1", "R2"],
    });
    expect(svg).toContain("R1");
    expect(svg).toContain("R2");
    expect(svg).toContain("Rtotal = 300 Ω");
    expect(svg).toContain("I = 0.03 A");
    expect(svg).toContain("same current passes through each resistor");
  });
});
