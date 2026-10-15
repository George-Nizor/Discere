import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  RustProjectCollectionSchema,
  type CourseBundle,
  type RustProjectCollection,
} from "@discere/contracts";
import { lintText } from "@discere/writing-engine";
import { bundleDigest } from "./curation.js";
import { PythonProjectReviewSchema } from "./python-projects.js";

/** Same publication rule as the Python projects: schema, references, prose gate, exact hash. */
export function validateRustProjects(input: unknown, bundle: CourseBundle) {
  const collection = RustProjectCollectionSchema.parse(input);
  if (collection.courseId !== bundle.course.id)
    throw new Error("Rust projects belong to another course.");
  const warnings: { path: string; ruleId: string }[] = [];
  const prose = (text: string, location: string) => {
    for (const issue of lintText(text, { context: "question" }).violations) {
      if (issue.severity === "hard")
        throw new Error("Rust project writing: " + location + " " + issue.ruleId);
      warnings.push({ path: location, ruleId: issue.ruleId });
    }
  };
  for (const p of collection.projects) {
    prose(p.title, p.id + ".title");
    prose(p.description, p.id + ".description");
    for (const t of p.tasks) {
      const lesson = bundle.lessons.find((l) => l.id === t.lessonId);
      if (
        !lesson ||
        t.conceptIds.some((id) => !lesson.conceptIds.includes(id)) ||
        t.sourceIds.some(
          (id) => !lesson.sourceIds.includes(id) || !bundle.sources.some((s) => s.id === id),
        )
      )
        throw new Error("Rust project task needs valid lesson, concept and source references: " + t.id);
      for (const field of ["title", "prompt", "correction", "explanation"] as const)
        prose(t[field], t.id + "." + field);
      t.hints.forEach((h, i) => prose(h, t.id + ".hints." + i));
    }
  }
  return { collection, warnings };
}

export function assertRustProjectReview(
  input: unknown,
  review: unknown,
  bundle: CourseBundle,
): RustProjectCollection {
  const { collection, warnings } = validateRustProjects(input, bundle);
  const approval = PythonProjectReviewSchema.parse(review);
  if (bundleDigest(input) !== approval.sha256) throw new Error("Rust projects changed after review.");
  for (const warning of warnings)
    if (!approval.acceptedWarnings.some((w) => w.path === warning.path && w.ruleId === warning.ruleId))
      throw new Error("Rust project warning needs review: " + warning.path + " " + warning.ruleId);
  return collection;
}

export async function loadRustProjects(
  directory: string,
  bundle: CourseBundle,
): Promise<RustProjectCollection | undefined> {
  let text: string;
  try {
    text = await readFile(path.join(directory, "rust-projects.json"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  const review = JSON.parse(await readFile(path.join(directory, "review", "rust-projects.json"), "utf8"));
  return assertRustProjectReview(JSON.parse(text), review, bundle);
}
