/**
 * Loads courses exactly as the server does, cover and assets included:
 * `npx tsx scripts/check-course.ts <course-id> [<course-id> …]`. Use it on a finished course
 * while others are still being written, when `pnpm validate:content` would fail on theirs.
 */
import path from "node:path";
import { loadCourseBundle } from "../packages/curriculum/src/index.ts";

const root = path.resolve(import.meta.dirname, "..", "content");
let failed = false;
for (const id of process.argv.slice(2)) {
  try {
    const bundle = await loadCourseBundle(path.join(root, id, "bundle.json"));
    console.log(
      `${id}: ${bundle.lessons.length} lessons, ${bundle.questions.length} questions, ${bundle.flashcards.length} cards`,
    );
  } catch (error) {
    failed = true;
    console.error(`${id}: ${(error as Error).message}`);
  }
}
if (failed) process.exitCode = 1;
