import { randomUUID } from "node:crypto";
import type { StyleViolation } from "@discere/contracts";
import { StyleEditDraftSchema } from "@discere/contracts";
import { lintText } from "@discere/writing-engine";
import { z } from "zod";
import { parseModelJson } from "./codex.js";
import { TutorProviderError } from "./errors.js";
import { buildTutorPrompt } from "./prompt.js";
import { chooseTier, type ModelTier, type RoutingDecision, type RoutingMode } from "./routing.js";
import type {
  TutorGenerateOptions,
  TutorImageAttachment,
  TutorLintTarget,
  TutorProvider,
  TutorRequest,
  TutorResponse,
} from "./types.js";

/**
 * The machinery every model driver shares, so adding a driver means answering one question —
 * "send this prompt, return the model's text" — and nothing about safety is re-implemented:
 * one queue per process (a single learner on one plan), a deadline that starts when the request
 * is accepted, retries that escalate from the fast model to the capable one, schema parsing,
 * and the writing-gate repair pass.
 */

const MAX_DIAGNOSTIC_CHARS = 4_000;
const MAX_QUEUE_DEPTH = 3;

export interface DriverInput {
  prompt: string;
  outputSchema: unknown;
  timeoutMs: number;
  sessionId: string | undefined;
  signal: AbortSignal | undefined;
  images: readonly TutorImageAttachment[];
  tier: ModelTier;
  operation: TutorRequest["operation"];
  /** False for one-shot work such as style repairs, which should leave no saved session. */
  persistSession: boolean;
}

export interface DriverOutput {
  text: string;
  sessionId?: string;
  model?: string;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface UsageEntry {
  at: string;
  provider: string;
  model: string;
  tier: ModelTier;
  operation: string;
  reason: string;
  ok: boolean;
  durationMs: number;
  costUsd: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface AiRuntimeStatus {
  queueDepth: number;
  lastOutcome: "none" | "ok" | "error";
  lastError: string;
  calls: number;
  /** Totals since the server started, by model. Cost is the provider's own figure when given. */
  byModel: Record<string, { calls: number; costUsd: number; inputTokens: number; outputTokens: number }>;
  recent: UsageEntry[];
}

const status: AiRuntimeStatus = {
  queueDepth: 0,
  lastOutcome: "none",
  lastError: "",
  calls: 0,
  byModel: {},
  recent: [],
};
let queue: Promise<unknown> = Promise.resolve();

export function aiRuntimeStatus(): AiRuntimeStatus {
  return structuredClone(status);
}

function record(entry: UsageEntry) {
  status.calls += 1;
  const totals = status.byModel[entry.model] ?? { calls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 };
  status.byModel[entry.model] = totals;
  totals.calls += 1;
  totals.costUsd += entry.costUsd ?? 0;
  totals.inputTokens += entry.inputTokens ?? 0;
  totals.outputTokens += entry.outputTokens ?? 0;
  status.recent = [entry, ...status.recent].slice(0, 25);
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
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
  if (current !== null && typeof current === "object") (current as Record<string, unknown>)[last] = value;
}

function hardViolations(text: string, target: TutorLintTarget): StyleViolation[] {
  return lintText(text, {
    context: target.context,
    ...(target.hiddenAnswer === undefined ? {} : { hiddenAnswer: target.hiddenAnswer }),
  }).violations.filter((violation) => violation.severity === "hard");
}

export abstract class PipelineTutorProvider implements TutorProvider {
  abstract readonly id: string;
  abstract readonly label: string;
  readonly generatesInProcess = true;
  protected abstract readonly defaultTimeoutMs: number;
  protected abstract readonly routing: RoutingMode;

  /** Send one prompt to the model and return its text. Throw `TutorProviderError` on failure. */
  protected abstract execute(input: DriverInput): Promise<DriverOutput>;
  /** The model a tier maps to, for the usage ledger. */
  protected abstract modelFor(tier: ModelTier): string;
  /** Refuse a session identifier the driver cannot safely use. */
  protected assertSession(_sessionId: string | undefined): void {}

  async generate<TRequest, TResponse>(
    request: TutorRequest<TRequest>,
    options: TutorGenerateOptions = {},
  ): Promise<TutorResponse<TResponse>> {
    if (status.queueDepth >= MAX_QUEUE_DEPTH)
      throw new TutorProviderError("PROVIDER_BUSY", "The tutor is already working through other requests.", {
        provider: this.id,
      });
    const deadlineMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    const abortUpstream = () => controller.abort();
    options.signal?.addEventListener("abort", abortUpstream, { once: true });
    status.queueDepth += 1;
    const work = enqueue(() => this.run<TRequest, TResponse>(request, { ...options, signal: controller.signal })).finally(
      () => {
        status.queueDepth -= 1;
        options.signal?.removeEventListener("abort", abortUpstream);
      },
    );
    let deadline: NodeJS.Timeout | undefined;
    try {
      const response = await new Promise<TutorResponse<TResponse>>((resolve, reject) => {
        deadline = setTimeout(() => {
          controller.abort();
          reject(
            new TutorProviderError("PROVIDER_TIMEOUT", `The tutor did not answer within ${Math.round(deadlineMs / 1000)} seconds.`, {
              provider: this.id,
            }),
          );
        }, deadlineMs);
        deadline.unref();
        work.then(resolve, reject);
      });
      status.lastOutcome = "ok";
      status.lastError = "";
      return response;
    } catch (error) {
      status.lastOutcome = "error";
      status.lastError = error instanceof Error ? error.message : String(error);
      void work.catch(() => undefined);
      throw error;
    } finally {
      if (deadline) clearTimeout(deadline);
    }
  }

  /** Runs the driver once and writes the outcome to the usage ledger. */
  private async call(input: DriverInput, decision: RoutingDecision): Promise<DriverOutput> {
    const started = Date.now();
    const base = {
      at: new Date().toISOString(),
      provider: this.id,
      tier: input.tier,
      operation: input.operation,
      reason: decision.reason,
    };
    try {
      const output = await this.execute(input);
      record({
        ...base,
        model: output.model ?? this.modelFor(input.tier),
        ok: true,
        durationMs: Date.now() - started,
        costUsd: output.costUsd ?? null,
        inputTokens: output.inputTokens ?? null,
        outputTokens: output.outputTokens ?? null,
      });
      return output;
    } catch (error) {
      record({
        ...base,
        model: this.modelFor(input.tier),
        ok: false,
        durationMs: Date.now() - started,
        costUsd: null,
        inputTokens: null,
        outputTokens: null,
      });
      throw error;
    }
  }

  private async run<TRequest, TResponse>(
    request: TutorRequest<TRequest>,
    options: TutorGenerateOptions,
  ): Promise<TutorResponse<TResponse>> {
    const prompt = buildTutorPrompt(request, {
      envelope: false,
      ...(options.systemPrompt === undefined ? {} : { systemPrompt: options.systemPrompt }),
      ...(options.extraInstructions === undefined ? {} : { extraInstructions: options.extraInstructions }),
    });
    const maxAttempts = Math.max(1, options.maxAttempts ?? 2);
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    this.assertSession(options.sessionId);
    const payload = request.payload as Record<string, unknown> | null;
    const question = payload && typeof payload["question"] === "string" ? (payload["question"] as string) : undefined;
    const payloadText = JSON.stringify(request.payload ?? null);

    let lastError: TutorProviderError | undefined;
    let sessionId = options.sessionId;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const decision = chooseTier({
        operation: request.operation,
        promptText: payloadText,
        hasImages: (options.images ?? []).length > 0,
        attempt,
        mode: this.routing,
        ...(question === undefined ? {} : { question }),
      });
      try {
        const output = await this.call(
          {
            prompt,
            outputSchema: options.outputSchema,
            timeoutMs,
            sessionId,
            signal: options.signal,
            images: options.images ?? [],
            tier: decision.tier,
            operation: request.operation,
            persistSession: request.operation === "tutor_reply",
          },
          decision,
        );
        sessionId = output.sessionId ?? sessionId;
        const accepted = this.acceptPayload(output.text, options);
        const repaired = await this.repairWriting(accepted, options, timeoutMs, request.operation);
        return {
          protocolVersion: "0.2",
          operation: request.operation,
          requestId: request.requestId,
          generatedAt: new Date().toISOString(),
          payload: repaired as TResponse,
          modelNotes: [`${output.model ?? this.modelFor(decision.tier)} (${decision.reason})`],
          ...(sessionId === undefined ? {} : { sessionId }),
        };
      } catch (error) {
        if (!(error instanceof TutorProviderError)) throw error;
        if (error.code === "PROVIDER_WRITING_GATE" || error.code === "PROVIDER_ABORTED") throw error;
        // A missing or unusable binary, a timeout or a full queue will not improve on a retry.
        if (error.code === "PROVIDER_SPAWN_FAILED" || error.code === "PROVIDER_TIMEOUT" || error.code === "PROVIDER_UNAVAILABLE")
          throw error;
        lastError = error;
      }
    }
    throw new TutorProviderError(
      lastError?.code ?? "PROVIDER_OUTPUT_INVALID",
      lastError?.message ?? "The model did not return a usable response.",
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
      throw new TutorProviderError("PROVIDER_OUTPUT_INVALID", "The generated response did not match the requested shape.", {
        provider: this.id,
        diagnostics: JSON.stringify(payload).slice(0, MAX_DIAGNOSTIC_CHARS),
        cause: error,
      });
    }
  }

  /** One targeted repair pass on the fast model; a passage that still fails is reported, not shown. */
  private async repairWriting(
    payload: unknown,
    options: TutorGenerateOptions,
    timeoutMs: number,
    operation: TutorRequest["operation"],
  ): Promise<unknown> {
    const targets = options.lintTargets ?? [];
    const failing = targets
      .map((target) => ({ target, text: readPath(payload, target.path) }))
      .filter((entry): entry is { target: TutorLintTarget; text: string } => typeof entry.text === "string")
      .map((entry) => ({ ...entry, violations: hardViolations(entry.text, entry.target) }))
      .filter((entry) => entry.violations.length > 0);
    if (failing.length === 0) return payload;
    const remaining: StyleViolation[] = [];
    for (const entry of failing) {
      const revised = await this.editStyle(entry.text, entry.violations, timeoutMs, options.signal, operation);
      const still = hardViolations(revised, entry.target);
      if (still.length) remaining.push(...still);
      else writePath(payload, entry.target.path, revised);
    }
    if (remaining.length)
      throw new TutorProviderError(
        "PROVIDER_WRITING_GATE",
        "The generated response still breaks the Discere writing contract after one repair pass.",
        { provider: this.id, attempts: 2, violations: remaining },
      );
    return options.parsePayload ? options.parsePayload(payload) : payload;
  }

  private async editStyle(
    text: string,
    violations: readonly StyleViolation[],
    timeoutMs: number,
    signal: AbortSignal | undefined,
    operation: TutorRequest["operation"],
  ): Promise<string> {
    const prompt = buildTutorPrompt(
      {
        operation: "edit_style",
        requestId: randomUUID(),
        payload: {
          draft: text,
          violations: violations.map((v) => ({ ruleId: v.ruleId, message: v.message, start: v.start, end: v.end, excerpt: v.excerpt })),
          instruction:
            "Repair only the flagged spans. Preserve every number, unit, equation, citation, and answer boundary already present.",
        },
      },
      {
        systemPrompt: "style-editor",
        envelope: false,
        extraInstructions: ["Do not add new facts, examples, or solution steps while repairing the flagged spans."],
      },
    );
    const output = await this.call(
      {
        prompt,
        outputSchema: z.toJSONSchema(StyleEditDraftSchema),
        timeoutMs,
        sessionId: undefined,
        signal,
        images: [],
        tier: "fast",
        operation: "edit_style",
        persistSession: false,
      },
      { tier: "fast", reason: `style repair for ${operation}` },
    );
    const parsed = StyleEditDraftSchema.safeParse(parseModelJson(output.text));
    if (!parsed.success)
      throw new TutorProviderError("PROVIDER_OUTPUT_INVALID", "The style editor did not return a usable revision.", {
        provider: this.id,
        diagnostics: output.text.slice(0, MAX_DIAGNOSTIC_CHARS),
      });
    return parsed.data.revisedText;
  }
}
