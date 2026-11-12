import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import {
  assertBindHost,
  hostnameOf,
  isLoopbackHost,
  parseAllowedHosts,
  registerHostGuard,
} from "../src/host-guard.js";
import { createWebApp } from "../src/web-app.js";

const TAILNET_NAME = "study-pc.example.ts.net";

describe("bind address", () => {
  it("accepts loopback addresses", () => {
    for (const host of ["127.0.0.1", "localhost", "::1", "[::1]", "LOCALHOST"]) {
      expect(isLoopbackHost(host)).toBe(true);
      expect(() => assertBindHost(host, "DISCERE_HOST", {})).not.toThrow();
    }
  });

  it("refuses any other address and says how to allow it", () => {
    for (const host of ["0.0.0.0", "::", "192.168.1.20", "100.64.0.7", TAILNET_NAME]) {
      expect(isLoopbackHost(host)).toBe(false);
      expect(() => assertBindHost(host, "DISCERE_HOST", {})).toThrow(
        /DISCERE_HOST is '.+'.*DISCERE_ALLOW_REMOTE=1/s,
      );
    }
  });

  it("listens elsewhere only when remote access is switched on", () => {
    expect(() =>
      assertBindHost("0.0.0.0", "DISCERE_HOST", { DISCERE_ALLOW_REMOTE: "1" }),
    ).not.toThrow();
    expect(() => assertBindHost("0.0.0.0", "HOST", { DISCERE_ALLOW_REMOTE: "true" })).toThrow(
      /HOST is '0\.0\.0\.0'/,
    );
  });
});

describe("host names", () => {
  it("reads the name from a Host header", () => {
    expect(hostnameOf("localhost:80")).toBe("localhost");
    expect(hostnameOf("127.0.0.1:49323")).toBe("127.0.0.1");
    expect(hostnameOf("[::1]:4317")).toBe("::1");
    expect(hostnameOf("Study-PC.Example.ts.net")).toBe(TAILNET_NAME);
    expect(hostnameOf(undefined)).toBeNull();
    expect(hostnameOf("")).toBeNull();
    expect(hostnameOf("127.0.0.1@evil.example")).toBeNull();
    expect(hostnameOf("evil.example/127.0.0.1")).toBeNull();
  });

  it("reads the configured list and refuses an entry that is not a name", () => {
    expect(parseAllowedHosts(undefined)).toEqual([]);
    expect(parseAllowedHosts(` ${TAILNET_NAME} , other.example:8443,`)).toEqual([
      TAILNET_NAME,
      "other.example",
    ]);
    expect(() => parseAllowedHosts("https://study-pc.example.ts.net")).toThrow(
      /DISCERE_ALLOWED_HOSTS/,
    );
  });
});

describe("request guard", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    registerHostGuard(app, { allowedHosts: [TAILNET_NAME] });
    app.get("/api/health", async () => ({ status: "ok" }));
    app.post("/api/change", async () => ({ changed: true }));
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it("answers a loopback address on any port", async () => {
    for (const host of ["localhost:80", "127.0.0.1:49323", "127.0.0.1:45023", "[::1]:4317"]) {
      const response = await app.inject({ url: "/api/health", headers: { host } });
      expect(response.statusCode).toBe(200);
    }
    // What `inject` and a plain health probe send when they set no Host of their own.
    expect((await app.inject("/api/health")).statusCode).toBe(200);
  });

  it("refuses a request addressed to a rebinding domain", async () => {
    for (const host of ["attacker.example:49323", "127.0.0.1.attacker.example", "localhost.evil"]) {
      for (const method of ["GET", "POST", "OPTIONS"] as const) {
        const response = await app.inject({ method, url: "/api/health", headers: { host } });
        expect(response.statusCode).toBe(403);
        expect(response.json().code).toBe("HOST_NOT_ALLOWED");
      }
    }
  });

  it("answers a configured extra host", async () => {
    const read = await app.inject({ url: "/api/health", headers: { host: TAILNET_NAME } });
    expect(read.statusCode).toBe(200);
    const change = await app.inject({
      method: "POST",
      url: "/api/change",
      headers: { host: TAILNET_NAME, origin: `https://${TAILNET_NAME}` },
    });
    expect(change.statusCode).toBe(200);
  });

  it("refuses a change sent from a page on another site", async () => {
    for (const origin of ["https://attacker.example", "http://localhost.evil:4318", "null"]) {
      const response = await app.inject({
        method: "POST",
        url: "/api/change",
        headers: { host: "127.0.0.1:49323", origin },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().code).toBe("ORIGIN_NOT_ALLOWED");
    }
  });

  it("accepts a change from its own pages and from a client that sends no Origin", async () => {
    for (const origin of ["http://127.0.0.1:49323", "http://localhost:4318", "http://[::1]:4318"]) {
      const response = await app.inject({
        method: "POST",
        url: "/api/change",
        headers: { host: "127.0.0.1:49323", origin },
      });
      expect(response.statusCode).toBe(200);
    }
    expect((await app.inject({ method: "POST", url: "/api/change" })).statusCode).toBe(200);
  });

  it("does not judge a read by its Origin", async () => {
    const response = await app.inject({
      url: "/api/health",
      headers: { host: "127.0.0.1:49323", origin: "https://attacker.example" },
    });
    expect(response.statusCode).toBe(200);
  });
});

describe("the API and the web gateway", () => {
  const resources: FastifyInstance[] = [];
  const directories: string[] = [];
  afterEach(async () => {
    for (const resource of resources.splice(0)) await resource.close();
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
    delete process.env["DISCERE_ALLOWED_HOSTS"];
  });

  it("guards every API route and reads extra hosts from the environment", async () => {
    process.env["DISCERE_ALLOWED_HOSTS"] = TAILNET_NAME;
    const { app } = await createApp({ dbPath: ":memory:", migrate: true });
    resources.push(app);

    const health = await app.inject({ url: "/api/health", headers: { host: "127.0.0.1:49323" } });
    expect(health.statusCode).toBe(200);
    expect(health.json().status).toBe("ok");
    const named = await app.inject({ url: "/api/health", headers: { host: TAILNET_NAME } });
    expect(named.statusCode).toBe(200);

    const rebound = await app.inject({
      url: "/api/health",
      headers: { host: "attacker.example:49323" },
    });
    expect(rebound.statusCode).toBe(403);
    const foreign = await app.inject({
      method: "PUT",
      url: "/api/preferences",
      headers: { host: "127.0.0.1:49323", origin: "https://attacker.example" },
      payload: {},
    });
    expect(foreign.statusCode).toBe(403);
    expect(foreign.json().code).toBe("ORIGIN_NOT_ALLOWED");

    // The development web origin still passes its CORS preflight.
    const preflight = await app.inject({
      method: "OPTIONS",
      url: "/api/preferences",
      headers: {
        host: "127.0.0.1:4317",
        origin: "http://127.0.0.1:4318",
        "access-control-request-method": "PUT",
      },
    });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:4318");
  });

  it("checks the name at the gateway, which hides it from the API", async () => {
    const api = Fastify();
    resources.push(api);
    api.get("/api/health", async (request) => ({ host: request.headers.host }));
    const address = await api.listen({ host: "127.0.0.1", port: 0 });
    const directory = mkdtempSync(path.join(tmpdir(), "discere-guard-"));
    directories.push(directory);
    writeFileSync(path.join(directory, "index.html"), '<div id="root"></div>');
    const web = await createWebApp({ webRoot: directory, apiUrl: address });
    resources.push(web);

    const local = await web.inject({ url: "/api/health", headers: { host: "127.0.0.1:4318" } });
    expect(local.statusCode).toBe(200);
    expect(local.json().host).toBe(new URL(address).host);
    for (const url of ["/api/health", "/"]) {
      const rebound = await web.inject({ url, headers: { host: "attacker.example:4318" } });
      expect(rebound.statusCode).toBe(403);
    }
  });
});
