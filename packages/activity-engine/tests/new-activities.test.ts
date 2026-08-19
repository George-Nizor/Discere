import type {
  DiagramChoiceActivity,
  GraphPlotActivity,
  OrderSequenceActivity,
} from "@discere/contracts";
import { describe, expect, it } from "vitest";
import {
  diagramChoiceIssues,
  evaluateDiagramChoice,
  evaluateGraphPlot,
  evaluateOrderSequence,
  graphPlotIssues,
  moveInOrder,
  orderSequenceIssues,
  pointFromFraction,
  snapToGrid,
} from "../src/index.js";

const diagram: DiagramChoiceActivity = {
  id: "find-the-resistor",
  type: "diagram_choice",
  title: "Find the resistor",
  conceptIds: ["current"],
  instructions: "Tap the component that limits the current.",
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
    { id: "battery", label: "The battery", x: 17, y: 43, r: 9 },
    { id: "resistor", label: "The resistor", x: 50, y: 17, r: 9 },
  ],
  correctTargetId: "resistor",
  feedback: {
    correct: "The resistor opposes the flow, so it sets the current.",
    incorrect: "The battery supplies the push. Something else opposes the flow.",
  },
};

const ordering: OrderSequenceActivity = {
  id: "order-the-republic",
  type: "order_sequence",
  title: "Put the events in order",
  conceptIds: ["roman-republic"],
  instructions: "Arrange these from earliest to latest.",
  prompt: "Order the events from earliest to latest.",
  items: [
    { id: "rubicon", label: "Caesar crosses the Rubicon" },
    { id: "actium", label: "The battle of Actium" },
    { id: "augustus", label: "Octavian becomes Augustus" },
  ],
  correctOrder: ["rubicon", "actium", "augustus"],
  feedback: { correct: "That is the sequence.", incorrect: "Two of these are the wrong way round." },
};

const graph: GraphPlotActivity = {
  id: "plot-the-current",
  type: "graph_plot",
  title: "Plot the current",
  conceptIds: ["ohms-law"],
  instructions: "Place the point for 6 V.",
  prompt: "At 6 V across 100 Ω, where does the point sit?",
  mode: "place",
  x: { label: "Voltage", unit: "V", min: 0, max: 10, step: 1 },
  y: { label: "Current", unit: "A", min: 0, max: 0.1, step: 0.01 },
  series: [],
  answer: { x: 6, y: 0.06 },
  tolerance: { x: 0.5, y: 0.005 },
  feedback: { correct: "That is 0.06 A.", incorrect: "Use I = V / R before placing the point." },
};

describe("diagram choice", () => {
  it("marks the named target and names back what was picked", () => {
    const right = evaluateDiagramChoice(diagram, "resistor");
    expect(right.correct).toBe(true);
    expect(right.chosen?.label).toBe("The resistor");
    expect(right.explanation).toContain("opposes the flow");

    const wrong = evaluateDiagramChoice(diagram, "battery");
    expect(wrong.correct).toBe(false);
    expect(wrong.chosen?.label).toBe("The battery");
  });

  it("treats a tap on nothing as wrong rather than crashing", () => {
    const outcome = evaluateDiagramChoice(diagram, "nowhere");
    expect(outcome.correct).toBe(false);
    expect(outcome.chosen).toBeUndefined();
  });

  it("reports an answer that names a target the figure does not have", () => {
    expect(diagramChoiceIssues(diagram)).toEqual([]);
    expect(diagramChoiceIssues({ ...diagram, correctTargetId: "ghost" })).toContain(
      "The correct target 'ghost' is not one of the targets.",
    );
    const { circuit: _circuit, ...withoutFigure } = diagram;
    expect(diagramChoiceIssues(withoutFigure as DiagramChoiceActivity)).toContain(
      "A diagram choice needs a circuit or an image to place its targets on.",
    );
  });
});

describe("order sequence", () => {
  it("accepts the authored order", () => {
    const outcome = evaluateOrderSequence(ordering, ["rubicon", "actium", "augustus"]);
    expect(outcome.correct).toBe(true);
    expect(outcome.firstMisplacedId).toBe("");
  });

  it("names the first item out of place rather than every one that shifted", () => {
    const outcome = evaluateOrderSequence(ordering, ["actium", "rubicon", "augustus"]);
    expect(outcome.correct).toBe(false);
    expect(outcome.firstMisplacedId).toBe("actium");
    expect(outcome.explanation).toContain("The battle of Actium");
  });

  it("moves an item and clamps at both ends", () => {
    const order = ["a", "b", "c"];
    expect(moveInOrder(order, "c", -1)).toEqual(["a", "c", "b"]);
    expect(moveInOrder(order, "a", -1)).toEqual(["a", "b", "c"]);
    expect(moveInOrder(order, "c", 5)).toEqual(["a", "b", "c"]);
    expect(moveInOrder(order, "missing", 1)).toEqual(["a", "b", "c"]);
    // The original is never mutated, so React state stays comparable by reference.
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("reports an order that does not match its items", () => {
    expect(orderSequenceIssues(ordering)).toEqual([]);
    expect(orderSequenceIssues({ ...ordering, correctOrder: ["rubicon", "rubicon", "actium"] })).toContain(
      "The correct order lists an item more than once.",
    );
  });
});

describe("graph plot", () => {
  it("accepts a point inside the tolerance and rejects one outside it", () => {
    expect(evaluateGraphPlot(graph, { x: 6, y: 0.06 }).correct).toBe(true);
    expect(evaluateGraphPlot(graph, { x: 6.5, y: 0.065 }).correct).toBe(true);
    expect(evaluateGraphPlot(graph, { x: 7, y: 0.06 }).correct).toBe(false);
    expect(evaluateGraphPlot(graph, { x: 6, y: 0.08 }).correct).toBe(false);
  });

  it("snaps to the grid and stays inside the axes", () => {
    expect(snapToGrid(6.4, 0, 10, 1)).toBe(6);
    expect(snapToGrid(6.6, 0, 10, 1)).toBe(7);
    expect(snapToGrid(-3, 0, 10, 1)).toBe(0);
    expect(snapToGrid(99, 0, 10, 1)).toBe(10);
    // A decimal step must not drift the way repeated addition would.
    expect(snapToGrid(0.063, 0, 0.1, 0.01)).toBe(0.06);
  });

  it("reads a click as axis units, counting upwards from the bottom", () => {
    // Sixty per cent across, and forty per cent down from the top, is 0.06 A at 6 V.
    expect(pointFromFraction(graph, 0.6, 0.4)).toEqual({ x: 6, y: 0.06 });
    expect(pointFromFraction(graph, 0, 1)).toEqual({ x: 0, y: 0 });
    expect(pointFromFraction(graph, 1, 0)).toEqual({ x: 10, y: 0.1 });
  });

  it("reports an answer the learner could never reach", () => {
    expect(graphPlotIssues(graph)).toEqual([]);
    expect(graphPlotIssues({ ...graph, answer: { x: 40, y: 0.06 } })).toContain(
      "The answer sits outside the axes the learner can reach.",
    );
    expect(graphPlotIssues({ ...graph, mode: "read" })).toContain(
      "A reading task needs a line on the axes to read from.",
    );
  });
});
