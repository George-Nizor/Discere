# The personal foundation library

Updated: 2026-10-02

The requested Maths, Logic, and Computer Science sequences are published and playable. Start with
[Maths Foundations](http://127.0.0.1:4318/courses/maths-foundations), then
[Logic and Reasoning](http://127.0.0.1:4318/courses/logic-and-reasoning), or
[How Computers Solve Problems](http://127.0.0.1:4318/courses/cs-basics).

| Course | Sequence | Questions | Cards |
| --- | --- | ---: | ---: |
| Maths | Letters → balance → inverse operations → coordinates → gradient → line equations | 36 | 12 |
| Logic | Claims → conditionals → converse/contrapositive → constraint puzzles → truth tables → inference → validity/soundness → fallacies | 48 | 16 |
| Computer Science | Assignment → branching → loops/debugging → linear search → binary search → comparison growth | 36 | 12 |

Each lesson has four teaching beats and two further practice questions. Each beat combines a
deterministic visual, explanation, manipulation, and response. Two independent recall cards follow
the lesson. First responses, assistance, marking, completion, and FSRS scheduling are server-owned.

## Sources and original material

Prose, exercises, code, diagrams, arrays, and covers were authored for Discere. The source records
identify the principles being checked, rather than suggesting our invented examples came from
a textbook. Claim-level citations and exact sections are included in each bundle.

- Maths uses [OpenStax Elementary Algebra 2e](https://openstax.org/books/elementary-algebra-2e/pages/preface),
  sections 1.2, 2.1, 2.3, 4.1, 4.4, and 4.5 as references.
- Logic checks [forall x: Calgary](https://forallx.openlogicproject.org/), chapters 1, 2, 5, 9, 11,
  and 12. The records identify the Fall 2025 edition and current revision; no modal-logic material
  or copied textbook exercises are included.
- Computer Science checks the official Python tutorial's
  [introduction](https://docs.python.org/3/tutorial/introduction.html) and
  [control flow](https://docs.python.org/3/tutorial/controlflow.html), plus OpenStax's
  [algorithm chapter](https://openstax.org/books/introduction-computer-science/pages/3-2-algorithm-design-and-discovery).

The exact licence, licence URL, attribution, access date, edition, and reuse status are stored
in `bundle.json`. OpenStax and Python documents are `reference_only` in these courses; their text
and media are not ingested into provider prompts or reproduced in the lessons. Logic's compatible
licence permits adaptation, but the examples and wording shipped here remain original.

Each course has `review/publication.json`, an accepted editorial record bound to the shipped
bundle's SHA-256. `assets/provenance.json` records original cover creation, licence, review, and
file hash. Reviews were performed by Codex under George's delegated decisions, not by an independent
human subject reviewer.

## Interactions and marking

Maths diagrams calculate their displayed state directly. Numeric responses accept exact decimals,
fractions, and signed dimensionless values; signs in equation choices are preserved by marking.
Truth tables enumerate Boolean cases. Constraint puzzles are checked against all assignments.
Short text questions request a defined term or answer and do not imply general proof assessment.

The editable code runner supports assignments to `x`, arithmetic, `if/else`, `while`, and
`for i in range(n)`, with spaces for indentation. It validates all branches and stops after
100 trace steps. It has no `eval` or host access and is not a complete Python interpreter.
Experiments change the trace; `Restore example` returns to the authored code. Questions ask about
the original example or the stated repair, rather than marking arbitrary edited programs.

Searches show individual comparisons, the active interval, and discarded elements. Binary search
requires a sorted array and uses the lower middle index. Indices start at zero; comparison counts
start at one. Complexity questions count comparisons and explicitly separate sorting/access cost.

Correct recall before reveal can produce independent evidence. Wrong, blank, ungraded, or Direct
recall remains assisted regardless of the chosen rating. Completing a lesson requires actual
question evidence and every authored card reviewed; opening its completion URL cannot bypass work.

## Publication and verification

```bash
pnpm curate status maths-foundations
pnpm curate status logic-and-reasoning
pnpm curate status cs-basics
pnpm check
pnpm build
pnpm smoke
LD_LIBRARY_PATH=/tmp/discere-browser-libs/usr/lib/x86_64-linux-gnu pnpm e2e
```

Imported lessons stage in `.authoring/candidate.json`; only `pnpm curate publish <course>` updates
runtime content after editorial approval matches the exact hash. Do not run old scratch generators
over reviewed content. A changed lesson needs new review and updated citations before publication.

Independent tests recompute all Maths numeric answers and recall values, enumerate Logic assignments,
trace authored code and repairs, count search comparisons, and verify publication hashes. Browser
tests cover completing and resuming Maths, fractions, Logic toggles, edited code/restoration, and
stepwise binary search. A real Codex subscription probe and accepted Coach reply also succeeded.

## Responsive comparison

George's 1 October Brilliant references now govern the active foundation layout. Catalogue,
roadmap and player share a dark neutral/green theme. Questions precede their earned explanation;
correctness receives sound and a green frame, while mistakes lead to a correction and fresh recall.
A reserved footer keeps actions separate from a scrolling question pane. The earlier side-by-side
Roman layout is historical; current experience captures live in ../brilliant-experience/screens/.

The six visual families were rendered at 1440 × 900, 1024 × 768, and 390 × 844 and inspected for
legibility, overflow, working controls, and unobscured responses. Mobile captures are full-page
images so their height can exceed 844; their browser viewport is still 390 × 844.

| Family | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Number machine | [Capture](implementation-screens/maths-machine-1440x900.png) | [Capture](implementation-screens/maths-machine-1024x768.png) | [Capture](implementation-screens/maths-machine-390x844.png) |
| Equation balance | [Capture](implementation-screens/maths-balance-1440x900.png) | [Capture](implementation-screens/maths-balance-1024x768.png) | [Capture](implementation-screens/maths-balance-390x844.png) |
| Coordinate grid | [Capture](implementation-screens/maths-grid-1440x900.png) | [Capture](implementation-screens/maths-grid-1024x768.png) | [Capture](implementation-screens/maths-grid-390x844.png) |
| Conditional | [Capture](implementation-screens/logic-conditional-1440x900.png) | [Capture](implementation-screens/logic-conditional-1024x768.png) | [Capture](implementation-screens/logic-conditional-390x844.png) |
| Program trace | [Capture](implementation-screens/cs-program-1440x900.png) | [Capture](implementation-screens/cs-program-1024x768.png) | [Capture](implementation-screens/cs-program-390x844.png) |
| Binary search | [Capture](implementation-screens/cs-search-1440x900.png) | [Capture](implementation-screens/cs-search-1024x768.png) | [Capture](implementation-screens/cs-search-390x844.png) |

Maths now has a six-problem placement check, eight-problem mixed challenge and six fresh
applications due seven days after the challenge. [Course-check records](../course-checks/README.md)
retain the sources, exact reviewed bundle hash, scoring boundaries and responsive verification.
Open-ended proofs, learner-owned card collections, flexible panes, broader pathways and a
documented learner trial remain product work.

Geometry now extends the foundations path with twelve lessons, 72 questions, 24 recall cards and
36 separate course-check problems. [Geometry evidence](../library-expansion/geometry-course.md)
records exact drawings, folding nets, source mapping and the remaining wider-subject scope.
