import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, stubFetch } from "../test/harness.js";
import { Illustration } from "../ui/Illustration.js";
import { CapabilityProvider, useCapabilityUnavailable } from "./capability-context.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function Probe() {
  return <p>{useCapabilityUnavailable("illustrations") ? "hidden" : "offered"}</p>;
}

function renderWithCapabilities(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <CapabilityProvider>{ui}</CapabilityProvider>
    </QueryClientProvider>,
  );
}

const AVAILABLE = {
  capabilities: [
    { id: "tutor_generation", state: "available", reason: "", fallback: "" },
    { id: "illustrations", state: "available", reason: "", fallback: "" },
    { id: "authoring", state: "available", reason: "", fallback: "" },
  ],
};

const WITHOUT_DRAWING = {
  capabilities: [
    { id: "tutor_generation", state: "available", reason: "", fallback: "" },
    {
      id: "illustrations",
      state: "unavailable",
      reason: "The Codex CLI is not installed, so nothing can be generated locally.",
      fallback: "Lesson diagrams, maps, and timelines are drawn from data and are unaffected.",
    },
    { id: "authoring", state: "available", reason: "", fallback: "" },
  ],
};

describe("capability context", () => {
  it("reads the capability once for everything that asks", async () => {
    const { stub } = stubFetch({ "GET /api/capabilities": { body: WITHOUT_DRAWING } });
    renderWithCapabilities(
      <>
        <Probe />
        <Probe />
        <Probe />
      </>,
    );
    await waitFor(() => expect(screen.getAllByText("hidden")).toHaveLength(3));
    // One request, not one per consumer: the answer belongs to the installation.
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it("carries on when nothing has answered yet", () => {
    stubFetch({ "GET /api/capabilities": { body: AVAILABLE } });
    renderWithCapabilities(<Probe />);
    // Before the reply lands the state is unknown, and unknown is not the same as absent.
    expect(screen.getByText("offered")).toBeInTheDocument();
  });

  it("carries on with no provider at all, so a screen test needs no capability fixture", () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <Probe />
      </QueryClientProvider>,
    );
    expect(screen.getByText("offered")).toBeInTheDocument();
  });
});

describe("the drawn illustration control", () => {
  const subject = "The tetrarchy as four regional centres of rule";

  it("offers to draw when the installation can", async () => {
    stubFetch({ "GET /api/capabilities": { body: AVAILABLE } });
    renderWithCapabilities(<Illustration accent="#3E83F8" alt={subject} subject={subject} />);
    expect(await screen.findByRole("button", { name: "Draw this" })).toBeInTheDocument();
  });

  it("shows nothing at all when it cannot, rather than a control that would fail", async () => {
    const { stub } = stubFetch({ "GET /api/capabilities": { body: WITHOUT_DRAWING } });
    renderWithCapabilities(<Illustration accent="#3E83F8" alt={subject} subject={subject} />);
    await waitFor(() => expect(stub).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Draw this" })).not.toBeInTheDocument(),
    );
    // No disabled button and no explanation in the lesson: Settings says why, once.
    expect(screen.queryByText(/Codex/)).not.toBeInTheDocument();
  });

  it("never starts a generation the server would refuse", async () => {
    const { stub } = stubFetch({ "GET /api/capabilities": { body: WITHOUT_DRAWING } });
    const user = userEvent.setup();
    renderWithCapabilities(<Illustration accent="#3E83F8" alt={subject} subject={subject} />);
    await waitFor(() => expect(stub).toHaveBeenCalled());
    // Nothing to press, so nothing is spent. The stub would throw on an unregistered POST.
    await user.click(document.body);
    expect(stub).toHaveBeenCalledTimes(1);
  });
});
