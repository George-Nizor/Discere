# Implementation records, October 2026

Moved out of `docs/implementation-status.md` on 14 November 2026. These describe the library and
the checks as they stood in early October, when it had twelve to twenty courses. Do not read them
as the current state or as work still to do: see `docs/platform-overview.md` and
`docs/backlog.md`.

The second learner pass is complete and running locally. Chemistry, Probability, Computer
Science, Calculus and a later Maths module were read and completed through rendered UI. It
repaired three false-negative answers, made recall explain immediately after submission, replaced
internal topic labels, compacted computing traces at three widths, and simplified the companion
tutor handoff. All 1,468 package tests, content validation and build pass; 83 affected browser
scenarios, 20 final focused cases and two final tutor cases pass. Every owner row and preference
is unchanged. Second critical learner assessment records
manual coverage, evidence, remaining pacing/tutor criticisms and computer-use/audio limits.

The final learner walkthrough and repairs are complete and running locally. Five complete modules
across Maths, Biology, Physics, Logic and Python, plus real Python/SQL project tasks and delayed
recall, were read and answered through rendered UI in private learner profiles. The review repaired
unit marking, candidate diagrams, finite review progress/reload, small-screen answer fields and
learner copy. All 1,454 package tests and the production build pass. The affected browser suite
passed 27 scenarios, with all nine Physics/Foundations scenarios rerun after the final correction.
Owner rows and preferences remain unchanged. Critical learner assessment
records the exact coverage, evidence and computer-use/audio limitations.

The navigation-motion release is complete and running locally. Main tabs, Settings and lesson
entry now share fades and a stable navigation frame; the active marker travels between tabs,
course and period selections transition locally, and artwork settles into place. Normal-speed
recordings were inspected at desktop, tablet and phone sizes. Final package checks, production
build, 53 affected-route browser scenarios and read-only checks of the served app pass. Existing
owner rows and preferences are unchanged. [Motion evidence](../motion-polish/README.md) records exact
run results, recordings and validation limits.

As of 2026-10-07 the checked-in library has 20 courses (233 lessons, 2,447 questions, 468 recall cards in `content/`). The figures below describe the original twelve, in Maths, Geometry, Linear Algebra, Calculus, Physics, Chemistry, Biology, Logic, Computer Science, introductory Probability and Statistics, SQL reporting, and Python data analysis. Later additions are Astronomy, Economics, Electronics Foundations, Engineering, English, Philosophy and Psychology. The Roman Empire placeholder course, counted in those figures, was removed on 2026-10-16 together with its Roman reference flow. George's latest 2 October direction closes new-material work for this release. The existing library is the quality and verification scope; wider Notion topics and technical curricula remain a documented future backlog.
The full product target remains in the roadmap.

The current-library quality release is complete and running locally. It improves 120 hint sets,
63 explanations and thirteen question contexts, corrects logic diagrams and negation marking,
repairs Settings status/recovery and its connection-test request, and fixes dark-theme contrast.
All 1,439 package tests pass; all 115 browser scenarios have passing latest results after focused
repairs. The live API serves all 152 lessons without private marking fields, and every saved row
and preference is preserved. See the quality release for exact evidence,
including combined browser-run results and the remaining validation limits.

George’s 2 October homepage request adds Home, Courses and You as the main tabs. Home now has
an illustrated course selector, real saved resumption, daily practice and new-course suggestions.
You adds recorded weekly summaries, calendar-period filters, answer accuracy and activity charts.
[Homepage release records](../home-redesign/README.md) retain the responsive and data-preservation evidence.

## Scope and delegated decisions

George's 1 October request supersedes the earlier Roman reference direction for the active
product. [The experience notes](../brilliant-experience/README.md) record the supplied Brilliant
screenshots, public reference study, original artwork, and question-first teaching flow.
The Roman course and its recovery flow were removed on 2026-10-16.

All work is inside Discere. Instrumenta and Claude's wrapper work were not edited. The learning
core remains independent of the wrapper and model vendor. That release added no OpenAI API
integration or paid dependency; an `openai-compatible` tutor provider has been added since (see
[the setup guide](../setup.md)).

## Runtime

The workspace contains React/Vite, Fastify, SQLite, and host-neutral MCP tools. Services bind to
loopback. `pnpm start` serves the built web app at `127.0.0.1:4318` and API at `127.0.0.1:4317`;
`pnpm stop` uses Discere's own PID record. The existing single-origin server shape remains available
to Instrumenta.

Migration `0004_review_recall.sql` adds review mode, first response, and marking result while
preserving earlier data. The owner database was backed up using SQLite's online backup and passed
an integrity check before migration. The ignored backup is
`data/backups/discere-before-recall-20260930T120549Z.sqlite`. The built app is running on its configured
loopback ports. Migration `0005_study_rewards.sql` now adds the reward ledger, practice preferences,
streak protection, and the due timestamp captured by a review session. Before applying it, SQLite's
online backup produced `data/backups/discere-before-study-rewards-20260930T143904Z.sqlite` and passed
an integrity check. The restarted app passed health and study checks; owner XP and saved record
counts were preserved. Its study day uses Australia/Sydney. Browser and smoke checks use disposable
databases rather than adding test attempts to the owner's history.

Migration `0006_course_checks.sql` adds versioned course-check sessions. Before applying it,
SQLite's online backup produced `data/backups/discere-before-course-checks-20261001T162728Z.sqlite`;
both source and backup passed integrity checks. Migration and final integrity checks passed.
The restarted preview preserved XP, streaks, preferences and the counts of attempts, reviews,
cards, journey rows, notebooks and learning events. The new check-history table is empty for the
owner. Read-only checks confirm available placement, locked final/delayed checks and no due check.

Before loading Geometry, a further online backup created
`data/backups/discere-before-geometry-20261001T172521Z.sqlite`; source and backup integrity were both
`ok`. After restart, row fingerprints confirmed every pre-existing record was preserved. Study
summary and preferences were identical, including XP/streak evidence and enabled sound. Twelve new
unstarted concept rows were added; no study attempts or check sessions were created. Read-only
checks reached all twelve Geometry journeys without answer authority, confirmed seven active
courses and the expected placement/locked checks, and received HTTP 200 from the built preview.

Before loading Physics, an online backup created
`data/backups/discere-before-physics-20261001T183841Z.sqlite`; source and backup integrity were `ok`.
After restarting the managed preview, every prior row fingerprint was preserved. Study summary and
preferences were identical, including sound. Only eighteen unstarted concept rows were added
(94 to 112); review cards remained 166, attempts and course-check sessions remained zero.
Read-only verification reached all eighteen Physics journeys without answer authority, confirmed
available placement and locked mixed/delayed checks, and received HTTP 200 from the built preview.

Before loading Calculus, an online backup created
`data/backups/discere-before-calculus-20261001T192103Z.sqlite`; source and backup integrity were
`ok`. After restarting and reading all twelve new journeys, every prior row fingerprint remained
unchanged. Study summary and preferences were identical. Only twelve unstarted concept rows
were added (112 to 124); review cards remained 202, attempts and check sessions remained zero.
The preview serves nine courses and 104 lessons; calculus placement is available and the mixed
and delayed checks remain locked. No answer authority is present in learner journey payloads.

Before loading Chemistry, an online backup created
`data/backups/discere-before-chemistry-20261001T200058Z.sqlite`; source and backup integrity were
`ok`. The refreshed preview serves ten active courses and 116 lessons. All twelve Chemistry
journeys omit answer authority; placement is available and mixed/delayed checks remain locked.
Every pre-existing row fingerprint is preserved. Study summary and preferences, including sound,
are unchanged. Only twelve unstarted concept rows were added (124 to 136); review cards remain
226 and attempts/course-check sessions remain zero.

Before loading Biology, an online backup created
`data/backups/discere-before-biology-20261001T210554Z.sqlite`; source and backup integrity were
`ok`. The refreshed preview serves eleven active courses and 132 lessons. All sixteen Biology
journeys conceal answer authority, including accepted alternative terms. Placement is available;
mixed and delayed checks remain locked. Every pre-existing row fingerprint is preserved, and
study summary and preferences, including sound, are unchanged. Only sixteen unstarted concept
rows were added (136 to 152); review cards remain 250 and attempts/check sessions remain zero.

Before loading the three foundation assessment revisions, SQLite's online backup created
`data/backups/discere-before-foundation-checks-20261001T214227Z.sqlite`; source and backup integrity
were `ok`. After restarting the preview, every pre-existing row fingerprint and all table counts
were unchanged. Study summary and preferences, including sound, were identical. Review cards
remain 282, with zero owner attempts and course-check sessions. Read-only verification reached all
twenty affected journeys without answer authority, confirmed available placement and locked
mixed/delayed checks, and counted 290 assessment problems across nine courses. The library still
has eleven active courses and 132 lessons.

## Published library

| Active course | Lessons | Questions | Recall cards |
| --- | ---: | ---: | ---: |
| Maths Foundations | 6 | 36 | 12 |
| Logic and Reasoning | 8 | 48 | 16 |
| How Computers Solve Problems | 6 | 36 | 12 |
| Probability and Statistics | 6 | 36 | 12 |
| SQL: From Rows to Reports | 15 | 90 | 30 |
| Python for Data Analysis | 21 | 126 | 42 |
| Geometry: Shape and Space | 12 | 72 | 24 |
| Physics: Motion and Forces | 18 | 108 | 36 |
| Calculus: Change and Accumulation | 12 | 72 | 24 |
| Chemistry: Atoms to Reactions | 12 | 72 | 24 |
| Biology: Cells to Ecosystems | 16 | 96 | 32 |
| Linear Algebra: Vectors and Maps | 20 | 120 | 40 |
| Total | 152 | 912 | 304 |

These twelve courses contain 153 concepts and 608 answered visual teaching beats. Each lesson has
four questions attached to diagrams, two further skills-check questions and two standalone recall
cards. All twelve courses provide 458 separate placement, mixed and delayed-application problems:
twenty for Maths; 36 each for Geometry, Calculus and Chemistry; 54 for Physics; 48 for Biology;
24 for Logic; eighteen each for Computer Science and Statistics; 45 for SQL; 63 for Python;
and sixty for Linear Algebra.
The Electronics prototype is archived from discovery, home suggestions and general
review. Its saved routes and records remain accessible. The fourteen stored bundles contain 160 lessons;
the three essays and eleven older activity definitions belong to the archived prototypes.

Maths covers variables, equations and line graphs. Logic covers conditionals, constraints, truth
tables, inference, validity and fallacies. Computer Science covers assignment, branching, loops,
debugging, searches and comparison growth. Probability and Statistics covers finite outcomes,
conditions, independence, centre, population spread and sampling selection.

SQL adds fifteen lessons in four modules: rows and filters, summaries, combining results, and
windows. Learners compare real query results, missing values, joins, subqueries, partitions, ties,
frames and neighbouring rows. All 121 displayed SELECT comparisons were executed in SQLite
3.53.4 and independently reconstructed in tests. The course assesses numeric results, choices
and SQL terms. It now also has three reviewed query-construction projects with fifteen tasks,
real isolated SQLite execution and 45 manually checked dataset variants. Saved drafts, alternative
queries, result inspection, corrections and Exam completion follow the existing feedback flow.
[Project records](../sql-projects/README.md) explain the runtime boundary and remaining scope.

Every SQL lesson also holds three query exercises, 45 in all (`responseType: "code"` with
`code.language: "sql"`), which the learner answers by writing or repairing one query in the lesson
itself. The 148 earlier questions are unchanged. An exercise shows the tables it reads, with each
column's type and the rows Run uses, and a starter query in the editor. All 45 read the course's
`customers` and `orders` tables. Run sends the query to the runner the SQL projects use
(`apps/server/src/sql-projects/runner.py`: a fresh in-memory SQLite database for each run, read
only, one statement, a time limit and at most 200 rows) and shows the first fifty rows it returns,
or SQLite's own error message. Check answer runs the query against the visible rows and against
two hidden sets of rows in the same tables, and compares what comes back with the stored result:
the number of columns and the values always, the order of the rows only where the prompt asks for
one (`code.ordered`), and the column headings only in the lesson on aliases
(`code.namedColumns`). A wrong result is described in words, such as "With the rows shown, your
query returned 5 rows and 3 were expected", and the reference query is shown only when the learner
asks for the worked query. A query SQLite refuses is not counted as a wrong answer. The stored
results were produced by running each reference query, and
`packages/curriculum/tests/sql-exercises.test.ts` runs every reference query and starter again with
the machine's Python 3 (SQLite 3.39 or later); `apps/server/tests/sql-questions.test.ts` does the
same through the app's runner. Where the runner cannot start, `GET /api/sql-runtime` says so, the
exercise offers to be set aside, and the lesson finishes without it. On an installed Windows app
the runner uses the Python that the app downloads once, and the exercise offers that download.
The lesson code path for the three languages is shared: `CodeAnswer`, `use-attempt.ts` and
`QuestionFeedback.tsx` on the web, `POST /api/questions/:id/run` and `POST /api/attempts` on the
server.

Python for Data Analysis adds 21 lessons from George's Python for Data Analysts guide, covering
core Python, NumPy, pandas preparation and report auditing. All 168 original examples were
executed with CPython 3.12.14, NumPy 2.3.5 and pandas 3.0.1; 105 separate programs verify numeric
question and recall keys. The browser replays reviewed steps, variables, tables and output, with
case selection, pause/reset and reduced motion. Three separate construction projects now add
22 learner-written programs and 66 reviewed dataset cases through isolated CPython execution.
Every lesson also holds three Python exercises, 63 in all (`responseType: "code"` with
`code.language: "python"`), which the learner answers by writing a few lines in the lesson itself.
Lessons 9 to 21 use NumPy and pandas: test inputs are plain lists and text, the starter builds the
array or table from them, and a Series, array or date result is compared in the form the runner
returns it (a list, or ISO text for a date). Run executes the visible example; Check answer runs every test in the same isolated
runtime as the projects and names the first test that fails with the expected and actual values.
Nothing but the tests decides the mark. `packages/curriculum/tests/python-exercises.test.ts` runs
every worked program and starter with the machine's Python 3; an exercise that imports NumPy or
pandas is listed as skipped there unless that Python has the library (`DISCERE_PYTHON` can name
one that has). `apps/server/tests/python-questions.test.ts` runs all 63 in the sandbox where it is
installed, which is the check that covers the NumPy and pandas exercises.
Where Python cannot run, the exercise says so and the lesson finishes without it.
Python records map the source sequence;
[project records](../python-projects/README.md) retain the executable work and its limits.

Geometry: Shape and Space adds twelve lessons in angles, measurement, area, scale, coordinate
distance, volume and box surface area. Learners compare exact shapes, add guides and unfold nets.
Independent tests recompute all 112 numerical question, recall and course-check keys. Three
12-problem checks provide placement, mixed practice and applications after seven days. The course
covers introductory geometry; proofs, congruence, constructions, trigonometry and the wider subject
remain. Geometry records retain scope, sources and evidence.

Physics: Motion and Forces adds eighteen lessons in one-dimensional motion, forces, work, energy,
power, impulse and sticking collisions. Fourteen deterministic models support 72 interactive beats
and 144 cases, with finite playback and keyboard controls. All 162 numeric lesson, recall and check
keys were independently recomputed. Three 18-problem checks cover every lesson, including applications
after seven days. Physics records retain primary sources, the
corrected Notion momentum formula, responsive visual review and the remaining mechanics scope.

Diagrams include number machines, equation balances, coordinates, truth tables, editable program
traces, searches, statistics models, query comparisons, Python execution playback and exact
geometry drawings with shape comparisons and folding box nets, plus bounded mechanics simulations. The bounded
browser teaching interpreter has no `eval` or host access. Teaching examples replay reviewed
executions; separate Python construction projects run learner programs through the isolated
CPython boundary. Project grading checks the authored task's independently specified private cases.

All new prose, datasets, exercises, code, SVG covers and companion artwork are original.
Source records retain exact sections, access dates, licences and intended reuse.
Each source record also says whether its address was checked (`checked`, set on 2026-11-11):
`verified` when the page was opened and is what the record names, `unreachable` when the address
no longer leads to it, `unchecked` when the site refuses automated requests or the link opens
something more general. `node scripts/check-sources.mjs --out <file>` requests every address
again; it needs the network, so it is run by hand and is not part of `pnpm check`. A lesson's
finish screen and the course page list the sources under "Sources".
OpenStax is reference-only; no source prose or media was copied into these courses.
[Foundation notes](../foundations/README.md) and expansion records
retain source and assessment evidence. The archived prototypes do not meet every new publication
rule and are not counted as active production coverage.

## Publication boundary

`pnpm curate import` stages an ignored candidate rather than overwriting the runtime bundle.
`pnpm curate publish <course>` requires accepted editorial review tied to the exact SHA-256,
no unresolved issues, explained writing warnings, precise source/licence metadata, claim citations,
prerequisites, resolved uncertainty, four answered visual beats, practice and transfer coverage,
and standalone cards. Re-import preserves lesson plumbing and rejects cross-lesson ID collisions.
The older authoring command also stages output rather than publishing automatically.

Course loading ignores unpublished directories, validates references, verifies reviewed lesson
image hashes, and requires reviewed cover provenance for new authored bundles. New reviews name
Codex under George's delegation; they are agent reviews, not an independent human subject review.
Tests independently recompute Maths values, enumerate Logic cases, trace code/searches, and check
all twelve active publication hashes. Python tests independently recompute all 84 numeric question keys. Statistics checks independently enumerate every numeric case and retain the whole-population denominator.

## Catalogue and source expansion

The twelve-course catalogue uses illustrated connected learning paths, subject and progress filters,
multi-word search, saved URL state, keyboard access and an explicit empty result. Course roadmaps
use staggered dimensional pedestals, module levels, an original companion and a selected-lesson
Start tray. Completion changes the pedestal from current to earned; untouched nodes do not imply
earned progress. The phone Start tray anchors above navigation even when a long course overview
extends below the fold; the final stop has reserved scroll space. Manual and OS reduced motion
apply to entrance and roadmap motion.

Active lessons ask before revealing the worked explanation. Computed statistics results and
markers, worked geometry measurements and numerical mechanics results stay concealed before grading. Outcome tables retain accessible source data; constructed
samples are identified as comparisons rather than random draws. SQL input tables are available
in a disclosure beside the compared query and its actual result.

Expansion records preserve the sixty-topic map, fifteen named science
subfields, technical curricula, fifteen sanitised source bodies, all 160 top-level knowledge-note titles and
three BigQuery notes. Top-level pagination is complete; nested child-page discovery and course coverage
remain incomplete. The Physics child note was discovered separately under Mathematics.
SQL and Advanced SQL now record partial reporting-course coverage, with database-management,
schema changes, data mutation, procedures and wider dialect topics still required. Python records
partial parent-curriculum coverage: the introductory guide and three construction projects are
implemented, while random sampling, larger datasets, environment setup, advanced structures,
inference and machine learning remain. Geometry
now records partial introductory coverage, with the rest of the subject explicitly outstanding.

## Linear Algebra release

Before loading the course, SQLite's online backup created
`data/backups/discere-before-linear-algebra-release-20261002T031507Z.sqlite`; source and backup
integrity were `ok`. The rebuilt managed preview serves twelve active courses and 152 lessons.
Every prior row fingerprint remains unchanged. Study summary and preferences, including sound,
are identical. Twenty unstarted concept rows were added (152 to 172). The live interface initialised forty
unintroduced recall-card rows (282 to 322), with none entering the due queue. No owner attempt, course-check or SQL/Python project session/action was created.
All twenty new journeys conceal marking authority. Placement is available; mixed and delayed
checks remain locked. The original thirteen published bundles are unchanged byte for byte.

Linear Algebra records map the nine source-outline
parts, record all 195 independently audited numeric keys and retain responsive review, the
source/asset hashes and substantial remaining proof, dimensional and spectral scope.

## Verification

The current Home/You checkpoint passes `pnpm check`: lint, strict typechecking, 1,295 package tests
and validation of fourteen stored bundles (twelve active and two archived). Production build/CSP,
Python runtime readiness, doctor and the isolated full-stack smoke check pass. Smoke delivers all
152 active lessons and retains checks for unseen-card exclusion, saved prototype routes, images,
essays, notebooks, tutoring, scheduling and single-origin serving.

The complete 113-scenario browser run passed 112 scenarios; one obsolete Progress summary-text
assertion failed. After its repair and responsive refinements, all seventeen affected Home,
journey and reward/sound scenarios passed together. Four Home/You scenarios passed again after
the final completed-course action refinement. The full suite was not repeated afterwards.
The earlier 109-scenario run and six affected Linear Algebra scenarios remain recorded in the
Linear Algebra release evidence.

The browser evidence covers question-first teaching, correction and continuation, earned sound
and green feedback, fresh recall, saved completion, keyboard roadmaps, filters, all twelve
courses' lesson openings and independent checks, actual SQL/Python construction, early Exam
submission, immutable first responses, the seven-day interval and both motion preferences.
The new Linear Algebra run tests every lesson at three sizes, all sixty check answers, actual
row operations, transformation/SVD controls and rectangular factor shapes.

Responsive assertions check horizontal containment, first response fields above the footer and
the scrolling pane inside the earned frame. Representative images were inspected against
George's three references. Six read-only captures of the owner preview's Linear Algebra roadmap
and opening lesson at 1440×900, 1024×768 and 390×844 produced no page errors or attempted mutations.

[Experience captures](../brilliant-experience/README.md) and
Linear Algebra evidence retain the images, sources,
exact review hash and model limits. Owner release checks confirm twelve discoverable courses,
concealed marking authority, enabled requested sound and unchanged prior study rows/preferences.
Twenty unstarted concept rows and forty unintroduced recall-card rows were added; attempts, course checks and project histories
remain empty. Package/browser/smoke tests use disposable databases.

On 11 November 2026 the browser suite was rewritten to play lessons from their content. Its
last full run passed 97 tests and skipped one, in about 18 minutes.
[The browser test status](../testing/e2e-status.md) lists what each spec covers and the four bugs
the rewrite found. The counts in the paragraphs above are from earlier suites.

Use `pnpm run doctor`: plain `pnpm doctor` resolves to pnpm's builtin. Chromium uses libraries
unpacked beneath `/tmp/discere-browser-libs`, without a system installation. The existing large
main-chunk warning remains a performance task. Physical devices and learning outcomes were not
measured.

## Remaining product work

- All twelve playable foundation courses have placement, mixed checkpoints and delayed transfer.
  Wider programming and proof construction, fresh delayed project reassessment and a documented
  learner trial remain necessary.
- Logic handles authored terms, values, assignments and choices. Open-ended proofs and argument
  construction need stronger assessment.
- Learner-owned card collections, edit history, generation lineage and collection ordering remain.
- Flexible panes and revision comparison remain; the consistent dark theme and original companion
  are now implemented.
- The writing engine does not implement every normative editorial rule.
- All sixty source-map topics, named science subfields, technical curricula and optional pathways
  remain required. Source inventories and introductory overlap do not satisfy full implementation.
- A documented learner trial remains necessary.

The broader curriculum request remains unfinished. George's 2 October clarification restores
continuing implementation after the requested status pause. This checkpoint does not claim
finished Brilliant parity.

### 2 October 2026 — production readiness and full-course trial

The production readiness report records release serving and caching, verified online backup/new-path recovery, process identity checks, route/math loading, grading robustness and learner-discovered coordinate/completion repairs. This pass adds no new material and preserves all 23 owner tables and study preferences. A private learner completed all six Maths Foundations lessons, 12 fresh recall cards, the eight-question mixed check and a genuinely due recall after two service restarts. The populated recovery drill preserves that history plus a note and preferences.

Final validation is 1,490 package tests plus two lifecycle tests, build/CSP and smoke, the 121-test Chromium suite and focused reruns. Native Windows automation failed to initialize; recorded Chromium is the actual learner evidence. Heard audio, physical-device/cross-browser acceptance, independent subject review and measured learning outcomes remain unverified. This local release hardening does not certify the broader curriculum backlog or Brilliant parity.
