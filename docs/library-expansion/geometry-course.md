# Geometry: Shape and Space

Published: 2 October 2026. Course ID: `geometry-shape-and-space`, version 1.0.0.

Geometry is the seventh active course: twelve connected lessons, 72 lesson questions, 24 fresh
recall cards, twelve concepts and 48 answered visual beats. Every beat has two authored diagram
cases, giving 96 comparisons. The separate placement, mixed and delayed checks add 36 new problems.

This implements an introductory sequence for the Geometry topic in George's
[Notion study map](https://app.notion.com/p/3ebea4c04f4c813db47dc7dc22e8f357), read again on
2 October. It is partial subject coverage. Formal proofs, congruence, parallel-line geometry,
constructions, general polygons, trigonometry, circle theorems and curved solids remain required.
A course entry or the supplied textbook's wider coverage is not evidence those topics are taught.

## Teaching sequence

| Module | Lessons | Application |
| --- | --- | --- |
| Angles and measurement | Measuring turns; Angles in triangles; Boundary and area | Complete a turn, find a missing angle, distinguish boundary length from covered area |
| Inside the shape | Base and height; Pieces and cutouts; Around and inside circles | Compare perpendicular heights, subtract or combine regions, distinguish radius and diameter |
| Shape and scale | Same shape, new size; When area scales; Right-triangle distances | Match corresponding lengths, square a scale factor, use right-triangle distances |
| From a plan to a solid | Distance on a grid; Filling space; Unfolding surface area | Derive distances from coordinate differences, count volume by layers, unfold six box faces |

The audience is an adult comfortable with arithmetic, fractions and basic algebra. Lessons form
a prerequisite sequence. Each asks four visual teaching questions, then two independent practice
questions and two new recall problems. Twenty lesson questions use choices; 52 use numeric marking.
Units are explicit in each prompt. Circle calculations state when to use 3.14.

Correct responses earn the shared sound and green frame, with an optional explanation. A wrong
response opens its correction and permits continuation while retaining the failed first answer.
Worked measure readouts remain hidden before the answer is checked. Recall tests a fresh case.

## Interactive diagrams

Original SVGs draw angles, triangle angles, rectangles, triangles, parallelograms, trapezoids,
cutouts, circles, similar figures, right triangles, coordinate distances and rectangular prisms.
Learners switch between changed cases, show unit squares or guides, and unfold or fold a box.

The two cases share the same unit scale, so a larger figure does not shrink back into an identical
bounding box. Triangle vertices use the stated angles; height guides are perpendicular. A box net
shows six faces in three matching pairs. Coordinate distances retain equally scaled axes.

Strict schemas accept bounded geometric givens, not executable code or answer fields. Course-check
drawings reuse the given-data renderer without teaching controls or worked readouts. Marking remains
on the server. Accessible descriptions, keyboard controls, reset, finite transitions and manual or
system reduced motion accompany the diagrams.

The original violet solid, gold set square and green sphere form the cover. Its reviewed SHA-256 is
`e1d8e9d085257d5a61e885cd2930c79214d06725f6f9af9a40372f1efee0f9c9`.
Cover provenance names its creator, licence, exact file and inspected roadmap capture.

## Independent course checks

| Check | Problems | Availability |
| --- | ---: | --- |
| Find your starting point | 12 | Optional, immediately available |
| Bring the ideas together | 12 | After all twelve lessons finish every required stage |
| Use it in a new setting | 12 | Seven elapsed days after the mixed check is submitted |

Every check covers every taught lesson, using original problems distinct from lesson and recall
prompts. Delayed applications include flooring, trim, models, braces, tanks and wrapping.

The shared [course-check engine](../course-checks/README.md) records immutable first responses and
confidence, saves progress, conceals correctness until the complete set is submitted, and recommends
lessons for missed ideas. A due delayed check appears in Review. Bounded rewards do not award lesson
completion or automatically claim concept mastery. Each check currently has one reviewed form.

## Sources and editorial evidence

Standard mathematical facts and formulas were checked against these exact primary sections:

| Source | Supported scope |
| --- | --- |
| [OpenStax Prealgebra 2e, 9.3](https://openstax.org/books/prealgebra-2e/pages/9-3-use-properties-of-angles-triangles-and-the-pythagorean-theorem) | Angles, triangle angle sum and the Pythagorean theorem |
| [OpenStax Prealgebra 2e, 9.4](https://openstax.org/books/prealgebra-2e/pages/9-4-use-properties-of-rectangles-triangles-and-trapezoids) | Rectangles, triangles and trapezoids |
| [OpenStax Prealgebra 2e, 9.5](https://openstax.org/books/prealgebra-2e/pages/9-5-solve-geometry-applications-circles-and-irregular-figures) | Circles and composite areas |
| [OpenStax Prealgebra 2e, 9.6](https://openstax.org/books/prealgebra-2e/pages/9-6-solve-geometry-applications-volume-and-surface-area) | Rectangular solids, cubes and surface area |
| [OpenStax Elementary Algebra 2e, 8.7](https://openstax.org/books/elementary-algebra-2e/pages/8-7-solve-proportion-and-similar-figure-applications) | Proportions and similar figures |
| [OpenStax Intermediate Algebra 2e, 11.1](https://openstax.org/books/intermediate-algebra-2e/pages/11-1-distance-and-midpoint-formulas-circles) | Coordinate distance derived from right triangles |

Metadata records edition, exact section, access date, attribution, licence and reference-only use.
The current web edition's CC BY-NC-SA 4.0 notice was checked; older downloads can carry different
notices. Discere's prose, examples, exercises, feedback and media are original.

Independent arithmetic recomputes all 112 numerical keys: 52 teaching/practice responses, 24 recall
responses and 36 check responses. The twenty choice questions were reviewed for one defensible
answer and useful misconception feedback. Candidate content and writing validation report no issues.
Independent tests measure polygon areas and actual triangle angles rather than reusing the renderer's
answer calculations.

Accepted bundle SHA-256:
`b7c88b7a79c098cdee85dce2b24bf3fb7b30602337fe027e8613280eae101fc0`.

The publication regression test binds the shipped questions, cards, diagrams, checks and cover to
the reviewed authoring. A final normalization changed only JSON property order; every content value
matched the visually reviewed candidate. The earlier review is preserved in `review/history/`.
The preparation script now writes the schema-validated bundle so persisted and loaded hashes agree.

The review is an agent review under George's delegated authority, not an independent human subject
review. A documented learner trial has not occurred.

## Browser and visual verification

Five Geometry browser scenarios use a disposable database. They cover all twelve lesson openings
and changed cases at 1440x900, 1024x768 and 390x844; wrong-answer correction; earned feedback;
saved position and completion; fresh recall; all 36 course-check responses; recommendations;
actual lesson prerequisites; seven-day eligibility; saved results; and reduced motion.

The first phone roadmap capture exposed a Start action partly underneath navigation when course
checks extended the overview. The action now anchors above phone navigation, and the path reserves
space for its final pedestal. A browser assertion checks the action's actual bounds on first load.

Representative inspected captures:

- [Desktop roadmap](screens/geometry/roadmap-1440.png)
- [Phone roadmap](screens/geometry/roadmap-390.png)
- [Triangle angles](screens/geometry/angles-in-triangles-1440.png)
- [Perpendicular height on a phone](screens/geometry/base-and-height-390.png)
- [Cutout region](screens/geometry/pieces-and-cutouts-390.png)
- [Unfolded box on a phone](screens/geometry/box-net-390.png)
- [Earned feedback](screens/geometry/correct-1440.png)
- [Right-triangle placement problem](screens/geometry/placement-right-triangle-390.png)
- [Delayed check result](screens/geometry/transfer-result-1024.png)

The release passes 791 package tests, nine stored bundle validations, 65 browser scenarios,
production build/CSP and isolated full-stack smoke. The main [implementation status](../implementation-status.md)
records the owner database backup and preview checks. Tests do not create owner study attempts.
