#!/usr/bin/env node
/**
 * Writes docs/library.md: every course with its size, its question mix and the passes it has had,
 * read from the bundles in content/ and from docs/content-ledger.json.
 * Usage: node scripts/library-report.mjs [--check]
 * With --check it exits 1 when docs/library.md is out of date or a course is missing from the
 * ledger, so a pass that changes content but not the ledger is noticed.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const ledger = JSON.parse(readFileSync(path.join(root, "docs/content-ledger.json"), "utf8"));
const contentRoot = path.join(root, "content");

// The same groups, in the same order, as the Courses page (apps/web/src/home/CourseLibrary.tsx).
const AREAS = [
  [
    "Mathematics and logic",
    [
      "maths-foundations",
      "geometry-shape-and-space",
      "trigonometry",
      "linear-algebra-vectors-and-maps",
      "calculus-change-and-accumulation",
      "calculus-series-and-differential-equations",
      "logic-and-reasoning",
      "probability-statistics",
      "statistical-and-causal-inference",
    ],
  ],
  [
    "Programming and computer science",
    [
      "cs-basics",
      "computers-and-networks",
      "data-structures-and-algorithms",
      "linux-and-the-command-line",
      "git-and-version-control",
      "rust-foundations",
      "systems-programming",
      "the-web-html-css-javascript",
      "typescript-and-node",
      "game-design-and-programming-patterns",
    ],
  ],
  [
    "Building software",
    [
      "backend-and-api-design",
      "databases-and-data-modelling",
      "software-testing-and-quality",
      "software-design-and-architecture",
      "system-design",
      "devops-and-delivery",
      "cloud-fundamentals",
      "cybersecurity",
      "ai-assisted-engineering",
      "ux-and-hci",
      "technical-writing",
    ],
  ],
  [
    "Data and AI",
    [
      "sql-from-rows-to-reports",
      "python-for-data-analysis",
      "data-engineering",
      "analytics-engineering-and-governance",
      "machine-learning-and-mlops",
      "ai-engineering",
      "ai-agents",
    ],
  ],
  [
    "Science",
    [
      "physics-motion-and-forces",
      "physics-waves-electricity-heat",
      "astronomy-sky-to-cosmos",
      "chemistry-atoms-to-reactions",
      "biology-cells-to-ecosystems",
      "how-the-body-works",
      "earth-and-environmental-science",
    ],
  ],
  [
    "Engineering and making",
    [
      "engineering-structures-and-machines",
      "electronics-foundations",
      "mechanisms-and-machine-design",
      "materials-and-manufacturing",
      "control-theory",
      "mechatronics-and-robotics",
      "industrial-and-product-design",
      "small-buildings-and-architectural-design",
    ],
  ],
  [
    "Mind, society and decisions",
    ["psychology-how-minds-work", "economics-markets-and-strategy", "decision-theory"],
  ],
  [
    "History, language and writing",
    [
      "philosophy-knowledge-mind-and-ethics",
      "history",
      "roman-republic",
      "linguistics",
      "english-reading-writing-and-rhetoric",
      "reading-and-research",
      "writing-longer-pieces",
      "speaking-argument-and-debate",
      "creative-and-game-writing",
    ],
  ],
  ["Music and sound", ["music-theory", "sound-and-audio-fundamentals"]],
  ["First aid", ["first-aid"]],
  ["Not in the library", ["drawing-and-visual-art-fundamentals"]],
];

const ids = readdirSync(contentRoot)
  .filter((id) => !id.startsWith("_") && existsSync(path.join(contentRoot, id, "bundle.json")))
  .sort();
const placed = new Set(AREAS.flatMap(([, list]) => list));
const problems = [];
for (const id of ids) {
  if (!placed.has(id)) problems.push(`${id} has no area in scripts/library-report.mjs`);
  if (!ledger.courses[id]) problems.push(`${id} is missing from docs/content-ledger.json`);
}

const kind = (q) => (q.choices ? "choice" : q.responseType);
function stats(id) {
  const bundle = JSON.parse(readFileSync(path.join(contentRoot, id, "bundle.json"), "utf8"));
  const qs = bundle.questions;
  const count = (k) => qs.filter((q) => kind(q) === k).length;
  const mc = qs.filter((q) => (q.choices?.length ?? 0) >= 3);
  const longest = mc.filter((q) => {
    const right = q.choices.find((c) => q.answerAuthority.acceptedIdeas?.includes(c.label));
    const others = q.choices.filter((c) => c !== right);
    return right && right.label.length > Math.max(...others.map((c) => c.label.length));
  }).length;
  const dir = path.join(contentRoot, id);
  const projects = ["python-projects.json", "projects.json", "rust-projects.json"].some((f) =>
    existsSync(path.join(dir, f)),
  );
  return {
    title: bundle.course.title,
    visibility: bundle.course.catalogueVisibility ?? "listed",
    lessons: bundle.lessons.length,
    questions: qs.length,
    choice: count("choice"),
    numeric: count("numeric"),
    text: count("short_text"),
    code: count("code"),
    orderSort: count("order") + count("sort"),
    extracts: qs.filter((q) => q.extracts?.length).length,
    shortPrompts: Math.round((100 * qs.filter((q) => q.prompt.length < 90).length) / qs.length),
    longest: mc.length ? Math.round((100 * longest) / mc.length) : 0,
    writing: bundle.essays?.length ?? 0,
    checks: bundle.courseChecks?.length ?? 0,
    sources: bundle.sources.length,
    projects,
    reviewed: existsSync(path.join(dir, "review", "publication.json")),
    pass: ledger.courses[id]?.questions?.pass ?? "unknown",
  };
}

const all = Object.fromEntries(ids.map((id) => [id, stats(id)]));
const listed = ids.filter((id) => all[id].visibility === "listed");
const sum = (key, list = listed) => list.reduce((total, id) => total + all[id][key], 0);
const byPass = {};
for (const id of listed) byPass[all[id].pass] = (byPass[all[id].pass] ?? 0) + 1;

const lines = [
  "# The course library",
  "",
  "Generated by `node scripts/library-report.mjs` from `content/*/bundle.json` and",
  "`docs/content-ledger.json`. Do not edit by hand; run the script after any content change.",
  "",
  `${listed.length} courses are listed, with ${sum("lessons")} lessons and ${sum("questions")} questions. ` +
    `${ids.length - listed.length} more ${ids.length - listed.length === 1 ? "is" : "are"} in content/ but not listed: ` +
    `${ids
      .filter((id) => !listed.includes(id))
      .map((id) => `${all[id].title} (${all[id].visibility})`)
      .join(", ")}.`,
  "",
  "Last question pass of the listed courses: " +
    Object.entries(byPass)
      .map(([pass, n]) => `${n} ${pass}`)
      .join(", ") +
    " (rewritten: the full question rewrite; targeted: option lengths, feedback and hints only;" +
    " new: written to the current standard). What each pass did is in" +
    " [the content history](content-history.md).",
  "",
  "Columns: questions by type (choice, numeric, typed text, code, order or sort), how many quote a",
  "source extract, the share of prompts under 90 characters (a rough sign of a bare question with no",
  "material to work from), the share of multiple-choice questions whose right option is strictly the",
  "longest (should sit between about 10% and 30%), writing tasks, course-check questions, sources,",
  "whether the course has coding projects, and whether a review record binds the bundle.",
  "",
];
for (const [area, list] of AREAS) {
  const present = list.filter((id) => all[id]);
  if (!present.length) continue;
  lines.push(`## ${area}`, "");
  lines.push(
    "| Course | Lessons | Questions | Choice | Num | Text | Code | Order/sort | Extracts | Short prompts | Right longest | Writing | Checks | Sources | Projects | Reviewed | Question pass |",
  );
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const id of present) {
    const s = all[id];
    const title = s.visibility === "listed" ? s.title : `${s.title} (${s.visibility})`;
    lines.push(
      `| ${title} | ${s.lessons} | ${s.questions} | ${s.choice} | ${s.numeric} | ${s.text} | ${s.code} | ${s.orderSort} | ${s.extracts} | ${s.shortPrompts}% | ${s.longest}% | ${s.writing} | ${s.checks} | ${s.sources} | ${s.projects ? "yes" : ""} | ${s.reviewed ? "yes" : ""} | ${s.pass} |`,
    );
  }
  lines.push("");
}
const output = `${lines.join("\n")}`;
const target = path.join(root, "docs/library.md");

if (process.argv.includes("--check")) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current !== output)
    problems.push("docs/library.md is out of date; run node scripts/library-report.mjs");
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("docs/library.md and the ledger match the content.");
} else {
  if (problems.length) console.warn(problems.join("\n"));
  writeFileSync(target, output);
  console.log(`Wrote docs/library.md: ${listed.length} listed courses.`);
}
