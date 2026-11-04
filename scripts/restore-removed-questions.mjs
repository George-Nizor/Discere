#!/usr/bin/env node
/**
 * Puts back any question a rewrite removed from a course, taking it from the last commit:
 *   node scripts/restore-removed-questions.mjs <course-id> [<course-id> …]
 * A question a lesson no longer asks still has to resolve, because learners' attempts and review
 * history point at its id. Restored questions are appended unchanged; no lesson asks them.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
for (const courseId of process.argv.slice(2)) {
  const relative = `content/${courseId}/bundle.json`;
  const before = JSON.parse(
    execFileSync("git", ["show", `HEAD:${relative}`], { cwd: root, maxBuffer: 1e9 }).toString(),
  );
  const file = path.join(root, relative);
  const bundle = JSON.parse(readFileSync(file, "utf8"));
  const present = new Set(bundle.questions.map((question) => question.id));
  const missing = before.questions.filter((question) => !present.has(question.id));
  bundle.questions.push(...missing);
  writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(`${courseId}: restored ${missing.length}${missing.length ? ` (${missing.map((q) => q.id).join(", ")})` : ""}`);
}
