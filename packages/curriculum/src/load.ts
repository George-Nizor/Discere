import { readFile } from "node:fs/promises";
import type { CourseBundle } from "@discere/contracts";
import { validateCourseBundle } from "./validate.js";

export async function loadCourseBundle(path: string): Promise<CourseBundle> {
  const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
  const validation = validateCourseBundle(raw);
  if (!validation.passed || !validation.bundle) {
    const messages = validation.issues.filter((item) => item.severity === "error").map((item) => `${item.path}: ${item.message}`).join("\n");
    throw new Error(`Invalid course bundle:\n${messages}`);
  }
  return validation.bundle;
}
