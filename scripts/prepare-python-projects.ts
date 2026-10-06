import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validatePythonProjects, bundleDigest } from "@discere/curriculum";
import { pythonProjects } from "../content/python-for-data-analysis/authoring/projects.js";
import {
  IsolatedPythonRuntime,
  samePythonResult,
} from "../apps/server/src/python-projects/runtime.js";
const directory = path.resolve("content/python-for-data-analysis");
const bundle = JSON.parse(await readFile(path.join(directory, "bundle.json"), "utf8"));
const { collection, warnings } = validatePythonProjects(pythonProjects, bundle);
const runtime = new IsolatedPythonRuntime();
let checked = 0;
for (const project of collection.projects)
  for (const task of project.tasks)
    for (const [index, fixture] of task.cases.entries()) {
      const run = await runtime.execute(task.solution, fixture.inputs, task.call);
      if ("error" in run || !samePythonResult(run.result, fixture.expected))
        throw new Error(
          JSON.stringify({ task: task.id, case: index, actual: run, expected: fixture.expected }),
        );
      checked += 1;
    }
await mkdir(path.join(directory, ".authoring"), { recursive: true });
await writeFile(
  path.join(directory, ".authoring/python-projects.candidate.json"),
  JSON.stringify(collection, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      projects: collection.projects.length,
      tasks: collection.projects.reduce((n, p) => n + p.tasks.length, 0),
      checked,
      sha256: bundleDigest(collection),
      warnings,
    },
    null,
    2,
  ),
);
