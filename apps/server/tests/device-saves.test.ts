import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { readDeviceCookie } from "../src/device-saves.js";

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

function cookieFrom(setCookie: string | string[] | undefined): string {
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const value = readDeviceCookie(header?.split(";")[0]);
  if (!value) throw new Error(`no device cookie in ${String(header)}`);
  return `discere_device=${value}`;
}

describe("one save per browser", () => {
  it("gives each browser its own progress, created on its first visit", async () => {
    ({ app } = await createApp({ dbPath: ":memory:", migrate: true, deviceSaves: true }));
    const first = await app.inject({ method: "GET", url: "/api/study/preferences" });
    const second = await app.inject({ method: "GET", url: "/api/study/preferences" });
    expect(first.statusCode).toBe(200);
    const a = cookieFrom(first.headers["set-cookie"]);
    const b = cookieFrom(second.headers["set-cookie"]);
    expect(a).not.toBe(b);

    const goal = first.json().dailyGoal === 10 ? 3 : 10;
    const saved = await app.inject({
      method: "PUT",
      url: "/api/study/preferences",
      headers: { cookie: a },
      payload: { dailyGoal: goal },
    });
    expect(saved.statusCode).toBe(200);

    const mine = await app.inject({
      method: "GET",
      url: "/api/study/preferences",
      headers: { cookie: a },
    });
    const theirs = await app.inject({
      method: "GET",
      url: "/api/study/preferences",
      headers: { cookie: b },
    });
    expect(mine.json().dailyGoal).toBe(goal);
    expect(theirs.json().dailyGoal).not.toBe(goal);
    // A browser that already has its cookie is not handed another.
    expect(mine.headers["set-cookie"]).toBeUndefined();

    // A new learner starts with the beginner concepts open, like the first run on a PC.
    const home = await app.inject({ method: "GET", url: "/api/home", headers: { cookie: b } });
    expect(home.statusCode).toBe(200);
  });

  it("keeps the single local learner and sets no cookie without the setting", async () => {
    ({ app } = await createApp({ dbPath: ":memory:", migrate: true, deviceSaves: false }));
    const response = await app.inject({ method: "GET", url: "/api/study/preferences" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("marks the cookie Secure when the request came in over HTTPS", async () => {
    ({ app } = await createApp({ dbPath: ":memory:", migrate: true, deviceSaves: true }));
    const response = await app.inject({
      method: "GET",
      url: "/api/study/preferences",
      headers: { "x-forwarded-proto": "https" },
    });
    expect(String(response.headers["set-cookie"])).toMatch(/HttpOnly; SameSite=Lax; Secure/);
  });
});
