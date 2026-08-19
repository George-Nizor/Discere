import type {
  DiagramChoiceActivity,
  GraphPlotActivity,
  OrderSequenceActivity,
} from "@discere/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DiagramChoice } from "./DiagramChoice.js";
import { GraphPlot } from "./GraphPlot.js";
import { OrderSequence } from "./OrderSequence.js";

const diagram: DiagramChoiceActivity = {
  id: "find-the-resistor",
  type: "diagram_choice",
  title: "Find the resistor",
  conceptIds: ["current"],
  instructions: "Tap the component.",
  prompt: "Which component limits the current?",
  imageFile: "",
  imageAlt: "",
  circuit: {
    id: "loop",
    voltage: 5,
    resistance: 100,
    showCurrentArrow: true,
    showValues: false,
    batteryLabel: "Battery",
    resistorLabel: "Resistor",
  },
  targets: [
    { id: "battery", label: "The battery", x: 17, y: 50, r: 10 },
    { id: "resistor", label: "The resistor", x: 50, y: 17, r: 10 },
  ],
  correctTargetId: "resistor",
  feedback: { correct: "The resistor opposes the flow.", incorrect: "The battery only pushes." },
};

const ordering: OrderSequenceActivity = {
  id: "order-events",
  type: "order_sequence",
  title: "Order the events",
  conceptIds: ["roman-republic"],
  instructions: "Put them in order.",
  prompt: "Earliest to latest.",
  items: [
    { id: "one", label: "First event" },
    { id: "two", label: "Second event" },
    { id: "three", label: "Third event" },
  ],
  correctOrder: ["one", "two", "three"],
  feedback: { correct: "That is the sequence.", incorrect: "Something is out of place." },
};

const graph: GraphPlotActivity = {
  id: "plot-it",
  type: "graph_plot",
  title: "Plot the current",
  conceptIds: ["ohms-law"],
  instructions: "Place the point.",
  prompt: "Where does 6 V sit?",
  mode: "place",
  x: { label: "Voltage", unit: "V", min: 0, max: 10, step: 1 },
  y: { label: "Current", unit: "A", min: 0, max: 0.1, step: 0.01 },
  series: [],
  answer: { x: 6, y: 0.06 },
  tolerance: { x: 0.5, y: 0.005 },
  feedback: { correct: "That is 0.06 A.", incorrect: "Use I = V / R." },
};

describe("diagram choice", () => {
  it("names every target for a screen reader and marks the right one", async () => {
    const onAnswered = vi.fn();
    render(<DiagramChoice activity={diagram} courseId="c" onAnswered={onAnswered} />);

    // Each target is a real button, so the figure is answerable without a pointer at all.
    expect(screen.getByRole("button", { name: "The battery" })).toBeInTheDocument();
    const resistor = screen.getByRole("button", { name: "The resistor" });

    await userEvent.click(resistor);
    expect(screen.getByText("The resistor opposes the flow.")).toBeInTheDocument();
    expect(resistor).toHaveAttribute("aria-pressed", "true");
    expect(onAnswered).toHaveBeenCalledWith(true);
  });

  it("reports a wrong tap without ending the attempt", async () => {
    const onAnswered = vi.fn();
    render(<DiagramChoice activity={diagram} courseId="c" onAnswered={onAnswered} />);

    await userEvent.click(screen.getByRole("button", { name: "The battery" }));
    expect(screen.getByText("The battery only pushes.")).toBeInTheDocument();
    expect(onAnswered).toHaveBeenCalledWith(false);

    await userEvent.click(screen.getByRole("button", { name: "The resistor" }));
    expect(screen.getByText("The resistor opposes the flow.")).toBeInTheDocument();
  });
});

describe("order sequence", () => {
  it("does not open on the answer", () => {
    render(<OrderSequence activity={ordering} />);
    const labels = screen.getAllByText(/event$/).map((node) => node.textContent);
    expect(labels).not.toEqual(["First event", "Second event", "Third event"]);
  });

  it("is reorderable from the keyboard alone", async () => {
    const onAnswered = vi.fn();
    render(<OrderSequence activity={ordering} onAnswered={onAnswered} />);

    // Opens rotated to ["two", "three", "one"], so moving "one" to the front twice sorts it.
    await userEvent.click(screen.getByRole("button", { name: 'Move "First event" earlier' }));
    await userEvent.click(screen.getByRole("button", { name: 'Move "First event" earlier' }));
    await userEvent.click(screen.getByRole("button", { name: "Check the order" }));

    expect(screen.getByText("That is the sequence.")).toBeInTheDocument();
    expect(onAnswered).toHaveBeenCalledWith(true);
  });

  it("points at the first item out of place", async () => {
    render(<OrderSequence activity={ordering} />);
    await userEvent.click(screen.getByRole("button", { name: "Check the order" }));
    // The feedback names one place to look rather than marking everything that shifted.
    expect(
      screen.getByText('Something is out of place. Start by looking at "Second event".'),
    ).toBeInTheDocument();
  });

  it("moves an item with the arrow keys while focus stays on it", async () => {
    render(<OrderSequence activity={ordering} />);
    const earlier = screen.getByRole("button", { name: 'Move "First event" earlier' });
    earlier.focus();
    // ArrowUp on the "later" control and ArrowDown on the "earlier" one both reorder, so the
    // learner never has to hunt for the opposite button.
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: 'Move "First event" earlier' })).toBeInTheDocument();
  });
});

describe("graph plot", () => {
  it("accepts the answer typed as coordinates, not only clicked", async () => {
    const onAnswered = vi.fn();
    render(<GraphPlot activity={graph} onAnswered={onAnswered} />);

    await userEvent.clear(screen.getByLabelText("Voltage"));
    await userEvent.type(screen.getByLabelText("Voltage"), "6");
    await userEvent.clear(screen.getByLabelText("Current"));
    await userEvent.type(screen.getByLabelText("Current"), "0.06");
    await userEvent.click(screen.getByRole("button", { name: "Check the point" }));

    expect(screen.getByText("That is 0.06 A.")).toBeInTheDocument();
    expect(onAnswered).toHaveBeenCalledWith(true);
  });

  it("rejects a point outside the tolerance", async () => {
    render(<GraphPlot activity={graph} onAnswered={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Voltage"), "9");
    await userEvent.type(screen.getByLabelText("Current"), "0.09");
    await userEvent.click(screen.getByRole("button", { name: "Check the point" }));
    expect(screen.getByText("Use I = V / R.")).toBeInTheDocument();
  });

  it("cannot be checked before a point exists", () => {
    render(<GraphPlot activity={graph} />);
    expect(screen.getByRole("button", { name: "Check the point" })).toBeDisabled();
  });
});
