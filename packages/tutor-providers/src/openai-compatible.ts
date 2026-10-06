import { TutorProviderError } from "./errors.js";
import { type DriverInput, type DriverOutput, PipelineTutorProvider } from "./pipeline.js";
import { type ModelTier, type RoutingMode, resolveRoutingMode } from "./routing.js";

export interface OpenAICompatibleOptions {
  /** API root, e.g. https://api.openai.com/v1, https://openrouter.ai/api/v1, http://localhost:11434/v1. */
  baseUrl?: string;
  apiKey?: string;
  fastModel?: string;
  smartModel?: string;
  routing?: RoutingMode;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const SYSTEM_PROMPT =
  "You are the tutor inside Discere, a learning platform. Follow the instructions in the user message exactly. " +
  "Return only the JSON object the schema describes.";

function base64(data: Uint8Array): string {
  return Buffer.from(data).toString("base64");
}

/**
 * Drives the tutor through any server that speaks the OpenAI chat-completions protocol: OpenAI
 * itself, OpenRouter, a local Ollama or LM Studio, or a hosted gateway. This is the path for
 * someone who wants their own model or key rather than a CLI subscription.
 *
 * Configure with `DISCERE_AI_BASE_URL`, `DISCERE_AI_API_KEY`, `DISCERE_AI_FAST_MODEL` and
 * `DISCERE_AI_SMART_MODEL` (the smart model defaults to the fast one). Conversations are not
 * resumable through this protocol, so each tutor turn carries its own context.
 */
export class OpenAICompatibleTutorProvider extends PipelineTutorProvider {
  readonly id = "openai-compatible";
  readonly label: string;
  protected readonly defaultTimeoutMs: number;
  protected readonly routing: RoutingMode;
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly fastModel: string;
  private readonly smartModel: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenAICompatibleOptions = {}) {
    super();
    const env = process.env;
    this.baseUrl = (options.baseUrl ?? env["DISCERE_AI_BASE_URL"]?.trim() ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    this.apiKey = options.apiKey ?? (env["DISCERE_AI_API_KEY"]?.trim() || undefined);
    this.fastModel = options.fastModel ?? (env["DISCERE_AI_FAST_MODEL"]?.trim() || "gpt-4o-mini");
    this.smartModel = options.smartModel ?? (env["DISCERE_AI_SMART_MODEL"]?.trim() || this.fastModel);
    this.routing = options.routing ?? resolveRoutingMode(env["DISCERE_AI_ROUTING"]);
    this.defaultTimeoutMs = options.timeoutMs ?? 120_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.label = `OpenAI-compatible API (${new URL(this.baseUrl).host})`;
  }

  protected modelFor(tier: ModelTier): string {
    return tier === "fast" ? this.fastModel : this.smartModel;
  }

  protected async execute(input: DriverInput): Promise<DriverOutput> {
    const model = this.modelFor(input.tier);
    const content: Array<Record<string, unknown>> = [{ type: "text", text: input.prompt }];
    for (const image of input.images)
      content.push({ type: "image_url", image_url: { url: `data:image/png;base64,${base64(image.data)}` } });
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: input.images.length ? content : input.prompt },
      ],
    };
    if (input.outputSchema !== undefined)
      body["response_format"] = { type: "json_schema", json_schema: { name: "discere_payload", schema: input.outputSchema } };
    else body["response_format"] = { type: "json_object" };

    const timeout = AbortSignal.timeout(input.timeoutMs);
    const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (input.signal?.aborted)
        throw new TutorProviderError("PROVIDER_ABORTED", "The generation was cancelled.", { provider: this.id });
      if (timeout.aborted)
        throw new TutorProviderError("PROVIDER_TIMEOUT", `The model did not answer within ${Math.round(input.timeoutMs / 1000)} seconds.`, {
          provider: this.id,
        });
      throw new TutorProviderError("PROVIDER_UNAVAILABLE", `Discere could not reach ${this.baseUrl}.`, { provider: this.id, cause: error });
    }
    const raw = await response.text();
    if (!response.ok) {
      const unavailable = response.status === 401 || response.status === 403 || response.status === 404;
      throw new TutorProviderError(
        unavailable ? "PROVIDER_UNAVAILABLE" : "PROVIDER_EXITED",
        unavailable
          ? `The AI endpoint refused the request (${response.status}). Check DISCERE_AI_API_KEY and the model names.`
          : `The AI endpoint answered ${response.status}.`,
        { provider: this.id, diagnostics: raw.slice(0, 4_000) },
      );
    }
    let parsed: {
      choices?: Array<{ message?: { content?: string | null } }>;
      model?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch (error) {
      throw new TutorProviderError("PROVIDER_OUTPUT_INVALID", "The AI endpoint did not return JSON.", {
        provider: this.id,
        diagnostics: raw.slice(0, 4_000),
        cause: error,
      });
    }
    const text = parsed.choices?.[0]?.message?.content ?? "";
    if (!text.trim())
      throw new TutorProviderError("PROVIDER_OUTPUT_MISSING", "The model returned an empty answer.", {
        provider: this.id,
        diagnostics: raw.slice(0, 4_000),
      });
    return {
      text,
      model: parsed.model ?? model,
      inputTokens: parsed.usage?.prompt_tokens ?? 0,
      outputTokens: parsed.usage?.completion_tokens ?? 0,
    };
  }
}
