import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const API_PORT = 4517;
const WEB_PORT = 4518;
const HOST = "127.0.0.1";

// A disposable database keeps the run repeatable: progress, drafts and review schedules all
// start empty, so the journey assertions do not depend on earlier sessions.
const dataRoot = join(tmpdir(), "discere-e2e");
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
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "./playwright-report" }]],
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
      command: "pnpm --filter @discere/web build && pnpm --filter @discere/web preview",
      url: `http://${HOST}:${WEB_PORT}/`,
      cwd: "../..",
      env: environment,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
