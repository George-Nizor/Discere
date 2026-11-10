import { readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { resolveFromRepoRoot } from "@discere/paths";
import { snapshotOpenDatabase } from "./backup.js";

/**
 * Every table Discere uses is declared in `src/db/schema.ts` and created by an ordered SQL
 * file in `drizzle/`. Route modules must not create tables at request time: a database that
 * has not been migrated is a setup fault, and the server reports it instead of quietly
 * inventing an empty schema.
 */
const MIGRATIONS_DIRECTORY = resolveFromRepoRoot("apps/server/drizzle");
const LEDGER_TABLE = "schema_migrations";

export function listMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIRECTORY)
    .filter((entry) => entry.endsWith(".sql"))
    .sort();
}

function hasLedger(database: Database.Database): boolean {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(LEDGER_TABLE);
  return row !== undefined;
}

function appliedMigrations(database: Database.Database): Set<string> {
  if (!hasLedger(database)) return new Set();
  const rows = database.prepare(`SELECT name FROM ${LEDGER_TABLE}`).all() as Array<{
    name: string;
  }>;
  return new Set(rows.map((row) => row.name));
}

export function pendingMigrations(database: Database.Database): string[] {
  const applied = appliedMigrations(database);
  return listMigrations().filter((name) => !applied.has(name));
}

/** Ledger entries this build has no file for, which means a newer build wrote them. */
export function unknownMigrations(database: Database.Database): string[] {
  const known = new Set(listMigrations());
  return [...appliedMigrations(database)].filter((name) => !known.has(name)).sort();
}

/** The folder beside the database file that holds the snapshots taken before a migration. */
export function backupsDirectory(databasePath: string): string {
  return path.join(path.dirname(path.resolve(databasePath)), "backups");
}

/**
 * An older build must not run on a schema a newer build has changed: its queries would read
 * and write columns whose meaning has moved. This happens when the launcher rolls Discere
 * back after an update that already migrated the database.
 */
function assertNoUnknownMigrations(database: Database.Database, databasePath: string): void {
  const unknown = unknownMigrations(database);
  if (unknown.length === 0) return;
  throw new Error(
    `The database at '${databasePath}' was migrated by a newer version of Discere. It records ` +
      `${unknown.length} migration(s) this version does not have: ${unknown.join(", ")}. ` +
      `Discere will not start on it. Install the newer version again, or restore the snapshot ` +
      `taken before that update from '${backupsDirectory(databasePath)}' with 'pnpm restore'.`,
  );
}

const SNAPSHOT_PATTERN = /^discere-.+-after-.+\.sqlite$/;
export const SNAPSHOTS_KEPT = 5;

function isOnDisk(database: Database.Database): boolean {
  return !database.memory && database.name !== "" && database.name !== ":memory:";
}

function holdsTables(database: Database.Database): boolean {
  const row = database
    .prepare(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> ?",
    )
    .get(LEDGER_TABLE) as { count: number };
  return row.count > 0;
}

/**
 * Copies the database into `backups/` beside it and keeps the five newest copies. The file
 * name carries the time and the last migration the copy has, for example
 * `discere-2026-11-10T09-30-00-000Z-after-0014_rust_projects.sqlite`. Snapshots written by
 * `pnpm backup` use another name and are never removed here.
 */
export function snapshotBeforeMigration(
  database: Database.Database,
  now: Date = new Date(),
): string {
  const directory = backupsDirectory(database.name);
  const last = [...appliedMigrations(database)]
    .sort()
    .at(-1)
    ?.replace(/\.sql$/, "");
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const target = snapshotOpenDatabase(
    database,
    path.join(directory, `discere-${stamp}-after-${last ?? "no-ledger"}.sqlite`),
  );
  const snapshots = readdirSync(directory)
    .filter((entry) => SNAPSHOT_PATTERN.test(entry))
    .sort();
  for (const stale of snapshots.slice(0, Math.max(0, snapshots.length - SNAPSHOTS_KEPT))) {
    rmSync(path.join(directory, stale), { force: true });
  }
  return target;
}

/**
 * Applies every pending migration, each in its own transaction with its ledger entry. The
 * ledger is what stops a file running twice. Most files would survive it (`CREATE TABLE IF
 * NOT EXISTS`), but the `ALTER TABLE` ones would fail on a second run, so a file must never
 * be applied outside this function.
 *
 * A database that already holds tables is copied to `backups/` first, because the launcher
 * migrates the only copy of the learner's data when it starts an update. A new database has
 * nothing to lose and is not copied. If the copy cannot be written, nothing is migrated.
 */
export function runMigrations(database: Database.Database): string[] {
  assertNoUnknownMigrations(database, database.name);
  const pending = pendingMigrations(database);
  if (pending.length > 0 && isOnDisk(database) && holdsTables(database)) {
    try {
      snapshotBeforeMigration(database);
    } catch (error) {
      throw new Error(
        `Discere could not copy the database at '${database.name}' before migrating it, so it has not been changed. ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  database.exec(
    `CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);`,
  );
  const record = database.prepare(`INSERT INTO ${LEDGER_TABLE} (name, applied_at) VALUES (?, ?)`);
  for (const name of pending) {
    const sql = readFileSync(path.join(MIGRATIONS_DIRECTORY, name), "utf8");
    database.transaction(() => {
      database.exec(sql);
      record.run(name, new Date().toISOString());
    })();
  }
  return pending;
}

export function assertSchemaReady(database: Database.Database, databasePath: string): void {
  assertNoUnknownMigrations(database, databasePath);
  const pending = pendingMigrations(database);
  if (pending.length === 0) return;
  throw new Error(
    `The database at '${databasePath}' is missing ${pending.length} migration(s): ${pending.join(", ")}. Run 'pnpm db:migrate' before starting Discere.`,
  );
}
