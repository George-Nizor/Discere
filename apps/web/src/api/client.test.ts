import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, errorCode, errorMessage, requestJson } from "./client.js";

afterEach(() => vi.unstubAllGlobals());

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
    expect(errorMessage(failure, "fallback")).toBe("The request failed with status 500.");
  });
});
