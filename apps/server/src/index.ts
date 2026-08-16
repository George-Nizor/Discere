import { createApp } from "./app.js";
const port = Number(process.env["DISCERE_PORT"] ?? process.env["PORT"] ?? 4317);
const host = process.env["DISCERE_HOST"] ?? process.env["HOST"] ?? "127.0.0.1";
const { app } = await createApp({ logger: true });
await app.listen({ port, host });
