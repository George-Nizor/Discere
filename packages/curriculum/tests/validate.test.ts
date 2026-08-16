import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

async function seedBundle(): Promise<unknown> {
  const file = path.resolve(import.meta.dirname, "../../../content/electronics-foundations/bundle.json");
  return JSON.parse(await readFile(file, "utf8")) as unknown;
}

describe("course validation", () => {
  it("accepts the seed electronics course", async () => {
    const result = validateCourseBundle(await seedBundle());
    expect(result.issues.filter((item) => item.severity === "error")).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it("rejects references to missing source material", async () => {
    const bundle = (await seedBundle()) as {
      course: { sourceIds: string[] };
    };
    bundle.course.sourceIds.push("missing-source");
    const result = validateCourseBundle(bundle);
    expect(result.passed).toBe(false);
    expect(result.issues.some((item) => item.path === "course.sourceIds" && item.code === "MISSING_REFERENCE")).toBe(true);
  });

  it("rejects prerequisite cycles", async () => {
    const bundle = (await seedBundle()) as {
      concepts: Array<{ id: string; prerequisiteIds: string[] }>;
    };
    const electricCharge = bundle.concepts.find((item) => item.id === "electric-charge");
    if (!electricCharge) throw new Error("Seed concept is missing.");
    electricCharge.prerequisiteIds.push("ohms-law");
    const result = validateCourseBundle(bundle);
    expect(result.passed).toBe(false);
    expect(result.issues.some((item) => item.code === "PREREQUISITE_CYCLE")).toBe(true);
  });
});
