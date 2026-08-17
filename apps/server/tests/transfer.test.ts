import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";

let app: FastifyInstance;
let store: DiscereStore;
beforeEach(async () => {
  ({ app, store } = await createApp({ dbPath: ":memory:", revealDelayMs: 0 }));
});
afterEach(async () => {
  await app.close();
});

async function createAttempt(): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/api/attempts",
    payload: {
      questionId: "calculate-current-5v-100ohm",
      response: "1 A",
      mode: "direct",
    },
  });
  expect(response.statusCode).toBe(200);
  return response.json().attemptId as string;
}

async function revealAnswer(attemptId: string): Promise<void> {
  const start = await app.inject({
    method: "POST",
    url: `/api/attempts/${attemptId}/reveal/start`,
    payload: { reason: "I checked the formula and cannot find the mistake." },
  });
  expect(start.statusCode).toBe(200);
  const confirm = await app.inject({
    method: "POST",
    url: `/api/attempts/${attemptId}/reveal/confirm`,
    payload: { token: start.json().token, confirmation: "show answer" },
  });
  expect(confirm.statusCode).toBe(200);
}

describe("transfer challenge", () => {
  it("stays locked until the worked answer is revealed", async () => {
    const attemptId = await createAttempt();
    const response = await app.inject({
      method: "GET",
      url: `/api/attempts/${attemptId}/transfer`,
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("TRANSFER_LOCKED");
  });

  it("returns a deterministic challenge after answer reveal", async () => {
    const attemptId = await createAttempt();
    await revealAnswer(attemptId);
    const response = await app.inject({
      method: "GET",
      url: `/api/attempts/${attemptId}/transfer`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      challenge: {
        id: "transfer-current-6v-200ohm",
        responseType: "numeric",
        expectedUnit: "A",
      },
      completed: false,
      lastCorrect: null,
      feedback: null,
    });
    expect(response.json().challenge.prompt).toContain("6 V");
    expect(response.json().challenge.prompt).toContain("200 Ω");
  });

  it("allows retries and awards recovery evidence once", async () => {
    const attemptId = await createAttempt();
    await revealAnswer(attemptId);
    const xpBefore = store.getProfile().xp;
    const masteryBefore = store.getMastery("current");

    const incorrect = await app.inject({
      method: "POST",
      url: `/api/attempts/${attemptId}/transfer`,
      payload: {
        transferId: "transfer-current-6v-200ohm",
        response: "0.3 A",
      },
    });
    expect(incorrect.statusCode).toBe(200);
    expect(incorrect.json()).toMatchObject({
      correct: false,
      xpAwarded: 0,
      completed: false,
    });
    expect(store.getProfile().xp).toBe(xpBefore);
    expect(store.getMastery("current")).toBe(masteryBefore);

    const correct = await app.inject({
      method: "POST",
      url: `/api/attempts/${attemptId}/transfer`,
      payload: {
        transferId: "transfer-current-6v-200ohm",
        response: "30 mA",
      },
    });
    expect(correct.statusCode).toBe(200);
    expect(correct.json().correct).toBe(true);
    expect(correct.json().completed).toBe(true);
    expect(correct.json().xpAwarded).toBeGreaterThan(0);
    expect(correct.json().mastery).toBeGreaterThan(masteryBefore);
    expect(store.getProfile().xp).toBe(xpBefore + correct.json().xpAwarded);

    const progress = Object.fromEntries(
      store.getProgress().map((item) => [item.conceptId, item]),
    );
    expect(progress["current"]?.assistedAttempts).toBe(1);
    expect(progress["resistance"]?.assistedAttempts).toBe(1);

    const repeated = await app.inject({
      method: "POST",
      url: `/api/attempts/${attemptId}/transfer`,
      payload: {
        transferId: "transfer-current-6v-200ohm",
        response: "0.03 A",
      },
    });
    expect(repeated.statusCode).toBe(409);
    expect(repeated.json().code).toBe("TRANSFER_COMPLETE");
  });

  it("rejects a transfer identifier from another challenge", async () => {
    const attemptId = await createAttempt();
    await revealAnswer(attemptId);
    const response = await app.inject({
      method: "POST",
      url: `/api/attempts/${attemptId}/transfer`,
      payload: {
        transferId: "different-transfer",
        response: "0.03 A",
      },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("TRANSFER_MISMATCH");
  });
});
