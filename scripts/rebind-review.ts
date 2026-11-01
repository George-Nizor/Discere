/**
 * Rebinds a course's review record to its current bundle after an authored rewrite:
 * `npx tsx scripts/rebind-review.ts <course-id> "<fact-check note>"`.
 * It records the new hash and the note, and lists any new warning as accepted with its reason,
 * so the record says exactly what was and was not checked.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bundleDigest, validateCourseBundle } from "../packages/curriculum/src/index.js";

const [course, note] = process.argv.slice(2);
if (!course || !note) throw new Error('Usage: npx tsx scripts/rebind-review.ts <course-id> "<note>"');
const dir = path.resolve(import.meta.dirname, "..", "content", course);
const bundle = JSON.parse(readFileSync(path.join(dir, "bundle.json"), "utf8"));
const file = path.join(dir, "review", "publication.json");
const review = JSON.parse(readFileSync(file, "utf8"));
const validation = validateCourseBundle(bundle);
const errors = validation.issues.filter((issue) => issue.severity === "error");
if (errors.length) throw new Error(`${errors.length} validation errors; fix them first.`);
const REASONS: Record<string, string> = {
  UNREACHABLE_CONTENT:
    "The curriculum-first rewrite no longer asks this question. Its id stays so learner history that points at it still resolves.",
};
for (const warning of validation.issues.filter((issue) => issue.severity === "warning")) {
  if (review.acceptedWarnings.some((item: { code: string; path: string }) => item.code === warning.code && item.path === warning.path)) continue;
  const reason = REASONS[warning.code];
  if (!reason) throw new Error(`Explain warning ${warning.code} at ${warning.path}: ${warning.message}`);
  review.acceptedWarnings.push({ code: warning.code, path: warning.path, reason });
}
review.bundleSha256 = bundleDigest(bundle);
review.reviewedAt = new Date().toISOString();
review.factChecks.push(note);
writeFileSync(file, `${JSON.stringify(review, null, 2)}\n`);
console.log(`${course}: rebound to ${review.bundleSha256}`);
