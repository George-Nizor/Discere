import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

let app: FastifyInstance;
beforeEach(async () => { ({ app } = await createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0 })); });
afterEach(async () => { await app.close(); });

describe("answer reveal integrity", () => {
  it("closes the original attempt after the worked answer is shown", async () => {
    const attempt = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: { questionId: "calculate-current-5v-100ohm", response: "1 A", mode: "direct" },
    });
    const attemptId = attempt.json().attemptId as string;
    const reason = { reason: "I checked the formula and cannot find the mistake." };
    const firstStart = await app.inject({ method: "POST", url: `/api/attempts/${attemptId}/reveal/start`, payload: reason });
    const secondStart = await app.inject({ method: "POST", url: `/api/attempts/${attemptId}/reveal/start`, payload: reason });
    const firstToken = firstStart.json().token as string;
    const secondToken = secondStart.json().token as string;

    const confirm = await app.inject({
      method: "POST",
      url: `/api/attempts/${attemptId}/reveal/confirm`,
      payload: { token: firstToken, confirmation: "show answer" },
    });
    expect(confirm.statusCode).toBe(200);

    const hint = await app.inject({ method: "POST", url: `/api/attempts/${attemptId}/hints` });
    expect(hint.statusCode).toBe(409);
    expect(hint.json().code).toBe("ANSWER_ALREADY_REVEALED");

    const resubmit = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: { attemptId, questionId: "calculate-current-5v-100ohm", response: "0.05 A", mode: "direct" },
    });
    expect(resubmit.statusCode).toBe(409);
    expect(resubmit.json().code).toBe("ANSWER_ALREADY_REVEALED");

    const restart = await app.inject({ method: "POST", url: `/api/attempts/${attemptId}/reveal/start`, payload: reason });
    expect(restart.statusCode).toBe(409);
    expect(restart.json().code).toBe("ANSWER_ALREADY_REVEALED");

    const secondConfirm = await app.inject({
      method: "POST",
      url: `/api/attempts/${attemptId}/reveal/confirm`,
      payload: { token: secondToken, confirmation: "show answer" },
    });
    expect(secondConfirm.statusCode).toBe(409);
    expect(secondConfirm.json().code).toBe("ANSWER_ALREADY_REVEALED");
  });
});
