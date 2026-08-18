import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";

const FAKE_CODEX = fileURLToPath(
  new URL("../../../packages/tutor-providers/tests/fixtures/fake-codex.mjs", import.meta.url),
);
const ESSAY_ID = "current-in-one-loop:teach-back";
const ESSAY_TEXT =
  "Voltage provides the push, resistance limits current, and Ohm's law relates them. With five volts and one hundred ohms, the current is fifty milliamps.";

const CLEAN_REPLY = {
  answer:
    "Use I = V / R. Put the supplied voltage above the resistance and carry the current unit through the calculation.",
  followUpQuestion: "Which two supplied values belong in the division?",
  sourceIds: [],
  uncertainty: [],
};

const CLEAN_ASSESSMENT = {
  assessment: "partly_correct",
  summary:
    "Your teach-back states the relationship between voltage and current, and it stops before describing how resistance limits the flow.",
  firstMeaningfulError: "The explanation treats resistance as a source of current.",
  nextStep: "Add one sentence describing what happens to current when the resistance doubles.",
  sourceIds: [],
  uncertainty: [],
};

let app: FastifyInstance;
let store: DiscereStore;
let workspace: string;

function useFakeCodex(responses: unknown[]): void {
  process.env["DISCERE_CODEX_BIN"] = FAKE_CODEX;
  process.env["FAKE_CODEX_RESPONSES"] = JSON.stringify(responses);
  process.env["FAKE_CODEX_STATE"] = path.join(workspace, "state");
  process.env["FAKE_CODEX_LOG"] = path.join(workspace, "log.jsonl");
  process.env["DISCERE_CODEX_SCRATCH"] = path.join(workspace, "scratch");
}

async function startApp(providerId: "codex" | "companion" | "mock"): Promise<void> {
  ({ app, store } = await createApp({
    dbPath: ":memory:",
    migrate: true,
    tutor: { providerId, assessTimeoutMs: 5_000, askTimeoutMs: 5_000 },
  }));
}

async function submitEssay(): Promise<void> {
  await app.inject({
    method: "PUT",
    url: `/api/essays/${encodeURIComponent(ESSAY_ID)}`,
    payload: { content: ESSAY_TEXT },
  });
  const submitted = await app.inject({
    method: "POST",
    url: `/api/essays/${encodeURIComponent(ESSAY_ID)}/submit`,
    payload: { content: ESSAY_TEXT },
  });
  expect(submitted.statusCode).toBe(200);
}

async function pollAssessment(): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await app.inject({
      method: "GET",
      url: `/api/essays/${encodeURIComponent(ESSAY_ID)}/assessment`,
    });
    const body = response.json() as Record<string, unknown>;
    if (body["status"] !== "pending") return body;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("The assessment never left the pending state.");
}

beforeEach(() => {
  workspace = mkdtempSync(path.join(tmpdir(), "discere-server-codex-"));
});

afterEach(async () => {
  await app?.close();
  rmSync(workspace, { recursive: true, force: true });
  for (const key of [
    "DISCERE_CODEX_BIN",
    "DISCERE_CODEX_SCRATCH",
    "FAKE_CODEX_RESPONSES",
    "FAKE_CODEX_STATE",
    "FAKE_CODEX_LOG",
  ]) {
    delete process.env[key];
  }
});

describe("direct tutor generation", () => {
  it("answers in place and reports the session for a follow-up turn", async () => {
    useFakeCodex([{ output: CLEAN_REPLY }]);
    await startApp("codex");

    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/ask",
      payload: {
        lessonId: "current-in-one-loop",
        mode: "coach",
        question: "Why does current fall when resistance rises?",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("answered");
    expect(body.provider).toBe("codex");
    expect(body.accepted).toBe(true);
    expect(body.reply.answer).toContain("I = V / R");
    expect(body.sessionId).toBe("11111111-2222-4333-8444-555555555555");
  });

  it("rejects a generated reply that leaks the hidden answer in Coach mode", async () => {
    const leak = { ...CLEAN_REPLY, answer: "The current is 0.05 A, so the loop carries 0.05 A." };
    // The style pass is given the same leaking text back, so the repair cannot succeed.
    useFakeCodex([
      { output: leak },
      {
        output: {
          revisedText: leak.answer,
          edits: [],
          unrepaired: ["ANS001_FINAL_ANSWER_IN_HINT"],
          protectedItemsChecked: [],
        },
      },
    ]);
    await startApp("codex");

    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/ask",
      payload: {
        lessonId: "current-in-one-loop",
        mode: "coach",
        question: "What is the answer?",
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json().code).toBe("TUTOR_WRITING_GATE");
    expect(response.body).not.toContain("0.05");
  });

  it("runs the generated reply through the companion source allowlist", async () => {
    useFakeCodex([{ output: { ...CLEAN_REPLY, sourceIds: ["invented-source"] } }]);
    await startApp("codex");

    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/ask",
      payload: {
        lessonId: "current-in-one-loop",
        mode: "coach",
        question: "Where does this come from?",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().accepted).toBe(false);
    expect(response.json().issues).toContainEqual(
      expect.objectContaining({ code: "SOURCE_NOT_ALLOWED" }),
    );
  });

  it("records the exchange as assistance against an open attempt", async () => {
    useFakeCodex([{ output: CLEAN_REPLY }]);
    await startApp("codex");

    const attempt = await app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: { questionId: "calculate-current-5v-100ohm", response: "3 A", mode: "coach" },
    });
    expect(attempt.statusCode).toBe(200);
    const attemptId = attempt.json().attemptId as string;

    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/ask",
      payload: {
        lessonId: "current-in-one-loop",
        mode: "coach",
        question: "Why is my value wrong?",
        attemptId,
      },
    });
    expect(response.statusCode).toBe(200);

    const events = store.database
      .prepare("SELECT type, detail FROM assistance_events WHERE attempt_id = ?")
      .all(attemptId) as Array<{ type: string; detail: string }>;
    expect(events).toContainEqual({ type: "tutor_reply", detail: "coach:accepted" });
  });

  it("refuses direct generation in Exam mode", async () => {
    useFakeCodex([{ output: CLEAN_REPLY }]);
    await startApp("codex");
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/ask",
      payload: { lessonId: "current-in-one-loop", mode: "exam", question: "Give me the answer." },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("EXAM_GUARDRAIL");
  });

  it("reports a provider timeout instead of showing an unchecked reply", async () => {
    useFakeCodex([{ sleepMs: 10_000, output: CLEAN_REPLY }]);
    ({ app, store } = await createApp({
      dbPath: ":memory:",
      migrate: true,
      tutor: { providerId: "codex", askTimeoutMs: 300 },
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/ask",
      payload: { lessonId: "current-in-one-loop", mode: "coach", question: "Are you there?" },
    });
    expect(response.statusCode).toBe(504);
    expect(response.json().code).toBe("TUTOR_PROVIDER_TIMEOUT");
  });

  it("returns the copy/paste packet when the companion provider is configured", async () => {
    await startApp("companion");
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/ask",
      payload: {
        lessonId: "current-in-one-loop",
        mode: "coach",
        question: "Why does current fall when resistance rises?",
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("packet_required");
    expect(body.packet.text).toContain("Why does current fall when resistance rises?");
    expect(body.packet.text).not.toContain('"answerAuthority"');
  });

  it("answers from a fixture when the mock provider is configured", async () => {
    await startApp("mock");
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/ask",
      payload: { lessonId: "current-in-one-loop", mode: "coach", question: "How do I start?" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("answered");
    expect(response.json().accepted).toBe(true);
  });
});

describe("essay assessment", () => {
  it("returns immediately and completes the assessment in the background", async () => {
    useFakeCodex([{ output: CLEAN_ASSESSMENT }]);
    await startApp("codex");
    await submitEssay();

    const started = await app.inject({
      method: "POST",
      url: `/api/essays/${encodeURIComponent(ESSAY_ID)}/assess`,
      payload: {},
    });
    expect(started.statusCode).toBe(200);
    expect(started.json().status).toBe("pending");
    expect(started.json().assessment).toBeNull();

    const finished = await pollAssessment();
    expect(finished["status"]).toBe("ready");
    expect(finished["accepted"]).toBe(true);
    expect(finished["assessment"]).toMatchObject({ assessment: "partly_correct" });
  });

  it("records a failed generation rather than inventing an assessment", async () => {
    useFakeCodex([{ exitCode: 2, skipOutputFile: true }]);
    await startApp("codex");
    await submitEssay();

    await app.inject({
      method: "POST",
      url: `/api/essays/${encodeURIComponent(ESSAY_ID)}/assess`,
      payload: {},
    });
    const finished = await pollAssessment();
    expect(finished["status"]).toBe("failed");
    expect(finished["assessment"]).toBeNull();
    expect(finished["error"]).toMatchObject({ code: "PROVIDER_EXITED" });
  });

  it("refuses to assess a teach-back that has not been submitted", async () => {
    useFakeCodex([{ output: CLEAN_ASSESSMENT }]);
    await startApp("codex");
    const response = await app.inject({
      method: "POST",
      url: `/api/essays/${encodeURIComponent(ESSAY_ID)}/assess`,
      payload: {},
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("ESSAY_NOT_SUBMITTED");
  });

  it("hands back a packet when the companion provider is configured", async () => {
    await startApp("companion");
    await submitEssay();
    const response = await app.inject({
      method: "POST",
      url: `/api/essays/${encodeURIComponent(ESSAY_ID)}/assess`,
      payload: {},
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("packet_required");
    expect(response.json().packet.text).toContain("Assess the learner's submitted teach-back.");
  });

  it("assesses from a fixture when the mock provider is configured", async () => {
    await startApp("mock");
    await submitEssay();
    const started = await app.inject({
      method: "POST",
      url: `/api/essays/${encodeURIComponent(ESSAY_ID)}/assess`,
      payload: {},
    });
    expect(started.statusCode).toBe(200);
    const finished = await pollAssessment();
    expect(finished["status"]).toBe("ready");
    expect(finished["accepted"]).toBe(true);
  });

  it("reports that no assessment has been requested yet", async () => {
    await startApp("mock");
    const response = await app.inject({
      method: "GET",
      url: `/api/essays/${encodeURIComponent(ESSAY_ID)}/assessment`,
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe("ESSAY_ASSESSMENT_NOT_FOUND");
  });
});
