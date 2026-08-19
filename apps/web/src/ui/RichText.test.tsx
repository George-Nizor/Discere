import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../test/harness.js";
import { RichText, splitMath, splitParagraphs } from "./RichText.js";

describe("rich learning text", () => {
  it("returns unmarked prose as one run", () => {
    expect(splitMath("Current is charge flow.")).toEqual([
      { type: "text", value: "Current is charge flow.", start: 0 },
    ]);
  });

  it("separates inline equations from the surrounding words", () => {
    expect(splitMath("Ohm's law is $I = V/R$ in a loop.")).toEqual([
      { type: "text", value: "Ohm's law is ", start: 0 },
      { type: "math", value: "I = V/R", start: 13 },
      { type: "text", value: " in a loop.", start: 22 },
    ]);
  });

  it("splits paragraphs on blank lines and drops empty ones", () => {
    expect(splitParagraphs("One.\n\n\nTwo.\n\n  ")).toEqual(["One.", "Two."]);
  });

  it("keeps the equation source available to assistive technology", () => {
    renderWithProviders(<RichText text={"A loop.\n\nUse $I = V/R$ here."} />);
    expect(screen.getByText("A loop.")).toBeInTheDocument();
    const math = screen.getByLabelText("I = V/R");
    expect(math).toHaveAttribute("role", "math");
    expect(math.querySelector(".katex")).not.toBeNull();
  });
});
