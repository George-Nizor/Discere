import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveFromRepoRoot } from "@discere/paths";

/**
 * Runs a program through discere-sandbox.exe (tools/windows-sandbox): an AppContainer with no
 * capabilities, so no network and none of the user's files, inside a Job Object that caps
 * memory, CPU time and process count and is killed when the run ends. It is the Windows
 * counterpart of Bubblewrap plus prlimit on Linux.
 */
export interface SandboxLimits {
  memoryMb: number;
  cpuMs: number;
  wallMs: number;
  processes: number;
}
export interface SandboxRun {
  executable: string;
  args: string[];
  /** The run's working folder: the only place the program may write. */
  work: string;
  /** Folders it may read and execute from, granted once by `grant`. */
  read: string[];
  env?: Record<string, string>;
  stdin?: string;
  limits: SandboxLimits;
  output: { stdout: number; stderr: number };
}
export type SandboxReason = "ok" | "wall" | "cpu" | "memory" | "processes" | "error";
export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  reason: SandboxReason;
  /** True when the caller cut the run off for printing too much. */
  overflow: boolean;
  /** True when the helper itself could not start or run the program. */
  failed: boolean;
}

/** The helper shipped beside node.exe in a release, or built in a Windows checkout. */
export function sandboxExecutable(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const configured = env["DISCERE_SANDBOX_EXE"]?.trim();
  const candidates = configured
    ? [configured]
    : [
        resolveFromRepoRoot("runtime", "discere-sandbox.exe"),
        resolveFromRepoRoot("tools", "windows-sandbox", "dist", "discere-sandbox.exe"),
      ];
  return candidates.find((candidate) => existsSync(candidate));
}

const REASONS = new Set<SandboxReason>(["ok", "wall", "cpu", "memory", "processes", "error"]);

export async function runSandboxed(helper: string, run: SandboxRun): Promise<SandboxResult> {
  const statusDirectory = await mkdtemp(path.join(tmpdir(), "discere-sandbox-status-"));
  const statusFile = path.join(statusDirectory, "status.json");
  const args = ["run", "--work", run.work];
  for (const folder of run.read) args.push("--read", folder);
  for (const [key, value] of Object.entries(run.env ?? {})) args.push("--env", `${key}=${value}`);
  args.push(
    "--memory-mb",
    String(run.limits.memoryMb),
    "--cpu-ms",
    String(run.limits.cpuMs),
    "--wall-ms",
    String(run.limits.wallMs),
    "--processes",
    String(run.limits.processes),
    "--status",
    statusFile,
    "--",
    run.executable,
    ...run.args,
  );
  try {
    const spawned = await new Promise<{
      stdout: string;
      stderr: string;
      helperExit: number | null;
      overflow: boolean;
    }>((resolve) => {
      const child = spawn(helper, args, {
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
      let stdout = "",
        stderr = "",
        overflow = false,
        settled = false;
      // The helper enforces the wall clock itself; this only catches a helper that hangs.
      const timer = setTimeout(() => child.kill(), run.limits.wallMs + 5000);
      const settle = (helperExit: number | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ stdout, stderr, helperExit, overflow });
      };
      child.once("error", () => settle(null));
      child.once("close", (code) => settle(code));
      child.stdout.on("data", (data: Buffer) => {
        if (stdout.length + data.length > run.output.stdout) {
          overflow = true;
          child.kill();
        } else stdout += data.toString("utf8");
      });
      child.stderr.on("data", (data: Buffer) => {
        if (stderr.length + data.length > run.output.stderr) {
          stderr += data.toString("utf8").slice(0, Math.max(0, run.output.stderr - stderr.length));
          overflow = true;
          child.kill();
        } else stderr += data.toString("utf8");
      });
      child.stdin.on("error", () => {});
      child.stdin.end(run.stdin ?? "");
    });
    let status: { exitCode?: unknown; reason?: unknown } = {};
    try {
      status = JSON.parse(await readFile(statusFile, "utf8")) as typeof status;
    } catch {
      // No status file: the helper died, or was killed for overflow before writing it.
    }
    const reason = REASONS.has(status.reason as SandboxReason)
      ? (status.reason as SandboxReason)
      : "error";
    const helperMessages = spawned.stderr
      .split(/\r?\n/)
      .filter((line) => line.startsWith("discere-sandbox:"));
    return {
      stdout: spawned.stdout,
      stderr: spawned.stderr
        .split(/\r?\n/)
        .filter((line) => !line.startsWith("discere-sandbox:"))
        .join("\n"),
      exitCode: typeof status.exitCode === "number" ? status.exitCode : null,
      reason,
      overflow: spawned.overflow,
      failed:
        !spawned.overflow &&
        (spawned.helperExit !== 0 || (reason === "error" && helperMessages.length > 0)),
    };
  } finally {
    await rm(statusDirectory, { recursive: true, force: true });
  }
}
