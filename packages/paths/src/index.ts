import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Every Discere path is resolved from the repository root rather than the working
 * directory. pnpm runs workspace scripts with the package directory as the working
 * directory, so a relative path such as `./data/discere.sqlite` would otherwise point
 * at a different file for each package that reads it.
 */
const WORKSPACE_MARKER = "pnpm-workspace.yaml";
/** A release bundle keeps the repository's layout for the files it ships, and marks its root. */
export const BUNDLE_MARKER = "discere-bundle.json";

export const DEFAULT_DATABASE_PATH = "data/discere.sqlite";
export const PROMPTS_DIRECTORY = "prompts";
/** Relative to the user's home directory, following the XDG data convention. */
export const CODEX_SCRATCH_SEGMENTS = [".local", "share", "discere", "codex-scratch"] as const;

export function findRepoRoot(startDirectory: string): string {
  let current = path.resolve(startDirectory);
  for (;;) {
    if (
      existsSync(path.join(current, WORKSPACE_MARKER)) ||
      existsSync(path.join(current, BUNDLE_MARKER))
    )
      return current;
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

/** True when Discere runs from an installed release rather than a checkout. */
export function isPackaged(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["DISCERE_PACKAGED"] === "1";
}

/**
 * Where the learner's data lives: the database, backups and the downloaded code runtimes.
 * DISCERE_DATA_DIR wins. An installed release keeps it in the user's profile, outside the
 * version folder, so updates and uninstalls never touch it. A checkout keeps it in `data/`.
 */
export function dataDirectory(
  env: NodeJS.ProcessEnv = process.env,
  platform = process.platform,
): string {
  const configured = env["DISCERE_DATA_DIR"]?.trim();
  if (configured) return path.isAbsolute(configured) ? configured : resolveFromRepoRoot(configured);
  if (!isPackaged(env)) return resolveFromRepoRoot("data");
  if (platform === "win32") {
    const local = env["LOCALAPPDATA"]?.trim() || path.join(os.homedir(), "AppData", "Local");
    return path.join(local, "Discere");
  }
  return path.join(
    env["XDG_DATA_HOME"]?.trim() || path.join(os.homedir(), ".local", "share"),
    "discere",
  );
}

/**
 * Resolves the SQLite location. An absolute value is used as given, `:memory:` is passed
 * through for tests, and anything else is treated as relative to the repository root.
 * Unset, it is `discere.sqlite` in the data directory.
 */
export function resolveDatabasePath(configured?: string | undefined): string {
  const raw = configured?.trim();
  if (!raw) return path.join(dataDirectory(), path.basename(DEFAULT_DATABASE_PATH));
  if (raw === ":memory:") return raw;
  return path.isAbsolute(raw) ? raw : resolveFromRepoRoot(raw);
}

export function resolvePromptsDirectory(configured?: string | undefined): string {
  const raw = configured?.trim();
  if (!raw) return resolveFromRepoRoot(PROMPTS_DIRECTORY);
  return path.isAbsolute(raw) ? raw : resolveFromRepoRoot(raw);
}

/**
 * Working root handed to a spawned local model. It sits outside the repository on purpose:
 * the CLI reads whatever `AGENTS.md` it finds above its working root, and a scratch directory
 * under the checkout meant every tutor turn shipped this repo's instructions as ~20k input
 * tokens of context nobody asked for.
 */
export function resolveCodexScratchDirectory(configured?: string | undefined): string {
  const raw = configured?.trim();
  if (!raw) return path.join(os.homedir(), ...CODEX_SCRATCH_SEGMENTS);
  return path.isAbsolute(raw) ? raw : resolveFromRepoRoot(raw);
}

/** Where npm's Codex package keeps its Windows binary, newest layout first. */
const CODEX_WINDOWS_BINARIES = [
  [
    "node_modules",
    "@openai",
    "codex",
    "node_modules",
    "@openai",
    "codex-win32-x64",
    "vendor",
    "x86_64-pc-windows-msvc",
    "codex",
    "codex.exe",
  ],
  ["node_modules", "@openai", "codex", "vendor", "x86_64-pc-windows-msvc", "codex", "codex.exe"],
  ["node_modules", "@openai", "codex", "bin", "codex-x86_64-pc-windows-msvc.exe"],
] as const;

/**
 * The executable to spawn for a command-line tool such as `codex` or `claude`. Elsewhere the
 * bare name is enough. Windows process creation only finds `.exe` files, and npm installs a
 * `.cmd` shim that Node cannot spawn without a shell, so on Windows this searches PATH for the
 * `.exe`, then looks behind an npm shim for the native binary it would have started.
 */
export function resolveCliCommand(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  exists: (file: string) => boolean = existsSync,
): string {
  if (platform !== "win32" || /[\\/]/.test(name) || path.win32.extname(name)) return name;
  const directories = (env["PATH"] ?? env["Path"] ?? "").split(";").filter(Boolean);
  for (const directory of directories) {
    const executable = path.win32.join(directory, `${name}.exe`);
    if (exists(executable)) return executable;
  }
  if (name === "codex")
    for (const directory of directories) {
      if (!exists(path.win32.join(directory, "codex.cmd"))) continue;
      for (const segments of CODEX_WINDOWS_BINARIES) {
        const executable = path.win32.join(directory, ...segments);
        if (exists(executable)) return executable;
      }
    }
  return name;
}
