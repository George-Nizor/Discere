/**
 * The HTTP side of the MCP server. Every tool goes through here so a stopped Discere,
 * a slow Discere and a Discere that answers with an error all read the same way to the caller.
 */

/** The port Instrumenta launches Discere on. Overridden by DISCERE_URL when set. */
const DEFAULT_BASE_URL = "http://127.0.0.1:49323";

/** Long enough for a tutor generation to answer, short enough that a hung server is reported. */
const REQUEST_TIMEOUT_MS = 15_000;

/** Enough of an unexpected body to identify it, without pasting a whole page into the reply. */
const BODY_EXCERPT_LIMIT = 500;

export type ApiResult =
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly message: string;
    };

/** Read at call time, not at import time, so a launcher can set DISCERE_URL after loading us. */
export function baseUrl(): string {
  const configured = process.env["DISCERE_URL"]?.trim();
  const chosen = configured && configured.length > 0 ? configured : DEFAULT_BASE_URL;
  return chosen.replace(/\/+$/, "");
}

export function apiUrl(path: string): string {
  return `${baseUrl()}${path}`;
}

/** Path segments come from tool input, so they are escaped rather than trusted. */
export function segment(value: string): string {
  return encodeURIComponent(value);
}

function excerpt(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= BODY_EXCERPT_LIMIT) return trimmed;
  return `${trimmed.slice(0, BODY_EXCERPT_LIMIT)}...`;
}

/**
 * The message shown when the request never reached a server. It names the URL that was tried
 * and how to start Discere, because "fetch failed" on its own tells the caller nothing.
 */
function unreachableMessage(method: string, url: string, error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  const detail =
    name === "TimeoutError" || name === "AbortError"
      ? `The request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`
      : `The connection failed (${error instanceof Error ? error.message : String(error)}).`;
  return [
    `Discere is not reachable at ${url} (${method}).`,
    detail,
    'Start it first: run "pnpm start" in the Discere repository, or launch Discere from Instrumenta.',
    "If Discere is running on another address, set DISCERE_URL to it.",
    "No data is being reported for this call.",
  ].join(" ");
}

/** The failure message for a server that answered, but not with success. */
function httpErrorMessage(method: string, url: string, status: number, body: string): string {
  const parsed = parseJson(body);
  if (parsed !== undefined && typeof parsed === "object" && parsed !== null) {
    const record = parsed as Record<string, unknown>;
    const code = typeof record["code"] === "string" ? record["code"] : "UNKNOWN";
    const message = typeof record["message"] === "string" ? record["message"] : excerpt(body);
    return `Discere answered ${method} ${url} with HTTP ${status}: ${code} - ${message}`;
  }
  return `Discere answered ${method} ${url} with HTTP ${status}: ${excerpt(body) || "(empty body)"}`;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function request(method: string, path: string, body?: unknown): Promise<ApiResult> {
  const url = apiUrl(path);
  let response: Response;
  let text: string;
  try {
    response = await fetch(url, {
      method,
      headers:
        body === undefined
          ? { accept: "application/json" }
          : {
              accept: "application/json",
              "content-type": "application/json",
            },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    text = await response.text();
  } catch (error) {
    return { ok: false, message: unreachableMessage(method, url, error) };
  }

  if (!response.ok) {
    return { ok: false, message: httpErrorMessage(method, url, response.status, text) };
  }

  const value = parseJson(text);
  if (value === undefined) {
    return {
      ok: false,
      message: `Discere answered ${method} ${url} with HTTP ${response.status} but the body was not JSON: ${excerpt(text)}`,
    };
  }
  return { ok: true, value };
}

export function getJson(path: string): Promise<ApiResult> {
  return request("GET", path);
}

export function postJson(path: string, body: unknown): Promise<ApiResult> {
  return request("POST", path, body);
}
