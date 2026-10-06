# Discere handoff

Updated: 2026-10-02

Read [implementation-status.md](implementation-status.md), the
[learner experience](brilliant-experience/README.md), [library expansion](library-expansion/README.md)
and [course checks](course-checks/README.md) before extending the product.

## Latest task: verify and finish the current release

George's latest 2 October request is to wrap up new material and bring the current material and
all existing app features to a verified high standard. This supersedes the expansion priorities
below for the current task. Do not continue authoring new courses or the proposed statistics
lessons. The published library remains twelve courses and 152 lessons. See
[the quality pass](quality-pass/README.md) for completed work and evidence. The verified release is
running locally with all prior data preserved. Do not automatically resume material expansion.
All 1,439 package tests pass, all 115 browser scenarios have passing latest results, and the live
tutor connection was checked. A real learner trial and independent subject review remain future
validation work. Keep the documented Chromium/build-size limits visible.

## Previous expansion authority (historical context)

George's full request remains: implement every topic and comprehensive curriculum from his local
project and Notion learning map, with assessed, gamified learning and a polished interface. His
2 October clarification authorized continuing work. The later request to wrap up new material
sets the current scope above. The completed homepage redesign established: Home, Courses and You, saved course resumption and real
personal statistics, with no leaderboards or bottom chat. See [the release records](home-redesign/README.md).
The Home/You redesign is live and verified, with every saved row and preference unchanged.
The top-level metadata inventory is complete; nested child-page discovery and course coverage remain partial.

His 1 October Brilliant screenshots govern the active interface: illustrated connected learning
paths, dimensional pedestals, an original companion, a consistent dark neutral/green theme,
question-first teaching, earned sound and a green frame, corrections after mistakes and fresh
recall. Roman and Electronics are archived from discovery. Their saved histories and routes remain
available. Earlier Roman approval stops are superseded by George's delegated decisions.

Keep edits inside Discere. Preserve Instrumenta and Claude's wrapper work, server-owned answers,
tutoring permissions and the host-neutral learning core. Do not add an OpenAI API dependency.

## Current implementation

Twelve active courses contain 152 lessons, 912 lesson questions and 304 recall cards: Maths, Geometry,
Linear Algebra, Calculus, Physics, Chemistry, Biology, Logic, Computer Science, Probability and Statistics,
SQL reporting and Python data analysis. They provide 458 independent course-check problems.
Every active lesson has four answered teaching beats, two skills-check questions and fresh recall.
Course art, diagrams, cases, prose and sound are original and have recorded sources and reviews.

Maths now also has twenty distinct course-check problems: six optional placement questions, eight
mixed final problems and six applications due seven days after the final challenge. Answers and
confidence are immutable, marking is hidden until completion, and results recommend relevant
lessons. Checks preserve snapshots across content revisions, earn bounded response XP and appear
in Review when due. They never manufacture lesson completion or concept mastery.

Geometry adds twelve lessons with exact angle/area/scale/distance/solid comparisons and folding
box nets. It also includes twelve fresh problems for each of the three check kinds. All 112 numeric
lesson, recall and check keys were independently recomputed. [Geometry records](library-expansion/geometry-course.md)
retain its sources, review and remaining proof, construction and wider-subject scope.

Physics adds eighteen lessons with motion, force, energy and collision models, plus eighteen fresh
problems for each course-check kind. All 162 numeric keys were independently recomputed.
[Physics records](library-expansion/physics-course.md) retain sources, review and remaining mechanics
scope. The Physics child note was found under Mathematics, outside the 160 top-level database rows;
do not call that inventory recursively complete. Its equation typo is corrected in Discere; the
embedded images and linked textbook have not been fully reviewed.

Python's 21 lessons replay 168 actual reviewed CPython/NumPy/pandas executions. SQL's fifteen
lessons compare 121 actual SQLite query results. SQL now also has three reviewed construction
projects covering all fifteen lessons, with real learner SELECT queries, saved drafts and 45 checked
dataset variants. Python now also has three reviewed projects, 22 learner-written programs and
66 checked dataset cases. Required functions, NumPy/pandas tables, corrections, saved drafts and
all four permission modes execute through the actual sandbox. Wider Python and SQL work remains.
The runtime boundaries are recorded in [ADR 0004](adr/0004-isolated-sql-projects.md) and
[ADR 0005](adr/0005-isolated-python-projects.md). [Python release evidence](python-projects/README.md)
records the current owner backup, verification and corrected empty-test-session incident.

The existing notebooks, essays, persistent tutor conversations, FSRS review, goals, streaks,
earned protection, milestones and finite motion remain. Browser tests use disposable databases.
The owner preview preserves study history and the requested enabled sound setting.

Calculus now adds twelve lessons, 72 questions, 24 recall cards and 36 fresh course-check problems.
The full textual Mathematics source is retained with signed media URLs removed. Its calculus
code comments and definitions were corrected against primary references. Bounded graphs support
limits, derivatives, antiderivatives and signed area. Full subject coverage remains partial; see
[Calculus records](library-expansion/calculus-course.md).

Chemistry adds twelve lessons, 72 questions, 24 recall cards and 36 independent check problems.
Seven bounded models cover particles, formulas, moles and reactions. All 48 teaching beats work
at all three viewports; independently recomputed keys and conservation tests check the arithmetic.
The Chemistry reading note is empty; its metadata is not a read textbook. [Chemistry records](library-expansion/chemistry-course.md)
retain primary sources and the substantial organic, inorganic, analytical and physical chemistry gaps.

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

Linear Algebra now adds twenty lessons, 120 questions, forty fresh recall cards and sixty independent
check problems. All nine retrieved Mathematics-note outline parts have an introductory teaching
sequence. The independent CPython/NumPy audit covers every one of its 195 numerical keys.
[Linear Algebra records](library-expansion/linear-algebra-course.md) retain sources, exact hash,
visual feedback controls and remaining proof, dimensional and spectral scope.

## Next useful work

1. Continue the source coverage recorded in `library-expansion/topic-coverage.json`, reading each
   full source note before authoring from it. The wider technical curricula, sixty core topics,
   named science subfields and optional pathways all remain required.
2. Extend Python beyond its 22 construction tasks into random sampling, larger datasets,
   environment setup, advanced structures, inference and machine learning. Extend SQL beyond its
   fifteen SELECT-construction tasks. Preserve reviewed sidecars and saved snapshots, and add
   fresh delayed project reassessment.
3. Extend independent programming and proof/argument work beyond deterministic prediction.
4. Add learner-owned cards, editing and lineage, flexible panes and deeper revision tools.
5. Use actual learner feedback to repair confusing content and interaction. A documented learner
   trial is still missing; verified tests do not establish commercial learning or engagement parity.

Generated lessons stage in `.authoring/candidate.json`. Publishing requires an accepted review
matching the exact candidate hash. Source prose marked `reference_only` must not enter course text.
Preserve lesson plumbing and histories when expanding a course. Re-imports and changed bundles
require updated review hashes; do not run old scratch generators over published content. Serialize
the schema-validated candidate before reviewing it so JSON property order matches the runtime
loader; the Geometry publication test checks this exact binding.

## Run and verify

```sh
pnpm run doctor
pnpm python:check
pnpm check
pnpm build
pnpm smoke
LD_LIBRARY_PATH=/tmp/discere-browser-libs/usr/lib/x86_64-linux-gnu pnpm e2e
pnpm start
```

The managed preview uses 4317/4318. `pnpm stop` stops its recorded processes. Build before restart.
Back up owner SQLite data with its online backup API before any schema migration. Course checks
add `0006_course_checks.sql`; SQL/Python projects add migrations 0007/0008. The implementation
status records the verified owner migrations, backups and unchanged history.
Use `pnpm run doctor`, since plain `pnpm doctor` selects pnpm's builtin command.

The latest full verification counts and backup paths are maintained in implementation-status.md.
Run production builds and browser suites sequentially: both use apps/web/dist, so an overlapping
build can briefly remove the browser server's index file and create a false 404.
The existing large web-chunk warning remains a performance task.

## Next source review

A metadata-only [Google child-page inventory](library-expansion/google-advanced-child-inventory.json)
records four fetched notes. The Foundations, Python and Insights bodies still need full review.
The Power of Statistics parent outline was read; its Confidence Intervals and Hypothesis Testing
child notes remain to be retrieved and reviewed. Attachments were not downloaded or executed.
Automatic approval review rejected the full retrieved-body snapshot after the initial media-link
scrubber failed. The partial temporary file was removed. The accepted inventory stores only fixed
page IDs, titles and review status, with no body text or URLs. Do not claim a full source snapshot
was saved or that the nested curriculum has been read completely.
