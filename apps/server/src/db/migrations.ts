import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

/**
 * Every table Discere uses is declared in `src/db/schema.ts` and created by an ordered SQL
 * file in `drizzle/`. Route modules must not create tables at request time: a database that
 * has not been migrated is a setup fault, and the server reports it instead of quietly
 * inventing an empty schema.
 */
const MIGRATIONS_DIRECTORY = path.resolve(import.meta.dirname, "../../drizzle");
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

/** Applies every pending migration. Each file is idempotent, so a database created by an
 * earlier build keeps its rows and only gains the missing tables. */
export function runMigrations(database: Database.Database): string[] {
  database.exec(
    `CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);`,
  );
  const pending = pendingMigrations(database);
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
  const pending = pendingMigrations(database);
  if (pending.length === 0) return;
  throw new Error(
    `The database at '${databasePath}' is missing ${pending.length} migration(s): ${pending.join(", ")}. Run 'pnpm db:migrate' before starting Discere.`,
  );
}
