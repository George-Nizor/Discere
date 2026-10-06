# Course checks

Updated: 2 October 2026. Maths Foundations 1.1.0 adds three authored checks:

| Check | Problems | Availability |
| --- | ---: | --- |
| Find your starting point | 6 | Optional, immediately available |
| Bring it together | 8 | After all six lessons have completed every required stage |
| Use it a week later | 6 | Seven elapsed days after the mixed challenge is submitted |

All twenty problems are original and distinct from the lesson and recall sets. Each check covers
all six Maths lessons. Problems combine numeric responses with choices about equality, coordinate
movement, rates and straight-line rules. Every item retains its taught lesson, concept IDs and
precise existing OpenStax references. Independent tests recompute all sixteen numerical keys;
curriculum validation checks each choice for one accepted option.

The accepted bundle SHA-256 is
`2050d7fc91141788ba778529b4a5f3a099b11228cb90b00c67041318511cac05`.
The previous editorial record is preserved in the course's review/history directory. The new
review is an agent review under George's delegated editorial authority.

## Geometry extension

Geometry: Shape and Space adds twelve questions per check kind, each covering every taught lesson.
Its 36 numerical answers were independently recomputed. Exact geometric givens use a bounded,
read-only SVG contract without computed teaching readouts. Five Geometry browser scenarios verify
all lesson prerequisites, all check responses, saved progress and seven-day eligibility.
[Geometry sources, publication and captures](../library-expansion/geometry-course.md) retain the evidence.

## Physics extension

Physics: Motion and Forces adds eighteen problems per check kind, covering every taught lesson.
Its 54 numerical check keys were independently recomputed. Read-only mechanics drawings display
bounded givens without worked results. Five Physics browser scenarios verify all eighteen lesson
prerequisites, all check responses, saved results and the real seven-day delay.
[Physics sources and captures](../library-expansion/physics-course.md) retain the evidence.
Calculus adds 36 fresh problems covering all twelve lessons. Its bounded graphs show givens
without worked result summaries. [Calculus records](../library-expansion/calculus-course.md)
retain source corrections and independent key checks.
Chemistry adds 36 fresh problems across all twelve lessons, with supplied particle data,
Lewis drawings, molar models and tables. All keys were independently recomputed and all three
sets exercised through the browser. [Chemistry records](../library-expansion/chemistry-course.md)
retain the sources and verification.
Biology adds 48 fresh problems across sixteen lessons: 24 numeric and 24 qualitative responses.
They cover cells, energy, inheritance, evolution and ecology with given-data models and tables.
[Biology sources and captures](../library-expansion/biology-course.md) retain the independent keys,
visual limits and verification.

Logic adds eight questions per kind, and Computer Science and Statistics add six each. Those sixty
new problems use original argument cases, Python listings and data displays. Each set covers every
taught lesson; all 33 numeric keys were independently recomputed. [Foundation extension](foundation-expansion.md)
records the 27 reviewed choices, unchanged teaching content and six responsive browser scenarios.
SQL adds fifteen questions per kind and Python twenty-one, with all 108 query/program results
independently executed. [Data extension](data-expansion.md) records preserved teaching content,
source semantics and four responsive scenarios. All eleven courses contain 398 check problems.

## Learner flow

The course overview links to the optional starting-point check, the mixed challenge and the later
check. Locked checks explain what opens them. They do not show a disabled Start control.

Each problem presents given data through an original diagram, table, argument, code listing or
subject model. The learner responds and records confidence separately. A saved answer is final, as the
opening screen explains. There is no timer. Submitted progress is saved on the server; unfinished
input and confidence also survive reload in local browser storage.

These course checks withhold correctness and explanations until the whole set is submitted.
Ordinary teaching lessons retain immediate correction, sound and their green earned frame.
The check result shows actual accuracy and XP, links back to lessons for missed ideas, identifies
confident errors, and offers the worked explanation for every response. It makes no automatic
claim that a correct set proves mastery. Lesson completion and concept mastery are not changed.

A fresh finish may play the original completion cue and a finite result animation. Saved mute,
celebration preferences and manual/system reduced motion apply. Reopening a result is static.
A due later check appears in Review, with changed-context applications rather than repeated
checkpoint answers: six for Maths, twelve each for Geometry, Calculus and Chemistry, eighteen for
Physics, sixteen for Biology, eight for Logic, six each for Computer Science and Statistics, fifteen for SQL and twenty-one for Python.

## Persistence and marking

Migration `0006_course_checks.sql` adds one table. Each session stores the exact reviewed check,
its content hash, course and lesson labels, timestamps, confidence and immutable first responses.
A content revision cannot silently replace an in-progress question or marking rule. Old sessions
remain readable even when the current course definition changes.

Public responses contain only the current problem while the check is open. They omit authorities,
correctness, hints and explanations. The general lesson-attempt and tutor lookup do not register
check-only questions. Numeric input must parse, and choice responses must name an authored choice
ID. Unknown, skipped, changed or extra-field submissions fail. Identical retries are idempotent.

The final challenge tests every required stage, including the completion stage; one isolated
completed progress row cannot unlock it. The later check uses the server clock and its prerequisite
check's actual completion time, including the exact seven-day boundary.

Only finishing a complete set records its response events and rewards, so interim XP cannot
reveal correctness. A first answered problem earns 8 XP when correct or 2 XP when incorrect.
Rewards are keyed by course, check and question, and cannot be earned again by reopening a result
or restarting the same content. Checks do not award lesson finishes, automatic placement skips
or concept mastery. Confidence never changes correctness or XP.

## Verification

The focused server suite completes all six Maths lessons through their actual attempt, recall
and stage APIs before opening the mixed challenge. It checks answer concealment, malformed input,
immutable responses, retries, source-version snapshots, bounded rewards and the exact delay.

The real-browser tests use their own temporary database and server. They verify the placement
flow, saved drafts, targeted results, the fully earned mixed challenge and delayed Review entry.
Screens cover 1440×900, 1024×768 and 390×844. They include numerical, choice, graph and table
problems plus placement, checkpoint and transfer results. Representative captures were inspected
for hierarchy, legible given values, responsive containment and reachable controls.

- [Starting-point problem](screens/placement-question-390.png)
- [Equality choices](screens/placement-choice-1024.png)
- [Mixed table problem](screens/mixed-table-1440.png)
- [Targeted result](screens/placement-result-390.png)

The complete repository check passes 1,178 package tests and thirteen bundle validations. All 98
browser scenarios passed together, including the six foundation, four data assessment and three
SQL construction scenarios. Four final SQL walkthroughs also cover early Exam submission.
Production build/CSP and isolated smoke pass. The main implementation status records owner
backups and preservation checks.

## Remaining scope

All eleven courses have authored placement, mixed and delayed checks in this checkpoint. The current checks use one reviewed problem set per
kind and content revision; reopening a completed set shows the saved result. Fresh retake forms,
broader proof/argument assessment and a documented learner trial remain useful follow-on work.
These checks do not complete the full algebra curriculum or George's wider source map.
