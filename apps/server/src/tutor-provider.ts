import type { TutorProviderId } from "@discere/contracts";
import {
  createTutorProvider,
  resolveTutorProviderId,
  type TutorProvider,
  type TutorProviderError,
} from "@discere/tutor-providers";
import { HttpError } from "./errors.js";

/** A short question should not hold the interface for two minutes; an essay assessment may. */
const DEFAULT_ASK_TIMEOUT_MS = 45_000;
const DEFAULT_ASSESS_TIMEOUT_MS = 120_000;

export interface TutorRuntime {
  id: TutorProviderId;
  provider: TutorProvider;
  askTimeoutMs: number;
  assessTimeoutMs: number;
}

export interface TutorRuntimeOptions {
  providerId?: TutorProviderId;
  askTimeoutMs?: number;
  assessTimeoutMs?: number;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createTutorRuntime(options: TutorRuntimeOptions = {}): TutorRuntime {
  const id = options.providerId ?? resolveTutorProviderId(process.env["DISCERE_TUTOR_PROVIDER"]);
  return {
    id,
    provider: createTutorProvider({ id }),
    askTimeoutMs:
      options.askTimeoutMs ??
      positiveInteger(process.env["DISCERE_TUTOR_ASK_TIMEOUT_MS"], DEFAULT_ASK_TIMEOUT_MS),
    assessTimeoutMs:
      options.assessTimeoutMs ??
      positiveInteger(process.env["DISCERE_TUTOR_ASSESS_TIMEOUT_MS"], DEFAULT_ASSESS_TIMEOUT_MS),
  };
}

/**
 * The interface used to show "the tutor provider failed" with nothing behind it, so a missing
 * binary and a rejected command line looked identical. The first meaningful line of provider
 * output travels with the error; the rest stays in the server log.
 */
function firstDiagnosticLine(diagnostics: string | undefined): string | undefined {
  const line = diagnostics
    ?.split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0);
  if (line === undefined) return undefined;
  return line.length > 200 ? `${line.slice(0, 197)}…` : line;
}

/**
 * A failed generation is surfaced, never replaced by a weaker answer. Each provider fault maps
 * to a status the interface can explain to the learner.
 */
export function tutorProviderHttpError(error: TutorProviderError): HttpError {
  const detail = firstDiagnosticLine(error.diagnostics);
  const options = (code: string) => ({ code, ...(detail === undefined ? {} : { detail }) });
  switch (error.code) {
    case "PROVIDER_TIMEOUT":
      return new HttpError(504, error.message, options("TUTOR_PROVIDER_TIMEOUT"));
    case "PROVIDER_SPAWN_FAILED":
    case "PROVIDER_UNAVAILABLE":
      return new HttpError(503, error.message, options("TUTOR_PROVIDER_UNAVAILABLE"));
    case "PROVIDER_WRITING_GATE":
      return new HttpError(502, error.message, options("TUTOR_WRITING_GATE"));
    case "PROVIDER_ABORTED":
      return new HttpError(499, error.message, options("TUTOR_PROVIDER_ABORTED"));
    // A bad session identifier is a fault in the request, not in the provider.
    case "PROVIDER_SESSION_INVALID":
      return new HttpError(400, error.message, options("TUTOR_SESSION_INVALID"));
    // Nothing is wrong; the queue is full and the caller should come back.
    case "PROVIDER_BUSY":
      return new HttpError(429, error.message, options("TUTOR_PROVIDER_BUSY"));
    default:
      return new HttpError(502, error.message, options("TUTOR_PROVIDER_FAILED"));
  }
}
