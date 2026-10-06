import type { RomanReferenceQuestionId, TutoringMode } from "@discere/contracts";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/harness.js";
import { TutorPanel } from "./TutorPanel.js";
import { loadTutorConversation } from "./tutor-conversation.js";

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.style.overflow = "";
});

function renderPanel(onClose = vi.fn(), lessonId = "lesson") {
  const rendered = renderWithProviders(
    <TutorPanel conceptIds={["ohms-law"]} lessonId={lessonId} mode="coach" onClose={onClose} />,
  );
  return { ...rendered, onClose };
}

const requestId = "33333333-3333-4333-8333-333333333333";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as Response;
}

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

  it("keeps focus inside the modal and restores the exact body scroll style", async () => {
    const user = userEvent.setup();
    document.body.style.overflow = "scroll";
    const rendered = renderPanel();
    const question = screen.getByLabelText("Your question");
    const close = screen.getByRole("button", { name: "Close the tutor" });

    expect(document.body.style.overflow).toBe("hidden");
    expect(question).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(question).toHaveFocus();

    rendered.unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("dismisses from the existing scrim", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPanel();

    await user.click(screen.getByRole("button", { name: "Close the tutor backdrop" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("allows only one tutor request while a response is pending", async () => {
    let releaseResponse: () => void = () => undefined;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    const fetchStub = vi.fn(async () => {
      await responseGate;
      return jsonResponse({
        status: "answered",
        provider: "mock",
        operation: "tutor_reply",
        requestId,
        accepted: true,
        issues: [],
        reply: {
          answer: "One deferred answer.",
          followUpQuestion: "What should we examine next?",
          sourceIds: [],
          uncertainty: [],
        },
        sessionId: "single-session",
      });
    });
    vi.stubGlobal("fetch", fetchStub);
    const user = userEvent.setup();
    renderPanel();
    const question = screen.getByLabelText("Your question");
    await user.type(question, "Explain the principate.");
    const ask = screen.getByRole("button", { name: "Ask the tutor" });

    act(() => {
      ask.click();
      ask.click();
    });

    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(ask).toBeDisabled();
    expect(question).toBeDisabled();
    releaseResponse();

    expect(await screen.findByText("One deferred answer.")).toBeInTheDocument();
    expect(fetchStub).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(loadTutorConversation("lesson")).toMatchObject({
        sessionId: "single-session",
        exchanges: [{ question: "Explain the principate." }],
      }),
    );
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

  it("keeps the transcript but starts a new provider session across question and mode boundaries", async () => {
    let responseCount = 0;
    const { calls } = stubFetch({
      "POST /api/tutor/ask": () => {
        responseCount += 1;
        return {
          body: {
            status: "answered",
            provider: "mock",
            operation: "tutor_reply",
            requestId,
            accepted: true,
            issues: [],
            reply: {
              answer: `Reference answer ${responseCount}.`,
              followUpQuestion: "What should we examine next?",
              sourceIds: [],
              uncertainty: [],
            },
            sessionId: `reference-session-${responseCount}`,
          },
        };
      },
    });
    const panel = (mode: TutoringMode, referenceQuestionId: RomanReferenceQuestionId) => (
      <TutorPanel
        conceptIds={["roman-turning-points"]}
        lessonId="roman-reference"
        mode={mode}
        onClose={vi.fn()}
        referenceQuestionId={referenceQuestionId}
      />
    );
    const user = userEvent.setup();
    const rendered = renderWithProviders(panel("coach", "turning-points"));

    await user.type(screen.getByLabelText("Your question"), "Help with the turning points.");
    await user.click(screen.getByRole("button", { name: "Ask the tutor" }));
    expect(await screen.findByText("Reference answer 1.")).toBeInTheDocument();
    expect(calls.at(-1)?.body).toMatchObject({
      mode: "coach",
      referenceQuestionId: "turning-points",
    });

    rendered.rerender(panel("assisted", "turning-points"));
    expect(screen.getByText("Help with the turning points.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Your question"), "Now use Assisted mode.");
    await user.click(screen.getByRole("button", { name: "Ask a follow-up" }));
    expect(await screen.findByText("Reference answer 2.")).toBeInTheDocument();
    expect(calls.at(-1)?.body).toMatchObject({
      mode: "assisted",
      referenceQuestionId: "turning-points",
    });
    expect(calls.at(-1)?.body).not.toHaveProperty("sessionId");

    rendered.rerender(panel("assisted", "476-continuity"));
    expect(screen.getByText("Reference answer 1.")).toBeInTheDocument();
    expect(screen.getByText("Reference answer 2.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Your question"), "Move to the 476 question.");
    await user.click(screen.getByRole("button", { name: "Ask a follow-up" }));
    expect(await screen.findByText("Reference answer 3.")).toBeInTheDocument();
    expect(calls.at(-1)?.body).toMatchObject({
      mode: "assisted",
      referenceQuestionId: "476-continuity",
    });
    expect(calls.at(-1)?.body).not.toHaveProperty("sessionId");
    await waitFor(() =>
      expect(loadTutorConversation("roman-reference")).toMatchObject({
        sessionContext: "476-continuity:assisted",
        sessionId: "reference-session-3",
        exchanges: expect.arrayContaining([
          expect.objectContaining({ question: "Help with the turning points." }),
        ]),
      }),
    );
  });

  it("restores the lesson transcript and provider session after reopening or refresh", async () => {
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
            answer: "Start with the relationship between voltage, current, and resistance.",
            followUpQuestion: "Which value opposes the current?",
            sourceIds: [],
            uncertainty: [],
          },
          sessionId: "persisted-session",
        },
      },
    });
    const first = renderPanel();
    await userEvent.type(screen.getByLabelText("Your question"), "Where should I begin?");
    await userEvent.click(screen.getByRole("button", { name: "Ask the tutor" }));
    await screen.findByText(/Start with the relationship/);

    first.rerender(
      <TutorPanel
        conceptIds={["ohms-law"]}
        lessonId="another-lesson"
        mode="coach"
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText("Where should I begin?")).not.toBeInTheDocument();
    first.unmount();

    renderPanel();
    expect(screen.getByText("Where should I begin?")).toBeInTheDocument();
    expect(screen.getByText(/Start with the relationship/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Your question"), "What comes next?");
    await userEvent.click(screen.getByRole("button", { name: "Ask a follow-up" }));
    await screen.findAllByText(/Start with the relationship/);
    expect(calls.at(-1)?.body).toMatchObject({ sessionId: "persisted-session" });
  });

  it("hands back the packet when the provider cannot answer in place", async () => {
    const { calls } = stubFetch({
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
    renderWithProviders(
      <TutorPanel
        conceptIds={["roman-geography"]}
        lessonId="roman-reference"
        mode="coach"
        onClose={vi.fn()}
        referenceQuestionId="map-117"
      />,
    );
    await userEvent.type(screen.getByLabelText("Your question"), "Explain resistance");
    await userEvent.click(screen.getByRole("button", { name: "Ask the tutor" }));
    const packetBody = await screen.findByText("PACKET BODY");
    expect(packetBody).not.toBeVisible();
    expect(screen.getByRole("button", { name: "Copy the tutoring request" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /discere-tutor.json/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Preview the request"));
    expect(packetBody).toBeVisible();
    await userEvent.click(screen.getByText("Preview the request"));
    expect(packetBody).not.toBeVisible();
    expect(calls.at(-1)?.body).toMatchObject({ referenceQuestionId: "map-117" });

    fireEvent.change(screen.getByLabelText("Paste the reply here"), {
      target: { value: '{"protocolVersion":"0.2"}' },
    });
    await userEvent.click(screen.getByRole("button", { name: "Import the reply" }));
    expect(await screen.findByText("Imported answer about the loop.")).toBeInTheDocument();
    expect(calls.at(-1)?.body).toMatchObject({
      expectedRequestId: requestId,
      mode: "coach",
      referenceQuestionId: "map-117",
    });
  });

  it("binds the ask and the import to the essay when the essay opened the drawer", async () => {
    const { calls } = stubFetch({
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
            answer: "The third-century crisis ran from 235 to 284 CE.",
            followUpQuestion: "Which of those pressures does your claim rest on?",
            sourceIds: [],
            uncertainty: [],
          },
        },
      },
    });
    renderWithProviders(
      <TutorPanel
        conceptIds={["fall-and-legacy"]}
        lessonId="rise-of-the-roman-empire"
        mode="coach"
        onClose={vi.fn()}
        referenceEssayId="transformation"
      />,
    );
    await userEvent.type(screen.getByLabelText("Your question"), "What counts as a complication?");
    await userEvent.click(screen.getByRole("button", { name: "Ask the tutor" }));
    expect(await screen.findByText("PACKET BODY")).toBeInTheDocument();
    expect(calls.at(-1)?.body).toMatchObject({ referenceEssayId: "transformation" });
    // The essay is not a reference question, and the server rejects a request claiming both.
    expect(calls.at(-1)?.body).not.toHaveProperty("referenceQuestionId");

    fireEvent.change(screen.getByLabelText("Paste the reply here"), {
      target: { value: '{"protocolVersion":"0.2"}' },
    });
    await userEvent.click(screen.getByRole("button", { name: "Import the reply" }));
    expect(
      await screen.findByText("The third-century crisis ran from 235 to 284 CE."),
    ).toBeInTheDocument();
    expect(calls.at(-1)?.body).toMatchObject({
      expectedRequestId: requestId,
      mode: "coach",
      referenceEssayId: "transformation",
    });
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

  it("shows the cause the server named beneath the generic sentence", async () => {
    stubFetch({
      "POST /api/tutor/ask": {
        status: 502,
        body: {
          code: "TUTOR_PROVIDER_FAILED",
          message: "The local model exited with code 2.",
          detail: "error: unexpected argument '-C' found",
        },
      },
    });
    renderPanel();
    await userEvent.type(screen.getByLabelText("Your question"), "Why did that fail?");
    await userEvent.click(screen.getByRole("button", { name: "Ask the tutor" }));
    expect(await screen.findByText(/failed and produced no reply/)).toBeInTheDocument();
    expect(screen.getByText("error: unexpected argument '-C' found")).toBeInTheDocument();
  });

  it("clears an expired provider session so the learner can recover after refresh", async () => {
    let requestCount = 0;
    const { calls } = stubFetch({
      "POST /api/tutor/ask": () => {
        requestCount += 1;
        if (requestCount === 1) {
          return {
            body: {
              status: "answered",
              provider: "mock",
              operation: "tutor_reply",
              requestId,
              accepted: true,
              issues: [],
              reply: {
                answer: "Begin with Ohm's law.",
                followUpQuestion: "Which values do you already know?",
                sourceIds: [],
                uncertainty: [],
              },
              sessionId: "expired-session",
            },
          };
        }
        if (requestCount === 2) {
          return {
            status: 400,
            body: { code: "TUTOR_SESSION_INVALID", message: "Bad session id." },
          };
        }
        return {
          body: {
            status: "answered",
            provider: "mock",
            operation: "tutor_reply",
            requestId,
            accepted: true,
            issues: [],
            reply: {
              answer: "This is a new provider conversation.",
              followUpQuestion: "What would you like to revisit?",
              sourceIds: [],
              uncertainty: [],
            },
            sessionId: "replacement-session",
          },
        };
      },
    });
    const first = renderPanel();
    await userEvent.type(screen.getByLabelText("Your question"), "How do I start?");
    await userEvent.click(screen.getByRole("button", { name: "Ask the tutor" }));
    await screen.findByText("Begin with Ohm's law.");

    await userEvent.type(screen.getByLabelText("Your question"), "Carry on from before.");
    await userEvent.click(screen.getByRole("button", { name: "Ask a follow-up" }));
    expect(await screen.findByText(/conversation expired/)).toBeInTheDocument();
    expect(calls.at(-1)?.body).toMatchObject({ sessionId: "expired-session" });
    first.unmount();

    renderPanel();
    expect(screen.getByText("Begin with Ohm's law.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Your question"), "Start a new conversation.");
    await userEvent.click(screen.getByRole("button", { name: "Ask a follow-up" }));
    expect(await screen.findByText("This is a new provider conversation.")).toBeInTheDocument();
    expect(calls.at(-1)?.body).not.toHaveProperty("sessionId");
  });

  it("closes on Escape", async () => {
    stubFetch({});
    const { onClose } = renderPanel();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
