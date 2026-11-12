import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertNoContentLoss } from "@discere/curriculum";

const root = path.resolve(import.meta.dirname, "../..");

/**
 * Call before writing a candidate that is rebuilt from authoring files, and before a candidate
 * replaces bundle.json. It stops the run when the published bundle holds questions, lesson steps
 * or writing tasks that the candidate would drop. `--force` or DISCERE_ALLOW_CONTENT_LOSS=1
 * lets it through and prints what went.
 */
export async function keepPublishedContent(courseId: string, candidate: unknown): Promise<void> {
  let published: unknown;
  try {
    published = JSON.parse(
      await readFile(path.join(root, "content", courseId, "bundle.json"), "utf8"),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  const force =
    process.argv.includes("--force") || process.env.DISCERE_ALLOW_CONTENT_LOSS === "1";
  const loss = assertNoContentLoss(courseId, published as never, candidate as never, { force });
  const total = loss.questions.length + loss.steps.length + loss.essays.length;
  if (total)
    console.warn(
      `Forced: ${courseId} loses ${loss.questions.length} question(s), ${loss.steps.length} lesson step(s) and ${loss.essays.length} writing task(s).`,
    );
}
