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
});
