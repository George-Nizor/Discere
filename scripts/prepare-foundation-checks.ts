import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { validateCourseBundle, bundleDigest } from "@discere/curriculum";
import { logicCourseChecks } from "../content/logic-and-reasoning/authoring/course-checks.js";
import { csCourseChecks } from "../content/cs-basics/authoring/course-checks.js";
import { statisticsCourseChecks } from "../content/probability-statistics/authoring/course-checks.js";
const checks = {
  "logic-and-reasoning": logicCourseChecks,
  "cs-basics": csCourseChecks,
  "probability-statistics": statisticsCourseChecks,
};
for (const [id, courseChecks] of Object.entries(checks)) {
  const directory = resolve(import.meta.dirname, "../content", id);
  const current = JSON.parse(await readFile(resolve(directory, "bundle.json"), "utf8"));
  const draft = { ...current, course: { ...current.course, version: "1.1.0" }, courseChecks };
  const result = validateCourseBundle(draft);
  for (const issue of result.issues)
    console.log(id, issue.severity, issue.path, issue.code, issue.message);
  if (!result.passed || !result.bundle) throw Error("Candidate failed: " + id);
  await mkdir(resolve(directory, ".authoring"), { recursive: true });
  await writeFile(
    resolve(directory, ".authoring/candidate.json"),
    JSON.stringify(result.bundle, null, 2) + "\n",
  );
  console.log(
    "Staged",
    id,
    courseChecks.reduce((n, c) => n + c.items.length, 0),
    "checks;",
    bundleDigest(result.bundle),
  );
}
