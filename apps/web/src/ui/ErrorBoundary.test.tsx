import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FigureBoundary, RouteErrorScreen } from "./ErrorBoundary.js";

function Broken(): never {
  throw new Error("bad diagram spec");
}

// React reports a caught render error to the console; the tests expect it, so keep the log quiet.
beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe("FigureBoundary", () => {
  it("replaces a figure that throws with a notice and keeps the question beside it", () => {
    render(
      <div>
        <FigureBoundary>
          <Broken />
        </FigureBoundary>
        <label>
          Your answer
          <input />
        </label>
      </div>,
    );
    expect(screen.getByText("This figure could not be drawn.")).toBeInTheDocument();
    expect(screen.getByLabelText("Your answer")).toBeEnabled();
  });

  it("tries again when its reset key changes", () => {
    const { rerender } = render(
      <FigureBoundary resetKey="a">
        <Broken />
      </FigureBoundary>,
    );
    expect(screen.getByText("This figure could not be drawn.")).toBeInTheDocument();
    rerender(
      <FigureBoundary resetKey="b">
        <p>Drawn</p>
      </FigureBoundary>,
    );
    expect(screen.getByText("Drawn")).toBeInTheDocument();
  });
});

describe("RouteErrorScreen", () => {
  it("shows a plain error with a way home when a screen throws", async () => {
    const router = createMemoryRouter(
      [{ path: "/", element: <Broken />, errorElement: <RouteErrorScreen /> }],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);
    expect(
      await screen.findByRole("heading", { name: "This screen could not be shown" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("main")).toHaveAttribute("id", "stage");
  });
});
