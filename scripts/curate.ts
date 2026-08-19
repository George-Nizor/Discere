/**
 * The curriculum pipeline: plan → prompt → paste → import.
 *
 * Discere's lessons are written by a frontier model the owner drives by hand, not by an
 * automated generation run. That is a deliberate trade. Content is the part of this product
 * where quality compounds and mistakes are expensive to find later, and the local CLI that
 * powers the live tutor is a coding agent carrying twenty thousand tokens of scaffolding per
 * call. So the machine does what machines are good at here — deriving the work list, writing
 * exact prompts, validating what comes back, and remembering what is left — and a person does
 * the writing.
 *
 * The loop is:
 *   pnpm curate status <course>   what is left to do
 *   pnpm curate prompt <course>   write the next lesson's prompt to a file
 *   ...paste it into ChatGPT, paste the reply into the inbox path it names...
 *   pnpm curate import <course>   validate, gate, and merge everything waiting in the inbox
 * repeated until `status` reports nothing pending.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type ImportedLesson,
  ImportedLessonSchema,
  type TopicMap,
  TopicMapSchema,
} from "../packages/contracts/src/index.ts";
import {
  lessonPrompt,
  mergeLesson,
  topicMapLessons,
  topicMapPrompt,
  validateCourseBundle,
} from "../packages/curriculum/src/index.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_ROOT = path.join(ROOT, "content");
const TOPIC_MAPS = path.join(CONTENT_ROOT, "_topic-maps");

export interface CurationPaths {
  courseDirectory: string;
  authoring: string;
  prompts: string;
  inbox: string;
  ledger: string;
}

export function curationPaths(courseId: string): CurationPaths {
  const courseDirectory = path.join(CONTENT_ROOT, courseId);
  const authoring = path.join(courseDirectory, ".authoring");
  return {
    courseDirectory,
    authoring,
    prompts: path.join(authoring, "prompts"),
    inbox: path.join(authoring, "inbox"),
    ledger: path.join(authoring, "state.json"),
  };
}

export type LessonStatus = "pending" | "imported";

export interface Ledger {
  courseId: string;
  /** One entry per lesson in the topic map, keyed by slug. */
  lessons: Record<string, LessonStatus>;
  updatedAt: string;
}

export async function loadTopicMap(courseId: string): Promise<TopicMap> {
  const file = path.join(TOPIC_MAPS, `${courseId}.json`);
  if (!existsSync(file)) {
    const available = existsSync(TOPIC_MAPS)
      ? (await readdir(TOPIC_MAPS)).filter((name) => name.endsWith(".json")).join(", ")
      : "none";
    throw new Error(`No topic map for '${courseId}'. Available: ${available}`);
  }
  const parsed = TopicMapSchema.safeParse(JSON.parse(await readFile(file, "utf8")) as unknown);
  if (!parsed.success) {
    throw new Error(
      `Topic map '${courseId}' is not valid:\n${parsed.error.issues
        .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`,
    );
  }
  return parsed.data;
}

export async function loadLedger(map: TopicMap): Promise<Ledger> {
  const paths = curationPaths(map.courseId);
  let ledger: Ledger = { courseId: map.courseId, lessons: {}, updatedAt: new Date().toISOString() };
  if (existsSync(paths.ledger)) {
    ledger = JSON.parse(await readFile(paths.ledger, "utf8")) as Ledger;
  }
  // The map is the source of truth for what exists; the ledger only records what is done.
  for (const { lesson } of topicMapLessons(map)) {
    ledger.lessons[lesson.slug] ??= "pending";
  }
  return ledger;
}

export async function saveLedger(ledger: Ledger): Promise<void> {
  const paths = curationPaths(ledger.courseId);
  await mkdir(paths.authoring, { recursive: true });
  ledger.updatedAt = new Date().toISOString();
  await writeFile(paths.ledger, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function heading(text: string): void {
  console.log(`\n${text}\n${"─".repeat(text.length)}`);
}

async function commandPlan(courseId: string, subject: string): Promise<void> {
  // Deliberately not under content/<courseId>: that directory must not exist until it holds a
  // bundle, because every directory under content/ that is not underscore-prefixed is loaded
  // as a course at boot.
  const directory = path.join(TOPIC_MAPS, "prompts");
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `${courseId}.md`);
  await writeFile(file, topicMapPrompt(courseId, subject || courseId), "utf8");
  heading(`Planning prompt for ${courseId}`);
  console.log(`Written to ${path.relative(ROOT, file)}`);
  console.log(`
Next:
  1. Paste that file into ChatGPT.
  2. Save the JSON reply to content/_topic-maps/${courseId}.json
  3. Run: pnpm curate prompt ${courseId}`);
}

async function commandPrompt(courseId: string, only: string | undefined): Promise<void> {
  const map = await loadTopicMap(courseId);
  const ledger = await loadLedger(map);
  const paths = curationPaths(courseId);
  await mkdir(paths.prompts, { recursive: true });
  await mkdir(paths.inbox, { recursive: true });

  const entries = topicMapLessons(map).filter(
    ({ lesson }) => (only ? lesson.slug === only : ledger.lessons[lesson.slug] !== "imported"),
  );
  if (entries.length === 0) {
    console.log(`Nothing to write. Every lesson of ${courseId} has been imported.`);
    return;
  }
  for (const { module, lesson } of entries) {
    const file = path.join(paths.prompts, `${lesson.slug}.md`);
    await writeFile(file, lessonPrompt(map, module, lesson), "utf8");
  }
  await saveLedger(ledger);

  heading(`${entries.length} prompt(s) for ${map.title}`);
  for (const { lesson } of entries) {
    console.log(`  ${path.relative(ROOT, path.join(paths.prompts, `${lesson.slug}.md`))}`);
  }
  const first = entries[0];
  console.log(`
Work through them one at a time:
  1. Open ${first ? path.relative(ROOT, path.join(paths.prompts, `${first.lesson.slug}.md`)) : "a prompt"} and paste it into ChatGPT.
  2. Save the JSON reply to content/${courseId}/.authoring/inbox/<slug>.json
  3. Run: pnpm curate import ${courseId}
Repeat until 'pnpm curate status ${courseId}' reports nothing pending.`);
}

async function commandStatus(courseId: string): Promise<void> {
  const map = await loadTopicMap(courseId);
  const ledger = await loadLedger(map);
  const paths = curationPaths(courseId);
  const waiting = existsSync(paths.inbox)
    ? (await readdir(paths.inbox)).filter((name) => name.endsWith(".json"))
    : [];

  heading(`${map.title}`);
  const entries = topicMapLessons(map);
  for (const { module, lesson } of entries) {
    const state = ledger.lessons[lesson.slug] ?? "pending";
    const inbox = waiting.includes(`${lesson.slug}.json`) ? " (in the inbox, not yet imported)" : "";
    console.log(`  ${state === "imported" ? "✓" : "·"} ${lesson.slug.padEnd(32)} ${module}${inbox}`);
  }
  const done = entries.filter(({ lesson }) => ledger.lessons[lesson.slug] === "imported").length;
  console.log(`\n${done} of ${entries.length} lessons imported.`);
  if (waiting.length > 0) console.log(`${waiting.length} file(s) waiting: pnpm curate import ${courseId}`);
  else if (done < entries.length) console.log(`Next: pnpm curate prompt ${courseId}`);
  else console.log("This course is complete.");
}

/**
 * Creates the bundle a course needs before any lesson can be merged into it: the course record,
 * its modules, its concepts and its sources, all taken from the topic map. Lessons, activities
 * and questions arrive later through import.
 */
async function commandScaffold(courseId: string): Promise<void> {
  const map = await loadTopicMap(courseId);
  const paths = curationPaths(courseId);
  const bundlePath = path.join(paths.courseDirectory, "bundle.json");
  if (existsSync(bundlePath)) {
    console.log(`content/${courseId}/bundle.json already exists; leaving it alone.`);
    return;
  }
  const sources = map.sources.map((source, index) => ({
    id: `${courseId}-source-${index + 1}`,
    title: source.title,
    publisher: new URL(source.url).hostname.replace(/^www\./, ""),
    url: source.url,
    licence: "See the publisher's terms",
    accessedAt: new Date().toISOString().slice(0, 10),
  }));
  const bundle = {
    course: {
      id: map.courseId,
      version: "0.1.0",
      title: map.title,
      description: map.description,
      audience: map.audience,
      assuranceLevel: "source_backed",
      moduleIds: map.modules.map((module) => module.id),
      sourceIds: sources.map((source) => source.id),
      accent: map.accent,
      coverAsset: map.coverAsset,
      // Stays out of the catalogue's open shelf until it has lessons the learner can start.
      status: "coming_soon",
    },
    modules: map.modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.summary,
      conceptIds: module.concepts.map((concept) => concept.id),
    })),
    concepts: map.modules.flatMap((module) =>
      module.concepts.map((concept) => ({
        id: concept.id,
        moduleId: module.id,
        title: concept.title,
        summary: concept.summary,
        prerequisiteIds: [],
        misconceptionIds: [],
        assuranceLevel: "source_backed",
      })),
    ),
    lessons: [],
    activities: [],
    questions: [],
    flashcards: [],
    essays: [],
    sources,
  };
  const validation = validateCourseBundle(bundle);
  const blocking = validation.issues.filter((issue) => issue.severity === "error");
  if (!validation.passed || blocking.length > 0) {
    heading("The scaffold did not validate, so nothing was written");
    for (const issue of blocking) console.log(`  · ${issue.path}: ${issue.message}`);
    process.exitCode = 1;
    return;
  }
  await mkdir(paths.courseDirectory, { recursive: true });
  await mkdir(path.join(paths.courseDirectory, "assets"), { recursive: true });
  await writeFile(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  heading(`Scaffolded ${map.title}`);
  console.log(`  content/${courseId}/bundle.json`);
  console.log(`  ${bundle.modules.length} module(s), ${bundle.concepts.length} concept(s), ${sources.length} source(s)`);
  console.log(`\nNext: pnpm curate prompt ${courseId}`);
}

async function commandImport(courseId: string): Promise<void> {
  const map = await loadTopicMap(courseId);
  const ledger = await loadLedger(map);
  const paths = curationPaths(courseId);
  const bundlePath = path.join(paths.courseDirectory, "bundle.json");
  if (!existsSync(bundlePath)) {
    throw new Error(
      `Course '${courseId}' has no bundle.json yet. A course needs its plumbing — modules, concepts, sources, a visual brief — before lessons can be merged into it.`,
    );
  }
  const waiting = existsSync(paths.inbox)
    ? (await readdir(paths.inbox)).filter((name) => name.endsWith(".json")).sort()
    : [];
  if (waiting.length === 0) {
    console.log(`Nothing in content/${courseId}/.authoring/inbox to import.`);
    return;
  }

  const bundle = JSON.parse(await readFile(bundlePath, "utf8")) as Record<string, unknown>;
  const entries = topicMapLessons(map);
  const imported: string[] = [];
  const rejected: Array<{ file: string; problems: string[] }> = [];

  for (const file of waiting) {
    const slug = file.replace(/\.json$/, "");
    const entry = entries.find(({ lesson }) => lesson.slug === slug);
    if (!entry) {
      rejected.push({ file, problems: [`'${slug}' is not a lesson in this course's topic map.`] });
      continue;
    }
    let parsed: ImportedLesson;
    try {
      const raw = JSON.parse(await readFile(path.join(paths.inbox, file), "utf8")) as unknown;
      const result = ImportedLessonSchema.safeParse(raw);
      if (!result.success) {
        rejected.push({
          file,
          problems: result.error.issues.map(
            (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
          ),
        });
        continue;
      }
      parsed = result.data;
    } catch (error) {
      rejected.push({ file, problems: [error instanceof Error ? error.message : String(error)] });
      continue;
    }
    try {
      mergeLesson(bundle, map, entry, parsed);
      imported.push(slug);
    } catch (error) {
      rejected.push({ file, problems: [error instanceof Error ? error.message : String(error)] });
    }
  }

  if (imported.length === 0) {
    heading("Nothing imported");
    for (const entry of rejected) {
      console.log(`\n${entry.file}`);
      for (const problem of entry.problems) console.log(`  · ${problem}`);
    }
    process.exitCode = 1;
    return;
  }

  // The bundle is only written once it passes the same validation the server applies at boot,
  // so a rejected import leaves the course exactly as it was.
  const validation = validateCourseBundle(bundle);
  const blocking = validation.issues.filter((issue) => issue.severity === "error");
  if (!validation.passed || blocking.length > 0) {
    heading("The merged bundle did not validate, so nothing was written");
    for (const issue of blocking) console.log(`  · ${issue.path}: ${issue.message}`);
    console.log(`\nFix the file(s) in content/${courseId}/.authoring/inbox and run import again.`);
    process.exitCode = 1;
    return;
  }

  await writeFile(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  // Imported files leave the inbox, so what is in there always means "still waiting". They are
  // kept rather than deleted: a merge that turns out wrong is easier to re-run than to retype.
  const archive = path.join(paths.authoring, "imported");
  await mkdir(archive, { recursive: true });
  for (const slug of imported) {
    ledger.lessons[slug] = "imported";
    await rename(path.join(paths.inbox, `${slug}.json`), path.join(archive, `${slug}.json`));
  }
  await saveLedger(ledger);

  heading(`Imported ${imported.length} lesson(s) into ${map.title}`);
  for (const slug of imported) console.log(`  ✓ ${slug}`);
  for (const entry of rejected) {
    console.log(`\n  ✕ ${entry.file}`);
    for (const problem of entry.problems) console.log(`      ${problem}`);
  }
  const warnings = validation.issues.filter((issue) => issue.severity === "warning");
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s) worth reading:`);
    for (const issue of warnings) console.log(`  · ${issue.path}: ${issue.message}`);
  }
  console.log(`
Now run the writing gate over the prose:
  pnpm author lint ${courseId}
Then check what is left:
  pnpm curate status ${courseId}`);
}

const [command, courseId, extra] = process.argv.slice(2);

/** A pipeline fault is something the owner has to act on, so it prints as advice, not a stack. */
async function run(work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    console.error(`\n${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (!command || command === "help" || command === "--help") {
  console.log(`Discere curriculum pipeline

  pnpm curate plan     <course-id> [subject] write the prompt that plans a whole course
  pnpm curate scaffold <course-id>           create the bundle a course needs before lessons
  pnpm curate prompt <course-id> [slug]      write lesson prompts for what is still pending
  pnpm curate import <course-id>             validate and merge everything in the inbox
  pnpm curate status <course-id>             what is done and what is left

The loop: prompt → paste into ChatGPT → save the reply into the inbox → import → repeat.`);
} else if (!courseId) {
  console.error(`'${command}' needs a course id.`);
  process.exitCode = 1;
} else if (command === "plan") {
  await run(async () => commandPlan(courseId, extra ?? ""));
} else if (command === "scaffold") {
  await run(async () => commandScaffold(courseId));
} else if (command === "prompt") {
  await run(async () => commandPrompt(courseId, extra));
} else if (command === "import") {
  await run(async () => commandImport(courseId));
} else if (command === "status") {
  await run(async () => commandStatus(courseId));
} else {
  console.error(`Unknown command '${command}'. Run 'pnpm curate help'.`);
  process.exitCode = 1;
}
