import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PredictionLab } from "./PredictionLab";

describe("PredictionLab", () => {
  it("requires the circuit to change before checking a prediction", () => {
    render(<PredictionLab voltage={5} resistance={100} />);
    fireEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(screen.getByRole("button", { name: "Check prediction" })).toBeDisabled();
  });

  it("checks a changed circuit against the stored baseline", () => {
    const { rerender } = render(<PredictionLab voltage={5} resistance={100} />);
    rerender(<PredictionLab voltage={10} resistance={100} />);
    fireEvent.click(screen.getByRole("button", { name: "Increase" }));
    fireEvent.click(screen.getByRole("button", { name: "Check prediction" }));
    expect(screen.getByRole("status")).toHaveTextContent("That matches the circuit.");
    expect(screen.getByRole("status")).toHaveTextContent("Baseline: 50.0 mA. Current setting: 100.0 mA.");
  });
});
