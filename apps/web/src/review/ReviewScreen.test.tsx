import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { renderWithProviders, stubFetch } from "../test/harness.js";
import { ReviewSessionScreen } from "./ReviewScreen.js";
import { saveReviewRun } from "./review-run.js";
const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const card = (sessionId: string, rated: boolean) => ({
  sessionId,
  rated,
  card: {
    cardId: "card",
    questionId: "question",
    front: "Find the displacement.",
    conceptIds: ["displacement"],
    revealed: false,
  },
});
function renderSession(id = first) {
  return renderWithProviders(
    <Routes>
      <Route path="/review/session/:sessionId" element={<ReviewSessionScreen />} />
    </Routes>,
    "/review/session/" + id,
  );
}
beforeEach(() => sessionStorage.clear());
afterEach(() => vi.unstubAllGlobals());
describe("a bounded review", () => {
  it("lengthens the run when more cards are due than when it started", async () => {
    saveReviewRun(first, { position: 1, total: 2 });
    stubFetch({
      ["GET /api/review/sessions/" + first]: { body: card(first, true) },
      "GET /api/review": { body: { dueCount: 9, estimatedMinutes: 18, courses: [] } },
      "POST /api/review/sessions": { body: card(second, true) },
      ["GET /api/review/sessions/" + second]: { body: card(second, true) },
    });
    renderSession();
    expect(await screen.findByText("1 / 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next card" }));
    expect(await screen.findByText("2 / 10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next card" })).toBeInTheDocument();
  });
  it("advances the saved position and finishes with a summary after the last card", async () => {
    saveReviewRun(first, { position: 1, total: 2 });
    const { calls } = stubFetch({
      ["GET /api/review/sessions/" + first]: { body: card(first, true) },
      "GET /api/review": { body: { dueCount: 1, estimatedMinutes: 2, courses: [] } },
      "POST /api/review/sessions": { body: card(second, true) },
      ["GET /api/review/sessions/" + second]: { body: card(second, true) },
    });
    renderSession();
    expect(await screen.findByText("1 / 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next card" }));
    expect(await screen.findByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByText("Review complete")).toBeInTheDocument();
    expect(screen.getByText("Cards reviewed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next card" })).not.toBeInTheDocument();
    expect(calls.filter((c) => c.key === "POST /api/review/sessions")).toHaveLength(1);
  });
  it("restores a rated card after reload without asking the learner to reveal or rate it again", async () => {
    saveReviewRun(first, { position: 2, total: 3 });
    stubFetch({ ["GET /api/review/sessions/" + first]: { body: card(first, true) } });
    renderSession();
    expect(await screen.findByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByText("Your review is saved.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reveal answer" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next card" })).toBeInTheDocument();
  });
  it("finishes if no cards remain due without opening an early practice card", async () => {
    saveReviewRun(first, { position: 1, total: 3 });
    const { calls } = stubFetch({
      ["GET /api/review/sessions/" + first]: { body: card(first, true) },
      "GET /api/review": { body: { dueCount: 0, estimatedMinutes: 0, courses: [] } },
    });
    renderSession();
    await userEvent.click(await screen.findByRole("button", { name: "Next card" }));
    expect(await screen.findByText("Review complete")).toBeInTheDocument();
    expect(calls.some((c) => c.key === "POST /api/review/sessions")).toBe(false);
  });
  it("keeps progress and offers a retry when opening the next card fails", async () => {
    saveReviewRun(first, { position: 1, total: 3 });
    stubFetch({
      ["GET /api/review/sessions/" + first]: { body: card(first, true) },
      "GET /api/review": { status: 503, body: { message: "Temporarily unavailable" } },
    });
    renderSession();
    await userEvent.click(await screen.findByRole("button", { name: "Next card" }));
    expect(await screen.findByText("Card unavailable")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next card" })).toBeEnabled();
  });
});

it("returns to a rated card through browser history without reopening its answer", async () => {
  saveReviewRun(first, { position: 1, total: 2 });
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  stubFetch({
    ["GET /api/review/sessions/" + first]: { body: card(first, false) },
    ["POST /api/review/sessions/" + first + "/reveal"]: {
      body: {
        sessionId: first,
        cardId: "card",
        back: "7 m",
        sourceIds: [],
      },
    },
    ["POST /api/review/sessions/" + first + "/rate"]: {
      body: {
        sessionId: first,
        rating: "good",
        evidence: "assisted",
        dueAt: "2026-10-04T00:00:00.000Z",
        intervalDays: 2,
        repetition: 1,
      },
    },
    "GET /api/review": { body: { dueCount: 1, estimatedMinutes: 2, courses: [] } },
    "POST /api/review/sessions": { body: card(second, true) },
    ["GET /api/review/sessions/" + second]: { body: card(second, true) },
  });
  function HistoryBack() {
    const navigate = useNavigate();
    return (
      <button onClick={() => void navigate(-1)} type="button">
        Browser back
      </button>
    );
  }
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/review/session/" + first]}>
        <HistoryBack />
        <Routes>
          <Route path="/review/session/:sessionId" element={<ReviewSessionScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await userEvent.click(await screen.findByRole("button", { name: "Reveal answer" }));
  await userEvent.click(await screen.findByRole("button", { name: /^Good/ }));
  await userEvent.click(await screen.findByRole("button", { name: "Next card" }));
  expect(await screen.findByText("2 / 2")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Browser back" }));
  expect(await screen.findByText("1 / 2")).toBeInTheDocument();
  expect(screen.getByText("Your review is saved.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Reveal answer" })).not.toBeInTheDocument();
});
