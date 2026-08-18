import { createApp } from "./app.js";

const port = Number(process.env["DISCERE_PORT"] ?? process.env["PORT"] ?? 4317);
const host = process.env["DISCERE_HOST"] ?? process.env["HOST"] ?? "127.0.0.1";
/**
 * A launcher starting Discere for the first time has no migrated database and no chance to run
 * the migration script, so it asks for one at boot. Left unset, the server still refuses to
 * start against an unmigrated database rather than inventing an empty schema.
 */
const migrate = process.env["DISCERE_AUTO_MIGRATE"] === "1";

// Nothing listens until the content loads, the database is migrated, and every route is
// registered, so a health check that answers at all is answering from a ready server.
const { app } = await createApp({ logger: true, migrate });
await app.listen({ port, host });
