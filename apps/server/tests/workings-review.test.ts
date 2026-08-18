import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

let app: FastifyInstance;
beforeEach(async () => {
  ({ app } = await createApp({ dbPath: ":memory:", migrate: true }));
});
afterEach(async () => {
  await app.close();
});

function reviewEnvelope(requestId: string, payload: unknown) {
  return {
    protocolVersion: "0.2",
    operation: "workings_review",
    requestId,
    generatedAt: "2026-08-17T05:00:00.000Z",
    payload,
  };
}

async function lessonId(): Promise<string> {
  const response = await app.inject({ method: "GET", url: "/api/lessons/current" });
  return response.json().lesson.id as string;
}

async function saveWorkings(id: string): Promise<void> {
  const response = await app.inject({
    method: "PUT",
    url: `/api/notebook/${id}`,
    payload: {
      pageType: "graph",
      note: "I divided the voltage by the resistance.",
      strokes: [
        {
          id: "calculation",
          width: 3,
          points: [
            { x: 0.1, y: 0.2 },
            { x: 0.3, y: 0.35 },
          ],
        },
      ],
    },
  });
  expect(response.statusCode).toBe(200);
}

async function preparePacket(id: string, mode = "coach") {
  return app.inject({
    method: "POST",
    url: "/api/tutor/workings/packets",
    payload: {
      lessonId: id,
      reviewQuestion: "Check my calculation and point out the first important mistake.",
      mode,
    },
  });
}

describe("workings review companion", () => {
  it("requires saved workings before preparing a review", async () => {
    const response = await preparePacket(await lessonId());
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("NOTEBOOK_EMPTY");
  });

  it("creates a learner-safe packet with an image attachment instruction", async () => {
    const id = await lessonId();
    await saveWorkings(id);
    const response = await preparePacket(id);
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.operation).toBe("workings_review");
    expect(body.expectedFilename).toBe(`discere-${id}-workings.png`);
    expect(body.text).toContain("Review the image attached by the learner");
    expect(body.text).toContain(`discere-${id}-workings.png`);
    expect(body.text).toContain("firstMeaningfulError");
    expect(body.text).not.toContain('"answerAuthority"');
  });

  it("keeps workings review unavailable in Exam mode", async () => {
    const id = await lessonId();
    await saveWorkings(id);
    const response = await preparePacket(id, "exam");
    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("EXAM_GUARDRAIL");
  });

  it("accepts a grounded guided review without exposing the final answer", async () => {
    const id = await lessonId();
    await saveWorkings(id);
    const packet = await preparePacket(id);
    const requestId = packet.json().requestId as string;
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/workings/import",
      payload: {
        lessonId: id,
        mode: "coach",
        expectedRequestId: requestId,
        text: JSON.stringify(
          reviewEnvelope(requestId, {
            imageReviewed: true,
            transcription: "I = 5 / 100, followed by 0.5 A.",
            transcriptionConfidence: 0.94,
            assessment: "incorrect",
            feedback:
              "The formula is applied to the supplied values. The decimal written after the division does not match that calculation.",
            firstMeaningfulError: "The decimal result after the division is shifted one place.",
            nextStep: "Repeat the division and check the place value before converting the unit.",
            sourceIds: [],
            uncertainty: [],
          }),
        ),
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().accepted).toBe(true);
    expect(response.json().review.assessment).toBe("incorrect");
  });

  it("rejects guided feedback that exposes the active final answer", async () => {
    const id = await lessonId();
    await saveWorkings(id);
    const packet = await preparePacket(id);
    const requestId = packet.json().requestId as string;
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/workings/import",
      payload: {
        lessonId: id,
        mode: "coach",
        expectedRequestId: requestId,
        text: JSON.stringify(
          reviewEnvelope(requestId, {
            imageReviewed: true,
            transcription: "I = 5 / 100.",
            transcriptionConfidence: 0.98,
            assessment: "partly_correct",
            feedback: "The correct result is 0.05 A.",
            firstMeaningfulError: "The written result is incomplete.",
            nextStep: "Write the current with its unit.",
            sourceIds: [],
            uncertainty: [],
          }),
        ),
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().accepted).toBe(false);
    expect(
      response.json().issues.some((issue: { code: string }) => issue.code.startsWith("ANS")),
    ).toBe(true);
  });

  it("rejects an overconfident assessment when the image was not usable", async () => {
    const id = await lessonId();
    await saveWorkings(id);
    const packet = await preparePacket(id, "direct");
    const requestId = packet.json().requestId as string;
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/workings/import",
      payload: {
        lessonId: id,
        mode: "direct",
        expectedRequestId: requestId,
        text: JSON.stringify(
          reviewEnvelope(requestId, {
            imageReviewed: false,
            transcription: "",
            transcriptionConfidence: 0.2,
            assessment: "correct",
            feedback: "The calculation appears correct.",
            firstMeaningfulError: null,
            nextStep: "Attach a readable image for a reliable review.",
            sourceIds: [],
            uncertainty: ["No readable image was attached."],
          }),
        ),
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().accepted).toBe(false);
    expect(response.json().issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "IMAGE_NOT_REVIEWED" }),
        expect.objectContaining({ code: "LOW_CONFIDENCE_OVERCLAIM" }),
      ]),
    );
  });

  it("rejects a response from a different review request", async () => {
    const id = await lessonId();
    await saveWorkings(id);
    const packet = await preparePacket(id, "direct");
    const requestId = packet.json().requestId as string;
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/workings/import",
      payload: {
        lessonId: id,
        mode: "direct",
        expectedRequestId: requestId,
        text: JSON.stringify(
          reviewEnvelope("2eaf080b-794b-4af1-a2bf-3380f791c952", {
            imageReviewed: true,
            transcription: "I = 5 / 100.",
            transcriptionConfidence: 0.9,
            assessment: "correct",
            feedback: "The method is consistent with the circuit values.",
            firstMeaningfulError: null,
            nextStep: "Try the same method with another resistance.",
            sourceIds: [],
            uncertainty: [],
          }),
        ),
      },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("COMPANION_REQUEST_MISMATCH");
  });
});

describe("generated workings review", () => {
  /** A one-pixel PNG. Real bytes, so the signature check is exercised rather than mocked. */
  const PNG_BASE64 = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001",
    "hex",
  ).toString("base64");

  async function reviewWith(
    payload: Record<string, unknown>,
    options: { provider?: "mock" | "companion"; skipSave?: boolean } = {},
  ) {
    await app.close();
    ({ app } = await createApp({
      dbPath: ":memory:",
      migrate: true,
      tutor: { providerId: options.provider ?? "mock" },
    }));
    const id = await lessonId();
    if (options.skipSave !== true) await saveWorkings(id);
    return app.inject({
      method: "POST",
      url: "/api/tutor/workings/review",
      payload: {
        lessonId: id,
        reviewQuestion: "Have I set this calculation up correctly?",
        mode: "coach",
        image: { filename: `discere-${id}-workings.png`, base64: PNG_BASE64 },
        ...payload,
      },
    });
  }

  it("returns a validated review from a provider that can see the image", async () => {
    const response = await reviewWith({});
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("answered");
    expect(body.provider).toBe("mock");
    expect(body.accepted).toBe(true);
    // The provider only claims to have read an image because one really was attached.
    expect(body.review.imageReviewed).toBe(true);
    expect(body.review.transcription.length).toBeGreaterThan(0);
    expect(body.review.firstMeaningfulError).not.toBeNull();
  });

  it("refuses a review of an empty page", async () => {
    const response = await reviewWith({}, { skipSave: true });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("NOTEBOOK_EMPTY");
  });

  it("refuses an attachment that is not a PNG", async () => {
    const response = await reviewWith({
      image: { filename: "workings.png", base64: Buffer.from("not a png").toString("base64") },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("IMAGE_NOT_PNG");
  });

  it("keeps the review closed in Exam mode", async () => {
    const response = await reviewWith({ mode: "exam" });
    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("EXAM_GUARDRAIL");
  });

  it("hands back the packet when the provider cannot look at an image", async () => {
    const response = await reviewWith({}, { provider: "companion" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("packet_required");
    expect(body.expectedFilename).toMatch(/-workings\.png$/);
    expect(body.packet.text).toContain("workings_review");
  });
});
