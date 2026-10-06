import { spawn } from "node:child_process";
import { TutorProviderError } from "./errors.js";

const MAX_DIAGNOSTIC_CHARS = 4_000;

export interface ProcessRunInput {
  provider: string;
  binary: string;
  args: readonly string[];
  cwd: string;
  stdin: string;
  timeoutMs: number;
  killGraceMs: number;
  signal: AbortSignal | undefined;
  env?: NodeJS.ProcessEnv;
  /** Shown when the executable cannot be started, e.g. how to install it. */
  missingHint: string;
}

export interface ProcessRunResult {
  stdout: string;
  diagnostics: string;
}

/**
 * Runs one CLI generation: prompt on stdin, whole stdout returned. A new process group lets a
 * timeout or cancellation reach the CLI and anything it started; a non-zero exit, a timeout and
 * a cancellation each become the provider error the server already knows how to explain.
 */
export function runProcess(input: ProcessRunInput): Promise<ProcessRunResult> {
  if (input.signal?.aborted)
    return Promise.reject(
      new TutorProviderError("PROVIDER_ABORTED", "The generation was cancelled.", {
        provider: input.provider,
      }),
    );
  const detached = process.platform !== "win32";
  return new Promise((resolve, reject) => {
    const child = spawn(input.binary, [...input.args], {
      cwd: input.cwd,
      detached,
      stdio: ["pipe", "pipe", "pipe"],
      env: input.env ?? process.env,
    });
    let stdout = "";
    let stderrTail = "";
    let settled = false;
    let timedOut = false;
    let aborted = false;
    let killTimer: NodeJS.Timeout | undefined;
    const stop = (signal: NodeJS.Signals) => {
      try {
        if (detached && child.pid !== undefined) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch {
        // Already exited.
      }
    };
    const terminate = () => {
      stop("SIGTERM");
      killTimer = setTimeout(() => stop("SIGKILL"), input.killGraceMs);
      killTimer.unref();
    };
    const timer = setTimeout(() => {
      timedOut = true;
      terminate();
    }, input.timeoutMs);
    timer.unref();
    const onAbort = () => {
      aborted = true;
      terminate();
    };
    input.signal?.addEventListener("abort", onAbort, { once: true });
    const cleanup = () => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      input.signal?.removeEventListener("abort", onAbort);
    };
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderrTail = `${stderrTail}${chunk}`.slice(-MAX_DIAGNOSTIC_CHARS);
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new TutorProviderError("PROVIDER_SPAWN_FAILED", `Discere could not start '${input.binary}'. ${input.missingHint}`, {
          provider: input.provider,
          cause: error,
        }),
      );
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      cleanup();
      const diagnostics = `${stderrTail}\n${stdout.slice(-MAX_DIAGNOSTIC_CHARS)}`.trim().slice(-MAX_DIAGNOSTIC_CHARS);
      if (aborted)
        return reject(
          new TutorProviderError("PROVIDER_ABORTED", "The generation was cancelled.", {
            provider: input.provider,
            diagnostics,
          }),
        );
      if (timedOut)
        return reject(
          new TutorProviderError(
            "PROVIDER_TIMEOUT",
            `The model did not answer within ${Math.round(input.timeoutMs / 1000)} seconds.`,
            { provider: input.provider, diagnostics },
          ),
        );
      if (code !== 0)
        return reject(
          new TutorProviderError("PROVIDER_EXITED", `The model exited with ${signal ?? `code ${code ?? "unknown"}`}.`, {
            provider: input.provider,
            diagnostics,
          }),
        );
      resolve({ stdout, diagnostics });
    });
    child.stdin.on("error", () => {
      // The CLI can close stdin early; the exit code reports the real failure.
    });
    child.stdin.end(input.stdin, "utf8");
  });
}
