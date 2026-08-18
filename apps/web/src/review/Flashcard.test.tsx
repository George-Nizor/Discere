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
      conceptIds={["ohms-law"]}
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
    expect(screen.getByText("Front")).toBeInTheDocument();
    expect(screen.getByText("What current flows through 100 Ω at 5 V?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reveal answer/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Good/ })).not.toBeInTheDocument();
  });

  it("reveals, announces the answer, then records a rating and its schedule", async () => {
    const { calls } = stubFetch({
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

    await userEvent.click(screen.getByRole("button", { name: /Reveal answer/ }));
    expect(await screen.findByText("0.05 A")).toBeInTheDocument();
    expect(screen.getByText("Answer revealed: 0.05 A")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Good/ }));
    expect(await screen.findByText(/Recorded as independent evidence/)).toBeInTheDocument();
    expect(screen.getByText(/returns in 4 days/)).toBeInTheDocument();
    expect(onRated).toHaveBeenCalledOnce();
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
    expect(await screen.findByText(/Recorded as assisted evidence/)).toBeInTheDocument();
    expect(calls.at(-1)?.body).toEqual({ rating: "again", recalled: false });
  });
});
