import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * No shipped course is archived any more, so the server's archived-course behaviour is tested on
 * a private copy of the live catalogue in a temp directory, with one course marked
 * `catalogueVisibility: "archived"`. Nothing under content/ is touched.
 */
const contentRoot = path.resolve(import.meta.dirname, "../../../../content");

export function archivedContentRoot(archivedId: string, otherIds: string[] = []) {
  const root = mkdtempSync(path.join(tmpdir(), "discere-archived-"));
  for (const id of [archivedId, ...otherIds])
    cpSync(path.join(contentRoot, id), path.join(root, id), { recursive: true });
  const file = path.join(root, archivedId, "bundle.json");
  const bundle = JSON.parse(readFileSync(file, "utf8"));
  bundle.course.catalogueVisibility = "archived";
  writeFileSync(file, JSON.stringify(bundle));
  return { root, remove: () => rmSync(root, { recursive: true, force: true }) };
}
