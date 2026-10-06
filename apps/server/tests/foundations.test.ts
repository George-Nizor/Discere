import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
let app: FastifyInstance;
beforeEach(async () => {
  ({ app } = await createApp({
    dbPath: ":memory:",
    migrate: true,
    revealDelayMs: 0,
    tutor: { providerId: "companion" },
  }));
});
afterEach(async () => {
  await app.close();
});
const lessonId = "what-a-letter-stands-for";
async function open(mode = "coach") {
  return (
    await app.inject({ method: "POST", url: "/api/review/sessions", payload: { lessonId, mode } })
  ).json();
}
async function respond(id: string, response: string) {
  return app.inject({
    method: "POST",
    url: `/api/review/sessions/${id}/respond`,
    payload: { response },
  });
}
async function reveal(id: string) {
  return app.inject({ method: "POST", url: `/api/review/sessions/${id}/reveal`, payload: {} });
}
async function rate(id: string) {
  return app.inject({
    method: "POST",
    url: `/api/review/sessions/${id}/rate`,
    payload: { rating: "easy", recalled: true },
  });
}
describe("foundation lessons and recall", () => {
  it("rejects completion claims without recorded question and recall evidence", async () => {
    const save = (suffix: string) =>
      app.inject({
        method: "PUT",
        url: `/api/courses/maths-foundations/lessons/${lessonId}/progress`,
        payload: { stageId: `${lessonId}:${suffix}`, state: "completed", interactionState: {} },
      });
    expect((await save("explainer")).statusCode).toBe(409);
    expect((await save("quiz-1")).statusCode).toBe(409);
    expect((await save("review")).statusCode).toBe(409);
    expect((await save("completion")).statusCode).toBe(409);
  });
  it("binds coaching and pasted replies to a question inside the requested lesson", async () => {
    const body = {
      lessonId,
      questionId: "maths-what-a-letter-stands-for-order",
      question: "How should I substitute an input?",
      mode: "coach",
    };
    const packet = await app.inject({ method: "POST", url: "/api/tutor/ask", payload: body });
    expect(packet.statusCode).toBe(200);
    expect(packet.json().packet.text).toContain("If x = 6, what comes out?");
    expect(packet.body).not.toContain("answerAuthority");
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/tutor/ask",
          payload: { ...body, questionId: "maths-from-equation-to-line-1" },
        })
      ).statusCode,
    ).toBe(409);
    const envelope = {
      protocolVersion: "0.2",
      operation: "tutor_reply",
      requestId: packet.json().requestId,
      generatedAt: new Date().toISOString(),
      payload: {
        answer: "The final value is 14.",
        followUpQuestion: "Which input did you use?",
        sourceIds: [],
        uncertainty: [],
      },
    };
    const imported = await app.inject({
      method: "POST",
      url: "/api/tutor/companion/import",
      payload: {
        text: JSON.stringify(envelope),
        lessonId,
        questionId: body.questionId,
        mode: "coach",
        expectedRequestId: envelope.requestId,
      },
    });
    expect(imported.statusCode).toBe(200);
    expect(imported.json().accepted).toBe(false);
  });
  it("records accepted coaching before a response as assisted evidence", async () => {
    const questionId = "maths-what-a-letter-stands-for-order";
    const requestId = "8dd34e9e-3c12-4fa5-a6e5-43f7f4e1af38";
    const envelope = {
      protocolVersion: "0.2",
      operation: "tutor_reply",
      requestId,
      generatedAt: new Date().toISOString(),
      payload: {
        answer: "Replace the letter with the given input, then apply the addition.",
        followUpQuestion: "Which input are you testing?",
        sourceIds: [],
        uncertainty: [],
      },
    };
    const imported = await app.inject({
      method: "POST",
      url: "/api/tutor/companion/import",
      payload: {
        text: JSON.stringify(envelope),
        lessonId,
        questionId,
        mode: "coach",
        expectedRequestId: requestId,
      },
    });
    expect(imported.json().accepted).toBe(true);
    const answered = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: { questionId, mode: "coach", response: "14" },
    });
    expect(answered.json().correct).toBe(true);
    expect(answered.json().independent).toBe(false);
  });
  it("serves mathematical teaching cases without any marking authority", async () => {
    const result = await app.inject({
      method: "GET",
      url: `/api/courses/maths-foundations/lessons/${lessonId}/journey`,
    });
    expect(result.statusCode).toBe(200);
    expect(result.body).not.toContain("answerAuthority");
    expect(result.body).not.toContain("workedAnswer");
    expect(result.body).not.toContain("acceptedIdeas");
    const machine = result
      .json()
      .stages[0].steps.find((step: { diagram?: { type: string } }) => step.diagram);
    expect(machine.diagram.type).toBe("number_machine");
    expect(machine.question.expectedUnit).toBe("");
    // The v2 opener reaches the learner with its hook question, keyless.
    expect(result.json().stages[0].intro.hook.question.prompt).toBe("What's my number?");
    expect(result.body).not.toMatch(/onCorrect|misconceptions/);
    expect(result.json().stages.map((stage: { type: string }) => stage.type)).toEqual([
      "explainer",
      "quiz",
      "quiz",
      "quiz",
      "review",
      "recap",
      "completion",
    ]);
    expect((await app.inject({ method: "GET", url: `/api/lessons/current` })).statusCode).toBe(200);
  });
  it("marks equivalent fractions exactly and preserves signs in equation choices", async () => {
    const submit = (questionId: string, response: string) =>
      app.inject({
        method: "POST",
        url: "/api/attempts",
        payload: { questionId, response, mode: "coach" },
      });
    expect(
      (await submit("maths-undoing-in-the-right-order-practice-2", "3/4")).json().correct,
    ).toBe(true);
    expect(
      (await submit("maths-undoing-in-the-right-order-practice-2", "0.76")).json().correct,
    ).toBe(false);
    expect((await submit("maths-from-equation-to-line-3", "y = 2x + 2")).json().correct).toBe(
      false,
    );
    expect((await submit("maths-from-equation-to-line-3", "y = 2x - 2")).json().correct).toBe(true);
  });
  it("opens only a card authored for the current lesson", async () => {
    const session = await open();
    expect(session.card.cardId).toBe("maths-what-a-letter-stands-for-card-1");
    expect(JSON.stringify(session)).not.toContain("answerAuthority");
    expect(session.card.back).toBeUndefined();
    const wrongCard = await app.inject({
      method: "POST",
      url: "/api/review/sessions",
      payload: { lessonId, cardId: "card-ohms-law" },
    });
    expect(wrongCard.statusCode).toBe(404);
  });
  it.each(["blank", "incorrect", "direct"])(
    "keeps %s recall assisted even when rated Easy",
    async (caseName) => {
      const session = await open(caseName === "direct" ? "direct" : "coach");
      if (caseName !== "blank")
        await respond(session.sessionId, caseName === "incorrect" ? "99" : "-5");
      await reveal(session.sessionId);
      expect((await rate(session.sessionId)).json().evidence).toBe("assisted");
      expect((await respond(session.sessionId, "-5")).statusCode).toBe(409);
    },
  );
  it("records the first response, preserves it across reads, and closes early Exam reveal", async () => {
    const session = await open("exam");
    expect((await reveal(session.sessionId)).statusCode).toBe(409);
    expect((await respond(session.sessionId, "-5")).json().correct).toBe(true);
    expect((await respond(session.sessionId, "99")).statusCode).toBe(409);
    const resumed = (
      await app.inject({ method: "GET", url: `/api/review/sessions/${session.sessionId}` })
    ).json();
    expect(resumed.response).toBe("-5");
    expect(resumed.card.back).toBeUndefined();
    await reveal(session.sessionId);
    expect((await rate(session.sessionId)).json().evidence).toBe("independent");
    expect((await rate(session.sessionId)).statusCode).toBe(409);
  });
});
