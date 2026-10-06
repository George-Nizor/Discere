import { existsSync, readFileSync } from "node:fs";
import { expect } from "vitest";
import { CourseBundleSchema, type CourseBundle } from "@discere/contracts";
import { bundleDigest } from "../../src/index.js";
export function restorePreLearnerBundle(id: string, bundle: CourseBundle): CourseBundle {
  const file = new URL(
    "../../../../content/" + id + "/review/learner-refinement.json",
    import.meta.url,
  );
  if (!existsSync(file)) return bundle;
  const evidence = JSON.parse(readFileSync(file, "utf8")) as {
    previousBundleSha256: string;
    publishedBundleSha256: string;
    deltas: { path: (string | number)[]; before: unknown; after: unknown }[];
  };
  expect(bundleDigest(bundle)).toBe(evidence.publishedBundleSha256);
  const original = structuredClone(bundle);
  for (const delta of evidence.deltas) {
    let target: unknown = original;
    for (const key of delta.path.slice(0, -1))
      target = (target as Record<string | number, unknown>)[key];
    const object = target as Record<string | number, unknown>;
    const key = delta.path.at(-1)!;
    expect(object[key]).toEqual(delta.after);
    object[key] = structuredClone(delta.before);
  }
  const parsed = CourseBundleSchema.parse(original);
  expect(bundleDigest(parsed)).toBe(evidence.previousBundleSha256);
  return parsed;
}
