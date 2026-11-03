/**
 * Validates one course after a voice rewrite: `npx tsx scripts/voice-check.ts <course-id>`.
 * Prints every error, and exits non-zero if there is one.
 *
 * A course still being written from its curriculum has stub lessons with no steps. Those are
 * left out, so the check covers every lesson written so far and says how many remain.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { validateCourseBundle } from "../packages/curriculum/src/index.js";

const course = process.argv[2];
if (!course) throw new Error("Usage: npx tsx scripts/voice-check.ts <course-id>");
const bundle = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, "..", "content", course, "bundle.json"), "utf8"),
);
const stubs = bundle.lessons.filter((lesson: { steps: unknown[] }) => lesson.steps.length === 0);
bundle.lessons = bundle.lessons.filter((lesson: { steps: unknown[] }) => lesson.steps.length > 0);
const errors = validateCourseBundle(bundle).issues.filter((issue) => issue.severity === "error");
for (const issue of errors) console.log(`${issue.code} ${issue.path}: ${issue.message}`);
console.log(
  `${course}: ${errors.length} error(s)${stubs.length ? `; ${stubs.length} lesson(s) not written yet` : ""}`,
);
process.exit(errors.length ? 1 : 0);
