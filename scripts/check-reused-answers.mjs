#!/usr/bin/env node
/**
 * After a curriculum-first rewrite, lists every reused question id whose answer changed in a way
 * that affects marking: a numeric value, unit or tolerance, a text answer's accepted ideas or
 * alternatives, or the response type. Wording-only changes to prompts and feedback are ignored.
 *
 *   node scripts/check-reused-answers.mjs <course-id> [git-rev, default 34c750f, before the rewrites]
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const [course, rev = "34c750f"] = process.argv.slice(2);
if (!course) throw new Error("Usage: node scripts/check-reused-answers.mjs <course-id> [git-rev]");
const before = JSON.parse(
  execSync(`git show ${rev}:content/${course}/bundle.json`, { cwd: ROOT, maxBuffer: 1e8 }).toString(),
);
const now = JSON.parse(readFileSync(path.join(ROOT, "content", course, "bundle.json"), "utf8"));
const old = new Map(before.questions.map((q) => [q.id, q]));
const norm = (list) => [...(list ?? [])].map((s) => s.toLowerCase().replace(/[.\s]+$/u, "")).sort().join("|");
let flagged = 0;
for (const q of now.questions) {
  const was = old.get(q.id);
  if (!was) continue;
  const a = q.answerAuthority;
  const b = was.answerAuthority;
  const notes = [];
  if (q.responseType !== was.responseType) notes.push(`type ${was.responseType} -> ${q.responseType}`);
  if (a.kind !== b.kind) notes.push(`kind ${b.kind} -> ${a.kind}`);
  else if (a.kind === "numeric") {
    if (a.value !== b.value) notes.push(`value ${b.value} -> ${a.value}`);
    if ((a.unit ?? "") !== (b.unit ?? "")) notes.push(`unit "${b.unit ?? ""}" -> "${a.unit ?? ""}"`);
    if (a.absoluteTolerance !== b.absoluteTolerance || a.relativeTolerance !== b.relativeTolerance)
      notes.push("tolerance changed");
  } else if (a.kind === "text" && !q.choices?.length) {
    // A typed answer: accepted wording matters. A choice question matches by label, so it does not.
    if (norm(a.acceptedIdeas) !== norm(b.acceptedIdeas)) notes.push(`accepted ${norm(b.acceptedIdeas)} -> ${norm(a.acceptedIdeas)}`);
    if (norm(a.acceptedAlternatives) !== norm(b.acceptedAlternatives)) notes.push("alternatives changed");
  }
  if (notes.length) {
    flagged += 1;
    console.log(`${q.id}: ${notes.join("; ")}`);
  }
}
console.log(`${course}: ${flagged} reused question(s) with a marking change`);
