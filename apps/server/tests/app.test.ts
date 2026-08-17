import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";

let app: FastifyInstance;
let store: DiscereStore;
beforeEach(async () => { ({ app, store } = await createApp({ dbPath: ":memory:", revealDelayMs: 0 })); });
afterEach(async () => { await app.close(); });

describe("Discere API", () => {
  it("returns a visual-first current lesson without the answer authority", async () => {
    const response = await app.inject({ method: "GET", url: "/api/lessons/current" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.lesson.visualBrief.visualClass).toBe("deterministic_diagram");
    expect(body.question.answerAuthority).toBeUndefined();
  });

  it("renders the calculated circuit", async () => {
    const response = await app.inject({ method: "GET", url: "/api/visuals/circuit.svg?voltage=5&resistance=100" });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("0.05 A");
  });

  it("honours an explicit false query value", async () => {
    const response = await app.inject({ method: "GET", url: "/api/visuals/circuit.svg?voltage=5&resistance=100&values=false" });
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain('class="current"');
  });

  it("rejects generated-sounding negative parallelism", async () => {
    const response = await app.inject({ method: "POST", url: "/api/writing/lint", payload: { text: "This is not a formula; it is a powerful way of thinking.", context: "lesson" } });
    expect(response.statusCode).toBe(200);
    expect(response.json().passed).toBe(false);
  });

  it("assesses a free numeric response", async () => {
    const response = await app.inject({ method: "POST", url: "/api/attempts", payload: { questionId: "calculate-current-5v-100ohm", response: "50 mA", mode: "coach" } });
    expect(response.statusCode).toBe(200);
    expect(response.json().correct).toBe(true);
  });

  it("rejects adversarial extra fields on learner attempt payloads", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: {
        questionId: "calculate-current-5v-100ohm",
        response: "50 mA",
        mode: "coach",
        answerAuthority: { value: 0.05, unit: "A" },
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("VALIDATION_ERROR");
  });

  it("records direct-mode evidence as assisted", async () => {
    const response = await app.inject({ method: "POST", url: "/api/attempts", payload: { questionId: "calculate-current-5v-100ohm", response: "50 mA", mode: "direct" } });
    expect(response.statusCode).toBe(200);
    expect(response.json().correct).toBe(true);
    expect(response.json().independent).toBe(false);
  });

  it("keeps completed attempts immutable and closes assistance", async () => {
    const first = await app.inject({ method: "POST", url: "/api/attempts", payload: { questionId: "calculate-current-5v-100ohm", response: "50 mA", mode: "coach" } });
    const attemptId = first.json().attemptId as string;

    const overwrite = await app.inject({ method: "POST", url: "/api/attempts", payload: { attemptId, questionId: "calculate-current-5v-100ohm", response: "1 A", mode: "coach" } });
    expect(overwrite.statusCode).toBe(409);
    expect(overwrite.json().code).toBe("ATTEMPT_COMPLETE");

    const hint = await app.inject({ method: "POST", url: `/api/attempts/${attemptId}/hints` });
    expect(hint.statusCode).toBe(409);
    expect(hint.json().code).toBe("ATTEMPT_COMPLETE");
    expect(store.getAttempt(attemptId)?.correct).toBe(true);
  });

  it("updates each concept from its own mastery baseline", async () => {
    store.database
      .prepare("UPDATE concept_progress SET mastery = 0.8 WHERE user_id = 'local-user' AND concept_id = 'current'")
      .run();
    const response = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: {
        questionId: "calculate-current-5v-100ohm",
        response: "0.05 A",
        mode: "coach",
      },
    });
    expect(response.statusCode).toBe(200);
    const progress = Object.fromEntries(
      store.getProgress().map((item) => [item.conceptId, item.mastery]),
    );
    const currentMastery = progress["current"] ?? 0;
    const resistanceMastery = progress["resistance"] ?? 0;
    expect(currentMastery).toBeGreaterThan(resistanceMastery);
    expect(response.json().mastery).toBeCloseTo(resistanceMastery, 8);
  });

  it("keeps the tutoring mode fixed for the life of an attempt", async () => {
    const attempt = await app.inject({ method: "POST", url: "/api/attempts", payload: { questionId: "calculate-current-5v-100ohm", response: "1 A", mode: "coach" } });
    const response = await app.inject({ method: "POST", url: "/api/attempts", payload: { attemptId: attempt.json().attemptId, questionId: "calculate-current-5v-100ohm", response: "1 A", mode: "direct" } });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("ATTEMPT_MODE_LOCKED");
  });

  it("enforces exam mode hint and reveal guardrails", async () => {
    const attempt = await app.inject({ method: "POST", url: "/api/attempts", payload: { questionId: "calculate-current-5v-100ohm", response: "1 A", mode: "exam" } });
    const attemptId = attempt.json().attemptId as string;
    const hint = await app.inject({ method: "POST", url: `/api/attempts/${attemptId}/hints` });
    expect(hint.statusCode).toBe(403);
    const reveal = await app.inject({ method: "POST", url: `/api/attempts/${attemptId}/reveal/start`, payload: { reason: "I have checked my working and remain stuck." } });
    expect(reveal.statusCode).toBe(403);
  });

  it("requires a reason and confirmation before revealing an answer", async () => {
    const attempt = await app.inject({ method: "POST", url: "/api/attempts", payload: { questionId: "calculate-current-5v-100ohm", response: "1 A", mode: "direct" } });
    const attemptId = attempt.json().attemptId as string;
    const start = await app.inject({ method: "POST", url: `/api/attempts/${attemptId}/reveal/start`, payload: { reason: "I checked the formula and cannot find the mistake." } });
    expect(start.statusCode).toBe(200);
    const token = start.json().token as string;
    const confirm = await app.inject({ method: "POST", url: `/api/attempts/${attemptId}/reveal/confirm`, payload: { token, confirmation: "show answer" } });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json().answer).toContain("0.05 A");
    expect(confirm.json().transferPrompt).toContain("6 V");
    const repeated = await app.inject({ method: "POST", url: `/api/attempts/${attemptId}/reveal/confirm`, payload: { token, confirmation: "show answer" } });
    expect(repeated.statusCode).toBe(409);
  });
});
