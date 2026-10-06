import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { validateCourseBundle, bundleDigest } from "@discere/curriculum";
import { mathsCourseChecks } from "../content/maths-foundations/authoring/course-checks.js";

const directory = resolve(import.meta.dirname, "../content/maths-foundations");
const bundle = JSON.parse(await readFile(resolve(directory, "bundle.json"), "utf8"));
bundle.courseChecks = mathsCourseChecks;
bundle.course.version = "1.1.0";
const validation = validateCourseBundle(bundle);
for (const issue of validation.issues)
  console.log(issue.severity, issue.path, issue.code, issue.message);
if (!validation.passed || !validation.bundle)
  throw new Error("Maths check candidate did not validate.");
await mkdir(resolve(directory, ".authoring"), { recursive: true });
await writeFile(
  resolve(directory, ".authoring/candidate.json"),
  JSON.stringify(validation.bundle, null, 2) + "\n",
);
console.log(
  "Staged Maths checks:",
  mathsCourseChecks.reduce((n, c) => n + c.items.length, 0),
  "questions;",
  bundleDigest(validation.bundle),
);
