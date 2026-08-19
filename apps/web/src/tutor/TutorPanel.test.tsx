import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/harness.js";
import { TutorPanel } from "./TutorPanel.js";

afterEach(() => vi.unstubAllGlobals());

function renderPanel(onClose = vi.fn()) {
  renderWithProviders(
    <TutorPanel conceptIds={["ohms-law"]} lessonId="lesson" mode="coach" onClose={onClose} />,
  );
  return onClose;
}

const requestId = "33333333-3333-4333-8333-333333333333";

describe("tutor panel", () => {
  it("renders an answered reply with its follow-up question", async () => {
    const { calls } = stubFetch({
      "POST /api/tutor/ask": {
        body: {
          status: "answered",
          provider: "mock",
          operation: "tutor_reply",
          requestId,
          accepted: true,
          issues: [],
          reply: {
            answer: "Put the supplied voltage above the resistance.",
            followUpQuestion: "Which two values belong in the division?",
            sourceIds: [],
            uncertainty: [],
          },
          sessionId: "session-1",
        },
      },
    });
    renderPanel();
    await userEvent.type(screen.getByLabelText("Your question"), "How do I start?");
    await userEvent.click(screen.getByRole("button", { name: "Ask the tutor" }));
    expect(
      await screen.findByText("Put the supplied voltage above the resistance."),
    ).toBeInTheDocument();
    expect(screen.getByText("Which two values belong in the division?")).toBeInTheDocument();
    expect(calls.at(-1)?.body).toMatchObject({ mode: "coach", lessonId: "lesson" });
  });

  it("passes the session id back so a follow-up continues the same conversation", async () => {
    const { calls } = stubFetch({
      "POST /api/tutor/ask": {
        body: {
          status: "answered",
          provider: "mock",
          operation: "tutor_reply",
          requestId,
          accepted: true,
          issues: [],
          reply: {
            answer: "Start from the relationship.",
            followUpQuestion: "What is the resistance?",
            sourceIds: [],
            uncertainty: [],
          },
          sessionId: "session-1",
        },
      },
    });
    renderPanel();
    await userEvent.type(screen.getByLabelText("Your question"), "First question");
    await userEvent.click(screen.getByRole("button", { name: "Ask the tutor" }));
    await screen.findByText("Start from the relationship.");
    await userEvent.type(screen.getByLabelText("Your question"), "Second question");
    await userEvent.click(screen.getByRole("button", { name: "Ask a follow-up" }));
    await screen.findAllByText("Start from the relationship.");
    expect(calls.at(-1)?.body).toMatchObject({ sessionId: "session-1" });
  });

  it("hands back the packet when the provider cannot answer in place", async () => {
    stubFetch({
      "POST /api/tutor/ask": {
        body: {
          status: "packet_required",
          provider: "companion",
          operation: "tutor_reply",
          requestId,
          packet: { filename: "discere-tutor.json", text: "PACKET BODY" },
          message: "Copy the packet into ChatGPT and import the reply.",
        },
      },
      "POST /api/tutor/companion/import": {
        body: {
          accepted: true,
          operation: "tutor_reply",
          requestId,
          issues: [],
          reply: {
            answer: "Imported answer about the loop.",
            followUpQuestion: "What changes when resistance doubles?",
            sourceIds: [],
            uncertainty: [],
          },
        },
      },
    });
    renderPanel();
    await userEvent.type(screen.getByLabelText("Your question"), "Explain resistance");
    await userEvent.click(screen.getByRole("button", { name: "Ask the tutor" }));
    expect(await screen.findByText("PACKET BODY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy discere-tutor.json/ })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Paste the reply here"), {
      target: { value: '{"protocolVersion":"0.2"}' },
    });
    await userEvent.click(screen.getByRole("button", { name: "Import the reply" }));
    expect(await screen.findByText("Imported answer about the loop.")).toBeInTheDocument();
  });

  it("explains a provider timeout instead of inventing an answer", async () => {
    stubFetch({
      "POST /api/tutor/ask": {
        status: 504,
        body: { code: "TUTOR_PROVIDER_TIMEOUT", message: "The tutor timed out." },
      },
    });
    renderPanel();
    await userEvent.type(screen.getByLabelText("Your question"), "Why is this slow?");
    await userEvent.click(screen.getByRole("button", { name: "Ask the tutor" }));
    expect(await screen.findByText(/did not finish in time/)).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    stubFetch({});
    const onClose = renderPanel();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
