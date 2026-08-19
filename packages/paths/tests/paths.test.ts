import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_DATABASE_PATH,
  repoRoot,
  resolveDatabasePath,
  resolveFromRepoRoot,
  resolvePromptsDirectory,
} from "../src/index.js";

describe("repository paths", () => {
  it("finds the workspace root regardless of the working directory", () => {
    expect(existsSync(path.join(repoRoot(), "pnpm-workspace.yaml"))).toBe(true);
  });

  it("resolves the default database inside the repository root", () => {
    expect(resolveDatabasePath()).toBe(resolveFromRepoRoot(DEFAULT_DATABASE_PATH));
    expect(resolveDatabasePath("")).toBe(resolveFromRepoRoot(DEFAULT_DATABASE_PATH));
  });

  it("treats a configured relative path as repository relative", () => {
    expect(resolveDatabasePath("./data/discere.sqlite")).toBe(
      resolveFromRepoRoot(DEFAULT_DATABASE_PATH),
    );
  });

  it("keeps absolute paths and the in-memory marker", () => {
    const absolute = path.resolve(repoRoot(), "elsewhere.sqlite");
    expect(resolveDatabasePath(absolute)).toBe(absolute);
    expect(resolveDatabasePath(":memory:")).toBe(":memory:");
  });

  it("resolves the prompt directory inside the repository root", () => {
    expect(resolvePromptsDirectory()).toBe(resolveFromRepoRoot("prompts"));
    expect(existsSync(resolvePromptsDirectory())).toBe(true);
  });
});
