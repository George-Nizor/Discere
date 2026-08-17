import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

let app: FastifyInstance;
beforeEach(async () => { ({ app } = await createApp({ dbPath: ":memory:" })); });
afterEach(async () => { await app.close(); });

function tutorEnvelope(payload: unknown) {
  return {
    protocolVersion: "0.2",
    operation: "tutor_reply",
    requestId: "b3428b5b-07b2-4ab4-840f-c1d723c714b2",
    generatedAt: "2026-08-17T04:00:00.000Z",
    payload,
  };
}

describe("ChatGPT tutor companion", () => {
  it("creates a self-describing learner-safe tutor packet", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/companion/packets",
      payload: {
        operation: "tutor_reply",
        payload: { question: "Why does current fall when resistance rises?", mode: "coach" },
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.operation).toBe("tutor_reply");
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(body.text).toContain("Return payload with this exact shape");
    expect(body.text).toContain("Why does current fall when resistance rises?");
    expect(body.text).toContain("do not state the final answer");
    expect(body.text).not.toContain('"answerAuthority"');
  });

  it("blocks companion assistance in Exam mode", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/companion/packets",
      payload: {
        operation: "tutor_reply",
        payload: { question: "Give me a hint.", mode: "exam" },
      },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("EXAM_GUARDRAIL");
  });

  it("accepts a grounded reply that respects Coach mode", async () => {
    const lesson = (await app.inject({ method: "GET", url: "/api/lessons/current" })).json();
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/companion/import",
      payload: {
        mode: "coach",
        text: JSON.stringify(tutorEnvelope({
          answer: "Use I = V / R. Put the supplied voltage above the resistance and carry the current unit through the calculation.",
          followUpQuestion: "Which two supplied values belong in the division?",
          sourceIds: [lesson.sources[0].id],
          uncertainty: [],
        })),
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().accepted).toBe(true);
    expect(response.json().reply.answer).toContain("I = V / R");
  });

  it("rejects final-answer leakage in guided modes", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/companion/import",
      payload: {
        mode: "coach",
        text: JSON.stringify(tutorEnvelope({
          answer: "The current is 0.05 A.",
          followUpQuestion: "Can you substitute the values yourself?",
          sourceIds: [],
          uncertainty: [],
        })),
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().accepted).toBe(false);
    expect(response.json().issues.some((issue: { code: string }) => issue.code.startsWith("ANS"))).toBe(true);
  });

  it("allows the final answer in Direct mode while retaining prose checks", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/companion/import",
      payload: {
        mode: "direct",
        text: JSON.stringify(tutorEnvelope({
          answer: "The current is 0.05 A because 5 V divided by 100 Ω equals 0.05 A.",
          followUpQuestion: "What current would a 200 Ω resistor draw at the same voltage?",
          sourceIds: [],
          uncertainty: [],
        })),
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().accepted).toBe(true);
  });

  it("rejects source identifiers that were not supplied with the lesson", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/companion/import",
      payload: {
        mode: "direct",
        text: JSON.stringify(tutorEnvelope({
          answer: "Resistance opposes current in this circuit model.",
          followUpQuestion: "What should happen when resistance doubles?",
          sourceIds: ["invented-source"],
          uncertainty: [],
        })),
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().accepted).toBe(false);
    expect(response.json().issues).toContainEqual(expect.objectContaining({ code: "SOURCE_NOT_ALLOWED" }));
  });
});
