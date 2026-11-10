# Browser test suite: status (11 November 2026)

The specs in `apps/web/e2e/` drive the built app in headless Chromium. They play lessons, miss
questions, write and revise, run the course checks and the SQL and Python projects, and check
the main screens at phone width. Run them before a release to catch something that used to work.

## Where it stands

The last full run on 11 November passed 97 tests and skipped 1, in 17.9 minutes. Nothing failed.
The skipped test plays a Rust lesson, and Rust is not installed on this machine.

The run before the repair, on 10 November, passed 52 of 139 and failed 87 in 34 minutes. Almost
every failure came from a spec written for lessons and screens that have since changed.

## What each spec covers

| Spec | What it checks |
| --- | --- |
| `lessons.spec.ts` | One lesson from each of fourteen courses, played from its opener to its finish screen. Between them they hold every kind of step, every way of answering, the four code languages, an explorer with a prediction, a writing task and a quoted extract. |
| `figures.spec.ts` | Every kind of figure is drawn in a lesson and its buttons and sliders are used. A truth table, a program trace, a search trace and a number machine are checked before the answer and after it. |
| `lesson-flow.spec.ts` | Back then Continue, a missed question returning as a review card the next day, hints and the one-try rule, the writing task from skip to a second version, the sources lists, a program checked any number of times, a quoted extract, a lesson finished with the keyboard alone, and Home, Courses, a lesson, Review and Progress at 390 pixels wide. |
| `courses.spec.ts` | The Courses page has a card for every listed course and its artwork loads. A course page has a roadmap stop for each lesson, which the keyboard can open. |
| `momentum.spec.ts` | The verdict on an answer, the finish screen and its saved result, the practice settings, reduced motion and the sound cue. |
| `journey.spec.ts` | A stage keeps its address through a reload and the browser's Back. The tutor opens beside the lesson and answers. |
| `notebook.spec.ts` | The working page draws, saves, undoes and gets a review. The Review page names each course with cards, and a session takes turns between courses. |
| `home-redesign.spec.ts` | Home at three sizes, the course chooser, resuming a lesson from Home, and the Progress page's filters. |
| `course-checks.spec.ts`, `foundation-checks.spec.ts`, `data-checks.spec.ts` | Placement, the mixed check and the check a week later, for Maths, Logic, Computer Science, Probability, Astronomy, Psychology, SQL and Python. |
| `python-exercises.spec.ts`, `sql-exercises.spec.ts`, `typescript-exercises.spec.ts` | A code exercise run, failed, corrected and passed in each language. |
| `order-questions.spec.ts`, `sort-questions.spec.ts`, `source-pairs.spec.ts` | History's order, sort and source-pair questions at 1440 and 390 pixels wide: arranged with the keyboard and the buttons, a miss that says how many are right, the answer shown at the second miss, the same arrangement after Back, and the missed question answered again on its review card. `DISCERE_SHOTS` names a folder for screenshots. |
| `python-projects.spec.ts`, `sql-projects.spec.ts` | Each project in Coach, Direct and Exam mode, and an exam ended early. |
| `library-expansion.spec.ts`, `quality-pass.spec.ts`, `reliability.spec.ts`, `navigation-motion.spec.ts` | Library filters, Settings recovering from a failed request, a stopped engine, search, old addresses, and route transitions. |
| `screenshots.spec.ts` | The welcome, and every screen of one lesson at three sizes. |

## How the tests are written

`lesson-player.ts` plays a lesson from its content. It reads the screens from the journey the
server sends and the answers from the course bundle, then answers each screen by its type. A
test names a lesson by id and finds a step by what it holds, such as "the first step with a
choice question and a retry". No test asserts on a sentence of a lesson, so rewording a lesson
does not break one. Tests assert on roles, on interface copy such as button names, on progress
and on what the server saved.

`isolated-app.ts` gives a test a server of its own with an empty database, the offline tutor and
a clock the test can move. Use it whenever a test needs a learner with no history or needs
tomorrow to arrive. The other specs share the server that `playwright.config.ts` starts, and
they must not depend on what an earlier spec left behind.

`watchPage` fails a test if the page logs an error, throws, or has a request refused. A test
lists the ones it causes on purpose.

Screenshots go to `apps/web/test-results/captures`, which Git ignores. Set
`DISCERE_E2E_UPDATE_DOCS=1` to write them to `docs/` when a document's pictures are meant to
change.

## What was decided on 11 November

Rewritten to match the app:

- `momentum`, `journey`, `notebook`, `home-redesign` and `screenshots` now play lessons through
  the shared helper.
- `python-projects` and `sql-projects` waited for a "Project complete" label that was removed on
  1 November. They now check the results screen: the project's title, the count that matched,
  the XP and one entry for each task. Nothing else in them had gone stale.
- `reliability` looked for the "Archived course" notice on Electronics Foundations, which is
  listed again. It now finds an archived course in the content.
- `data-checks`, `foundation-checks` and `course-checks` share one helper that finishes a
  course's lessons through the API. It answers a code question with its worked program and does
  four lessons at a time. The Python mixed check took close to its 240 second limit and now
  takes about 35 seconds with no Python and 90 with it.

Removed, with what they covered:

- The fourteen `*-course.spec.ts` files. Each walked a course's roadmap, every lesson at three
  sizes, a mistake and its correction, the explorer's keyboard controls, placement and the two
  later checks. `lessons.spec.ts`, `figures.spec.ts` and `courses.spec.ts` cover the lessons,
  figures and roadmaps. The checks are covered for eight courses, not all eighteen that have
  them.
- `brilliant-experience.spec.ts`: the course list, roadmap stops, a mistake and its correction,
  the sound cue and roadmap motion. All of it moved to `courses`, `lesson-flow` and `momentum`.
- `foundations.spec.ts`: Maths lesson 1 sentence by sentence, the coordinate grid, the truth
  table and the program and search traces. `figures.spec.ts` and `lesson-flow.spec.ts` check the
  same behaviour from the content.
- The statistics lesson walk in `library-expansion` and the speaker puzzles in `quality-pass`.
- Three `journey` tests. The lesson navigator they measured against is hidden in every current
  lesson. Exam mode can no longer be chosen inside a lesson, because every question after a
  lesson's screens is a skill check, which has no mode selector. Exam mode is still tested in
  the projects.

## Bugs the suite found

- Going Back in a lesson drew the earlier question blank, with a disabled Check answer on top of
  Continue, so the learner could not click forward. A lesson now keeps the attempts made during
  the visit and shows the screen as it was answered.
- On a screen that asks nothing, focus jumped from the heading to Continue as soon as the screen
  was drawn. It now stays on the heading.
- A review session cleared one course before starting the next, unless the lessons met were the
  first in their courses. The queue took its turns among every registered card, including those
  of lessons not yet met.
- On Home the button that starts or resumes a lesson was cut off at 1440 by 900 and 1024 by 768,
  and sat under the bottom bar at 390 by 844.

Found and left alone:

- At 1280 by 720 the companion's default place covers the radio dot of the first daily goal on
  Settings and the line above a course's title. Clicking anywhere else on the goal card works.
  Moving the companion's default place is a design choice.
- The page asks for a writing task's assessment before one exists. The server answers 404 and
  the browser logs it as an error.

## What is not covered

- Rust lessons, on a machine without Rust.
- Course checks for ten of the eighteen courses that have them.
- Light theme, the calm background, dragging the companion, and the calculator's "Use in answer".
- The three exercise specs still assert on the text of a starter program.
- `activity-diagram-choice` and `activity-graph-plot` under `docs/ui-ux/screenshots` show
  activities that lessons no longer have. Nothing regenerates them.

## How to run it

    pnpm e2e                                              # everything, about 18 minutes
    pnpm --filter @discere/web e2e e2e/lesson-flow.spec.ts  # one spec

`playwright.config.ts` builds the web app and starts its own API and web servers.

| Variable | What it does |
| --- | --- |
| `DISCERE_E2E_SKIP_BUILD=1` | Serves the `dist` already built, for running one spec repeatedly. |
| `DISCERE_E2E_API_PORT`, `DISCERE_E2E_WEB_PORT` | Move the servers off 4517 and 4518. |
| `DISCERE_E2E_UPDATE_DOCS=1` | Writes screenshots into `docs/`. |
| `DISCERE_PYTHON_RUNTIME_DIR` | Points at a Python runtime outside this checkout. |

A test that needs Python, SQL, TypeScript or Rust skips itself where that language cannot run.
In WSL, Chromium needs `libnspr4`, `libnss3` and `libasound2t64`.

The `browser` job in `.github/workflows/ci.yml` runs the suite on every pull request. It
installs Chromium with its system libraries and has no sandboxed Python, so the Python tests
skip there. The job was written on 11 November and had not yet run on GitHub when this was
written.
