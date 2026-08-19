import type { StyleViolation } from "@discere/contracts";

/**
 * Every generation failure is reported, never smoothed over. A caller that cannot show a
 * grounded reply must tell the learner why rather than presenting a degraded one.
 */
export type TutorProviderErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_SPAWN_FAILED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_EXITED"
  | "PROVIDER_OUTPUT_MISSING"
  | "PROVIDER_OUTPUT_INVALID"
  | "PROVIDER_WRITING_GATE"
  | "PROVIDER_ABORTED"
  /** The caller supplied a session identifier the provider will not put on a command line. */
  | "PROVIDER_SESSION_INVALID";

export interface TutorProviderErrorOptions {
  provider: string;
  attempts?: number;
  /** Trimmed process output kept for the local operator, never shown to a learner. */
  diagnostics?: string;
  violations?: readonly StyleViolation[];
  cause?: unknown;
}

export class TutorProviderError extends Error {
  readonly code: TutorProviderErrorCode;
  readonly provider: string;
  readonly attempts: number;
  readonly diagnostics: string | undefined;
  readonly violations: readonly StyleViolation[];

  constructor(code: TutorProviderErrorCode, message: string, options: TutorProviderErrorOptions) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "TutorProviderError";
    this.code = code;
    this.provider = options.provider;
    this.attempts = options.attempts ?? 1;
    this.diagnostics = options.diagnostics;
    this.violations = options.violations ?? [];
  }
}

export function isTutorProviderError(value: unknown): value is TutorProviderError {
  return value instanceof TutorProviderError;
}
