import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { clearTutorSignInFailure, tutorCapability } from "../src/capabilities.js";
import { matchCriteria } from "../src/companion.js";
import type { DiscereStore } from "../src/db/store.js";

const FAKE_CODEX = fileURLToPath(
  new URL("../../../packages/tutor-providers/tests/fixtures/fake-codex.mjs", import.meta.url),
);
const ESSAY_ID = "ohms-law-teach-back";
const ESSAY_URL = `/api/essays/${encodeURIComponent(ESSAY_ID)}`;
const PROGRESS_URL = "/api/courses/electronics-foundations/lessons/current-in-one-loop/progress";
const ESSAY_STAGE = "current-in-one-loop:essay";
const FIRST =
  "Voltage provides the push, resistance limits current, and Ohm's law relates them. With five volts and one hundred ohms, the current is fifty milliamps.";
const SECOND = `${FIRST} Doubling the resistance to two hundred ohms halves the current to twenty-five milliamps.`;

const VERDICT = {
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
  // A stored login, so the CLI reads as installed and signed in before any request is made.
  const home = path.join(workspace, "codex-home");
  mkdirSync(home, { recursive: true });
  writeFileSync(path.join(home, "auth.json"), "{}", "utf8");
  process.env["CODEX_HOME"] = home;
}

async function startApp(providerId: "codex" | "mock"): Promise<void> {
  ({ app, store } = await createApp({
    dbPath: ":memory:",
    migrate: true,
    tutor: { providerId, assessTimeoutMs: 5_000, askTimeoutMs: 5_000 },
  }));
}

async function post(url: string, payload: unknown = {}) {
  return app.inject({ method: "POST", url, payload: payload as Record<string, unknown> });
}

async function submit(content: string): Promise<void> {
  const response = await post(`${ESSAY_URL}/submit`, { content });
  expect(response.statusCode).toBe(200);
}

async function assessed(): Promise<Record<string, any>> {
  await post(`${ESSAY_URL}/assess`);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const response = await app.inject({ method: "GET", url: `${ESSAY_URL}/assessment` });
    const body = response.json() as Record<string, any>;
    if (body["status"] !== "pending") return body;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("The assessment never left the pending state.");
}

async function taskCriteria(): Promise<string[]> {
  const journey = await app.inject({
    method: "GET",
    url: "/api/courses/electronics-foundations/lessons/current-in-one-loop/journey",
  });
  const stage = (journey.json().stages as Array<Record<string, any>>).find(
    (entry) => entry["id"] === ESSAY_STAGE,
  );
  return stage?.["successCriteria"] as string[];
}

function prompts(): string[] {
  return readFileSync(path.join(workspace, "log.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { prompt?: string })
    .flatMap((entry) => (entry.prompt ? [entry.prompt] : []));
}

beforeEach(() => {
  workspace = mkdtempSync(path.join(tmpdir(), "discere-essay-revision-"));
  clearTutorSignInFailure();
});

afterEach(async () => {
  await app?.close();
  rmSync(workspace, { recursive: true, force: true });
  clearTutorSignInFailure();
  for (const key of [
    "DISCERE_CODEX_BIN",
    "DISCERE_CODEX_SCRATCH",
    "FAKE_CODEX_RESPONSES",
    "FAKE_CODEX_STATE",
    "FAKE_CODEX_LOG",
    "CODEX_HOME",
  ]) {
    delete process.env[key];
  }
});

describe("revising a writing task", () => {
  it("keeps the submitted version and its assessment, and assesses the revision as version 2", async () => {
    await startApp("mock");
    await submit(FIRST);
    const first = await assessed();
    expect(first["status"]).toBe("ready");
    expect(first["version"]).toBe(1);

    const revised = await post(`${ESSAY_URL}/revise`);
    expect(revised.statusCode).toBe(200);
    expect(revised.json()).toMatchObject({ submitted: false, content: FIRST, version: 2 });
    expect(revised.json().earlierVersions).toEqual([
      expect.objectContaining({ version: 1, assessed: true }),
    ]);
    // The new version has no assessment yet, and its text can be edited again.
    expect((await app.inject({ method: "GET", url: `${ESSAY_URL}/assessment` })).statusCode).toBe(
      404,
    );
    const saved = await app.inject({ method: "PUT", url: ESSAY_URL, payload: { content: SECOND } });
    expect(saved.json().content).toBe(SECOND);

    await submit(SECOND);
    const second = await assessed();
    expect(second["status"]).toBe("ready");
    expect(second["version"]).toBe(2);
    expect(second["requestId"]).not.toBe(first["requestId"]);

    const earlier = await app.inject({ method: "GET", url: `${ESSAY_URL}/versions/1` });
    expect(earlier.statusCode).toBe(200);
    expect(earlier.json()).toMatchObject({
      version: 1,
      content: FIRST,
      assessment: { status: "ready", requestId: first["requestId"], version: 1 },
    });
    expect(earlier.json().assessment.assessment.summary).toBe(first["assessment"].summary);
    expect((await app.inject({ method: "GET", url: `${ESSAY_URL}/versions/2` })).statusCode).toBe(
      404,
    );

    // A second revision appends and leaves version 1 as it was.
    await post(`${ESSAY_URL}/revise`);
    const rows = store.listEssayVersions(ESSAY_ID);
    expect(rows.map((row) => [row.version, row.content])).toEqual([
      [1, FIRST],
      [2, SECOND],
    ]);
    expect(rows[0]?.assessment?.requestId).toBe(first["requestId"]);
  });

  it("keeps a version that was submitted with no assessment", async () => {
    await startApp("mock");
    await submit(FIRST);
    const revised = await post(`${ESSAY_URL}/revise`);
    expect(revised.json().earlierVersions).toEqual([
      expect.objectContaining({ version: 1, assessed: false }),
    ]);
    const earlier = await app.inject({ method: "GET", url: `${ESSAY_URL}/versions/1` });
    expect(earlier.json()).toMatchObject({ content: FIRST, assessment: null });
  });

  it("refuses to revise writing that has not been submitted", async () => {
    await startApp("mock");
    const response = await post(`${ESSAY_URL}/revise`);
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("ESSAY_NOT_SUBMITTED");
  });

  it("refuses to revise while the tutor is still reading the version", async () => {
    useFakeCodex([{ output: VERDICT, sleepMs: 600 }]);
    await startApp("codex");
    await submit(FIRST);
    await post(`${ESSAY_URL}/assess`);
    const response = await post(`${ESSAY_URL}/revise`);
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("ESSAY_ASSESSMENT_PENDING");
    expect(store.listEssayVersions(ESSAY_ID)).toEqual([]);
  });

  it("does not replace an assessment a version already has", async () => {
    await startApp("mock");
    await submit(FIRST);
    const first = await assessed();
    const again = await post(`${ESSAY_URL}/assess`);
    expect(again.json()).toMatchObject({ status: "ready", requestId: first["requestId"] });
  });

  it("gives the tutor the previous version and its feedback when assessing a revision", async () => {
    const criteria = await (async () => {
      useFakeCodex([{ output: VERDICT }]);
      await startApp("codex");
      return taskCriteria();
    })();
    await submit(FIRST);
    await assessed();
    await post(`${ESSAY_URL}/revise`);
    await submit(SECOND);
    const second = await assessed();
    expect(second["status"]).toBe("ready");

    const [firstPrompt, secondPrompt] = prompts();
    expect(firstPrompt).not.toContain('"previousVersion"');
    expect(secondPrompt).toContain('"previousVersion"');
    expect(secondPrompt).toContain("This is a revision.");
    // The earlier text, and the problem it was told about, both reach the tutor.
    expect(secondPrompt).toContain(JSON.stringify(FIRST));
    expect(secondPrompt).toContain(VERDICT.firstMeaningfulError);
    expect(secondPrompt).toContain(JSON.stringify(SECOND));
    expect(criteria.length).toBeGreaterThan(0);
  });
});

describe("a result for each criterion", () => {
  it("stores one result per criterion in the task's wording and order", async () => {
    useFakeCodex([{ output: VERDICT }]);
    await startApp("codex");
    const criteria = await taskCriteria();
    await app.close();
    // The reply lists them in reverse and in different case, as a model might.
    const replied = criteria
      .map((criterion, index) => ({
        criterion: criterion.toUpperCase(),
        result: index === 0 ? "met" : "not_met",
        evidence: index === 0 ? "“Ohm's law relates them”" : "The writing does not do this.",
      }))
      .reverse();
    useFakeCodex([{ output: { ...VERDICT, criteria: replied } }]);
    await startApp("codex");
    await submit(FIRST);
    const finished = await assessed();
    expect(finished["status"]).toBe("ready");
    expect(finished["accepted"]).toBe(true);
    expect(finished["issues"]).toEqual([]);
    expect(finished["assessment"].criteria.map((entry: any) => entry.criterion)).toEqual(criteria);
    expect(finished["assessment"].criteria[0]).toMatchObject({
      result: "met",
      evidence: "“Ohm's law relates them”",
    });
    // The provider is asked for the list through its output schema and the prompt.
    const log = JSON.parse(
      readFileSync(path.join(workspace, "log.jsonl"), "utf8").split("\n")[0] ?? "{}",
    ) as { schema: { required: string[] }; prompt: string };
    expect(log.schema.required).toContain("criteria");
    expect(log.prompt).toContain("Return one entry in criteria for every item in successCriteria");
  });

  it("falls back to the overall verdict when the reply has no criteria", async () => {
    useFakeCodex([{ output: VERDICT }]);
    await startApp("codex");
    await submit(FIRST);
    const finished = await assessed();
    expect(finished["status"]).toBe("ready");
    expect(finished["accepted"]).toBe(true);
    expect(finished["assessment"].criteria).toBeUndefined();
    expect(finished["assessment"].summary).toBe(VERDICT.summary);
    expect(finished["issues"]).toEqual([
      expect.objectContaining({ code: "CRITERIA_NOT_MATCHED", severity: "warning" }),
    ]);
  });

  it("falls back when the criteria do not match the task's list or are malformed", async () => {
    useFakeCodex([
      {
        output: {
          ...VERDICT,
          criteria: [{ criterion: "Something the task never asked", result: "met", evidence: "x" }],
        },
      },
      { output: { ...VERDICT, criteria: [{ criterion: "A", result: "excellent" }] } },
    ]);
    await startApp("codex");
    await submit(FIRST);
    const mismatched = await assessed();
    expect(mismatched["status"]).toBe("ready");
    expect(mismatched["assessment"].criteria).toBeUndefined();

    await post(`${ESSAY_URL}/revise`);
    await submit(SECOND);
    const malformed = await assessed();
    expect(malformed["status"]).toBe("ready");
    expect(malformed["assessment"].criteria).toBeUndefined();
  });

  it("produces a result for every criterion from the mock provider", async () => {
    await startApp("mock");
    const criteria = await taskCriteria();
    await submit(FIRST);
    const finished = await assessed();
    expect(finished["issues"]).toEqual([]);
    expect(finished["assessment"].criteria.map((entry: any) => entry.criterion)).toEqual(criteria);
    expect(finished["assessment"].criteria[0].result).toBe("met");
  });

  it("matches reworded criteria by position only when there is one result for each", () => {
    const task = ["Names the relationship.", "Uses the equation."];
    expect(
      matchCriteria(
        [
          { criterion: "names the relationship", result: "met", evidence: "a" },
          { criterion: "Equation used", result: "not_met", evidence: "b" },
        ],
        task,
      ),
    ).toEqual([
      { criterion: task[0], result: "met", evidence: "a" },
      { criterion: task[1], result: "not_met", evidence: "b" },
    ]);
    expect(matchCriteria([{ criterion: task[0] ?? "", result: "met", evidence: "a" }], task)).toBe(
      null,
    );
    expect(matchCriteria(undefined, task)).toBe(null);
  });
});

describe("a skipped task that is later submitted", () => {
  it("is recorded as done", async () => {
    await startApp("mock");
    const skipped = await app.inject({
      method: "PUT",
      url: PROGRESS_URL,
      payload: { stageId: ESSAY_STAGE, state: "skipped_optional" },
    });
    expect(skipped.statusCode).toBe(200);
    await submit(FIRST);
    const progress = await app.inject({ method: "GET", url: PROGRESS_URL });
    const stage = (progress.json().stages as Array<{ stageId: string; state: string }>).find(
      (entry) => entry.stageId === ESSAY_STAGE,
    );
    expect(stage?.state).toBe("completed");
    // A later skip does not undo it.
    await app.inject({
      method: "PUT",
      url: PROGRESS_URL,
      payload: { stageId: ESSAY_STAGE, state: "skipped_optional" },
    });
    const after = await app.inject({ method: "GET", url: PROGRESS_URL });
    expect(
      (after.json().stages as Array<{ stageId: string; state: string }>).find(
        (entry) => entry.stageId === ESSAY_STAGE,
      )?.state,
    ).toBe("completed");
  });
});

describe("a tutor whose sign-in has expired", () => {
  it("names sign-in in the failed assessment and reports the tutor as unavailable afterwards", async () => {
    useFakeCodex([
      { exitCode: 1, skipOutputFile: true, stderr: "ERROR: 401 Unauthorized: token expired" },
    ]);
    await startApp("codex");
    await submit(FIRST);
    const finished = await assessed();
    expect(finished["status"]).toBe("failed");
    expect(finished["error"].message).toContain("sign-in has probably expired");

    // The capability is read with the CLI itself reported as installed and signed in, which is
    // what a stored login with an expired session looks like.
    const ready = { binaryFound: true, authPresent: true };
    const tutor = tutorCapability("codex", ready);
    expect(tutor.state).toBe("unavailable");
    expect(tutor.reason).toContain("sign-in has expired");
    // The memory lapses, so a later request is allowed to try again.
    expect(tutorCapability("codex", ready, Date.now() + 6 * 60_000).state).toBe("available");
  });

  it("reads as available again once a request succeeds", async () => {
    useFakeCodex([
      { exitCode: 1, skipOutputFile: true, stderr: "ERROR: 401 Unauthorized: token expired" },
    ]);
    await startApp("codex");
    await submit(FIRST);
    expect((await assessed())["status"]).toBe("failed");
    const ready = { binaryFound: true, authPresent: true };
    expect(tutorCapability("codex", ready).state).toBe("unavailable");
    // The owner signs in again, and the next request goes through.
    process.env["FAKE_CODEX_RESPONSES"] = JSON.stringify([{ output: VERDICT }]);
    expect((await assessed())["status"]).toBe("ready");
    expect(tutorCapability("codex", ready).state).toBe("available");
  });

  it("does not blame sign-in for an ordinary failure", async () => {
    useFakeCodex([{ exitCode: 2, skipOutputFile: true }]);
    await startApp("codex");
    await submit(FIRST);
    const finished = await assessed();
    expect(finished["status"]).toBe("failed");
    expect(finished["error"].message).not.toContain("sign-in");
  });
});
