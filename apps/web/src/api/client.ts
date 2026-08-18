/** A failed API call keeps its status and server code so the interface can explain itself. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorBody {
  code?: unknown;
  message?: unknown;
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
    throw new ApiError(message, response.status, code);
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
