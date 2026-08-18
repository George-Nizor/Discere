import { MAX_NOTEBOOK_POINTS_PER_STROKE, type NotebookStroke } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import {
  canDraw,
  clampUnit,
  eraseAt,
  extendStroke,
  hasWorkings,
  NOTEBOOK_HEIGHT,
  NOTEBOOK_WIDTH,
  pageSnapshot,
  pointFromClient,
  strokePoints,
} from "./notebook-page.js";

const box = { left: 100, top: 50, width: 400, height: 200 };

function stroke(id: string, points: Array<{ x: number; y: number }>): NotebookStroke {
  return { id, width: 3, points };
}

describe("notebook page geometry", () => {
  it("maps a pointer position onto the page", () => {
    expect(pointFromClient(box, { x: 300, y: 150 })).toEqual({ x: 0.5, y: 0.5 });
  });

  it("keeps a pointer that leaves the canvas on the page", () => {
    expect(pointFromClient(box, { x: -40, y: 5000 })).toEqual({ x: 0, y: 1 });
  });

  it("records pressure only when the device reports it", () => {
    expect(pointFromClient(box, { x: 300, y: 150 }, 0)).toEqual({ x: 0.5, y: 0.5 });
    expect(pointFromClient(box, { x: 300, y: 150 }, 0.4)).toEqual({
      x: 0.5,
      y: 0.5,
      pressure: 0.4,
    });
  });

  it("returns nothing for a canvas with no size", () => {
    expect(pointFromClient({ ...box, width: 0 }, { x: 1, y: 1 })).toBeNull();
  });

  it("clamps a value to the page", () => {
    expect([clampUnit(-1), clampUnit(0.3), clampUnit(4)]).toEqual([0, 0.3, 1]);
  });

  it("draws a stroke in canvas coordinates", () => {
    expect(strokePoints(stroke("a", [{ x: 0, y: 0 }, { x: 1, y: 1 }]))).toBe(
      `0,0 ${NOTEBOOK_WIDTH},${NOTEBOOK_HEIGHT}`,
    );
  });
});

describe("notebook editing", () => {
  it("erases a whole stroke the eraser passed through", () => {
    const strokes = [
      stroke("a", [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }]),
      stroke("b", [{ x: 0.8, y: 0.8 }]),
    ];
    expect(eraseAt(strokes, { x: 0.11, y: 0.11 }).map((entry) => entry.id)).toEqual(["b"]);
  });

  it("leaves strokes the eraser did not reach", () => {
    const strokes = [stroke("a", [{ x: 0.1, y: 0.1 }])];
    expect(eraseAt(strokes, { x: 0.9, y: 0.9 })).toEqual(strokes);
  });

  it("extends the named stroke and nothing else", () => {
    const strokes = [stroke("a", [{ x: 0.1, y: 0.1 }]), stroke("b", [{ x: 0.5, y: 0.5 }])];
    const next = extendStroke(strokes, "a", { x: 0.4, y: 0.4 });
    expect(next[0]?.points).toHaveLength(2);
    expect(next[1]?.points).toHaveLength(1);
  });

  it("drops a point too close to the last one to draw anything", () => {
    const strokes = [stroke("a", [{ x: 0.1, y: 0.1 }])];
    expect(extendStroke(strokes, "a", { x: 0.1001, y: 0.1001 })[0]?.points).toHaveLength(1);
  });

  it("stops a stroke at the contract's point limit rather than exceeding it", () => {
    const points = Array.from({ length: MAX_NOTEBOOK_POINTS_PER_STROKE }, (_, index) => ({
      x: index / MAX_NOTEBOOK_POINTS_PER_STROKE,
      y: 0.5,
    }));
    const next = extendStroke([stroke("a", points)], "a", { x: 0.99, y: 0.9 });
    expect(next[0]?.points).toHaveLength(MAX_NOTEBOOK_POINTS_PER_STROKE);
  });

  it("refuses another stroke once the page is full", () => {
    const full = Array.from({ length: 80 }, (_, index) =>
      stroke(`s${index}`, [{ x: 0.5, y: 0.5 }]),
    );
    expect(canDraw(full)).toBe(false);
    expect(canDraw(full.slice(0, 79))).toBe(true);
  });
});

describe("notebook state", () => {
  it("detects a page that differs from the saved one", () => {
    const base = { pageType: "blank" as const, strokes: [], note: "" };
    expect(pageSnapshot(base)).toBe(pageSnapshot({ ...base }));
    expect(pageSnapshot(base)).not.toBe(pageSnapshot({ ...base, note: "typed" }));
  });

  it("counts a typed note alone as working", () => {
    expect(hasWorkings({ pageType: "blank", strokes: [], note: "  " })).toBe(false);
    expect(hasWorkings({ pageType: "blank", strokes: [], note: "I = V / R" })).toBe(true);
    expect(
      hasWorkings({ pageType: "blank", strokes: [stroke("a", [{ x: 0, y: 0 }])], note: "" }),
    ).toBe(true);
  });
});
