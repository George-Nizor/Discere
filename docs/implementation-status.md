# Implementation status

Updated: 2026-10-02

The second learner pass is complete and running locally. Chemistry, Probability, Computer
Science, Calculus and a later Maths module were read and completed through rendered UI. It
repaired three false-negative answers, made recall explain immediately after submission, replaced
internal topic labels, compacted computing traces at three widths, and simplified the companion
tutor handoff. All 1,468 package tests, content validation and build pass; 83 affected browser
scenarios, 20 final focused cases and two final tutor cases pass. Every owner row and preference
is unchanged. [Second critical learner assessment](learner-review/second-pass/README.md) records
manual coverage, evidence, remaining pacing/tutor criticisms and computer-use/audio limits.

The final learner walkthrough and repairs are complete and running locally. Five complete modules
across Maths, Biology, Physics, Logic and Python, plus real Python/SQL project tasks and delayed
recall, were read and answered through rendered UI in private learner profiles. The review repaired
unit marking, candidate diagrams, finite review progress/reload, small-screen answer fields and
learner copy. All 1,454 package tests and the production build pass. The affected browser suite
passed 27 scenarios, with all nine Physics/Foundations scenarios rerun after the final correction.
Owner rows and preferences remain unchanged. [Critical learner assessment](learner-review/README.md)
records the exact coverage, evidence and computer-use/audio limitations.

The navigation-motion release is complete and running locally. Main tabs, Settings and lesson
entry now share fades and a stable navigation frame; the active marker travels between tabs,
course and period selections transition locally, and artwork settles into place. Normal-speed
recordings were inspected at desktop, tablet and phone sizes. Final package checks, production
build, 53 affected-route browser scenarios and read-only checks of the served app pass. Existing
owner rows and preferences are unchanged. [Motion evidence](motion-polish/README.md) records exact
run results, recordings and validation limits.

Discere now has twelve active courses in Maths, Geometry, Linear Algebra, Calculus, Physics, Chemistry, Biology, Logic, Computer Science, introductory Probability and Statistics, SQL reporting, and Python data analysis. George's latest 2 October direction closes new-material work for this release. The existing library is the quality and verification scope; wider Notion topics and technical curricula remain a documented future backlog.
The full product target remains in [the roadmap](product-goal-and-library-roadmap.md).

The current-library quality release is complete and running locally. It improves 120 hint sets,
63 explanations and thirteen question contexts, corrects logic diagrams and negation marking,
repairs Settings status/recovery and its connection-test request, and fixes dark-theme contrast.
All 1,439 package tests pass; all 115 browser scenarios have passing latest results after focused
repairs. The live API serves all 152 lessons without private marking fields, and every saved row
and preference is preserved. See [the quality release](quality-pass/README.md) for exact evidence,
including combined browser-run results and the remaining validation limits.

George’s 2 October homepage request adds Home, Courses and You as the main tabs. Home now has
an illustrated course selector, real saved resumption, daily practice and new-course suggestions.
You adds recorded weekly summaries, calendar-period filters, answer accuracy and activity charts.
[Homepage release records](home-redesign/README.md) retain the responsive and data-preservation evidence.

## Scope and delegated decisions

George's 1 October request supersedes the earlier Roman reference direction for the active
product. [The experience notes](brilliant-experience/README.md) record the supplied Brilliant
screenshots, public reference study, original artwork, and question-first teaching flow.
The earlier Roman recovery remains an archived compatibility flow.

All work is inside Discere. Instrumenta and Claude's wrapper work were not edited. The learning
core remains independent of the wrapper and model vendor. No OpenAI API integration or paid
dependency was added.

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
Roman and Electronics prototypes are archived from discovery, home suggestions and general
review. Saved routes and records remain accessible. The fourteen stored bundles contain 160 lessons;
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
[Project records](sql-projects/README.md) explain the runtime boundary and remaining scope.

Python for Data Analysis adds 21 lessons from George's Python for Data Analysts guide, covering
core Python, NumPy, pandas preparation and report auditing. All 168 original examples were
executed with CPython 3.12.14, NumPy 2.3.5 and pandas 3.0.1; 105 separate programs verify numeric
question and recall keys. The browser replays reviewed steps, variables, tables and output, with
case selection, pause/reset and reduced motion. Three separate construction projects now add
22 learner-written programs and 66 reviewed dataset cases through isolated CPython execution.
[Python records](library-expansion/python-course.md) map the source sequence;
[project records](python-projects/README.md) retain the executable work and its limits.

Geometry: Shape and Space adds twelve lessons in angles, measurement, area, scale, coordinate
distance, volume and box surface area. Learners compare exact shapes, add guides and unfold nets.
Independent tests recompute all 112 numerical question, recall and course-check keys. Three
12-problem checks provide placement, mixed practice and applications after seven days. The course
covers introductory geometry; proofs, congruence, constructions, trigonometry and the wider subject
remain. [Geometry records](library-expansion/geometry-course.md) retain scope, sources and evidence.

Physics: Motion and Forces adds eighteen lessons in one-dimensional motion, forces, work, energy,
power, impulse and sticking collisions. Fourteen deterministic models support 72 interactive beats
and 144 cases, with finite playback and keyboard controls. All 162 numeric lesson, recall and check
keys were independently recomputed. Three 18-problem checks cover every lesson, including applications
after seven days. [Physics records](library-expansion/physics-course.md) retain primary sources, the
corrected Notion momentum formula, responsive visual review and the remaining mechanics scope.

Diagrams include number machines, equation balances, coordinates, truth tables, editable program
traces, searches, statistics models, query comparisons, Python execution playback and exact
geometry drawings with shape comparisons and folding box nets, plus bounded mechanics simulations. The bounded
browser teaching interpreter has no `eval` or host access. Teaching examples replay reviewed
executions; separate Python construction projects run learner programs through the isolated
CPython boundary. Project grading checks the authored task's independently specified private cases.

All new prose, datasets, exercises, code, SVG covers and companion artwork are original.
Source records retain exact sections, access dates, licences and intended reuse.
OpenStax is reference-only; no source prose or media was copied into these courses.
[Foundation notes](foundations/README.md) and [expansion records](library-expansion/README.md)
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

## Learner interface and authority

Catalogue, roadmap and lesson share one dark neutral and green theme. Active lessons present
the title, question, useful visual and response before the authored explanation. Checking a correct
response earns a full green frame, a quiet original sound, an optional Why explanation and Continue.
A mistake opens its correction and permits continuation while retaining failed correctness and
assisted evidence. A reserved footer keeps controls and explanations clear of answers; long
questions scroll inside their pane. Two labelled skills checks lead into two fresh recall cards.

Course, lesson, notebook, tutor, sources, reading, review, and progress routes remain available.
Lesson recall is scoped to its authored cards and visits every card. Teaching-step position,
answers, notebook work, tutor history, and review sessions survive refresh.

Public lessons omit answer keys, authored hint text, correct activity ordering, graph tolerances,
and marking rubrics. Questions expose only the number of available hints; permitted hint requests
retrieve text through the server and record assistance. Exam cannot request hints. Tutor question
bindings use the same projection.
Diagram selections, ordering, and plotted answers are assessed on the server. Numerical marking
supports dimensionless values, exact fractions, and Unicode minus. Text matching preserves
operators and uses whole terms with explicit negation; it is not a general semantic or proof grader.

Modes lock per attempt and review session. Completed attempts and first recall responses are
immutable. Coach, Assisted, Direct, and Exam permissions are enforced on the server. Tutor requests
and pasted replies bind to the active question in the owned lesson. Accepted help before a first
answer creates a pending attempt; the later response retains assisted evidence. Generated prose
passes the writing engine, including checks for leaked dimensionless numbers and fractions.

Maths provides an optional six-problem placement check, an eight-problem mixed challenge after
all required lesson stages, and six new applications seven days after that challenge. Each check
withholds marking until the complete set is submitted, records confidence separately and recommends
lessons for missed ideas. First responses are immutable; exact-definition snapshots preserve
in-progress and historical results across content changes. Due applications appear in Review.
The checks earn bounded response XP without awarding lesson completion or concept mastery.
[Course-check records](course-checks/README.md) retain sources, the reviewed Maths 1.1 hash and
full learner-flow evidence. Geometry adds twelve-problem sets for all three check kinds, covering
each of its twelve lessons. Fresh retake forms remain future work.

A client progress write or completion deep link cannot finish an unanswered lesson. Completion
requires recorded question evidence, required stages, and all lesson cards rated. Wrong, blank,
ungraded, or Direct recall remains assisted even when rated Easy; FSRS caps it at Hard. Older cards
without marking authority remain reviewable but cannot claim verified independent recall.

FSRS scheduling, interleaved queues, streaks, XP, independent/assisted evidence, transfer records,
essay autosave, and workings notebooks remain separate records.

## Practice, rewards, and motion

Daily goals support three, five, or ten meaningful responses, or a finished lesson. Streaks use
local calendar dates and stay separate from goals: one meaningful lesson answer, transfer, or
completion qualifies; a review-only day needs three different due cards. Every seven real study
days earn one automatic streak protection, with two held at most. Protected dates remain visibly
separate from practice. Preferences persist on the server.

XP now comes from actual recorded answers, due recall, transfers, and a once-only verified lesson
finish. Reopening stages earns nothing. Per-question rewards are bounded across attempts; a
self-correction can earn the remaining difference. Duplicate review tabs cannot advance the card's
schedule twice. Answer evidence and mastery remain separate from XP.

The home goal and weekly rhythm, connected course path, seven earned milestones, and lesson result
use server records. Completion shows actual lesson XP, responses without help, recall, level
progress, and the next lesson. Home also advances to the next unfinished lesson.

Answer feedback, beat changes, recall reveal, SVG award drawing, finite particles, and XP count-up
are implemented. Fresh completion animates once; reload and bookmarks retain the static result.
Manual and operating-system reduced motion apply immediately, including SVG transitions and
scrolling. Fresh preferences enable quiet original sound cues; saved mute is respected and can be
changed in the lesson. Each new correct response plays even after its bounded reward is exhausted.
All primary actions remain available during animation. Rapid submissions have synchronous in-flight guards and recover after
network failure.

[Gamification notes](gamification/README.md) record reward policy, motion, design references,
24 desktop/tablet/mobile captures, and a normal-motion browser recording. This is an implemented
and tested refinement, not a measured claim of commercial parity or retention improvement.

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

[Expansion records](library-expansion/README.md) preserve the sixty-topic map, fifteen named science
subfields, technical curricula, fifteen sanitised source bodies, all 160 top-level knowledge-note titles and
three BigQuery notes. Top-level pagination is complete; nested child-page discovery and course coverage
remain incomplete. The Physics child note was discovered separately under Mathematics.
SQL and Advanced SQL now record partial reporting-course coverage, with database-management,
schema changes, data mutation, procedures and wider dialect topics still required. Python records
partial parent-curriculum coverage: the introductory guide and three construction projects are
implemented, while random sampling, larger datasets, environment setup, advanced structures,
inference and machine learning remain. Geometry
now records partial introductory coverage, with the rest of the subject explicitly outstanding.

## Roman recovery

Gates 1–3 were approved previously. Gate 4 retains server-owned essay prompts, evidence, rubrics,
excerpt-linked feedback, revision, and finish. Gate 5 adds concealed recall, typed response, server
assessment, reveal, four ratings, scheduling, due-only restart, and completion based on actual work.

Reference progress is v4, with validated upgrades from v1–v3. Impossible rows fall back safely;
reads do not persist upgrades. Exam requires a response before recall reveal. The reference flow
still awards no catalogue completion, XP, or general mastery. Its Stage 3 → Stage 7 jump is explicit:
Stages 4–6 are absent. Completion continues into the existing next Roman lesson.

Nine new recall/completion captures accompany earlier essay screens at 1440 × 900, 1024 × 768,
and 390 × 844. [Visual comparison](recovery-v2/visual-comparison.md) records deliberate deviations.

## Subscription tutoring

The configured Codex CLI subscription provider passed a live readiness probe and an actual
accepted Coach reply, through the supported local CLI rather than API billing. Session IDs and
visible history remain local and lesson-scoped. Timeouts, bounded concurrency, permission checks,
writing checks, and malformed-session recovery remain enforced.

The companion provider prepares packets for manual ChatGPT use and validates pasted replies.
Direct ChatGPT MCP hosting compatibility was not proven in this session. Image generation and
image-backed live notebook review were not newly verified against the subscription.

Calculus adds twelve lessons with limits, polynomial derivatives, chain rules, turning points,
antiderivatives, signed integrals and net change. Its 48 visual beats and 36 independent checks
use original bounded graph models. All 108 numerical keys were independently recomputed.
[Calculus source corrections and verification](library-expansion/calculus-course.md) retain the
accepted review, original asset hashes, responsive screenshots and remaining calculus scope.

Chemistry adds twelve lessons, 72 questions, 24 recall cards and 36 fresh assessment problems.
Its seven bounded model kinds support atoms, ionic ratios, Lewis structures, formula groups,
molar amounts and reactions. All 108 numerical keys were recomputed independently, and all
48 teaching beats were exercised at three sizes. [Chemistry records](library-expansion/chemistry-course.md)
retain the empty Notion note, primary sections, corrections, review hashes and remaining subject scope.

Biology: Cells to Ecosystems adds sixteen lessons, 96 questions, 32 fresh recall cards and 48
independent checks. Ten models connect cells, energy, inheritance, evolution and ecology. All 64
teaching beats and 128 cases work at three sizes. Eighty-one numeric keys were recomputed, and
95 term/choice answers were reviewed. Equivalent scientific terms are explicitly supported.
[Biology records](library-expansion/biology-course.md) retain the source-note correction, review,
model limits, screenshots and substantial remaining subject scope.

Logic, Computer Science and Probability/Statistics now add 60 independent problems across
placement, mixed and seven-day delayed sets. Every set covers every taught lesson. Their new
statement, code and dot-plot visuals expose given data without calculated answers. All 33 numeric
keys were independently recomputed, 27 choice keys reviewed, and every response exercised at three
sizes. Existing teaching content has unchanged recorded fingerprints.
[Foundation assessment records](course-checks/foundation-expansion.md) retain the sources,
publication hashes, screenshots and remaining proof/programming scope.

SQL and Python now add 108 fresh problems: fifteen SQL and twenty-one Python questions in each
of placement, mixed and seven-day delayed sets. Every set covers its taught course. All 45 SQL
queries were executed against displayed input tables, and all 63 Python probes ran in the recorded
CPython/NumPy/pandas environment. Earlier teaching content and art have unchanged fingerprints.
[Data assessment records](course-checks/data-expansion.md) retain exact hashes, sources, responsive
captures and the remaining independent programming scope.

Before loading the SQL/Python checks, SQLite's online backup created
`data/backups/discere-before-data-checks-20261001T221750Z.sqlite`; source and backup integrity
were `ok`. After the managed preview restarted, every prior row fingerprint, table count, study
summary and preference was unchanged. Attempts and check sessions remain zero, and stored review
cards remain 282. Read-only checks reached all 36 affected lesson journeys without answer authority
and confirmed all eleven active courses now expose 398 check problems. SQL has 15/15/15 and Python
21/21/21, with placement available and mixed/delayed checks correctly locked for this learner.

## SQL construction release

Three reviewed SQL projects add fifteen learner-written queries and 45 checked datasets. The
server saves drafts and snapshots, compares actual SQLite results, preserves repeated rows and
NULL semantics, and enforces assistance and Exam privacy. Explicit early Exam submission grades
submitted work and leaves unfinished drafts unanswered. Projects earn bounded XP without creating
lesson completion or concept mastery. [Project records](sql-projects/README.md) document the scope,
exact review hash, isolated runtime and desktop/tablet/phone captures.

Before applying migration 0007, online backup created
`data/backups/discere-before-sql-projects-20261001T232409Z.sqlite`; source and backup integrity were
`ok`. The managed preview now serves all three projects. Every pre-existing row fingerprint,
study summary and preference was preserved. Only the migration ledger gained a row; the two new
project tables are empty. Attempts and course-check sessions remain zero, review cards remain 282.
Live read-only screens have consistent dark backgrounds and no overflow or page errors.

## Python construction release

Three reviewed Python projects add 22 learner-written programs and 66 independently specified
cases, covering all 21 published introductory lessons. CPython 3.12.3, NumPy 2.3.5 and pandas 3.0.1
run inside mandatory Linux namespaces, read-only runtime mounts, bounded resources and syscall
controls. Run exposes the supplied case; Check also grades two private datasets. Required function
tasks invoke the learner's actual function. Drafts, alternative programs, corrections, confirmed
worked solutions and early Exam completion follow the existing server-owned permission rules.
Bounded XP records independence and assistance without creating lesson or mastery evidence.
[Project records](python-projects/README.md) and [ADR 0005](adr/0005-isolated-python-projects.md)
retain exact review hashes, isolation limits, setup requirements and responsive captures.

The managed preview was restarted after a verified online backup at
`data/backups/discere-before-python-projects-release-20261002T012816Z.sqlite`.
Source and backup integrity are ok. Every saved row fingerprint and count, study summary and
preference was identical after restart. The owner has no Python/SQL project sessions or actions;
review cards remain 282. Read-only live introductions and roadmaps pass all three sizes with no
overflow or page errors and visible Start actions.

One earlier API test used the default database by mistake and created a single empty Python
session. It submitted no actions, answers or rewards. After backup, only that unchanged empty
session was removed and every prior row was verified unchanged. The test now asserts an in-memory
database. The cleanup backup is
`data/backups/discere-before-python-test-cleanup-20261002T005155Z.sqlite`.

## Linear Algebra release

Before loading the course, SQLite's online backup created
`data/backups/discere-before-linear-algebra-release-20261002T031507Z.sqlite`; source and backup
integrity were `ok`. The rebuilt managed preview serves twelve active courses and 152 lessons.
Every prior row fingerprint remains unchanged. Study summary and preferences, including sound,
are identical. Twenty unstarted concept rows were added (152 to 172). The live interface initialised forty
unintroduced recall-card rows (282 to 322), with none entering the due queue. No owner attempt, course-check or SQL/Python project session/action was created.
All twenty new journeys conceal marking authority. Placement is available; mixed and delayed
checks remain locked. The original thirteen published bundles are unchanged byte for byte.

[Linear Algebra records](library-expansion/linear-algebra-course.md) map the nine source-outline
parts, record all 195 independently audited numeric keys and retain responsive review, the
source/asset hashes and substantial remaining proof, dimensional and spectral scope.

## Home and You release

George's 2 October homepage request is implemented. Home, Courses and You are the three primary
tabs; Home centres a selectable illustrated course, real progress, original lesson pedestals and
the saved Start/Resume action. Finished courses open their roadmap. You adds the weekly summary,
calendar-period statistics, a keyboard-readable chart and course progress. Old Progress links
redirect with their query and fragment intact. Leaderboards and the bottom chat panel are absent.

The managed preview was restarted after the online backup at
`data/backups/discere-before-home-redesign-release-20261002T044132Z.sqlite`.
Source and backup integrity are `ok`. Every saved row fingerprint, table count, study summary and
preference stayed identical after restart and six read-only live captures. No owner attempts,
checks or project records were created. [Home release records](home-redesign/README.md) retain
the responsive captures, statistics definitions, test results and preservation metadata.

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

[Experience captures](brilliant-experience/README.md) and
[Linear Algebra evidence](library-expansion/linear-algebra-course.md) retain the images, sources,
exact review hash and model limits. Owner release checks confirm twelve discoverable courses,
concealed marking authority, enabled requested sound and unchanged prior study rows/preferences.
Twenty unstarted concept rows and forty unintroduced recall-card rows were added; attempts, course checks and project histories
remain empty. Package/browser/smoke tests use disposable databases.

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
- Archived Roman Stages 4–6 remain unfinished historical work; the prototype is outside active
  production discovery.
- A documented learner trial remains necessary.

The broader curriculum request remains unfinished. George's 2 October clarification restores
continuing implementation after the requested status pause. This checkpoint does not claim
finished Brilliant parity.

### 2 October 2026 — production readiness and full-course trial

The [production readiness report](production-readiness/README.md) records release serving and caching, verified online backup/new-path recovery, process identity checks, route/math loading, grading robustness and learner-discovered coordinate/completion repairs. This pass adds no new material and preserves all 23 owner tables and study preferences. A private learner completed all six Maths Foundations lessons, 12 fresh recall cards, the eight-question mixed check and a genuinely due recall after two service restarts. The populated recovery drill preserves that history plus a note and preferences.

Final validation is 1,490 package tests plus two lifecycle tests, build/CSP and smoke, the 121-test Chromium suite and focused reruns. Native Windows automation failed to initialize; recorded Chromium is the actual learner evidence. Heard audio, physical-device/cross-browser acceptance, independent subject review and measured learning outcomes remain unverified. This local release hardening does not certify the broader curriculum backlog or Brilliant parity.
