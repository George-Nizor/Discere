import { randomUUID } from "node:crypto";
import { chmodSync, linkSync, mkdirSync, rmSync } from "node:fs";
import { chmod, link, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";

function temporaryPathFor(target: string): string {
  return path.join(path.dirname(target), "." + path.basename(target) + "." + randomUUID() + ".tmp");
}

function assertSnapshotIntact(file: string): void {
  const snapshot = new Database(file, { readonly: true, fileMustExist: true });
  try {
    if (snapshot.pragma("integrity_check", { simple: true }) !== "ok")
      throw new Error("The backup failed its integrity check.");
  } finally {
    snapshot.close();
  }
}

/**
 * The same snapshot from a connection that is already open, without waiting on a promise.
 * The store opens and migrates its database inside a constructor, so the copy taken before a
 * migration has to be synchronous. `VACUUM INTO` writes a consistent copy of the committed
 * data, including pages still in the write-ahead log. Never overwrites an existing file.
 */
export function snapshotOpenDatabase(database: Database.Database, destination: string): string {
  const target = path.resolve(destination);
  if (path.resolve(database.name) === target) throw new Error("Choose a different backup path.");
  const temporary = temporaryPathFor(target);
  try {
    mkdirSync(path.dirname(target), { recursive: true });
    database.prepare("VACUUM INTO ?").run(temporary);
    assertSnapshotIntact(temporary);
    chmodSync(temporary, 0o600);
    // link is atomic and fails if the destination already exists, including a symlink.
    linkSync(temporary, target);
    return target;
  } finally {
    rmSync(temporary, { force: true });
  }
}

/** A consistent online snapshot, atomically published to a new path. Never overwrites work. */
export async function snapshotDatabase(source: string, destination: string): Promise<string> {
  const target = path.resolve(destination);
  if (path.resolve(source) === target) throw new Error("Choose a different backup path.");
  const db = new Database(source, { readonly: true, fileMustExist: true });
  const temporary = temporaryPathFor(target);
  try {
    if (db.pragma("integrity_check", { simple: true }) !== "ok")
      throw new Error("The source database failed its integrity check.");
    if (
      !db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'",
        )
        .get()
    ) {
      throw new Error("The source is not a migrated Discere database.");
    }
    await mkdir(path.dirname(target), { recursive: true });
    await db.backup(temporary);
    assertSnapshotIntact(temporary);
    await chmod(temporary, 0o600);
    // link is atomic and fails if the destination already exists, including a symlink.
    await link(temporary, target);
    return target;
  } finally {
    db.close();
    await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}
