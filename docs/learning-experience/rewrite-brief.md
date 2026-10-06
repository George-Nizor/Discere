# Lesson rewrite brief (for the per-course writing agents)

You are converting one Discere course's legacy lessons to the v2 lesson format. Work in
`/workspace/dev_projects_master/_PersonalProjects/Instrumenta/Discere`.

## Read first, once

1. `docs/learning-experience/style-guide.md`: the rules, the step kinds, and the checklist. It is
   the authority.
2. The finished example: Maths Foundations lesson 1, `what-a-letter-stands-for`, in
   `content/maths-foundations/bundle.json` (lesson and its questions), and its content test
   `packages/curriculum/tests/maths-gold-lesson.test.ts`.

Do not read the 1,100-line spec (`docs/learning-experience/README.md`) unless the guide sends you to
a specific section. Do not read other courses.

## Per lesson

1. `pnpm tsx scripts/lesson-migration/scaffold.ts <course> <lesson>` writes
   `content/<course>/.authoring/migration/<lesson>.json`. Read its `migrationNotes`.
2. Write every `TODO:` field. Keep the subject matter, facts and difficulty of the original; you are
   restructuring and rewriting, not changing the syllabus. Keep existing question ids (learner
   history points at them). New questions get new ids in the course's existing id style.
3. Recompute every numeric key yourself. If an original key is wrong, fix it and say so in your
   report.
4. Fill `citations` in the draft. It is seeded with the lesson's legacy citations, which point at
   old step ids. Retarget them so that every step, every question (the hook's included) and every
   flashcard has at least one. Reuse the same `sourceId` and `section` values, and make each
   `claim` state what that screen asserts. `--apply` skips a draft with an uncited target.
5. `pnpm tsx scripts/lesson-migration/scaffold.ts <course> --apply` and clear every error for your
   lessons. Warnings: fix, or list them with a reason in your report.
6. Next lesson. Do them in course order so each `nextHook` and `ITEM_OUTSIDE_SCOPE` line up.

After the last lesson, add one content test, `packages/curriculum/tests/<course>-v2.test.ts`, that
recomputes the numeric keys you wrote (pattern: the gold lesson test), and run it.

## Rules that matter most

- The hook is a puzzle the learner can attempt from what they already know. Never a definition.
- A `lead` teaches what the question needs and never contains the answer.
- `explain` comes before any question that uses its term.
- `onCorrect` states the idea, not "Correct!". Misconceptions never state the key.
- Exactly 3 skill-check items, at least one `transfer`, 5 to 7 steps.
- British spelling, short sentences, "you". No hype. Unicode − × ÷ in prose, including equation
  lines in a lead (write 10 − 6, never 10 - 6).

## Do not

- Do not run `scripts/prepare-*.ts` (they regenerate the course from its old authoring source and
  would erase the migration), `pnpm curate review` or `pnpm curate publish`. The lead reviews and
  publishes.
- Do not edit anything outside `content/<course>/.authoring/migration/` and your one test file.
  If the validator or the player seems wrong, stop and report it rather than changing code.
- Do not start servers or browsers.

## Report (your final message, under 300 words)

Lessons converted; validator state (errors 0, warnings with reasons); keys you corrected; anything
in the original you think is factually wrong; anything in the guide or the tooling that got in your
way.
