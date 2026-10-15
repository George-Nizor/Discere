import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type PythonCall,
  PythonCallSchema,
  PythonCodeSchema,
  type PythonExecution,
  PythonExecutionSchema,
  type PythonInputs,
  PythonInputsSchema,
} from "@discere/contracts";
import { resolveFromRepoRoot } from "@discere/paths";
import { runSandboxed } from "../code-runtimes/sandbox.js";
import type { WindowsCodeRuntimes } from "../code-runtimes/windows.js";
import type { PythonRuntime } from "./runtime.js";

const NOT_SET_UP: PythonExecution = {
  error: "runtime",
  message:
    "Python practice needs a one-time download of Python, NumPy and pandas. Set it up from this page.",
};

/**
 * Runs learner Python on Windows in discere-sandbox.exe, with the same bootstrap, limits and
 * messages as the Bubblewrap runtime. There is no unsandboxed fallback.
 */
export class WindowsPythonRuntime implements PythonRuntime {
  private active = 0;

  constructor(private readonly runtimes: WindowsCodeRuntimes) {}

  async available(): Promise<boolean> {
    return Boolean((await this.runtimes.python()) && this.runtimes.sandboxHelper);
  }

  async execute(code: string, inputs: PythonInputs, call?: PythonCall): Promise<PythonExecution> {
    PythonCodeSchema.parse(code);
    PythonInputsSchema.parse(inputs);
    if (call) {
      PythonCallSchema.parse(call);
      if (call.arguments.some((name) => !(name in inputs)))
        throw new Error("A function call needs its supplied arguments.");
    }
    const python = await this.runtimes.python();
    const helper = this.runtimes.sandboxHelper;
    if (!python || !helper) return NOT_SET_UP;
    if (this.active >= 2)
      return { error: "runtime", message: "Python practice is busy. Try again in a moment." };
    this.active += 1;
    const work = await mkdtemp(path.join(tmpdir(), "discere-python-"));
    try {
      const bootstrap = resolveFromRepoRoot("apps/server/src/python-projects/bootstrap.py");
      const ran = await runSandboxed(helper, {
        executable: python.executable,
        args: ["-I", "-S", "-B", bootstrap, python.sitePackages],
        work,
        read: [python.home, python.sitePackages, path.dirname(bootstrap)],
        env: {
          OPENBLAS_NUM_THREADS: "1",
          OMP_NUM_THREADS: "1",
          MKL_NUM_THREADS: "1",
          NUMEXPR_NUM_THREADS: "1",
          PYTHONIOENCODING: "utf-8",
        },
        stdin: JSON.stringify({ code, inputs, ...(call ? { call } : {}) }),
        limits: { memoryMb: 512, cpuMs: 2000, wallMs: 6000, processes: 1 },
        output: { stdout: 262144, stderr: 8192 },
      });
      if (ran.overflow)
        return {
          error: "limit",
          message: "This program produced too much output. Keep printed text and results small.",
        };
      if (ran.reason === "wall" || ran.reason === "cpu")
        return {
          error: "limit",
          message:
            "This program took too long. Check for an unbounded loop or a blocking operation.",
        };
      if (ran.failed || !ran.stderr.includes("DISCERE_PYTHON_READY")) return NOT_SET_UP;
      if (ran.reason !== "ok" || ran.exitCode !== 0)
        return {
          error: "limit",
          message: "This program stopped at a practice limit. Keep memory, loops and output small.",
        };
      try {
        return PythonExecutionSchema.parse(JSON.parse(ran.stdout));
      } catch {
        return {
          error: "code",
          message:
            "The program did not return a readable result. Assign your answer to result and use print for text.",
        };
      }
    } finally {
      this.active -= 1;
      await rm(work, { recursive: true, force: true });
    }
  }
}
