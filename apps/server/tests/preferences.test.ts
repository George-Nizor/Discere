import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp, type DiscereApp } from "../src/app.js";
import { canonicalTimeZone } from "../src/routes.js";

let service: DiscereApp;
beforeAll(async () => {
  service = await createApp({ dbPath: ":memory:", migrate: true });
});
afterAll(async () => {
  await service.app.close();
});
const put = (payload: Record<string, unknown>) =>
  service.app.inject({ method: "PUT", url: "/api/study/preferences", payload });

describe("study time zone", () => {
  it("stores a zone typed in any case in its canonical spelling", async () => {
    const saved = await put({ timeZone: "australia/sydney" });
    expect(saved.statusCode, saved.body).toBe(200);
    expect(saved.json().timeZone).toBe("Australia/Sydney");
  });
  it("names an unknown zone in a refusal the learner can act on", async () => {
    const refused = await put({ timeZone: "Mars/Base" });
    expect(refused.statusCode).toBe(400);
    expect(refused.json()).toMatchObject({ code: "TIME_ZONE_INVALID" });
    expect(refused.json().message).toContain("Mars/Base");
    expect(refused.json().message).not.toMatch(/expected shape/);
  });
  it("canonicalises without guessing", () => {
    expect(canonicalTimeZone("utc")).toBe("UTC");
    expect(canonicalTimeZone("")).toBeNull();
    expect(canonicalTimeZone("Not/AZone")).toBeNull();
  });
});

describe("companion preference", () => {
  it("shows the companion by default and remembers hiding it", async () => {
    const initial = await service.app.inject({ method: "GET", url: "/api/study/preferences" });
    expect(initial.json().companion).toBe(true);
    const hidden = await put({ companion: false });
    expect(hidden.statusCode, hidden.body).toBe(200);
    const after = await service.app.inject({ method: "GET", url: "/api/study/preferences" });
    expect(after.json().companion).toBe(false);
    await put({ companion: true });
  });
});

describe("appearance preferences", () => {
  it("defaults to the dark galaxy and remembers light and calm", async () => {
    const initial = await service.app.inject({ method: "GET", url: "/api/study/preferences" });
    expect(initial.json()).toMatchObject({ theme: "dark", backdrop: "galaxy" });
    expect((await put({ theme: "light", backdrop: "calm" })).statusCode).toBe(200);
    const after = await service.app.inject({ method: "GET", url: "/api/study/preferences" });
    expect(after.json()).toMatchObject({ theme: "light", backdrop: "calm" });
    expect((await put({ theme: "sepia" })).statusCode).toBe(400);
    await put({ theme: "dark", backdrop: "galaxy" });
  });
});
