import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TutorReplyDraftSchema } from "@discere/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { CodexTutorProvider, TutorProviderError } from "../src/index.js";

const FAKE_CODEX = fileURLToPath(new URL("./fixtures/fake-codex.mjs", import.meta.url));

const CLEAN_REPLY = {
  answer:
    "Use I = V / R. Put the supplied voltage above the resistance and carry the current unit through the calculation.",
  followUpQuestion: "Which two supplied values belong in the division?",
  sourceIds: [],
  uncertainty: [],
};

const FLAWED_REPLY = {
  ...CLEAN_REPLY,
  answer: "A resistor not only limits current, but also releases heat.",
};

let workspace: string;

function environment(responses: unknown[], extra: Record<string, string> = {}): void {
  process.env["FAKE_CODEX_RESPONSES"] = JSON.stringify(responses);
  process.env["FAKE_CODEX_STATE"] = path.join(workspace, "state");
  process.env["FAKE_CODEX_LOG"] = path.join(workspace, "log.jsonl");
  for (const [key, value] of Object.entries(extra)) process.env[key] = value;
}

function logEntries(): Array<Record<string, unknown>> {
  try {
    return readFileSync(path.join(workspace, "log.jsonl"), "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  } catch {
    return [];
  }
}

function invocations(): Array<Record<string, unknown>> {
  return logEntries().filter((entry) => "args" in entry);
}

function provider(overrides: Record<string, unknown> = {}): CodexTutorProvider {
  return new CodexTutorProvider({
    binary: FAKE_CODEX,
    scratchDirectory: path.join(workspace, "scratch"),
    killGraceMs: 200,
    ...overrides,
  });
}

const REQUEST = {
  operation: "tutor_reply" as const,
  requestId: "b3428b5b-07b2-4ab4-840f-c1d723c714b2",
  payload: { learnerQuestion: "Why does current fall when resistance rises?" },
};

const REPLY_OPTIONS = {
  outputSchema: z.toJSONSchema(TutorReplyDraftSchema),
  parsePayload: (value: unknown) => TutorReplyDraftSchema.parse(value),
  lintTargets: [
    { path: "answer", context: "feedback" as const },
    { path: "followUpQuestion", context: "question" as const },
  ],
};

beforeEach(() => {
  workspace = mkdtempSync(path.join(tmpdir(), "discere-codex-"));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
  for (const key of [
    "FAKE_CODEX_RESPONSES",
    "FAKE_CODEX_STATE",
    "FAKE_CODEX_LOG",
    "FAKE_CODEX_SESSION_ID",
  ]) {
    delete process.env[key];
  }
});

describe("Codex tutor provider", () => {
  it("returns a schema-constrained reply and the session id", async () => {
    environment([{ output: CLEAN_REPLY }]);
    const response = await provider().generate(REQUEST, REPLY_OPTIONS);

    expect(response.payload).toEqual(CLEAN_REPLY);
    expect(response.requestId).toBe(REQUEST.requestId);
    expect(response.sessionId).toBe("11111111-2222-4333-8444-555555555555");

    const [first] = invocations();
    expect(first?.["args"]).toEqual(
      expect.arrayContaining(["exec", "--skip-git-repo-check", "-s", "read-only", "--json", "-"]),
    );
    expect(first?.["schema"]).toMatchObject({ additionalProperties: false });
    expect(String(first?.["prompt"])).toContain("Do not expose the final answer.");
    expect(String(first?.["prompt"])).toContain("Why does current fall when resistance rises?");
  });

  it("passes the reasoning effort and model through to the CLI", async () => {
    environment([{ output: CLEAN_REPLY }]);
    await provider({ model: "gpt-test", reasoningEffort: "medium" }).generate(
      REQUEST,
      REPLY_OPTIONS,
    );
    const args = invocations()[0]?.["args"] as string[];
    expect(args).toEqual(expect.arrayContaining(["-m", "gpt-test"]));
    expect(args).toEqual(expect.arrayContaining(['model_reasoning_effort="medium"']));
  });

  it("repairs flagged prose with one targeted style edit", async () => {
    environment([
      { output: FLAWED_REPLY },
      {
        output: {
          revisedText: "A resistor limits current and releases heat.",
          edits: ["NEG001_NOT_ONLY_BUT_ALSO: replaced the paired construction with one clause."],
          unrepaired: [],
          protectedItemsChecked: [],
        },
      },
    ]);

    const response = await provider().generate(REQUEST, REPLY_OPTIONS);
    expect(response.payload).toMatchObject({
      answer: "A resistor limits current and releases heat.",
    });

    const calls = invocations();
    expect(calls).toHaveLength(2);
    expect(String(calls[1]?.["prompt"])).toContain("Targeted Style Editor Prompt");
    expect(String(calls[1]?.["prompt"])).toContain("NEG001_NOT_ONLY_BUT_ALSO");
  });

  it("reports a typed error when the repaired prose still breaks the writing contract", async () => {
    environment([
      { output: FLAWED_REPLY },
      {
        output: {
          revisedText: "A resistor not only limits current, but also releases heat.",
          edits: [],
          unrepaired: ["NEG001_NOT_ONLY_BUT_ALSO"],
          protectedItemsChecked: [],
        },
      },
    ]);

    const error = await provider()
      .generate(REQUEST, REPLY_OPTIONS)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(TutorProviderError);
    expect((error as TutorProviderError).code).toBe("PROVIDER_WRITING_GATE");
    expect((error as TutorProviderError).violations[0]?.ruleId).toBe("NEG001_NOT_ONLY_BUT_ALSO");
  });

  it("retries once when the model returns something other than the requested shape", async () => {
    environment([{ output: { answer: "Too short." } }, { output: CLEAN_REPLY }]);
    const response = await provider().generate(REQUEST, REPLY_OPTIONS);
    expect(response.payload).toEqual(CLEAN_REPLY);
    expect(invocations()).toHaveLength(2);
  });

  it("surfaces a non-zero exit as a typed error instead of a degraded reply", async () => {
    environment([{ exitCode: 3, skipOutputFile: true }]);
    const error = await provider()
      .generate(REQUEST, { ...REPLY_OPTIONS, maxAttempts: 1 })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(TutorProviderError);
    expect((error as TutorProviderError).code).toBe("PROVIDER_EXITED");
  });

  it("reports a missing executable rather than failing silently", async () => {
    environment([{ output: CLEAN_REPLY }]);
    const error = await provider({ binary: path.join(workspace, "absent-codex") })
      .generate(REQUEST, { ...REPLY_OPTIONS, maxAttempts: 1 })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(TutorProviderError);
    expect((error as TutorProviderError).code).toBe("PROVIDER_SPAWN_FAILED");
  });

  it("kills the process when the wall-clock budget expires", async () => {
    environment([{ sleepMs: 10_000, output: CLEAN_REPLY }]);
    const error = await provider()
      .generate(REQUEST, { ...REPLY_OPTIONS, timeoutMs: 300, maxAttempts: 1 })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(TutorProviderError);
    expect((error as TutorProviderError).code).toBe("PROVIDER_TIMEOUT");

    const pid = invocations()[0]?.["pid"] as number;
    expect(pid).toBeGreaterThan(0);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(() => process.kill(pid, 0)).toThrow();
  });

  it("resumes an existing session for a follow-up turn", async () => {
    environment([{ output: CLEAN_REPLY }]);
    await provider().generate(REQUEST, {
      ...REPLY_OPTIONS,
      sessionId: "99999999-8888-4777-8666-555555555555",
    });
    const args = invocations()[0]?.["args"] as string[];
    expect(args.slice(0, 2)).toEqual(["exec", "resume"]);
    expect(args).toEqual(expect.arrayContaining(['sandbox_mode="read-only"']));
    expect(args).not.toContain("-s");
    expect(invocations()[0]?.["resumedSessionId"]).toBe("99999999-8888-4777-8666-555555555555");
  });

  it("runs one generation at a time so the subscription is never used twice at once", async () => {
    environment([{ sleepMs: 250, output: CLEAN_REPLY }]);
    const instance = provider();
    await Promise.all([
      instance.generate(REQUEST, REPLY_OPTIONS),
      instance.generate(REQUEST, REPLY_OPTIONS),
    ]);

    const entries = logEntries();
    const firstFinish = entries.find((entry) => entry["finishedAt"] !== undefined)?.[
      "finishedAt"
    ] as number;
    const secondStart = invocations()[1]?.["startedAt"] as number;
    expect(secondStart).toBeGreaterThanOrEqual(firstFinish);
  });

  it("accepts a fenced or envelope-wrapped reply from the model", async () => {
    environment([
      {
        rawOutput: `\`\`\`json\n${JSON.stringify({
          protocolVersion: "0.2",
          operation: "tutor_reply",
          requestId: REQUEST.requestId,
          generatedAt: "2026-08-18T00:00:00.000Z",
          payload: CLEAN_REPLY,
        })}\n\`\`\``,
      },
    ]);
    const response = await provider().generate(REQUEST, REPLY_OPTIONS);
    expect(response.payload).toEqual(CLEAN_REPLY);
  });
});
