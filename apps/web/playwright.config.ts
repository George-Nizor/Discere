import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// The ports can be moved, so a second run (or a developer's own engine) never collides.
const API_PORT = Number(process.env["DISCERE_E2E_API_PORT"] ?? 4517);
const WEB_PORT = Number(process.env["DISCERE_E2E_WEB_PORT"] ?? 4518);
const HOST = "127.0.0.1";
const CI = Boolean(process.env["CI"]);
// `DISCERE_E2E_SKIP_BUILD=1` serves the `dist` that is already there, for running one spec
// again and again while working on it. A full run builds first.
const skipBuild = process.env["DISCERE_E2E_SKIP_BUILD"] === "1";

// A disposable database keeps the run repeatable: progress, drafts and review schedules all
// start empty, so the journey assertions do not depend on earlier sessions.
const dataRoot = join(tmpdir(), `discere-e2e-${API_PORT}`);
rmSync(dataRoot, { recursive: true, force: true });
mkdirSync(dataRoot, { recursive: true });

const environment = {
  DISCERE_HOST: HOST,
  DISCERE_PORT: String(API_PORT),
  DISCERE_WEB_HOST: HOST,
  DISCERE_WEB_PORT: String(WEB_PORT),
  DISCERE_DATABASE_PATH: join(dataRoot, "e2e.sqlite"),
  DISCERE_LEARNER_NAME: "Journey Tester",
  // The offline fixture provider answers in process, so the tutor path runs without a
  // subscription and without a network call.
  DISCERE_TUTOR_PROVIDER: "mock",
};

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  // One worker: most specs share the server above, and the code sandbox takes one program at a
  // time. A spec that needs an empty database starts its own server (e2e/isolated-app.ts).
  workers: 1,
  // A hosted runner is slower and noisier than a desk, so it gets longer and one more try. A
  // test that only passes on its second try is reported as flaky, not hidden.
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  timeout: CI ? 60_000 : 30_000,
  expect: { timeout: CI ? 10_000 : 5_000 },
  reporter: [
    [CI ? "github" : "list"],
    ["html", { open: "never", outputFolder: "./playwright-report" }],
  ],
  use: {
    baseURL: `http://${HOST}:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @discere/server db:migrate && pnpm --filter @discere/server start",
      url: `http://${HOST}:${API_PORT}/api/health`,
      cwd: "../..",
      env: environment,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: skipBuild
        ? "pnpm --filter @discere/server start:web"
        : "pnpm --filter @discere/web build && pnpm --filter @discere/server start:web",
      url: `http://${HOST}:${WEB_PORT}/`,
      cwd: "../..",
      env: environment,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
