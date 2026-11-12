import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { ASSESSMENT_INTERRUPTED_CODE } from "../src/tutor-routes.js";

const ESSAY_ID = "ohms-law-teach-back";
const ESSAY_URL = `/api/essays/${encodeURIComponent(ESSAY_ID)}`;
const ESSAY_TEXT =
  "Voltage provides the push, resistance limits current, and Ohm's law relates them. With five volts and one hundred ohms, the current is fifty milliamps.";

let directory: string;
let app: FastifyInstance | undefined;

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "discere-essay-restart-"));
});
afterEach(async () => {
  await app?.close();
  app = undefined;
  rmSync(directory, { recursive: true, force: true });
});

it("lets the learner ask again after the server stopped during an assessment", async () => {
  const dbPath = path.join(directory, "discere.sqlite");
  const first = await createApp({ dbPath, migrate: true, tutor: { providerId: "mock" } });
  app = first.app;
  await app.inject({ method: "PUT", url: ESSAY_URL, payload: { content: ESSAY_TEXT } });
  const submitted = await app.inject({
    method: "POST",
    url: `${ESSAY_URL}/submit`,
    payload: { content: ESSAY_TEXT },
  });
  expect(submitted.statusCode).toBe(200);
  // The row a killed server leaves behind: the request was accepted and nothing finished it.
  first.store.saveEssayAssessment({
    essayId: ESSAY_ID,
    requestId: "request-from-the-killed-process",
    status: "pending",
    provider: "mock",
    accepted: false,
    assessmentJson: null,
    issuesJson: "[]",
    errorCode: null,
    errorMessage: null,
  });
  await app.close();

  const second = await createApp({ dbPath, tutor: { providerId: "mock" } });
  app = second.app;
  const stale = await app.inject({ url: `${ESSAY_URL}/assessment` });
  expect(stale.json().status).toBe("failed");
  expect(stale.json().error.code).toBe(ASSESSMENT_INTERRUPTED_CODE);
  expect(stale.json().error.message).toContain("Ask for it again");

  const retried = await app.inject({ method: "POST", url: `${ESSAY_URL}/assess`, payload: {} });
  expect(retried.statusCode).toBe(200);
  expect(retried.json().requestId).not.toBe("request-from-the-killed-process");
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const body = (await app.inject({ url: `${ESSAY_URL}/assessment` })).json();
    if (body.status !== "pending") {
      expect(body.status).toBe("ready");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("The new assessment never left the pending state.");
});
