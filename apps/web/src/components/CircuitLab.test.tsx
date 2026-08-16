import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CircuitLab } from "./CircuitLab";

const activity = {
  id: "ohms-law-explorer",
  type: "ohms_law_explorer" as const,
  title: "Change the circuit",
  conceptIds: ["voltage", "current", "resistance", "ohms-law"],
  instructions: "Adjust voltage or resistance. Predict the effect before reading the calculated current.",
  voltage: { value: 5, min: 1, max: 12, step: 1 },
  resistance: { value: 100, min: 10, max: 1000, step: 10 },
  predictionPrompt: "What will happen to current when resistance increases while voltage stays fixed?",
};

describe("CircuitLab", () => {
  it("shows the circuit, graph, calculated current, and prediction prompt", () => {
    render(<CircuitLab activity={activity} voltage={5} resistance={100} onVoltage={vi.fn()} onResistance={vi.fn()} />);
    expect(screen.getByText("50 mA")).toBeInTheDocument();
    expect(screen.getByAltText(/battery and resistor connected/i)).toHaveAttribute("src", expect.stringContaining("voltage=5"));
    expect(screen.getByAltText(/graph of current against voltage/i)).toHaveAttribute("src", expect.stringContaining("resistance=100"));
    expect(screen.getByText(/predict before changing it/i)).toBeInTheDocument();
  });
});
