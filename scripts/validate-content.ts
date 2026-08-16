import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCourseBundle, validateCourseBundle } from "@discere/curriculum";
import { readFile } from "node:fs/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content");
const directories = await readdir(contentRoot, { withFileTypes: true });
let failed = false;

for (const directory of directories) {
  if (!directory.isDirectory()) continue;
  const bundlePath = path.join(contentRoot, directory.name, "bundle.json");
  const raw = JSON.parse(await readFile(bundlePath, "utf8")) as unknown;
  const result = validateCourseBundle(raw);
  for (const issue of result.issues) {
    const line = `${issue.severity.toUpperCase()} ${directory.name}/${issue.path} ${issue.code}: ${issue.message}`;
    issue.severity === "error" ? console.error(line) : console.warn(line);
  }
  if (!result.passed) failed = true;
  else {
    const bundle = await loadCourseBundle(bundlePath);
    console.log(`Validated ${bundle.course.title}: ${bundle.lessons.length} lesson(s), ${bundle.questions.length} question(s).`);
  }
}
if (failed) process.exitCode = 1;
