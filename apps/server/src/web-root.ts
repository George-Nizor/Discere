import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveFromRepoRoot } from "@discere/paths";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";

/**
 * Serves the built browser bundle from the API's own origin.
 *
 * The Instrumenta hub opens one window against one port and applies a Content Security Policy
 * of `connect-src 'self'`, so the interface and the API must share an origin. In development
 * the two still run apart and Vite proxies `/api`; this path is only taken when
 * `DISCERE_WEB_ROOT` names a built bundle.
 */
export function resolveWebRoot(configured: string | undefined): string | null {
  const raw = configured?.trim();
  if (!raw) return null;
  const root = path.isAbsolute(raw) ? path.resolve(raw) : resolveFromRepoRoot(raw);
  if (!existsSync(path.join(root, "index.html"))) {
    throw new Error(
      `DISCERE_WEB_ROOT points at '${root}', which holds no index.html. Run 'pnpm build' first.`,
    );
  }
  return root;
}

/** True for a path the browser router owns rather than the API. */
export function isApplicationRoute(url: string): boolean {
  const pathname = url.split("?")[0] ?? url;
  return !pathname.startsWith("/api/") && pathname !== "/api";
}

export async function registerWebRoot(app: FastifyInstance, root: string): Promise<void> {
  const indexHtml = await readFile(path.join(root, "index.html"));
  // `wildcard: false` leaves unmatched paths to the not-found handler below, which is what
  // turns a deep link into the application rather than a 404. Files are resolved inside the
  // root by @fastify/static, so a crafted path cannot read outside the bundle.
  await app.register(fastifyStatic, {
    root,
    index: ["index.html"],
    wildcard: false,
    dotfiles: "deny",
    // The hashed asset names make a long cache safe; index.html must not be cached.
    setHeaders(reply, filePath) {
      const value =
        path.basename(filePath) === "index.html"
          ? "no-store"
          : "public, max-age=31536000, immutable";
      reply.header("Cache-Control", value);
    },
  });

  app.setNotFoundHandler((request, reply) => {
    // An unknown /api path is a real 404. Anything else is a route the browser router owns,
    // so the application is served and it decides what to show.
    if (!isApplicationRoute(request.url)) {
      return reply
        .status(404)
        .send({ code: "NOT_FOUND", message: "That endpoint does not exist." });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return reply
        .status(404)
        .send({ code: "NOT_FOUND", message: "That endpoint does not exist." });
    }
    return reply.type("text/html; charset=utf-8").header("Cache-Control", "no-store").send(indexHtml);
  });
}
