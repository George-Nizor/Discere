import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { CourseBundle } from "@discere/contracts";
import { z } from "zod";
import { validateCourseBundle } from "./validate.js";

/** Retrieved images live beside the bundle that cites them. */
export function courseAssetDirectory(bundlePath: string): string {
  return path.join(path.dirname(bundlePath), "assets");
}

/**
 * A bundle names its images by file name only. This resolves them against the bundle's own
 * assets directory, so a bundle can never reach a file outside the course it belongs to.
 */
function missingAssets(bundle: CourseBundle, assetDirectory: string): string[] {
  return [
    ...(bundle.course.coverAsset ? [bundle.course.coverAsset] : []),
    ...bundle.lessons.flatMap((lesson) => (lesson.image ? [lesson.image.file] : [])),
  ].filter((file) => !existsSync(path.join(assetDirectory, file)));
}

export async function loadCourseBundle(bundlePath: string): Promise<CourseBundle> {
  const raw = JSON.parse(await readFile(bundlePath, "utf8")) as unknown;
  const validation = validateCourseBundle(raw);
  if (!validation.passed || !validation.bundle) {
    const messages = validation.issues
      .filter((item) => item.severity === "error")
      .map((item) => `${item.path}: ${item.message}`)
      .join("\n");
    throw new Error(`Invalid course bundle:\n${messages}`);
  }
  const absent = missingAssets(validation.bundle, courseAssetDirectory(bundlePath));
  if (absent.length > 0) {
    throw new Error(`Course bundle references missing assets:\n${absent.join("\n")}`);
  }
  for (const lesson of validation.bundle.lessons) {
    if (!lesson.image) continue;
    const expected = lesson.image.contentHash.replace(/^sha256:/, "");
    if (/^[a-f0-9]{64}$/i.test(expected)) {
      const actual = createHash("sha256")
        .update(await readFile(path.join(courseAssetDirectory(bundlePath), lesson.image.file)))
        .digest("hex");
      if (actual !== expected.toLowerCase())
        throw new Error(`Image '${lesson.image.file}' changed after its recorded review.`);
    }
  }
  if (validation.bundle.authoringMetadata && validation.bundle.course.coverAsset) {
    const cover = validation.bundle.course.coverAsset;
    const provenance = z
      .object({
        file: z.literal(cover),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        creator: z.string().min(1),
        licence: z.string().min(1),
        licenceUrl: z.string().url(),
        reviewer: z.string().min(1),
      })
      .parse(
        JSON.parse(
          await readFile(path.join(courseAssetDirectory(bundlePath), "provenance.json"), "utf8"),
        ),
      );
    const actual = createHash("sha256")
      .update(await readFile(path.join(courseAssetDirectory(bundlePath), cover)))
      .digest("hex");
    if (actual !== provenance.sha256)
      throw new Error(`Cover '${cover}' changed after its recorded review.`);
  }
  return validation.bundle;
}

/**
 * Names of the course directories under a content root, in a stable order.
 *
 * A leading underscore marks a directory that holds something other than a course — the topic
 * maps and their generated prompts, for instance. The rule lives here rather than at each
 * caller, because a reader that misses it treats the roadmap as a course and fails at boot.
 */
export async function courseDirectories(contentRoot: string): Promise<string[]> {
  const entries = await readdir(contentRoot, { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith("_") &&
        existsSync(path.join(contentRoot, entry.name, "bundle.json")),
    )
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}
