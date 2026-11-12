import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import Database from "better-sqlite3";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import {
  backupsDirectory,
  listMigrations,
  SNAPSHOTS_KEPT,
  snapshotBeforeMigration,
} from "../src/db/migrations.js";
import { DiscereStore } from "../src/db/store.js";

/** A database as a build that stopped at `lastPrefix` would have left it, with one learner. */
function createDatabaseUpTo(file: string, lastPrefix: string): void {
  const legacy = new Database(file);
  legacy.pragma("journal_mode = WAL");
  legacy.exec("CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  for (const name of listMigrations().filter((name) => name.slice(0, 4) <= lastPrefix)) {
    legacy.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
    legacy
      .prepare("INSERT INTO schema_migrations VALUES (?, ?)")
      .run(name, "2026-09-29T00:00:00.000Z");
  }
  legacy
    .prepare(
      "INSERT INTO user_profiles (id, learner_name, xp, created_at, updated_at) VALUES ('local-user', 'Owner', 120, ?, ?)",
    )
    .run("2026-09-30T08:00:00.000Z", "2026-09-30T08:00:00.000Z");
  legacy.close();
}

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
      "essay_versions",
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

describe("snapshot before a migration", () => {
  it("copies an existing database before changing it", () => {
    createDatabaseUpTo(databasePath, "0004");
    const store = new DiscereStore(databasePath, { migrate: true });
    store.close();

    const backups = backupsDirectory(databasePath);
    expect(backups).toBe(path.join(directory, "backups"));
    const files = readdirSync(backups);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(
      /^discere-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-after-0004_review_recall\.sqlite$/,
    );
    const snapshot = new Database(path.join(backups, files[0] as string), { readonly: true });
    try {
      expect(snapshot.pragma("integrity_check", { simple: true })).toBe("ok");
      expect(snapshot.prepare("SELECT xp FROM user_profiles").get()).toEqual({ xp: 120 });
      const applied = snapshot
        .prepare("SELECT name FROM schema_migrations ORDER BY name")
        .all() as Array<{ name: string }>;
      expect(applied.at(-1)?.name).toBe("0004_review_recall.sql");
    } finally {
      snapshot.close();
    }
  });

  it("takes no snapshot of a new database or of one that is already current", () => {
    new DiscereStore(databasePath, { migrate: true }).close();
    new DiscereStore(databasePath, { migrate: true }).close();
    expect(existsSync(backupsDirectory(databasePath))).toBe(false);
  });

  it("keeps the five newest snapshots and leaves other backups alone", () => {
    createDatabaseUpTo(databasePath, "0004");
    const database = new Database(databasePath);
    const manual = path.join(backupsDirectory(databasePath), "discere-2020-01-01.sqlite");
    try {
      for (let day = 1; day <= SNAPSHOTS_KEPT + 2; day += 1) {
        snapshotBeforeMigration(database, new Date(Date.UTC(2026, 10, day)));
        if (day === 1) writeFileSync(manual, "a backup made by hand");
      }
    } finally {
      database.close();
    }
    const files = readdirSync(backupsDirectory(databasePath)).sort();
    expect(files).toEqual([
      "discere-2020-01-01.sqlite",
      ...[3, 4, 5, 6, 7].map(
        (day) => `discere-2026-11-0${day}T00-00-00-000Z-after-0004_review_recall.sqlite`,
      ),
    ]);
  });

  it("leaves the database unchanged when the snapshot cannot be written", () => {
    createDatabaseUpTo(databasePath, "0004");
    // A file where the folder should be makes the copy fail.
    writeFileSync(backupsDirectory(databasePath), "");
    expect(() => new DiscereStore(databasePath, { migrate: true })).toThrow(/has not been changed/);
    const database = new Database(databasePath, { readonly: true });
    try {
      expect(database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get()).toEqual({
        count: listMigrations().filter((name) => name.slice(0, 4) <= "0004").length,
      });
    } finally {
      database.close();
    }
  });
});

describe("a database from a newer version", () => {
  function recordFutureMigration(rollbackSafe = 0): void {
    new DiscereStore(databasePath, { migrate: true }).close();
    const database = new Database(databasePath);
    database
      .prepare("INSERT INTO schema_migrations (name, applied_at, rollback_safe) VALUES (?, ?, ?)")
      .run("9999_from_the_future.sql", "2027-01-01T00:00:00.000Z", rollbackSafe);
    database.close();
  }

  it("starts when the newer version recorded its migration as rollback-safe", () => {
    recordFutureMigration(1);
    for (const migrate of [true, false]) {
      expect(() => new DiscereStore(databasePath, { migrate }).close()).not.toThrow();
    }
  });

  it("records which migration files say an older version can run on them", () => {
    new DiscereStore(databasePath, { migrate: true }).close();
    const database = new Database(databasePath, { readonly: true });
    const safe = database
      .prepare("SELECT name FROM schema_migrations WHERE rollback_safe = 1")
      .all() as Array<{ name: string }>;
    database.close();
    expect(safe.map((row) => row.name)).toEqual([
      "0015_attempt_history.sql",
      "0016_essay_versions.sql",
    ]);
  });

  it("is refused with the unknown migrations and the backups folder named", () => {
    recordFutureMigration();
    for (const migrate of [true, false]) {
      let message = "";
      try {
        new DiscereStore(databasePath, { migrate }).close();
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain("9999_from_the_future.sql");
      expect(message).toContain("newer version");
      expect(message).toContain(backupsDirectory(databasePath));
    }
  });

  it("stops the server from starting", async () => {
    recordFutureMigration();
    await expect(createApp({ dbPath: databasePath, migrate: true })).rejects.toThrow(
      /9999_from_the_future\.sql/,
    );
  });
});
