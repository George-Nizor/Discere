import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import {
  isApiPath,
  isApplicationRoute,
  isContainedRealPath,
  resolveWebRoot,
} from "../src/web-root.js";

let app: FastifyInstance | null = null;
let bundle: string;

const INDEX_HTML =
  '<!doctype html><html lang="en"><head><title>Discere</title></head><body><div id="root"></div><script type="module" src="/assets/main-abc123.js"></script></body></html>';

beforeEach(() => {
  bundle = mkdtempSync(path.join(tmpdir(), "discere-web-root-"));
  mkdirSync(path.join(bundle, "assets"), { recursive: true });
  writeFileSync(path.join(bundle, "index.html"), INDEX_HTML, "utf8");
  writeFileSync(path.join(bundle, "assets", "main-abc123.js"), "export const ready = true;\n");
  // A file the bundle must never reach, one directory above its root.
  writeFileSync(path.join(bundle, "..", "outside-the-bundle.txt"), "secret", "utf8");
});

afterEach(async () => {
  if (app) await app.close();
  app = null;
  rmSync(bundle, { recursive: true, force: true });
});

async function start() {
  ({ app } = await createApp({ dbPath: ":memory:", migrate: true, webRoot: bundle }));
  return app;
}

describe("single-origin serving", () => {
  it("serves the interface and the API from one port", async () => {
    const server = await start();
    const page = await server.inject({ method: "GET", url: "/" });
    expect(page.statusCode).toBe(200);
    expect(page.headers["content-type"]).toContain("text/html");
    expect(page.body).toContain('<div id="root">');

    const health = await server.inject({ method: "GET", url: "/api/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: "ok", service: "discere" });
  });

  it("serves a hashed asset with a long cache and the index without one", async () => {
    const server = await start();
    const asset = await server.inject({ method: "GET", url: "/assets/main-abc123.js" });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    const page = await server.inject({ method: "GET", url: "/" });
    expect(page.headers["cache-control"]).toBe("no-store");
  });

  it("returns the application for a deep link the browser router owns", async () => {
    const server = await start();
    const deepLink = await server.inject({
      method: "GET",
      url: "/courses/electronics-foundations/lessons/current-in-one-loop/notebook",
    });
    expect(deepLink.statusCode).toBe(200);
    expect(deepLink.body).toContain('<div id="root">');
  });

  it("keeps an unknown API path a real 404 rather than the application", async () => {
    const server = await start();
    const missing = await server.inject({ method: "GET", url: "/api/nothing-here" });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ code: "NOT_FOUND" });
  });

  it("gives an API route priority over a file of the same name", async () => {
    writeFileSync(path.join(bundle, "api"), "not the API", "utf8");
    const server = await start();
    const health = await server.inject({ method: "GET", url: "/api/health" });
    expect(health.statusCode).toBe(200);
  });

  it("refuses a path that tries to climb out of the bundle", async () => {
    const server = await start();
    for (const url of [
      "/../outside-the-bundle.txt",
      "/assets/../../outside-the-bundle.txt",
      "/%2e%2e%2foutside-the-bundle.txt",
      "/..%2Foutside-the-bundle.txt",
    ]) {
      const response = await server.inject({ method: "GET", url });
      expect(response.body).not.toContain("secret");
    }
  });

  it("does not answer a write to an unknown path with the application", async () => {
    const server = await start();
    const response = await server.inject({ method: "POST", url: "/not-a-route" });
    expect(response.statusCode).toBe(404);
    expect(response.body).not.toContain('<div id="root">');
  });
});

describe("web root resolution", () => {
  it("is off unless a root is named", () => {
    expect(resolveWebRoot(undefined)).toBeNull();
    expect(resolveWebRoot("   ")).toBeNull();
  });

  it("refuses a directory holding no built bundle", () => {
    expect(() => resolveWebRoot(path.join(bundle, "assets"))).toThrow(/index\.html/);
  });

  it("separates application routes from API routes", () => {
    expect(isApplicationRoute("/review")).toBe(true);
    expect(isApplicationRoute("/courses/a/lessons/b/notebook?x=1")).toBe(true);
    expect(isApplicationRoute("/api/health")).toBe(false);
    expect(isApplicationRoute("/api")).toBe(false);
  });
});

describe("the bundle can never answer for the API", () => {
  it("keeps /api/* a JSON 404 even when the bundle holds an api directory", async () => {
    // A bundle that happens to ship an `api/` directory must not be able to answer, or
    // shadow, anything under /api. Both a colliding name and an unclaimed one are covered.
    mkdirSync(path.join(bundle, "api"), { recursive: true });
    writeFileSync(path.join(bundle, "api", "health"), "not the API", "utf8");
    writeFileSync(path.join(bundle, "api", "nothing-here"), "not the API", "utf8");
    const server = await start();

    const health = await server.inject({ method: "GET", url: "/api/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: "ok", service: "discere" });

    const unknown = await server.inject({ method: "GET", url: "/api/nothing-here" });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.headers["content-type"]).toContain("application/json");
    expect(unknown.json()).toMatchObject({ code: "NOT_FOUND" });
    expect(unknown.body).not.toContain("not the API");

    // Nor through a deeper path, and never as the application shell.
    const nested = await server.inject({ method: "GET", url: "/api/a/b/c" });
    expect(nested.statusCode).toBe(404);
    expect(nested.body).not.toContain('<div id="root">');
  });

  it("still serves a bundle file whose name merely starts with api", async () => {
    writeFileSync(path.join(bundle, "assets", "api-client-abc.js"), "export const x = 1;\n");
    const server = await start();
    const asset = await server.inject({ method: "GET", url: "/assets/api-client-abc.js" });
    expect(asset.statusCode).toBe(200);
    expect(asset.body).toContain("export const x = 1;");
  });

  it("names the paths the API owns", () => {
    expect(isApiPath("/api")).toBe(true);
    expect(isApiPath("/api/health")).toBe(true);
    expect(isApiPath("/apianything")).toBe(false);
    expect(isApiPath("/review")).toBe(false);
  });
});

describe("symlink containment", () => {
  it("refuses a bundle file that is a symlink out of the web root", async () => {
    symlinkSync(path.join(bundle, "..", "outside-the-bundle.txt"), path.join(bundle, "escape.txt"));
    symlinkSync(
      path.join(bundle, "..", "outside-the-bundle.txt"),
      path.join(bundle, "assets", "escape-asset.txt"),
    );
    const server = await start();

    for (const url of ["/escape.txt", "/assets/escape-asset.txt"]) {
      const response = await server.inject({ method: "GET", url });
      expect(response.body).not.toContain("secret");
      // It falls through to the application shell rather than reading through the link.
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('<div id="root">');
    }
  });

  it("refuses a symlinked directory that leaves the web root", async () => {
    const outside = path.join(bundle, "..", `outside-dir-${path.basename(bundle)}`);
    mkdirSync(outside, { recursive: true });
    writeFileSync(path.join(outside, "leaked.txt"), "secret", "utf8");
    try {
      symlinkSync(outside, path.join(bundle, "linked"), "dir");
      const server = await start();
      const response = await server.inject({ method: "GET", url: "/linked/leaked.txt" });
      expect(response.body).not.toContain("secret");
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("decides containment by the real path, not the written one", () => {
    expect(isContainedRealPath(bundle, path.join(bundle, "assets"))).toBe(true);
    expect(isContainedRealPath(bundle, bundle)).toBe(true);
    expect(isContainedRealPath(bundle, path.join(bundle, "..", "outside-the-bundle.txt"))).toBe(
      false,
    );
    // A path that does not exist is left to the file layer to refuse.
    expect(isContainedRealPath(bundle, path.join(bundle, "missing.txt"))).toBe(true);
  });
});
