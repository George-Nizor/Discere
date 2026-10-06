import { request as httpRequest } from "node:http";
import Fastify from "fastify";
import { registerWebRoot, resolveWebRoot } from "./web-root.js";

/** The release web origin serves the bundle and forwards API bytes to the local service.
 * Keeping this origin stable preserves browser drafts, preferences, and saved links. */
export async function createWebApp(options: { webRoot: string; apiUrl: string }) {
  const target = new URL(options.apiUrl);
  if (
    target.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)
  ) {
    throw new Error("The web gateway requires a local HTTP API.");
  }
  const root = resolveWebRoot(options.webRoot);
  if (!root) throw new Error("A built web root is required.");
  const app = Fastify({ bodyLimit: 16 * 1024 * 1024 });
  app.removeAllContentTypeParsers();
  app.addContentTypeParser("*", { parseAs: "buffer" }, (_request, body, done) => done(null, body));
  const proxy = async (
    request: import("fastify").FastifyRequest,
    reply: import("fastify").FastifyReply,
  ) => {
    const headers = { ...request.headers, host: target.host };
    delete headers.connection;
    delete headers["transfer-encoding"];
    const body = request.body as Buffer | undefined;
    if (body) headers["content-length"] = String(body.length);
    await new Promise<void>((resolve) => {
      const upstream = httpRequest(
        {
          hostname: target.hostname.replace(/^\[|\]$/g, ""),
          port: target.port,
          path: request.raw.url,
          method: request.method,
          headers,
        },
        (response) => {
          reply.code(response.statusCode ?? 502);
          for (const [name, value] of Object.entries(response.headers)) {
            if (
              value !== undefined &&
              !["connection", "transfer-encoding", "keep-alive"].includes(name)
            ) {
              reply.header(name, value);
            }
          }
          reply.send(response);
          resolve();
        },
      );
      upstream.setTimeout(60_000, () => upstream.destroy(new Error("API timeout")));
      upstream.on("error", () => {
        if (!reply.sent)
          reply.code(502).send({
            code: "API_UNAVAILABLE",
            message:
              "The learning service is unavailable. Your saved work is still local. Try again.",
          });
        resolve();
      });
      reply.raw.on("close", () => {
        if (!reply.raw.writableFinished) upstream.destroy();
      });
      upstream.end(body);
    });
  };
  app.all("/api", proxy);
  app.all("/api/*", proxy);
  await registerWebRoot(app, root);
  return app;
}
