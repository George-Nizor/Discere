import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  childEnvironment,
  formatHostForUrl,
  isLoopbackHost,
  isSupportedNode,
  minimumNodeLabel,
  parsePort,
  portAvailable,
  REPO_ROOT,
  resolvePackageManager,
  runPackageManager,
} from "./lib/runtime.mjs";

const results = [];
function record(level, name, detail) {
  results.push({ level, name, detail });
}

if (isSupportedNode()) {
  record("ok", "Node.js", `v${process.versions.node}`);
} else {
  record("error", "Node.js", `v${process.versions.node}; requires ${minimumNodeLabel()} or newer`);
}

const manager = resolvePackageManager();
if (manager) record("ok", "Package manager", manager.label);
else record("error", "Package manager", "pnpm was not found; run 'corepack enable' or install pnpm 11.17.0");

const environment = childEnvironment();
const apiHost = environment.DISCERE_HOST || "127.0.0.1";
const apiPort = parsePort(environment.DISCERE_PORT, 4317);
const webHost = environment.DISCERE_WEB_HOST || "127.0.0.1";
const webPort = parsePort(environment.DISCERE_WEB_PORT, 4318);

if (existsSync(resolve(".env"))) record("ok", "Environment file", ".env is present");
else record("warning", "Environment file", ".env is missing; run 'pnpm run setup' or copy .env.example");

if (isLoopbackHost(apiHost) && isLoopbackHost(webHost)) {
  record("ok", "Network binding", `${apiHost}:${apiPort} and ${webHost}:${webPort} are local-only`);
} else {
  record("error", "Network binding", "the prototype must use a loopback host (127.0.0.1, localhost, or ::1)");
}

if (existsSync(resolve("node_modules"))) record("ok", "Dependencies", "node_modules is present");
else record("error", "Dependencies", "node_modules is missing; run 'pnpm install'");

const configuredDatabasePath = environment.DISCERE_DATABASE_PATH || "./data/discere.sqlite";
const databasePath = resolve(REPO_ROOT, configuredDatabasePath);
if (existsSync(databasePath)) record("ok", "Database", databasePath);
else record("warning", "Database", `${databasePath} does not exist yet; run 'pnpm db:migrate' and 'pnpm db:seed'`);

if (existsSync(resolve("apps/web/dist/index.html"))) record("ok", "Prototype build", "apps/web/dist/index.html is present");
else record("warning", "Prototype build", "no production web bundle; run 'pnpm build' before 'pnpm start'");

async function inspectPort(name, host, port, kind) {
  if (await portAvailable(host, port)) {
    record("ok", name, `${host}:${port} is available`);
    return;
  }

  const url = `http://${formatHostForUrl(host)}:${port}${kind === "api" ? "/api/health" : ""}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    if (kind === "api") {
      const body = await response.json();
      if (response.ok && body.status === "ok" && body.service === "discere") {
        record("ok", name, `Discere is already responding on ${host}:${port}`);
        return;
      }
    } else {
      const body = await response.text();
      if (response.ok && body.includes("<title>Discere</title>")) {
        record("ok", name, `Discere is already responding on ${host}:${port}`);
        return;
      }
    }
  } catch {
    // The error below describes the actionable state.
  }
  record("error", name, `${host}:${port} is occupied by another process`);
}

await inspectPort("API port", apiHost, apiPort, "api");
await inspectPort("Web port", webHost, webPort, "web");

/**
 * Playwright downloads Chromium but not the system libraries it links against, and a missing
 * one surfaces as a browser that will not launch rather than as a missing package. Asking the
 * dynamic linker is the only check that also accounts for an LD_LIBRARY_PATH workaround.
 */
function checkBrowserLibraries() {
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || resolve(homedir(), ".cache/ms-playwright");
  if (!existsSync(cache)) {
    record("warning", "Browser libraries", `no Playwright browsers in ${cache}; run 'pnpm --filter @discere/web exec playwright install chromium'`);
    return;
  }
  let binary;
  for (const entry of readdirSync(cache).filter((name) => name.startsWith("chromium")).sort().reverse()) {
    for (const candidate of ["chrome-linux64/chrome", "chrome-linux/chrome", "chrome-linux/headless_shell"]) {
      const full = resolve(cache, entry, candidate);
      if (existsSync(full)) { binary = full; break; }
    }
    if (binary) break;
  }
  if (!binary) {
    record("warning", "Browser libraries", "no Chromium binary found; run 'pnpm --filter @discere/web exec playwright install chromium'");
    return;
  }
  let output;
  try {
    output = spawnSync("ldd", [binary], { encoding: "utf8" }).stdout ?? "";
  } catch {
    record("warning", "Browser libraries", "'ldd' is unavailable, so Chromium's libraries could not be checked");
    return;
  }
  const missing = output
    .split("\n")
    .filter((line) => line.includes("not found"))
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
  if (missing.length === 0) {
    record("ok", "Browser libraries", "Chromium's shared libraries all resolve");
    return;
  }
  record(
    "warning",
    "Browser libraries",
    `${missing.join(", ")} missing, so Playwright cannot launch Chromium. Install them with 'sudo apt-get install -y libnspr4 libnss3 libasound2t64', or without root: 'mkdir -p /tmp/discere-browser-libs/debs && cd /tmp/discere-browser-libs/debs && apt-get download libnspr4 libnss3 libasound2t64 && for d in *.deb; do dpkg -x "$d" /tmp/discere-browser-libs; done' then export LD_LIBRARY_PATH=/tmp/discere-browser-libs/usr/lib/x86_64-linux-gnu`,
  );
}

checkBrowserLibraries();

if (manager && existsSync(resolve("node_modules"))) {
  try {
    runPackageManager(
      manager,
      ["--filter", "@discere/server", "exec", "node", "-e", "const Database=require('better-sqlite3');const db=new Database(':memory:');db.exec('select 1');db.close();"],
      { stdio: "pipe", encoding: "utf8" },
    );
    record("ok", "SQLite native module", "better-sqlite3 loaded successfully");
  } catch (error) {
    record("error", "SQLite native module", error instanceof Error ? error.message : String(error));
  }
}

console.log("Discere environment check\n");
for (const result of results) {
  const marker = result.level === "ok" ? "[ok]" : result.level === "warning" ? "[warn]" : "[error]";
  console.log(`${marker.padEnd(7)} ${result.name}: ${result.detail}`);
}

const errors = results.filter((result) => result.level === "error").length;
const warnings = results.filter((result) => result.level === "warning").length;
console.log(`\n${errors === 0 ? "Environment is usable." : `${errors} blocking problem${errors === 1 ? "" : "s"} found.`}${warnings > 0 ? ` ${warnings} warning${warnings === 1 ? "" : "s"}.` : ""}`);
if (errors > 0) process.exitCode = 1;
