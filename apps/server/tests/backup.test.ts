import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, expect, it } from "vitest";
import { snapshotDatabase } from "../src/db/backup.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
it("restores committed WAL data into a standalone checked database without replacing a destination", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "discere-backup-"));
  dirs.push(dir);
  const source = path.join(dir, "source.sqlite"),
    target = path.join(dir, "backup.sqlite");
  const db = new Database(source);
  try {
    db.pragma("journal_mode = WAL");
    db.exec("CREATE TABLE schema_migrations (id TEXT); CREATE TABLE notes (text TEXT);");
    db.prepare("INSERT INTO notes VALUES (?)").run("Recent working Δ = 3");
    await snapshotDatabase(source, target);
    const restored = new Database(target);
    try {
      expect(restored.pragma("integrity_check", { simple: true })).toBe("ok");
      expect(restored.prepare("SELECT text FROM notes").get()).toEqual({
        text: "Recent working Δ = 3",
      });
    } finally {
      restored.close();
    }
    const original = readFileSync(target);
    await expect(snapshotDatabase(source, target)).rejects.toThrow();
    expect(readFileSync(target)).toEqual(original);
    await expect(snapshotDatabase(source, source)).rejects.toThrow("different backup");
  } finally {
    db.close();
  }
});
it("refuses corrupt and unrelated files without producing a recovery copy", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "discere-backup-"));
  dirs.push(dir);
  const source = path.join(dir, "source.sqlite"),
    target = path.join(dir, "restore.sqlite");
  writeFileSync(source, "broken");
  await expect(snapshotDatabase(source, target)).rejects.toThrow();
  rmSync(source);
  const db = new Database(source);
  db.exec("CREATE TABLE unrelated (id INTEGER)");
  db.close();
  await expect(snapshotDatabase(source, target)).rejects.toThrow("migrated Discere");
});
