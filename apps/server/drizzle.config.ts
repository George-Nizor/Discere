import { resolveDatabasePath } from "@discere/paths";
import { defineConfig } from "drizzle-kit";
export default defineConfig({ schema: "./src/db/schema.ts", out: "./drizzle", dialect: "sqlite", dbCredentials: { url: resolveDatabasePath(process.env["DISCERE_DATABASE_PATH"]) } });
