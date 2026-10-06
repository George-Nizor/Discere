import { resolveDatabasePath, resolveFromRepoRoot } from "@discere/paths";
import { snapshotDatabase } from "../db/backup.js";

const [operation, sourceArg, targetArg] = process.argv.slice(2);
try {
  if (operation === "backup") {
    const source = resolveDatabasePath(process.env["DISCERE_DATABASE_PATH"]);
    const target = sourceArg
      ? resolveFromRepoRoot(sourceArg)
      : resolveFromRepoRoot(
          "data/backups",
          "discere-" + new Date().toISOString().replace(/[:.]/g, "-") + ".sqlite",
        );
    console.log("Verified backup: " + (await snapshotDatabase(source, target)));
  } else if (operation === "restore" && sourceArg && targetArg) {
    // Recovery creates a separate database. It cannot replace the live database.
    const target = resolveFromRepoRoot(targetArg);
    if (target === resolveDatabasePath(process.env["DISCERE_DATABASE_PATH"]))
      throw new Error("Restore to a new database path, then select it with DISCERE_DATABASE_PATH.");
    console.log(
      "Verified recovery copy: " + (await snapshotDatabase(resolveFromRepoRoot(sourceArg), target)),
    );
  } else {
    throw new Error(
      "Use pnpm backup [new-path] or pnpm restore <backup-path> <new-database-path>.",
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
