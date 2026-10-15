import { spawnSync } from "node:child_process";
import { accessSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Installs the pinned Rust toolchain through rustup and records where it lives. The server
// binds that directory read-only into its compile sandbox; nothing is copied into Discere.
const VERSION = "1.93.1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.platform !== "linux" || process.arch !== "x64")
  throw new Error("Rust practice needs x86_64 Linux. On Windows, run this from Ubuntu WSL.");
for (const file of ["/usr/bin/bwrap", "/usr/bin/prlimit", "/usr/bin/cc"])
  try {
    accessSync(file);
  } catch {
    throw new Error(
      "Install bubblewrap 0.9+, util-linux and build-essential (for the cc linker) first.",
    );
  }
const rustup = [process.env.RUSTUP ?? "", path.join(homedir(), ".cargo/bin/rustup"), "rustup"].find(
  (candidate) => {
    if (!candidate) return false;
    return spawnSync(candidate, ["--version"], { stdio: "ignore" }).status === 0;
  },
);
if (!rustup)
  throw new Error("Install rustup from https://rustup.rs, then run pnpm rust:setup again.");
const run = (args) => {
  const result = spawnSync(rustup, args, { stdio: ["ignore", "pipe", "inherit"], shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("rustup " + args.join(" ") + " failed.");
  return result.stdout.toString("utf8").trim();
};
run(["toolchain", "install", VERSION, "--profile", "minimal"]);
const sysroot = run(["run", VERSION, "rustc", "--print", "sysroot"]);
const version = run(["run", VERSION, "rustc", "--version"]);
if (!version.startsWith("rustc " + VERSION))
  throw new Error("Expected rustc " + VERSION + ", found " + version + ".");
const directory = path.join(root, "data/rust-runtime");
mkdirSync(directory, { recursive: true });
writeFileSync(
  path.join(directory, "runtime.json"),
  JSON.stringify({ sysroot, version: VERSION }, null, 2) + "\n",
);
console.log("Rust " + VERSION + " is ready at " + sysroot + ". Run pnpm rust:check to test the sandbox.");
