import type { TutorProviderId } from "@discere/contracts";
import { TutorProviderIdSchema } from "@discere/contracts";
import { CodexTutorProvider, type CodexProviderOptions } from "./codex.js";
import { CompanionTutorProvider } from "./companion-provider.js";
import { MockTutorProvider } from "./mock.js";
import type { TutorProvider } from "./types.js";

export const DEFAULT_TUTOR_PROVIDER: TutorProviderId = "companion";

/**
 * Reads the configured provider. An unknown value is a configuration fault and is reported
 * rather than silently replaced, because the choice decides whether generation is automatic.
 */
export function resolveTutorProviderId(configured?: string | undefined): TutorProviderId {
  const raw = configured?.trim();
  if (!raw) return DEFAULT_TUTOR_PROVIDER;
  const parsed = TutorProviderIdSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `DISCERE_TUTOR_PROVIDER must be one of ${TutorProviderIdSchema.options.join(", ")}. Received '${raw}'.`,
    );
  }
  return parsed.data;
}

export interface TutorProviderFactoryOptions {
  id?: TutorProviderId;
  codex?: CodexProviderOptions;
}

export function createTutorProvider(options: TutorProviderFactoryOptions = {}): TutorProvider {
  const id = options.id ?? resolveTutorProviderId(process.env["DISCERE_TUTOR_PROVIDER"]);
  if (id === "codex") return new CodexTutorProvider(options.codex ?? {});
  if (id === "mock") return new MockTutorProvider();
  return new CompanionTutorProvider();
}
