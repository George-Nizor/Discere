import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";

let app: FastifyInstance;
let store: DiscereStore;
beforeEach(async () => {
  ({ app, store } = await createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0 }));
});
afterEach(async () => {
  await app.close();
});

it("sends every source of a course with the course detail", async () => {
  const response = await app.inject({ method: "GET", url: "/api/courses/maths-foundations" });
  expect(response.statusCode).toBe(200);
  const sources = response.json().sources as Array<{ id: string; title: string; url: string }>;
  expect(sources.length).toBeGreaterThan(0);
  expect(sources[0]).toMatchObject({ title: expect.any(String), url: expect.stringMatching(/^https?:/u) });
  expect(new Set(sources.map((source) => source.id)).size).toBe(sources.length);
});

it("sends a lesson the sources it and its questions cite, once each", async () => {
  const detail = (await app.inject({ method: "GET", url: "/api/courses/maths-foundations" })).json();
  const all = new Set((detail.sources as Array<{ id: string }>).map((source) => source.id));
  const lessonId = detail.lessons[0].id as string;
  const journey = (
    await app.inject({ method: "GET", url: `/api/courses/maths-foundations/lessons/${lessonId}/journey` })
  ).json();
  const ids = (journey.sources as Array<{ id: string }>).map((source) => source.id);
  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(all.has(id)).toBe(true);
});
