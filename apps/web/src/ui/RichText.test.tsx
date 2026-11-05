import { screen, waitFor } from "@testing-library/react";
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

  it("reads two prices in one sentence as prices, not as an equation", () => {
    const text = "The agent costs $0.12 per request against $0.03, and $14.40 + $56.40 = $70.80.";
    expect(splitMath(text)).toEqual([{ type: "text", value: text, start: 0 }]);
  });

  it("keeps an equation that sits next to a price", () => {
    expect(splitMath("It costs $5, and $\\sin 30° = 0.5$ here.").map((s) => s.type)).toEqual([
      "text",
      "math",
      "text",
    ]);
  });

  it("never opens an equation inside a code span", () => {
    const text = "Run `echo $HOME` and then `echo $PATH` to see both.";
    expect(splitMath(text)).toEqual([{ type: "text", value: text, start: 0 }]);
  });

  it("splits paragraphs on blank lines and drops empty ones", () => {
    expect(splitParagraphs("One.\n\n\nTwo.\n\n  ")).toEqual(["One.", "Two."]);
  });

  it("keeps the equation source available to assistive technology", async () => {
    renderWithProviders(<RichText text={"A loop.\n\nUse $I = V/R$ here."} />);
    expect(screen.getByText("A loop.")).toBeInTheDocument();
    const math = screen.getByLabelText("I = V/R");
    expect(math).toHaveAttribute("role", "math");
    await waitFor(() => expect(math.querySelector(".katex")).not.toBeNull());
  });
});

describe("emphasis", () => {
  it("renders bold terms and italic stress, and leaves a lone asterisk alone", async () => {
    const { render, screen } = await import("@testing-library/react");
    const { InlineRichText, stripEmphasis } = await import("./RichText.js");
    render(
      <p>
        <InlineRichText text="This is the **parallax angle**, and *half* the angle; 3 * 4 stays." />
      </p>,
    );
    expect(screen.getByText("parallax angle").tagName).toBe("STRONG");
    expect(screen.getByText("half").tagName).toBe("EM");
    expect(screen.getByText(/3 \* 4 stays/)).toBeInTheDocument();
    expect(stripEmphasis("the **parallax angle** and *half*")).toBe("the parallax angle and half");
  });
});

describe("hover terms", () => {
  it("shows a term with its note described for assistive technology, and strips it for speech", async () => {
    const { render, screen } = await import("@testing-library/react");
    const { InlineRichText, stripEmphasis } = await import("./RichText.js");
    render(
      <p>
        <InlineRichText text="Now [[substitute|Replace the letter with a number.]] 4 for x." />
      </p>,
    );
    const term = screen.getByText("substitute");
    expect(term).toHaveAccessibleDescription("Replace the letter with a number.");
    expect(stripEmphasis("Now [[substitute|Replace it.]] and **solve**.")).toBe(
      "Now substitute and solve.",
    );
  });
});

describe("inline code", () => {
  it("sets code in a code element and reads no emphasis inside it", async () => {
    const { render, screen } = await import("@testing-library/react");
    const { InlineRichText, stripEmphasis } = await import("./RichText.js");
    render(
      <p>
        <InlineRichText text="Then `SELECT COUNT(*) FROM t HAVING COUNT(*) > 1` returns one row." />
      </p>,
    );
    expect(screen.getByText("SELECT COUNT(*) FROM t HAVING COUNT(*) > 1").tagName).toBe("CODE");
    expect(stripEmphasis("Call `len(xs)` once.")).toBe("Call len(xs) once.");
  });
});
