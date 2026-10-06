# Chemistry: Atoms to Reactions

Published: 2026-10-02. Status: introductory course implemented; wider chemistry remains partial.

## Source and intent

Chemistry is required by George's twelve-family study map, including Organic, Inorganic and
Analytical Chemistry. The full connected [EYNTK Chemistry reading entry](https://app.notion.com/p/3b7ea4c04f4c8343ba2381bc4d510702)
was fetched. Its body contains an empty Summary + Notes heading. The reading metadata does not
establish that an agent read its 500-page book, and no textbook prose, exercises or images were
imported. The exact empty body and limitation are retained in technical-source-snapshots.json.

The course's prose, exercises, models and artwork are original. Eleven named primary sections
of OpenStax Chemistry 2e check standard facts. The current web edition's licence is CC BY-NC-SA
4.0, as stated in its [preface](https://openstax.org/books/chemistry-2e/pages/preface).
These sources are reference-only; this course does not redistribute their exercises or artwork.

| Section | Reference |
| --- | --- |
| 2.3 | [Atomic structure and symbolism](https://openstax.org/books/chemistry-2e/pages/2-3-atomic-structure-and-symbolism) |
| 2.4 | [Chemical formulas](https://openstax.org/books/chemistry-2e/pages/2-4-chemical-formulas) |
| 2.6 | [Ionic and molecular compounds](https://openstax.org/books/chemistry-2e/pages/2-6-ionic-and-molecular-compounds) |
| 6.4 | [Electronic structure of atoms](https://openstax.org/books/chemistry-2e/pages/6-4-electronic-structure-of-atoms-electron-configurations) |
| 7.1 | [Ionic bonding](https://openstax.org/books/chemistry-2e/pages/7-1-ionic-bonding) |
| 7.2 | [Covalent bonding](https://openstax.org/books/chemistry-2e/pages/7-2-covalent-bonding) |
| 7.3 | [Lewis symbols and structures](https://openstax.org/books/chemistry-2e/pages/7-3-lewis-symbols-and-structures) |
| 3.1 | [Formula mass and the mole concept](https://openstax.org/books/chemistry-2e/pages/3-1-formula-mass-and-the-mole-concept) |
| 4.1 | [Writing and balancing chemical equations](https://openstax.org/books/chemistry-2e/pages/4-1-writing-and-balancing-chemical-equations) |
| 4.3 | [Reaction stoichiometry](https://openstax.org/books/chemistry-2e/pages/4-3-reaction-stoichiometry) |
| 4.4 | [Reaction yields](https://openstax.org/books/chemistry-2e/pages/4-4-reaction-yields) |

## Taught sequence

| Module | Lessons |
| --- | --- |
| Meet the particles | Atomic identity; isotopes and mass; ion charge |
| Build a connection | Outer electrons; neutral ionic formulas; shared electron pairs |
| Count a substance | Formula counts; formula masses; moles and mass |
| Follow a reaction | Balanced equations; molar ratios; limiting reactants |

Twelve lessons contain 72 questions, 24 fresh numeric recall cards and twelve concepts.
Forty-eight answered visual beats each compare two distinct cases. Seven bounded model kinds
cover atoms, formula groups, ionic ratios, Lewis structures, amounts, equations and reaction progress.

The shell model covers at most eighteen electrons. Its circles group populations rather than
asserting orbital trajectories. Lewis layouts are schematic, with shared and lone-pair electrons
counted separately. A molecule and an ionic formula unit have distinct labels. Quarter-mole
blocks represent macroscopic amounts. Limiting-reactant bars use one common scale and retain
fractional molar reaction extents. Problems specify their rounded masses and ideal-completion assumption.

Learners can change ion counts, molecular copies, molar amounts and individual equation
coefficients, inspect electron dots and advance a reaction. Coefficient changes update the number
of visible molecular groups. Several edited coefficients persist while switching controls; reset
restores the authored case. Result summaries remain hidden until feedback. Assessment visuals
contain given data and no worked results.

## Assessment and review

Each lesson asks four teaching questions, then two skills questions and two new recall problems.
Mistakes release a correction and allow continuation while retaining failed evidence. Existing
green feedback, original sound, companion and saved progression apply.

Each of placement, mixed challenge and delayed applications contains twelve fresh problems,
covering every lesson. Some tasks reverse a relation or require leftovers rather than product
yield. Check problems were revised where an early draft reused a recall calculation.
Mixed requires all twelve completed lessons; delayed applications require seven days after mixed.
Marking stays hidden until submission and confidence remains separate from correctness.

All 108 numerical keys were recomputed independently from the statements: 48 lesson questions,
24 recall and 36 checks. All 24 choices were reviewed. Question-specific hint ladders guide
reasoning without giving the final numerical value. Writing and content validation have zero issues.

Fifteen model tests verify shell capacities, Lewis valence totals, mass arithmetic, balanced
equations and atom conservation across 576 reactant-supply combinations. Six UI tests check
concealed results, case changes, multi-coefficient editing, reset, visible particle counts,
progress bars, bond dots and read-only assessment visuals. Twenty-eight curriculum tests bind
keys, sources, diagrams and the published review to the actual bundle.

Five Chemistry browser scenarios pass against disposable databases. All 48 teaching beats and
both comparison cases were exercised at 1440×900, 1024×768 and 390×844. They also cover wrong and
correct responses, fresh recall, saved completion, all 36 assessment responses and the seven-day
eligibility rule. Every lesson opening keeps its entire numeric field above the footer; later
choice groups remain reachable in the scrollable pane.

Screenshot inspection found and repaired inherited styles that clipped a tablet field and
made atom labels pale. Representative reviewed captures:
[roadmap](screens/chemistry/roadmap-1440.png),
[shells on tablet](screens/chemistry/outer-electrons-1024.png),
[ionic ratios on phone](screens/chemistry/neutral-ionic-formulas-390.png),
[moles](screens/chemistry/from-moles-to-mass-1440.png),
[bonding](screens/chemistry/sharing-electron-pairs-beat-4-1024.png),
[balancing](screens/chemistry/balancing-reactions-beat-2-390.png),
[reaction progress](screens/chemistry/reaction-progress-390.png) and
[earned feedback](screens/chemistry/correct-390.png).

Publication SHA-256: `ba8501ab9dcbe5934f454b63cecfbeeb4841184607999112fc4927cff18f674c`.
Original cover SHA-256: `08f2943c3885c106363c412370cee9f80dd86b8cb03919102e51056ef456c306`.
The review is by the authoring agent under George's delegated curriculum/design instruction.
It is not independent human subject review or measured learner-outcome evidence.

## Remaining scope

Twelve published lessons cover atomic identity, isotopes, ions, first-eighteen-element shell populations, neutral ionic formulas, simple Lewis structures, formula counts and masses, moles, balancing, stoichiometric ratios and limiting reactants. Includes twelve-problem placement, mixed and seven-day delayed checks. These are general chemistry foundations. Periodic trends, nomenclature, molecular geometry, bonding theory, thermochemistry, states of matter, solutions, equilibrium, kinetics, acids and bases, redox/electrochemistry, organic pathways, broader inorganic chemistry and analytical measurement methods remain.

Open response chemical reasoning, laboratory interpretation and a documented learner trial
remain. The bounded models are teaching tools, not quantum calculations or laboratory simulators.
The full Notion topic map and wider product goal remain active.

## Final release verification

`pnpm check` passes 960 package tests and twelve stored bundle validations. All 80 Playwright
scenarios pass together. Production build, CSP and isolated smoke pass. The smoke traversal now
includes all 116 active lessons; its former fixed list omitted Geometry, Physics and Calculus
despite the previous documentation's broader claim. The existing large main JavaScript chunk
remains a performance task.

Before loading Chemistry, an online backup created
`data/backups/discere-before-chemistry-20261001T200058Z.sqlite`; source and backup integrity were
`ok`. The refreshed preview serves ten active courses and 116 lessons. All twelve Chemistry
journeys omit answer authority; placement is available and mixed/delayed checks remain locked.
Every pre-existing row fingerprint is preserved. Study summary and preferences, including sound,
are unchanged. Only twelve unstarted concept rows were added (124 to 136); review cards remain
226 and attempts/course-check sessions remain zero.

