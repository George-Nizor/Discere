import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const pidFile = resolve(".discere-pids.json");
const fileEnvironment = {};
const envFile = resolve(".env");
if (existsSync(envFile)) {
  for (const rawLine of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    fileEnvironment[key] = value;
  }
}
const childEnvironment = { ...process.env, ...fileEnvironment };
const spawnOptions = {
  stdio: "inherit",
  shell: process.platform === "win32",
  detached: process.platform !== "win32",
  env: childEnvironment,
};
const children = [
  spawn("pnpm", ["--filter", "@discere/server", "dev"], spawnOptions),
  spawn("pnpm", ["--filter", "@discere/web", "dev"], spawnOptions),
];

writeFileSync(
  pidFile,
  JSON.stringify({ parent: process.pid, children: children.map((child) => child.pid).filter(Boolean) }),
);

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid) continue;
    try {
      process.platform === "win32" ? child.kill("SIGTERM") : process.kill(-child.pid, "SIGTERM");
    } catch {
      // The process group may already have stopped.
    }
  }
  rmSync(pidFile, { force: true });
  setTimeout(() => process.exit(exitCode), 250).unref();
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
process.on("exit", () => rmSync(pidFile, { force: true }));

for (const child of children) {
  child.on("exit", (code) => {
    if (!stopping && code !== 0) stop(code ?? 1);
  });
}
