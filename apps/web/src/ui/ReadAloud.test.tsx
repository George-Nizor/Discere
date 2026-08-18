import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadAloudButton } from "./ReadAloud.js";

class FakeUtterance {
  rate = 1;
  private readonly listeners = new Map<string, Array<() => void>>();
  constructor(readonly text: string) {}
  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  fire(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

function installSpeech() {
  const spoken: FakeUtterance[] = [];
  const cancel = vi.fn();
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  vi.stubGlobal("speechSynthesis", {
    cancel,
    speak: (utterance: FakeUtterance) => spoken.push(utterance),
  });
  return { spoken, cancel };
}

// The component cancels speech as it unmounts, so the DOM is torn down before the stubbed
// speech API is removed.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("read aloud", () => {
  it("does not render a control when the browser cannot speak", () => {
    render(<ReadAloudButton text="Current is charge in motion." />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("speaks the supplied text and offers to stop", async () => {
    const { spoken, cancel } = installSpeech();
    render(<ReadAloudButton text="Current is charge in motion." />);

    await userEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    expect(spoken).toHaveLength(1);
    expect(spoken[0]?.text).toBe("Current is charge in motion.");
    const stop = await screen.findByRole("button", { name: "Stop reading" });

    await userEvent.click(stop);
    expect(cancel).toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Read aloud" })).toBeInTheDocument();
  });

  it("returns to the idle label when the utterance ends by itself", async () => {
    const { spoken } = installSpeech();
    render(<ReadAloudButton text="Charge flows." />);
    await userEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    spoken[0]?.fire("end");
    expect(await screen.findByRole("button", { name: "Read aloud" })).toBeInTheDocument();
  });

  it("stops speaking when the surface goes away", async () => {
    const { cancel } = installSpeech();
    const view = render(<ReadAloudButton text="Charge flows." />);
    await userEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    cancel.mockClear();
    view.unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it("takes its own label", async () => {
    installSpeech();
    render(<ReadAloudButton label="Read the question" text="What is the current?" />);
    expect(screen.getByRole("button", { name: "Read the question" })).toBeInTheDocument();
  });
});
