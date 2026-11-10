import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type PythonExecution,
  type TypeScriptCall,
  TypeScriptCodeSchema,
  type TypeScriptDiagnostic,
  type TypeScriptRun,
  parseTypeScriptDiagnostics,
} from "@discere/contracts";
import { TYPESCRIPT_NODE_FLAGS, TYPESCRIPT_RUNNER, nodeStripsTypes } from "@discere/curriculum";
import { runSandboxed } from "../code-runtimes/sandbox.js";
import {
  TYPESCRIPT_BUSY,
  TYPESCRIPT_LIMIT,
  TYPESCRIPT_READY,
  TYPESCRIPT_SLOW,
  TYPESCRIPT_UNAVAILABLE,
  type TypeScriptFailure,
  type TypeScriptRuntime,
  everyRun,
  readRunnerOutput,
  runnerRequest,
  typescriptCompiler,
  writeCheckFiles,
} from "./runtime.js";

/**
 * Runs learner TypeScript on Windows in discere-sandbox.exe: an AppContainer with no network and
 * none of the user's files, inside a Job Object that caps memory, CPU time and processes. It
 * uses the node.exe the release already ships and the tsc.exe beside it, so there is nothing to
 * download. There is no unsandboxed fallback.
 */
export class WindowsTypeScriptRuntime implements TypeScriptRuntime {
  private active = 0;

  constructor(
    private readonly helper: string | undefined,
    private readonly node: string = process.execPath,
    private readonly compiler: string | undefined = typescriptCompiler(),
  ) {}

  async available(): Promise<boolean> {
    return Boolean(this.helper && this.compiler && nodeStripsTypes());
  }

  private async sandboxed<T>(
    busy: T,
    missing: T,
    run: (helper: string, compiler: string, work: string) => Promise<T>,
  ): Promise<T> {
    if (!this.helper || !this.compiler || !nodeStripsTypes()) return missing;
    if (this.active >= 2) return busy;
    this.active += 1;
    const work = await mkdtemp(path.join(tmpdir(), "discere-typescript-"));
    try {
      return await run(this.helper, this.compiler, work);
    } finally {
      this.active -= 1;
      await rm(work, { recursive: true, force: true });
    }
  }

  check(source: string): Promise<TypeScriptDiagnostic[] | TypeScriptFailure> {
    TypeScriptCodeSchema.parse(source);
    return this.sandboxed<TypeScriptDiagnostic[] | TypeScriptFailure>(
      { error: "runtime", message: TYPESCRIPT_BUSY },
      { error: "runtime", message: TYPESCRIPT_UNAVAILABLE },
      async (helper, compiler, work) => {
        const files = await writeCheckFiles(work, source);
        const ran = await runSandboxed(helper, {
          executable: compiler,
          args: files,
          work,
          read: [path.dirname(compiler)],
          env: { GOMAXPROCS: "2" },
          limits: { memoryMb: 1024, cpuMs: 10000, wallMs: 10000, processes: 1 },
          output: { stdout: 262144, stderr: 16384 },
        });
        if (ran.failed) return { error: "runtime", message: TYPESCRIPT_UNAVAILABLE };
        if (ran.reason === "wall" || ran.reason === "cpu")
          return { error: "limit", message: "Checking the types took too long." };
        const diagnostics = parseTypeScriptDiagnostics(ran.stdout);
        if (ran.reason === "ok" && !ran.overflow && (ran.exitCode === 0 || diagnostics.length > 0))
          return diagnostics;
        if (ran.overflow || ran.reason !== "ok" || (ran.exitCode ?? 0) < 0)
          return { error: "limit", message: "Checking the types stopped at a practice limit." };
        return { error: "runtime", message: TYPESCRIPT_UNAVAILABLE };
      },
    );
  }

  execute(
    code: string,
    runs: TypeScriptRun[],
    target: { call?: TypeScriptCall | undefined; names?: string[] | undefined },
  ): Promise<PythonExecution[]> {
    const request = runnerRequest(code, runs, target);
    return this.sandboxed(
      everyRun(runs, { error: "runtime", message: TYPESCRIPT_BUSY }),
      everyRun(runs, { error: "runtime", message: TYPESCRIPT_UNAVAILABLE }),
      async (helper, _compiler, work) => {
        const ran = await runSandboxed(helper, {
          executable: this.node,
          // The runner travels as an argument: inside an AppContainer Node cannot resolve the
          // real path of a script file, because it may not read the drive's root.
          args: [...TYPESCRIPT_NODE_FLAGS, "-e", TYPESCRIPT_RUNNER],
          work,
          read: [path.dirname(this.node)],
          stdin: request,
          limits: { memoryMb: 256, cpuMs: 3000, wallMs: 6000, processes: 1 },
          output: { stdout: 262144, stderr: 8192 },
        });
        if (ran.reason === "wall" || ran.reason === "cpu")
          return everyRun(runs, { error: "limit", message: TYPESCRIPT_SLOW });
        if (ran.overflow) return everyRun(runs, { error: "limit", message: TYPESCRIPT_LIMIT });
        if (ran.failed || !ran.stderr.includes(TYPESCRIPT_READY))
          return everyRun(runs, { error: "runtime", message: TYPESCRIPT_UNAVAILABLE });
        if (ran.reason !== "ok" || ran.exitCode !== 0)
          return everyRun(runs, { error: "limit", message: TYPESCRIPT_LIMIT });
        return readRunnerOutput(ran.stdout, runs);
      },
    );
  }
}
