import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

let app: FastifyInstance;
beforeEach(async () => { ({ app } = await createApp({ dbPath: ":memory:", migrate: true })); });
afterEach(async () => { await app.close(); });

describe("notebook API", () => {
  it("returns an empty page and persists saved workings", async () => {
    const lessonResponse = await app.inject({ method: "GET", url: "/api/lessons/current" });
    const lessonId = lessonResponse.json().lesson.id as string;

    const empty = await app.inject({ method: "GET", url: `/api/notebook/${lessonId}` });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toMatchObject({ lessonId, pageType: "blank", strokes: [], note: "", updatedAt: null });

    const payload = {
      pageType: "graph",
      note: "I divided five volts by one hundred ohms.",
      strokes: [
        {
          id: "stroke-one",
          width: 3,
          points: [
            { x: 0.1, y: 0.2 },
            { x: 0.25, y: 0.35, pressure: 0.5 },
          ],
        },
      ],
    };
    const saved = await app.inject({ method: "PUT", url: `/api/notebook/${lessonId}`, payload });
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({ lessonId, ...payload });
    expect(saved.json().updatedAt).toEqual(expect.any(String));

    const reloaded = await app.inject({ method: "GET", url: `/api/notebook/${lessonId}` });
    expect(reloaded.statusCode).toBe(200);
    expect(reloaded.json()).toEqual(saved.json());
  });

  it("rejects notebook pages for unknown lessons", async () => {
    const response = await app.inject({ method: "GET", url: "/api/notebook/missing-lesson" });
    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe("LESSON_NOT_FOUND");
  });
});
