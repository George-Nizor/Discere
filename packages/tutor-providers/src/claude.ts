import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { isResumableSessionId, safeAttachmentName } from "./codex.js";
import { TutorProviderError } from "./errors.js";
import { type DriverInput, type DriverOutput, PipelineTutorProvider } from "./pipeline.js";
import { runProcess } from "./process.js";
import { type ModelTier, type RoutingMode, resolveRoutingMode } from "./routing.js";

export interface ClaudeProviderOptions {
  /** Executable. Defaults to `DISCERE_CLAUDE_BIN`, then `claude`. */
  binary?: string;
  /** Small model for short turns. Defaults to `DISCERE_CLAUDE_FAST_MODEL`, then Haiku 4.5. */
  fastModel?: string;
  /** Capable model for judging and writing. Defaults to `DISCERE_CLAUDE_SMART_MODEL`, then Sonnet 5.5. */
  smartModel?: string;
  /** Effort for the capable model. Defaults to `DISCERE_CLAUDE_EFFORT`, then `low`. */
  effort?: string;
  /** `auto` (default), `fast` or `smart`. Defaults to `DISCERE_AI_ROUTING`. */
  routing?: RoutingMode;
  scratchDirectory?: string;
  timeoutMs?: number;
  killGraceMs?: number;
}

export const CLAUDE_DEFAULT_FAST_MODEL = "claude-haiku-4-5-20251001";
export const CLAUDE_DEFAULT_SMART_MODEL = "claude-sonnet-5-5";

/**
 * The system prompt replaces Claude Code's own: a tutor turn needs none of a coding agent's
 * instructions, and every token of them would be paid for on every question.
 */
const SYSTEM_PROMPT =
  "You are the tutor inside Discere, a learning platform. Follow the instructions in the user message exactly. " +
  "Return only the JSON object the schema describes.";

interface ClaudeResult {
  type?: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  structured_output?: unknown;
  session_id?: string;
  total_cost_usd?: number;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
  modelUsage?: Record<string, unknown>;
}

/**
 * Drives the tutor through the local Claude Code CLI, on the learner's own Claude plan. Tools,
 * settings files and MCP servers are all switched off: a tutor turn reads text (and, for a
 * workings review, one image) and writes JSON, nothing else.
 */
export class ClaudeTutorProvider extends PipelineTutorProvider {
  readonly id = "claude";
  readonly label = "Claude Code";
  protected readonly defaultTimeoutMs: number;
  protected readonly routing: RoutingMode;
  private readonly binary: string;
  private readonly fastModel: string;
  private readonly smartModel: string;
  private readonly effort: string;
  private readonly scratchDirectory: string;
  private readonly killGraceMs: number;

  constructor(options: ClaudeProviderOptions = {}) {
    super();
    const env = process.env;
    this.binary = options.binary ?? env["DISCERE_CLAUDE_BIN"]?.trim() ?? "claude";
    this.fastModel = options.fastModel ?? (env["DISCERE_CLAUDE_FAST_MODEL"]?.trim() || CLAUDE_DEFAULT_FAST_MODEL);
    this.smartModel = options.smartModel ?? (env["DISCERE_CLAUDE_SMART_MODEL"]?.trim() || CLAUDE_DEFAULT_SMART_MODEL);
    this.effort = options.effort ?? (env["DISCERE_CLAUDE_EFFORT"]?.trim() || "low");
    this.routing = options.routing ?? resolveRoutingMode(env["DISCERE_AI_ROUTING"]);
    this.scratchDirectory =
      options.scratchDirectory ?? (env["DISCERE_CLAUDE_SCRATCH"]?.trim() || path.join(os.homedir(), ".local/share/discere/claude-scratch"));
    this.defaultTimeoutMs = options.timeoutMs ?? 120_000;
    this.killGraceMs = options.killGraceMs ?? 5_000;
  }

  protected modelFor(tier: ModelTier): string {
    return tier === "fast" ? this.fastModel : this.smartModel;
  }

  protected override assertSession(sessionId: string | undefined): void {
    if (sessionId === undefined || isResumableSessionId(sessionId)) return;
    throw new TutorProviderError(
      "PROVIDER_SESSION_INVALID",
      "The session identifier is not a valid conversation id. Start a new conversation.",
      { provider: this.id },
    );
  }

  /** The command line for one generation. Exposed for tests; never includes learner text. */
  buildArguments(input: { tier: ModelTier; schema: unknown; sessionId: string | undefined; persist: boolean; imageDirectory?: string }): string[] {
    this.assertSession(input.sessionId);
    const args = [
      "-p",
      "--model",
      this.modelFor(input.tier),
      "--output-format",
      "json",
      "--system-prompt",
      SYSTEM_PROMPT,
      "--setting-sources",
      "",
      "--strict-mcp-config",
    ];
    // Haiku has no effort control; the capable model runs at the configured (low) effort.
    if (input.tier === "smart" && this.effort) args.push("--effort", this.effort);
    if (input.imageDirectory) args.push("--tools", "Read", "--allowedTools", "Read", "--add-dir", input.imageDirectory);
    else args.push("--tools", "");
    if (input.schema !== undefined) args.push("--json-schema", JSON.stringify(withoutDialect(input.schema)));
    if (input.sessionId) args.push("--resume", input.sessionId);
    else if (!input.persist) args.push("--no-session-persistence");
    return args;
  }

  protected async execute(input: DriverInput): Promise<DriverOutput> {
    mkdirSync(this.scratchDirectory, { recursive: true });
    const runDirectory = input.images.length ? path.join(this.scratchDirectory, ".runs", randomUUID()) : undefined;
    try {
      let prompt = input.prompt;
      if (runDirectory) {
        mkdirSync(runDirectory, { recursive: true });
        const files = input.images.map((image, index) => {
          const file = path.join(runDirectory, safeAttachmentName(image.filename, index));
          writeFileSync(file, image.data);
          return file;
        });
        prompt += `\n\nAttached image${files.length > 1 ? "s" : ""} (open with the Read tool before answering):\n${files.join("\n")}`;
      }
      const args = this.buildArguments({
        tier: input.tier,
        schema: input.outputSchema,
        sessionId: input.sessionId,
        persist: input.persistSession,
        ...(runDirectory ? { imageDirectory: runDirectory } : {}),
      });
      const { stdout, diagnostics } = await runProcess({
        provider: this.id,
        binary: this.binary,
        args,
        cwd: this.scratchDirectory,
        stdin: prompt,
        timeoutMs: input.timeoutMs,
        killGraceMs: this.killGraceMs,
        signal: input.signal,
        // Claude Code thinks by default. A short tutoring turn on the fast model does not need
        // it: measured, thinking made a Haiku turn take 43 s and cost more than Sonnet at low effort.
        env: { ...process.env, MAX_THINKING_TOKENS: input.tier === "fast" ? "0" : (process.env["MAX_THINKING_TOKENS"] ?? "") },
        missingHint: "Install Claude Code (https://claude.com/claude-code) and sign in, or set DISCERE_CLAUDE_BIN.",
      });
      return parseClaudeResult(stdout, diagnostics, this.modelFor(input.tier));
    } finally {
      if (runDirectory) rmSync(runDirectory, { recursive: true, force: true });
    }
  }
}

/**
 * The CLI's validator knows the default JSON Schema dialect only, and refuses a schema that
 * names the 2020-12 meta-schema (which zod's exporter adds). The keywords are compatible.
 */
export function withoutDialect(schema: unknown): unknown {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) return schema;
  const { $schema: _dialect, ...rest } = schema as Record<string, unknown>;
  return rest;
}

/** Reads the CLI's `--output-format json` result object. */
export function parseClaudeResult(stdout: string, diagnostics: string, requestedModel: string): DriverOutput {
  let result: ClaudeResult;
  try {
    const lines = stdout.trim().split("\n");
    result = JSON.parse(lines[lines.length - 1] ?? "") as ClaudeResult;
  } catch (error) {
    throw new TutorProviderError("PROVIDER_OUTPUT_INVALID", "Claude Code did not return its JSON result.", {
      provider: "claude",
      diagnostics: (diagnostics || stdout).slice(0, 4_000),
      cause: error,
    });
  }
  if (result.is_error || (result.subtype && result.subtype !== "success")) {
    const message = typeof result.result === "string" && result.result ? result.result : (result.subtype ?? "error");
    const signedOut = /log ?in|auth|credential|api key/i.test(message);
    throw new TutorProviderError(
      signedOut ? "PROVIDER_UNAVAILABLE" : "PROVIDER_EXITED",
      signedOut ? "Claude Code is not signed in. Run `claude` once and log in." : `Claude Code reported an error: ${message}`,
      { provider: "claude", diagnostics: message.slice(0, 4_000) },
    );
  }
  const text =
    result.structured_output !== undefined && result.structured_output !== null
      ? JSON.stringify(result.structured_output)
      : (result.result ?? "");
  if (!text.trim())
    throw new TutorProviderError("PROVIDER_OUTPUT_MISSING", "Claude Code returned an empty answer.", {
      provider: "claude",
      diagnostics: diagnostics.slice(0, 4_000),
    });
  const model = Object.keys(result.modelUsage ?? {})[0] ?? requestedModel;
  const usage = result.usage ?? {};
  return {
    text,
    ...(result.session_id ? { sessionId: result.session_id } : {}),
    model,
    ...(typeof result.total_cost_usd === "number" ? { costUsd: result.total_cost_usd } : {}),
    inputTokens: (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
    outputTokens: usage.output_tokens ?? 0,
  };
}
