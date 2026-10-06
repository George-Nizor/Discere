# Economics: Markets and Strategy

Published: 6 October 2026. Course ID: `economics-markets-and-strategy`, version 1.0.0.

Twelve connected lessons take an adult with basic algebra from opportunity cost to game theory, at
the depth of a strong first-year university microeconomics course. The course contains 72 lesson
questions, 24 fresh recall cards, twelve concepts and 48 answered visual beats with 98 authored
cases. Three separate checks contribute another 36 problems.

## Sequence and learning behaviour

| Module | Lessons |
| --- | --- |
| Choice and cost | What it really costs; Who should make what; The next unit |
| How markets set prices | Demand meets supply; When the curves move; How strongly buyers respond |
| Welfare and policy | Who gains from a sale; What a tax takes; Controls and spillovers |
| Firms and strategy | Costs and the best output; One seller; Strategic choices |

Every lesson asks four visual teaching questions before revealing the explanation, then two
practice questions and two new recall problems. Fifty-eight lesson questions are numeric, eight are
multiple choice (11%) and six take a one-word answer (Ben, sunk, right, Pigou, low, dilemma) with
listed alternatives and rejected ideas. Every calculation is real: equilibria from two linear
equations, midpoint elasticities, surplus and deadweight-loss triangles, tax incidence, MC = ATC,
MR = MC for a monopolist, best responses and repeated-game totals.

Markets are written as Qd = a − bP and Qs = c + dP; a tax is collected from sellers, so supply
becomes c + d(P − t). Costs use TC = F + vq + wq² with MC = v + 2wq, stated in each prompt.
Monopoly demand is the inverse form P = A − BQ with constant marginal cost.

The three course checks each cover all twelve lessons with fresh numeric problems and an economics
drawing: placement is optional, the mixed checkpoint requires every lesson, and the transfer check
opens seven days after the checkpoint.

## Models and drawings

Nine bounded model kinds in `packages/contracts/src/economics-diagram.ts` carry givens only:
`ppf`, `trade`, `margin`, `market` (views: equilibrium, surplus, tax, control, externality, with
optional shifts, marker price and quantity cap), `elasticity`, `costs`, `monopoly`, `game` (2–3
strategies a side) and `repeated` (four standard strategies, up to ten rounds). The activity engine
(`packages/activity-engine/src/economics.ts`) derives every result.

The explorer (`apps/web/src/journey/activities/EconomicsDiagram.tsx`) draws a dark terminal panel
with gradient surplus areas, a hatched deadweight-loss triangle, a violet tax-revenue block and a
glowing equilibrium. Case changes tween every curve and area between the compared cases on shared
axes; a tax or external cost animates in from zero. Interactions: a draggable price probe that
names shortage or surplus, a tax slider, a quantity probe on cost and monopoly curves, a production
point on the frontier, a time split for trade, a unit selector for marginal choices, a revenue
rectangle that plays from price A to price B, a "fix the rival's choice" control on payoff
matrices and round-by-round playback for repeated games. Numbers derived from the givens, best
responses, the Nash cell and repeated-game totals appear only after the learner answers. Playback
is finite, stops under system or app reduced motion, and every control is a button or a slider.

## Sources and limits

Definitions and relationships were checked against nineteen sections of OpenStax *Principles of
Microeconomics* 3e (Steven A. Greenlaw, David Shapiro and Daniel MacDonald, 2022): 1.1, 2.1, 2.2,
3.1–3.5, 5.1–5.3, 6.1, 7.3, 8.2, 9.2, 10.2, 12.1, 12.3 and 19.1. The live web edition is
CC BY-NC-SA 4.0, and its footer asks that the book not be ingested into large language models. It is
therefore recorded as reference-only: section URLs were confirmed by HTTP status, two pages were
opened only to confirm the licence and citation, and no text, exercise or figure was copied. All
prose, numbers, problems, drawings and the cover are original Discere work. Pigou's 1920 *The
Economics of Welfare* is cited from general knowledge.

Not covered: consumer choice with utility and budget lines beyond marginal reasoning, labour and
capital markets, long-run entry and exit, price discrimination, monopolistic competition, mixed
strategies, sequential games, information economics and all macroeconomics.

Accepted bundle SHA-256: `9bc202416e75ae99a761084dc2871a6b726f79d06698f1c61c7715995e05dc29`.

Reviewed cover SHA-256: `a61a5cc5f1daeef609333bf81354d707832ae2aac49e835f7b5c7821f16634dd`.

## Verification

- `packages/curriculum/tests/economics-content.test.ts` recomputes all 118 numeric keys (58 lesson,
  24 recall, 36 check) from first principles and binds the shipped bundle, checks and cover to the
  review record.
- `packages/activity-engine/tests/economics.test.ts` (18 tests) checks surplus and deadweight-loss
  areas against numerical integrals, tax incidence, controls, externalities, MC = min ATC, monopoly,
  Nash equilibria and repeated play.
- `apps/web/src/journey/activities/EconomicsDiagram.test.tsx` (5 tests) covers keyboard case
  changes, hidden results, the price probe, rival-choice controls, round playback and reduced
  motion.
- `apps/web/e2e/economics-course.spec.ts` is written on the physics pattern but has not been run.

Representative captures from a disposable local stack:

- [Desktop roadmap](screens/economics/roadmap-1440.png) and [phone roadmap](screens/economics/roadmap-390.png)
- [Tax wedge](screens/economics/tax-wedge-1440.png) and [external cost](screens/economics/externality-1440.png)
- [Quota deadweight loss](screens/economics/quota-deadweight-1440.png)
- [Elasticity after answering](screens/economics/elasticity-results-1440.png)
- [Monopoly after answering](screens/economics/monopoly-results-1440.png), [on a phone](screens/economics/monopoly-results-390.png)
- [Comparative advantage](screens/economics/trade-1440.png) and [marginal choice on a phone](screens/economics/margin-390.png)
- [Payoff matrix](screens/economics/payoff-matrix-1440.png) and [repeated game on a phone](screens/economics/repeated-game-390.png)
- [Placement item](screens/economics/placement-margin-1440.png)

This is an agent editorial review under delegated authority; no independent human subject review or
documented learner trial has occurred.
