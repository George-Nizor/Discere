import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TutorReplyDraftSchema, WorkingsReviewDraftSchema } from "@discere/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CodexTutorProvider,
  isResumableSessionId,
  safeAttachmentName,
  TutorProviderError,
} from "../src/index.js";

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

const WORKINGS_REVIEW = {
  imageReviewed: true,
  transcription: "I = V / R, then 5 / 100.",
  transcriptionConfidence: 0.8,
  assessment: "partly_correct" as const,
  feedback: "The relationship is right and the division is never carried out.",
  firstMeaningfulError: "The substitution stops before the division is completed.",
  nextStep: "Carry out the division and write the result with its unit.",
  sourceIds: [],
  uncertainty: [],
};

const WORKINGS_REQUEST = {
  operation: "workings_review" as const,
  requestId: "3b6b2a2e-9f34-4a6c-9a3e-0c9f1c0b8a55",
  payload: { reviewQuestion: "Have I set this up correctly?" },
};

const WORKINGS_OPTIONS = {
  outputSchema: z.toJSONSchema(WorkingsReviewDraftSchema),
  parsePayload: (value: unknown) => WorkingsReviewDraftSchema.parse(value),
  lintTargets: [
    { path: "feedback", context: "feedback" as const },
    { path: "nextStep", context: "hint" as const },
  ],
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

/** The argument list of one recorded invocation, or an empty list if it never happened. */
function argsOf(index: number): string[] {
  const entry = invocations()[index];
  return Array.isArray(entry?.["args"]) ? (entry["args"] as string[]) : [];
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

  it("builds the opening command line with the working root and sandbox on it", async () => {
    environment([{ output: CLEAN_REPLY }]);
    const scratch = path.join(workspace, "scratch");
    await provider({ scratchDirectory: scratch, model: "gpt-test" }).generate(
      REQUEST,
      REPLY_OPTIONS,
    );

    const args = argsOf(0).map((arg) =>
      arg.startsWith(scratch) ? arg.replace(scratch, "<scratch>") : arg,
    );
    expect(args.filter((arg) => !arg.startsWith("<scratch>"))).toEqual([
      "exec",
      "-C",
      "--skip-git-repo-check",
      "-m",
      "gpt-test",
      "-c",
      'model_reasoning_effort="xhigh"',
      "-c",
      "mcp_servers={}",
      "--output-schema",
      "-o",
      "--json",
      "--color",
      "never",
      "-s",
      "read-only",
      "-",
    ]);
  });

  it("builds a resume command line free of the options the CLI rejects", async () => {
    environment([{ output: CLEAN_REPLY }]);
    const scratch = path.join(workspace, "scratch");
    await provider({ scratchDirectory: scratch, model: "gpt-test" }).generate(REQUEST, {
      ...REPLY_OPTIONS,
      sessionId: "99999999-8888-4777-8666-555555555555",
    });

    const args = argsOf(0).map((arg) =>
      arg.startsWith(scratch) ? arg.replace(scratch, "<scratch>") : arg,
    );
    expect(args.filter((arg) => !arg.startsWith("<scratch>"))).toEqual([
      "exec",
      "resume",
      "--skip-git-repo-check",
      "-m",
      "gpt-test",
      "-c",
      'model_reasoning_effort="xhigh"',
      "-c",
      "mcp_servers={}",
      "--output-schema",
      "-o",
      "--json",
      "-c",
      'sandbox_mode="read-only"',
      "99999999-8888-4777-8666-555555555555",
      "-",
    ]);
    // The CLI exits 2 on any of these before the model is reached.
    for (const rejected of ["-C", "--cd", "--color", "-s", "--sandbox"]) {
      expect(args).not.toContain(rejected);
    }
  });

  it("carries a conversation across an opening question and a follow-up", async () => {
    environment([{ output: CLEAN_REPLY }]);
    const instance = provider();

    const first = await instance.generate(REQUEST, REPLY_OPTIONS);
    expect(first.sessionId).toBe("11111111-2222-4333-8444-555555555555");

    const followUp = await instance.generate(
      { ...REQUEST, payload: { learnerQuestion: "And if the resistance doubles?" } },
      { ...REPLY_OPTIONS, sessionId: first.sessionId ?? "" },
    );
    expect(followUp.payload).toEqual(CLEAN_REPLY);
    expect(followUp.sessionId).toBe("11111111-2222-4333-8444-555555555555");

    const calls = invocations();
    expect(calls).toHaveLength(2);
    expect(argsOf(0)[1]).not.toBe("resume");
    expect(argsOf(1).slice(0, 2)).toEqual(["exec", "resume"]);
  });

  it("times a queued request out from when it was accepted, not from when it starts", async () => {
    environment([{ sleepMs: 800, output: CLEAN_REPLY }]);
    const instance = provider();

    const running = instance.generate(REQUEST, { ...REPLY_OPTIONS, timeoutMs: 2_000 });
    const queued = await instance
      .generate(REQUEST, { ...REPLY_OPTIONS, timeoutMs: 200 })
      .catch((error: unknown) => error);

    expect(queued).toBeInstanceOf(TutorProviderError);
    expect((queued as TutorProviderError).code).toBe("PROVIDER_TIMEOUT");
    // The waiting request never reached the CLI, so no quota was spent on it.
    expect(invocations()).toHaveLength(1);
    await running;
  });

  it("refuses a fourth queued generation rather than making the learner wait", async () => {
    environment([{ sleepMs: 400, output: CLEAN_REPLY }]);
    const instance = provider();

    const accepted = [0, 1, 2].map(async () => instance.generate(REQUEST, REPLY_OPTIONS));
    const rejected = await instance
      .generate(REQUEST, REPLY_OPTIONS)
      .catch((error: unknown) => error);

    expect(rejected).toBeInstanceOf(TutorProviderError);
    expect((rejected as TutorProviderError).code).toBe("PROVIDER_BUSY");
    await Promise.all(accepted);
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

  it("attaches an image with the `=` form and keeps the prompt on stdin", async () => {
    environment([{ output: WORKINGS_REVIEW }]);
    const png = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001",
      "hex",
    );
    const response = await provider().generate(WORKINGS_REQUEST, {
      ...WORKINGS_OPTIONS,
      images: [{ filename: "discere-current-in-one-loop-workings.png", data: png }],
    });
    expect(response.payload).toEqual(WORKINGS_REVIEW);

    const call = invocations()[0];
    const args = call?.["args"] as string[];
    const imageArguments = args.filter((argument) => argument.startsWith("--image="));
    expect(imageArguments).toHaveLength(1);
    // The prompt still arrives on stdin, which the variadic flag would otherwise swallow.
    expect(args.at(-1)).toBe("-");
    expect(String(call?.["prompt"])).toContain("Review the image attached by the learner.");

    const images = call?.["images"] as Array<{ file: string; bytes: number; head: string }>;
    expect(images).toHaveLength(1);
    expect(images[0]?.bytes).toBe(png.byteLength);
    // The real PNG bytes reached the CLI, not a placeholder or a path it could not read.
    expect(images[0]?.head).toBe("89504e470d0a1a0a");
    expect(path.basename(String(images[0]?.file))).toBe(
      "0-discere-current-in-one-loop-workings.png",
    );
  });

  it("keeps an attachment out of the style repair pass", async () => {
    environment([
      {
        output: {
          ...WORKINGS_REVIEW,
          feedback: "The working is not only started, but also wrong.",
        },
      },
      {
        output: {
          revisedText: "The working is started and then goes wrong.",
          edits: ["NEG001_NOT_ONLY_BUT_ALSO: replaced the paired construction."],
          unrepaired: [],
          protectedItemsChecked: [],
        },
      },
    ]);
    const png = Buffer.from("89504e470d0a1a0a", "hex");
    await provider().generate(WORKINGS_REQUEST, {
      ...WORKINGS_OPTIONS,
      images: [{ filename: "workings.png", data: png }],
    });
    const calls = invocations();
    expect(calls[0]?.["images"]).toHaveLength(1);
    expect(calls[1]?.["images"]).toHaveLength(0);
  });

  it("names an attachment safely however the caller named the file", () => {
    expect(safeAttachmentName("../../etc/passwd", 0)).toBe("0-passwd");
    expect(safeAttachmentName("a b/c d.png", 1)).toBe("1-c-d.png");
    expect(safeAttachmentName("...", 2)).toBe("2-attachment.png");
  });

  it("removes an attachment from disk once the generation is over", async () => {
    environment([{ output: WORKINGS_REVIEW }]);
    await provider().generate(WORKINGS_REQUEST, {
      ...WORKINGS_OPTIONS,
      images: [{ filename: "workings.png", data: Buffer.from("89504e470d0a1a0a", "hex") }],
    });
    const images = invocations()[0]?.["images"] as Array<{ file: string }>;
    expect(existsSync(String(images[0]?.file))).toBe(false);
  });

  it("refuses a flag-shaped session id before anything is spawned", async () => {
    environment([{ output: CLEAN_REPLY }]);
    const error = await provider()
      .generate(REQUEST, {
        ...REPLY_OPTIONS,
        sessionId: "--dangerously-bypass-approvals-and-sandbox",
      })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(TutorProviderError);
    expect((error as TutorProviderError).code).toBe("PROVIDER_SESSION_INVALID");
    // The point of the guard: the CLI never ran, so the option never reached it.
    expect(invocations()).toHaveLength(0);
  });

  it("refuses every other shape that is not a conversation id", async () => {
    environment([{ output: CLEAN_REPLY }]);
    for (const sessionId of [
      "-s",
      "--json",
      "11111111-2222-4333-8444-555555555555 --yolo",
      "../../etc/passwd",
      "",
      "not-a-uuid",
    ]) {
      const error = await provider()
        .generate(REQUEST, { ...REPLY_OPTIONS, sessionId })
        .catch((cause: unknown) => cause);
      expect((error as TutorProviderError).code).toBe("PROVIDER_SESSION_INVALID");
    }
    expect(invocations()).toHaveLength(0);
    expect(isResumableSessionId("11111111-2222-4333-8444-555555555555")).toBe(true);
  });

  it("still resumes a real conversation id", async () => {
    environment([{ output: CLEAN_REPLY }]);
    const sessionId = "11111111-2222-4333-8444-555555555555";
    await provider().generate(REQUEST, { ...REPLY_OPTIONS, sessionId });
    const args = invocations()[0]?.["args"] as string[];
    expect(args.slice(0, 2)).toEqual(["exec", "resume"]);
    expect(args).toEqual(expect.arrayContaining([sessionId]));
    expect(args.at(-1)).toBe("-");
  });

  it("clears the run directory when preparing the run fails", async () => {
    environment([{ output: CLEAN_REPLY }]);
    const scratch = path.join(workspace, "scratch");
    // A schema that cannot be serialised throws after the run directory exists but before the
    // CLI is ever spawned, which is the window where cleanup used to be skipped.
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;

    const error = await provider({ scratchDirectory: scratch })
      .generate(REQUEST, { ...REPLY_OPTIONS, outputSchema: circular })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(TypeError);
    expect(invocations()).toHaveLength(0);
    // Nothing is left behind in the scratch directory.
    const runs = path.join(scratch, ".runs");
    expect(existsSync(runs) ? readdirSync(runs) : []).toEqual([]);
  });
});
