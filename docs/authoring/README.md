# Writing and changing courses

How course content is written and changed now. Before any of it, read
`docs/content-history.md` and look the course up in `docs/content-ledger.json` and
`docs/library.md`: every course has already been through several passes, and new work needs a
measured reason.

Learner-facing prose follows the `discere-lesson-voice` skill in `.claude/skills/`, and the
tutor follows `discere-tutor-voice` (approved dialogues in `tutor-voice-examples.html`). Question
craft is in `docs/question-writing-guide.md`.

`content/<course>/bundle.json` is the only source of a course. Edit it directly, with a Node
script that writes `JSON.stringify(bundle, null, 2) + "\n"` so the formatting stays the same.
Nothing regenerates a bundle from other files.

## A new course

Used for How the Body Works and The Roman Republic.

1. **Source pack.** A cheap agent fetches the sources the course will rest on into a scratch
   folder: open textbooks, Wikipedia, public-domain primary texts, official guidance. No OpenStax
   text without OpenStax's written permission (see `open-sources.md`).
   It writes `passages.md`, listing each passage with its licence and whether it may be quoted
   word for word or only paraphrased.
2. **Plan.** An agent writes the curriculum (`docs/curricula/<id>.json`, checked by
   `node scripts/check-curricula.mjs`) and `plan-notes.md`: what each lesson asks the learner to
   do, every number and claim with where it is stated, and figures not to use. The lead reads and
   approves it.
3. **Scaffold.** `node scripts/scaffold-course.mjs <id>` turns the curriculum into a bundle of
   lesson stubs. The course needs a hand-drawn `content/<id>/assets/cover.svg` and `subjects` on
   its course record, or it shows no subject in the library.
4. **Lessons.** Three writers take a third of the lessons each, following
   `new-course-lesson-brief.md`. For each lesson, `node scripts/author-lesson.mjs brief <id>
   <lesson>` writes the input, the writer writes `.author/<id>/<lesson>/output.json`, and
   `node scripts/author-lesson.mjs apply <id> <lesson>` validates and merges it. The format is
   learnt from `example-lesson.json`.
5. **Integration and checks.** One agent applies the lessons, adds a content test, and runs
   `python3 scripts/copy-check.py content/<id>/bundle.json <pack-text-folder>`, which finds runs
   of eight words copied from the sources outside quoted extracts. Copied runs are rewritten
   until there are none.
6. **Record it.** Add the course to `docs/content-ledger.json` and run
   `node scripts/library-report.mjs`.

## Rewriting a course's questions

`question-rewrite-brief.md`, one writer per course, on its own branch. Used for 36 courses in
November 2026. It replaces bare recall and arithmetic-for-its-own-sake with material to work from
and judgements, adds order and sort questions and quoted sources, and gives every wrong option a
misconception and feedback. Teaching screens stay as they are.

## A targeted question pass

`targeted-pass-brief.md`, for a course whose teaching and questions are sound but whose multiple
choice gives the answer away by length, or whose wrong options lack feedback, or whose questions
lack hints. Several writers can share one worktree if each edits only its own courses and keeps
its scripts in its own folder.

## Checks for any content change

- `node scripts/question-check.mjs <course-id>`: option lengths, one right option, full stops,
  two hints, feedback on every wrong option. A course is done when it prints PASS.
- `pnpm validate:content`, and the curriculum tests: `cd packages/curriculum && pnpm test`.
- `npx tsx scripts/voice-check.ts <course-id>` for the voice.
- `node scripts/content-lint-report.mjs --out <file>` for the wider lint list.
- A course with `content/<course>/review/publication.json` binds that record to the bundle's
  hash: run `npx tsx scripts/rebind-review.ts <course-id> "<what changed and what was checked>"`
  after an edit.
- `node scripts/library-report.mjs --check` fails when `docs/library.md` or the ledger is out of
  date.
