import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { CourseBundle } from "@discere/contracts";
import { bundleDigest } from "@discere/curriculum";

/**
 * The legacy lesson player still serves every lesson that has not been rewritten to the v2
 * format, so its behaviour is tested — but never against a live course, because each course is
 * rewritten in turn and its live bundle stops being legacy the day it is published.
 *
 * The fixture is a pre-rewrite publication kept beside its course's review record
 * (content/<course>/review/history/<sha256>-bundle.json, the same files the curriculum
 * package's history tests read). It is pinned by hash, so it never moves. An archived course is
 * not a substitute: archived lessons are served without the question-led projection.
 */
export const LEGACY_FIXTURE = {
  courseId: "probability-statistics",
  sha256: "3c893ab99e8d4a669ea89f8cf0c6cce9d45b62a771038e05e5f3c58a9d35027b",
} as const;

const contentRoot = path.resolve(import.meta.dirname, "../../../../content");
const courseRoot = path.join(contentRoot, LEGACY_FIXTURE.courseId);
const bundleFile = path.join(
  courseRoot,
  "review/history",
  `${LEGACY_FIXTURE.sha256}-bundle.json`,
);

/** The pinned legacy bundle, checked against its hash and against having any v2 lesson in it. */
export function legacyBundle(): CourseBundle {
  const raw = JSON.parse(readFileSync(bundleFile, "utf8")) as unknown;
  if (bundleDigest(raw) !== LEGACY_FIXTURE.sha256)
    throw new Error(
      `The legacy fixture ${bundleFile} does not match its pinned hash.`,
    );
  const bundle = raw as CourseBundle;
  for (const lesson of bundle.lessons) {
    const fields = lesson as unknown as Record<string, unknown>;
    if ("intro" in fields || "recap" in fields)
      throw new Error(
        `The legacy fixture lesson '${lesson.id}' is in the v2 format.`,
      );
  }
  if (bundle.course.catalogueVisibility === "archived")
    throw new Error(
      "The legacy fixture must be a listed course, not an archived one.",
    );
  return bundle;
}

/**
 * The live content root with one course swapped for the legacy fixture: every other entry is
 * linked from content/, so the app boots as it really does and the fixture sits among real
 * courses (a request naming another course reaches a course that exists). The fixture course
 * gets its pinned bundle, with the live course's assets directory linked beside it: the bundle
 * names its cover by file, and the loader checks it against the provenance record there.
 */
export function legacyContentRoot(): { root: string; remove: () => void } {
  const root = mkdtempSync(path.join(tmpdir(), "discere-legacy-content-"));
  for (const entry of readdirSync(contentRoot, { withFileTypes: true })) {
    if (entry.name === LEGACY_FIXTURE.courseId) continue;
    symlinkSync(
      path.join(contentRoot, entry.name),
      path.join(root, entry.name),
      entry.isDirectory() ? "dir" : "file",
    );
  }
  const course = path.join(root, LEGACY_FIXTURE.courseId);
  mkdirSync(course);
  writeFileSync(
    path.join(course, "bundle.json"),
    `${JSON.stringify(legacyBundle(), null, 2)}\n`,
  );
  symlinkSync(
    path.join(courseRoot, "assets"),
    path.join(course, "assets"),
    "dir",
  );
  return { root, remove: () => rmSync(root, { recursive: true, force: true }) };
}
