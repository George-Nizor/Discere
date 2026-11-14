// Usage: node scripts/question-check.mjs <course-id> [...]  (run from the repository root)
// Reports the option-length and hint rules for each course and lists the questions that break them.
import { readFileSync } from "node:fs";
for (const id of process.argv.slice(2)) {
  const b = JSON.parse(readFileSync(`content/${id}/bundle.json`, "utf8"));
  const mc = b.questions.filter((q) => (q.choices?.length ?? 0) >= 3);
  const longest = [],
    far = [],
    shortest = [],
    mixedStop = [],
    wrongCount = [],
    noFeedback = [];
  for (const q of mc) {
    const acc = q.answerAuthority.acceptedIdeas ?? [];
    const right = q.choices.filter((c) => acc.includes(c.label));
    if (right.length !== 1) {
      wrongCount.push(q.id);
      continue;
    }
    const others = q.choices.filter((c) => c !== right[0]);
    const L = right[0].label.length,
      max = Math.max(...others.map((c) => c.label.length)),
      min = Math.min(...others.map((c) => c.label.length));
    if (L > max) longest.push(q.id);
    if (L > max * 1.15) far.push(q.id);
    if (L < min) shortest.push(q.id);
    if (new Set(q.choices.map((c) => c.label.trimEnd().endsWith("."))).size > 1)
      mixedStop.push(q.id);
    const covered = new Set((q.misconceptions ?? []).flatMap((m) => m.match?.choiceIds ?? []));
    if (others.some((c) => !covered.has(c.id))) noFeedback.push(q.id);
  }
  const fewHints = b.questions.filter((q) => (q.hints?.length ?? 0) < 2).map((q) => q.id);
  const dashes =
    JSON.stringify({ q: b.questions, l: b.lessons, f: b.flashcards }).match(/[–—]/g)?.length ?? 0;
  const pct = (n) => (mc.length ? Math.round((100 * n) / mc.length) : 0);
  const ok =
    longest.length <= Math.floor(mc.length * 0.3) &&
    far.length === 0 &&
    shortest.length <= Math.floor(mc.length * 0.4) &&
    mixedStop.length === 0 &&
    wrongCount.length === 0 &&
    fewHints.length === 0;
  console.log(
    `${id}: ${ok ? "PASS" : "FAIL"}  mc=${mc.length} longest=${longest.length} (${pct(longest.length)}%, max ${Math.floor(mc.length * 0.3)}) far=${far.length} shortest=${shortest.length} (max ${Math.floor(mc.length * 0.4)}) mixedStop=${mixedStop.length} notOneRight=${wrongCount.length} fewerThan2Hints=${fewHints.length} wrongOptionsWithoutFeedback=${noFeedback.length} dashesInQuestionsLessonsCards=${dashes}`,
  );
  {
    for (const [name, list] of Object.entries({
      far,
      longest,
      shortest,
      mixedStop,
      wrongCount,
      fewHints,
      noFeedback,
    }))
      if (list.length) console.log(`  ${name}: ${list.join(" ")}`);
  }
}
