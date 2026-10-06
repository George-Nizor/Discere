# Personal library expansion

Started: 2026-10-01. Updated: 2026-10-02. Status: new-material work closed for the current release; remaining coverage is backlog.

George requested every topic in his Notion learning map and existing comprehensive curricula,
with playable lessons, assessed responses, recall, progression and a polished animated interface.
His latest 2 October request sets the current boundary at the existing twelve courses and 152 lessons.
Further expansion is future backlog. The [quality pass](../quality-pass/README.md) verifies the current
material and app features. A topic or resource link alone is not an implemented course.

The earlier uncommitted learning, review and reward work is preserved. George's 1 October
Brilliant references now govern the active experience; see [experience notes](../brilliant-experience/README.md).
Roman and Electronics prototypes are archived from active discovery while retaining saved
history and routes.

## Source authority

The connected Notion library contains a newer Life HQ copy of the twelve-family study map,
the nine-principle Learning Framework, five optional creative and technical pathways and existing
data-analysis and machine-learning outlines. Original pages remain fallbacks. Historical completion
statuses are not imported as Discere evidence.

Snapshots and the coverage record retain page IDs, direct URLs, retrieval dates and limitations.
Signed media URLs are removed. Lesson visuals, datasets, prose and queries are original Discere
work checked against primary subject sources.

`technical-source-snapshots.json` retains fifteen sanitised source bodies.
`knowledge-note-inventory.json` records all 160 top-level non-test knowledge notes and three BigQuery notes
from complete paginated queries. Nested child-page discovery remains incomplete; the Physics note
was found separately under Mathematics and its text has now been read. Titles form a discovery index: read the full note before authoring.
Personal-note mistakes are corrected against primary sources, including Python integer bounds,
set mutability and dialect-specific SQL procedure claims.

## Verified checkpoint

The twelve active courses contain 152 lessons, 912 questions, 304 standalone recall cards, 153 concepts
and 608 answered visual beats. Each lesson asks four teaching questions, follows with two skills
checks and ends with fresh recall. All twelve active courses have exact-hash editorial acceptance
and reviewed original cover provenance. Maths provides twenty distinct course-check problems:
six for placement, eight in a mixed final challenge and six applications after a seven-day gap.
Geometry, Calculus and Chemistry each add twelve fresh problems per check kind; Physics adds
eighteen and Biology sixteen. Logic adds eight per kind; Computer Science and Statistics add six
each. SQL adds fifteen per kind and Python twenty-one, Linear Algebra adds twenty per kind, giving 458 independent check problems
across all twelve courses. [Data checks](../course-checks/data-expansion.md) retain execution evidence.
[Course-check evidence](../course-checks/README.md) records immutable answers, confidence, targeted
lesson recommendations, bounded rewards and the required lesson-completion checks.

Probability and Statistics has six lessons covering finite outcomes, conditions, independence,
centre, population spread and sampling selection. Numeric marking keys were independently
recomputed; changed-case practice and server-owned rewards remain.

SQL: From Rows to Reports has fifteen lessons, 90 questions and 30 standalone recall cards.
Four modules cover rows/filters, aggregates, combining results and windows. All 121 displayed
SELECT results were executed in SQLite 3.53.4; independent tests rebuild databases and check every
column and cell. Numeric keys and recall values were recomputed separately. The accepted bundle
SHA-256 is `35d46d605c468fb84efd8383e03ce52e003f64864a2044f0875e6a69df90f852`
after the preserved teaching-content extension for course checks.
The course checks NULL, counting, distinctness, join multiplicity, ON versus WHERE, subqueries,
ties, partitions, frames and neighbouring rows. Three [construction projects](../sql-projects/README.md)
now add fifteen learner-written SELECT tasks with actual isolated SQLite execution, 45 manually
checked dataset variants, saved drafts and explicit assistance records. Wider database-management
and dialect-specific curricula remain incomplete.

Python for Data Analysis adds 21 lessons, 126 questions and 42 recall cards from the fully read
Python for Data Analysts guide. All 168 examples were executed with CPython 3.12.14, NumPy 2.3.5
and pandas 3.0.1. Separate programs verify 105 numeric question/card keys; unit tests independently
recompute all 84 numeric question values. Learners compare cases and play through real recorded
execution, variables and tables. [Python source mapping and evidence](python-course.md) record
corrections to the guide and exact publication hash. Three [Python construction projects](../python-projects/README.md)
now add 22 learner-written programs, 66 reviewed datasets, real isolated execution, saved drafts
and explicit assistance records. They cover the current lessons; wider Python scope remains.

Geometry: Shape and Space adds twelve lessons, 72 questions and 24 recall cards. Forty-eight
interactive beats compare angles, shapes, scale, distances and solids, including folding box nets.
All 112 numeric question, recall and course-check keys were independently recomputed. Each of its
three checks covers all twelve lessons. [Geometry records](geometry-course.md) retain exact sources,
review hashes, responsive captures and the remaining proof, construction and wider-subject scope.

Physics: Motion and Forces adds eighteen lessons, 108 questions and 36 recall cards. Fourteen
bounded model kinds support motion graphs, force comparisons, energy accounting and sticking
collisions. All 162 numerical lesson, recall and check keys were recomputed independently. Its
three 18-problem checks cover every lesson. [Physics records](physics-course.md) preserve exact
sources, the corrected momentum formula from the Notion child note, visual repairs and the
remaining mechanics scope. The note's embedded images and oversized textbook were not fully read.

Calculus: Change and Accumulation adds twelve lessons, 72 questions, 24 recall cards and 36 fresh
course-check problems. Six bounded graph kinds support limits, rates and signed accumulation.
All 108 numerical keys were independently recomputed. [Calculus records](calculus-course.md)
retain corrected Mathematics-note claims, exact primary references and remaining subject scope.

Chemistry: Atoms to Reactions adds twelve lessons, 72 questions, 24 recall cards and 36 independent
check problems. Its seven model kinds cover atoms, ions, bonds, formulas, moles and reaction
quantities. All 108 numerical keys were recomputed independently; all 48 beats and 96 cases were
browser-checked at three sizes. [Chemistry records](chemistry-course.md) preserve the empty Notion
reading note, exact primary sources, visual corrections and remaining subject scope.

Biology: Cells to Ecosystems adds sixteen lessons, 96 questions, 32 fresh recall cards and 48
independent checks. Ten models connect cells, energy, inheritance, evolution and ecology. All 64
teaching beats and 128 cases work at three sizes. Eighty-one numeric keys were recomputed, and
95 term/choice answers were reviewed. Equivalent scientific terms are explicitly supported.
[Biology records](biology-course.md) retain the source-note correction, review,
model limits, screenshots and substantial remaining subject scope.

Linear Algebra: Vectors and Maps adds twenty lessons, 120 questions, forty fresh recall cards and
sixty independent check problems. Eighty answered beats compare 160 distinct given cases. The
independent CPython/NumPy audit verifies all 195 numerical marking keys; twenty-five choice keys
were reviewed. [Linear Algebra records](linear-algebra-course.md) map all nine source-outline parts
and retain exact sources, review, responsive captures and substantial remaining subject scope.

Illustrated learning paths, dimensional roadmaps, consistent dark theme, original companion,
correctness sound/green frame and mistake-to-correction flow are implemented. Server-held answers
and Exam permissions are preserved. A fresh general review queue introduces no unseen lessons.
Saved URL filters, study preferences, lesson position, recall and completion survive refresh.

`pnpm check` passes 1,281 package tests and fourteen stored bundle validations. Production build/CSP,
Python readiness, doctor and isolated smoke pass. All 109 browser scenarios passed together before
the final isolated SVD refinement; all six affected published-bundle scenarios and the package gate
passed afterwards. The complete suite was not repeated after that refinement.

Captures in [the experience record](../brilliant-experience/README.md) cover paths, all twelve
roadmaps, questions, earned/correction feedback, recall and completion at 1440×900, 1024×768 and
390×844. Each of the twenty Linear Algebra lesson openings is tested at all three sizes, with
sixty assessment responses, actual row operations and SVD controls.
[Linear Algebra evidence](linear-algebra-course.md) retains its detailed checks and model limits.

The owner preview serves twelve courses and 152 lessons. Six read-only live captures recorded no
page errors or attempted mutations. Every prior study-row fingerprint and preference is preserved.
Tests use disposable databases.

## Future coverage backlog

Do not continue this expansion during the current quality release. The complete technical curricula,
broad subjects and optional pathways remain documented gaps. Statistics
provides introductory overlap with three Google chapters; it does not finish that curriculum or
the subject. SQL reporting provides partial coverage of the SQL and Advanced SQL outlines.
Schema changes, data mutation, database administration, procedures and wider dialect topics remain.
Python implements the introductory guide, while the broader Python, Google Advanced Data Analytics,
Computer Science and AI/ML curricula remain partial. The current Python construction projects are
implemented; random sampling, larger datasets, environment setup, advanced structures, inference
and machine learning remain required.

Preserve these gaps in `topic-coverage.json`. All twelve active courses now have placement, mixed
checkpoints and delayed transfer. Wider independent programming, fresh delayed project assessment,
advanced proof assessment, learner-owned cards and a documented learner trial remain required.
The sixty-topic map, fifteen named science subfields and optional pathways are still a broad
unfinished implementation scope.
