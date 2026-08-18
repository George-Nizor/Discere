import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Every Discere path is resolved from the repository root rather than the working
 * directory. pnpm runs workspace scripts with the package directory as the working
 * directory, so a relative path such as `./data/discere.sqlite` would otherwise point
 * at a different file for each package that reads it.
 */
const WORKSPACE_MARKER = "pnpm-workspace.yaml";

export const DEFAULT_DATABASE_PATH = "data/discere.sqlite";
export const PROMPTS_DIRECTORY = "prompts";
export const CODEX_SCRATCH_DIRECTORY = "data/codex-scratch";

export function findRepoRoot(startDirectory: string): string {
  let current = path.resolve(startDirectory);
  for (;;) {
    if (existsSync(path.join(current, WORKSPACE_MARKER))) return current;
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        `Could not find '${WORKSPACE_MARKER}' above '${startDirectory}'. Discere must run from inside its repository.`,
      );
    }
    current = parent;
  }
}

let cachedRepoRoot: string | undefined;

export function repoRoot(): string {
  cachedRepoRoot ??= findRepoRoot(path.dirname(fileURLToPath(import.meta.url)));
  return cachedRepoRoot;
}

export function resolveFromRepoRoot(...segments: string[]): string {
  return path.resolve(repoRoot(), ...segments);
}

/**
 * Resolves the SQLite location. An absolute value is used as given, `:memory:` is passed
 * through for tests, and anything else is treated as relative to the repository root.
 */
export function resolveDatabasePath(configured?: string | undefined): string {
  const raw = configured?.trim();
  if (!raw) return resolveFromRepoRoot(DEFAULT_DATABASE_PATH);
  if (raw === ":memory:") return raw;
  return path.isAbsolute(raw) ? raw : resolveFromRepoRoot(raw);
}

export function resolvePromptsDirectory(configured?: string | undefined): string {
  const raw = configured?.trim();
  if (!raw) return resolveFromRepoRoot(PROMPTS_DIRECTORY);
  return path.isAbsolute(raw) ? raw : resolveFromRepoRoot(raw);
}

/**
 * Working root handed to a spawned local model. It sits under the ignored `data/` directory so
 * a generation never writes inside the source tree.
 */
export function resolveCodexScratchDirectory(configured?: string | undefined): string {
  const raw = configured?.trim();
  if (!raw) return resolveFromRepoRoot(CODEX_SCRATCH_DIRECTORY);
  return path.isAbsolute(raw) ? raw : resolveFromRepoRoot(raw);
}
