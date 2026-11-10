# Next wave of review work

A handoff for the session that continues the November 2026 review. Written on 10 November
2026. Read `docs/holistic-review-2026-11.md` for the findings and
`docs/atlas-comparison-2026-11.md` for the improvements taken from Atlas Open Academy.

## Where things stand

Branch `review/integration` holds the first wave. It is based on `main` at release 1.12.0
(`f54c7f3`) and is not pushed. `pnpm check` passes on it: lint, typecheck, every unit test
and content validation.

It merges five branches, which still exist for anyone who wants separate pull requests:

| Branch | What it does |
| --- | --- |
| `review/server-safety` | Loopback guard, Host and Origin checks, a database snapshot before migrations, shutdown handling |
| `review/honest-credit` | Every response kept, credit decided per question, server miss limit, Exam completion, missed questions into review, card text refresh, assisted cards graduate |
| `review/marking-validators` | Numeric and text parser fixes, the SVG attribute gate, an all-bundles marking test, `scripts/content-lint-report.mjs`, CI on a frozen lockfile |
| `review/docs-and-copy` | README, AGENTS and content docs corrected, old docs moved to `docs/archive/`, headings renamed |
| `review/web-robustness` | Error boundaries, focus and live region in the lesson player, page titles, radio semantics for choices, the celebrations preference |

On top of the merge, `99c6e3a` lets a migration file marked `-- rollback-safe` be recorded in
the ledger, so an older build still starts after a rollback. New migrations that only add
tables or columns with defaults should carry that line. Migration `0015_attempt_history.sql`
does.

The worktree for this branch is `.claude/worktrees/integration` inside the main checkout.

## Constraints

- Another session works in the main checkout on `fix/teaching-quality`, editing
  `content/*/bundle.json` and parts of the lesson player. Its three commits of 10 November
  (`e8cc2bc`, `6fe5867`, `69d2729`) are not in `review/integration`. `69d2729` touches
  `apps/web/src/journey/stages/StoryStageView.tsx`, which `review/web-robustness` also
  changed, so expect a conflict there when the two meet.
- Do not edit content bundles until that session has finished or George says so.
- George asked for one builder at a time, to keep usage down. Use targeted test files while
  working and run the slow server suite once at the end.
- Nothing has been built or opened in a browser. Treat every web change in the first wave as
  unverified in the running app.

## Work, in order

### 1. Make the end-to-end tests pass

None of the 30 Playwright specs in `apps/web/e2e` was run. The first wave changed things they
assert on:

- Answer choices have `role="radio"` and `aria-checked` where they had `button` and
  `aria-pressed`, and are `aria-disabled` after an answer where they were `disabled`.
  Affected: the fourteen `*-course.spec.ts` files, `brilliant-experience`, `home-redesign`,
  `library-expansion`, `data-checks`, `foundation-checks`.
- "Check again" is `aria-disabled` until the answer changes. The verdict no longer has
  `role="status"` on its inner element. Check `journey`, `course-checks`, `momentum`,
  `foundations`.
- Renamed headings: "Learning paths" to "Courses", "Your learning activity" to "Your
  progress", "Almost there" to "Closest achievements", "Start something new" to "Courses you
  have not started", "Use it again" to "Later course checks", "What stayed with you" to
  "Your later course check", "Look through your answers" to "Your answers". The docs builder
  updated the assertions it found.
- `brilliant-experience.spec.ts` still has `expect(list).toHaveLength(18)`. There are 65
  listed courses.

Then run `pnpm build` and `pnpm smoke`, and open the app. Check by hand: focus after an
answer and after Continue, the verdict being read by a screen reader (the live region is the
`.question-feedback` wrapper, which is `display: contents`), a missed question appearing in
review the next day, and how a choice question's card front renders ("Options: a; b; c" is
joined with a newline and was never seen in a browser).

What a later session found, the same day. The suite ran: 52 of 139 tests pass and 87 fail.
The role changes, the course count and the self-rated card helper are fixed in the specs.
The other failures are older than this review. The specs were written for the lessons and
screens from before release 1.2.0, and they look for things that have since gone:

- The fourteen `*-course.spec.ts` files, `brilliant-experience`, `sql-course` and
  `python-course` read `lesson.steps[0].diagram`, `blocks[0]` and question ids that the story
  lessons do not have.
- `foundations`, `momentum`, `home-redesign`, `library-expansion` and `quality-pass` look for
  sentences that the lesson rewrites of 6 November changed.
- `journey`, `notebook` and `screenshots` walk the archived Electronics stages ("Step 1 of 7",
  the "Lesson stages" navigation). Electronics Foundations is a listed course again, so
  `reliability` no longer finds its "Archived course" notice.
- `sql-projects` and `python-projects` wait for "Project complete" and other wording removed
  on 1 November.
- `data-checks` for Python passed once in three runs. It finishes every lesson through the API
  and runs close to its 240 second limit.

Rewriting them means driving each lesson from its bundle instead of from fixed text. Until
then the 52 passing tests are the ones to keep green.

Playwright's Chromium needs `libnspr4`, `libnss3` and `libasound2t64` on this machine
(`sudo apt-get install libnspr4 libnss3 libasound2t64`, or
`sudo pnpm --filter @discere/web exec playwright install-deps chromium`).

Checked in the running app: after an answer, focus rests on the primary button (Check again,
Show the next line, then Continue) and moves to the next screen's heading. A question missed
at the limit is a review card the next day. A miss followed by a right answer on the second
try is not queued. The card for a choice question now lists its options under the prompt.

### 2. Bring in the other session's lesson-player commits

Done before this document was written: `fix/teaching-quality` came in with release 1.12.0
(`bc70f82`), so `69d2729` is already an ancestor of `review/integration` and there was nothing
to merge.

Merge or rebase so `review/integration` and `fix/teaching-quality` agree, resolving
`StoryStageView.tsx`. Ask George which branch should receive the other.

### 3. One question component

Lessons, the legacy quiz, review cards and course checks each implement a question
separately (`journey/stages/QuestionBlock.tsx`, `journey/stages/QuizStageView.tsx`,
`review/Flashcard.tsx`, `checks/CheckScreen.tsx`). Build one component with policy props
(tries, hints, deferred verdict, confidence) and use it in all four. With it:

- Lift per-step attempt results into `StoryStageView` so going Back shows the answered
  screen read-only. Today it shows a blank question, and by reading, the Check and Continue
  rows are drawn in the same grid cell.
- Send choice ids to the server and mark by id. The server marks the label through the text
  matcher today (`apps/server/src/assessment.ts`, `routes.ts`).
- Shuffle options at display. They are shown in authored order.
- Add an "I was right" appeal on typed text answers and cards that records the response for
  authoring.
- Delete `LegacyQuizStageView`, `AttemptResult`, `RevealFlow` and `TransferChallenge` if no
  live course reaches them.

Add a Playwright test that goes Back and then Continue.

### 4. Slow home and review requests

`visibleReviewCards` in `apps/server/src/routes.ts` upserts every authored card and runs a
query per question on `/api/home`, `/api/review`, `/api/review/sessions` and `/api/study`.
Register cards once at start in one transaction, compute "introduced" with one query, build
`Map` indexes in `ContentRepository` (`content.ts` scans every bundle per lookup), cache
prepared statements in `db/store.ts`, and set `synchronous = NORMAL`.

### 5. Content fixes, once the bundles are free

Run `node scripts/content-lint-report.mjs --out <file>` for the worklist. Counts on
10 November: 579 faded examples with one blank on the last step, 508 last hints that are
only the sum, 475 answers marked tighter than their last printed digit, 406 correct options
longest by more than 25%, 221 end checks of one question type, 140 typed cards whose back
lacks the expected term, 104 tolerances that do not match the rounding asked for, 85
first-letter hints, 8 misconception values accepted as correct.

Start with the ones that misgrade: the 8 misconception values, the 104 rounding mismatches
and the 140 card backs. Then the 11 errors listed under "Errors found" in the review. The
larger rewrites (numeric filler in humanities, one-word recall, source extracts, code items)
need George's go-ahead per course and the `discere-lesson-voice` skill.

Courses with a `review/publication.json` bind it to the bundle's SHA-256, so a content edit
needs `scripts/rebind-review.ts` afterwards.

### 6. Decisions waiting on George

- Should the Origin check require Origin to equal Host? Today any loopback port passes
  (`apps/server/src/host-guard.ts`).
- Should Exam mode refuse to reopen a closed question? Reopening gives more tries, never
  independent credit, and at most 25% XP.
- The Courses page subtitle "Step by step, from curiosity to understanding." is a slogan.
- `instrumenta/product.json` pins `DISCERE_CLAUDE_SMART_MODEL` to Haiku, so an installed
  copy does not use Sonnet for judging as the README describes.
- A "secure" lesson state after a delayed three-item check, and course checks for the 47
  courses without them. Both change what progress means, so they need a design first.
- Leagues pay about 20 XP for a new question and 3 to 8 for a review, and drop a league per
  idle week. The review suggests freezing during absence and paying review enough to hold a
  league.
- Home's welcome headline and three explainer cards (`game/HomeHero.tsx`) break the copy
  rules. Removing them is a layout change.

### 7. Later

CSS consolidation (40 stylesheets, tokens redefined in five layers), lazy-loading each
subject's diagrams, the release zip allow-list (`.authoring/` and `review/history` ship
today), Playwright in CI, the server-sent Content-Security-Policy, a pairing token for the
phone route, and the Atlas items in `docs/atlas-comparison-2026-11.md`.

## Corrections to the review

The builders found three findings that were wrong or out of date:

- A validator already refuses a multiple-choice question with no accepted option or several
  (`choiceIssues` in `packages/curriculum/src/validate.ts`).
- A tutor job queue exists for all three generating providers
  (`packages/tutor-providers/src/pipeline.ts`), not only Codex.
- "Almost there" on Home held the two closest achievements, not courses.
