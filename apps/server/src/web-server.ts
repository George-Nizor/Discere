import { createWebApp } from "./web-app.js";

const host = process.env["DISCERE_WEB_HOST"] ?? "127.0.0.1";
const apiHost = process.env["DISCERE_HOST"] ?? "127.0.0.1";
if (![host, apiHost].every((value) => ["127.0.0.1", "localhost", "::1"].includes(value))) {
  throw new Error("Discere only binds to loopback hosts.");
}
const apiPort = process.env["DISCERE_PORT"] ?? "4317";
const webPort = Number(process.env["DISCERE_WEB_PORT"] ?? "4318");
const apiUrl = "http://" + (apiHost === "::1" ? "[::1]" : apiHost) + ":" + apiPort;
const app = await createWebApp({
  webRoot: process.env["DISCERE_WEB_ROOT"] ?? "apps/web/dist",
  apiUrl,
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
await app.listen({ host, port: webPort });
console.log("Discere release web server ready at http://" + host + ":" + webPort);
