import { reportEngineAnswered, reportEngineUnreachable } from "./engine-status.js";

/** A failed API call keeps its status and server code so the interface can explain itself. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    /** One short line naming the underlying cause, when the server knows one. */
    readonly detail: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorBody {
  code?: unknown;
  message?: unknown;
  detail?: unknown;
}

/** Said wherever Discere's own local engine stops answering. It is the one failure the learner can fix. */
export const ENGINE_UNAVAILABLE_MESSAGE =
  "Discere’s engine isn’t responding. Reopen Discere from Instrumenta, then try again.";

/**
 * A gateway status with no Discere error body means nothing behind the proxy answered: the
 * local engine stopped. A status the engine itself sent always carries a JSON code.
 */
const GATEWAY_STATUSES = new Set([502, 503, 504]);

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "content-type": "application/json", ...init?.headers },
      ...init,
    });
  } catch {
    reportEngineUnreachable();
    throw new ApiError(ENGINE_UNAVAILABLE_MESSAGE, 0, "NETWORK_UNAVAILABLE");
  }
  const text = await response.text();
  let body: unknown = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    const details = (body ?? {}) as ErrorBody;
    if (GATEWAY_STATUSES.has(response.status) && typeof details.code !== "string") {
      reportEngineUnreachable();
      throw new ApiError(ENGINE_UNAVAILABLE_MESSAGE, response.status, "NETWORK_UNAVAILABLE");
    }
    reportEngineAnswered();
    const message =
      typeof details.message === "string"
        ? details.message
        : "Discere’s engine could not finish that request. Try again in a moment.";
    const code = typeof details.code === "string" ? details.code : "REQUEST_FAILED";
    const detail = typeof details.detail === "string" ? details.detail : null;
    throw new ApiError(message, response.status, code, detail);
  }
  reportEngineAnswered();
  return body as T;
}

export function errorMessage(error: unknown, fallback: string): string {
  // The engine's generic schema refusal is written for developers; the learner gets the
  // screen's own sentence instead.
  if (error instanceof ApiError && error.code === "VALIDATION_ERROR") return fallback;
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** True when the engine itself is unreachable, as opposed to refusing one request. */
export function isEngineUnavailable(error: unknown): boolean {
  return error instanceof ApiError && error.code === "NETWORK_UNAVAILABLE";
}

/**
 * Retry policy for reads. An unreachable engine or a request the engine refused will give the
 * same answer a moment later, so only an unexplained server failure is tried once more.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (!(error instanceof ApiError)) return true;
  return error.status >= 500 && !isEngineUnavailable(error);
}

export function errorCode(error: unknown): string | null {
  return error instanceof ApiError ? error.code : null;
}

/**
 * The generic sentence tells the learner a request failed; this tells them, and the owner,
 * what actually went wrong. Shown quietly beneath the notice rather than in place of it.
 */
export function errorDetail(error: unknown): string | null {
  return error instanceof ApiError ? error.detail : null;
}
