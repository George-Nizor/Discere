import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PythonProjectCollectionSchema,
  type CourseBundle,
  type PythonProjectCollection,
} from "@discere/contracts";
import { lintText } from "@discere/writing-engine";
import { z } from "zod";
import { bundleDigest } from "./curation.js";
export interface PythonWritingWarning {
  path: string;
  ruleId: string;
}
export function validatePythonProjects(input: unknown, bundle: CourseBundle) {
  const collection = PythonProjectCollectionSchema.parse(input);
  if (collection.courseId !== bundle.course.id)
    throw new Error("Python projects belong to another course.");
  const warnings: PythonWritingWarning[] = [];
  const prose = (text: string, location: string) => {
    const lint = lintText(text, { context: "question" });
    for (const issue of lint.violations) {
      if (issue.severity === "hard")
        throw new Error("Python project writing: " + location + " " + issue.ruleId);
      warnings.push({ path: location, ruleId: issue.ruleId });
    }
  };
  collection.projects.forEach((p) => {
    prose(p.title, p.id + ".title");
    prose(p.description, p.id + ".description");
    p.tasks.forEach((t) => {
      const lesson = bundle.lessons.find((l) => l.id === t.lessonId);
      if (
        !lesson ||
        t.conceptIds.some((id) => !lesson.conceptIds.includes(id)) ||
        t.sourceIds.some(
          (id) => !lesson.sourceIds.includes(id) || !bundle.sources.some((s) => s.id === id),
        )
      )
        throw new Error(
          "Python project task needs valid lesson, concept and source references: " + t.id,
        );
      for (const field of ["title", "prompt", "correction", "explanation"] as const)
        prose(t[field], t.id + "." + field);
      t.hints.forEach((h, i) => {
        prose(h, t.id + ".hints." + i);
      });
      if (new Set(t.cases.map((c) => JSON.stringify(c.inputs))).size !== t.cases.length)
        throw new Error("Python project cases must use different input data: " + t.id);
    });
  });
  return { collection, warnings };
}
export const PythonProjectReviewSchema = z
  .object({
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    decision: z.literal("accepted"),
    reviewedAt: z.string().datetime(),
    reviewer: z.string().min(1),
    authority: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1),
    acceptedWarnings: z.array(
      z.object({ path: z.string(), ruleId: z.string(), rationale: z.string().min(1) }).strict(),
    ),
  })
  .strict();
export function assertPythonProjectReview(
  input: unknown,
  review: unknown,
  bundle: CourseBundle,
): PythonProjectCollection {
  const { collection, warnings } = validatePythonProjects(input, bundle);
  const approval = PythonProjectReviewSchema.parse(review);
  if (bundleDigest(input) !== approval.sha256)
    throw new Error("Python projects changed after review.");
  for (const warning of warnings)
    if (
      !approval.acceptedWarnings.some((w) => w.path === warning.path && w.ruleId === warning.ruleId)
    )
      throw new Error(
        "Python project warning needs review: " + warning.path + " " + warning.ruleId,
      );
  return collection;
}
export async function loadPythonProjects(
  directory: string,
  bundle: CourseBundle,
): Promise<PythonProjectCollection | undefined> {
  let text: string;
  try {
    text = await readFile(path.join(directory, "python-projects.json"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  const review = JSON.parse(
    await readFile(path.join(directory, "review", "python-projects.json"), "utf8"),
  );
  return assertPythonProjectReview(JSON.parse(text), review, bundle);
}
