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
  ({ app, store } = await createApp({
    dbPath: ":memory:",
    migrate: true,
    revealDelayMs: 0,
  }));
});
afterEach(async () => {
  await app.close();
});
const attempt = (questionId: string, response: string, attemptId?: string) =>
  app.inject({
    method: "POST",
    url: "/api/attempts",
    payload: {
      questionId,
      response,
      mode: "coach",
      ...(attemptId ? { attemptId } : {}),
    },
  });
const feedback = (attemptId: string, stepId?: string) =>
  app.inject({
    method: "POST",
    url: `/api/attempts/${attemptId}/lesson-feedback`,
    payload: {
      courseId: course,
      lessonId: lesson,
      ...(stepId ? { stepId } : {}),
    },
  });

describe("v2 lesson routes", () => {
  it("names a predictable slip without revealing the answer, then allows a retry", async () => {
    const first = (await attempt(q("order"), "6")).json();
    expect(first).toMatchObject({
      correct: false,
      specific: true,
      qualifying: true,
    });
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
    const right = (await attempt(q("minus"), "8")).json();
    const response = (await feedback(right.attemptId, "subtracting-2x")).json();
    expect(response.onCorrect).toBe(
      "The 2x is 2 × 6, which is 12, and 20 − 12 is 8. Subtraction comes after multiplication in the same way that addition does.",
    );
    // The reveal that follows a predict step is served with the feedback.
    const predicted = (
      await attempt(
        q("working-backwards"),
        "Start from 2014 and undo the two steps in the opposite order.",
      )
    ).json();
    const reveal = (await feedback(predicted.attemptId, "working-backwards")).json();
    expect(reveal.blocks[0].text).toContain("working backwards from 2014");
    expect(store.getAttempt(right.attemptId)).toMatchObject({
      answerRevealed: false,
    });
  });

  it("marks the right choice on a reveal and records it as assistance", async () => {
    const wrong = (await attempt(q("both-sides"), "x = 3")).json();
    const response = (await feedback(wrong.attemptId, "the-letter-on-both-sides")).json();
    expect(response.correctChoiceId).toBe("b");
    expect(store.getAttempt(wrong.attemptId)).toMatchObject({
      answerRevealed: true,
    });
  });

  it("accepts lesson feedback for a faded blank, the hook step and a skill check", async () => {
    // This lesson has no faded blank; its worked example's self-explain question is the nearest
    // line-level question, and it is resolved through the same worked-line lookup.
    const line = (
      await attempt(
        q("why-multiply-first"),
        "Multiplication is done before addition, whichever is written first.",
      )
    ).json();
    expect((await feedback(line.attemptId, "evaluating-2-plus-3x")).statusCode).toBe(200);
    // A real faded blank, from another maths lesson.
    const blankLesson = "keeping-the-balance";
    const blank = (await attempt("maths-keeping-the-balance-2", "6")).json();
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/attempts/${blank.attemptId}/lesson-feedback`,
          payload: {
            courseId: course,
            lessonId: blankLesson,
            stepId: "your-turn-with-help",
          },
        })
      ).statusCode,
    ).toBe(200);
    // The opener's hook is asked on a screen of its own.
    const hook = (await attempt(q("machine"), "6")).json();
    expect((await feedback(hook.attemptId, "opener")).statusCode).toBe(200);
    const check = (await attempt(q("check-1"), "14")).json();
    expect((await feedback(check.attemptId)).statusCode).toBe(200);
    // A question from another step is refused.
    expect((await feedback(hook.attemptId, "the-value-of-5x")).statusCode).toBe(409);
  });

  it("serves the close with card fronts only, and keeps reveals out of the lesson payload", async () => {
    const journey = (
      await app.inject({
        method: "GET",
        url: `/api/courses/${course}/lessons/${lesson}/journey`,
      })
    ).json();
    const close = journey.stages.find((stage: { type: string }) => stage.type === "recap");
    expect(close.keyIdea).toMatch(/^A letter in an equation stands for one number/u);
    expect(close.cardFronts).toEqual([
      "For x = −2, what is 4x + 3?",
      "What must be true after substituting a solution into an equation?",
    ]);
    expect(JSON.stringify(close)).not.toContain("−5");
    const legacy = await app.inject({
      method: "GET",
      url: "/api/lessons/current",
    });
    expect(legacy.json().lesson.id).toBe(lesson);
    expect(legacy.body).not.toContain("keeps that order");
    expect(legacy.body).not.toMatch(/onCorrect|misconceptions/);
  });
});
