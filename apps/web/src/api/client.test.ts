import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  errorCode,
  errorMessage,
  isEngineUnavailable,
  requestJson,
  shouldRetryQuery,
} from "./client.js";
import { resetEngineStatus } from "./engine-status.js";

afterEach(() => {
  vi.unstubAllGlobals();
  resetEngineStatus();
});

function reply(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("api client", () => {
  it("returns the parsed body on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply(200, { status: "ok" })),
    );
    await expect(requestJson<{ status: string }>("/api/health")).resolves.toEqual({ status: "ok" });
  });

  it("says a request is JSON only when it has a body, so a bodyless DELETE is accepted", async () => {
    const fetch = vi.fn(async () => reply(200, {}));
    vi.stubGlobal("fetch", fetch);
    await requestJson("/api/courses/maths-foundations/progress", { method: "DELETE" });
    await requestJson("/api/attempts", { method: "POST", body: "{}" });
    const headers = fetch.mock.calls.map(
      (call) => ((call as unknown[])[1] as RequestInit).headers as Record<string, string>,
    );
    expect(headers[0]).not.toHaveProperty("content-type");
    expect(headers[1]).toHaveProperty("content-type", "application/json");
  });

  it("keeps the server code and status on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        reply(403, { code: "EXAM_GUARDRAIL", message: "Assistance is unavailable in Exam mode." }),
      ),
    );
    const failure = await requestJson("/api/tutor/ask", { method: "POST" }).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(ApiError);
    expect(errorCode(failure)).toBe("EXAM_GUARDRAIL");
    expect((failure as ApiError).status).toBe(403);
    expect(errorMessage(failure, "fallback")).toBe("Assistance is unavailable in Exam mode.");
  });

  it("reports an unreachable server rather than a parse failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("connect ECONNREFUSED");
      }),
    );
    const failure = await requestJson("/api/home").catch((error: unknown) => error);
    expect(errorCode(failure)).toBe("NETWORK_UNAVAILABLE");
  });

  it("falls back when a failure body carries no code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply(500, null)),
    );
    const failure = await requestJson("/api/home").catch((error: unknown) => error);
    expect(errorCode(failure)).toBe("REQUEST_FAILED");
    expect(errorMessage(failure, "fallback")).toBe(
      "Discere’s engine could not finish that request. Try again in a moment.",
    );
  });

  it("names a gateway failure with no Discere body as the engine not responding", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply(502, null)),
    );
    const failure = await requestJson("/api/home").catch((error: unknown) => error);
    expect(isEngineUnavailable(failure)).toBe(true);
    expect(errorMessage(failure, "fallback")).toMatch(/engine isn’t responding/);
    expect(errorMessage(failure, "fallback")).not.toMatch(/502/);
  });

  it("does not retry what will fail the same way again", () => {
    expect(shouldRetryQuery(0, new ApiError("x", 0, "NETWORK_UNAVAILABLE"))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError("x", 404, "NOT_FOUND"))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError("x", 500, "REQUEST_FAILED"))).toBe(true);
    expect(shouldRetryQuery(1, new ApiError("x", 500, "REQUEST_FAILED"))).toBe(false);
  });
});
