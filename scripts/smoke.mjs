import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  childEnvironment,
  findAvailablePort,
  formatHostForUrl,
  isSupportedNode,
  minimumNodeLabel,
  resolvePackageManager,
  spawnPackageManager,
  terminateProcessTree,
  waitForHttp,
} from "./lib/runtime.mjs";

function capture(child, label) {
  let output = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream?.on("data", (chunk) => {
      output = `${output}${chunk.toString()}`.slice(-20_000);
    });
  }
  return () => output ? `\n--- ${label} output ---\n${output.trim()}\n` : "";
}

async function requestJson(url, init) {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
    signal: AbortSignal.timeout(5_000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

if (!isSupportedNode()) {
  throw new Error(`Discere requires Node.js ${minimumNodeLabel()} or newer. Current version: ${process.versions.node}.`);
}
const manager = resolvePackageManager();
if (!manager) throw new Error("pnpm is unavailable; the smoke test cannot start the workspace services.");
if (!existsSync(resolve("apps/web/dist/index.html"))) {
  throw new Error("The production web bundle is missing. Run 'pnpm build' before 'pnpm smoke'.");
}

const host = "127.0.0.1";
const apiPort = await findAvailablePort(host, 4417);
const webPort = await findAvailablePort(host, Math.max(4418, apiPort + 1));
const tempRoot = mkdtempSync(join(tmpdir(), "discere-smoke-"));
const environment = childEnvironment({
  DISCERE_HOST: host,
  DISCERE_PORT: String(apiPort),
  DISCERE_WEB_HOST: host,
  DISCERE_WEB_PORT: String(webPort),
  DISCERE_DATABASE_PATH: join(tempRoot, "smoke.sqlite"),
  DISCERE_LEARNER_NAME: "Smoke Tester",
});
const apiUrl = `http://${formatHostForUrl(host)}:${apiPort}`;
const webUrl = `http://${formatHostForUrl(host)}:${webPort}`;

let server;
let web;
let serverOutput = () => "";
let webOutput = () => "";

try {
  server = spawnPackageManager(manager, ["--filter", "@discere/server", "start"], {
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  web = spawnPackageManager(manager, ["--filter", "@discere/web", "preview"], {
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverOutput = capture(server, "server");
  webOutput = capture(web, "web");

  await Promise.all([
    waitForHttp(`${apiUrl}/api/health`, {
      timeoutMs: 30_000,
      predicate: async (response) => response.ok && (await response.json()).service === "discere",
    }),
    waitForHttp(webUrl, { timeoutMs: 30_000 }),
    waitForHttp(`${webUrl}/api/health`, {
      timeoutMs: 30_000,
      predicate: async (response) => response.ok && (await response.json()).status === "ok",
    }),
  ]);

  const health = await requestJson(`${webUrl}/api/health`);
  if (health.status !== "ok" || health.service !== "discere") throw new Error("The proxied health response was invalid.");

  const lesson = await requestJson(`${apiUrl}/api/lessons/current`);
  if (!lesson.lesson?.id || lesson.question?.answerAuthority !== undefined || !Array.isArray(lesson.sources)) {
    throw new Error("The learner-safe lesson contract was invalid or leaked answer authority.");
  }

  const circuit = await fetch(`${apiUrl}/api/visuals/circuit.svg?voltage=5&resistance=100&values=false`, {
    signal: AbortSignal.timeout(5_000),
  });
  const circuitSvg = await circuit.text();
  if (!circuit.ok || !circuit.headers.get("content-type")?.includes("image/svg+xml") || circuitSvg.includes('class="current"')) {
    throw new Error("The concealed deterministic circuit visual failed its runtime check.");
  }

  const writing = await requestJson(`${apiUrl}/api/writing/lint`, {
    method: "POST",
    body: JSON.stringify({
      text: "This is not a formula; it is a powerful way of thinking.",
      context: "lesson",
    }),
  });
  if (writing.passed !== false || writing.violations.length === 0) throw new Error("The prose quality gate accepted a prohibited pattern.");

  const lessonId = encodeURIComponent(lesson.lesson.id);
  const emptyPage = await requestJson(`${apiUrl}/api/notebook/${lessonId}`);
  if (emptyPage.strokes.length !== 0 || emptyPage.updatedAt !== null) throw new Error("A new notebook page was not empty.");
  const notebookInput = {
    pageType: "graph",
    note: "Smoke-test working: I = V / R.",
    strokes: [{ id: "smoke-stroke", width: 3, points: [{ x: 0.1, y: 0.2 }, { x: 0.25, y: 0.35 }] }],
  };
  await requestJson(`${apiUrl}/api/notebook/${lessonId}`, {
    method: "PUT",
    body: JSON.stringify(notebookInput),
  });
  const savedPage = await requestJson(`${apiUrl}/api/notebook/${lessonId}`);
  if (savedPage.pageType !== "graph" || savedPage.note !== notebookInput.note || savedPage.strokes.length !== 1) {
    throw new Error("Notebook persistence failed its round-trip check.");
  }

  const attempt = await requestJson(`${apiUrl}/api/attempts`, {
    method: "POST",
    body: JSON.stringify({
      questionId: lesson.question.id,
      response: "50 mA",
      mode: "coach",
    }),
  });
  if (attempt.correct !== true || attempt.independent !== true) throw new Error("The numeric assessment runtime check failed.");

  console.log(`Discere smoke test passed at ${webUrl}.`);
  console.log("Verified web preview, API proxying, safe lesson delivery, visuals, writing gate, notebook persistence, and assessment.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error(serverOutput());
  console.error(webOutput());
  process.exitCode = 1;
} finally {
  terminateProcessTree(server?.pid);
  terminateProcessTree(web?.pid);
  rmSync(tempRoot, { recursive: true, force: true });
}
