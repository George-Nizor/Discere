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
  it("auto-detects a driver, falling back to the copy/paste companion", () => {
    const none = () => ({ claude: false, api: false, codex: false });
    expect(resolveTutorProviderId(undefined, none)).toBe("companion");
    expect(resolveTutorProviderId("  ", none)).toBe("companion");
    expect(resolveTutorProviderId("auto", () => ({ claude: true, api: true, codex: true }))).toBe("claude");
    expect(resolveTutorProviderId(undefined, () => ({ claude: false, api: true, codex: true }))).toBe(
      "openai-compatible",
    );
    expect(resolveTutorProviderId(undefined, () => ({ claude: false, api: false, codex: true }))).toBe("codex");
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
