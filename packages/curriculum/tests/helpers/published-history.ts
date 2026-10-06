import { readFileSync } from "node:fs";
import { bundleDigest } from "../../src/index.js";

/**
 * A course's bundle as it was published at `sha256`. History tests pin a publication by hash;
 * once a course moves on (Maths Foundations 1.2.0, the v2 gold lesson), the pinned bundle is
 * kept beside its review record as review/history/<sha256>-bundle.json and checked from there.
 */
export function publishedBundle(courseId: string, sha256: string): unknown {
  const current = JSON.parse(
    readFileSync(new URL(`../../../../content/${courseId}/bundle.json`, import.meta.url), "utf8"),
  );
  if (bundleDigest(current) === sha256) return current;
  const archived = JSON.parse(
    readFileSync(
      new URL(
        `../../../../content/${courseId}/review/history/${sha256}-bundle.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
  if (bundleDigest(archived) !== sha256)
    throw new Error(`Archived ${courseId} bundle does not match ${sha256}.`);
  return archived;
}

/** Courses that moved past the guidance and learner-repair releases those history tests pin. */
export const SUPERSEDED_PUBLICATIONS: Record<string, string> = {
  "maths-foundations": "46904a6936b9f918e4f2cc875fbd87da7b65ecf0ff7014768a53964d5a12ec85",
  // October 2026 v2 lesson rewrites.
  "geometry-shape-and-space": "b7c88b7a79c098cdee85dce2b24bf3fb7b30602337fe027e8613280eae101fc0",
  "calculus-change-and-accumulation": "5e979b48cf82c83686bfdee88dd95b8ba03dd57c5964c761abdf6a3eae70e525",
  "logic-and-reasoning": "ec990e1907ee00d79040b7d0446c9e6d0351f523b1368b2c5e63e7b0bd8b0b84",
  "cs-basics": "c83d3e41577d607f39da222535778eed041f3f19d0ae675b80f9c4884d4670b1",
  "probability-statistics": "3c893ab99e8d4a669ea89f8cf0c6cce9d45b62a771038e05e5f3c58a9d35027b",
};

/** The bundle a history test should check: the archived one for a superseded course. */
export function historicalBundle(courseId: string): unknown {
  const pinned = SUPERSEDED_PUBLICATIONS[courseId];
  return pinned
    ? publishedBundle(courseId, pinned)
    : JSON.parse(
        readFileSync(
          new URL(`../../../../content/${courseId}/bundle.json`, import.meta.url),
          "utf8",
        ),
      );
}
