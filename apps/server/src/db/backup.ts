import { randomUUID } from "node:crypto";
import { chmod, link, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";

/** A consistent online snapshot, atomically published to a new path. Never overwrites work. */
export async function snapshotDatabase(source: string, destination: string): Promise<string> {
  const target = path.resolve(destination);
  if (path.resolve(source) === target) throw new Error("Choose a different backup path.");
  const db = new Database(source, { readonly: true, fileMustExist: true });
  const temporary = path.join(
    path.dirname(target),
    "." + path.basename(target) + "." + randomUUID() + ".tmp",
  );
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
    const snapshot = new Database(temporary, { readonly: true, fileMustExist: true });
    try {
      if (snapshot.pragma("integrity_check", { simple: true }) !== "ok")
        throw new Error("The backup failed its integrity check.");
    } finally {
      snapshot.close();
    }
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
