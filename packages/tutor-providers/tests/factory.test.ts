import { describe, expect, it } from "vitest";
import {
  CodexTutorProvider,
  CompanionTutorProvider,
  createTutorProvider,
  MockTutorProvider,
  resolveTutorProviderId,
  TutorProviderError,
} from "../src/index.js";

describe("tutor provider selection", () => {
  it("keeps the copy/paste companion as the default", () => {
    expect(resolveTutorProviderId(undefined)).toBe("companion");
    expect(resolveTutorProviderId("  ")).toBe("companion");
    expect(createTutorProvider({ id: "companion" })).toBeInstanceOf(CompanionTutorProvider);
  });

  it("reports an unusable configuration instead of choosing a provider silently", () => {
    expect(() => resolveTutorProviderId("gpt5")).toThrow(/DISCERE_TUTOR_PROVIDER/);
  });

  it("builds each supported provider", () => {
    expect(createTutorProvider({ id: "codex" })).toBeInstanceOf(CodexTutorProvider);
    expect(createTutorProvider({ id: "mock" })).toBeInstanceOf(MockTutorProvider);
  });

  it("tells the caller that the companion provider cannot answer in place", async () => {
    const provider = new CompanionTutorProvider();
    expect(provider.generatesInProcess).toBe(false);
    const error = await provider
      .generate({ operation: "tutor_reply", requestId: "r", payload: {} })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(TutorProviderError);
    expect((error as TutorProviderError).code).toBe("PROVIDER_UNAVAILABLE");
  });
});
