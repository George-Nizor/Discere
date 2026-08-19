import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CourseBundle } from "@discere/contracts";
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
  return bundle.lessons
    .flatMap((lesson) => (lesson.image ? [lesson.image.file] : []))
    .filter((file) => !existsSync(path.join(assetDirectory, file)));
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
  return validation.bundle;
}
