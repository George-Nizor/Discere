# Independent checks for Logic, Computer Science and Statistics

Updated: 2026-10-02

Version 1.1.0 adds three assessment sets to each existing course. All original lesson IDs,
teaching cases, questions, recall cards, sources and artwork are preserved. The extension records
store their original-content fingerprints and the previous editorial reviews remain in history.

| Course | Placement | Mixed | Seven-day application | Numeric / choice |
| --- | ---: | ---: | ---: | ---: |
| Logic and Reasoning | 8 | 8 | 8 | 4 / 20 |
| How Computers Solve Problems | 6 | 6 | 6 | 15 / 3 |
| Probability and Statistics | 6 | 6 | 6 | 14 / 4 |
| Added | 20 | 20 | 20 | 33 / 27 |

Every set covers every taught lesson once. These 60 original problems are distinct from the
lesson and recall prompts. The library now has 290 independent check problems across nine courses.

## What the checks assess

Logic uses new claims, counterexamples, witness constraints, inference repairs and arguments whose
validity and soundness need separate judgments. Some questions require choosing a justified
inference rather than naming a fallacy.

Computer Science asks for literal execution of original Python, exact threshold behavior, loop
body versus condition-test counts, first-match linear searches, lower-middle binary searches and
the total cost of preparation plus lookup. Search comparisons assume direct access and the stated
ordering; the sorted-list bound is not presented as a claim about total runtime.

Statistics combines finite sample spaces, restricted conditional denominators, stated independence,
changes in centre, complete-population spread and sampling frames. The weather example explicitly
assumes independent days within its model. It makes no claim that real weather is independent.
Every variance or standard-deviation problem states that the listed observations are the whole
population; the denominator is N.

The existing primary references remain scoped to the concepts being assessed:
[forall x chapters 1–2](https://forallx.openlogicproject.org/html/Ch2.html),
[truth tables](https://forallx.openlogicproject.org/html/Ch9.html),
[semantic concepts](https://forallx.openlogicproject.org/html/Ch12.html),
[Python assignments](https://docs.python.org/3/tutorial/introduction.html),
[control flow](https://docs.python.org/3/tutorial/controlflow.html),
[OpenStax search algorithms](https://openstax.org/books/introduction-computer-science/pages/3-2-algorithm-design-and-discovery),
[Penn State finite probability](https://online.stat.psu.edu/stat414/Lesson02),
[MIT conditional probability and independence](https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/mit18_05_s22_class03-prep.pdf),
[NIST centre](https://www.itl.nist.gov/div898/handbook/eda/section3/eda351.htm),
[NIST spread](https://www.itl.nist.gov/div898/handbook/eda/section3/eda356.htm) and
[Statistics Canada sampling](https://www150.statcan.gc.ca/n1/edu/power-pouvoir/ch13/prob/5214899-eng.htm).
The Python documentation now identifies 3.14.8; these assignment/control-flow semantics remain
consistent with the previously recorded edition. No third-party exercises, prose or artwork
were imported. The original source provenance remains intact.

## Given-data visuals

Three strict visual types support these assessments:

- Statement lists distinguish premises from a proposed conclusion without identifying validity.
  Passage questions avoid conclusion labels that would reveal the answer.
- Python listings preserve indentation, escape markup and can be scrolled with the keyboard.
  They display reviewed code; the learner assessment does not execute submitted code.
- Dot plots share one scale across compared datasets and represent every observation, including
  duplicates. Exact values and accessible descriptions accompany the plots. They do not display
  calculated centres or spreads.

Desktop, tablet and phone captures were inspected. Dot stacks gained enough space for the maximum
allowed repeated values; ordinary comparison plots were shortened to reduce scrolling. Long
arguments and choices scroll inside the question pane. Every response and confidence control was
verified reachable above the reserved footer at 1440×900, 1024×768 and 390×844.

Representative captures:
[argument on phone](screens/foundations/logic-and-reasoning-placement-7-390.png),
[Python on tablet](screens/foundations/cs-basics-placement-2-1024.png),
[compared populations](screens/foundations/probability-statistics-mixed-1-1440.png),
[delivery rule on phone](screens/foundations/cs-basics-transfer-3-390.png).

## Authority and evidence

All 33 numeric keys were independently recomputed. Python listings were executed in isolated
CPython during verification; while-condition tests were instrumented and the repaired threshold
was tested below, on and above its boundary. Separate recursive searches counted comparisons.
Truth assignments were enumerated for the new witness puzzles and inference patterns. Finite
outcome enumeration and independent descriptive calculations verify the Statistics keys.
All 27 choice keys were reviewed and schema validation confirms exactly one markable option.

The new coverage comprises 50 curriculum tests, 3 visual-contract tests and 4 renderer tests.
The published-content tests require exact editorial hashes and original-content fingerprints,
without relying on ignored authoring candidates.

Six staged browser scenarios passed after repairs. They exercised all 60 responses at all three
viewports, saved drafts and first responses, concealed keys before submission, recommended the
missed lesson, showed worked explanations at the end, completed every prerequisite through real
lesson APIs and tested the seven-day boundary to the millisecond. Browser and smoke data are
disposable.

Reviews are by the authoring agent under George's delegated curriculum/design authority. They
are not an independent human subject review or a measured learner trial.

| Course | Accepted bundle SHA-256 |
| --- | --- |
| Logic | `9f6817712d3384e23550744eaeb4de132a2853013154dd872a297888d908b9da` |
| Computer Science | `70d7607da34414f6cfef9394cb3fd9dfacb9eb517515284969074555a7e0b396` |
| Statistics | `08a74f61ea85cafda8186995dd769aa7c722a692ae163ca22db7c6cf6f616cac` |

## Release verification

The final `pnpm check` passes lint, strict typechecking, 1,078 package tests and thirteen stored
bundle validations. Production build/CSP and isolated full-stack smoke pass. All 91 Playwright
scenarios passed together in one complete run, including the six new assessment scenarios.
The final visual-prose gate then passed its focused test and a full repository check.

Before loading the three foundation assessment revisions, SQLite's online backup created
`data/backups/discere-before-foundation-checks-20261001T214227Z.sqlite`; source and backup integrity
were `ok`. After restarting the preview, every pre-existing row fingerprint and all table counts
were unchanged. Study summary and preferences, including sound, were identical. Review cards
remain 282, with zero owner attempts and course-check sessions. Read-only verification reached all
twenty affected journeys without answer authority, confirmed available placement and locked
mixed/delayed checks, and counted 290 assessment problems across nine courses. The library still
has eleven active courses and 132 lessons.

## Remaining scope

SQL and Python for Data Analysis still need independent course-check sets. Open-ended proof and
argument assessment, learner-written programs, broader subject curricula, fresh retake forms and
a documented learner trial remain. These checks add evidence for the taught foundations; they do
not complete those wider subjects or the full Notion study map.
