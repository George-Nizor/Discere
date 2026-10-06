# Biology: Cells to Ecosystems

Published: 2026-10-02. Status: introductory sequence implemented; wider biology remains partial.

## Source and intent

The study map names Genetics, Ecology and Evolution. The full connected
[EYNTK Biology note](https://app.notion.com/p/b2cea4c04f4c83318ddb01548c1fd7b4) was read and retained
in technical-source-snapshots.json. It contains a short informal overview and miscellaneous facts.
Its reading metadata does not establish that the 510-page book was read or implemented here.

The note's claim that cells divide because they are about to die is corrected: regulated division
supports growth, repair and reproduction. Several unrelated statements in the note oversimplify
taxonomy, animal reproduction, plant reproduction and immunity; those were not imported as
course facts. Notion was not edited.

Eighteen exact sections of OpenStax Biology 2e support the standard concepts. Their titles,
section numbers, URLs, access dates and reference-only status are stored in the course's sources.
The current web edition states CC BY-NC-SA 4.0 in its
[preface](https://openstax.org/books/biology-2e/pages/preface). All explanations, problems,
illustrative datasets, technical models and cover artwork are original Discere work. No publisher
exercises or images are redistributed.

## Connected sequence

| Module | Lessons |
| --- | --- |
| Inside living cells | Cell structures; diffusion; osmosis; enzymes and experiments |
| Energy and information | Photosynthesis; respiration; DNA copying; mitosis |
| Inheritance and change | Meiosis; single-gene inheritance; mutation; natural selection |
| Life in a changing world | Food webs; energy transfer; population limits; ecological evidence |

The course contains sixteen lessons and concepts, 64 answered teaching beats, 96 lesson questions,
32 fresh recall cards and 48 independent assessment problems. Lesson responses include 41 numeric
questions, 33 choices and 22 typed terms. Recall has sixteen numeric problems and sixteen term
questions. Each of placement, mixed and delayed transfer covers every lesson with a fresh problem;
together the checks contain 24 numeric and 24 qualitative items.

All 176 answer authorities were reviewed. The 81 numeric keys were recomputed from the authored
statements without the visual-engine functions. Choices are checked for exactly one accepted
option. Recall and check prompts do not repeat a lesson prompt.

## Interactive models and limits

Ten strict model kinds support cells, membrane exchange, illustrative series, energy reactions,
DNA, chromosome division, Punnett squares, population variants, food webs and trophic energy.
Every beat compares two distinct cases. Learners inspect structures and data, change diagram
progress or transfer efficiency, and reset. All controls are keyboard accessible.

- Cell drawings distinguish a typical photosynthetic leaf, animal cell and bacterium; they do not
  imply all plant cells contain chloroplasts. Sizes and organelle numbers are schematic.
- The membrane model conserves total solute and total volume. Diffusing solute uses fixed equal
  volumes. Osmosis uses a freely moving partition without pressure opposition; real cell walls and
  pressure are explicitly discussed. Equal concentrations retain molecular motion with no net flow.
- Series and population comparisons share a scale across both cases. Their observations are
  illustrative, not claimed biological measurements.
- DNA partners align in opposite directions. Replication preserves chromosome number while
  doubling DNA molecules. Division drawings show endpoints and one possible allocation, with
  distinct lengths for homologous pairs; crossover is omitted.
- Crosses assume one diploid locus, complete dominance and equal gamete chances. Probabilities
  do not impose a quota on a small family. Dominance does not establish fitness or frequency.
- Feeding arrows run from food to consumer. The diagram does not assert exact population effects.
  Trophic efficiencies are stated assumptions; energy bars use a common linear scale.
- Photosynthesis and respiration use simplified overall atom accounting. The course does not
  assert an exact universal ATP yield or give medical or laboratory procedures.

Calculated summaries stay hidden until feedback. Read-only assessment drawings contain the given
model without interactive worked summaries. Accessible descriptions expose visible diagram state.

## Equivalent short answers

Text authorities can explicitly supply acceptedAlternatives for one canonical accepted idea.
The canonical idea still determines coverage; alternatives are not extra required rubric ideas.
The schema rejects aliases attached to a multi-idea rubric. Word boundaries, negation and rejected
claims remain enforced. The field is optional without a default, so existing published bundles
retain their exact hashes. Authoritative terms and alternatives remain absent from learner journeys.

## Review and browser evidence

Fourteen model tests check scientific counting, conservation, schema bounds and synonym constraints.
Eight renderer tests cover controls, resets, common scales, carbon tracing, hidden summaries and
read-only givens. Three additional assessment tests verify equivalent phrases and rejection rules.
Thirty-six curriculum tests include all reviewed keys, distinct cases, fresh assessments, delay
requirements and exact publication binding.

Five staged browser scenarios passed after visual repairs. Every teaching beat and both cases
were exercised at 1440×900, 1024×768 and 390×844. Responses remain reachable above the fixed footer.
The scenarios also cover mistakes and correction, earned green feedback, fresh typed recall,
saved completion, all 48 independent-check responses, hidden results until submission, actual
lesson prerequisites and the seven-day delay. Browser data is disposable.

Representative inspected captures:
[roadmap](screens/biology/roadmap-1440.png),
[cell on tablet](screens/biology/inside-a-cell-1024.png),
[osmosis repair](screens/biology/osmosis-progress-1024.png),
[DNA](screens/biology/dna-completed-390.png),
[chromosome pairs](screens/biology/meiosis-and-gametes-beat-3-1024.png),
[inheritance](screens/biology/predicting-inheritance-beat-2-390.png),
[food web](screens/biology/reading-food-webs-390.png),
[experimental data](screens/biology/ecological-evidence-beat-2-1440.png) and
[earned feedback](screens/biology/correct-390.png).

Visual inspection found crowded osmosis labels and a clipped tablet term-answer field.
Labels now sit outside the changing compartments and short-answer fields are more compact.
The corrected captures were inspected.

Publication SHA-256: `c68bdbb85cf0d26f08953404fd11cf74237b49fc4fa1828e08dcb758763cac99`.
Original cover SHA-256: `f86af5509a395ead58bf95caeef449f5d570b79265729fa439e47fbc5d2811ed`.
The review is by the authoring agent under George's delegated curriculum/design instruction.
It is not independent human subject review or measured learner-outcome evidence.

## Release verification

`pnpm check` passed lint, strict typechecking, 1,021 package tests and thirteen bundle validations
(eleven active, two archived). The final production build and CSP check passed. Disposable
full-stack smoke delivered every one of the 132 active lessons.

The full browser run passed 84 of 85 scenarios, including all five Biology scenarios. The one
failure was the catalogue test's old expected count of ten courses. Updating that assertion to
eleven and explicitly checking Biology passed on a focused rerun; no runtime change was required.
Thus all 85 scenarios have passed across the full run and focused rerun.

Before loading Biology, SQLite's online backup produced
`data/backups/discere-before-biology-20261001T210554Z.sqlite`. Source and backup integrity were
`ok`. The restarted managed preview serves eleven active courses and 132 lessons. Read-only
verification reached all sixteen Biology journeys without answer authorities or accepted
alternatives, confirmed available placement and locked mixed/delayed checks, and received HTTP 200.

Every pre-existing database row fingerprint is preserved. Study summary and preferences,
including sound, are identical. Only sixteen unstarted concept rows were added (136 to 152).
Review cards remain 250; attempts and check sessions remain zero. Tests used disposable databases.

## Remaining scope

Sixteen published lessons connect cell structures, diffusion and osmosis, enzymes and fair comparisons, photosynthesis and respiration, complementary DNA, mitosis and meiosis, Mendelian inheritance, mutation and natural selection, food webs, trophic energy, population limits and ecological evidence. Includes sixteen-problem placement, mixed and seven-day delayed checks. These are introductory foundations. Gene expression, molecular regulation, linkage and wider inheritance, evolutionary evidence and speciation, quantitative population genetics, biodiversity, nutrient cycles, field methods, organismal biology and physiology remain.

Independent experimental design, longer biological explanations, field-data analysis and a
documented learner trial remain. Genetics, Ecology and Evolution are each marked partial in the
source coverage map. The wider Notion topic map and product goal remain active.
