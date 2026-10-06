import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";

const course = "maths-foundations";
const lesson = "what-a-letter-stands-for";
const q = (suffix: string) => `maths-${lesson}-${suffix}`;
let app: FastifyInstance;
let store: DiscereStore;
beforeEach(async () => {
  ({ app, store } = await createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0 }));
});
afterEach(async () => {
  await app.close();
});
const attempt = (questionId: string, response: string, attemptId?: string) =>
  app.inject({
    method: "POST",
    url: "/api/attempts",
    payload: { questionId, response, mode: "coach", ...(attemptId ? { attemptId } : {}) },
  });
const feedback = (attemptId: string, stepId?: string) =>
  app.inject({
    method: "POST",
    url: `/api/attempts/${attemptId}/lesson-feedback`,
    payload: { courseId: course, lessonId: lesson, ...(stepId ? { stepId } : {}) },
  });

describe("v2 lesson routes", () => {
  it("names a predictable slip without revealing the answer, then allows a retry", async () => {
    const first = (await attempt(q("order"), "6")).json();
    expect(first).toMatchObject({ correct: false, specific: true, qualifying: true });
    expect(first.feedback).toContain("You subtracted first");
    expect(first.feedback).not.toMatch(/\b14\b/u);
    // A miss does not close the attempt: the learner may try again on the same attempt.
    const retry = (await attempt(q("order"), "14", first.attemptId)).json();
    expect(retry.correct).toBe(true);
    expect(retry.independent).toBe(true);
  });

  it("does not count an unreadable answer as a qualifying response", async () => {
    expect((await attempt(q("order"), "fourteen")).json().qualifying).toBe(false);
  });

  it("explains a correct answer with its onCorrect line and records no assistance", async () => {
    const right = (await attempt(q("order"), "14")).json();
    const response = (await feedback(right.attemptId, "order-matters")).json();
    expect(response.onCorrect).toBe(
      "14. Multiply first, then subtract: the order is written into the expression.",
    );
    expect(response.blocks[0].text).toContain("keeps that order");
    expect(store.getAttempt(right.attemptId)).toMatchObject({ answerRevealed: false });
  });

  it("marks the right choice on a reveal and records it as assistance", async () => {
    const wrong = (await attempt(q("notation"), "5x = 12")).json();
    const response = (await feedback(wrong.attemptId, "a-name-for-the-number")).json();
    expect(response.correctChoiceId).toBe("a");
    expect(store.getAttempt(wrong.attemptId)).toMatchObject({ answerRevealed: true });
  });

  it("accepts lesson feedback for a faded blank, the opener's hook and a skill check", async () => {
    const blank = (await attempt(q("left-side"), "9")).json();
    expect((await feedback(blank.attemptId, "testing-a-candidate")).statusCode).toBe(200);
    const hook = (await attempt(q("hook"), "7")).json();
    expect((await feedback(hook.attemptId, "opener")).statusCode).toBe(200);
    const check = (await attempt(q("check-1"), "14")).json();
    expect((await feedback(check.attemptId)).statusCode).toBe(200);
    // A question from another step is refused.
    expect((await feedback(hook.attemptId, "order-matters")).statusCode).toBe(409);
  });

  it("serves the close with card fronts only, and keeps reveals out of the lesson payload", async () => {
    const journey = (
      await app.inject({ method: "GET", url: `/api/courses/${course}/lessons/${lesson}/journey` })
    ).json();
    const close = journey.stages.find((stage: { type: string }) => stage.type === "recap");
    expect(close.keyIdea).toMatch(/^A letter stands for a number/u);
    expect(close.cardFronts).toEqual([
      "For x = −2, what is 4x + 3?",
      "What must be true after substituting a solution into an equation?",
    ]);
    expect(JSON.stringify(close)).not.toContain("−5");
    const legacy = await app.inject({ method: "GET", url: "/api/lessons/current" });
    expect(legacy.json().lesson.id).toBe(lesson);
    expect(legacy.body).not.toContain("keeps that order");
    expect(legacy.body).not.toMatch(/onCorrect|misconceptions/);
  });
});
