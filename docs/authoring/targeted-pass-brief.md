# Brief for a targeted question pass on a Discere course

Used for the 1.19.0 pass on 30 courses (see `docs/content-history.md`). Use it when a course's teaching and questions are sound and only multiple-choice option lengths, feedback and hints need fixing. These courses were written earlier, and their lessons have already been read through and corrected. Their numeric questions are fine. What's wrong is narrower: in many multiple-choice questions the right option gives itself away by being the longest, and some questions have fewer than two hints. You fix those things and leave the rest alone. This is not a rewrite.

## Working rules
- Work in the worktree named in your task. Other writers may be editing other courses in the same worktree at the same time. Edit ONLY `content/<your course>/bundle.json` for the courses in your task, plus a test file that asserts exact wording you changed (see Tests). Do not edit anything else.
- Do NOT commit, push, run `git stash`, `git checkout` or any other git command that changes files. Do not run `scripts/rebind-review.ts` or edit `docs/content-ledger.json`; the lead does both centrally afterwards.
- Do the work yourself. Do NOT spawn subagents. Be economical: read only the questions you need, not whole bundles at once.
- Scripts and scratch files go in your own folder for your course inside the scratch folder named in your task, never in a shared file: parallel writers have overwritten each other's shared scripts.
- Edit bundles with a Node script (load JSON, change the questions by id, write back with `JSON.stringify(bundle, null, 2) + "\n"`). Python changes number formatting, so don't use it for writing bundles.

## The checker
`node scripts/question-check.mjs <course-id>`, run from the repository root, lists each failing question. Run it first and last. Your course is done when it prints PASS and `wrongOptionsWithoutFeedback=0`.

The rules it checks, for multiple-choice questions (three or more `choices`):
- The right option (the choice whose `label` is in `answerAuthority.acceptedIdeas`) is strictly the longest in at most 30% of the course's multiple-choice questions. **Aim for 12 to 18%.** Never aim for 0%: a right option that is never the longest is a tell too, because learners learn to rule out the longest one.
- It is never more than 15% longer than every other option (`far` must be 0).
- It is strictly the shortest in at most 40%.
- All options of one question either end with a full stop or none do.
- Exactly one option is right.
- Every question in the course, of every type, has at least two hints.
- Every wrong option has a `misconceptions` entry whose `match.choiceIds` names it, with feedback.

## How to fix a question
- **A give-away right option:** make the wrong options as specific and as long as the right one. Each one should state a real mistake people make in the subject, with its reason ("It is larger than 0.6, because the shorter leg has grown."). Don't pad with filler words. Where the right option carries a needless clause, you can trim it instead. If you change the right label, change `acceptedIdeas` (and `exampleAnswer` if it repeats the label) to the identical new text.
- **Keep choice ids,** and keep the right answer's position varied.
- **Feedback:** every wrong option gets feedback that names its mistake and says what is right instead. Update existing feedback if you changed the option it answers.
- **Hints:** two or more per question. Hints guide thinking (which quantity, which rule, what to compare). They never give the answer, its first letter or a bare sum. Where a question has one hint, add a second that comes after it in the reasoning.
- **Don't change:** question ids, prompts (except for a clear error), numeric answers, tolerances, code questions' tests, lesson teaching screens, lesson structure.
- **Facts:** a new wrong option must be wrong for a reason, and that reason must be true. Check it against the lesson's own teaching or the course's `sources`. If you notice a factual error in the course, fix it only if you are certain, and report it.

## Voice
Load the `discere-lesson-voice` skill with the Skill tool before writing, and follow it. Plain sentences, contractions and "you" are fine, no em or en dashes, no slogans, no "not X but Y" turns, no verdict words such as "Correct" or "Not quite". Dashes inside a quoted source extract stay as they are.

## Tests
- Find the tests that mention your course: `grep -rl "<course-id>\|<question id prefix>" packages/curriculum/tests apps/server/tests apps/web/src apps/web/e2e`. If one asserts the exact text of an option or label you changed, update that assertion to the new text so it protects the same thing. Mention each one in your report.
- Run `cd packages/curriculum && pnpm exec vitest run <the curriculum test files for your course>`, plus `pnpm exec vitest run tests/option-lengths.test.ts tests/marking-against-content.test.ts`. Run a server test in `apps/server` only if you changed text it asserts (each takes about two minutes).
- Run `pnpm validate:content 2>&1 | grep -i "error" | grep -i "<course-id>"`; there should be no output.
- Do not run the full test suite.

## Report briefly (under 200 words per course)
Checker line before and after; how many questions you changed; one changed question before and after; tests you updated; anything you were unsure of or any factual error you found.
