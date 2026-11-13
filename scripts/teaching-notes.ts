/**
 * Lessons worth rereading for how they hand work to the learner: faded examples that blank only
 * the last line, and transfers that repeat the previous try with new numbers. Advisory only;
 * nothing here blocks validation, publication or editorial approval.
 *
 *   pnpm teaching:notes            counts per course
 *   pnpm teaching:notes --list     every note
 *   pnpm teaching:notes <course>   every note for one course
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  courseDirectories,
  loadCourseBundle,
  teachingNotes,
} from "../packages/curriculum/src/index.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content");
const args = process.argv.slice(2);
const list = args.includes("--list");
const only = args.find((arg) => !arg.startsWith("--"));

const totals = new Map<string, number>();
for (const directory of await courseDirectories(contentRoot)) {
  if (only && directory !== only) continue;
  const bundle = await loadCourseBundle(path.join(contentRoot, directory, "bundle.json"));
  const notes = teachingNotes(bundle);
  if (notes.length === 0) continue;
  const counts = new Map<string, number>();
  for (const note of notes) {
    counts.set(note.code, (counts.get(note.code) ?? 0) + 1);
    totals.set(note.code, (totals.get(note.code) ?? 0) + 1);
  }
  console.log(`${directory}: ${[...counts].map(([code, count]) => `${count} ${code}`).join(", ")}`);
  if (list || only)
    for (const note of notes) console.log(`  ${note.code} ${note.path}\n    ${note.message}`);
}
console.log(
  `\nTotal: ${[...totals].map(([code, count]) => `${count} ${code}`).join(", ") || "no notes"}`,
);
