import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  RustCodeSchema,
  type RustRunResult,
  type RustStatus,
  RustStdinSchema,
} from "@discere/contracts";
import { runSandboxed, type SandboxResult } from "../code-runtimes/sandbox.js";
import type { WindowsCodeRuntimes } from "../code-runtimes/windows.js";
import {
  cleanDiagnostics,
  HARNESS_TAIL,
  MAIN_DECLARATION,
  type RustProgram,
  type RustRuntime,
  unavailable,
} from "./runtime.js";

const NOT_SET_UP =
  "Rust practice needs a one-time download of the Rust compiler. Set it up from this page.";

/**
 * Compiles and runs learner Rust on Windows (ADR 0006). rustc and the MinGW linker run in the
 * sandbox with the toolchain readable and only the run's own folder writable; the program then
 * runs in a second sandbox under the same memory, CPU and output limits as on Linux. There is
 * no unsandboxed fallback.
 */
export class WindowsRustRuntime implements RustRuntime {
  private active = 0;

  constructor(private readonly runtimes: WindowsCodeRuntimes) {}

  async status(): Promise<RustStatus> {
    const toolchain = await this.runtimes.rust();
    return toolchain
      ? { ready: true, version: "Rust " + toolchain.version }
      : { ready: false, message: NOT_SET_UP };
  }

  async run(program: RustProgram, stdins: string[]): Promise<RustRunResult[]> {
    RustCodeSchema.parse(program.code);
    for (const stdin of stdins) RustStdinSchema.parse(stdin);
    if (stdins.length < 1 || stdins.length > 6) throw new Error("Run one to six inputs.");
    const toolchain = await this.runtimes.rust();
    const helper = this.runtimes.sandboxHelper;
    if (!toolchain || !helper) return [unavailable(NOT_SET_UP)];
    if (this.active >= 2)
      return [unavailable("Rust practice is busy with another program. Try again in a moment.")];
    this.active += 1;
    const work = await mkdtemp(path.join(tmpdir(), "discere-rust-"));
    try {
      let source = program.code;
      if (program.harness !== undefined) {
        source = source.replace(MAIN_DECLARATION, "fn _main(") + HARNESS_TAIL;
        await writeFile(path.join(work, "discere_check.rs"), program.harness);
      }
      await writeFile(path.join(work, "main.rs"), source);
      const compiled = await runSandboxed(helper, {
        executable: toolchain.rustc,
        args: [
          "--edition",
          "2024",
          "--color",
          "never",
          "--crate-name",
          "main",
          "-C",
          "opt-level=0",
          "-C",
          "debuginfo=0",
          "-C",
          "strip=debuginfo",
          "main.rs",
          "-o",
          "main.exe",
        ],
        work,
        read: [toolchain.sysroot],
        // rustc finds rust-mingw's gcc and ld itself; it, gcc and ld are three processes.
        limits: { memoryMb: 1024, cpuMs: 20000, wallMs: 20000, processes: 4 },
        output: { stdout: 65536, stderr: 65536 },
      });
      const diagnostics = cleanDiagnostics(compiled.stderr.replaceAll("\r\n", "\n"), [
        work + path.sep,
        toolchain.sysroot + path.sep,
      ]);
      if (compiled.failed)
        return [unavailable("The sandbox could not start rustc. Restart Discere and try again.")];
      if (compiled.reason !== "ok")
        return [
          {
            status: "limit",
            diagnostics,
            stdout: "",
            stderr: "",
            exitCode: null,
            message: "Compiling took too long. Look for very deep macros or huge constants.",
          },
        ];
      if (compiled.exitCode !== 0)
        return [
          {
            status: "compile_error",
            diagnostics: diagnostics || "rustc stopped without a message.",
            stdout: "",
            stderr: "",
            exitCode: compiled.exitCode,
          },
        ];
      const results: RustRunResult[] = [];
      for (const stdin of stdins)
        results.push(present(await this.launch(helper, work, stdin), diagnostics));
      return results;
    } finally {
      this.active -= 1;
      await rm(work, { recursive: true, force: true });
    }
  }

  private launch(helper: string, work: string, stdin: string): Promise<SandboxResult> {
    return runSandboxed(helper, {
      executable: path.join(work, "main.exe"),
      args: [],
      work,
      read: [],
      stdin,
      // One process: the program. Threads are not processes, so they are not counted.
      limits: { memoryMb: 256, cpuMs: 2000, wallMs: 4000, processes: 1 },
      output: { stdout: 8000, stderr: 4000 },
    });
  }
}

function present(ran: SandboxResult, diagnostics: string): RustRunResult {
  const base = {
    diagnostics,
    stdout: ran.stdout.replaceAll("\r\n", "\n"),
    stderr: ran.stderr.trim(),
  };
  if (ran.failed)
    return unavailable("The sandbox could not start the program. Restart Discere and try again.");
  if (ran.overflow)
    return {
      ...base,
      status: "limit",
      exitCode: null,
      message: "This program printed too much. Keep output under 8,000 characters.",
    };
  if (ran.reason === "wall" || ran.reason === "cpu")
    return {
      ...base,
      status: "limit",
      exitCode: null,
      message: "This program ran too long. Check for a loop that never ends.",
    };
  // The helper reports a crash as a negative NTSTATUS: a stack overflow, an access violation, or
  // the abort after an allocation the memory limit refused.
  if (ran.reason !== "ok" || ran.exitCode === null || ran.exitCode < 0)
    return {
      ...base,
      status: "limit",
      exitCode: null,
      message: "This program stopped at a practice limit on memory or time.",
    };
  if (ran.exitCode !== 0)
    return {
      ...base,
      status: "runtime_error",
      exitCode: ran.exitCode,
      message:
        ran.exitCode === 101
          ? "The program panicked. The message below says where."
          : "The program exited with code " + ran.exitCode + ".",
    };
  return { ...base, status: "ok", exitCode: 0 };
}
