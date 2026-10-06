# Calculus: Change and Accumulation

Published: 2026-10-02. Course ID: `calculus-change-and-accumulation`.
This implements an introductory sequence from the Mathematics note. Full calculus coverage remains partial.

## Source and corrections

The full textual [Mathematics (1) note](https://app.notion.com/p/3ebea4c04f4c8196bc01fe4799235753)
was read. Its sanitized body is retained in `technical-source-snapshots.json`; embedded images
and linked books were not interpreted. The note establishes learning intent, not answer authority.

The course corrects three mistakes in its calculus section:

- The limit of (x² − 4)/(x − 2) at 2 is 4; the code comments claiming E and 2.718 are incorrect.
- An indefinite integral has no fixed endpoint bounds and represents a family of antiderivatives.
- A definite integral accumulates the original rate; an antiderivative evaluates it by endpoint
  subtraction. Taking area under the antiderivative is a different calculation.

Eleven exact [OpenStax Calculus Volume 1 sections](https://openstax.org/books/calculus-volume-1/pages/1-introduction)
provide primary references. Section IDs, access dates and reuse limitations are in the course's
`sources` records. The current web edition is CC BY-NC-SA 4.0 and is used as a reference only.
All lesson wording, examples, tasks, SVGs and cover artwork are original Discere work.

## Implemented sequence

| Module | Lessons |
| --- | --- |
| Approach a point | Limits near a gap; one-sided limits and continuity; secants approaching a tangent |
| Work with rates | Polynomial power rules; the chain rule; position, velocity and acceleration |
| Reverse and refine | Turning points and endpoint checks; antiderivative families; rectangle sums |
| Follow accumulation | Signed integrals; the fundamental theorem; net change and starting amounts |

Twelve lessons contain 72 questions, 24 new numeric recall cards, twelve concepts and 48 answered
visual beats. Each beat compares two bounded graph cases. Six model kinds cover limits, jumps,
secants, tangents, antiderivatives and signed accumulation. Rectangle sums support left, right
and midpoint sampling. Sliders support keyboard changes and reset, with fixed scales across
comparisons. Axis labels use readable increments, positive and negative areas have distinct
colours, and worked result summaries stay hidden until feedback.

Each lesson asks four teaching questions and two skills questions before fresh recall. Mistakes
open the correction and permit continuation without becoming independent correctness evidence.
The original companion, green frame, correctness sound, progression and saved review are retained.

## Independent assessment and verification

There are twelve fresh problems for each of placement, the mixed challenge and delayed transfer.
Mixed requires every lesson; transfer opens seven days after completing mixed. These 36 prompts
are distinct from teaching and recall. Marking remains concealed until each check is submitted.

All 108 numeric keys were independently recomputed from the statements: 48 lesson/practice,
24 recall and 36 check problems. All 24 choice questions were reviewed, including a repaired
ambiguous units choice. No writing or content-gate issues remain.

Thirteen engine tests check finite differences, inverse differentiation, independent Simpson sums,
signed-area identities, rectangle bounds and invalid schemas. Five UI tests cover disclosure,
case changes, reset, discontinuity branches, signed shading and shared scales. Twenty-eight
content tests cover keys, fresh prompts, prerequisite rules and exact published-review binding.

Five dedicated Playwright scenarios pass against disposable databases. They cover every opening
at 1440×900, 1024×768 and 390×844; controls; feedback; fresh recall; saved completion; all 36 check
responses; confidence and the seven-day eligibility rule. Screenshot review found and repaired
a tablet layout that placed the input below the viewport. Every lesson opening now asserts that
the entire input fits above the footer at all three sizes.

Captures include [roadmap](screens/calculus/roadmap-1440.png),
[phone limits](screens/calculus/approaching-a-value-390.png),
[tablet rectangles](screens/calculus/rectangles-that-refine-1024.png),
[antiderivatives](screens/calculus/undoing-a-derivative-1440.png),
[signed area](screens/calculus/area-with-a-sign-390.png) and
[earned feedback](screens/calculus/correct-390.png).

Publication SHA-256: `5e979b48cf82c83686bfdee88dd95b8ba03dd57c5964c761abdf6a3eae70e525`.
Original cover SHA-256: `704bc09b8a94bb71e0b1702cb81a010f05c87fb45a76c50db3266bb8bae8b13c`.
Review and original-media provenance are stored beside the bundle. This is authoring-agent review,
not independent human subject review or measured learner-outcome evidence.

## Remaining scope

Formal limit proofs, unbounded limits, product and quotient rules, trigonometric/exponential/
logarithmic functions, implicit differentiation, related rates, broader optimization, substitution,
integration techniques, improper integrals, series, differential equations and multivariable calculus
remain. The graphs deliberately model bounded polynomials and simple jumps, not arbitrary functions.
Independent proof/workings assessment and a documented learner trial remain required.

The fifth Mathematics card also exposed a shared tablet overflow. The path row now scrolls within
its own bounds, and focused course links are brought fully into view. All eight focused catalogue,
roadmap, feedback and filter scenarios pass after this repair.

## Final release verification

`pnpm check` passes 911 package tests and eleven stored bundle validations. All 75 Playwright
scenarios pass together after the shared path repair. Production build, CSP and isolated smoke
pass. The existing 1.05 MB main JavaScript chunk remains a performance task.

The managed preview at http://127.0.0.1:4318 serves all nine courses and 104 lessons. The owner
database was backed up to `data/backups/discere-before-calculus-20261001T192103Z.sqlite`. Source
and backup integrity are good. Every pre-existing row fingerprint, study summary and preference
is preserved after restart and read-only journey verification. Only twelve unstarted concept
rows were added; attempts and course-check sessions remain zero, and review cards remain 202.
