import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadAloudButton, resetReadAloudForTests } from "./ReadAloud.js";

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
  resetReadAloudForTests();
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

describe("read aloud with Discere's voice", () => {
  class FakeAudio {
    static played: string[] = [];
    private readonly listeners = new Map<string, Array<() => void>>();
    constructor(readonly src: string) {}
    addEventListener(type: string, listener: () => void): void {
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    }
    play(): Promise<void> {
      FakeAudio.played.push(this.src);
      queueMicrotask(() => {
        for (const listener of this.listeners.get("ended") ?? []) listener();
      });
      return Promise.resolve();
    }
    pause(): void {}
  }

  function installEngine(state: "ready" | "missing") {
    const requests: Array<{ url: string; body: unknown }> = [];
    FakeAudio.played = [];
    vi.stubGlobal("Audio", FakeAudio);
    let clip = 0;
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: () => `blob:clip-${++clip}`,
      revokeObjectURL: () => {},
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        requests.push({ url, body });
        if (url === "/api/speech/status")
          return Response.json({ state, voice: "George", downloadBytes: 1 });
        if (url === "/api/speech/install")
          return Response.json({ state: "installing", voice: "George", downloadBytes: 1 });
        if (url === "/api/speech/sentences")
          return Response.json({ sentences: ["Charge flows.", "Current is its rate."] });
        return new Response("RIFF", { headers: { "content-type": "audio/wav" } });
      }),
    );
    return requests;
  }

  it("reads each sentence in the engine's voice, in order", async () => {
    installSpeech();
    const requests = installEngine("ready");
    render(<ReadAloudButton text="Charge flows. Current is its rate." />);
    await userEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    expect(await screen.findByRole("button", { name: "Read aloud" })).toBeInTheDocument();
    expect(FakeAudio.played).toEqual(["blob:clip-1", "blob:clip-2"]);
    expect(requests.filter((r) => r.url === "/api/speech").map((r) => r.body)).toEqual([
      { text: "Charge flows." },
      { text: "Current is its rate." },
    ]);
  });

  it("starts the voice download and reads with the browser until it is ready", async () => {
    const { spoken } = installSpeech();
    const requests = installEngine("missing");
    render(<ReadAloudButton text="Charge flows." />);
    await userEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    await vi.waitFor(() => expect(spoken).toHaveLength(1));
    expect(requests.some((r) => r.url === "/api/speech/install")).toBe(true);
    expect(FakeAudio.played).toEqual([]);
  });
});

describe("choosing the voice", () => {
  it("reads with the device's voice when chosen, without asking the engine", async () => {
    const { spoken } = installSpeech();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    window.localStorage.setItem("discere.readAloudVoice", "device");
    render(<ReadAloudButton text="Charge flows." />);
    await userEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    await vi.waitFor(() => expect(spoken).toHaveLength(1));
    const asked = fetchSpy.mock.calls.map(([url]) => String(url));
    expect(asked.filter((url) => url !== "/api/speech/status")).toEqual([]);
    window.localStorage.removeItem("discere.readAloudVoice");
  });
});
