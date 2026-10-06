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
