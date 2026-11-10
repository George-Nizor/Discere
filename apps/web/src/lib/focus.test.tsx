import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { LoadingScreen } from "../ui/Feedback.js";
import { documentTitle, useDocumentTitle } from "./document-title.js";
import { focusStageHeading } from "./focus.js";

afterEach(() => {
  document.title = "";
});

describe("focusStageHeading", () => {
  it("focuses the screen's heading without adding it to the Tab order", () => {
    render(
      <main id="stage">
        <h1>Settings</h1>
        <button type="button">Save</button>
      </main>,
    );
    expect(focusStageHeading()).toBe(true);
    const heading = screen.getByRole("heading", { name: "Settings" });
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute("tabindex", "-1");
  });

  it("waits while the screen is still loading", () => {
    render(<LoadingScreen message="Loading the course…" />);
    expect(screen.getByRole("main")).toHaveAttribute("id", "stage");
    expect(focusStageHeading()).toBe(false);
  });
});

describe("useDocumentTitle", () => {
  function Screen({ name }: { name: string | undefined }) {
    useDocumentTitle(name);
    return null;
  }

  it("names the screen after Discere", () => {
    render(
      <MemoryRouter>
        <Screen name="Review" />
      </MemoryRouter>,
    );
    expect(document.title).toBe("Discere: Review");
  });

  it("falls back to the plain name while the screen's own name is unknown", () => {
    expect(documentTitle(undefined)).toBe("Discere");
    expect(documentTitle("  ")).toBe("Discere");
  });
});
