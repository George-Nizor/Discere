import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sqlProjects } from "../content/sql-from-rows-to-reports/authoring/projects.js";
import { CourseBundleSchema, SqlProjectCollectionSchema } from "../packages/contracts/src/index.js";
import { readFile } from "node:fs/promises";
import { bundleDigest, validateSqlProjects } from "@discere/curriculum";
import { IsolatedSqlRuntime, sameSqlResult } from "../apps/server/src/sql-projects/runtime.js";
const root = path.resolve(import.meta.dirname, "../content/sql-from-rows-to-reports");
const bundle = CourseBundleSchema.parse(
  JSON.parse(await readFile(path.join(root, "bundle.json"), "utf8")),
);
const candidate = SqlProjectCollectionSchema.parse(sqlProjects);
const { warnings } = validateSqlProjects(candidate, bundle);
const runtime = new IsolatedSqlRuntime();
let verified = 0;
for (const project of candidate.projects)
  for (const task of project.tasks)
    for (const fixture of task.cases) {
      const output = await runtime.execute(task.solution, fixture.tables);
      if ("error" in output || !sameSqlResult(output.result, fixture.expected, task.ordered))
        throw new Error(
          task.id +
            ": reference query disagrees with its manually authored expected output: " +
            JSON.stringify(output),
        );
      verified += 1;
    }
await mkdir(path.join(root, ".authoring"), { recursive: true });
await writeFile(
  path.join(root, ".authoring", "projects.candidate.json"),
  JSON.stringify(candidate, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      sha256: bundleDigest(candidate),
      verified,
      tasks: candidate.projects.flatMap((p) => p.tasks).length,
      warnings,
    },
    null,
    2,
  ),
);
