#!/usr/bin/env node
/**
 * Builds a read-through page for a rewritten course: each lesson screen by screen in the new
 * voice, with the previous text collapsed underneath.
 *
 *   node scripts/voice-review-page.mjs <course-id> <out.html>
 *
 * The previous text comes from the bundle at git HEAD.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const [course, out, subtitle = "Every lesson in this course, screen by screen as the learner meets it. Open \"Previous text\" under a screen to compare it with what the app says now; a screen that is new has none."] = process.argv.slice(2);
const now = JSON.parse(readFileSync(path.join(ROOT, "content", course, "bundle.json"), "utf8"));
const before = JSON.parse(
  execSync(`git show HEAD:content/${course}/bundle.json`, { cwd: ROOT, maxBuffer: 1e8 }).toString(),
);

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rich = (t) =>
  esc(t)
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '<span class="term" tabindex="0">$1<span class="tip" role="tooltip">$2</span></span>')
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<![\w*])\*(?=\S)([^*\n]+?)(?<=\S)\*(?![\w*])/g, "<em>$1</em>")
    .replace(/\$([^$\n]+)\$/g, '<span class="math">$1</span>');
const blocks = (list) =>
  (list ?? [])
    .map((b) =>
      b.kind === "equation"
        ? `<p class="eq">${esc(b.latex)}</p>`
        : `<p>${b.term ? `<strong>${esc(b.term)}</strong> ` : ""}${rich(b.text)}</p>`,
    )
    .join("");
const old = (html) =>
  html ? `<details class="old"><summary>Previous text</summary><div class="prose">${html}</div></details>` : "";
const KIND = {
  explain: "Teaching",
  try: "Question",
  predict: "Prediction",
  transfer: "Applying it",
  worked_example: "Worked example",
  faded_example: "Your turn, with help",
  explore: "Explore",
};
const qById = (bundle, id) => bundle.questions.find((q) => q.id === id);

function questionHtml(q) {
  if (!q) return "";
  const choices = q.choices?.length
    ? `<ul class="choices">${q.choices.map((c) => `<li>${rich(c.label)}</li>`).join("")}</ul>`
    : "";
  const fb = [
    q.onCorrect ? `<p class="fb"><span>After a right answer:</span> ${rich(q.onCorrect)}</p>` : "",
    ...(q.misconceptions ?? []).map(
      (m) => `<p class="fb"><span>After a wrong answer:</span> ${rich(m.feedback)}</p>`,
    ),
  ].join("");
  return `<div class="question"><p class="q">${rich(q.prompt)}</p>${choices}${fb}</div>`;
}
function oldQuestion(q) {
  if (!q) return "";
  return [q.onCorrect ? `<p>${rich(q.onCorrect)}</p>` : "", ...(q.misconceptions ?? []).map((m) => `<p>${rich(m.feedback)}</p>`)].join("");
}

const tabs = [];
const panels = [];
if (now.course.introduction) {
  tabs.push(["about", "About this course"]);
  panels.push(`<section class="panel" id="about" role="tabpanel"><div class="screen"><h2 class="kind">About this course</h2><div class="prose">${now.course.introduction.paragraphs.map((p) => `<p>${rich(p)}</p>`).join("")}<ul>${now.course.introduction.outcomes.map((o) => `<li>${rich(o)}</li>`).join("")}</ul></div>${old(before.course.introduction.paragraphs.map((p) => `<p>${rich(p)}</p>`).join(""))}</div></section>`);
}
now.lessons.forEach((lesson, i) => {
  const was = before.lessons.find((l) => l.id === lesson.id) ?? { steps: [] };
  const id = `l${i + 1}`;
  tabs.push([id, `${i + 1}. ${lesson.title}`]);
  const screens = [];
  if (lesson.intro) {
    screens.push(`<div class="screen"><h2 class="kind">Opener</h2><div class="prose">${blocks(lesson.intro.hook.blocks)}<p class="promise">${rich(lesson.intro.promise)}</p></div>${was.intro ? old(blocks(was.intro.hook.blocks) + `<p class="promise">${rich(was.intro.promise)}</p>`) : ""}</div>`);
  }
  lesson.steps.forEach((step, s) => {
    const w = was.steps.find((x) => x.id === step.id);
    const lines = step.workedSteps?.length
      ? `<ol class="lines">${step.workedSteps.map((l) => `<li>${rich(l.text ?? "")}${l.math ? ` <span class="math">${esc(l.math)}</span>` : ""}</li>`).join("")}</ol>`
      : "";
    const q = step.checkQuestionId ? qById(now, step.checkQuestionId) : null;
    const wq = step.checkQuestionId ? qById(before, step.checkQuestionId) : null;
    const body =
      (step.headline ? `<h3 class="headline">${rich(step.headline)}</h3>` : "") +
      blocks(step.lead) +
      (step.diagram || step.visualStateId ? '<p class="figure">[Figure]</p>' : "") +
      blocks(step.afterFigure) +
      lines +
      questionHtml(q) +
      (step.reveal?.length ? `<div class="reveal"><span>Shown after answering:</span>${blocks(step.reveal)}</div>` : "");
    const oldBody = !w ? "" :
      (w.headline ? `<h3 class="headline">${rich(w.headline)}</h3>` : "") +
      blocks(w.lead) + blocks(w.afterFigure) + oldQuestion(wq) + blocks(w.reveal);
    screens.push(`<div class="screen"><h2 class="kind">${KIND[step.kind] ?? step.kind}</h2><div class="prose">${body}</div>${old(oldBody)}</div>`);
  });
  if (lesson.recap) {
    screens.push(`<div class="screen"><h2 class="kind">Recap</h2><div class="prose"><h3 class="headline">${rich(lesson.recap.keyIdea)}</h3>${blocks(lesson.recap.blocks)}${lesson.recap.nextHook ? `<p class="next">${rich(lesson.recap.nextHook)}</p>` : ""}</div>${!was.recap ? "" : old(`<h3 class="headline">${rich(was.recap.keyIdea)}</h3>${blocks(was.recap.blocks)}${was.recap.nextHook ? `<p>${rich(was.recap.nextHook)}</p>` : ""}`)}</div>`);
  }
  panels.push(`<section class="panel" id="${id}" role="tabpanel" hidden><h2 class="lesson-title">${esc(lesson.title)}</h2>${screens.join("")}</section>`);
});

const html = `<title>${esc(now.course.title)} Rewrite</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=Figtree:wght@500;650;750&display=swap">
<style>
/* Layout: one reading column; lesson tabs; each screen as it appears in the player, old text folded underneath. */
:root { --bg:#f6f7f4; --surface:#fff; --fg:#1c211d; --muted:#5d665f; --line:#dde2dc; --accent:#157a43; --soft:#e3f2e8;
  --read:"Literata",Georgia,serif; --ui:"Figtree",system-ui,sans-serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#121513; --surface:#1a1e1b; --fg:#e8ece8; --muted:#9aa49c; --line:#2c332e; --accent:#4fc27f; --soft:#1c2f23; color-scheme:dark; } }
:root[data-theme="dark"] { --bg:#121513; --surface:#1a1e1b; --fg:#e8ece8; --muted:#9aa49c; --line:#2c332e; --accent:#4fc27f; --soft:#1c2f23; color-scheme:dark; }
* { box-sizing:border-box; }
body { background:var(--bg); color:var(--fg); font-family:var(--ui); padding-left:max(16px,env(safe-area-inset-left,0px)); padding-right:max(16px,env(safe-area-inset-right,0px)); padding-block:28px 64px; }
.wrap { max-width:44rem; margin:0 auto; display:grid; gap:22px; }
h1 { font-size:1.8rem; margin:0; text-wrap:balance; }
.intro p { color:var(--muted); line-height:1.55; margin:8px 0 0; }
.tabs { display:flex; flex-wrap:wrap; gap:8px; }
.tabs button { font:650 0.9rem var(--ui); color:var(--fg); background:var(--surface); border:1px solid var(--line); border-radius:999px; padding:8px 14px; cursor:pointer; }
.tabs button[aria-selected="true"] { background:var(--accent); border-color:var(--accent); color:var(--bg); }
.tabs button:focus-visible { outline:3px solid var(--accent); outline-offset:2px; }
.panel { display:grid; gap:18px; }
.panel[hidden] { display:none !important; }
.lesson-title { font-size:1.4rem; margin:6px 0 0; }
.screen { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:18px 20px; display:grid; gap:10px; min-width:0; }
.kind { font:650 0.85rem var(--ui); color:var(--accent); margin:0; }
.prose { font-family:var(--read); font-size:1.1rem; line-height:1.68; min-width:0; overflow-wrap:anywhere; }
.prose p { margin:0 0 0.85em; } .prose > :last-child { margin-bottom:0; }
.headline { font:650 1.25rem/1.35 var(--ui); margin:0 0 0.6em; text-wrap:balance; }
.eq, .math { font-family:"Cambria Math","STIX Two Math",var(--read); }
.eq { text-align:center; }
.figure { color:var(--muted); font:500 0.9rem var(--ui); }
.promise, .next { color:var(--muted); }
.question { background:var(--soft); border-radius:12px; padding:12px 16px; margin-top:6px; }
.q { font-weight:600; }
.choices { margin:0 0 0.6em; padding-left:1.2em; }
.fb span, .reveal span { display:block; font:650 0.8rem var(--ui); color:var(--muted); }
.reveal { border-left:3px solid var(--accent); padding-left:12px; margin-top:8px; }
.lines { padding-left:1.3em; }
.term { text-decoration:underline dotted var(--accent); text-decoration-thickness:2px; text-underline-offset:4px; position:relative; cursor:help; }
.term .tip { display:none; position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%); width:max-content; max-width:min(17rem,78vw); background:var(--fg); color:var(--bg); font:500 0.86rem/1.45 var(--ui); padding:9px 12px; border-radius:10px; z-index:5; }
.term:hover .tip, .term:focus .tip { display:block; }
.old summary { cursor:pointer; font:600 0.88rem var(--ui); color:var(--muted); }
.old .prose { font-size:1rem; color:var(--muted); margin-top:8px; }
</style>
<div class="wrap">
  <header class="intro">
    <h1>${esc(now.course.title)}: the rewrite</h1>
    <p>${esc(subtitle)}</p>
  </header>
  <nav class="tabs" role="tablist" aria-label="Lessons">${tabs.map(([id, t], n) => `<button role="tab" id="tab-${id}" aria-controls="${id}" aria-selected="${n === 0}">${esc(t)}</button>`).join("")}</nav>
  ${panels.join("\n")}
</div>
<script>
(function(){var tabs=[].slice.call(document.querySelectorAll('[role="tab"]'));
function show(id){tabs.forEach(function(t){var on=t.getAttribute('aria-controls')===id;t.setAttribute('aria-selected',on);document.getElementById(t.getAttribute('aria-controls')).hidden=!on;});}
tabs.forEach(function(t){t.addEventListener('click',function(){var id=t.getAttribute('aria-controls');show(id);history.replaceState(null,'','#'+id);});});
function fromHash(){var id=location.hash.slice(1);if(id&&tabs.some(function(t){return t.getAttribute('aria-controls')===id;}))show(id);}
window.addEventListener('hashchange',fromHash);show(tabs[0].getAttribute('aria-controls'));fromHash();})();
</script>
`;
writeFileSync(out, html);
console.log(`Wrote ${out}`);
