import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import {
  authoringCapability,
  type CodexReadiness,
  illustrationsCapability,
  imageGenerationSetting,
  tutorCapability,
} from "../src/capabilities.js";

const READY: CodexReadiness = { binaryFound: true, authPresent: true };
const NO_BINARY: CodexReadiness = { binaryFound: false, authPresent: false };
const NO_AUTH: CodexReadiness = { binaryFound: true, authPresent: false };

describe("generative capability reporting", () => {
  it("reads the explicit off switch and defaults to auto", () => {
    expect(imageGenerationSetting("off")).toBe("off");
    expect(imageGenerationSetting("OFF")).toBe("off");
    expect(imageGenerationSetting(" off ")).toBe("off");
    expect(imageGenerationSetting("auto")).toBe("auto");
    expect(imageGenerationSetting(undefined)).toBe("auto");
    expect(imageGenerationSetting("")).toBe("auto");
    // Anything unrecognised stays on rather than silently disabling a working installation.
    expect(imageGenerationSetting("yes please")).toBe("auto");
  });

  it("turns illustrations off explicitly even when the CLI is ready", () => {
    const capability = illustrationsCapability(READY, "off");
    expect(capability.state).toBe("unavailable");
    expect(capability.reason).toMatch(/turned off/);
    // The learner is told what still works, not only what does not.
    expect(capability.fallback).toMatch(/diagrams, maps, and timelines/);
  });

  it("separates a missing CLI from a CLI nobody has signed into", () => {
    expect(illustrationsCapability(NO_BINARY, "auto").reason).toMatch(/not installed/);
    expect(illustrationsCapability(NO_AUTH, "auto").reason).toMatch(/not signed in/);
    expect(illustrationsCapability(READY, "auto")).toEqual({
      id: "illustrations",
      state: "available",
      reason: "",
      fallback: "",
    });
  });

  it("keeps the tutor available on providers that never touch the CLI", () => {
    // `companion` hands the learner a packet to paste into a ChatGPT session they already have,
    // which is exactly the path a lapsed subscription needs; `mock` is the offline fixture.
    expect(tutorCapability("companion", NO_BINARY).state).toBe("available");
    expect(tutorCapability("mock", NO_BINARY).state).toBe("available");

    const codex = tutorCapability("codex", NO_BINARY);
    expect(codex.state).toBe("unavailable");
    expect(codex.fallback).toMatch(/DISCERE_TUTOR_PROVIDER=companion/);
  });

  it("ties authoring to the CLI and names the content that still plays", () => {
    expect(authoringCapability(READY).state).toBe("available");
    const blocked = authoringCapability(NO_BINARY);
    expect(blocked.state).toBe("unavailable");
    expect(blocked.fallback).toMatch(/already in `content\/`/);
  });
});

describe("capability and illustration routes", () => {
  let app: FastifyInstance;
  const previous = process.env["DISCERE_IMAGE_GENERATION"];

  beforeEach(async () => {
    process.env["DISCERE_IMAGE_GENERATION"] = "off";
    ({ app } = await createApp({
      dbPath: ":memory:",
      migrate: true,
      tutor: { providerId: "mock" },
    }));
  });

  afterEach(async () => {
    await app.close();
    if (previous === undefined) delete process.env["DISCERE_IMAGE_GENERATION"];
    else process.env["DISCERE_IMAGE_GENERATION"] = previous;
  });

  it("reports every capability with a reason the interface can show", async () => {
    const response = await app.inject({ method: "GET", url: "/api/capabilities" });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      capabilities: Array<{ id: string; state: string; reason: string }>;
    };
    expect(body.capabilities.map((entry) => entry.id)).toEqual([
      "tutor_generation",
      "illustrations",
      "authoring",
    ]);
    // The mock provider needs nothing, so the tutor keeps working while drawing does not.
    const tutor = body.capabilities.find((entry) => entry.id === "tutor_generation");
    expect(tutor?.state).toBe("available");
    const illustrations = body.capabilities.find((entry) => entry.id === "illustrations");
    expect(illustrations?.state).toBe("unavailable");
    expect(illustrations?.reason.length).toBeGreaterThan(0);
  });

  it("refuses to start a generation it cannot finish", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/illustrations",
      payload: {
        subject: "The tetrarchy as four regional centres of rule",
        alt: "Four regional centres",
        accent: "#3E83F8",
      },
    });
    // 503, not 500: nothing is broken, the capability is simply absent right now.
    expect(response.statusCode).toBe(503);
    expect(response.json().code).toBe("ILLUSTRATIONS_UNAVAILABLE");
    expect(response.json().message).toMatch(/turned off/);
  });
});
