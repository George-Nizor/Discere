# Next wave of review work

A handoff for the session that continues the November 2026 review. First written on
10 November 2026 and brought up to date on 11 November. Read
`docs/holistic-review-2026-11.md` for the findings, `docs/atlas-comparison-2026-11.md` for the
improvements taken from Atlas Open Academy, and `docs/testing/e2e-status.md` for the browser
tests.

## Where things stand

Branch `review/integration` is based on release 1.12.0 and is not pushed. Its worktree is
`.claude/worktrees/integration` inside the main checkout. `git log main..HEAD` is long because
`main` on this machine is behind the releases; the work of this review starts at the five
merges named below.

`pnpm check` passes on it (lint, typecheck, every unit test, content validation), and so does
the browser suite: 106 tests passed and 1 was skipped (Rust is not installed here), in about
20 minutes, on 11 November after the last code change.

George asked for one builder at a time, to keep usage down. Use targeted test files while
working, and run the slow server suite and the browser suite once at the end.

## What the branch contains

In the order it was built.

**The first wave: five merged branches.** They still exist for anyone who wants separate pull
requests.

| Branch | What it does |
| --- | --- |
| `review/server-safety` | Loopback guard, Host and Origin checks, a database snapshot before migrations, shutdown handling |
| `review/honest-credit` | Every response kept, credit decided per question, server miss limit, Exam completion, missed questions into review, card text refresh, assisted cards graduate |
| `review/marking-validators` | Numeric and text parser fixes, the SVG attribute gate, an all-bundles marking test, `scripts/content-lint-report.mjs`, CI on a frozen lockfile |
| `review/docs-and-copy` | README, AGENTS and content docs corrected, old docs moved to `docs/archive/`, headings renamed |
| `review/web-robustness` | Error boundaries, focus and live region in the lesson player, page titles, radio semantics for choices, the celebrations preference |

`99c6e3a` lets a migration file marked `-- rollback-safe` be recorded in the ledger, so an
older build still starts after a rollback. A new migration that only adds tables or columns
with defaults should carry that line.

**Marking and content corrections.** Course content marks answers as its prompts ask, the
review's listed errors are corrected, and a numeric answer with a rounded intermediate step is
accepted one unit either way in the last place (`eb71259`, `8b631bd`, `f499745`).

**Writing tasks.** A lesson's writing task can be skipped, shows its material, is assessed
against its criteria with a result for each, and can be revised. Writing Longer Pieces,
Technical Writing, English, Creative and Game Writing, and Speaking, Argument and Debate end
each lesson with one.

**Code questions written in the lesson.** A question can be answered by writing Python, SQL or
TypeScript, marked by running it in the sandbox, and checked any number of times. Python for
Data Analysis has exercises in lessons 1 to 21, SQL: From Rows to Reports has three in each of
its 15 lessons, and TypeScript and Node has three in each of its first five lessons. A prepare
script refuses to build a candidate that drops published questions.

**Sources.** A source record says whether its address was checked. Every address was requested
and sixteen were corrected. The lesson's finish screen and the course page list their sources.
Eighteen courses now cite the section or page behind each lesson.

**History as the model for humanities questions.** The History course asks about real
extracts from public-domain sources and keeps numbers for chronology that matters
(`c161b89`). `docs/question-writing-guide.md` describes how, so the same can be done for
another course.

**The browser suite.** The specs play lessons from their content through one helper
(`apps/web/e2e/lesson-player.ts`), and CI runs them. Repairing them found four bugs in the app,
all fixed: Back in a lesson drew the earlier question blank, focus skipped the heading of a
screen that asks nothing, a review session cleared one course before starting the next, and
Home's lesson button was cut off on a short window.

**Order, sort and source-pair questions (11 November).** Three question types, marked by the
server from the places of the items and never by a model:

- Order: three to seven items to put in sequence, moved with buttons or the arrow keys. A
  miss says how many are in the right place. The second miss, or Show the answer, shows the
  right order.
- Sort: four to ten items placed in two to four named groups by choosing an item and then a
  group. A miss says how many are in the right group. Once the question closes, each item
  shows its group and a line of explanation.
- Extracts: a question can carry one or two extracts with an attribution line each. Two are
  set side by side as Source A and Source B on a wide screen and stacked on a phone. Course
  checks show extracts now.

They use the existing attempts, credit, hints, miss limits and review. A missed order or sort
question comes back as a review card that is answered the same way and marked by the server.
History uses them in eleven questions: three order, three sort, two source pairs and three
single extracts with attribution. `docs/implementation-status.md` has the details under
"Order, sort and source-pair questions", and the guide says when to use each.

## What is verified and what is not

Verified by tests that pass on this branch:

- Contracts, validators, server marking and credit, review cards and the web components for
  the three new types, including keyboard operation of the order list and the sort.
- In the browser at 1440 and 390 pixels wide: each new type unanswered, after a miss and
  closed, the same arrangement after Back, no sideways scroll, controls of at least 44
  pixels, and the missed question answered again on its review card the next day.
  Screenshots of each state were read at both widths.
- The whole browser suite, once, at the end: 106 passed, 1 skipped, none failed.

Not verified:

- Nothing was tried with a screen reader. The live regions and labels are tested by their
  text, not by how NVDA or VoiceOver reads them.
- The new types were played in Chromium only, and not in the installed Windows app.
- The legacy quiz screen (`LegacyQuizStageView`) draws the new types through the shared answer
  input, and no test covers that, because no live course reaches the screen.
- The tutor receives a new type's items and extracts in the learner's form of the question.
  No tutor reply about one was read.
- An order or sort question in a course check is refused by the schema, which is intended.
- Rust lessons are skipped by the browser suite on this machine, as before.
- The six History questions that changed type were written in this session and read once.
  George has not read them. The extracts were not fetched again: each structured extract is a
  run of words from a quotation the course already held as verified, and the apply script
  refuses any that is not.

## Decisions waiting on George

About the new question types:

- An order or sort question in an end check gets one try, as every end-check question does.
  History has four there. Should those two types get a retry in the end check, since a first
  try of six items is harder than one of three options?
- The attribution line is plain text in one sentence ("Tacitus, Annals (translated by Church
  and Brodribb), written about a century after Augustus died. A history by a Roman senator,
  written for readers like himself."). Is that the right amount, or should the translation
  credit move to the sources list?
- There is no dragging. It was left out because the buttons and keys cover every input and
  drag is the part that breaks. Say if drag is wanted on top.
- Should the remaining seventeen History extracts written as quoted paragraphs move to the
  structured form with attributions? It is mechanical, and each attribution has to come from
  the lesson or the source record.

From before, still open:

- Should the Origin check require Origin to equal Host? Today any loopback port passes
  (`apps/server/src/host-guard.ts`).
- Should Exam mode refuse to reopen a closed question? Reopening gives more tries, never
  independent credit, and at most 25% XP.
- The Courses page subtitle "Step by step, from curiosity to understanding." is a slogan.
- `instrumenta/product.json` pins `DISCERE_CLAUDE_SMART_MODEL` to Haiku, so an installed copy
  does not use Sonnet for judging as the README describes.
- A "secure" lesson state after a delayed three-item check, and course checks for the 47
  courses without them. Both change what progress means, so they need a design first.
- Leagues pay about 20 XP for a new question and 3 to 8 for a review, and drop a league per
  idle week. The review suggests freezing during absence and paying review enough to hold a
  league.
- Home's welcome headline and three explainer cards (`game/HomeHero.tsx`) break the copy
  rules. Removing them is a layout change.
- Which branch receives the other when `review/integration` meets `main`, and whether the
  first-wave branches go up as separate pull requests.

## What is left, in a sensible order

### 1. Questions for the other humanities courses

Use `docs/question-writing-guide.md` and copy `packages/curriculum/tests/history-questions.test.ts`
for each course. Philosophy, English: Reading, Writing and Rhetoric, Linguistics, Psychology,
Economics and Music Theory are the candidates. Each needs its sources fetched, George's
go-ahead, and the `discere-lesson-voice` skill. The new types fit them: lines of an argument to
order, premise and conclusion or valid and sound to sort, two passages to compare.

The sciences can use order and sort too (steps of a method, scalar and vector, the stages of
mitosis), without the source work. Keep most questions multiple choice and short text.

### 2. Exercises for the other programming courses

Python for Data Analysis, SQL and the first five TypeScript lessons have exercises written in
the lesson. Still to do, in the same style:

- TypeScript and Node: the lessons after the fifth, and the Node lessons, which need a runner
  that allows the Node APIs a lesson uses (files, HTTP, timers) inside the sandbox.
- The other courses that teach Python-style programming and still ask about code by multiple
  choice: CS Basics, Data Structures and Algorithms, Software Testing and Quality, and the
  programming lessons of Data Engineering.
- Rust Foundations has code questions through the older `codeCases` path.

### 3. One question component

Lessons, the legacy quiz, review cards and course checks each implement a question separately
(`journey/stages/QuestionBlock.tsx`, `journey/stages/QuizStageView.tsx`, `review/Flashcard.tsx`,
`checks/CheckScreen.tsx`). They now share more than they did: `AnswerInput` draws every answer
type in all four, `PromptText` draws the prompt and extracts in all four, and the review card
hosts the order and sort inputs. The attempt logic is still separate in each. Build one
component with policy props (tries, hints, deferred verdict, confidence) and use it in all
four. With it:

- Send choice ids to the server and mark by id. The server marks the label through the text
  matcher today (`apps/server/src/assessment.ts`, `routes.ts`). Order and sort already send
  ids.
- Shuffle choice options at display, with the seed the order and sort items use
  (`visitSeed` in `quiz-shared/use-attempt.ts`). They are shown in authored order.
- Let a choice card on review be answered by choosing, as the order and sort cards are. It is
  self-rated today.
- Add an "I was right" appeal on typed text answers and cards that records the response for
  authoring.
- Delete `LegacyQuizStageView`, `AttemptResult`, `RevealFlow` and `TransferChallenge` if no
  live course reaches them.

### 4. Slow home and review requests

`visibleReviewCards` in `apps/server/src/routes.ts` upserts every authored card and runs a
query per question on `/api/home`, `/api/review`, `/api/review/sessions` and `/api/study`.
Register cards once at start in one transaction, compute "introduced" with one query, build
`Map` indexes in `ContentRepository` (`content.ts` scans every bundle per lookup), cache
prepared statements in `db/store.ts`, and set `synchronous = NORMAL`. A server test that
starts the app takes four to five seconds for the same reason.

### 5. Content fixes from the lint report

Run `node scripts/content-lint-report.mjs --out <file>` for the worklist. Counts on
10 November: 579 faded examples with one blank on the last step, 508 last hints that are only
the sum, 475 answers marked tighter than their last printed digit, 406 correct options longest
by more than 25%, 221 end checks of one question type, 140 typed cards whose back lacks the
expected term, 104 tolerances that do not match the rounding asked for, 85 first-letter hints,
8 misconception values accepted as correct. Some were fixed in `eb71259`, so run it again
before starting.

Courses with a `review/publication.json` bind it to the bundle's SHA-256, so a content edit
needs `scripts/rebind-review.ts` afterwards.

### 6. New subjects

About 28 of the 65 courses are computing. Missing: foreign languages, law, health beyond first
aid, business and finance, period and regional history, politics, sociology, anthropology,
geography, religion, art history, literature. A language course would want a fourth question
type, building a sentence from shuffled words, which is the order question with a different
label. Period history would use the History course as its model.

### 7. Later

The other Atlas question types (tap the line with the bug, complete a table, a scenario where
each choice shows its outcome), written answers in the humanities with a model answer to
compare against, CSS consolidation (40 stylesheets, tokens redefined in five layers),
lazy-loading each subject's diagrams, the release zip allow-list (`.authoring/` and
`review/history` ship today), the server-sent Content-Security-Policy, and a pairing token for
the phone route.

## Running the browser tests here

Playwright's Chromium needs `libnspr4`, `libnss3` and `libasound2t64` on this machine
(`sudo apt-get install libnspr4 libnss3 libasound2t64`, or
`sudo pnpm --filter @discere/web exec playwright install-deps chromium`). Without root, point
`LD_LIBRARY_PATH` at a folder that holds them. Set `DISCERE_PYTHON_RUNTIME_DIR` to the main
checkout's `data/python-runtime` when running from a worktree, and `DISCERE_SHOTS` to a folder
to keep screenshots from the specs that take them.

## Corrections to the review

The builders found three findings that were wrong or out of date:

- A validator already refuses a multiple-choice question with no accepted option or several
  (`choiceIssues` in `packages/curriculum/src/validate.ts`).
- A tutor job queue exists for all three generating providers
  (`packages/tutor-providers/src/pipeline.ts`), not only Codex.
- "Almost there" on Home held the two closest achievements, not courses.
