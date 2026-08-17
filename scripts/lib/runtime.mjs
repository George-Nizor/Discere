import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import { resolve } from "node:path";

export const MINIMUM_NODE_VERSION = [22, 16, 0];

export function versionParts(version = process.versions.node) {
  return version.split(".").map((part) => Number.parseInt(part, 10) || 0);
}

export function isSupportedNode(version = process.versions.node) {
  const current = versionParts(version);
  for (let index = 0; index < MINIMUM_NODE_VERSION.length; index += 1) {
    const actual = current[index] ?? 0;
    const required = MINIMUM_NODE_VERSION[index] ?? 0;
    if (actual > required) return true;
    if (actual < required) return false;
  }
  return true;
}

export function minimumNodeLabel() {
  return MINIMUM_NODE_VERSION.join(".");
}

export function readEnvironmentFile(file = resolve(".env")) {
  const values = {};
  if (!existsSync(file)) return values;

  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim().replace(/^export\s+/, "");
    const value = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    values[key] = value;
  }
  return values;
}

export function childEnvironment(overrides = {}) {
  return { ...process.env, ...readEnvironmentFile(), ...overrides };
}

export function resolvePackageManager() {
  const candidates = [
    { command: "pnpm", prefix: [], label: "pnpm" },
    { command: "corepack", prefix: ["pnpm"], label: "corepack pnpm" },
  ];

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, [...candidate.prefix, "--version"], {
      stdio: "ignore",
      shell: process.platform === "win32",
    });
    if (!result.error && result.status === 0) return candidate;
  }
  return null;
}

export function runPackageManager(manager, args, options = {}) {
  const result = spawnSync(manager.command, [...manager.prefix, ...args], {
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    stdio: options.stdio ?? "inherit",
    encoding: options.encoding,
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = typeof result.stderr === "string" && result.stderr.trim() ? `\n${result.stderr.trim()}` : "";
    throw new Error(`${manager.label} ${args.join(" ")} exited with status ${result.status ?? "unknown"}.${detail}`);
  }
  return result;
}

export function spawnPackageManager(manager, args, options = {}) {
  return spawn(manager.command, [...manager.prefix, ...args], {
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    stdio: options.stdio ?? "inherit",
    shell: process.platform === "win32",
    detached: options.detached ?? process.platform !== "win32",
  });
}

export function isProcessRunning(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function terminateProcessTree(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return;
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
      return;
    }
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      process.kill(pid, "SIGTERM");
    }
  } catch {
    // The process may already have stopped.
  }
}

export function isLoopbackHost(host) {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

export function formatHostForUrl(host) {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

export function parsePort(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : fallback;
}

export function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

export function portAvailable(host, port) {
  return new Promise((resolveResult) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolveResult(false));
    server.listen({ host, port, exclusive: true }, () => {
      server.close(() => resolveResult(true));
    });
  });
}

export async function findAvailablePort(host, preferredPort, attempts = 30) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const candidate = preferredPort + offset;
    if (candidate > 65_535) break;
    if (await portAvailable(host, candidate)) return candidate;
  }
  throw new Error(`No free port was found from ${preferredPort} to ${Math.min(65_535, preferredPort + attempts - 1)}.`);
}

export async function waitForHttp(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const intervalMs = options.intervalMs ?? 250;
  const requestTimeoutMs = options.requestTimeoutMs ?? 2_000;
  const predicate = options.predicate ?? ((response) => response.ok);
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(requestTimeoutMs) });
      if (await predicate(response)) return;
      lastError = new Error(`Received HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await delay(intervalMs);
  }

  const detail = lastError instanceof Error ? ` Last result: ${lastError.message}` : "";
  throw new Error(`Timed out waiting for ${url}.${detail}`);
}
