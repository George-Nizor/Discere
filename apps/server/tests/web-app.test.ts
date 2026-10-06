import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, expect, it } from "vitest";
import { createWebApp } from "../src/web-app.js";

const resources: FastifyInstance[] = [];
const dirs: string[] = [];
afterEach(async () => {
  for (const app of resources.splice(0)) await app.close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
async function gateway(apiUrl: string) {
  const dir = mkdtempSync(path.join(tmpdir(), "discere-gateway-"));
  dirs.push(dir);
  writeFileSync(path.join(dir, "index.html"), '<div id="root"></div>');
  const app = await createWebApp({ webRoot: dir, apiUrl });
  resources.push(app);
  return app;
}
it("keeps API request bytes, query, status, and download headers intact", async () => {
  const api = Fastify();
  resources.push(api);
  api.addContentTypeParser("application/octet-stream", { parseAs: "buffer" }, (_r, body, done) =>
    done(null, body),
  );
  api.post("/api/echo", (request, reply) =>
    reply
      .code(201)
      .header("x-query", request.url)
      .header("content-disposition", 'attachment; filename="backup.bin"')
      .type("application/octet-stream")
      .send(request.body),
  );
  api.get("/api/missing", (_r, reply) => reply.code(404).send({ code: "NOT_FOUND" }));
  const address = await api.listen({ host: "127.0.0.1", port: 0 });
  const web = await gateway(address);
  const bytes = Buffer.from([0, 255, 1, 128]);
  const echoed = await web.inject({
    method: "POST",
    url: "/api/echo?name=one%20two",
    headers: { "content-type": "application/octet-stream" },
    payload: bytes,
  });
  expect(echoed.statusCode).toBe(201);
  expect(echoed.rawPayload).toEqual(bytes);
  expect(echoed.headers["x-query"]).toBe("/api/echo?name=one%20two");
  expect(echoed.headers["content-disposition"]).toContain("backup.bin");
  expect((await web.inject("/api/missing")).statusCode).toBe(404);
  expect((await web.inject("/courses/maths-foundations")).body).toContain('id="root"');
  expect((await web.inject("/assets/missing.js")).statusCode).toBe(404);
});
it("preserves a JSON save and returns a recoverable error when the API stops", async () => {
  const api = Fastify();
  resources.push(api);
  api.put("/api/note", (request) => ({ saved: request.body }));
  const address = await api.listen({ host: "127.0.0.1", port: 0 });
  const web = await gateway(address);
  const payload = { note: "Δ = 3\nKeep this working." };
  const saved = await web.inject({ method: "PUT", url: "/api/note", payload });
  expect(saved.json()).toEqual({ saved: payload });
  await api.close();
  const unavailable = await web.inject("/api/health");
  expect(unavailable.statusCode).toBe(502);
  expect(unavailable.json()).toMatchObject({ code: "API_UNAVAILABLE" });
  expect((await web.inject("/")).statusCode).toBe(200);
});
it("refuses a nonlocal API target", async () => {
  await expect(gateway("http://example.com")).rejects.toThrow("local HTTP API");
});
