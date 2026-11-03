#!/usr/bin/env node
/**
 * Checks every curriculum in docs/curricula/ against the brief in docs/curricula/README.md, and
 * optionally writes a review page listing every course.
 *
 *   node scripts/check-curricula.mjs [--page <out.html>]
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "docs/curricula");
const FIGURES = new Set(
  "svg_figure coordinate_plane graph_plot data_distribution data_series table timeline_explorer order_sequence diagram_choice number_machine equation_balance outcome_grid sampling_population truth_table program_trace python_execution relational_query search_array rust_program mechanics_explorer engineering_explorer chemistry_explorer biology_explorer astronomy_explorer calculus_explorer geometry_explorer linear_algebra_explorer economics_explorer psychology_explorer philosophy_explorer language_explorer inference_explorer ohms_law_explorer series_circuit_explorer parallel_circuit_explorer".split(
    " ",
  ),
);
const KINDS = new Set("numeric choice single-term order_sequence self code-run-python code-run-sql code-run-rust code-reading".split(" "));
const existing = new Set(readdirSync(path.join(ROOT, "content")).filter((d) => existsSync(path.join(ROOT, "content", d, "bundle.json"))));
const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
const courses = [];
const ids = new Set(files.map((f) => f.replace(/\.json$/, "")));
let problems = 0;

for (const file of files) {
  const issues = [];
  let c;
  try {
    c = JSON.parse(readFileSync(path.join(DIR, file), "utf8"));
  } catch (error) {
    console.log(`${file}: invalid JSON (${error.message})`);
    problems += 1;
    continue;
  }
  if (c.id !== file.replace(/\.json$/, "")) issues.push(`id ${c.id} does not match the file name`);
  for (const key of ["title", "voice", "description", "audience", "outcomes", "sources", "modules", "lessons", "courseCheck"])
    if (c[key] === undefined) issues.push(`missing ${key}`);
  const lessons = c.lessons ?? [];
  if (lessons.length < 8 || lessons.length > 16) issues.push(`${lessons.length} lessons (expected 8–16)`);
  for (const p of c.prerequisites ?? []) if (!existing.has(p) && !ids.has(p)) issues.push(`unknown prerequisite course ${p}`);
  const sourceIds = new Set((c.sources ?? []).map((s) => s.id));
  const moduleIds = new Set((c.modules ?? []).map((m) => m.id));
  const seen = new Set();
  for (const l of lessons) {
    const at = `lesson ${l.id}`;
    if (!moduleIds.has(l.moduleId)) issues.push(`${at}: unknown module ${l.moduleId}`);
    for (const p of l.prerequisiteLessonIds ?? []) if (!seen.has(p)) issues.push(`${at}: prerequisite ${p} is not an earlier lesson`);
    for (const key of ["objective", "concepts", "misconceptions", "sequence", "examples", "figures", "questionPlan"])
      if (!l[key] || (Array.isArray(l[key]) && l[key].length === 0)) issues.push(`${at}: missing ${key}`);
    for (const f of l.figures ?? []) if (!FIGURES.has(f.type)) issues.push(`${at}: figure type ${f.type} is not available (put it in platformNeeds with an svg_figure fallback)`);
    for (const q of l.questionPlan ?? []) {
      if (!KINDS.has(q.kind)) issues.push(`${at}: question kind ${q.kind}`);
      if (q.answer === undefined || q.answer === "") issues.push(`${at}: a sample question has no answer`);
      if (q.kind === "choice" && !(q.choices ?? []).length) issues.push(`${at}: a choice question has no choices`);
    }
    for (const s of l.sourceIds ?? []) if (!sourceIds.has(s)) issues.push(`${at}: unknown source ${s}`);
    seen.add(l.id);
  }
  if (issues.length) {
    problems += issues.length;
    console.log(`${file}: ${issues.length} issue(s)`);
    for (const issue of issues.slice(0, 12)) console.log(`  ${issue}`);
  } else console.log(`${file}: ok (${lessons.length} lessons)`);
  courses.push(c);
}
console.log(`${courses.length} curricula, ${problems} issue(s)`);

const pageAt = process.argv.indexOf("--page");
if (pageAt > 0) {
  const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const family = { A: "Software and systems", B: "Making and engineering", C: "Maths and science", D: "Humanities and creative", E: "Life skills" };
  const groups = Object.entries(family).map(([key, name]) => {
    const list = courses.filter((c) => (c.family ?? "").startsWith(key));
    if (!list.length) return "";
    return `<h2>${name}</h2>${list
      .map(
        (c) => `<details class="course"><summary><strong>${esc(c.title)}</strong> <span>${c.lessons.length} lessons · voice ${esc(c.voice)}</span></summary>
<p>${esc(c.description)}</p><p class="muted">${esc(c.audience)}${c.prerequisites?.length ? ` Prerequisites: ${esc(c.prerequisites.join(", "))}.` : ""}</p>
<h4>Outcomes</h4><ul>${c.outcomes.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
${c.modules.map((m) => `<h4>${esc(m.title)}</h4><ol>${c.lessons.filter((l) => l.moduleId === m.id).map((l) => `<li><strong>${esc(l.title)}</strong>. ${esc(l.objective)}<div class="small">Figures: ${l.figures.map((f) => `${esc(f.type)} (${esc(f.shows)})`).join("; ")}</div></li>`).join("")}</ol>`).join("")}
<h4>Sources</h4><ul>${c.sources.map((s) => `<li>${esc(s.title)}: ${esc(s.licence)}, ${esc(s.use)}${s.verified ? "" : " (not verified)"}</li>`).join("")}</ul>
${c.platformNeeds?.length ? `<h4>Platform needs</h4><ul>${c.platformNeeds.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
${c.unverified?.length ? `<h4>To verify</h4><ul>${c.unverified.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
</details>`,
      )
      .join("")}`;
  });
  const total = courses.reduce((n, c) => n + c.lessons.length, 0);
  writeFileSync(
    process.argv[pageAt + 1],
    `<title>Discere Expansion Curricula</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@500;650;750&family=Literata:opsz,wght@7..72,400&display=swap">
<style>
/* Layout: one column, a collapsible card per course grouped by family. */
:root{--bg:#f6f7f4;--surface:#fff;--fg:#1c211d;--muted:#5d665f;--line:#dde2dc;--accent:#157a43;--ui:"Figtree",system-ui,sans-serif;--read:"Literata",Georgia,serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121513;--surface:#1a1e1b;--fg:#e8ece8;--muted:#9aa49c;--line:#2c332e;--accent:#4fc27f;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#121513;--surface:#1a1e1b;--fg:#e8ece8;--muted:#9aa49c;--line:#2c332e;--accent:#4fc27f;color-scheme:dark}
*{box-sizing:border-box}body{background:var(--bg);color:var(--fg);font-family:var(--ui);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:28px 64px}
.wrap{max-width:52rem;margin:0 auto}h1{margin:0 0 6px}h2{margin:28px 0 10px;color:var(--accent)}
.course{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 16px;margin:10px 0}
summary{cursor:pointer;display:flex;gap:10px;flex-wrap:wrap;align-items:baseline}summary span{color:var(--muted);font-size:.9rem}
.course p,.course li{font-family:var(--read);line-height:1.55}.muted{color:var(--muted)}.small{font-family:var(--ui);font-size:.85rem;color:var(--muted);margin-top:2px}
h4{margin:14px 0 4px}ol,ul{padding-left:1.3em}li{margin:4px 0}
</style>
<div class="wrap"><h1>Expansion curricula</h1><p class="muted">${courses.length} new courses, ${total} lessons, researched for the writers. Open a course to see its outcomes, every lesson with its objective and figures, its sources and anything still to verify.</p>${groups.join("")}</div>`,
  );
  console.log(`Wrote ${process.argv[pageAt + 1]}`);
}
process.exit(problems ? 1 : 0);
