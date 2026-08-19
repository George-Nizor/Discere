import { spawnSync } from "node:child_process";
import {
  closeSync,
  type Dirent,
  existsSync,
  openSync,
  readdirSync,
  readSync,
  statSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import type { TutorStatus } from "@discere/contracts";
import { codexRuntimeStatus } from "@discere/tutor-providers";
import type { TutorRuntime } from "./tutor-provider.js";

/** Spawning the CLI on every poll would be silly; its version does not move during a session. */
const BINARY_CACHE_MS = 60_000;
/** The quota line sits near the end of a rollout, so the whole transcript never has to be read. */
const ROLLOUT_TAIL_BYTES = 256 * 1_024;

interface BinaryProbe {
  found: boolean;
  version: string;
}

let binaryCache: { probe: BinaryProbe; at: number } | undefined;

function codexHome(): string {
  const configured = process.env["CODEX_HOME"]?.trim();
  return configured ? configured : path.join(os.homedir(), ".codex");
}

function codexBinary(): string {
  return process.env["DISCERE_CODEX_BIN"]?.trim() ?? "codex";
}

export function probeCodexBinary(now = Date.now()): BinaryProbe {
  if (binaryCache && now - binaryCache.at < BINARY_CACHE_MS) return binaryCache.probe;
  let probe: BinaryProbe = { found: false, version: "" };
  try {
    const result = spawnSync(codexBinary(), ["--version"], { encoding: "utf8", timeout: 5_000 });
    if (result.status === 0) {
      probe = { found: true, version: `${result.stdout}`.trim().split("\n")[0]?.trim() ?? "" };
    }
  } catch {
    // A missing binary is a reportable state, not a server fault.
  }
  binaryCache = { probe, at: now };
  return probe;
}

/** Exposed so a test can force the next poll to spawn again. */
export function resetCodexBinaryCache(): void {
  binaryCache = undefined;
}

export function codexAuthPresent(): boolean {
  try {
    return existsSync(path.join(codexHome(), "auth.json"));
  } catch {
    return false;
  }
}

function newestRollout(directory: string, depth = 0): { file: string; at: number } | undefined {
  // Rollouts live under sessions/<year>/<month>/<day>/, so four levels is the whole tree.
  if (depth > 4) return undefined;
  let best: { file: string; at: number } | undefined;
  let entries: Dirent[];
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return undefined;
  }
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const found = newestRollout(full, depth + 1);
      if (found && (!best || found.at > best.at)) best = found;
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.startsWith("rollout-") || !entry.name.endsWith(".jsonl")) continue;
    try {
      const at = statSync(full).mtimeMs;
      if (!best || at > best.at) best = { file: full, at };
    } catch {
      // A rollout being written right now can vanish between readdir and stat.
    }
  }
  return best;
}

function readTail(file: string, bytes: number): string {
  const handle = openSync(file, "r");
  try {
    const size = statSync(file).size;
    const length = Math.min(size, bytes);
    const buffer = Buffer.alloc(length);
    readSync(handle, buffer, 0, length, size - length);
    return buffer.toString("utf8");
  } finally {
    closeSync(handle);
  }
}

export interface CodexQuota {
  planType: string;
  usedPercent: number;
  resetsAt: number;
}

/**
 * The CLI does not expose remaining quota, but it records what the API told it in every
 * rollout. The newest transcript therefore holds the freshest reading available offline.
 */
export function readCodexQuota(): CodexQuota | undefined {
  try {
    const newest = newestRollout(path.join(codexHome(), "sessions"));
    if (!newest) return undefined;
    const lines = readTail(newest.file, ROLLOUT_TAIL_BYTES).split("\n");
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index];
      if (!line || !line.includes('"rate_limits"')) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line) as unknown;
      } catch {
        // A truncated first line is expected when only the tail was read.
        continue;
      }
      const limits = (parsed as { payload?: { rate_limits?: unknown } }).payload?.rate_limits;
      if (limits === null || typeof limits !== "object") continue;
      const record = limits as {
        plan_type?: unknown;
        primary?: { used_percent?: unknown; resets_at?: unknown } | null;
      };
      const primary = record.primary;
      if (primary === null || typeof primary !== "object") continue;
      const usedPercent = primary.used_percent;
      if (typeof usedPercent !== "number") continue;
      return {
        planType: typeof record.plan_type === "string" ? record.plan_type : "",
        usedPercent,
        resetsAt: typeof primary.resets_at === "number" ? Math.trunc(primary.resets_at) : 0,
      };
    }
  } catch {
    // Quota is a convenience; the rest of the status must still render.
  }
  return undefined;
}

export function buildTutorStatus(runtime: TutorRuntime): TutorStatus {
  const codex = runtime.id === "codex";
  const probe = codex ? probeCodexBinary() : { found: false, version: "" };
  const quota = codex ? readCodexQuota() : undefined;
  const live = codexRuntimeStatus();
  return {
    provider: runtime.id,
    model: codex ? (process.env["DISCERE_CODEX_MODEL"]?.trim() ?? "") : "",
    reasoningEffort: codex ? (process.env["DISCERE_CODEX_EFFORT"]?.trim() ?? "xhigh") : "",
    binaryFound: probe.found,
    binaryVersion: probe.version,
    authPresent: codex ? codexAuthPresent() : false,
    queueDepth: live.queueDepth,
    lastOutcome: live.lastOutcome,
    lastError: live.lastError,
    quotaKnown: quota !== undefined,
    quotaPlanType: quota?.planType ?? "",
    quotaUsedPercent: quota?.usedPercent ?? 0,
    quotaResetsAt: quota?.resetsAt ?? 0,
  };
}
