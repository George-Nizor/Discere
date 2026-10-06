import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/harness.js";

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  sessionStorage.clear();
});

// The intro decides at module load whether it plays, so each case imports a fresh copy.
async function load() {
  return import("./WelcomeScreen.js");
}

describe("opening intro", () => {
  it("covers the app from its first render and lifts once the scene has played", async () => {
    vi.useFakeTimers();
    const { WelcomeScreen, OpeningScreen } = await load();
    const view = renderWithProviders(
      <>
        <OpeningScreen />
        <WelcomeScreen />
      </>,
    );
    // One intro, opaque from the start; the router's loading fallback draws nothing under it.
    expect(view.container.querySelectorAll("[data-intro]")).toHaveLength(1);
    expect(view.container.querySelector(".loading-screen")).toBeNull();
    expect(view.container.querySelector(".intro")?.className).not.toContain("is-leaving");
    await act(async () => {
      vi.advanceTimersByTime(3_000);
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(view.container.querySelector("[data-intro]")).toBeNull();
    expect(sessionStorage.getItem("discere:welcomed")).toBe("1");
  });

  it("can be skipped, and does not play again this launch", async () => {
    const first = await load();
    const view = renderWithProviders(<first.WelcomeScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Skip the welcome" }));
    expect(view.container.querySelector("[data-intro]")).toBeNull();
    view.unmount();
    vi.resetModules();
    const again = await load();
    const second = renderWithProviders(<again.WelcomeScreen />);
    expect(second.container.querySelector("[data-intro]")).toBeNull();
  });
});
