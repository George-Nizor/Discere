import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  childEnvironment,
  formatHostForUrl,
  isLoopbackHost,
  isProcessRunning,
  isSupportedNode,
  minimumNodeLabel,
  parsePort,
  portAvailable,
  resolvePackageManager,
  spawnPackageManager,
  terminateProcessTree,
  waitForHttp,
} from "./runtime.mjs";

const PID_FILE = resolve(".discere-pids.json");

function readPidState() {
  if (!existsSync(PID_FILE)) return null;
  try {
    return JSON.parse(readFileSync(PID_FILE, "utf8"));
  } catch {
    rmSync(PID_FILE, { force: true });
    return null;
  }
}

function assertNoRunningStack() {
  const state = readPidState();
  if (!state) return;
  const recorded = [state.parent, ...(Array.isArray(state.children) ? state.children : [])];
  if (recorded.some((pid) => isProcessRunning(pid))) {
    throw new Error("Discere already has recorded processes. Run 'pnpm stop' before starting another copy.");
  }
  rmSync(PID_FILE, { force: true });
}

export async function runStack(mode) {
  if (mode !== "development" && mode !== "prototype") {
    throw new Error(`Unknown Discere stack mode '${mode}'.`);
  }
  if (!isSupportedNode()) {
    throw new Error(`Discere requires Node.js ${minimumNodeLabel()} or newer. Current version: ${process.versions.node}.`);
  }

  const manager = resolvePackageManager();
  if (!manager) {
    throw new Error("pnpm is unavailable. Run 'corepack enable' or install pnpm 11.17.0, then try again.");
  }

  const environment = childEnvironment();
  const apiHost = environment.DISCERE_HOST || "127.0.0.1";
  const apiPort = parsePort(environment.DISCERE_PORT, 4317);
  const webHost = environment.DISCERE_WEB_HOST || "127.0.0.1";
  const webPort = parsePort(environment.DISCERE_WEB_PORT, 4318);

  if (!isLoopbackHost(apiHost) || !isLoopbackHost(webHost)) {
    throw new Error("The prototype only binds to a loopback host. Use 127.0.0.1, localhost, or ::1 in .env.");
  }
  if (mode === "prototype" && !existsSync(resolve("apps/web/dist/index.html"))) {
    throw new Error("The production web bundle is missing. Run 'pnpm build' before 'pnpm start'.");
  }

  assertNoRunningStack();
  if (!(await portAvailable(apiHost, apiPort))) {
    throw new Error(`API port ${apiPort} is already in use on ${apiHost}. Change DISCERE_PORT or stop the other process.`);
  }
  if (!(await portAvailable(webHost, webPort))) {
    throw new Error(`Web port ${webPort} is already in use on ${webHost}. Change DISCERE_WEB_PORT or stop the other process.`);
  }

  const apiUrl = `http://${formatHostForUrl(apiHost)}:${apiPort}`;
  const webUrl = `http://${formatHostForUrl(webHost)}:${webPort}`;
  const serverCommand = mode === "development" ? "dev" : "start";
  const webCommand = mode === "development" ? "dev" : "preview";
  const children = [
    spawnPackageManager(manager, ["--filter", "@discere/server", serverCommand], { env: environment }),
    spawnPackageManager(manager, ["--filter", "@discere/web", webCommand], { env: environment }),
  ];

  if (children.some((child) => !child.pid)) {
    for (const child of children) terminateProcessTree(child.pid);
    throw new Error("Discere could not obtain process IDs for the local services.");
  }

  writeFileSync(
    PID_FILE,
    `${JSON.stringify({
      schemaVersion: 1,
      parent: process.pid,
      children: children.map((child) => child.pid),
      mode,
      startedAt: new Date().toISOString(),
      apiUrl,
      webUrl,
    }, null, 2)}\n`,
  );

  let stopping = false;
  function stop(exitCode = 0) {
    if (stopping) return;
    stopping = true;
    for (const child of children) terminateProcessTree(child.pid);
    rmSync(PID_FILE, { force: true });
    setTimeout(() => process.exit(exitCode), 200).unref();
  }

  process.on("SIGINT", () => stop(0));
  process.on("SIGTERM", () => stop(0));
  for (const child of children) {
    child.on("error", (error) => {
      if (stopping) return;
      console.error(`Discere service failed to start: ${error.message}`);
      stop(1);
    });
    child.on("exit", (code, signal) => {
      if (stopping) return;
      console.error(`Discere service exited unexpectedly (${signal ?? `code ${code ?? 1}`}).`);
      stop(code && code > 0 ? code : 1);
    });
  }

  try {
    await Promise.all([
      waitForHttp(`${apiUrl}/api/health`, {
        timeoutMs: 30_000,
        predicate: async (response) => response.ok && (await response.json()).status === "ok",
      }),
      waitForHttp(webUrl, { timeoutMs: 30_000 }),
    ]);
  } catch (error) {
    for (const child of children) terminateProcessTree(child.pid);
    rmSync(PID_FILE, { force: true });
    throw error;
  }

  console.log("");
  console.log(`Discere ${mode === "development" ? "development" : "prototype"} stack is ready.`);
  console.log(`Open: ${webUrl}`);
  console.log(`API:  ${apiUrl}`);
  console.log("Press Ctrl+C to stop both services.");
}
