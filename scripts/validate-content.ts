import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  courseDirectories,
  loadCourseBundle,
  loadSqlProjects,
  loadPythonProjects,
  validateCourseBundle,
} from "../packages/curriculum/src/index.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content");
const directories = await courseDirectories(contentRoot);
let failed = false;

for (const directory of directories) {
  const bundlePath = path.join(contentRoot, directory, "bundle.json");
  const raw = JSON.parse(await readFile(bundlePath, "utf8")) as unknown;
  const result = validateCourseBundle(raw);
  for (const issue of result.issues) {
    const line = `${issue.severity.toUpperCase()} ${directory}/${issue.path} ${issue.code}: ${issue.message}`;
    issue.severity === "error" ? console.error(line) : console.warn(line);
  }
  if (!result.passed) failed = true;
  else {
    const bundle = await loadCourseBundle(bundlePath);
    const projects = await loadSqlProjects(path.dirname(bundlePath), bundle);
    if (projects) console.log(`Validated ${projects.projects.length} reviewed SQL projects.`);
    const pythonProjects = await loadPythonProjects(path.dirname(bundlePath), bundle);
    if (pythonProjects) console.log(`Validated ${pythonProjects.projects.length} reviewed Python projects.`);
    console.log(
      `Validated ${bundle.course.title}: ${bundle.lessons.length} lesson(s), ${bundle.questions.length} question(s).`,
    );
  }
}
if (failed) process.exitCode = 1;
