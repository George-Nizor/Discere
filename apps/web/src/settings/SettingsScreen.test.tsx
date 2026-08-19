import type { TutorStatus } from "@discere/contracts";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/harness.js";
import { SettingsScreen } from "./SettingsScreen.js";

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
  return stubFetch({ "GET /api/tutor/status": { body: status }, ...extra });
}

describe("settings screen", () => {
  it("reports a live link with the CLI version and quota", async () => {
    stubStatus(LINKED);
    renderWithProviders(<SettingsScreen />);

    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("codex-cli 0.147.0")).toBeInTheDocument();
    expect(screen.getByText("prolite")).toBeInTheDocument();
    expect(screen.getByText("93% used")).toBeInTheDocument();
    expect(screen.getByText("gpt-5.6-luna")).toBeInTheDocument();
    expect(screen.getByText("xhigh")).toBeInTheDocument();
  });

  it("names the fix when the CLI is signed out", async () => {
    stubStatus({ ...LINKED, authPresent: false, lastOutcome: "none" });
    renderWithProviders(<SettingsScreen />);

    expect(await screen.findByText("Not connected")).toBeInTheDocument();
    expect(screen.getByText(/codex login/)).toBeInTheDocument();
  });

  it("names the fix when the CLI is missing entirely", async () => {
    stubStatus({ ...LINKED, binaryFound: false, binaryVersion: "", authPresent: false });
    renderWithProviders(<SettingsScreen />);

    expect(await screen.findByText("Not connected")).toBeInTheDocument();
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
    expect(await screen.findByText("The link is live")).toBeInTheDocument();
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
    expect(await screen.findByText("The link did not answer")).toBeInTheDocument();
    expect(screen.getByText(/unexpected argument '-C' found/)).toBeInTheDocument();
  });
});
