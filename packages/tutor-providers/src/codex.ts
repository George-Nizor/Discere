import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { StyleViolation } from "@discere/contracts";
import { StyleEditDraftSchema } from "@discere/contracts";
import { resolveCodexScratchDirectory } from "@discere/paths";
import { lintText } from "@discere/writing-engine";
import { z } from "zod";
import { TutorProviderError } from "./errors.js";
import { buildTutorPrompt } from "./prompt.js";
import type {
  TutorGenerateOptions,
  TutorImageAttachment,
  TutorLintTarget,
  TutorProvider,
  TutorRequest,
  TutorResponse,
} from "./types.js";

export interface CodexProviderOptions {
  /** Executable to spawn. Defaults to `DISCERE_CODEX_BIN`, then `codex`. */
  binary?: string;
  /** Model name. Defaults to `DISCERE_CODEX_MODEL`; unset means the account default. */
  model?: string;
  /** Reasoning effort. Defaults to `DISCERE_CODEX_EFFORT`, then `low`. */
  reasoningEffort?: string;
  /** Working root handed to the CLI. Defaults to `data/codex-scratch`. */
  scratchDirectory?: string;
  /** Wall-clock budget for one generation. Defaults to `DISCERE_CODEX_TIMEOUT_MS`, then 120s. */
  timeoutMs?: number;
  /** Grace period between SIGTERM and SIGKILL. */
  killGraceMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const KILL_GRACE_MS = 5_000;
const MAX_DIAGNOSTIC_CHARS = 4_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_KEYS = ["session_id", "sessionId", "thread_id", "threadId", "conversation_id"];

/**
 * Discere is a single-user workspace and the CLI drives one paid subscription. Generations are
 * serialised so a second request never competes with the first for the same quota.
 */
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function positiveInteger(value: string | undefined): number | undefined {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/** Finds the session identifier inside one `--json` event without depending on its shape. */
export function extractSessionId(value: unknown): string | undefined {
  if (value === null || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = extractSessionId(entry);
      if (found) return found;
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  for (const key of SESSION_KEYS) {
    const candidate = record[key];
    if (typeof candidate === "string" && UUID_PATTERN.test(candidate)) return candidate;
  }
  for (const entry of Object.values(record)) {
    const found = extractSessionId(entry);
    if (found) return found;
  }
  return undefined;
}

/** Accepts a bare JSON object, and also one fenced or wrapped in a protocol envelope. */
export function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/i.exec(trimmed);
  const body = fenced?.[1]?.trim() ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new TutorProviderError("PROVIDER_OUTPUT_INVALID", "The model did not return JSON.", {
      provider: "codex",
      diagnostics: body.slice(0, MAX_DIAGNOSTIC_CHARS),
    });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.slice(start, end + 1)) as unknown;
  } catch (error) {
    throw new TutorProviderError(
      "PROVIDER_OUTPUT_INVALID",
      "The model returned text that is not valid JSON.",
      { provider: "codex", diagnostics: body.slice(0, MAX_DIAGNOSTIC_CHARS), cause: error },
    );
  }
  if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    if (record["protocolVersion"] === "0.2" && "payload" in record) return record["payload"];
  }
  return parsed;
}

function readPath(payload: unknown, dotted: string): string | undefined {
  let current: unknown = payload;
  for (const segment of dotted.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : undefined;
}

function writePath(payload: unknown, dotted: string, value: string): void {
  const segments = dotted.split(".");
  const last = segments.pop();
  if (last === undefined) return;
  let current: unknown = payload;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return;
    current = (current as Record<string, unknown>)[segment];
  }
  if (current !== null && typeof current === "object") {
    (current as Record<string, unknown>)[last] = value;
  }
}

function hardViolations(text: string, target: TutorLintTarget): StyleViolation[] {
  const result = lintText(text, {
    context: target.context,
    ...(target.hiddenAnswer === undefined ? {} : { hiddenAnswer: target.hiddenAnswer }),
  });
  return result.violations.filter((violation) => violation.severity === "hard");
}

interface CodexRunOutcome {
  text: string;
  sessionId: string | undefined;
}

interface CodexRunInput {
  prompt: string;
  outputSchema: unknown;
  timeoutMs: number;
  sessionId: string | undefined;
  signal: AbortSignal | undefined;
  images: readonly TutorImageAttachment[];
}

/** Keeps a supplied name to a plain file inside the run directory. */
export function safeAttachmentName(filename: string, index: number): string {
  const base = path.basename(filename).replaceAll(/[^A-Za-z0-9._-]/g, "-");
  const cleaned = base.replace(/^[.-]+/, "");
  return cleaned.length > 0 ? `${index}-${cleaned}` : `${index}-attachment.png`;
}

export class CodexTutorProvider implements TutorProvider {
  readonly id = "codex";
  readonly label = "Local Codex CLI";
  readonly generatesInProcess = true;

  private readonly binary: string;
  private readonly model: string | undefined;
  private readonly reasoningEffort: string;
  private readonly scratchDirectory: string;
  private readonly timeoutMs: number;
  private readonly killGraceMs: number;

  constructor(options: CodexProviderOptions = {}) {
    this.binary = options.binary ?? process.env["DISCERE_CODEX_BIN"]?.trim() ?? "codex";
    const model = options.model ?? process.env["DISCERE_CODEX_MODEL"]?.trim();
    this.model = model ? model : undefined;
    this.reasoningEffort =
      options.reasoningEffort ?? process.env["DISCERE_CODEX_EFFORT"]?.trim() ?? "low";
    this.scratchDirectory = resolveCodexScratchDirectory(
      options.scratchDirectory ?? process.env["DISCERE_CODEX_SCRATCH"],
    );
    this.timeoutMs =
      options.timeoutMs ??
      positiveInteger(process.env["DISCERE_CODEX_TIMEOUT_MS"]) ??
      DEFAULT_TIMEOUT_MS;
    this.killGraceMs = options.killGraceMs ?? KILL_GRACE_MS;
  }

  async generate<TRequest, TResponse>(
    request: TutorRequest<TRequest>,
    options: TutorGenerateOptions = {},
  ): Promise<TutorResponse<TResponse>> {
    return enqueue(async () => this.run<TRequest, TResponse>(request, options));
  }

  private async run<TRequest, TResponse>(
    request: TutorRequest<TRequest>,
    options: TutorGenerateOptions,
  ): Promise<TutorResponse<TResponse>> {
    const prompt = buildTutorPrompt(request, {
      envelope: false,
      ...(options.systemPrompt === undefined ? {} : { systemPrompt: options.systemPrompt }),
      ...(options.extraInstructions === undefined
        ? {}
        : { extraInstructions: options.extraInstructions }),
    });
    const maxAttempts = Math.max(1, options.maxAttempts ?? 2);
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;

    let lastError: TutorProviderError | undefined;
    let sessionId = options.sessionId;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const outcome = await this.execute({
          prompt,
          outputSchema: options.outputSchema,
          timeoutMs,
          sessionId,
          signal: options.signal,
          images: options.images ?? [],
        });
        sessionId = outcome.sessionId ?? sessionId;
        const payload = this.acceptPayload(outcome.text, options);
        const repaired = await this.repairWriting(payload, options, timeoutMs);
        return {
          protocolVersion: "0.2",
          operation: request.operation,
          requestId: request.requestId,
          generatedAt: new Date().toISOString(),
          payload: repaired as TResponse,
          ...(sessionId === undefined ? {} : { sessionId }),
        };
      } catch (error) {
        if (!(error instanceof TutorProviderError)) throw error;
        // A writing-gate failure has already had its repair pass; repeating the generation
        // would spend the subscription on the same rejected prose.
        if (error.code === "PROVIDER_WRITING_GATE" || error.code === "PROVIDER_ABORTED")
          throw error;
        lastError = error;
      }
    }
    throw new TutorProviderError(
      lastError?.code ?? "PROVIDER_OUTPUT_INVALID",
      lastError?.message ?? "The local model did not return a usable response.",
      {
        provider: this.id,
        attempts: maxAttempts,
        ...(lastError?.diagnostics === undefined ? {} : { diagnostics: lastError.diagnostics }),
        ...(lastError === undefined ? {} : { cause: lastError }),
      },
    );
  }

  private acceptPayload(text: string, options: TutorGenerateOptions): unknown {
    const payload = parseModelJson(text);
    if (!options.parsePayload) return payload;
    try {
      return options.parsePayload(payload);
    } catch (error) {
      throw new TutorProviderError(
        "PROVIDER_OUTPUT_INVALID",
        "The generated response did not match the requested shape.",
        {
          provider: this.id,
          diagnostics: JSON.stringify(payload).slice(0, MAX_DIAGNOSTIC_CHARS),
          cause: error,
        },
      );
    }
  }

  /**
   * One targeted repair pass. Flagged spans and the original text go to the style editor, the
   * revision is linted again, and a passage that still fails is reported rather than shown.
   */
  private async repairWriting(
    payload: unknown,
    options: TutorGenerateOptions,
    timeoutMs: number,
  ): Promise<unknown> {
    const targets = options.lintTargets ?? [];
    if (targets.length === 0) return payload;

    const failing = targets
      .map((target) => ({ target, text: readPath(payload, target.path) }))
      .filter(
        (entry): entry is { target: TutorLintTarget; text: string } =>
          typeof entry.text === "string",
      )
      .map((entry) => ({ ...entry, violations: hardViolations(entry.text, entry.target) }))
      .filter((entry) => entry.violations.length > 0);
    if (failing.length === 0) return payload;

    const remaining: StyleViolation[] = [];
    for (const entry of failing) {
      const revised = await this.editStyle(entry.text, entry.violations, timeoutMs, options.signal);
      const stillFailing = hardViolations(revised, entry.target);
      if (stillFailing.length > 0) {
        remaining.push(...stillFailing);
        continue;
      }
      writePath(payload, entry.target.path, revised);
    }
    if (remaining.length > 0) {
      throw new TutorProviderError(
        "PROVIDER_WRITING_GATE",
        "The generated response still breaks the Discere writing contract after one repair pass.",
        { provider: this.id, attempts: 2, violations: remaining },
      );
    }
    return options.parsePayload ? options.parsePayload(payload) : payload;
  }

  private async editStyle(
    text: string,
    violations: readonly StyleViolation[],
    timeoutMs: number,
    signal: AbortSignal | undefined,
  ): Promise<string> {
    const prompt = buildTutorPrompt(
      {
        operation: "edit_style",
        requestId: randomUUID(),
        payload: {
          draft: text,
          violations: violations.map((violation) => ({
            ruleId: violation.ruleId,
            message: violation.message,
            start: violation.start,
            end: violation.end,
            excerpt: violation.excerpt,
          })),
          instruction:
            "Repair only the flagged spans. Preserve every number, unit, equation, citation, and answer boundary already present.",
        },
      },
      {
        systemPrompt: "style-editor",
        envelope: false,
        extraInstructions: [
          "Do not add new facts, examples, or solution steps while repairing the flagged spans.",
        ],
      },
    );
    // A style repair reads the flagged prose alone; re-attaching the learner's image would
    // invite the editor to add material the original generation never saw.
    const outcome = await this.execute({
      prompt,
      outputSchema: z.toJSONSchema(StyleEditDraftSchema),
      timeoutMs,
      sessionId: undefined,
      signal,
      images: [],
    });
    const parsed = StyleEditDraftSchema.safeParse(parseModelJson(outcome.text));
    if (!parsed.success) {
      throw new TutorProviderError(
        "PROVIDER_OUTPUT_INVALID",
        "The style editor did not return a usable revision.",
        { provider: this.id, diagnostics: outcome.text.slice(0, MAX_DIAGNOSTIC_CHARS) },
      );
    }
    return parsed.data.revisedText;
  }

  private buildArguments(input: {
    schemaFile: string | undefined;
    outputFile: string;
    sessionId: string | undefined;
    imageFiles: readonly string[];
  }): string[] {
    const shared = ["--skip-git-repo-check", "-C", this.scratchDirectory];
    if (this.model) shared.push("-m", this.model);
    shared.push("-c", `model_reasoning_effort=${JSON.stringify(this.reasoningEffort)}`);
    if (input.schemaFile) shared.push("--output-schema", input.schemaFile);
    // `--image` is variadic, so the `=` form keeps the trailing `-` reading the prompt from
    // stdin rather than being swallowed as another image path.
    for (const file of input.imageFiles) shared.push(`--image=${file}`);
    shared.push("-o", input.outputFile, "--json", "--color", "never");
    // `codex exec resume` has no `-s` flag, so the sandbox is set through configuration.
    if (input.sessionId) {
      return ["exec", "resume", ...shared, "-c", 'sandbox_mode="read-only"', input.sessionId, "-"];
    }
    return ["exec", ...shared, "-s", "read-only", "-"];
  }

  private async execute(input: CodexRunInput): Promise<CodexRunOutcome> {
    if (input.signal?.aborted) {
      throw new TutorProviderError("PROVIDER_ABORTED", "The generation was cancelled.", {
        provider: this.id,
      });
    }
    const runId = randomUUID();
    const runDirectory = path.join(this.scratchDirectory, ".runs", runId);
    mkdirSync(runDirectory, { recursive: true });
    const outputFile = path.join(runDirectory, "output.json");
    let schemaFile: string | undefined;
    if (input.outputSchema !== undefined) {
      schemaFile = path.join(runDirectory, "schema.json");
      writeFileSync(schemaFile, JSON.stringify(input.outputSchema, null, 2), "utf8");
    }
    // The CLI reads an attachment from disk, so the bytes are written beside the run and
    // removed with it. Nothing is left in the scratch directory after the generation.
    const imageFiles = input.images.map((image, index) => {
      const file = path.join(runDirectory, safeAttachmentName(image.filename, index));
      writeFileSync(file, image.data);
      return file;
    });

    try {
      const outcome = await this.spawnCodex(input, { schemaFile, outputFile, imageFiles });
      let text: string;
      try {
        text = readFileSync(outputFile, "utf8");
      } catch (error) {
        throw new TutorProviderError(
          "PROVIDER_OUTPUT_MISSING",
          "The local model finished without writing a response file.",
          { provider: this.id, diagnostics: outcome.diagnostics, cause: error },
        );
      }
      if (text.trim().length === 0) {
        throw new TutorProviderError(
          "PROVIDER_OUTPUT_MISSING",
          "The local model wrote an empty response file.",
          { provider: this.id, diagnostics: outcome.diagnostics },
        );
      }
      return { text, sessionId: outcome.sessionId };
    } finally {
      rmSync(runDirectory, { recursive: true, force: true });
    }
  }

  private spawnCodex(
    input: CodexRunInput,
    files: { schemaFile: string | undefined; outputFile: string; imageFiles: readonly string[] },
  ): Promise<{ sessionId: string | undefined; diagnostics: string }> {
    const args = this.buildArguments({
      schemaFile: files.schemaFile,
      outputFile: files.outputFile,
      sessionId: input.sessionId,
      imageFiles: files.imageFiles,
    });
    // A new process group lets a timeout reach the CLI and every tool it started.
    const detached = process.platform !== "win32";

    return new Promise((resolve, reject) => {
      const child = spawn(this.binary, args, {
        cwd: this.scratchDirectory,
        detached,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let sessionId: string | undefined;
      let stdoutTail = "";
      let stderrTail = "";
      let pending = "";
      let settled = false;
      let timedOut = false;
      let aborted = false;
      let killTimer: NodeJS.Timeout | undefined;

      const stopProcess = (signal: NodeJS.Signals): void => {
        try {
          if (detached && child.pid !== undefined) process.kill(-child.pid, signal);
          else child.kill(signal);
        } catch {
          // The process already exited.
        }
      };
      const terminate = (): void => {
        stopProcess("SIGTERM");
        killTimer = setTimeout(() => stopProcess("SIGKILL"), this.killGraceMs);
        killTimer.unref();
      };

      const timer = setTimeout(() => {
        timedOut = true;
        terminate();
      }, input.timeoutMs);
      timer.unref();

      const onAbort = (): void => {
        aborted = true;
        terminate();
      };
      input.signal?.addEventListener("abort", onAbort, { once: true });

      const cleanup = (): void => {
        clearTimeout(timer);
        if (killTimer) clearTimeout(killTimer);
        input.signal?.removeEventListener("abort", onAbort);
      };
      const fail = (error: TutorProviderError): void => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdoutTail = `${stdoutTail}${chunk}`.slice(-MAX_DIAGNOSTIC_CHARS);
        if (sessionId) return;
        pending += chunk;
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim().length === 0) continue;
          try {
            sessionId ??= extractSessionId(JSON.parse(line) as unknown);
          } catch {
            // Not every stdout line is a JSON event.
          }
        }
      });
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        stderrTail = `${stderrTail}${chunk}`.slice(-MAX_DIAGNOSTIC_CHARS);
      });

      child.on("error", (error) => {
        fail(
          new TutorProviderError(
            "PROVIDER_SPAWN_FAILED",
            `Discere could not start '${this.binary}'. Install the Codex CLI or set DISCERE_CODEX_BIN.`,
            { provider: this.id, cause: error },
          ),
        );
      });

      child.on("close", (code, signal) => {
        if (settled) return;
        settled = true;
        cleanup();
        const diagnostics = `${stderrTail}\n${stdoutTail}`.trim().slice(-MAX_DIAGNOSTIC_CHARS);
        if (aborted) {
          reject(
            new TutorProviderError("PROVIDER_ABORTED", "The generation was cancelled.", {
              provider: this.id,
              diagnostics,
            }),
          );
          return;
        }
        if (timedOut) {
          reject(
            new TutorProviderError(
              "PROVIDER_TIMEOUT",
              `The local model did not answer within ${Math.round(input.timeoutMs / 1000)} seconds.`,
              { provider: this.id, diagnostics },
            ),
          );
          return;
        }
        if (code !== 0) {
          reject(
            new TutorProviderError(
              "PROVIDER_EXITED",
              `The local model exited with ${signal ?? `code ${code ?? "unknown"}`}.`,
              { provider: this.id, diagnostics },
            ),
          );
          return;
        }
        resolve({ sessionId, diagnostics });
      });

      child.stdin.on("error", () => {
        // The CLI can close stdin early; the exit code reports the real failure.
      });
      child.stdin.end(input.prompt, "utf8");
    });
  }
}
