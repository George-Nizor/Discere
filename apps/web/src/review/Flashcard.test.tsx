import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/harness.js";
import { cardFrontParts, Flashcard } from "./Flashcard.js";

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
  it("lists the options of a missed choice question under its prompt", () => {
    stubFetch({});
    renderWithProviders(
      <Flashcard
        conceptTitles={[]}
        front={"Which unit measures current?\nOptions:\nAmpere\nVolt; the unit of potential"}
        onRated={vi.fn()}
        position={1}
        sessionId={sessionId}
        total={1}
      />,
    );
    expect(screen.getByText("Which unit measures current?")).toBeInTheDocument();
    const options = screen.getByRole("list", { name: "Options" });
    expect([...options.querySelectorAll("li")].map((item) => item.textContent)).toEqual([
      "Ampere",
      "Volt; the unit of potential",
    ]);
    expect(cardFrontParts("A plain front")).toEqual({ prompt: "A plain front", options: [] });
  });

  it("keeps the answer hidden until the learner reveals it", () => {
    stubFetch({});
    renderCard();
    expect(screen.getByLabelText("Your answer")).toBeInTheDocument();
    expect(screen.getByText("What current flows through 100 Ω at 5 V?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reveal answer/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Good/ })).not.toBeInTheDocument();
  });

  it("says in words how far through the session the learner is", () => {
    stubFetch({});
    renderCard();
    expect(screen.getByRole("progressbar", { name: "Review progress" })).toHaveAttribute(
      "aria-valuetext",
      "Card 1 of 3",
    );
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
  describe("a card that asks an order or sort question", () => {
    const base = { conceptIds: ["c"], difficulty: 1, hintCount: 0, sourceIds: ["s"] };
    const order = {
      ...base,
      id: "q-order",
      prompt: "In what order did these happen?",
      responseType: "order" as const,
      order: {
        items: [
          { id: "ia", label: "Alpha" },
          { id: "ib", label: "Beta" },
          { id: "ic", label: "Gamma" },
        ],
      },
    };
    const shown = () =>
      [...document.querySelectorAll(".order-item-label")].map((item) => item.textContent);

    it("is answered by arranging the items, marked, and then shows the right order", async () => {
      const { calls } = stubFetch({
        [`POST /api/review/sessions/${sessionId}/respond`]: ({ body }) => ({
          body: { response: (body as { response: string }).response, correct: false, feedback: "Compare your response with the answer." },
        }),
        [`POST /api/review/sessions/${sessionId}/reveal`]: {
          body: {
            sessionId,
            cardId: "flashcard:q-order",
            back: "Alpha led to Beta, and Beta to Gamma.",
            sourceIds: [],
            solution: { order: ["ia", "ib", "ic"] },
          },
        },
      });
      renderWithProviders(
        <Flashcard
          front={"In what order did these happen?\n\nItems to put in order:\nAlpha\nBeta\nGamma"}
          onRated={vi.fn()}
          position={1}
          question={order}
          recall="typed"
          sessionId={sessionId}
          total={1}
        />,
      );
      // The items are in the list to arrange, so the card has no box to type in.
      expect(screen.queryByLabelText("Your answer")).not.toBeInTheDocument();
      expect(screen.getByText("In what order did these happen?")).toBeInTheDocument();
      expect([...shown()].sort()).toEqual(["Alpha", "Beta", "Gamma"]);
      const first = shown()[0] as string;
      await userEvent.click(screen.getByRole("button", { name: `Move down: ${first}` }));
      expect(shown()[1]).toBe(first);
      const sent = shown();
      await userEvent.click(screen.getByRole("button", { name: "Check" }));
      expect(await screen.findByRole("list", { name: "The right order" })).toBeInTheDocument();
      expect(shown()).toEqual(["Alpha", "Beta", "Gamma"]);
      expect(screen.getByText("Alpha led to Beta, and Beta to Gamma.")).toBeInTheDocument();
      const labels: Record<string, string> = { ia: "Alpha", ib: "Beta", ic: "Gamma" };
      expect(
        (calls[0]!.body as { response: string }).response.split(",").map((id) => labels[id]),
      ).toEqual(sent);
      expect(screen.getByRole("button", { name: /Again/ })).toBeInTheDocument();
    });

    it("reveals without marking the arrangement the items happened to start in", async () => {
      const { calls } = stubFetch({
        [`POST /api/review/sessions/${sessionId}/reveal`]: {
          body: {
            sessionId,
            cardId: "flashcard:q-order",
            back: "Alpha led to Beta.",
            sourceIds: [],
            solution: { order: ["ia", "ib", "ic"] },
          },
        },
      });
      renderWithProviders(
        <Flashcard
          front="In what order did these happen?"
          onRated={vi.fn()}
          position={1}
          question={order}
          recall="typed"
          sessionId={sessionId}
          total={1}
        />,
      );
      expect(screen.queryByText("Revealing checks what you typed first.")).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: /Reveal answer/ }));
      expect(await screen.findByRole("list", { name: "The right order" })).toBeInTheDocument();
      expect(calls.map((call) => call.key)).toEqual([
        `POST /api/review/sessions/${sessionId}/reveal`,
      ]);
      // Nothing was checked, so no item is marked as one the learner had in place.
      expect(screen.queryByLabelText("You had this in the right place")).not.toBeInTheDocument();
    });

    it("sets out a missed source question with its extract and attribution", () => {
      stubFetch({});
      renderWithProviders(
        <Flashcard
          front={"What is this evidence of?\nOptions:\nHis image\nThe facts"}
          onRated={vi.fn()}
          position={1}
          question={{
            ...base,
            id: "q-source",
            prompt: "The text opens with this sentence. What is this evidence of?",
            responseType: "short_text",
            extracts: [
              { text: "I restored liberty.", who: "Augustus, Res Gestae", when: "14 CE", kind: "His own record" },
            ],
            choices: [
              { id: "a", label: "His image" },
              { id: "b", label: "The facts" },
            ],
          }}
          recall="self"
          sessionId={sessionId}
          total={1}
        />,
      );
      expect(screen.getByText("I restored liberty.")).toBeInTheDocument();
      expect(screen.getByText("Augustus, Res Gestae, 14 CE. His own record.")).toBeInTheDocument();
      expect(screen.getByRole("list", { name: "Options" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Check" })).not.toBeInTheDocument();
    });
  });
});
