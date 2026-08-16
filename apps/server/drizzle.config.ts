import { defineConfig } from "drizzle-kit";
export default defineConfig({ schema: "./src/db/schema.ts", out: "./drizzle", dialect: "sqlite", dbCredentials: { url: process.env["DISCERE_DATABASE_PATH"] ?? "../../data/discere.sqlite" } });
