import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OhmsLawActivity } from "@discere/contracts";
import { CircuitLab } from "./CircuitLab";

const activity: OhmsLawActivity = {
  id: "ohms-law-explorer",
  type: "ohms_law_explorer",
  title: "Change the circuit",
  conceptIds: ["ohms-law"],
  instructions: "Predict the effect before reading the result.",
  voltage: { value: 5, min: 1, max: 12, step: 1 },
  resistance: { value: 100, min: 10, max: 1000, step: 10 },
  predictionPrompt: "What happens to current when resistance increases?",
};

describe("CircuitLab", () => {
  it("conceals the calculated current until a prediction is evaluated", () => {
    const { rerender } = render(<CircuitLab activity={activity} voltage={5} resistance={100} onVoltage={vi.fn()} onResistance={vi.fn()} />);
    expect(screen.queryByText("50 mA")).not.toBeInTheDocument();

    rerender(<CircuitLab activity={activity} voltage={10} resistance={100} onVoltage={vi.fn()} onResistance={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Increase" }));
    fireEvent.click(screen.getByRole("button", { name: "Check prediction" }));

    expect(screen.getByText("100 mA")).toBeInTheDocument();
  });

  it("switches to the deterministic relationship graph", () => {
    render(<CircuitLab activity={activity} voltage={5} resistance={100} onVoltage={vi.fn()} onResistance={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Relationship" }));
    const graph = screen.getByAltText("A graph of current against voltage for a 100 ohm resistor.");
    expect(graph).toHaveAttribute("src", "/api/visuals/graph.svg?resistance=100");
  });
});
