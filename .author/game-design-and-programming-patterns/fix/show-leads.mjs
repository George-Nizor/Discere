import { bundle } from "./lib.mjs";
const lessonId = process.argv[2];
for (const l of bundle.lessons.filter((x) => !lessonId || x.id === lessonId)) {
  console.log(`\n=== ${l.id}`);
  for (const s of l.steps) {
    if (!s.checkQuestionId) continue;
    const q = bundle.questions.find((x) => x.id === s.checkQuestionId);
    console.log(`\n[${s.kind} ${s.id}] ${q.id} (${q.choices ? "choice" : q.responseType})`);
    console.log("LEAD:", (s.lead ?? []).map((b) => b.text).join(" | "));
    console.log("REVEAL:", (s.reveal ?? []).map((b) => b.text).join(" | "));
    console.log("PROMPT:", q.prompt);
    console.log("HINTS:", q.hints.join(" || "));
    console.log("ONCORRECT:", q.onCorrect);
  }
}
