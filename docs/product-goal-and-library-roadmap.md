# Discere product goal and library roadmap

Status: active product authority  
Updated: 2026-10-02

## The product we are building

Discere is a private, local-first learning platform with the explanatory depth of Khan Academy and
the active problem solving of Brilliant. It should teach a connected curriculum, not collect
isolated articles or quizzes.

A learner should be able to:

- follow a coherent course from first principles to transfer problems;
- manipulate a useful diagram, simulation, map, timeline, or model while learning;
- answer in numbers, prose, drawings, code, and ordered structures where the subject calls for it;
- keep a tutor conversation open across a lesson and return to it later;
- submit workings and essays for specific, excerpt-linked review;
- create, generate, edit, group, reorder, and schedule flashcards;
- see independent evidence separately from hinted, revealed, or tutor-assisted work;
- move through paths, goals, review queues, streaks, mastery checks, and optional challenges without
  turning study into an XP dashboard.

The platform stays usable offline after setup. Answer authority, tutoring permissions, attempt
records, review scheduling, and content validation remain server-owned.

## Where the repository stands

The architecture is ahead of the library. The checked-in runtime corpus currently contains:

| Item | Count |
| --- | ---: |
| Active courses | 12 |
| Active lessons | 152 |
| Active concepts | 153 |
| Answered visual teaching beats | 608 |
| Active lesson questions | 912 |
| Independent course-check problems across twelve courses | 458 |
| SQL construction projects / tasks / checked datasets | 3 / 15 / 45 |
| Python construction projects / tasks / checked datasets | 3 / 22 / 66 |
| Active flashcards | 304 |
| Archived prototype courses | 2 |
| Archived essays / older activity definitions | 3 / 11 |

Maths Foundations, Logic and Reasoning, and How Computers Solve Problems now contain all 20 mapped
lessons, 120 questions, and 40 standalone recall cards. Each new lesson has four answered visual
beats and two practice questions. Roman and Electronics are archived from discovery, suggestions and general review; saved routes and records remain accessible.
Probability and Statistics adds six assessed lessons and twelve standalone cards. Its outcome,
distribution and sampling diagrams are playable at all three required viewports. The catalogue now
uses illustrated paths, subject/search/progress filters and dimensional lesson roadmaps.
SQL: From Rows to Reports adds fifteen lessons, 90 questions and 30 cards with independently
executed SELECT results, NULL, aggregates, joins, subqueries and windows. It is partial coverage
of the wider SQL outlines. Three additional query-construction projects now cover all fifteen
lessons with saved learner-written queries, isolated SQLite execution and private grading variants.
Python for Data Analysis adds 21 lessons, 126 questions and 42 cards
with 168 executed examples covering core Python, NumPy and pandas reporting. Its guide mapping
is implemented. Three reviewed construction projects now add 22 learner-written programs, 66 private
grading cases, actual isolated CPython execution and assistance-aware saved drafts. Broader parent
curricula, advanced programming and fresh delayed project reassessment remain.
Geometry: Shape and Space adds twelve lessons, 72 questions and 24 cards with exact drawings,
case comparisons and folding nets. Placement, mixed and seven-day application sets add 36 fresh
problems. Introductory measurement, scale and space are implemented; broader geometry remains.
Physics: Motion and Forces adds eighteen lessons, 108 questions, 36 recall cards and 54 course-check
problems. Its fourteen deterministic model kinds cover one-dimensional motion, forces, work,
energy and momentum. This is partial mechanics coverage; broader Physics remains required.
Calculus: Change and Accumulation adds twelve lessons, 72 questions, 24 recall cards and 36
independent check problems. It implements the introductory limits, rates and integrals sequence
from the full textual Mathematics note. Formal proofs and the wider subject remain required.
Chemistry: Atoms to Reactions adds twelve lessons, 72 questions, 24 recall cards and 36 independent
check problems. Particles, bonding and reaction quantities form a general-chemistry foundation.
Organic, broader inorganic and analytical chemistry remain required.
Biology: Cells to Ecosystems adds sixteen lessons, 96 questions, 32 fresh recall cards and 48
independent checks. Ten models connect cells, energy, inheritance, evolution and ecology. All 64
teaching beats and 128 cases work at three sizes. Eighty-one numeric keys were recomputed, and
95 term/choice answers were reviewed. Equivalent scientific terms are explicitly supported.
[Biology records](library-expansion/biology-course.md) retain the source-note correction, review,
model limits, screenshots and substantial remaining subject scope.

Linear Algebra: Vectors and Maps adds twenty lessons, 120 questions, forty recall cards and sixty
independent checks. It gives an introductory sequence for all nine retrieved linear-algebra outline
parts, with bounded vector/matrix exploration and independently audited numeric keys.
[Linear Algebra records](library-expansion/linear-algebra-course.md) retain the source mapping and
remaining proof, arbitrary-dimensional, complex and spectral scope.

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

The consistent theme, companion, earned feedback and fresh-recall flow are recorded in
[experience notes](brilliant-experience/README.md).
See [foundation notes](foundations/README.md) and
[expansion records](library-expansion/README.md) for sources, evidence and remaining coverage.
George's expanded request includes every topic in the twelve-family study map and every existing
Notion technical curriculum. The source inventory records sixty core topics, fifteen named science
subfields, 160 top-level knowledge notes, three BigQuery notes, and five optional pathways.
Nested page discovery remains incomplete; a Physics child page was retrieved separately. These counts are
requirements and research records, not completed course counts.

The application already has server-scored attempts, modes, transfer records, essays, FSRS review,
XP and mastery, circuit/timeline/ordering/diagram/graph activities, a workings notebook, and a
provider-neutral tutor. These are foundations to extend, not proof that the full product is done.

## What counts as a finished lesson

Every lesson needs four authored beats:

1. a visual that carries subject information;
2. a direct explanation of one relationship or idea, released after a response in question-first lessons;
3. an interaction whose state changes what the learner can observe;
4. a response that produces valid evidence of understanding.

Completion also requires:

- a clear prerequisite position in the course graph;
- four to six varied questions, including at least one changed-case transfer task;
- two or three independent flashcards that do not merely repeat the questions;
- specific feedback for likely errors;
- recomputed numeric and deterministic results;
- claim-level sources and licences;
- media provenance, alt text, and a reviewed asset hash;
- a final editorial record tied to the shipped bundle hash;
- desktop, tablet, and mobile learner checks.

Typed participation alone is not correctness. A revealed answer cannot become independent mastery
because the learner later rates it `Easy`.

## Source and licence policy

Free to read does not mean free to copy, adapt, or redistribute.

Production content may use:

- public-domain material;
- CC0;
- CC BY, with attribution;
- CC BY-SA, with attribution and compatible sharing terms;
- CC BY-NC-SA only when Discere's distribution and use remain compatible with its non-commercial
  and share-alike conditions;
- original Discere prose, diagrams, exercises, code, and reviewed generated illustrations.

A source that does not grant reuse may still be used to check a fact. Its wording, exercise design,
and media do not enter the bundle. Khan Academy is reference-only by default unless a particular
item carries a compatible alternate licence. The Stanford Encyclopedia of Philosophy is also a
research reference unless the requested reuse fits its stated permissions.

Every production claim record needs a source identifier, exact section or page, licence, licence
URL, attribution, access date, and the claim it supports. Every media record also needs the creator,
landing page, retrieval date, local file hash, any transformation, and reviewer decision. `See the
publisher's terms` is not a valid production licence.

Useful authorities:

- [Creative Commons Attribution 4.0 deed](https://creativecommons.org/licenses/by/4.0/)
- [Open Logic Project licence](https://openlogicproject.org/olp-license/)
- [Khan Academy terms](https://www.khanacademy.org/about/docs/khan-academy-terms-of-service)
- [Khan Academy reuse guidance](https://support.khanacademy.org/hc/en-us/articles/202262954-Can-I-use-Khan-Academy-s-videos-name-materials-links-in-my-project)
- [Stanford Encyclopedia copyright information](https://plato.stanford.edu/info.html)

## Editorial standard

Generated drafts are raw material. They do not ship merely because they validate against a schema.

The writing gate must check factual grounding, named attribution, explained terms, concrete
examples, prompt restatement, redundant recap, canned openings and conclusions, generic legacy or
significance claims, promotional tone, formulaic triads, stock transitions, and model-specific
markup residue. The [Wikipedia field guide to signs of AI
writing](https://en.wikipedia.org/wiki/Wikipedia%3ASigns_of_AI_writing) is an editorial checklist,
not an authorship detector. A subject editor still decides whether the prose is accurate, natural,
and worth reading.

A final review record names the reviewer, date, fact checks, accepted warnings with reasons,
unresolved issues, draft-to-final changes, and final bundle hash.

## Delivery order

### 0. Apply the current learner-experience direction

George's 1 October request and supplied Brilliant screenshots now govern the active product:
illustrated learning paths, dimensional pedestals, an original companion, one consistent dark
theme, questions before explanation, correctness sound and a green frame, correction after
mistakes, and fresh recall. These are implemented and checked at three viewport sizes.
The archived Roman flow keeps its historical recovery contracts.

Gates 1–3 were approved previously. George delegated the pending visual decision with ‘I have no
clue decide for me’ and instructed us to continue. Gates 4–5 are implemented, browser-verified, and
reviewed under that delegation; no further approval stop remains. This does not claim personal
screenshot inspection by George. Gate 5 records actual recall and schedules return without
awarding catalogue completion or XP to the isolated reference row.

Gate 3 provides four routed, server-graded question types with persistent drafts, formative
revision, mode-specific assistance, Direct reveal friction, and deferred Exam feedback. Its
current Stage 3 → Stage 7 recovery jump is explicit; Stages 4–6 remain future work.

The assessment uses the checked-in Tataryn 117 CE Wikimedia Commons map (CC BY-SA 3.0), while
OpenStax 10.1, “The Eastward Shift” (CC BY 4.0), supports the 395 CE division.

### 1. Generalise the accepted lesson grammar

Use the current question-first grammar for production courses: title, question, diagram,
response, earned explanation, two skills checks and fresh recall. The shared shell, reserved
footer, server-owned correction and progression are implemented. A mistake stays failed evidence
even when the learner studies its explanation and continues.

Legacy selections, ordering and graph points remain assessed on the server. The archived
prototypes are outside active production discovery and retain their older learning layout.

### 2. Ship Maths Foundations as the gold course

Finish all six mapped lessons. Require the full lesson definition above, a pre-course diagnostic,
mixed end-of-course mastery check, delayed transfer review, and signed editorial/media records.
This course is the throughput test for the authoring system.

All six lessons, 36 questions, 12 cards, prerequisites, citations, original diagrams, and exact-hash
editorial/media records are published. Maths 1.1.0 also provides six optional placement problems,
eight mixed checkpoint problems and six changed-context applications due seven days later.
The checks use immutable first responses, separate confidence, targeted lesson recommendations
and bounded XP. [Course-check evidence](course-checks/README.md) records actual lesson prerequisites,
source mapping and browser verification. A documented learner trial remains necessary.

### 3. Repair the content factory before broad import

- extend topic-map sources with licence, edition/section, access date, and claim mapping;
- retain prerequisite and uncertainty data during scaffold/import;
- stop assigning every course source to every question and card;
- enforce final human approval against the merged bundle hash;
- cover all high-value writing rules named by the writing specification;
- validate cover assets as well as lesson images.

The staging/publication boundary, source and licence metadata, prerequisite and uncertainty
retention, scoped citations, exact-hash editorial approval, writing coverage of marking prose, and
new cover manifests are implemented. Reviews in this session are delegated agent reviews, not an
independent human subject review. The writing engine still does not cover every normative rule.

### 4. Convert Logic and Computer Science Foundations

Build the remaining 14 mapped lessons using the accepted grammar and the gold-course review
process. Logic should favour argument construction, counterexamples, and proof repair. Computer
science should include runnable code, tracing, debugging, and small design tasks rather than prose
questions about syntax.

The eight Logic and six Computer Science lessons are published with deterministic truth tables,
constraint cases, editable bounded code, traces, repairs, and stepwise searches. Independent tests
check those results. Logic still needs stronger assessment for open-ended proof and argument work.

### 5. Complete the learning workspace

- persistent tutor threads per lesson and course, with explicit new-thread and clear-history
  controls;
- notebook pages linked to attempts and tutor review, with learner-controlled evidence promotion;
- essay drafting, excerpt-linked critique, revision comparison, and rubric history;
- learner-owned flashcard collections with generation lineage, edit history, grouping, drag
  ordering, imports, and FSRS scheduling;
- pane management for lesson, tutor, notes, evidence, and references;
- restrained paths, goals, streaks, challenges, and mastery rewards;
- maintain the consistent dark neutral and green theme requested on 1 October.

Persistent per-lesson tutor conversations and the corrected Coach answer boundary are implemented
as of this update. A live Codex subscription probe and accepted Coach reply succeeded. Tutor help
now binds to the active question and records assistance even before a first answer. Learner-owned
flashcard collections and flexible panes are not implemented.

Daily goals, timezone-aware streaks and earned protection, connected lesson paths, seven milestones,
and real completion summaries are implemented. XP is bounded across repeated questions and due
review sessions. Completion animation runs once, honours reduced motion, and never delays the next
lesson. Fresh preferences enable original sound cues, with a lesson mute that preserves the
learner's saved choice. A new correct response sounds even when its XP reward has already been earned. [Practice and motion notes](gamification/README.md) include
responsive captures and verification. All eleven active courses now have independently authored
placement, mixed and delayed checks, totalling 398 problems. SQL also includes fifteen construction
tasks in three saved projects. Commercial engagement parity has not been measured.

### 6. Expand the library

Add coherent foundations in this order, adjusting only when prerequisites justify a different
sequence:

1. algebra, geometry, probability, and statistics;
2. mechanics, waves, electricity, and thermodynamics;
3. chemistry foundations;
4. biology foundations;
5. world history pathways;
6. writing and argument;
7. economics and data literacy.

Each subject begins with one gold course. Breadth never bypasses the lesson, source, writing,
assessment, media, accessibility, and learner-trial gates above.

## Measures that matter

Track completion, but do not optimise for it alone. The useful measures are:

- first-attempt and post-hint correctness kept separate;
- changed-case transfer after the lesson;
- delayed recall and relearning time;
- essay revision quality against specific rubric dimensions;
- whether tutor use improves the next independent attempt;
- abandoned steps and repeated misconceptions;
- source, licence, media, and editorial completeness;
- learner reports that identify confusing prose or visuals.

XP, streaks, and badges support return and momentum. They are never substitutes for evidence that
the learner can use an idea without help.
