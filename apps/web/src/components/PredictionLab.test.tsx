import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PredictionLab } from "./PredictionLab";

describe("PredictionLab", () => {
  it("requires the circuit to change before checking a prediction", () => {
    render(<PredictionLab voltage={5} resistance={100} />);
    fireEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(screen.getByRole("button", { name: "Check prediction" })).toBeDisabled();
    expect(screen.getByText("Change voltage or resistance before checking.")).toBeInTheDocument();
  });

  it("checks a changed circuit against the stored baseline", () => {
    const onEvaluated = vi.fn();
    const { rerender } = render(<PredictionLab voltage={5} resistance={100} onEvaluated={onEvaluated} />);
    rerender(<PredictionLab voltage={5} resistance={200} onEvaluated={onEvaluated} />);
    fireEvent.click(screen.getByRole("button", { name: "Decrease" }));
    fireEvent.click(screen.getByRole("button", { name: "Check prediction" }));
    expect(screen.getByRole("status")).toHaveTextContent("That matches the circuit.");
    expect(screen.getByRole("status")).toHaveTextContent("Baseline: 50.0 mA. Current setting: 25.0 mA.");
    expect(onEvaluated).toHaveBeenLastCalledWith(true);
  });

  it("lets the learner choose a new baseline", () => {
    const { rerender } = render(<PredictionLab voltage={5} resistance={100} />);
    rerender(<PredictionLab voltage={10} resistance={100} />);
    fireEvent.click(screen.getByRole("button", { name: "Use current values as baseline" }));
    expect(screen.getByText(/Compared with 10 V and 100 Ω/)).toBeInTheDocument();
  });
});
