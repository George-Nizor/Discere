import type { TutorStatus } from "@discere/contracts";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/harness.js";
import { SettingsScreen } from "./SettingsScreen.js";
import { studyFixture } from "../test/study-fixture.js";

afterEach(() => vi.unstubAllGlobals());

const LINKED: TutorStatus = {
  provider: "codex",
  model: "gpt-5.6-luna",
  reasoningEffort: "xhigh",
  binaryFound: true,
  binaryVersion: "codex-cli 0.147.0",
  authPresent: true,
  queueDepth: 0,
  lastOutcome: "ok",
  lastError: "",
  quotaKnown: true,
  quotaPlanType: "prolite",
  quotaUsedPercent: 93,
  quotaResetsAt: 1_787_201_789,
};

function stubStatus(status: TutorStatus, extra: Record<string, unknown> = {}) {
  return stubFetch({
    "GET /api/tutor/status": { body: status },
    "GET /api/study/preferences": { body: studyFixture.preferences },
    "GET /api/capabilities": {
      body: {
        capabilities: [{ id: "tutor_generation", state: "available", reason: "", fallback: "" }],
      },
    },
    ...extra,
  });
}

describe("settings screen", () => {
  it("reports a live link with the CLI version and quota", async () => {
    stubStatus(LINKED);
    renderWithProviders(<SettingsScreen />);

    expect(await screen.findByText("Connection verified")).toBeInTheDocument();
    expect(screen.getByText("codex-cli 0.147.0")).toBeInTheDocument();
    expect(screen.getByText("prolite")).toBeInTheDocument();
    expect(screen.getByText("93% used")).toBeInTheDocument();
    expect(screen.getByText("gpt-5.6-luna")).toBeInTheDocument();
    expect(screen.getByText("xhigh")).toBeInTheDocument();
  });

  it("names the fix when the CLI is signed out", async () => {
    stubStatus({ ...LINKED, authPresent: false, lastOutcome: "none" });
    renderWithProviders(<SettingsScreen />);

    expect(await screen.findByText("Setup needed")).toBeInTheDocument();
    expect(screen.getByText(/codex login/)).toBeInTheDocument();
  });

  it("names the fix when the CLI is missing entirely", async () => {
    stubStatus({ ...LINKED, binaryFound: false, binaryVersion: "", authPresent: false });
    renderWithProviders(<SettingsScreen />);

    expect(await screen.findByText("Setup needed")).toBeInTheDocument();
    expect(screen.getByText(/Install the Codex CLI/)).toBeInTheDocument();
  });

  it("shows the last failure rather than leaving the owner guessing", async () => {
    stubStatus({
      ...LINKED,
      lastOutcome: "error",
      lastError: "The local model exited with code 2.",
    });
    renderWithProviders(<SettingsScreen />);

    expect(await screen.findByText("The last request failed")).toBeInTheDocument();
    expect(screen.getByText("The local model exited with code 2.")).toBeInTheDocument();
  });

  it("reports the round trip after a live test request", async () => {
    stubStatus(LINKED, {
      "POST /api/tutor/probe": {
        body: { ok: true, durationMs: 7_100, message: "Local Codex CLI answered." },
      },
    });
    renderWithProviders(<SettingsScreen />);

    await userEvent.click(await screen.findByRole("button", { name: /live test request/ }));
    expect(await screen.findByText("The connection answered")).toBeInTheDocument();
    expect(screen.getByText(/Round trip 7\.1s/)).toBeInTheDocument();
  });

  it("keeps a failed test request on screen instead of a silent no-op", async () => {
    stubStatus(LINKED, {
      "POST /api/tutor/probe": {
        body: {
          ok: false,
          durationMs: 900,
          message: "The local model exited with code 2. error: unexpected argument '-C' found",
        },
      },
    });
    renderWithProviders(<SettingsScreen />);

    await userEvent.click(await screen.findByRole("button", { name: /live test request/ }));
    expect(await screen.findByText("The test did not answer")).toBeInTheDocument();
    expect(screen.getByText(/unexpected argument '-C' found/)).toBeInTheDocument();
  });
});

describe("honest provider status and recovery", () => {
  it("distinguishes configured credentials from a tested connection", async () => {
    stubStatus({ ...LINKED, lastOutcome: "none", quotaKnown: false });
    renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText("Ready to test")).toBeInTheDocument();
    expect(screen.queryByText("Connection verified")).toBeNull();
    expect(screen.getByText(/CLI and sign-in are present/)).toBeInTheDocument();
  });
  it("refreshes connection status after a probe", async () => {
    let answered = false;
    stubStatus(LINKED, {
      "GET /api/tutor/status": () => ({
        body: { ...LINKED, lastOutcome: answered ? "ok" : "none" },
      }),
      "POST /api/tutor/probe": () => {
        answered = true;
        return { body: { ok: true, durationMs: 150, message: "Answered." } };
      },
    });
    renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText("Ready to test")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Send a live test request" }));
    expect(await screen.findByText("Connection verified")).toBeInTheDocument();
  });
  it("keeps study preferences available when tutor status fails", async () => {
    stubStatus(LINKED, { "GET /api/tutor/status": { status: 503 } });
    renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText("Tutor status unavailable")).toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: /5 responses a day/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Retry tutor status" })).toBeEnabled();
  });
  it("shows a capability failure honestly and supports retry", async () => {
    let requests = 0;
    stubStatus(LINKED, {
      "GET /api/capabilities": () =>
        ++requests === 1
          ? { status: 503 }
          : {
              body: {
                capabilities: [
                  { id: "tutor_generation", state: "available", reason: "", fallback: "" },
                ],
              },
            },
    });
    renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText("Availability could not be checked")).toBeInTheDocument();
    expect(screen.queryByText("Available")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Check availability again" }));
    expect(await screen.findByText("Available")).toBeInTheDocument();
    expect(screen.queryByText("Availability could not be checked")).toBeNull();
  });
  it("does not present the offline provider as a live model connection", async () => {
    stubStatus(
      { ...LINKED, provider: "mock", binaryFound: false, authPresent: false, quotaKnown: false },
      {
        "POST /api/tutor/probe": {
          body: { ok: true, durationMs: 1, message: "Offline examples answered." },
        },
      },
    );
    renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText("Offline practice")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send a live test request" })).toBeNull();
    expect(screen.queryByText("Reported subscription usage")).toBeNull();
    // The offline tutor makes no model request, so there is nothing for the learner to test.
    expect(screen.queryByRole("button", { name: /test/i })).toBeNull();
  });
  it("shows tutor routing and what it has used this session", async () => {
    stubStatus({
      ...LINKED,
      routing: { mode: "auto", fastModel: "fast-1", smartModel: "smart-1" },
      usage: {
        calls: 3,
        costUsd: 0.012,
        byModel: [
          { model: "fast-1", calls: 3, costUsd: 0.012, inputTokens: 1200, outputTokens: 300 },
        ],
      },
    });
    renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText("Chooses per question")).toBeInTheDocument();
    expect(screen.getByText("smart-1")).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "fast-1" })).toBeInTheDocument();
    expect(screen.getByText(/3 requests/)).toBeInTheDocument();
  });
  it("keeps the illustrations reason and fallback as readable sentences", async () => {
    stubStatus(LINKED);
    renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText("Tutor answers")).toBeInTheDocument();
    expect(screen.queryByText("Course authoring")).toBeNull();
  });
  it("keeps the companion workflow free of unsupported live-test controls", async () => {
    stubStatus({
      ...LINKED,
      provider: "companion",
      binaryFound: false,
      authPresent: false,
      quotaKnown: false,
    });
    renderWithProviders(<SettingsScreen />);
    expect(await screen.findByText("Copy and paste")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /test/i })).toBeNull();
    expect(screen.getByText(/copy its prompt into ChatGPT/)).toBeInTheDocument();
    expect(screen.queryByText("Setup needed")).toBeNull();
  });
});
