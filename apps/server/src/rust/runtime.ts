import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  RustCodeSchema,
  type RustRunResult,
  type RustStatus,
  RustStdinSchema,
} from "@discere/contracts";

/**
 * Compiles and runs learner Rust in two Bubblewrap sandboxes (ADR 0006). rustc runs with the
 * toolchain, /usr and a scratch directory, and nothing else: no home, no workspace, no network,
 * so include_str! cannot read the owner's files. The binary then runs in a second sandbox that
 * holds only itself and the shared libraries, under hard process, memory, CPU and file limits.
 * There is no unsandboxed fallback.
 */
export interface RustProgram {
  code: string;
  /** A checker module appended as `discere_check`, which then supplies `fn main`. */
  harness?: string;
}
export interface RustRuntime {
  status(): Promise<RustStatus>;
  /** Compiles once, then runs once per stdin. A failed compile returns one compile_error. */
  run(program: RustProgram, stdins: string[]): Promise<RustRunResult[]>;
}
export interface RustRuntimeOptions {
  /** Directory holding runtime.json, written by `pnpm rust:setup`. */
  directory?: string;
  bubblewrap?: string;
}

const RuntimeFileSchema = (input: unknown) => {
  const value = input as { sysroot?: unknown; version?: unknown };
  if (typeof value?.sysroot !== "string" || typeof value.version !== "string")
    throw new Error("runtime.json needs sysroot and version.");
  return { sysroot: value.sysroot, version: value.version };
};

const UNAVAILABLE =
  "Rust practice needs its sandboxed toolchain. Run pnpm rust:setup in WSL, then restart Discere.";
const unavailable = (message = UNAVAILABLE): RustRunResult => ({
  status: "unavailable",
  diagnostics: "",
  stdout: "",
  stderr: "",
  exitCode: null,
  message,
});

const MAIN_DECLARATION = /\bfn\s+main\s*\(/g;
const HARNESS_TAIL = '\n#[path = "discere_check.rs"]\nmod discere_check;\nfn main() {\n    discere_check::run();\n}\n';

/** Trims rustc's output so a learner never sees a host path. */
function cleanDiagnostics(text: string): string {
  return text
    .replaceAll("/work/", "")
    .replaceAll("/opt/rust/", "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 12000);
}

interface Spawned {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  overflow: boolean;
}

function execute(
  command: string,
  args: string[],
  stdin: string,
  timeoutMs: number,
  limits: { stdout: number; stderr: number },
): Promise<Spawned> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: false,
      windowsHide: true,
      env: { PATH: "/usr/bin:/bin" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "",
      stderr = "",
      timedOut = false,
      overflow = false,
      settled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    const settle = (exitCode: number | null, signal: NodeJS.Signals | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode, signal, timedOut, overflow });
    };
    child.once("error", () => settle(null, null));
    child.once("close", settle);
    child.stdout.on("data", (data: Buffer) => {
      if (stdout.length + data.length > limits.stdout) {
        overflow = true;
        child.kill("SIGKILL");
      } else stdout += data.toString("utf8");
    });
    child.stderr.on("data", (data: Buffer) => {
      if (stderr.length + data.length > limits.stderr) {
        stderr += data.toString("utf8").slice(0, Math.max(0, limits.stderr - stderr.length));
        overflow = true;
        child.kill("SIGKILL");
      } else stderr += data.toString("utf8");
    });
    child.stdin.on("error", () => {});
    child.stdin.end(stdin);
  });
}

const NAMESPACES = [
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
  "discere-rust",
];

export class IsolatedRustRuntime implements RustRuntime {
  private active = 0;
  private readonly directory: string;
  private readonly bubblewrap: string;
  constructor(options: RustRuntimeOptions = {}) {
    this.directory =
      options.directory ??
      process.env["DISCERE_RUST_RUNTIME_DIR"] ??
      path.resolve(import.meta.dirname, "../../../../data/rust-runtime");
    this.bubblewrap = options.bubblewrap ?? "/usr/bin/bwrap";
  }

  private async toolchain(): Promise<{ sysroot: string; version: string } | undefined> {
    if (process.platform !== "linux" || process.arch !== "x64") return undefined;
    try {
      const runtime = RuntimeFileSchema(
        JSON.parse(await readFile(path.join(this.directory, "runtime.json"), "utf8")),
      );
      if (!path.isAbsolute(runtime.sysroot)) return undefined;
      await Promise.all([
        access(this.bubblewrap),
        access("/usr/bin/prlimit"),
        access("/usr/bin/cc"),
        access(path.join(runtime.sysroot, "bin/rustc")),
      ]);
      return runtime;
    } catch {
      return undefined;
    }
  }

  async status(): Promise<RustStatus> {
    const toolchain = await this.toolchain();
    return toolchain
      ? { ready: true, version: "Rust " + toolchain.version }
      : { ready: false, message: UNAVAILABLE };
  }

  async run(program: RustProgram, stdins: string[]): Promise<RustRunResult[]> {
    RustCodeSchema.parse(program.code);
    for (const stdin of stdins) RustStdinSchema.parse(stdin);
    if (stdins.length < 1 || stdins.length > 6) throw new Error("Run one to six inputs.");
    const toolchain = await this.toolchain();
    if (!toolchain) return [unavailable()];
    if (this.active >= 2)
      return [unavailable("Rust practice is busy with another program. Try again in a moment.")];
    this.active += 1;
    const work = await mkdtemp(path.join(tmpdir(), "discere-rust-"));
    try {
      let source = program.code;
      if (program.harness !== undefined) {
        // A function task supplies its own main. A learner's main stays in the file, renamed so
        // it compiles; an underscore keeps rustc from warning that nothing calls it.
        source = source.replace(MAIN_DECLARATION, "fn _main(") + HARNESS_TAIL;
        await writeFile(path.join(work, "discere_check.rs"), program.harness);
      }
      await writeFile(path.join(work, "main.rs"), source);
      const compiled = await execute(
        this.bubblewrap,
        [
          ...NAMESPACES,
          "--ro-bind",
          "/usr",
          "/usr",
          // cc is an alternatives symlink; the linker cannot be found without this directory.
          "--ro-bind",
          "/etc/alternatives",
          "/etc/alternatives",
          "--symlink",
          "usr/lib",
          "/lib",
          "--symlink",
          "usr/lib64",
          "/lib64",
          "--symlink",
          "usr/bin",
          "/bin",
          "--ro-bind",
          toolchain.sysroot,
          "/opt/rust",
          "--bind",
          work,
          "/work",
          "--proc",
          "/proc",
          "--dev",
          "/dev",
          "--size",
          "268435456",
          "--tmpfs",
          "/tmp",
          "--chdir",
          "/work",
          "--clearenv",
          "--setenv",
          "PATH",
          "/opt/rust/bin:/usr/bin",
          "--setenv",
          "TMPDIR",
          "/tmp",
          "--setenv",
          "LANG",
          "C.UTF-8",
          "--",
          "/usr/bin/prlimit",
          "--cpu=20",
          "--fsize=67108864",
          "--nofile=256",
          "--core=0",
          "--",
          "/opt/rust/bin/rustc",
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
          "main",
        ],
        "",
        15000,
        { stdout: 65536, stderr: 65536 },
      );
      const diagnostics = cleanDiagnostics(compiled.stderr);
      if (compiled.timedOut)
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
      if (compiled.exitCode === null && !compiled.signal) return [unavailable()];
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
      for (const stdin of stdins) results.push(await this.launch(work, stdin, diagnostics));
      return results;
    } finally {
      this.active -= 1;
      await rm(work, { recursive: true, force: true });
    }
  }

  private async launch(work: string, stdin: string, diagnostics: string): Promise<RustRunResult> {
    const ran = await execute(
      this.bubblewrap,
      [
        ...NAMESPACES,
        "--ro-bind",
        "/usr/lib/x86_64-linux-gnu",
        "/usr/lib/x86_64-linux-gnu",
        "--ro-bind",
        "/usr/lib64",
        "/usr/lib64",
        "--ro-bind",
        "/usr/bin/prlimit",
        "/usr/bin/prlimit",
        "--symlink",
        "usr/lib",
        "/lib",
        "--symlink",
        "usr/lib64",
        "/lib64",
        "--ro-bind",
        path.join(work, "main"),
        "/app/main",
        "--proc",
        "/proc",
        "--dev",
        "/dev",
        "--size",
        "16777216",
        "--tmpfs",
        "/tmp",
        "--chdir",
        "/tmp",
        "--remount-ro",
        "/",
        "--clearenv",
        "--setenv",
        "LANG",
        "C.UTF-8",
        "--",
        "/usr/bin/prlimit",
        // Counted inside the sandbox's own user namespace: the program and two more threads.
        "--nproc=4",
        "--as=268435456",
        "--cpu=2",
        "--fsize=1048576",
        "--nofile=32",
        "--core=0",
        "--",
        "/app/main",
      ],
      stdin,
      4000,
      { stdout: 8000, stderr: 4000 },
    );
    const base = { diagnostics, stdout: ran.stdout, stderr: ran.stderr.trim() };
    if (ran.timedOut)
      return {
        ...base,
        status: "limit",
        exitCode: null,
        message: "This program ran too long. Check for a loop that never ends.",
      };
    if (ran.overflow)
      return {
        ...base,
        status: "limit",
        exitCode: null,
        message: "This program printed too much. Keep output under 8,000 characters.",
      };
    // Bubblewrap reports a child killed by a signal as 128 + the signal: the CPU limit's
    // SIGKILL is 137, a failed allocation's abort is 134.
    if (ran.signal || ran.exitCode === null || ran.exitCode >= 128)
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
}

/** Splits the checker's marker line from what the learner printed. */
export const RETURN_MARKER = "\u001eDISCERE_RETURN ";
export function splitReturned(stdout: string): { printed: string; returned?: string } {
  const lines = stdout.split("\n");
  const index = lines.findLastIndex((line) => line.startsWith(RETURN_MARKER));
  if (index < 0) return { printed: stdout };
  const returned = lines[index]!.slice(RETURN_MARKER.length);
  lines.splice(index, 1);
  return { printed: lines.join("\n"), returned };
}

/** Printed text compares line by line, ignoring trailing spaces and trailing blank lines. */
export function samePrinted(actual: string, expected: string): boolean {
  const normal = (text: string) =>
    text
      .replaceAll("\r\n", "\n")
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .replace(/\n+$/, "");
  return normal(actual) === normal(expected);
}

/**
 * Compares two `{:?}` renderings. Numbers compare with a small tolerance, so 45.00000000000001
 * from 25.0 * 1.8 matches an expected 45.0; everything else must match exactly.
 */
export function sameDebug(actual: string, expected: string): boolean {
  const number = /^-?\d+(?:\.\d+)?(?:e-?\d+)?$/;
  if (number.test(actual) && number.test(expected) && expected.includes(".") === actual.includes(".")) {
    const a = Number(actual),
      b = Number(expected);
    return Math.abs(a - b) <= Math.max(1e-9, 1e-9 * Math.abs(b));
  }
  return actual === expected;
}

/** The checker module for a function task. It calls the learner's function for one case. */
export function functionHarness(name: string, cases: string[][]): string {
  const arms = cases
    .map(
      (args, index) =>
        `        "${index}" => {\n            let value = ${name}(${args.join(", ")});\n            println!("\\u{1e}DISCERE_RETURN {:?}", value);\n        }`,
    )
    .join("\n");
  return `#![allow(unused)]\nuse super::*;\npub fn run() {\n    let mut line = String::new();\n    let _ = std::io::stdin().read_line(&mut line);\n    match line.trim() {\n${arms}\n        _ => {}\n    }\n}\n`;
}
