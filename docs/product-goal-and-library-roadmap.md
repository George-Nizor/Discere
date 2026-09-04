# Discere product goal and library roadmap

Status: active product authority  
Updated: 2026-08-22

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
| Available courses | 2 |
| Lessons | 8 |
| Concepts | 19 |
| Lesson steps | 45 |
| Questions | 33 |
| Flashcards | 18 |
| Essays | 3 |
| Activities | 11 |

Maths Foundations, Logic Foundations, and Computer Science Foundations have topic maps covering a
further 20 planned lessons. Those maps are plans, not playable courses.

The application already has server-scored attempts, modes, transfer records, essays, FSRS review,
XP and mastery, circuit/timeline/ordering/diagram/graph activities, a workings notebook, and a
provider-neutral tutor. These are foundations to extend, not proof that the full product is done.

## What counts as a finished lesson

Every lesson needs four authored beats:

1. a visual that carries subject information;
2. a direct explanation of one relationship or idea;
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

### 0. Approve the Roman reference experience

Complete Recovery v2 Gates 1–5 in order: visual first half, functional first half, assessment,
essay, and review. Stop at each approval point. Do not extract a universal lesson renderer from an
unapproved design.

Recovery v2 Gates 1–3 are approved. Gate 4 (essay experience) is implemented and
browser-verified, awaiting George's visual approval. Gate 5 (review) is not started.

Gate 3 provides four routed, server-graded question types with persistent drafts, formative
revision, mode-specific assistance, Direct reveal friction, and deferred Exam feedback. Its
current Stage 3 → Stage 7 recovery jump is explicit; Stages 4–6 remain future work.

The assessment uses the checked-in Tataryn 117 CE Wikimedia Commons map (CC BY-SA 3.0), while
OpenStax 10.1, “The Eastward Shift” (CC BY 4.0), supports the 395 CE division.

### 1. Generalise the accepted lesson grammar

Extract the approved shell, authored beats, interaction framing, response surfaces, sources,
mobile behaviour, and accessibility patterns. Adapt the existing electronics lessons without
weakening server answer authority or tutor permissions.

### 2. Ship Maths Foundations as the gold course

Finish all six mapped lessons. Require the full lesson definition above, a pre-course diagnostic,
mixed end-of-course mastery check, delayed transfer review, and signed editorial/media records.
This course is the throughput test for the authoring system.

### 3. Repair the content factory before broad import

- extend topic-map sources with licence, edition/section, access date, and claim mapping;
- retain prerequisite and uncertainty data during scaffold/import;
- stop assigning every course source to every question and card;
- enforce final human approval against the merged bundle hash;
- cover all high-value writing rules named by the writing specification;
- validate cover assets as well as lesson images.

### 4. Convert Logic and Computer Science Foundations

Build the remaining 14 mapped lessons using the accepted grammar and the gold-course review
process. Logic should favour argument construction, counterexamples, and proof repair. Computer
science should include runnable code, tracing, debugging, and small design tasks rather than prose
questions about syntax.

### 5. Complete the learning workspace

- persistent tutor threads per lesson and course, with explicit new-thread and clear-history
  controls;
- notebook pages linked to attempts and tutor review, with learner-controlled evidence promotion;
- essay drafting, excerpt-linked critique, revision comparison, and rubric history;
- learner-owned flashcard collections with generation lineage, edit history, grouping, drag
  ordering, imports, and FSRS scheduling;
- pane management for lesson, tutor, notes, evidence, and references;
- restrained paths, goals, streaks, challenges, and mastery rewards;
- dark mode only after the approved light experience is stable.

Persistent per-lesson tutor conversations and the corrected Coach answer boundary are implemented
as of this update. Learner-owned flashcard collections and flexible panes are not.

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
