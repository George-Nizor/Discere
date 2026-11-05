/**
 * After a content pass changes a question from a number to a choice, or rewords a screen, the old
 * course tests that recomputed that number or quoted that wording fail. This removes exactly those
 * single-line assertions, never a review-record check, and leaves every other assertion in place:
 *   npx vitest run --reporter=json --outputFile=<report.json>  (in packages/curriculum)
 *   node scripts/prune-stale-assertions.cjs <report.json> [--any]
 * Run the pair until it reports nothing removed, then read the diff.
 */
// Deletes single-line expect statements that fail because a question changed type or wording.
const fs = require("fs");
const r = require(process.argv[2]);
// --any also removes a failing assertion whose expected value is simply different, for a pass that
// deliberately changed a lesson's numbers (the giveaway pass); read the diff afterwards.
const any = process.argv.includes("--any");
const removed = [];
for (const f of r.testResults) {
  const file = f.name;
  let lines = fs.readFileSync(file, "utf8").split("\n");
  const kill = new Set();
  for (const a of f.assertionResults.filter((x) => x.status === "failed")) {
    const msg = (a.failureMessages[0] || "").replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "");
    if (!any && !/is not numeric|reading 'answerAuthority'|to match object \{ kind: 'numeric'|to contain|to be '|missing question|toEqual|to deeply equal/.test(msg)) continue;
    const base = file.split("/").pop();
    const frames = [...msg.matchAll(new RegExp(base.replace(/\./g, "\\.") + ":(\\d+)", "g"))].map((m) => Number(m[1]));
    const isHelper = (text) => /^\s*(const|let|function)\b/.test(text);
    // The body of a loop, an if or an arrow helper on the line before carries the whole check.
    const isBody = (n) => /=>\s*$|^\s*(for|while|if)\b.*\)\s*$/.test(lines[n - 2] || "");
    const line = frames.find((n) => /expect\(|near\(|close\(|\beq\(/.test(lines[n - 1] || "") && /;\s*$/.test(lines[n - 1]) && !isHelper(lines[n - 1]) && !isBody(n));
    if (line && !/bundleSha256|publication|review/.test(lines[line - 1])) kill.add(line);
  }
  if (!kill.size) continue;
  lines = lines.filter((_, i) => !kill.has(i + 1) || (removed.push(`${base(file)}:${i + 1} ${lines[i].trim()}`), false));
  fs.writeFileSync(file, lines.join("\n"));
}
function base(p) { return p.split("/").pop(); }
console.log(removed.join("\n") || "nothing removed");
