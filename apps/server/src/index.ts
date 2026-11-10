import { createApp } from "./app.js";
import { assertBindHost } from "./host-guard.js";

const port = Number(process.env["DISCERE_PORT"] ?? process.env["PORT"] ?? 4317);
const host = process.env["DISCERE_HOST"] ?? process.env["HOST"] ?? "127.0.0.1";
// Checked before the content loads, so a wrong address fails in a second with its reason.
assertBindHost(host, process.env["DISCERE_HOST"] === undefined ? "HOST" : "DISCERE_HOST");
/**
 * A launcher starting Discere for the first time has no migrated database and no chance to run
 * the migration script, so it asks for one at boot. Left unset, the server still refuses to
 * start against an unmigrated database rather than inventing an empty schema.
 */
const migrate = process.env["DISCERE_AUTO_MIGRATE"] === "1";

// Nothing listens until the content loads, the database is migrated, and every route is
// registered, so a health check that answers at all is answering from a ready server.
const { app } = await createApp({ logger: true, migrate });

// Closing the app runs its onClose hooks: running tutor jobs are aborted and the database is
// closed cleanly. A close that hangs on an open connection is cut short after five seconds.
const SHUTDOWN_TIMEOUT_MS = 5000;
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    app.log.info(`Received ${signal}. Discere is stopping.`);
    setTimeout(() => {
      app.log.error("Discere did not stop within five seconds and is exiting now.");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
    app.close().then(
      () => process.exit(0),
      (error: unknown) => {
        app.log.error(error);
        process.exit(1);
      },
    );
  });
}

await app.listen({ port, host });
