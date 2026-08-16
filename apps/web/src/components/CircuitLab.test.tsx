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
  it("requires a prediction before running the guided experiment", () => {
    const onResistance = vi.fn();
    render(<CircuitLab activity={activity} voltage={5} resistance={100} onVoltage={vi.fn()} onResistance={onResistance} />);

    const testButton = screen.getByRole("button", { name: "Test my prediction" });
    expect(testButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Decrease" }));
    expect(testButton).toBeEnabled();
    fireEvent.click(testButton);

    expect(onResistance).toHaveBeenCalledWith(150);
    expect(screen.getByText("Your prediction matches the circuit.")).toBeInTheDocument();
  });

  it("shows the deterministic graph alongside the circuit", () => {
    render(<CircuitLab activity={activity} voltage={5} resistance={100} onVoltage={vi.fn()} onResistance={vi.fn()} />);
    const graph = screen.getByAltText("A graph of current against voltage for a 100 ohm resistor.");
    expect(graph).toHaveAttribute("src", "/api/visuals/graph.svg?resistance=100");
  });
});
