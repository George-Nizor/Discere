import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { listMigrations } from "../src/db/migrations.js";
import { DiscereStore } from "../src/db/store.js";

let directory: string;
let databasePath: string;

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "discere-migrations-"));
  databasePath = path.join(directory, "discere.sqlite");
});
afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe("database migrations", () => {
  it("refuses to open an unmigrated database", () => {
    expect(() => new DiscereStore(databasePath)).toThrow(/pnpm db:migrate/);
  });

  it("refuses to start the server against an unmigrated database", async () => {
    await expect(createApp({ dbPath: databasePath })).rejects.toThrow(/pnpm db:migrate/);
  });

  it("creates every table the application uses and stays idempotent", () => {
    const first = new DiscereStore(databasePath, { migrate: true });
    const tables = new Set(
      (
        first.database
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
          .all() as Array<{ name: string }>
      ).map((row) => row.name),
    );
    for (const table of [
      "user_profiles",
      "concept_progress",
      "attempts",
      "assistance_events",
      "reveal_sessions",
      "writing_gate_runs",
      "journey_progress",
      "essay_drafts",
      "essay_assessments",
      "review_cards",
      "review_sessions",
      "notebook_pages",
      "transfer_attempts",
      "schema_migrations",
    ]) {
      expect(tables.has(table)).toBe(true);
    }
    const applied = first.database
      .prepare("SELECT name FROM schema_migrations ORDER BY name")
      .all() as Array<{ name: string }>;
    expect(applied.map((row) => row.name)).toEqual(listMigrations());
    first.close();

    const second = new DiscereStore(databasePath, { migrate: true });
    expect(
      second.database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get(),
    ).toEqual({ count: listMigrations().length });
    second.close();
  });
});
