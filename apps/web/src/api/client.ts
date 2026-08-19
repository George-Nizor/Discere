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

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "content-type": "application/json", ...init?.headers },
      ...init,
    });
  } catch {
    throw new ApiError("Discere could not reach the local server.", 0, "NETWORK_UNAVAILABLE");
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
    const message =
      typeof details.message === "string"
        ? details.message
        : `The request failed with status ${response.status}.`;
    const code = typeof details.code === "string" ? details.code : "REQUEST_FAILED";
    const detail = typeof details.detail === "string" ? details.detail : null;
    throw new ApiError(message, response.status, code, detail);
  }
  return body as T;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
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
