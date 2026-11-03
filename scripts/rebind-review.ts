/**
 * Rebinds a course's review record to its current bundle after an authored rewrite:
 * `npx tsx scripts/rebind-review.ts <course-id> "<fact-check note>"`.
 * It records the new hash and the note, and lists any new warning as accepted with its reason,
 * so the record says exactly what was and was not checked.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CourseBundleSchema } from "../packages/contracts/src/index.js";
import { bundleDigest, validateCourseBundle } from "../packages/curriculum/src/index.js";

const [course, note, ...flags] = process.argv.slice(2);
if (!course || !note)
  throw new Error('Usage: npx tsx scripts/rebind-review.ts <course-id> "<note>" [--resolve "<resolution>"]');
// `--resolve "<text>"` records one resolution for every authoring uncertainty not yet resolved,
// such as facts an author wrote from memory. Say exactly what was and was not checked.
const resolveAt = flags.indexOf("--resolve");
const resolution = resolveAt >= 0 ? flags[resolveAt + 1] : undefined;
const dir = path.resolve(import.meta.dirname, "..", "content", course);
// An author may omit fields that have defaults; the bundle is stored complete, so the hash the
// review binds is the one the app and tests compute after parsing.
const bundle = CourseBundleSchema.parse(JSON.parse(readFileSync(path.join(dir, "bundle.json"), "utf8")));
writeFileSync(path.join(dir, "bundle.json"), `${JSON.stringify(bundle, null, 2)}\n`);
const file = path.join(dir, "review", "publication.json");
const review = JSON.parse(readFileSync(file, "utf8"));
const validation = validateCourseBundle(bundle);
const errors = validation.issues.filter((issue) => issue.severity === "error");
if (errors.length) throw new Error(`${errors.length} validation errors; fix them first.`);
const REASONS: Record<string, string> = {
  TERM_BEFORE_INTRODUCTION:
    "The lesson opener names its subject (for example 'enzyme' or 'mitosis') before the teaching screen that defines it; the opener sets up the question the lesson answers, and the definition follows.",
  UNREACHABLE_CONTENT:
    "The curriculum-first rewrite no longer asks this question. Its id stays so learner history that points at it still resolves.",
};
for (const warning of validation.issues.filter((issue) => issue.severity === "warning")) {
  if (review.acceptedWarnings.some((item: { code: string; path: string }) => item.code === warning.code && item.path === warning.path)) continue;
  const reason = REASONS[warning.code];
  if (!reason) throw new Error(`Explain warning ${warning.code} at ${warning.path}: ${warning.message}`);
  review.acceptedWarnings.push({ code: warning.code, path: warning.path, reason });
}
for (const metadata of bundle.authoringMetadata ?? []) {
  for (const concern of metadata.uncertainty) {
    const done = review.resolvedUncertainty.some(
      (item: { lessonId: string; concern: string }) =>
        item.lessonId === metadata.lessonId && item.concern === concern,
    );
    if (done) continue;
    if (!resolution) throw new Error(`Resolve '${concern}' in ${metadata.lessonId}, or pass --resolve.`);
    review.resolvedUncertainty.push({ lessonId: metadata.lessonId, concern, resolution });
  }
}
review.bundleSha256 = bundleDigest(bundle);
review.reviewedAt = new Date().toISOString();
review.factChecks.push(note);
writeFileSync(file, `${JSON.stringify(review, null, 2)}\n`);
console.log(`${course}: rebound to ${review.bundleSha256}`);
