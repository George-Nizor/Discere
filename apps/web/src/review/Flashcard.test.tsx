import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/harness.js";
import { Flashcard } from "./Flashcard.js";

afterEach(() => vi.unstubAllGlobals());

const sessionId = "22222222-2222-4222-8222-222222222222";

function renderCard(onRated = vi.fn()) {
  renderWithProviders(
    <Flashcard
      conceptTitles={["Ohm’s law"]}
      front="What current flows through 100 Ω at 5 V?"
      onRated={onRated}
      position={1}
      sessionId={sessionId}
      total={3}
    />,
  );
  return onRated;
}

describe("flashcard", () => {
  it("keeps the answer hidden until the learner reveals it", () => {
    stubFetch({});
    renderCard();
    expect(screen.getByLabelText("Your answer")).toBeInTheDocument();
    expect(screen.getByText("What current flows through 100 Ω at 5 V?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reveal answer/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Good/ })).not.toBeInTheDocument();
  });

  it("reveals, announces the answer, then records a rating and its schedule", async () => {
    const { calls } = stubFetch({
      [`POST /api/review/sessions/${sessionId}/respond`]: {
        body: {
          response: "0.05 A",
          correct: true,
          feedback: "Your response matches the marking rule.",
        },
      },
      [`POST /api/review/sessions/${sessionId}/reveal`]: {
        body: { sessionId, cardId: "card-1", back: "0.05 A", sourceIds: [] },
      },
      [`POST /api/review/sessions/${sessionId}/rate`]: {
        body: {
          sessionId,
          rating: "good",
          evidence: "independent",
          dueAt: "2026-08-22T12:00:00.000Z",
          intervalDays: 4,
          repetition: 1,
        },
      },
    });
    const onRated = renderCard();

    await userEvent.type(screen.getByLabelText("Your answer"), "0.05 A");
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Your response matches the marking rule.")).toBeInTheDocument();

    expect(await screen.findByRole("button", { name: /Good/ })).toBeInTheDocument();
    expect(screen.getAllByText("0.05 A").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Reveal answer/ })).not.toBeInTheDocument();
    expect(screen.getByText("Answer revealed: 0.05 A")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Good/ }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.getByText(/This card comes back/)).toBeInTheDocument();
    expect(onRated).toHaveBeenCalledOnce();
    expect(onRated.mock.calls[0]?.[1]).toBe(true);
    expect(calls.at(-1)?.body).toEqual({ rating: "good", recalled: true });
  });

  it("reports 'again' as a failed recall", async () => {
    const { calls } = stubFetch({
      [`POST /api/review/sessions/${sessionId}/reveal`]: {
        body: { sessionId, cardId: "card-1", back: "0.05 A", sourceIds: [] },
      },
      [`POST /api/review/sessions/${sessionId}/rate`]: {
        body: {
          sessionId,
          rating: "again",
          evidence: "assisted",
          dueAt: "2026-08-18T12:10:00.000Z",
          intervalDays: 0.007,
          repetition: 0,
        },
      },
    });
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: /Reveal answer/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Again/ }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(calls.at(-1)?.body).toEqual({ rating: "again", recalled: false });
  });
});

describe("recall explanation recovery", () => {
  it("shows a wrong answer's explanation immediately and preserves the submitted response", async () => {
    const { calls } = stubFetch({
      ["POST /api/review/sessions/" + sessionId + "/respond"]: {
        body: { response: "0.5 A", correct: false, feedback: "Compare your answer." },
      },
      ["POST /api/review/sessions/" + sessionId + "/reveal"]: {
        body: { sessionId, cardId: "card-1", back: "5 / 100 = 0.05 A.", sourceIds: [] },
      },
    });
    renderCard();
    await userEvent.type(screen.getByLabelText("Your answer"), "0.5 A");
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByRole("button", { name: /Again/ })).toBeInTheDocument();
    expect(screen.getByText("5 / 100 = 0.05 A.")).toBeInTheDocument();
    expect(screen.getByText("Not quite. Here’s the explanation.")).toHaveClass("is-incorrect");
    expect(screen.getByText("0.5 A")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Again/ })).toHaveClass("is-suggested");
    expect(calls.map((c) => c.key)).toEqual([
      "POST /api/review/sessions/" + sessionId + "/respond",
      "POST /api/review/sessions/" + sessionId + "/reveal",
    ]);
  });

  it("retries a failed explanation without resubmitting a saved answer", async () => {
    let reveals = 0;
    const { calls } = stubFetch({
      ["POST /api/review/sessions/" + sessionId + "/respond"]: {
        body: { response: "0.05 A", correct: true, feedback: "Correct." },
      },
      ["POST /api/review/sessions/" + sessionId + "/reveal"]: () =>
        ++reveals === 1
          ? { status: 503 }
          : { body: { sessionId, cardId: "card-1", back: "0.05 A", sourceIds: [] } },
    });
    renderCard();
    await userEvent.type(screen.getByLabelText("Your answer"), "0.05 A");
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(
      await screen.findByText(/Your answer was saved, but the explanation did not load/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reveal answer" }));
    expect(await screen.findByRole("button", { name: /Good/ })).toBeInTheDocument();
    expect(calls.filter((c) => c.key.endsWith("/respond"))).toHaveLength(1);
    expect(calls.filter((c) => c.key.endsWith("/reveal"))).toHaveLength(2);
  });

  it("keeps exam answers hidden until a response is successfully committed", async () => {
    const { calls } = stubFetch({
      ["POST /api/review/sessions/" + sessionId + "/respond"]: { status: 503 },
    });
    renderWithProviders(
      <Flashcard
        sessionId={sessionId}
        front="Recall the current."
        position={1}
        total={1}
        mode="exam"
        onRated={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Reveal answer" })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Your answer"), "0.05 A");
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("The review step failed")).toBeInTheDocument();
    expect(screen.getByLabelText("Your answer")).toHaveValue("0.05 A");
    expect(calls).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Good/ })).not.toBeInTheDocument();
  });
});

describe("revealing with a typed answer", () => {
  it("records the typed answer as the recall instead of discarding it", async () => {
    const { calls } = stubFetch({
      ["POST /api/review/sessions/" + sessionId + "/respond"]: {
        body: { response: "0.05 A", correct: true, feedback: "Correct." },
      },
      ["POST /api/review/sessions/" + sessionId + "/reveal"]: {
        body: { sessionId, cardId: "card-1", back: "0.05 A", sourceIds: [] },
      },
    });
    renderCard();
    await userEvent.type(screen.getByLabelText("Your answer"), "0.05 A");
    expect(screen.getByText("Revealing checks what you typed first.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Reveal answer/ }));
    expect(await screen.findByRole("button", { name: /Good/ })).toHaveClass("is-suggested");
    expect(calls.map((c) => c.key)).toEqual([
      "POST /api/review/sessions/" + sessionId + "/respond",
      "POST /api/review/sessions/" + sessionId + "/reveal",
    ]);
    expect(calls[0]?.body).toEqual({ response: "0.05 A" });
  });
});
