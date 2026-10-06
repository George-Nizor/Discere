import { describe, expect, it } from "vitest";
import {
  aiRuntimeStatus,
  chooseTier,
  ClaudeTutorProvider,
  type DriverInput,
  type DriverOutput,
  type ModelTier,
  OpenAICompatibleTutorProvider,
  parseClaudeResult,
  PipelineTutorProvider,
  TutorProviderError,
} from "../src/index.js";

const route = (overrides: Partial<Parameters<typeof chooseTier>[0]> = {}) =>
  chooseTier({ operation: "tutor_reply", promptText: "{}", hasImages: false, attempt: 1, ...overrides }).tier;

describe("model routing", () => {
  it("keeps short tutoring turns and style repairs on the fast model", () => {
    expect(route({ question: "What does the slope mean here?" })).toBe("fast");
    expect(route({ operation: "edit_style" })).toBe("fast");
  });
  it("sends judging, writing, images, reasoning and long context to the capable model", () => {
    expect(route({ operation: "workings_review" })).toBe("smart");
    expect(route({ operation: "author_lesson" })).toBe("smart");
    expect(route({ hasImages: true })).toBe("smart");
    expect(route({ question: "Can you prove the sum of angles is 180°?" })).toBe("smart");
    expect(route({ question: "x".repeat(400) })).toBe("smart");
    expect(route({ promptText: "x".repeat(10_000) })).toBe("smart");
  });
  it("escalates a retry and honours a fixed mode", () => {
    expect(route({ attempt: 2 })).toBe("smart");
    expect(route({ operation: "workings_review", mode: "fast" })).toBe("fast");
  });
});

class FakeDriver extends PipelineTutorProvider {
  readonly id = "fake";
  readonly label = "Fake";
  protected readonly defaultTimeoutMs = 5_000;
  protected readonly routing = "auto" as const;
  calls: ModelTier[] = [];
  constructor(private readonly replies: Array<(tier: ModelTier) => string>) {
    super();
  }
  protected modelFor(tier: ModelTier) {
    return tier === "fast" ? "small" : "large";
  }
  protected async execute(input: DriverInput): Promise<DriverOutput> {
    this.calls.push(input.tier);
    const reply = this.replies.shift();
    if (!reply) throw new Error("no reply");
    return { text: reply(input.tier), costUsd: 0.001 };
  }
}

describe("shared pipeline", () => {
  const request = { operation: "tutor_reply" as const, requestId: "r", payload: { question: "Hi?" } };
  it("escalates from the fast to the capable model when the first answer is unusable", async () => {
    const driver = new FakeDriver([() => "not json", () => '{"answer":"ok"}']);
    const response = await driver.generate(request, { maxAttempts: 2 });
    expect(driver.calls).toEqual(["fast", "smart"]);
    expect(response.payload).toEqual({ answer: "ok" });
    expect(response.modelNotes?.[0]).toMatch(/^large/);
  });
  it("records each call in the usage ledger", async () => {
    const before = aiRuntimeStatus().calls;
    const driver = new FakeDriver([() => '{"answer":"ok"}']);
    await driver.generate(request);
    const status = aiRuntimeStatus();
    expect(status.calls).toBe(before + 1);
    expect(status.recent[0]).toMatchObject({ provider: "fake", model: "small", tier: "fast", ok: true });
  });
});

describe("Claude Code driver", () => {
  const provider = new ClaudeTutorProvider({ fastModel: "haiku-x", smartModel: "sonnet-y", effort: "low" });
  it("switches tools, settings and MCP off and picks the model by tier", () => {
    const fast = provider.buildArguments({ tier: "fast", schema: { type: "object" }, sessionId: undefined, persist: false });
    expect(fast).toEqual(expect.arrayContaining(["-p", "--model", "haiku-x", "--tools", "", "--strict-mcp-config", "--no-session-persistence"]));
    expect(fast).not.toContain("--effort");
    expect(fast[fast.indexOf("--json-schema") + 1]).toBe('{"type":"object"}');
    const smart = provider.buildArguments({ tier: "smart", schema: undefined, sessionId: undefined, persist: true });
    expect(smart).toEqual(expect.arrayContaining(["--model", "sonnet-y", "--effort", "low"]));
    expect(smart).not.toContain("--no-session-persistence");
  });
  it("drops the schema dialect the CLI cannot load", () => {
    const args = provider.buildArguments({
      tier: "fast",
      schema: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object" },
      sessionId: undefined,
      persist: false,
    });
    expect(args[args.indexOf("--json-schema") + 1]).toBe('{"type":"object"}');
  });
  it("only resumes a well-formed session and only allows Read for images", () => {
    const id = "fb2701fd-1064-4382-8f89-7401b601ba5f";
    const resumed = provider.buildArguments({ tier: "fast", schema: undefined, sessionId: id, persist: true, imageDirectory: "/tmp/run" });
    expect(resumed).toEqual(expect.arrayContaining(["--resume", id, "--tools", "Read", "--add-dir", "/tmp/run"]));
    expect(() =>
      provider.buildArguments({ tier: "fast", schema: undefined, sessionId: "--dangerously-skip-permissions", persist: true }),
    ).toThrow(TutorProviderError);
  });
  it("reads structured output, session, model and cost from the CLI result", () => {
    const stdout = JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      result: '{"answer":7}',
      structured_output: { answer: 7 },
      session_id: "fb2701fd-1064-4382-8f89-7401b601ba5f",
      total_cost_usd: 0.0019,
      usage: { input_tokens: 1333, output_tokens: 112 },
      modelUsage: { "claude-haiku-4-5-20251001": {} },
    });
    expect(parseClaudeResult(stdout, "", "haiku")).toMatchObject({
      text: '{"answer":7}',
      model: "claude-haiku-4-5-20251001",
      costUsd: 0.0019,
      inputTokens: 1333,
    });
  });
  it("explains a signed-out CLI instead of a generic failure", () => {
    const stdout = JSON.stringify({ type: "result", subtype: "success", is_error: true, result: "Invalid API key · Please run /login" });
    expect(() => parseClaudeResult(stdout, "", "haiku")).toThrow(/not signed in/);
  });
});

describe("OpenAI-compatible driver", () => {
  it("posts the prompt with a JSON schema and returns the content", async () => {
    let sent: { url: string; body: Record<string, unknown>; auth: string | null } | undefined;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get("authorization") };
      return new Response(JSON.stringify({ model: "m-small", choices: [{ message: { content: '{"answer":"hi"}' } }] }));
    }) as unknown as typeof fetch;
    const provider = new OpenAICompatibleTutorProvider({
      baseUrl: "http://localhost:11434/v1/",
      apiKey: "k",
      fastModel: "m-small",
      fetchImpl,
    });
    const response = await provider.generate(
      { operation: "tutor_reply", requestId: "r", payload: { question: "Hi?" } },
      { outputSchema: { type: "object" } },
    );
    expect(response.payload).toEqual({ answer: "hi" });
    expect(sent?.url).toBe("http://localhost:11434/v1/chat/completions");
    expect(sent?.auth).toBe("Bearer k");
    expect(sent?.body["response_format"]).toMatchObject({ type: "json_schema" });
  });
  it("names a rejected key rather than retrying", async () => {
    const fetchImpl = (async () => new Response("nope", { status: 401 })) as unknown as typeof fetch;
    const provider = new OpenAICompatibleTutorProvider({ baseUrl: "https://api.example.com/v1", fetchImpl });
    await expect(provider.generate({ operation: "tutor_reply", requestId: "r", payload: {} })).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
    });
  });
});
