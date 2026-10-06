# Philosophy: Knowledge, Mind and Ethics

Published: 6 October 2026. Course ID: `philosophy-knowledge-mind-and-ethics`, version 1.0.0.

Thirteen connected lessons introduce argument analysis, theory of knowledge, philosophy of mind,
ethics and the social contract. The course contains 78 lesson questions, 26 fresh recall cards,
thirteen concepts and 52 answered visual beats with 106 authored cases. Three course checks add
39 problems, one per lesson in each check.

The audience is an adult who has taken Discere's Logic and Reasoning course and knows validity
and truth tables. The aim is the rigour of a good university introduction: exact definitions,
named positions and philosophers, real arguments and the standard objections to them.

## Sequence

| Module | Lessons |
| --- | --- |
| Arguments | Finding the argument; Valid, sound and counterexamples; Fallacies and charity |
| Knowledge | Knowledge and Gettier cases; Dreams, demons and closure; Evidence and credence |
| Mind | Mind and body; Function and the Chinese Room; What makes you you |
| Ethics and politics | Counting consequences; Duty, persons and the footbridge; Character and the mean; The social contract |

Every lesson asks four visual questions before releasing each explanation, then two practice
questions and two independent recall cards. Answers are short and markable: counts of premises,
rows and counterexamples, posterior probabilities, expected utilities, averages and maximin
floors, and one- or two-word names for fallacies, positions, principles and philosophers.
Twenty-nine lesson questions are numeric, 37 take a short written term and 12 are multiple
choice (15%). The checks use 26 numeric items and 13 choices. Text questions that invite a tempting opposite (valid/invalid, yes/no, means/side
effect) reject it explicitly.

## Explorer

`philosophy_explorer` diagrams use nine bounded model kinds. Models hold only what a case
stipulates; verdicts are computed in `packages/activity-engine/src/philosophy.ts` and appear only
after the learner answers.

| Kind | What the learner does | Released after answering |
| --- | --- | --- |
| `argument_map` | Reads a passage with indicator words highlighted; tests rows by toggling p, q, r; a counterexample row breaks the inference link | The map of a passage (including unstated premises), the full truth table, the verdict |
| `bayes_grid` | One dot per person; marks who shows the evidence | Filtering to the evidence, counts, posterior, likelihood ratio |
| `knowledge_case` | Traces evidence to belief and belief to the world | The JTB lamps and whether the evidence connects to the truth-maker |
| `machine_table` | Feeds inputs to a machine table realised in gears, neurons, silicon or a rulebook | Table size only; the simulation is the learner's own |
| `persistence` | Toggles memory and body links across person-stages | Identity halos, Reid's transitivity failure, candidate counts |
| `trolley` | Chooses, runs a finite trolley animation, opens a utility ledger and a duty lens | Lives saved and whether the harm is a means |
| `expected_utility` | Switches between probability-width and equal-width bars | Levelled areas showing each expected utility |
| `veil` | Draws places behind a veil, highlights the worst-off | Averages, maximin choice |
| `mean` | Drags an amount along a spectrum between two vices | The arithmetic midpoint against the agent's mean |

Morphing kinds keep one mounted view so case changes animate; per-case state (rows, machine
state, trolley run) resets on a case change. Playback is finite. System reduced motion and the
app's `[data-motion="reduced"]` remove every transition and animation, and the trolley jumps to
its end state. All controls are buttons, range inputs or toggles with accessible names; SVGs
carry the given values as their accessible name, and every case lists its givens in text.
Course-check drawings render without controls or results.

## Sources and licences

Facts were checked, not copied. All prose, problems, models and drawings are original.

- OpenStax, *Introduction to Philosophy*, sections 5.3, 5.4, 5.5, 6.2, 7.2, 7.4, 9.2, 9.3, 9.4 and
  11.3. The assignment assumed CC BY 4.0; the book's preface states **CC BY-NC-SA 4.0**, so these
  are recorded as reference only.
- *forall x: Calgary*, chapters 1, 2, 11 and 12, CC BY 4.0, for argument, validity, soundness and
  truth-table method.
- Stanford Encyclopedia of Philosophy entries (analysis of knowledge, epistemic closure, Bayesian
  epistemology, dualism, functionalism, Chinese room, personal identity, consequentialism, Kant's
  moral philosophy, double effect, Aristotle's ethics, original position): reference only under
  the SEP copyright page.
- Project Gutenberg public-domain texts, checked directly: Descartes' *Meditations* (Molyneux),
  Locke's *Essay* II.27, Hobbes's *Leviathan* ch. XIII, Kant's *Groundwork* (Abbott), Mill's
  *Utilitarianism* ch. II and Aristotle's *Nicomachean Ethics* II.6 (the Milo passage).

The SEP dates Russell's stopped clock to *Human Knowledge* "1923", although that book appeared in
1948; the course gives no year. The drinks machine adapts Ned Block's Coke-machine example to a
20p can. Searle's room uses his placeholder symbol names.

Accepted bundle SHA-256:
`c80019e85860ba1597716148ad8071ba2bb1aa57292d8db379112577248dfb18`.

## Verification

- `packages/curriculum/tests/philosophy-content.test.ts` recomputes all 143 keys (78 questions, 26
  cards, 39 check items) from the problem statements: a hand-written truth-table search for
  validity and row counts, Bayes' theorem, a hand-run drinks machine and plain arithmetic. It also
  checks that each named answer is accepted by the text marker, that tempting wrong verdicts are
  rejected, the MCQ share, prompt uniqueness and the binding of the shipped bundle to the review.
- `packages/activity-engine/tests/philosophy.test.ts`: 16 tests of the formula parser, truth
  tables, Bayes counts, machine tables, persistence relations, trolley ledger, expected utility,
  maximin and the schema refinements.
- `apps/web/src/journey/activities/PhilosophyDiagram.test.tsx`: 7 component tests covering keyboard
  row testing, concealed results, the gated map and filter, machine input, reduced motion and
  check drawings.
- `apps/web/e2e/philosophy-course.spec.ts` was written but not run by the author (fixed ports are
  shared with other authors). Every lesson's four beats and the full placement check were walked
  in a disposable dev stack with all answers marked correct, and screenshots at 1440×900 and
  390×844 were inspected. Repairs from that inspection: diagram padding, legend and label
  overlaps on the mean scale, line spacing in SVG labels on phones, crowded expected-utility
  labels, the full-width segmented control, an empty band in the trolley and persistence scenes,
  and contrast on false truth badges.

Representative captures:

- [Roadmap](screens/philosophy/roadmap-1440.png) and [on a phone](screens/philosophy/roadmap-390.png)
- [Argument row tester](screens/philosophy/validity-and-soundness-1440.png) and [the released truth table](screens/philosophy/truth-table-result-1440.png)
- [Gettier case after answering](screens/philosophy/gettier-result-1440.png)
- [Bayes grid](screens/philosophy/bayesian-evidence-1440.png)
- [Machine table](screens/philosophy/functionalism-and-the-chinese-room-1440.png)
- [Reid's transitivity failure](screens/philosophy/transitivity-result-1440.png)
- [Footbridge run with ledger and duty lens](screens/philosophy/footbridge-run-1440.png)
- [The mean](screens/philosophy/virtue-and-the-mean-1440.png), [Hobbes and Locke mapped](screens/philosophy/the-social-contract-1440.png)
- [Elisabeth's argument on a phone](screens/philosophy/elisabeth-result-390.png)

This is an agent editorial review under delegated authority; no independent human subject review
or documented learner trial has occurred.
