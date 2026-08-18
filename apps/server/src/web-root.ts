import { existsSync, realpathSync } from "node:fs";
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
  return !isApiPath(pathname);
}

/** True for a path the API owns. The bundle is never allowed to answer one of these. */
export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/**
 * True when `candidate` really lives inside `root` after every symlink is followed.
 *
 * The lexical check that `@fastify/send` performs is not enough on its own: a symlink inside
 * the bundle resolves to wherever it points, and the file would be served from there. The
 * bundle is first-party, so this only ever costs a `realpath` on a local read.
 */
export function isContainedRealPath(root: string, candidate: string): boolean {
  let realRoot: string;
  let realCandidate: string;
  try {
    realRoot = realpathSync(root);
    realCandidate = realpathSync(candidate);
  } catch {
    // A path that cannot be resolved does not exist. Let the file layer answer with its own
    // 404 rather than deciding containment on a guess.
    return true;
  }
  return realCandidate === realRoot || realCandidate.startsWith(`${realRoot}${path.sep}`);
}

export async function registerWebRoot(app: FastifyInstance, root: string): Promise<void> {
  const indexHtml = await readFile(path.join(root, "index.html"));

  // `wildcard: true` registers one `GET /*` route rather than an exact route per bundled
  // file. That matters for more than tidiness: with a route per file, a bundle that happened
  // to contain `api/health` would register that exact path and collide with, or shadow, the
  // API. A single wildcard always loses to an explicitly registered route, so `/api/*` stays
  // the API's however the bundle is laid out. `allowedPath` then refuses to read anything
  // under `/api` at all, so an unclaimed `/api` path cannot be answered from disk either.
  await app.register(fastifyStatic, {
    root,
    index: ["index.html"],
    wildcard: true,
    dotfiles: "deny",
    allowedPath(pathname) {
      if (isApiPath(pathname)) return false;
      return isContainedRealPath(root, path.join(root, pathname));
    },
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
    return reply
      .type("text/html; charset=utf-8")
      .header("Cache-Control", "no-store")
      .send(indexHtml);
  });
}
