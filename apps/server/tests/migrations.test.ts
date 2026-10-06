import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import Database from "better-sqlite3";
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
  it("preserves historical XP, backfills genuine study, and remembers tutor assistance", () => {
    const legacy = new Database(databasePath);
    legacy.exec("CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
    for (const name of listMigrations().filter((name) => name < "0005")) {
      legacy.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
      legacy
        .prepare("INSERT INTO schema_migrations VALUES (?, ?)")
        .run(name, "2026-09-29T00:00:00.000Z");
    }
    const at = "2026-09-30T08:00:00.000Z";
    legacy
      .prepare(
        "INSERT INTO user_profiles (id, learner_name, xp, created_at, updated_at) VALUES ('local-user', 'Owner', 120, ?, ?)",
      )
      .run(at, at);
    for (const [id, response] of [
      ["real", "0.05 A"],
      ["pending", ""],
    ]) {
      legacy
        .prepare(
          "INSERT INTO attempts (id,user_id,question_id,response,mode,correct,feedback,created_at,updated_at) VALUES (?, 'local-user', 'q1', ?, 'coach', 1, 'feedback', ?, ?)",
        )
        .run(id, response, at, at);
    }
    legacy
      .prepare(
        "INSERT INTO assistance_events (id,attempt_id,type,created_at) VALUES ('help','real','tutor_reply', ?)",
      )
      .run(at);
    legacy.close();
    const migrated = new DiscereStore(databasePath, { migrate: true, clock: () => new Date(at) });
    migrated.study.updatePreferences({ timeZone: "UTC" });
    expect(migrated.getProfile().xp).toBe(120);
    expect(migrated.study.summary().totals.answers).toBe(1);
    expect(migrated.study.summary().totals.independent).toBe(0);
    expect(migrated.study.summary().streak.days).toBe(1);
    expect(migrated.study.summary().calendar.at(-1)?.xp).toBe(0);
    migrated.close();
    const reopened = new DiscereStore(databasePath, { migrate: true, clock: () => new Date(at) });
    expect(reopened.getProfile().xp).toBe(120);
    expect(reopened.study.summary().totals.answers).toBe(1);
    reopened.close();
  });
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
      "course_check_sessions",
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
