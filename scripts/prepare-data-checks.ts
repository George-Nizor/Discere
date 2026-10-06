import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { validateCourseBundle, bundleDigest } from "@discere/curriculum";
import { sqlCourseChecks } from "../content/sql-from-rows-to-reports/authoring/course-checks.js";
import {
  pythonCourseChecks,
  pythonCheckSpecs,
} from "../content/python-for-data-analysis/authoring/course-checks.js";
for (const [id, courseChecks] of Object.entries({
  "sql-from-rows-to-reports": sqlCourseChecks,
  "python-for-data-analysis": pythonCourseChecks,
})) {
  const directory = resolve(import.meta.dirname, "../content", id);
  const current = JSON.parse(await readFile(resolve(directory, "bundle.json"), "utf8"));
  const result = validateCourseBundle({
    ...current,
    course: { ...current.course, version: "1.1.0" },
    courseChecks,
  });
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
    bundleDigest(result.bundle),
  );
}
await writeFile(
  resolve(import.meta.dirname, "../content/python-for-data-analysis/.authoring/check-probes.json"),
  JSON.stringify(
    {
      probes: Object.fromEntries(
        pythonCheckSpecs.flatMap((set, si) =>
          set.map((s, qi) => [
            pythonCourseChecks[si]!.items[qi]!.question.id,
            { code: s.code + "\nanswer = " + s.expression, expected: s.value },
          ]),
        ),
      ),
      examples: {},
    },
    null,
    2,
  ) + "\n",
);
