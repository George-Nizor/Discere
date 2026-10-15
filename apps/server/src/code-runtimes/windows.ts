import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CodeRuntimeId, CodeRuntimeState } from "@discere/contracts";
import {
  PYTHON_RUNTIME,
  RUST_RUNTIME,
  type RuntimeArtifact,
  type RuntimePin,
} from "./artifacts.js";

/**
 * Downloads, verifies and unpacks the pinned Rust and Python toolchains on Windows. Each one
 * lands in `<data>/code-runtimes/<id>-<version>`, so a Discere update keeps it, and is marked
 * ready only by an install.json written last. Every file is checked against the SHA-256
 * pinned in artifacts.ts before anything is unpacked.
 */
export interface WindowsRustToolchain {
  version: string;
  sysroot: string;
  rustc: string;
  /** The folder holding the self-contained MinGW linker that rust-mingw ships. */
  linkerDirectory: string;
}
export interface WindowsPython {
  version: string;
  home: string;
  executable: string;
  sitePackages: string;
}

interface Progress {
  state: "installing" | "failed";
  done: number;
  message?: string;
}

const PINS: Record<CodeRuntimeId, RuntimePin> = { rust: RUST_RUNTIME, python: PYTHON_RUNTIME };
const NAMES: Record<CodeRuntimeId, string> = {
  rust: "Rust",
  python: "Python with NumPy and pandas",
};

function tarExecutable(): string {
  return path.join(process.env["SystemRoot"] ?? "C:\\Windows", "System32", "tar.exe");
}

function run(command: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (data: Buffer) => {
      stderr = (stderr + data.toString("utf8")).slice(-2000);
    });
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${path.basename(command)} failed: ${stderr.trim() || `exit ${code}`}`)),
    );
  });
}

export class WindowsCodeRuntimes {
  private readonly progress = new Map<CodeRuntimeId, Progress>();
  private readonly ready = new Map<CodeRuntimeId, boolean>();

  constructor(
    private readonly dataDirectory: string,
    private readonly sandbox: string | undefined,
  ) {}

  private root(id: CodeRuntimeId): string {
    return path.join(this.dataDirectory, "code-runtimes", `${id}-${PINS[id].version}`);
  }

  private async installed(id: CodeRuntimeId): Promise<boolean> {
    if (this.ready.get(id)) return true;
    try {
      const marker = JSON.parse(
        await readFile(path.join(this.root(id), "install.json"), "utf8"),
      ) as {
        version?: string;
        artifacts?: string[];
      };
      const expected = PINS[id].artifacts.map((artifact) => artifact.sha256);
      const ok =
        marker.version === PINS[id].version &&
        JSON.stringify(marker.artifacts) === JSON.stringify(expected);
      if (ok) this.ready.set(id, true);
      return ok;
    } catch {
      return false;
    }
  }

  async state(id: CodeRuntimeId): Promise<CodeRuntimeState> {
    const pin = PINS[id];
    const base = {
      id,
      name: NAMES[id],
      downloadBytes: pin.artifacts.reduce((sum, a) => sum + a.bytes, 0),
    };
    if (!this.sandbox)
      return {
        ...base,
        state: "manual",
        message: "This copy of Discere has no sandbox helper, so it cannot run practice code.",
      };
    const progress = this.progress.get(id);
    if (progress?.state === "installing")
      return {
        ...base,
        state: "installing",
        progress: Math.min(1, progress.done / base.downloadBytes),
      };
    if (await this.installed(id)) return { ...base, state: "ready" };
    if (progress?.state === "failed")
      return { ...base, state: "failed", message: progress.message ?? "The download stopped." };
    return { ...base, state: "missing" };
  }

  async list(): Promise<CodeRuntimeState[]> {
    return [await this.state("rust"), await this.state("python")];
  }

  /** Starts an install in the background and returns at once; poll state() for progress. */
  async install(id: CodeRuntimeId): Promise<CodeRuntimeState> {
    const current = await this.state(id);
    if (current.state !== "missing" && current.state !== "failed") return current;
    this.progress.set(id, { state: "installing", done: 0 });
    this.installNow(id).then(
      () => this.progress.delete(id),
      (error: unknown) =>
        this.progress.set(id, {
          state: "failed",
          done: 0,
          message:
            `Setting up ${NAMES[id]} stopped: ${error instanceof Error ? error.message : String(error)}`.slice(
              0,
              600,
            ),
        }),
    );
    return this.state(id);
  }

  private async download(
    id: CodeRuntimeId,
    artifact: RuntimeArtifact,
    folder: string,
  ): Promise<string> {
    const target = path.join(folder, artifact.file);
    const tracker = this.progress.get(id)!;
    if (existsSync(target) && (await stat(target)).size === artifact.bytes) {
      const hash = createHash("sha256")
        .update(await readFile(target))
        .digest("hex");
      if (hash === artifact.sha256) {
        tracker.done += artifact.bytes;
        return target;
      }
    }
    const response = await fetch(artifact.url);
    if (!response.ok || !response.body)
      throw new Error(`${artifact.file} could not be downloaded (${response.status}).`);
    const hash = createHash("sha256");
    const output = createWriteStream(`${target}.partial`);
    let written = 0;
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      written += chunk.length;
      if (written > artifact.bytes) throw new Error(`${artifact.file} is larger than expected.`);
      hash.update(chunk);
      tracker.done += chunk.length;
      if (!output.write(chunk))
        await new Promise<void>((resolve) => output.once("drain", () => resolve()));
    }
    await new Promise<void>((resolve, reject) => {
      output.once("error", reject);
      output.end(() => resolve());
    });
    if (hash.digest("hex") !== artifact.sha256)
      throw new Error(`${artifact.file} does not match its pinned checksum, so it was not used.`);
    await rename(`${target}.partial`, target);
    return target;
  }

  private async installNow(id: CodeRuntimeId): Promise<void> {
    const pin = PINS[id];
    const downloads = path.join(this.dataDirectory, "code-runtimes", "downloads", id);
    const staging = `${this.root(id)}.partial`;
    await mkdir(downloads, { recursive: true });
    await rm(staging, { recursive: true, force: true });
    await mkdir(staging, { recursive: true });
    const files: string[] = [];
    for (const artifact of pin.artifacts) files.push(await this.download(id, artifact, downloads));
    for (const [index, artifact] of pin.artifacts.entries())
      await this.unpack(artifact, files[index]!, staging);
    await writeFile(
      path.join(staging, "install.json"),
      `${JSON.stringify({ version: pin.version, artifacts: pin.artifacts.map((a) => a.sha256) }, null, 2)}\n`,
    );
    await rm(this.root(id), { recursive: true, force: true });
    await rename(staging, this.root(id));
    // The sandbox may read and run the toolchain; nothing else of the user's is granted.
    if (this.sandbox) await run(this.sandbox, ["grant", "--read", this.root(id)]);
    await rm(downloads, { recursive: true, force: true });
    this.ready.set(id, true);
  }

  private async unpack(artifact: RuntimeArtifact, file: string, staging: string): Promise<void> {
    if (artifact.kind === "rust-component") {
      // A Rust dist tarball holds one folder per sub-component; installing one is copying its
      // contents into the prefix, which is what its install.sh does.
      const scratch = path.join(staging, ".unpack");
      await rm(scratch, { recursive: true, force: true });
      await mkdir(scratch, { recursive: true });
      await run(tarExecutable(), ["-xf", file, "-C", scratch]);
      const [top] = await readdir(scratch);
      if (!top) throw new Error(`${artifact.file} was empty.`);
      const components = (await readFile(path.join(scratch, top, "components"), "utf8"))
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      for (const component of components)
        await cp(path.join(scratch, top, component), staging, {
          recursive: true,
          filter: (source) => path.basename(source) !== "manifest.in",
        });
      await rm(scratch, { recursive: true, force: true });
      return;
    }
    const target = path.join(
      staging,
      artifact.kind === "python-embed" ? "python" : "site-packages",
    );
    await mkdir(target, { recursive: true });
    await run(tarExecutable(), ["-xf", file, "-C", target]);
  }

  async rust(): Promise<WindowsRustToolchain | undefined> {
    if (!this.sandbox || !(await this.installed("rust"))) return undefined;
    const sysroot = this.root("rust");
    return {
      version: RUST_RUNTIME.version,
      sysroot,
      rustc: path.join(sysroot, "bin", "rustc.exe"),
      linkerDirectory: path.join(
        sysroot,
        "lib",
        "rustlib",
        RUST_RUNTIME.target ?? "x86_64-pc-windows-gnu",
        "bin",
        "self-contained",
      ),
    };
  }

  async python(): Promise<WindowsPython | undefined> {
    if (!this.sandbox || !(await this.installed("python"))) return undefined;
    const home = path.join(this.root("python"), "python");
    return {
      version: PYTHON_RUNTIME.version,
      home,
      executable: path.join(home, "python.exe"),
      sitePackages: path.join(this.root("python"), "site-packages"),
    };
  }

  get sandboxHelper(): string | undefined {
    return this.sandbox;
  }
}
