import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { NotebookPage } from "@discere/contracts";
import { describe, expect, it, vi } from "vitest";
import { Notebook } from "./Notebook";

const emptyPage: NotebookPage = {
  lessonId: "lesson-ohms-law",
  pageType: "blank",
  strokes: [],
  note: "",
  updatedAt: null,
};

function prepareCanvas(canvas: HTMLElement): void {
  Object.defineProperty(canvas, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ left: 0, top: 0, right: 1000, bottom: 600, width: 1000, height: 600, x: 0, y: 0, toJSON: () => ({}) }),
  });
}

describe("Notebook", () => {
  it("draws, undoes, redoes, and saves a stroke", async () => {
    const onSave = vi.fn(async (input) => ({ lessonId: emptyPage.lessonId, ...input, updatedAt: "2026-08-17T00:00:00.000Z" }));
    render(<Notebook page={emptyPage} saving={false} onSave={onSave} />);
    const canvas = screen.getByRole("application", { name: "Working canvas" });
    prepareCanvas(canvas);

    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 100, clientY: 120, pressure: 0.5 });
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: "mouse", clientX: 220, clientY: 240, pressure: 0.5 });
    fireEvent.pointerUp(canvas, { pointerId: 1, pointerType: "mouse", clientX: 220, clientY: 240 });
    expect(canvas.querySelectorAll("polyline")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(canvas.querySelectorAll("polyline")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(canvas.querySelectorAll("polyline")).toHaveLength(1);

    fireEvent.change(screen.getByLabelText("Typed note about these workings"), { target: { value: "I used I = V / R." } });
    fireEvent.click(screen.getByRole("button", { name: "Save workings" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      pageType: "blank",
      note: "I used I = V / R.",
      strokes: [{ width: 3 }],
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Workings saved locally.");
  });

  it("erases a nearby stroke and changes paper type", () => {
    const page: NotebookPage = {
      ...emptyPage,
      strokes: [{ id: "stroke-one", width: 3, points: [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.3 }] }],
    };
    render(<Notebook page={page} saving={false} onSave={vi.fn()} />);
    const canvas = screen.getByRole("application", { name: "Working canvas" });
    prepareCanvas(canvas);

    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    expect(screen.getByRole("button", { name: "Graph" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Eraser" }));
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: "mouse", button: 0, clientX: 200, clientY: 120 });
    fireEvent.pointerUp(canvas, { pointerId: 2, pointerType: "mouse", clientX: 200, clientY: 120 });
    expect(canvas.querySelectorAll("polyline")).toHaveLength(0);
  });
});
