import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import {
  PythonCodeSchema,
  PythonCallSchema,
  type PythonCall,
  PythonExecutionSchema,
  PythonInputsSchema,
  type PythonExecution,
  type PythonInputs,
  type PythonValue,
} from "@discere/contracts";

export interface PythonRuntime {
  execute(code: string, inputs: PythonInputs, call?: PythonCall): Promise<PythonExecution>;
}
export interface PythonRuntimeOptions {
  directory?: string;
  bubblewrap?: string;
}
const unavailable = (): PythonExecution => ({
  error: "runtime",
  message:
    "Python practice needs its isolated Linux runtime. Run pnpm python:setup in WSL, then restart Discere.",
});

/** OS isolation is mandatory. This class never falls back to bare learner Python. */
export class IsolatedPythonRuntime implements PythonRuntime {
  private active = 0;
  private readonly directory: string;
  private readonly bubblewrap: string;
  constructor(options: PythonRuntimeOptions = {}) {
    this.directory =
      options.directory ??
      process.env["DISCERE_PYTHON_RUNTIME_DIR"] ??
      path.resolve(import.meta.dirname, "../../../../data/python-runtime");
    this.bubblewrap = options.bubblewrap ?? "/usr/bin/bwrap";
  }
  async execute(code: string, inputs: PythonInputs, call?: PythonCall): Promise<PythonExecution> {
    PythonCodeSchema.parse(code);
    PythonInputsSchema.parse(inputs);
    if (call) {
      PythonCallSchema.parse(call);
      if (call.arguments.some((name) => !(name in inputs)))
        throw new Error("A function call needs its supplied arguments.");
    }
    if (process.platform !== "linux" || process.arch !== "x64" || !path.isAbsolute(this.directory))
      return unavailable();
    if (this.active >= 2)
      return { error: "runtime", message: "Python practice is busy. Try again in a moment." };
    const packages = path.join(this.directory, "lib/python3.12/site-packages");
    try {
      await Promise.all([
        access(this.bubblewrap),
        access("/usr/bin/python3.12"),
        access("/usr/lib/x86_64-linux-gnu/libseccomp.so.2"),
        access(path.join(packages, "numpy")),
        access(path.join(packages, "pandas")),
      ]);
    } catch {
      return unavailable();
    }
    // Recheck after asynchronous readiness reads so competing calls cannot exceed the cap.
    if (this.active >= 2)
      return { error: "runtime", message: "Python practice is busy. Try again in a moment." };
    this.active += 1;
    return new Promise((resolve) => {
      const args = [
        "--unshare-all",
        "--unshare-user",
        "--disable-userns",
        "--assert-userns-disabled",
        "--die-with-parent",
        "--new-session",
        "--cap-drop",
        "ALL",
        "--uid",
        "65534",
        "--gid",
        "65534",
        "--hostname",
        "discere-python",
        "--ro-bind",
        "/usr/bin/python3.12",
        "/usr/bin/python3.12",
        "--ro-bind",
        "/usr/lib/python3.12",
        "/usr/lib/python3.12",
        "--ro-bind",
        "/usr/lib/x86_64-linux-gnu",
        "/usr/lib/x86_64-linux-gnu",
        "--symlink",
        "usr/lib",
        "/lib",
        "--ro-bind",
        "/usr/lib64",
        "/usr/lib64",
        "--symlink",
        "usr/lib64",
        "/lib64",
        "--ro-bind",
        packages,
        "/opt/packages",
        "--ro-bind",
        path.join(import.meta.dirname, "bootstrap.py"),
        "/app/bootstrap.py",
        "--proc",
        "/proc",
        "--remount-ro",
        "/proc",
        "--dev",
        "/dev",
        "--size",
        "16777216",
        "--tmpfs",
        "/dev/shm",
        "--remount-ro",
        "/dev",
        "--size",
        "67108864",
        "--tmpfs",
        "/tmp",
        "--chdir",
        "/tmp",
        "--remount-ro",
        "/",
        "--clearenv",
        "--setenv",
        "PATH",
        "/usr/bin",
        "--setenv",
        "LANG",
        "C.UTF-8",
        "--setenv",
        "OPENBLAS_NUM_THREADS",
        "1",
        "--setenv",
        "OMP_NUM_THREADS",
        "1",
        "--setenv",
        "MKL_NUM_THREADS",
        "1",
        "--setenv",
        "NUMEXPR_NUM_THREADS",
        "1",
        "--",
        "/usr/bin/python3.12",
        "-I",
        "-S",
        "-B",
        "/app/bootstrap.py",
      ];
      const child = spawn(this.bubblewrap, args, {
        shell: false,
        windowsHide: true,
        env: { PATH: "/usr/bin:/bin" },
        stdio: ["pipe", "pipe", "pipe"],
      });
      let stdout = Buffer.alloc(0),
        stderr = "",
        done = false;
      const finish = (result: PythonExecution) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(result);
      };
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish({
          error: "limit",
          message:
            "This program took too long. Check for an unbounded loop or a blocking operation.",
        });
      }, 4000);
      child.once("error", () => finish(unavailable()));
      child.once("close", (exitCode, signal) => {
        this.active -= 1;
        if (done) return;
        const ready = stderr.includes("DISCERE_PYTHON_READY\n");
        if (!ready) return finish(unavailable());
        if (signal || exitCode !== 0)
          return finish({
            error: "limit",
            message:
              "This program stopped at a practice limit. Keep memory, loops and output small.",
          });
        try {
          finish(PythonExecutionSchema.parse(JSON.parse(stdout.toString("utf8"))));
        } catch {
          finish({
            error: "code",
            message:
              "The program did not return a readable result. Assign your answer to result and use print for text.",
          });
        }
      });
      child.stdout.on("data", (data: Buffer) => {
        if (done) return;
        if (stdout.length + data.length > 262144) {
          child.kill("SIGKILL");
          finish({
            error: "limit",
            message: "This program produced too much output. Keep printed text and results small.",
          });
        } else stdout = Buffer.concat([stdout, data]);
      });
      child.stderr.on("data", (data: Buffer) => {
        if (done) return;
        if (stderr.length + data.length > 8192) {
          child.kill("SIGKILL");
          finish({ error: "limit", message: "This program produced too much error output." });
        } else stderr += data.toString("utf8");
      });
      child.stdin.on("error", () => {});
      child.stdin.end(JSON.stringify({ code, inputs, ...(call ? { call } : {}) }));
    });
  }
}

export function samePythonResult(actual: PythonValue, expected: PythonValue): boolean {
  if (typeof actual !== typeof expected) return false;
  if (typeof actual === "number" && typeof expected === "number")
    return Math.abs(actual - expected) <= Math.max(1e-9, 1e-9 * Math.abs(expected));
  if (
    actual === null ||
    expected === null ||
    typeof actual !== "object" ||
    typeof expected !== "object"
  )
    return actual === expected;
  if (Array.isArray(actual) || Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      Array.isArray(expected) &&
      actual.length === expected.length &&
      actual.every((v, i) => samePythonResult(v, expected[i]!))
    );
  const keys = Object.keys(actual).sort(),
    expectedKeys = Object.keys(expected).sort();
  return (
    JSON.stringify(keys) === JSON.stringify(expectedKeys) &&
    keys.every((key) => samePythonResult(actual[key]!, expected[key]!))
  );
}
