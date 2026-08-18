import { resolveDatabasePath } from "@discere/paths";
import { listMigrations, pendingMigrations } from "../db/migrations.js";
import { DiscereStore } from "../db/store.js";

const databasePath = resolveDatabasePath(process.env["DISCERE_DATABASE_PATH"]);
const store = new DiscereStore(databasePath, { migrate: true });
const outstanding = pendingMigrations(store.database);
store.close();
if (outstanding.length > 0) {
  throw new Error(`Migrations did not complete: ${outstanding.join(", ")}`);
}
console.log(
  `Database schema is ready at ${databasePath} (${listMigrations().length} migrations applied).`,
);
