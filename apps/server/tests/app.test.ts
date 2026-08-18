import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";

let app: FastifyInstance;
let store: DiscereStore;
beforeEach(async () => { ({ app, store } = await createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0 })); });
afterEach(async () => { await app.close(); });

describe("Discere API", () => {
  it("serves a learner-safe routed journey with separate stages", async () => {
    const response = await app.inject({ method: "GET", url: "/api/courses/electronics-foundations/lessons/current-in-one-loop/journey" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.stageOrder).toHaveLength(6);
    expect(body.stages.map((stage: { type: string }) => stage.type)).toEqual([
      "explainer",
      "interactive_visual",
      "quiz",
      "essay",
      "review",
      "completion",
    ]);
    expect(body.stages.find((stage: { type: string }) => stage.type === "quiz").question.answerAuthority).toBeUndefined();
  });

  it("persists journey stage progress and restores the next active stage", async () => {
    const update = await app.inject({
      method: "PUT",
      url: "/api/courses/electronics-foundations/lessons/current-in-one-loop/progress",
      payload: { stageId: "current-in-one-loop:explainer", state: "completed", interactionState: { readAloud: false } },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().activeStageId).toBe("current-in-one-loop:visual");
    const restored = await app.inject({ method: "GET", url: "/api/courses/electronics-foundations/lessons/current-in-one-loop/progress" });
    expect(restored.statusCode).toBe(200);
    expect(restored.json().activeStageId).toBe("current-in-one-loop:visual");
  });

  it("autosaves and submits a teach-back without exposing rubric authority", async () => {
    const essayId = "current-in-one-loop:teach-back";
    const content = "Voltage provides the push, resistance limits current, and Ohm's law relates them. With five volts and one hundred ohms, the current is fifty milliamps.";
    const save = await app.inject({ method: "PUT", url: `/api/essays/${encodeURIComponent(essayId)}`, payload: { content } });
    expect(save.statusCode).toBe(200);
    expect(save.json().content).toBe(content);
    expect(save.json().submitted).toBe(false);
    const submit = await app.inject({ method: "POST", url: `/api/essays/${encodeURIComponent(essayId)}/submit`, payload: { content } });
    expect(submit.statusCode).toBe(200);
    expect(submit.json().submitted).toBe(true);
    expect(submit.json().rubric).toBeUndefined();
    const restored = await app.inject({ method: "GET", url: `/api/essays/${encodeURIComponent(essayId)}` });
    expect(restored.json().submitted).toBe(true);
  });

  it("accepts a teach-back whose prose trips the writing gate and returns advisory notes", async () => {
    const essayId = "current-in-one-loop:teach-back";
    // The learner's wording uses a construction the gate rejects in generated prose.
    const content =
      "This is not a rule; it is a relationship. Current is voltage divided by resistance, so five volts across one hundred ohms gives fifty milliamps in the loop.";
    const submit = await app.inject({
      method: "POST",
      url: `/api/essays/${encodeURIComponent(essayId)}/submit`,
      payload: { content },
    });
    expect(submit.statusCode).toBe(200);
    expect(submit.json().submitted).toBe(true);
    expect(submit.json().styleNotes.length).toBeGreaterThan(0);
  });

  it("keeps review backs behind a reveal and records independent evidence", async () => {
    const session = await app.inject({ method: "POST", url: "/api/review/sessions", payload: {} });
    expect(session.statusCode).toBe(200);
    const sessionBody = session.json();
    expect(sessionBody.card.back).toBeUndefined();
    const revealed = await app.inject({ method: "POST", url: `/api/review/sessions/${sessionBody.sessionId}/reveal`, payload: {} });
    expect(revealed.statusCode).toBe(200);
    expect(revealed.json().back).toContain("0.05 A");
    const rated = await app.inject({ method: "POST", url: `/api/review/sessions/${sessionBody.sessionId}/rate`, payload: { rating: "good", recalled: true } });
    expect(rated.statusCode).toBe(200);
    expect(rated.json().evidence).toBe("independent");
    const repeated = await app.inject({ method: "POST", url: `/api/review/sessions/${sessionBody.sessionId}/rate`, payload: { rating: "easy", recalled: true } });
    expect(repeated.statusCode).toBe(409);
  });

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
