import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

let app: FastifyInstance;
beforeEach(async () => {
  ({ app } = await createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0 }));
});
afterEach(async () => {
  await app.close();
});

async function open(lessonId: string, cardId: string, mode: "coach" | "exam" = "coach") {
  const opened = await app.inject({
    method: "POST",
    url: "/api/review/sessions",
    payload: { lessonId, cardId, mode },
  });
  expect(opened.statusCode).toBe(200);
  return opened.json();
}

describe("worded review cards", () => {
  it("self-rates a card that asks for an explanation instead of keyword-marking it", async () => {
    // "both sides are equivalent" is right and contains no "equal"; nothing types it in now.
    const session = await open(
      "what-a-letter-stands-for",
      "maths-what-a-letter-stands-for-card-2",
      "exam",
    );
    expect(session.card.recall).toBe("self");
    expect(session.card.back).toBeUndefined();
    const typed = await app.inject({
      method: "POST",
      url: `/api/review/sessions/${session.sessionId}/respond`,
      payload: { response: "both sides are equivalent" },
    });
    expect(typed.statusCode).toBe(409);
    // Exam mode still reveals: there is no typed answer to wait for.
    const revealed = await app.inject({
      method: "POST",
      url: `/api/review/sessions/${session.sessionId}/reveal`,
      payload: {},
    });
    expect(revealed.statusCode).toBe(200);
    expect(revealed.json().back).toMatch(/equal/);
    const rated = await app.inject({
      method: "POST",
      url: `/api/review/sessions/${session.sessionId}/rate`,
      // The client's claim is ignored; the route decides from the card.
      payload: { rating: "good", recalled: false },
    });
    expect(rated.statusCode).toBe(200);
    expect(rated.json().evidence).toBe("independent");
  });

  it("keeps a naming card and a numeric card typed and marked", async () => {
    const numeric = await open("what-a-letter-stands-for", "maths-what-a-letter-stands-for-card-1");
    expect(numeric.card.recall).toBe("typed");
    const marked = await app.inject({
      method: "POST",
      url: `/api/review/sessions/${numeric.sessionId}/respond`,
      payload: { response: "-5" },
    });
    expect(marked.json().correct).toBe(true);
  });
});
