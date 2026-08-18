import type { TutorProviderId } from "@discere/contracts";
import {
  createTutorProvider,
  resolveTutorProviderId,
  TutorProviderError,
  type TutorProvider,
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
 * A failed generation is surfaced, never replaced by a weaker answer. Each provider fault maps
 * to a status the interface can explain to the learner.
 */
export function tutorProviderHttpError(error: TutorProviderError): HttpError {
  switch (error.code) {
    case "PROVIDER_TIMEOUT":
      return new HttpError(504, error.message, "TUTOR_PROVIDER_TIMEOUT");
    case "PROVIDER_SPAWN_FAILED":
    case "PROVIDER_UNAVAILABLE":
      return new HttpError(503, error.message, "TUTOR_PROVIDER_UNAVAILABLE");
    case "PROVIDER_WRITING_GATE":
      return new HttpError(502, error.message, "TUTOR_WRITING_GATE");
    case "PROVIDER_ABORTED":
      return new HttpError(499, error.message, "TUTOR_PROVIDER_ABORTED");
    default:
      return new HttpError(502, error.message, "TUTOR_PROVIDER_FAILED");
  }
}
