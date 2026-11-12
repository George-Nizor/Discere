import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type PythonExecution,
  PythonExecutionSchema,
  type TypeScriptCall,
  TypeScriptCodeSchema,
  type TypeScriptDiagnostic,
  type TypeScriptRun,
  parseTypeScriptDiagnostics,
} from "@discere/contracts";
import {
  TYPESCRIPT_AMBIENT,
  TYPESCRIPT_COMPILER_FLAGS,
  TYPESCRIPT_NODE_FLAGS,
  TYPESCRIPT_RUNNER,
  findTypeScriptCompiler,
  nodeStripsTypes,
} from "@discere/curriculum";
import { resolveFromRepoRoot } from "@discere/paths";

/**
 * Runs a learner's TypeScript. The compiler (the native `tsc`) only reads the program; Node
 * runs it. Both run inside the sandbox, and there is no unsandboxed fallback: where the sandbox
 * or either program is missing, `available` is false and every call answers `runtime`.
 */
export type TypeScriptFailure = { error: "limit" | "runtime"; message: string };
export interface TypeScriptRuntime {
  /** Whether code can run now. Optional so a test double need not answer it. */
  available?(): Promise<boolean>;
  /** Type-checks one file under `strict` and returns what the compiler reported. */
  check(source: string): Promise<TypeScriptDiagnostic[] | TypeScriptFailure>;
  /** Runs the program once per entry of `runs`, in order, and returns one result for each. */
  execute(
    code: string,
    runs: TypeScriptRun[],
    target: { call?: TypeScriptCall | undefined; names?: string[] | undefined },
  ): Promise<PythonExecution[]>;
}

export const TYPESCRIPT_UNAVAILABLE =
  "TypeScript practice cannot run on this computer yet. It needs Discere's sandbox, Node 22.13 or later and the TypeScript compiler.";
export const TYPESCRIPT_BUSY = "TypeScript practice is busy. Try again in a moment.";
export const TYPESCRIPT_SLOW = "This program took too long. Check for a loop that never ends.";
export const TYPESCRIPT_LIMIT =
  "This program stopped at a practice limit. Keep memory, loops and output small.";
export const TYPESCRIPT_READY = "DISCERE_TS_READY";

/** The compiler: the checkout's, or the copy a release bundle carries under `runtime/typescript`. */
export function typescriptCompiler(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const found = findTypeScriptCompiler(env);
  if (found || env["DISCERE_TSC"]?.trim()) return found;
  const bundled = resolveFromRepoRoot(
    "runtime",
    "typescript",
    "lib",
    process.platform === "win32" ? "tsc.exe" : "tsc",
  );
  return existsSync(bundled) ? bundled : undefined;
}

export const everyRun = (runs: TypeScriptRun[], result: PythonExecution): PythonExecution[] =>
  runs.map(() => result);

/** What the runner printed, as one result per run. */
export function readRunnerOutput(stdout: string, runs: TypeScriptRun[]): PythonExecution[] {
  try {
    const parsed = PythonExecutionSchema.array().parse(JSON.parse(stdout));
    if (parsed.length === runs.length) return parsed;
  } catch {
    // Fall through: the program wrote over the runner's output or ended it early.
  }
  return everyRun(runs, {
    error: "code",
    message: "The program ended before its result could be read. Check for code that exits early.",
  });
}

export function runnerRequest(
  code: string,
  runs: TypeScriptRun[],
  target: { call?: TypeScriptCall | undefined; names?: string[] | undefined },
): string {
  TypeScriptCodeSchema.parse(code);
  if (runs.length < 1 || runs.length > 6) throw new Error("Run one to six cases.");
  if (Boolean(target.call) === Boolean(target.names))
    throw new Error("A TypeScript run is judged on a call or on names.");
  return JSON.stringify({
    code,
    runs,
    ...(target.call ? { call: target.call } : { names: target.names }),
  });
}

/** Writes the file to check and the declarations beside it, and returns the compiler's arguments. */
export async function writeCheckFiles(work: string, source: string): Promise<string[]> {
  await writeFile(path.join(work, "main.ts"), source);
  await writeFile(path.join(work, "discere.d.ts"), TYPESCRIPT_AMBIENT);
  return [...TYPESCRIPT_COMPILER_FLAGS, "main.ts", "discere.d.ts"];
}

/**
 * A seccomp filter for x86-64, in the form Bubblewrap's `--seccomp` reads. It refuses new
 * processes while allowing the threads Node and the compiler need (`clone` with CLONE_THREAD),
 * and refuses sockets, namespaces, mounts, tracing and a few privileged calls. Bubblewrap
 * installs it just before it starts the program, so `execve` itself has to stay allowed; the
 * sandbox holds nothing to execute except the program already running.
 */
export function seccompFilter(): Buffer {
  const ALLOW = 0x7fff0000;
  const errno = (code: number) => 0x00050000 | code;
  const EPERM = 1;
  const ENOSYS = 38;
  const rows: [code: number, jt: number, jf: number, k: number][] = [
    [0x20, 0, 0, 4], // load the architecture
    [0x15, 1, 0, 0xc000003e], // x86-64, or
    [0x06, 0, 0, 0x80000000], // kill the process
    [0x20, 0, 0, 0], // load the syscall number
    [0x35, 0, 1, 0x40000000], // the x32 numbers are refused whole
    [0x06, 0, 0, errno(EPERM)],
    [0x15, 0, 4, 56], // clone: allowed only for a thread
    [0x20, 0, 0, 16],
    [0x45, 0, 1, 0x00010000], // CLONE_THREAD
    [0x06, 0, 0, ALLOW],
    [0x06, 0, 0, errno(EPERM)],
    [0x15, 0, 1, 435], // clone3 hides its flags, so glibc is told to fall back to clone
    [0x06, 0, 0, errno(ENOSYS)],
  ];
  const refused = [
    57, 58, // fork, vfork
    41, 53, // socket, socketpair
    101, 310, 311, // ptrace, process_vm_readv, process_vm_writev
    155, 161, 165, 166, // pivot_root, chroot, mount, umount2
    272, 308, // unshare, setns
    321, 298, 323, 425, // bpf, perf_event_open, userfaultfd, io_uring_setup
    246, 169, // kexec_load, reboot
    248, 249, 250, // add_key, request_key, keyctl
  ];
  for (const number of refused) rows.push([0x15, 0, 1, number], [0x06, 0, 0, errno(EPERM)]);
  rows.push([0x06, 0, 0, ALLOW]);
  const filter = Buffer.alloc(rows.length * 8);
  rows.forEach(([code, jt, jf, k], index) => {
    filter.writeUInt16LE(code, index * 8);
    filter.writeUInt8(jt, index * 8 + 2);
    filter.writeUInt8(jf, index * 8 + 3);
    filter.writeUInt32LE(k >>> 0, index * 8 + 4);
  });
  return filter;
}

interface Spawned {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  overflow: boolean;
}

/** Starts Bubblewrap with the filter on descriptor 3 and the request on stdin. */
function launch(
  bubblewrap: string,
  args: string[],
  stdin: string,
  timeoutMs: number,
  limits: { stdout: number; stderr: number },
): Promise<Spawned> {
  return new Promise((resolve) => {
    const child = spawn(bubblewrap, ["--seccomp", "3", ...args], {
      shell: false,
      env: { PATH: "/usr/bin:/bin" },
      stdio: ["pipe", "pipe", "pipe", "pipe"],
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
    child.stdout!.on("data", (data: Buffer) => {
      if (stdout.length + data.length > limits.stdout) {
        overflow = true;
        child.kill("SIGKILL");
      } else stdout += data.toString("utf8");
    });
    child.stderr!.on("data", (data: Buffer) => {
      if (stderr.length + data.length > limits.stderr) {
        overflow = true;
        child.kill("SIGKILL");
      } else stderr += data.toString("utf8");
    });
    for (const pipe of [child.stdin!, child.stdio[3] as NodeJS.WritableStream])
      pipe.on("error", () => {});
    (child.stdio[3] as NodeJS.WritableStream).end(seccompFilter());
    child.stdin!.end(stdin);
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
  "discere-typescript",
];
/** The shared libraries Node and prlimit load, and nothing else of the system. */
const LIBRARIES = [
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
];
const CLOSED = ["--proc", "/proc", "--remount-ro", "/proc", "--dev", "/dev", "--remount-ro", "/dev"];

export interface TypeScriptRuntimeOptions {
  bubblewrap?: string;
  /** The Node that runs learner code. The server's own, unless a test says otherwise. */
  node?: string;
  compiler?: string | undefined;
}

/** Linux: Bubblewrap namespaces, a seccomp filter and prlimit around the compiler and Node. */
export class IsolatedTypeScriptRuntime implements TypeScriptRuntime {
  private active = 0;
  private readonly bubblewrap: string;
  private readonly node: string;
  private readonly compiler: string | undefined;
  constructor(options: TypeScriptRuntimeOptions = {}) {
    this.bubblewrap = options.bubblewrap ?? "/usr/bin/bwrap";
    this.node = options.node ?? process.execPath;
    this.compiler = "compiler" in options ? options.compiler : typescriptCompiler();
  }
  async available(): Promise<boolean> {
    if (process.platform !== "linux" || process.arch !== "x64" || !this.compiler) return false;
    if (!nodeStripsTypes()) return false;
    try {
      await Promise.all([
        access(this.bubblewrap),
        access("/usr/bin/prlimit"),
        access(this.node),
        access(this.compiler),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  private async guarded<T>(busy: T, missing: T, work: () => Promise<T>): Promise<T> {
    if (!(await this.available())) return missing;
    if (this.active >= 2) return busy;
    this.active += 1;
    try {
      return await work();
    } finally {
      this.active -= 1;
    }
  }

  check(source: string): Promise<TypeScriptDiagnostic[] | TypeScriptFailure> {
    TypeScriptCodeSchema.parse(source);
    return this.guarded<TypeScriptDiagnostic[] | TypeScriptFailure>(
      { error: "runtime", message: TYPESCRIPT_BUSY },
      { error: "runtime", message: TYPESCRIPT_UNAVAILABLE },
      async () => {
        const work = await mkdtemp(path.join(tmpdir(), "discere-typescript-"));
        try {
          const files = await writeCheckFiles(work, source);
          const ran = await launch(
            this.bubblewrap,
            [
              ...NAMESPACES,
              ...LIBRARIES,
              "--ro-bind",
              path.dirname(this.compiler!),
              "/opt/typescript",
              "--ro-bind",
              work,
              "/work",
              ...CLOSED,
              "--size",
              "16777216",
              "--tmpfs",
              "/tmp",
              "--chdir",
              "/work",
              "--remount-ro",
              "/",
              "--clearenv",
              "--setenv",
              "HOME",
              "/tmp",
              "--setenv",
              "GOMAXPROCS",
              "2",
              "--",
              "/usr/bin/prlimit",
              "--nproc=32",
              "--as=4294967296",
              "--cpu=10",
              "--fsize=1048576",
              "--nofile=64",
              "--core=0",
              "--",
              "/opt/typescript/tsc",
              ...files,
            ],
            "",
            10000,
            { stdout: 262144, stderr: 16384 },
          );
          if (ran.timedOut)
            return { error: "limit", message: "Checking the types took too long." };
          // The compiler exits 0 with nothing to report, and 1 or 2 with errors on stdout.
          const diagnostics = parseTypeScriptDiagnostics(ran.stdout);
          if (ran.exitCode === 0 || (diagnostics.length > 0 && !ran.signal && !ran.overflow))
            return diagnostics;
          if (ran.signal || (ran.exitCode ?? 0) >= 128 || ran.overflow)
            return { error: "limit", message: "Checking the types stopped at a practice limit." };
          return { error: "runtime", message: TYPESCRIPT_UNAVAILABLE };
        } finally {
          await rm(work, { recursive: true, force: true });
        }
      },
    );
  }

  execute(
    code: string,
    runs: TypeScriptRun[],
    target: { call?: TypeScriptCall | undefined; names?: string[] | undefined },
  ): Promise<PythonExecution[]> {
    const request = runnerRequest(code, runs, target);
    return this.guarded(
      everyRun(runs, { error: "runtime", message: TYPESCRIPT_BUSY }),
      everyRun(runs, { error: "runtime", message: TYPESCRIPT_UNAVAILABLE }),
      async () => {
        const ran = await launch(
          this.bubblewrap,
          [
            ...NAMESPACES,
            ...LIBRARIES,
            "--ro-bind",
            this.node,
            "/app/node",
            ...CLOSED,
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
            // Node starts a handful of threads of its own; this leaves no room for many more.
            "--nproc=32",
            "--as=1610612736",
            "--cpu=3",
            "--fsize=1048576",
            "--nofile=64",
            "--core=0",
            "--",
            "/app/node",
            ...TYPESCRIPT_NODE_FLAGS,
            "-e",
            TYPESCRIPT_RUNNER,
          ],
          request,
          5000,
          { stdout: 262144, stderr: 8192 },
        );
        if (ran.timedOut) return everyRun(runs, { error: "limit", message: TYPESCRIPT_SLOW });
        if (!ran.stderr.includes(TYPESCRIPT_READY) && !ran.overflow)
          return everyRun(runs, { error: "runtime", message: TYPESCRIPT_UNAVAILABLE });
        // Bubblewrap reports a child killed by a signal as 128 + the signal.
        if (ran.overflow || ran.signal || ran.exitCode === null || ran.exitCode >= 128)
          return everyRun(runs, { error: "limit", message: TYPESCRIPT_LIMIT });
        // V8 aborts with 134 above; any other exit is the runner's own refusal of its input.
        if (ran.exitCode !== 0)
          return everyRun(runs, { error: "limit", message: TYPESCRIPT_LIMIT });
        return readRunnerOutput(ran.stdout, runs);
      },
    );
  }
}
