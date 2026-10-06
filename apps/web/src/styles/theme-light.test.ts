import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error The generator is a plain Node script with no type declarations.
import { generate, mapValue, OUTPUT } from "../../scripts/light-theme.mjs";

describe("light theme", () => {
  it("is generated from the current stylesheets", () => {
    // Stale means a dark rule changed without its light counterpart: run `pnpm theme:light`.
    expect(readFileSync(OUTPUT, "utf8")).toBe(generate());
  });
  it("turns dark surfaces into paper and white text into ink", () => {
    expect(mapValue("#141515", "surface")).toMatch(/^oklch\(0\.9[5-9]/);
    expect(mapValue("#ffffff", "text")).toMatch(/^oklch\(0\.17/);
  });
  it("keeps accent fills and leaves tokens alone", () => {
    expect(mapValue("#5e9efd", "surface")).toBeNull();
    expect(mapValue("var(--accent)", "surface")).toBeNull();
  });
});
