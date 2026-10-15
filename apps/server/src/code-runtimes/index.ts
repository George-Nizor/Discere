import { type CodeRuntimeId, CodeRuntimeIdSchema, type CodeRuntimeState } from "@discere/contracts";
import { dataDirectory } from "@discere/paths";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { IsolatedPythonRuntime, type PythonRuntime } from "../python-projects/runtime.js";
import { WindowsPythonRuntime } from "../python-projects/windows.js";
import { IsolatedRustRuntime, type RustRuntime } from "../rust/runtime.js";
import { WindowsRustRuntime } from "../rust/windows.js";
import { IsolatedSqlRuntime, type SqlRuntime } from "../sql-projects/runtime.js";
import { sandboxExecutable } from "./sandbox.js";
import { WindowsCodeRuntimes } from "./windows.js";

/** What the app can say about, and do for, the toolchains practice code runs on. */
export interface CodeRuntimes {
  list(): Promise<CodeRuntimeState[]>;
  install(id: CodeRuntimeId): Promise<CodeRuntimeState>;
}

export interface CodeRunners {
  runtimes: CodeRuntimes;
  rust: RustRuntime;
  python: PythonRuntime;
  sql: SqlRuntime;
}

const LINUX_SETUP: Record<CodeRuntimeId, string> = {
  rust: "Rust practice needs its sandboxed toolchain. Run pnpm rust:setup in WSL, then restart Discere.",
  python:
    "Python practice needs its isolated runtime. Run pnpm python:setup in WSL, then restart Discere.",
};

/** A Linux checkout: the toolchains come from setup commands, so the app only reports them. */
class ManualCodeRuntimes implements CodeRuntimes {
  constructor(
    private readonly rust: RustRuntime,
    private readonly python: IsolatedPythonRuntime,
  ) {}
  async list(): Promise<CodeRuntimeState[]> {
    const rustReady = (await this.rust.status()).ready;
    const pythonReady = await this.python.available();
    return [
      rustReady
        ? { id: "rust", name: "Rust", state: "ready" }
        : { id: "rust", name: "Rust", state: "manual", message: LINUX_SETUP.rust },
      pythonReady
        ? { id: "python", name: "Python with NumPy and pandas", state: "ready" }
        : {
            id: "python",
            name: "Python with NumPy and pandas",
            state: "manual",
            message: LINUX_SETUP.python,
          },
    ];
  }
  async install(id: CodeRuntimeId): Promise<CodeRuntimeState> {
    return (await this.list()).find((runtime) => runtime.id === id)!;
  }
}

/** Windows downloads its toolchains from inside the app; Linux uses Bubblewrap and setup scripts. */
export function createCodeRunners(platform: NodeJS.Platform = process.platform): CodeRunners {
  if (platform === "win32") {
    const windows = new WindowsCodeRuntimes(dataDirectory(), sandboxExecutable());
    const configuredSql = process.env["DISCERE_SQL_PYTHON"]?.trim();
    return {
      runtimes: windows,
      rust: new WindowsRustRuntime(windows),
      python: new WindowsPythonRuntime(windows),
      sql: new IsolatedSqlRuntime(
        configuredSql || (async () => (await windows.python())?.executable),
      ),
    };
  }
  const rust = new IsolatedRustRuntime();
  const python = new IsolatedPythonRuntime();
  return {
    runtimes: new ManualCodeRuntimes(rust, python),
    rust,
    python,
    sql: new IsolatedSqlRuntime(),
  };
}

export async function registerCodeRuntimeRoutes(app: FastifyInstance, runtimes: CodeRuntimes) {
  app.get("/api/code-runtimes", async () => ({ runtimes: await runtimes.list() }));
  app.post("/api/code-runtimes/:id/install", async (request) => {
    const { id } = z.object({ id: CodeRuntimeIdSchema }).parse(request.params);
    return runtimes.install(id);
  });
}
