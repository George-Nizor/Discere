import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, type DiscereApp } from "../../server/src/app.js";
import { test as base } from "./fixtures.js";

/**
 * A Discere of the test's own: an empty database, the offline tutor, and a clock the test moves.
 *
 * The suite's shared server keeps what earlier tests did, so a test that needs a learner with no
 * history, or needs tomorrow to arrive, asks for `lab` instead. Addresses stay relative: `page`
 * and `request` both point at the lab's server.
 */
export interface Lab {
  address: string;
  server: DiscereApp;
  now(): Date;
  setNow(date: Date): void;
  /** Moves the server's clock forward by whole days. */
  advanceDays(days: number): void;
}

const START = "2026-10-02T02:00:00.000Z";

export const test = base.extend<{ lab: Lab }>({
  lab: async ({}, use) => {
    const directory = mkdtempSync(join(tmpdir(), "discere-e2e-lab-"));
    let now = new Date(START);
    const server = await createApp({
      dbPath: join(directory, "lab.sqlite"),
      migrate: true,
      clock: () => now,
      tutor: { providerId: "mock" },
      webRoot: join(import.meta.dirname, "../dist"),
    });
    const address = await server.app.listen({ host: "127.0.0.1", port: 0 });
    await use({
      address,
      server,
      now: () => now,
      setNow: (date) => {
        now = date;
      },
      advanceDays: (days) => {
        now = new Date(now.getTime() + days * 86_400_000);
      },
    });
    await server.app.close();
    rmSync(directory, { recursive: true, force: true });
  },
  baseURL: async ({ lab }, use) => {
    await use(lab.address);
  },
  page: async ({ page }, use) => {
    // The welcome plays once per launch. A test starts after it.
    await page.addInitScript(() => sessionStorage.setItem("discere:welcomed", "1"));
    await use(page);
  },
});

export { expect } from "./fixtures.js";
