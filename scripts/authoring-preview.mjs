#!/usr/bin/env node
/**
 * Renders a lesson authored from the curriculum (see docs/authoring/README.md)
 * as a playable preview page: screens in order, questions that answer back, and the author's
 * plan folded at the top.
 *
 *   node scripts/authoring-preview.mjs <lesson.json> <out.html> [label]
 */
import { readFileSync, writeFileSync } from "node:fs";

const [input, out, label = ""] = process.argv.slice(2);
const lesson = JSON.parse(readFileSync(input, "utf8"));
const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rich = (t) =>
  esc(t)
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '<span class="term" tabindex="0">$1<span class="tip" role="tooltip">$2</span></span>')
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<![\w*])\*(?=\S)([^*\n]+?)(?<=\S)\*(?![\w*])/g, "<em>$1</em>")
    .replace(/\$([^$\n]+)\$/g, '<span class="math">$1</span>');
const paras = (list) => (list ?? []).map((p) => `<p>${rich(p)}</p>`).join("");
/** Preview sketches only: no scripts, handlers or external references. */
const safeSvg = (svg) =>
  /^\s*<svg[\s>]/i.test(svg ?? "") && !/<script|on\w+\s*=|href\s*=\s*["']?(?!#)|<foreignObject/i.test(svg)
    ? svg
    : "";

let qn = 0;
function question(q) {
  if (!q) return "";
  const id = `q${++qn}`;
  const replies = JSON.stringify({ right: q.onRight ?? "", wrong: q.onWrong ?? [], answer: String(q.answer ?? "") });
  let control = "";
  if (q.type === "choice")
    control = `<div class="choices">${(q.choices ?? []).map((c) => `<button type="button" class="choice" data-value="${esc(c)}">${rich(c)}</button>`).join("")}</div>`;
  else if (q.type === "number")
    control = `<form class="num"><label for="${id}-in" class="sr">Your answer</label><input id="${id}-in" inputmode="decimal" autocomplete="off"><button type="submit">Check</button></form>`;
  else control = `<button type="button" class="reveal-btn">Reveal</button>`;
  return `<div class="question" id="${id}" data-type="${esc(q.type)}" data-replies="${esc(replies)}"><p class="prompt">${rich(q.prompt)}</p>${control}<div class="reply" aria-live="polite" hidden></div></div>`;
}

const screens = (lesson.screens ?? [])
  .map((s, i) => {
    const fig = s.figure
      ? `<figure class="fig">${safeSvg(s.figure.svg) ? `<div class="svg">${safeSvg(s.figure.svg)}</div>` : ""}<figcaption><span>${esc(s.figure.type)}</span> ${rich(s.figure.description)}</figcaption></figure>`
      : "";
    const lines = s.workedLines?.length
      ? `<ol class="lines">${s.workedLines.map((l) => `<li>${rich(l.text)}${l.math ? ` <span class="math">${esc(l.math)}</span>` : ""}</li>`).join("")}</ol>`
      : "";
    return `<section class="screen"><p class="kind">${i + 1}. ${esc(s.kind)}</p>${s.heading ? `<h2>${rich(s.heading)}</h2>` : ""}<div class="prose">${paras(s.paragraphs)}${fig}${lines}${question(s.question)}${s.after?.length ? `<div class="after">${paras(s.after)}</div>` : ""}</div></section>`;
  })
  .join("");

const p = lesson.plan ?? {};
const list = (a) => (a?.length ? `<ul>${a.map((x) => `<li>${rich(x)}</li>`).join("")}</ul>` : "");
const plan = `<details class="plan"><summary>The author's plan</summary><div class="prose small"><p><strong>Goal.</strong> ${rich(p.goal)}</p><p><strong>Starting point.</strong> ${rich(p.startingPoint)}</p><p><strong>Misconceptions.</strong></p>${list(p.misconceptions)}<p><strong>Sequence.</strong></p>${list(p.sequence)}${p.notes ? `<p><strong>Notes.</strong> ${rich(p.notes)}</p>` : ""}</div></details>`;
const recap = lesson.recap
  ? `<section class="screen"><p class="kind">Close</p><h2>${rich(lesson.recap.keyIdea)}</h2><div class="prose">${paras(lesson.recap.paragraphs)}</div></section>`
  : "";

const html = `<title>${esc(lesson.lesson)} ${esc(label)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=Figtree:wght@500;650;750&display=swap">
<style>
/* Layout: the lesson as one reading column, each screen a quiet panel in play order. */
:root { --bg:#f6f7f4; --surface:#fff; --fg:#1c211d; --muted:#5d665f; --line:#dde2dc; --accent:#157a43; --soft:#e3f2e8; --warn:#9a5b00; --read:"Literata",Georgia,serif; --ui:"Figtree",system-ui,sans-serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#121513; --surface:#1a1e1b; --fg:#e8ece8; --muted:#9aa49c; --line:#2c332e; --accent:#4fc27f; --soft:#1c2f23; --warn:#e2a54a; color-scheme:dark; } }
:root[data-theme="dark"] { --bg:#121513; --surface:#1a1e1b; --fg:#e8ece8; --muted:#9aa49c; --line:#2c332e; --accent:#4fc27f; --soft:#1c2f23; --warn:#e2a54a; color-scheme:dark; }
* { box-sizing:border-box; }
body { background:var(--bg); color:var(--fg); font-family:var(--ui); padding-left:max(16px,env(safe-area-inset-left,0px)); padding-right:max(16px,env(safe-area-inset-right,0px)); padding-block:28px 64px; }
.wrap { max-width:44rem; margin:0 auto; display:grid; gap:18px; }
h1 { font-size:1.8rem; margin:0; text-wrap:balance; }
.intro p { color:var(--muted); line-height:1.55; margin:8px 0 0; }
.screen { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:18px 20px; min-width:0; }
.kind { font:650 0.8rem var(--ui); color:var(--muted); margin:0 0 6px; text-transform:capitalize; }
.screen h2 { font:650 1.3rem/1.35 var(--ui); margin:0 0 10px; text-wrap:balance; }
.prose { font-family:var(--read); font-size:1.12rem; line-height:1.7; overflow-wrap:anywhere; }
.prose p { margin:0 0 0.85em; } .prose > :last-child { margin-bottom:0; }
.small { font-size:1rem; }
.math { font-family:"Cambria Math","STIX Two Math",var(--read); white-space:nowrap; }
.fig { margin:14px 0; padding:12px; border-radius:12px; background:var(--soft); }
.fig .svg svg { display:block; max-width:100%; height:auto; margin:0 auto 8px; color:var(--fg); }
.fig figcaption { font:500 0.9rem/1.45 var(--ui); color:var(--muted); }
.fig figcaption span { font-weight:650; color:var(--accent); margin-right:4px; }
.lines { padding-left:1.3em; }
.question { margin:14px 0 4px; padding:14px 16px; border-radius:12px; border:1px solid var(--line); }
.prompt { font-weight:600; }
.choices { display:grid; gap:8px; }
.choice, .num button, .reveal-btn { font:600 0.98rem var(--ui); color:var(--fg); background:var(--bg); border:1px solid var(--line); border-radius:10px; padding:10px 14px; text-align:left; cursor:pointer; }
.choice[aria-pressed="true"] { border-color:var(--accent); }
.choice:focus-visible, .num button:focus-visible, .reveal-btn:focus-visible, .num input:focus-visible { outline:3px solid var(--accent); outline-offset:2px; }
.num { display:flex; gap:8px; flex-wrap:wrap; }
.num input { font:500 1rem var(--ui); padding:10px 12px; border:1px solid var(--line); border-radius:10px; background:var(--bg); color:var(--fg); width:9rem; }
.reply { margin-top:10px; padding:10px 14px; border-radius:10px; background:var(--soft); font-size:1.02rem; }
.reply.wrong { background:transparent; border-left:3px solid var(--warn); }
.after { margin-top:12px; }
.plan summary { cursor:pointer; font:650 0.95rem var(--ui); color:var(--accent); }
.plan { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:14px 18px; }
.term { text-decoration:underline dotted var(--accent); text-decoration-thickness:2px; text-underline-offset:4px; position:relative; cursor:help; }
.term .tip { display:none; position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%); width:max-content; max-width:min(17rem,78vw); background:var(--fg); color:var(--bg); font:500 0.86rem/1.45 var(--ui); padding:9px 12px; border-radius:10px; z-index:5; text-align:left; }
.term:hover .tip, .term:focus .tip { display:block; }
.term:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); }
</style>
<div class="wrap">
  <header class="intro"><h1>${esc(lesson.lesson)}</h1><p>${esc(label)} Written from the curriculum, not from the old lesson. Questions answer back: try them.</p></header>
  ${plan}
  ${screens}
  ${recap}
</div>
<script>
(function(){
  function norm(v){return String(v).trim().toLowerCase().replace(/\\s+/g,' ').replace(/−/g,'-');}
  function num(v){var n=parseFloat(String(v).replace(/−/g,'-').replace(/[^0-9.\\-\\/]/g,''));if(/^\\s*-?\\d+\\s*\\/\\s*\\d+\\s*$/.test(v)){var p=v.split('/');n=parseFloat(p[0])/parseFloat(p[1]);}return n;}
  function rich(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML.replace(/\\[\\[([^|\\]]+)\\|([^\\]]+)\\]\\]/g,'<span class="term" tabindex="0">$1<span class="tip" role="tooltip">$2</span></span>').replace(/\\*\\*([^*]+?)\\*\\*/g,'<strong>$1</strong>').replace(/(^|[^\\w*])\\*(?=\\S)([^*]+?)\\*(?![\\w*])/g,'$1<em>$2</em>');}
  document.querySelectorAll('.question').forEach(function(q){
    var r=JSON.parse(q.getAttribute('data-replies')),out=q.querySelector('.reply');
    function show(value,isRight){
      var text=isRight?r.right:'';
      if(!isRight){var m=r.wrong.find(function(w){return norm(w.when)===norm(value)||(!isNaN(num(w.when))&&num(w.when)===num(value));});text=m?m.reply:('The answer is '+r.answer+'.');}
      out.innerHTML=rich(text||'');out.className='reply'+(isRight?'':' wrong');out.hidden=false;
    }
    q.querySelectorAll('.choice').forEach(function(b){b.addEventListener('click',function(){q.querySelectorAll('.choice').forEach(function(x){x.setAttribute('aria-pressed','false');});b.setAttribute('aria-pressed','true');var v=b.getAttribute('data-value');show(v,norm(v)===norm(r.answer));});});
    var f=q.querySelector('form');if(f)f.addEventListener('submit',function(e){e.preventDefault();var v=f.querySelector('input').value;if(!v.trim())return;show(v,Math.abs(num(v)-num(r.answer))<1e-9);});
    var rb=q.querySelector('.reveal-btn');if(rb)rb.addEventListener('click',function(){out.innerHTML=rich('Answer: '+r.answer+(r.right?' '+r.right:''));out.className='reply';out.hidden=false;});
  });
})();
</script>
`;
writeFileSync(out, html);
console.log(`Wrote ${out}`);
