import { spawnSync } from "node:child_process";
import type { TutorProviderId } from "@discere/contracts";
import { TutorProviderIdSchema } from "@discere/contracts";
import { ClaudeTutorProvider, type ClaudeProviderOptions } from "./claude.js";
import { CodexTutorProvider, type CodexProviderOptions } from "./codex.js";
import { CompanionTutorProvider } from "./companion-provider.js";
import { MockTutorProvider } from "./mock.js";
import { OpenAICompatibleTutorProvider, type OpenAICompatibleOptions } from "./openai-compatible.js";
import type { TutorProvider } from "./types.js";

/** Used when nothing is configured and no model can be detected. */
export const DEFAULT_TUTOR_PROVIDER: TutorProviderId = "companion";

export interface AvailableDrivers {
  claude: boolean;
  api: boolean;
  codex: boolean;
}

function onPath(binary: string): boolean {
  try {
    return spawnSync(binary, ["--version"], { encoding: "utf8", timeout: 5_000 }).status === 0;
  } catch {
    return false;
  }
}

let detected: AvailableDrivers | undefined;
/** What this machine can drive. Probed once per process; a CLI does not appear mid-session. */
export function detectDrivers(env: NodeJS.ProcessEnv = process.env): AvailableDrivers {
  detected ??= {
    claude: onPath(env["DISCERE_CLAUDE_BIN"]?.trim() || "claude"),
    api: Boolean(env["DISCERE_AI_API_KEY"]?.trim() || env["DISCERE_AI_BASE_URL"]?.trim()),
    codex: onPath(env["DISCERE_CODEX_BIN"]?.trim() || "codex"),
  };
  return detected;
}

/**
 * Reads the configured provider. Unset or `auto` picks the first driver this machine has, in
 * order: Claude Code, an OpenAI-compatible API, Codex, then the copy/paste companion. An unknown
 * value is a configuration fault and is reported rather than silently replaced.
 */
export function resolveTutorProviderId(
  configured?: string | undefined,
  available: () => AvailableDrivers = detectDrivers,
): TutorProviderId {
  const raw = configured?.trim();
  if (!raw || raw === "auto") {
    const drivers = available();
    if (drivers.claude) return "claude";
    if (drivers.api) return "openai-compatible";
    if (drivers.codex) return "codex";
    return DEFAULT_TUTOR_PROVIDER;
  }
  const parsed = TutorProviderIdSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `DISCERE_TUTOR_PROVIDER must be auto or one of ${TutorProviderIdSchema.options.join(", ")}. Received '${raw}'.`,
    );
  }
  return parsed.data;
}

export interface TutorProviderFactoryOptions {
  id?: TutorProviderId;
  codex?: CodexProviderOptions;
  claude?: ClaudeProviderOptions;
  openai?: OpenAICompatibleOptions;
}

/**
 * Adding a model driver: extend `PipelineTutorProvider` (see `pipeline.ts`), implement `execute`
 * (send a prompt, return text) and `modelFor`, add its id to `TutorProviderIdSchema`, and return
 * it here. Routing, retries, schema checks and the writing gate come with the base class.
 */
export function createTutorProvider(options: TutorProviderFactoryOptions = {}): TutorProvider {
  const id = options.id ?? resolveTutorProviderId(process.env["DISCERE_TUTOR_PROVIDER"]);
  switch (id) {
    case "claude":
      return new ClaudeTutorProvider(options.claude ?? {});
    case "openai-compatible":
      return new OpenAICompatibleTutorProvider(options.openai ?? {});
    case "codex":
      return new CodexTutorProvider(options.codex ?? {});
    case "mock":
      return new MockTutorProvider();
    default:
      return new CompanionTutorProvider();
  }
}
