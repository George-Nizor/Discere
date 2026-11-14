# Brief for rewriting one Discere course's questions

Used for the full question rewrite of 36 courses between 11 and 14 November 2026 (see
`docs/content-history.md`). Before using it on a course, check `docs/content-ledger.json`: a course
that already had this rewrite needs a stated, measured reason to have it again.

You rewrite the questions of one course. Your task message names the course, the worktree and branch, and gives notes specific to the subject. Everything below applies to every course.

## Working rules
- Work only in the worktree and branch named in your task. Do not push. Do the work yourself: do NOT spawn subagents.
- Be economical: read what you need, avoid re-reading large files.
- If `node_modules` is missing, run `pnpm install --offline --frozen-lockfile` first.
- Scripts, scratch files and fetched pages go in the scratchpad folder named in your task, never in the repo.

## Read first
1. `docs/question-writing-guide.md` (written for humanities; its principles carry over to every subject).
2. The approved voice: load the `discere-lesson-voice` skill with the Skill tool and follow it. Plain sentences, no em or en dashes, no slogans, no "not X but Y" turns, no verdict words such as "Correct" or "Not quite".
3. The finished example(s) named in your task, and their tests.

## What to change
- Questions should fit what the subject is for: situations to judge, material to work from (output, a table, a passage, a design, a scenario), a decision to make. Keep numeric questions only where computing the number is the skill or carries a decision. Replace arithmetic for its own sake and one-word recall of a term where the idea is a judgement.
- Facts come from the course's own `sources` or pages you fetch. Never rely on memory for a definition, figure, standard or behaviour. Where you show output, code, config or a calculation, produce it by actually running it (git, sqlite, Python, a YAML parser) or check it against a fetched official page. Compute every number with a script and keep the script.
- Use order and sort questions where they are clearly better (look at the finished examples for the JSON shape). About 8 to 12 across the course.
- Multiple-choice distractors come from real mistakes people make in the subject. Every wrong option has feedback that names its mistake and what is right instead.
- Option lengths: across the course the right option may be strictly the longest in no more than 30% of multiple-choice questions with three or more options, never more than 15% longer than every other option, and strictly the shortest in no more than 40%. Aim for the right option being longest in 12 to 18% of questions: 0% is a tell too. All options of one question in the same form (all with or all without a final full stop). Right answers in varied positions.
- Every lesson's end check mixes at least two question types. Every question has at least two hints; hints guide thinking and never give the first letter or a bare sum.
- Keep teaching screens and lesson structure. Change questions, their hints and feedback, the step `reveal` text that follows a changed question, and flashcards that drilled replaced filler. Keep ids where a question is revised in place; new ids for replaced ones; update every reference (steps, end checks, `flashcardIds`, `courseChecks`, `authoringMetadata`). No orphans and no unreferenced questions: delete questions no lesson asks. Inline questions in `courseChecks` that are filler get rewritten too.
- If you find a factual error in a lesson, verify it (run it, or check a fetched page), fix it minimally and list it in your report. Be certain before changing teaching text.
- If the course has `content/<course>/review/publication.json`, rebind it with `scripts/rebind-review.ts` after your edits. Keep bundle JSON formatting (2-space, same key order).

## Tests
- Add `packages/curriculum/tests/<short-name>-questions.test.ts` modelled on the example test named in your task. It enforces your course's rules: no unreferenced questions, mixed end checks, the numeric cap, option-length rules above, feedback on every wrong option, two hints, no dashes, and recomputation of every numeric answer and quoted figure where possible.
- Existing tests for the course must keep passing; update ones that assert on replaced questions to protect the same thing on the new content. Delete assertions that no longer protect anything rather than leaving tautologies.
- `packages/curriculum/tests/option-lengths.test.ts` checks every course already; do not edit it or `packages/curriculum/tests/marking-against-content.test.ts`. Check your course with `node scripts/question-check.mjs <course-id>`.

## Checks before you commit
- `pnpm validate:content`
- `cd packages/curriculum && pnpm test`
- `cd packages/curriculum && pnpm exec tsc --noEmit -p .` — narrow `answerAuthority.kind === "text"` (or `"numeric"`) before reading kind-specific fields; two earlier courses failed CI on exactly this.
- `pnpm biome check <your new test file>`
- the voice check as the guide describes
- `node scripts/content-lint-report.mjs --out <scratch file>` before and after, comparing this course's row
- Do NOT run the full `pnpm check`; CI runs it.

Record the pass for your course in `docs/content-ledger.json` and run `node scripts/library-report.mjs`. Commit with a plain-sentence message ending with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Report briefly
Counts by type before and after; revised, replaced, kept; three questions in full before and after; how you checked facts and numbers; lint and voice before and after; every change to lesson text with its reason; anything unsure; commit hash and test results.
