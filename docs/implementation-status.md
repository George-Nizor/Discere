# Implementation status

Updated: 2026-11-13

Release 1.17.0 adds two new courses, How the Body Works and The Roman Republic, each planned from a pack of fetched sources and written in the approved voice. It also rewrites the questions of fifteen more courses: Linux, Software Testing, Software Design, Game Design, Data Engineering, Analytics Engineering, Decision Theory, The Web, Computers and Networks, AI-Assisted Engineering, Industrial Design, Small Buildings, Technical Writing, and Speaking, Argument and Debate.

Release 1.16.0 rewrites the questions of DevOps and Delivery, Cloud Fundamentals, Machine Learning and MLOps, System Design, UX and HCI, and Backend and API Design as situations to judge: a pipeline log, a policy and a request, a confusion matrix, a dashboard that hides its tail, a screen description, two requests racing. Right answers in the earlier rewritten courses no longer stand out by length, and a shared test keeps it that way.

Release 1.15.0 rewrites the questions of Music Theory, First Aid, Reading and Research, and Git and Version Control. Music Theory works from note names and progressions, First Aid asks scenario questions with every fact taken from its guidelines, Reading and Research puts passages and a headline beside its data in front of the learner, and Git shows real command output and asks what to do next.

Release 1.14.0 rewrites the questions of Philosophy, Psychology, Drawing and Visual Art, and Linguistics to put primary texts, studies and language data in front of the learner, with order and sort questions, and adds the tutor's Show me walkthroughs (issue #33, learning by being shown):

- **Show me.** The tutor panel offers "Show me a similar one" when the question box is empty. It
  asks for a parallel example worked step by step (`intent: "show"`), and the tutor is given the
  lesson's figure as `figureTemplate`. Each `walkthrough` step may carry a figure of the same type
  with the example's values. The server keeps a figure only when it parses as a figure, matches
  the lesson figure's type and differs from it, and drops it with a warning otherwise, so the step
  still reads as text. Every step's text passes the same answer-leak check as the reply. It counts
  as tutor assistance, and Exam mode still has no tutor. The tutor prompt now works an example
  first when the idea is new to the learner. The tutor also now accepts questions from a lesson's
  opener and from worked-example blanks, which it used to refuse.
- **Review after help.** A question answered right after a miss, a hint, the tutor or Direct mode
  now comes back in review the next day, as a missed or revealed one already did.
- **Teaching notes.** `pnpm teaching:notes` lists faded examples whose only blank is the last
  line (`FADED_ONLY_LAST_LINE`, 239 steps) and transfers that read like the previous try with new
  numbers (`TRANSFER_SAME_TEMPLATE`, 27 steps). They are lessons to reread, not errors, and are
  kept out of `validateCourseBundle` so they never touch a course's editorial approval. No
  content was changed.

Release 1.13.1 is 1.13.0 with a longer time limit for the content tests, so the release build passes on GitHub. Release 1.13.0 adds practice. The five writing courses end each lesson with an optional writing
task that the tutor marks against its criteria, and a piece can be revised and sent again. Python
for Data Analysis and SQL: From Rows to Reports have exercises in every lesson, and TypeScript and
Node.js in its first five, run in the sandbox and marked by tests, with unlimited tries. Every
lesson lists its sources, all 883 source addresses were checked, and 18 thinly sourced courses were
given specific pages and checked against them. History asks about real extracts and has order,
sort and source-pair questions. Questions that marked wrongly were fixed, the server refuses
requests from outside the computer, and the database is copied before a migration.

Release 1.12.0 checks every question against what its format is for. Each of the roughly 7,800
questions in the 65 courses was kept, fixed or converted, with the reason recorded. Faded examples
now leave out a real step of a method the lesson has just shown; the ones that only asked for a
conclusion became ordinary questions. Free text is kept for recalling a single named term, because
the marker matches phrases, and everything else is multiple choice or a number. Questions that
repeated the teaching's own example or printed their answer got new cases, and correct options no
longer stand out by length. The marker no longer finds a number inside a longer one and keeps
sharps and flats, a faded example's question reads as the question, and short answers get a
one-line box.

Release 1.11.2 is a full read of every lesson. Sixteen reviewers read each screen, question,
hint, reveal, worked answer, feedback line and card in all 65 courses as a learner would, and made
1,406 corrections: context the trim had cut and a later line relied on, facts and arithmetic,
hints and reveals written for an earlier version of their question, giveaways, questions the lesson
never prepared for, missed code formatting, and hover notes citing renamed screens.

Release 1.11.1 fixes what a spot check of sixteen random lessons found: two passages the trim
had cut that a recap and a definition relied on, three factual slips (carbon-14, a linked-list
insert, where the bending moment peaks), two opener figures that showed a later answer, and a few
unclear sentences.

Release 1.11.0 makes each teaching screen as long as its idea needs. George read two lessons with
easy screens shortened and hard ones left whole, and found them better to read. Every course now has
that treatment: easy and moderate screens lost the sentences that restated a point, described the
figure or previewed another screen, and the core screens of each lesson are unchanged. Teaching
text is 19% shorter across the 65 courses. The validator's floor for a teaching screen is now 30
words, down from 80, and the voice guide no longer sets a fixed length.

Release 1.10.0 changes how a lesson screen reads. Every teaching screen in the 65 courses now has
a short title naming its topic. The old heading was a sentence that summarised the screen, and the
paragraph below often repeated it. Worked and faded examples keep their problem as the heading, set
as the task in bold body text. In the 28 software courses, code in lesson text, prompts, choices,
hints, feedback and cards is shown as inline code, and a prompt with code on lines of its own shows
those lines as a code block. The release also fixes rendering faults. Two prices in one sentence
were typeset as an equation, and a `*` inside code was read as italics. Hints, feedback, activity
text and flashcards printed raw markup. Figures were scaled to 78%, which put their labels near
11px. A choice list could mix the mono and interface faces, and runs of spaces in code collapsed.

Release 1.9.9 fixes 71 screens in 38 courses that referred to "the figure" or "the diagram"
without having one: each now points to where the figure is or says its content in words. The
smoke test's leaked-answer check follows the maths skill check that changed in 1.9.8.

Release 1.9.8 is the giveaway pass. A learner agent taking Earth and Environmental Science found
that many questions asked for a number the learner had just read, because a teaching screen or
figure had worked the same case, and that some predict screens came after the screen that answered
them. scripts/giveaway-check.mjs finds such questions; every course was then read and fixed, by
changing the example on the teaching side or the numbers in the question, moving predicts before
the idea, and turning worked-example lines that printed their own answer into blanks. Terms used
before they were explained are now defined where they first appear, and a handful of facts were
corrected along the way.

Release 1.9.7 marks units as a keyboard types them: 238 W/m2, 2 m/s^2 and 36 GtCO2 now count
as W/m², m/s² and GtCO₂ (64 numeric questions across nine courses use such units). It also
corrects two facts in Earth and Environmental Science. Both came from the first learner-agent
run, which takes a course through the learner-safe API with scripts/learner-run.ts.

Release 1.9.6 finishes the fix pass: every remaining course now has an introduction about its
subject instead of a list of lessons, openers that start on something concrete and give nothing
away, question screens without a lead that repeats the question, and choice questions where the
learner judges between options (predict screens ask for a rough outcome). Choice options are
reordered across every course so the correct one is not usually first (it was first in 47% of
questions, now 29%); options keep their ids, so recorded answers still point at the same option,
and course-check items keep the order their review approved.

Release 1.9.5 carries the fix pass to fifteen more courses: Maths Foundations, Geometry,
Trigonometry, Linear Algebra, Calculus, Calculus II, Probability and Statistics, Statistical and
Causal Inference, Logic and Reasoning, How Computers Solve Problems, How Computers and Networks
Work, Data Structures and Algorithms, Rust Foundations, Git and Version Control, and Linux and the
Command Line. Questions replaced during the pass stay in the bundles, unasked, so learners'
history resolves, and old course tests that pinned a replaced answer are trimmed to match.

Release 1.9.4 starts the fix pass George asked for after learning from the new courses. The rule
capping multiple choice at 35% of a course is removed, since writers met it by turning
conceptual checks into counting puzzles; a question screen no longer needs a lead, which had
made writers retell the question above it; and voice-check now rejects a lead that repeats its
question, filler instructions and syllabus-style course introductions. Software Design and
Architecture is fixed throughout, as the model for the other courses
(`docs/writing-calibration/fix-pass/brief.md`).

Release 1.9.3 fixes starting a course again, which failed in the app with "Discere could not
complete the request": the web client labelled every request as JSON, and the server refuses a
JSON request with an empty body, which a DELETE has. The client now sends the header only with a
body. The control moves into the course overview, under the progress line, and the course checks
and projects move under the lesson path, so the two columns of a course page end at about the
same height.

Release 1.9.2 archives Drawing and Visual Art Fundamentals, because Delineare already teaches
drawing; the course stays in `content/` for saved history and leaves the library. The plan for
testing the courses with learner agents is `docs/learner-agent-testing-plan.md`, ready to start.

Release 1.9.1 adds two controls George asked for while trying the new lessons. A course he has
started can be started again from its page: every lesson forgets its place and its finished
stages, and course checks are cleared, while XP, review cards and past answers are kept
(`DELETE /api/courses/:courseId/progress`). Inside a lesson, Back returns to the previous screen;
a screen answered during the visit can be passed again without answering twice.

Release 1.9.0 completes the expansion: every course in `docs/expansion-plan-2026-11.md` is
written, so Discere has 66 courses. This release adds Reading and Research, Linguistics, Writing
Longer Pieces, Decision Theory, Speaking, Argument and Debate, Creative and Game Writing, Music
Theory, Sound and Audio Fundamentals, Drawing and Visual-Art Fundamentals, and First Aid. First
Aid was checked against the IFRC 2025 guidelines, the ERC 2025 guidance, AHA 2025 abstracts and
the British Red Cross, with page references; where they differ the lesson names both.

Known gaps found while writing, for later:

- The new lessons have not been played in the running app.
- The text matcher drops sharp and flat signs, so Music Theory writes accidentals as words.
- `language_explorer`, `inference_explorer` and `timeline_explorer` figures are untested in the
  new courses; most writers drew `svg_figure` instead.
- The review-card pass (expansion plan, section 1) is still to do.

Release 1.8.0 completes the Making wave with Small Buildings and Architectural Design and brings
the maths and science wave: Trigonometry, Statistical and Causal Inference, Earth and
Environmental Science, Physics II: Waves, Electricity and Heat, and Calculus II: Series and
Differential Equations. History is the first of the humanities wave. Climate figures in Earth
science were confirmed against NOAA, IPCC AR6 and USGS, and history dates were confirmed or left
out.

Release 1.7.0 is the expansion's fourth wave (TypeScript and Node, UX and Human-Computer
Interaction, Game Design and Programming Patterns, Systems Programming, Technical Writing) and
most of the fifth (Mechanisms and Machine Design, Materials and Manufacturing, Control Theory,
Mechatronics and Robotics, Industrial and Product Design). Every course's openers now end on the
subject: 308 sentences that announced the lesson were deleted or rewritten, and `voice-check`
rejects them from now on. Review records of the reviewed courses are rebound with a note.

Release 1.6.1 is the expansion's third wave: DevOps and Delivery, Cloud Fundamentals, Software
Testing and Quality, Data Engineering, and Analytics Engineering and Data Governance, with The
Web and AI-Assisted Engineering from wave 4. (A v1.6.0 tag was pushed by mistake onto 1.5.0;
its release workflow refused it, so no 1.6.0 was published.) Every SQL
figure in the data courses now matches what SQLite returns (`scripts/check-sql-figures.py`),
which caught one row-order error in Databases.

Release 1.5.0 is the expansion's second wave: Data Structures and Algorithms, Linux and the
Command Line, Backend Development and API Design, Databases and Data Modelling, and
Cybersecurity, written and checked as for 1.4.0. Git and Version Control, also wave 2, shipped in
1.4.0. The agents corrected two curriculum errors (the umask rule, and a denormalisation example
whose question disagreed with it), and the certificate lifetime follows the CA/Browser Forum's
2026 rule.

Release 1.4.0 is the first wave of the expansion (`docs/expansion-plan-2026-11.md`).

- **New courses:** How Computers and Networks Work, System Design, Software Design and
  Architecture, Machine Learning from Models to MLOps, AI Engineering, AI Agents, and Git and
  Version Control (from wave 2). Each was scaffolded from its curriculum in `docs/curricula/`
  by `scripts/scaffold-course.mjs` and written by one Sonnet agent following
  `docs/writing-calibration/new-course/brief.md`.
- **Rust Foundations** grows from 2 to 16 lessons (`docs/curricula/rust-foundations.json`), with
  71 code questions and four projects, all compiled and marked in the sandbox by
  `pnpm rust:prepare`, which now checks the bundle instead of rebuilding it from
  `authoring/course.ts`.
- **Checking:** every course passes validation and loads as the server loads it
  (`scripts/check-course.ts`). The lead read lessons from each course against the voice
  examples, re-ran the agents' arithmetic and checked the history they stated from memory.
  Curriculum errors the agents found are corrected in the lessons. Numbers the curricula did not
  give, such as server capacities and prices, are labelled as assumptions or illustrations.
- **Library:** courses are grouped by subject area in the order a learner would take them.
- **Not done:** the new lessons have not been played in the running app. The other 40 courses
  follow in later waves.

Release 1.3.0 rewrites every course from its curriculum.

- **Lessons:** all twenty courses are re-authored from each lesson's objective in the two lesson
  voices George approved. The voices are `.claude/skills/discere-lesson-voice`. The writers were
  Sonnet agents, briefed by `docs/writing-calibration/authoring-brief.md`.
- **Checking:** the lead validated every course and confirmed that no reused question id
  changes how it is marked. It recomputed new answers and checked facts written from memory
  against its own knowledge, because the sources were unreachable from the cloud session. It
  rebound each review record, saying exactly what was checked.
- **Player:**
  - lesson text renders bold, italics and hover terms (`[[term|note]]`);
  - review cards that ask for an explanation are self-rated;
  - the finish screen offers "Next lesson";
  - eyebrow labels are gone;
  - every probability answer accepts a percentage.
- **Validator:** it keeps only its fact and answer-leak rules; style comes from the skill.
- **Not done:** the lessons have not been played in the running app, and the review cards are
  not rewritten. `docs/writing-calibration/backlog-2026-11.md` lists both, along with the
  remaining items.
- **Next:** the expansion plan is `docs/expansion-plan-2026-11.md`.

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

As of 2026-10-07 the checked-in library has 20 courses (233 lessons, 2,447 questions, 468 recall cards in `content/`). The figures below describe the original twelve, in Maths, Geometry, Linear Algebra, Calculus, Physics, Chemistry, Biology, Logic, Computer Science, introductory Probability and Statistics, SQL reporting, and Python data analysis. Later additions are Astronomy, Economics, Electronics Foundations, Engineering, English, Philosophy and Psychology. The Roman Empire placeholder course, counted in those figures, was removed on 2026-10-16 together with its Roman reference flow. George's latest 2 October direction closes new-material work for this release. The existing library is the quality and verification scope; wider Notion topics and technical curricula remain a documented future backlog.
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
The Roman course and its recovery flow were removed on 2026-10-16.

All work is inside Discere. Instrumenta and Claude's wrapper work were not edited. The learning
core remains independent of the wrapper and model vendor. That release added no OpenAI API
integration or paid dependency; an `openai-compatible` tutor provider has been added since (see
[the setup guide](setup.md)).

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
[Project records](sql-projects/README.md) explain the runtime boundary and remaining scope.

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
Each source record also says whether its address was checked (`checked`, set on 2026-11-11):
`verified` when the page was opened and is what the record names, `unreachable` when the address
no longer leads to it, `unchecked` when the site refuses automated requests or the link opens
something more general. `node scripts/check-sources.mjs --out <file>` requests every address
again; it needs the network, so it is run by hand and is not part of `pnpm check`. A lesson's
finish screen and the course page list the sources under "Sources".
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

Routes exist for home, the course list and each course, a lesson and its stages, the notebook, review
and review sessions, course checks, SQL, Python and Rust projects, the progress page at `/you`
(`/progress` redirects to it) and settings. The tutor, a calculator and the working page open in the
lesson's workbench rather than on routes of their own.
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

## Order, sort and source-pair questions

Added on 11 November 2026. A lesson question can now be answered by putting three to seven
items in order (`responseType: "order"`) or by placing four to ten items in two to four named
groups (`responseType: "sort"`). Any question except a code question can carry one or two
source extracts in `extracts`, each with an attribution in three parts (who, when, what kind of
document). Two extracts are a pair, labelled Source A and Source B, set side by side from 760
pixels and one above the other below that.

- Contracts: `OrderQuestionSchema`, `SortQuestionSchema` and `QuestionExtractSchema` in
  `packages/contracts/src/curriculum.ts`. An order question lists its items in the right
  sequence and a sort item names its bin. The learner's form of the question
  (`learnerQuestion`) gives each item an id made from the question id and the item's words,
  sorts the items by that id, and leaves out the bins and explanations, so nothing sent before
  the question closes holds the answer. Older bundles parse unchanged.
- Validation (`structuredQuestionIssues` in `packages/curriculum/src/validate.ts`): distinct
  items, every sort item in a bin that exists, every bin used, the fixed text authority, no
  choices or code, every part of an attribution present, and no extract written into the
  prompt as well.
- Marking (`apps/server/src/assessment.ts`): the server compares places. A wrong answer gets
  "3 of 5 are in the right place." or "2 of 5 are in the right group." and never which. An
  answer that is not whole (an item missing or repeated, an unknown bin) is not a try. No
  model is involved.
- Attempts, credit, hints and the miss limit are the ones every question uses: two misses in a
  lesson step, one in a prediction and in the end check. The lesson-feedback route returns the
  right arrangement (`solution`) only for an attempt that is right, revealed or closed, and
  Exam mode never returns it.
- Display: the browser deals the items with a seed kept for the visit to the lesson, so going
  Back shows the same arrangement. An order item has Move up and Move down buttons, and the
  arrow keys move the item whose button has focus. A sort item is a button: choosing it and
  then a group places it, and a placed item can be chosen again and moved or put back. Each
  move is announced in a live region. There is no dragging. Controls are at least 44 pixels.
- Closed: the order list shows the right order and marks the items the learner had in place.
  The sort shows each group with its items, a mark, where the learner had put a misplaced
  item, and each item's line of explanation.
- Review: a missed order or sort question becomes a card the same way as any missed question.
  The card is interactive: it shows the same list or groups, Check sends the arrangement to
  the server, which marks it with the lesson's own rule, and the reveal then shows the right
  arrangement. Reveal answer without Check shows the answer and counts as assisted. A missed
  question with extracts shows them on its card with their attributions.
- Course checks show extracts, both the structured form and an older quoted paragraph. They
  did not before. Course checks still take only numeric and choice questions.
- Read aloud and a card's text use `questionPlainText`: setup, each extract under its
  attribution, the question, then the items or the groups and items. The tutor receives the
  learner's form of the question, which has the same parts and no answer.
- No migration was needed. An answer is stored as text in `attempt_responses` like any other:
  item ids in sequence, or `item:bin` pairs.

History is the only course that uses them: three order questions, three sort questions, two
source pairs and three single extracts with attribution. `docs/question-writing-guide.md` says
when to use each and gives an example.

Limits. An order of three items is right by chance one time in six, so the guide asks for four
or more. Choice options are still shown in authored order. The legacy quiz screen shows the
new types through the same answer input, and its typed "show answer" reveal gives the answer as
text. Nothing was tried with a screen reader.

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

From November 2026 credit is decided per question. Every response is appended to
`attempt_responses` and none is rewritten, so the first response and the number of marked tries
can always be read back. An answer is independent only when the first marked response to the
question is right, with no hint, tutor reply, reveal or Direct mode before it on any attempt. Right
after a miss is recorded as recovered and earns less XP on each try (60%, 40%, then 25%). Right
after the worked answer was shown earns at most a quarter. A correct answer never lowers mastery.
A number in the wrong unit is answered with what to fix and costs no try.

The server counts lesson misses when the client names the lesson with the attempt: one for a
prediction, the end-of-lesson check and a two-option choice, two elsewhere. The last allowed miss
closes the attempt and opens the worked answer. In Exam mode it closes without one, is recorded as
wrong, and still lets the stage finish. A question that closes this way, or whose answer is shown,
becomes a review card due the next day, unless an authored card already names that question. A
numeric or short-text card is typed and marked by the question's own answer authority. A choice or
code question's card is self-rated. Review card text follows the content on every read, and the
schedule is kept. Assisted recall counts as Good while a card is new, learning or relearning, so
it can graduate, and stays capped at Hard once the card is in review. The Sharp mind quest counts
a question only on the day it is first solved.

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

## Writing tasks

A lesson can end with a writing task. Writing Longer Pieces has one in each of its twelve lessons,
and the archived Electronics prototype has three. The task is optional: the page says so, and
"Skip this task" leaves it and carries on to the review cards. The server refuses to skip a stage
that is not optional. The first paragraph of the prompt is the task, and any later paragraphs are
set under it as the material it supplies, such as a question, figures or a draft to revise. The
draft saves by itself while the learner types, and it can be submitted once it reaches the task's
minimum length. Style notes on a submission are advice and never block it.

Submitting records the task as done in the lesson, including a task that was skipped on an
earlier visit. Before November 2026 a skipped task stayed recorded as skipped after it was
submitted.

The tutor assesses a submitted version against the task's success criteria. The assessment has a
summary, the first thing to fix, a next step, and a result for each criterion: met, partly met or
not met, with a short quote from the writing or a one-sentence reason. The server lines the
results up with the task's own list by text, or by position when there is exactly one result for
each. A reply with missing, malformed or unmatched results is kept with its overall verdict and a
note, and is not treated as a failure. Assessments stored before the per-criterion results existed
have no list and still render. An assessment is not checked against the answer to the lesson's
first question, because a writing task has no answer to withhold.

After an assessment, or after submitting with no tutor, "Revise" opens the text for editing again.
The submitted version and its assessment are first appended to `essay_versions` (migration
`0016_essay_versions.sql`, one added table, rollback-safe) and are never rewritten.
`essay_drafts` and `essay_assessments` keep holding the current version, so a build from before
the migration still runs on the database. The page names the version being written, lists the
earlier ones under "Earlier versions", and opens any of them read-only with the feedback it
received. While a revision is being written the latest earlier version starts open. A version has
one assessment: asking again returns the one it has, and a new assessment comes from revising.
Revise is refused while the tutor is still reading. When a revision is assessed, the tutor is given
the previous version and its feedback and is asked whether the problem named there is fixed.

When the tutor is unavailable the page says so before the learner writes, still accepts the
submission, and asks them to check the writing against the criteria. A CLI can report a stored
login whose session has expired, and only a model call finds that out, so the capability check
does not make one. The server remembers the last request a provider refused for sign-in. The tutor
then reads as unavailable until a request succeeds, the stored login file changes, or five minutes
pass. A failed assessment whose provider error points at sign-in says so in its message.

The mock provider returns a result for each of the task's criteria, and the fake Codex fixture can
write to stderr before exiting, which is how the sign-in case is tested. No real tutor reply to
the per-criterion or revision prompts has been checked yet.

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

## Rust proof of concept

Added 15 October 2026 at George's request. Rust Foundations (`content/rust-foundations`) has two
lessons, "Print a value, then change it" and "Types and functions", with 22 questions and four
review cards. Half the questions (11) are answered by writing Rust in the lesson: changing a
program, fixing a compiler error, or writing a function from its signature. The server marks them by
running them against the visible example and hidden tests. The other half are numeric, typed and
multiple-choice questions about programs whose real rustc output appears after the answer. One
project, First Rust programs, adds four longer tasks, and the Rust playground at `/rust/playground`
runs any program with nothing graded.

A code question is an ordinary `Question` with `responseType: "code"`, a public `code` exercise
(starter and example) and hidden `codeCases`; `POST /api/attempts` runs it, and
`POST /api/questions/:id/run` runs the example without marking. The server compiles and runs learner
code in two Bubblewrap sandboxes with no network and no access to home or the workspace
([ADR 0006](adr/0006-sandboxed-rust.md)). `pnpm rust:setup` installs the pinned toolchain;
`pnpm rust:check` tests the sandbox. `pnpm rust:prepare` rebuilds the course: it compiles every lesson
program against its declared output and checks that every worked program passes and every starter
fails. Migration 0014 adds two empty project tables. Thirteen server tests cover the runner, the
playground, code questions and the project flow. Desktop and phone screenshots were checked during
development; there is no Playwright scenario for Rust yet.

Not built yet: more lessons (ownership and borrowing are the obvious next ones), GDScript, and a
seccomp filter on compiled programs.

## TypeScript exercises

The first five lessons of TypeScript and Node.js each hold three exercises the learner answers by
writing or repairing TypeScript in the lesson, fifteen in all (`responseType: "code"` with
`code.language: "typescript"`). Each is placed after the idea it practises, they get harder within
a lesson, and most start from code the compiler rejects. The 160 earlier questions are unchanged.

Run compiles the program where the exercise is type-checked and then runs the visible example,
showing what it printed and what it returned or left in each judged name. Check answer runs every
case and every type test, and names the first case that fails with the expected and actual values.
A type error, `any` in a type-checked exercise, a syntax error and a thrown error are shown with
their line and are not counted as a wrong answer. A type test that fails is counted, with the
author's message. Where TypeScript cannot run, the exercise says so and the lesson finishes without
it ([ADR 0008](adr/0008-typescript-exercises.md)).

The program is type-checked by the native `tsc` and run by the Node the server runs on, both
inside Bubblewrap with a seccomp filter on Linux and inside `discere-sandbox.exe` on Windows. A
release carries `tsc.exe` under `runtime/typescript`, so the learner downloads nothing.

`packages/curriculum/tests/typescript-exercises.test.ts` compiles and runs every worked program
and every starter. `apps/server/tests/typescript-questions.test.ts` does the same in the sandbox,
checks the limits, and runs code that climbs out of Node's `vm` context to show it still has no
files, network or child process. `apps/web/e2e/typescript-exercises.spec.ts` plays two exercises
in Chromium.

Checked on Windows 11 on 2026-11-11, from a bundle packaged on Linux with the sandbox helper of
release 1.11.2: a type error came back by line, a correct function ran and printed, an endless
loop stopped at the limit, a failed type test was counted and the worked program passed 6 of 6.
The release workflow itself has not run with this change.

Not built yet: exercises for lessons 6 to 14, programs of more than one file, and anything that
needs Node's own modules (files, streams, HTTP, timers).

## Windows release

From 1.1.0 Discere ships as a Windows release that Instrumenta 0.15.0 installs and updates as a
`managed-service` product ([ADR 0007](adr/0007-windows-release.md)). The bundle starts from its own
`node.exe`, keeps learner data in `%LOCALAPPDATA%\Discere`, and runs Rust, Python and SQL practice
through `discere-sandbox.exe`, an AppContainer inside a Job Object. The Rust and Python toolchains
are a one-time download from inside the app, pinned by SHA-256.

Checked on Windows 11 from the packaged bundle with a throwaway data folder: both toolchains
installed through `/api/code-runtimes`; a Rust program read stdin and could not list the user's
profile; an endless loop stopped at the limit; the lesson question `types-and-functions-triple`
marked a hard-coded answer wrong (1 of 3 tests), the correct one right, and showed rustc's E0308
for a stray semicolon; a Python project task with pandas and an SQL project task both passed. The
sandbox helper's own tests (`tools/windows-sandbox/test.sh`) cover blocked network, blocked user
folders, and the memory, CPU, wall-clock and process limits.

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

On 11 November 2026 the browser suite was rewritten to play lessons from their content. Its
last full run passed 97 tests and skipped one, in about 18 minutes.
[The browser test status](testing/e2e-status.md) lists what each spec covers and the four bugs
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

The [production readiness report](production-readiness/README.md) records release serving and caching, verified online backup/new-path recovery, process identity checks, route/math loading, grading robustness and learner-discovered coordinate/completion repairs. This pass adds no new material and preserves all 23 owner tables and study preferences. A private learner completed all six Maths Foundations lessons, 12 fresh recall cards, the eight-question mixed check and a genuinely due recall after two service restarts. The populated recovery drill preserves that history plus a note and preferences.

Final validation is 1,490 package tests plus two lifecycle tests, build/CSP and smoke, the 121-test Chromium suite and focused reruns. Native Windows automation failed to initialize; recorded Chromium is the actual learner evidence. Heard audio, physical-device/cross-browser acceptance, independent subject review and measured learning outcomes remain unverified. This local release hardening does not certify the broader curriculum backlog or Brilliant parity.
