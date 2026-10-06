# Psychology: How Minds Work

Published: 6 October 2026. Course ID: `psychology-how-minds-work`, version 1.0.0.

Twelve connected lessons introduce psychology as a quantitative science, with an emphasis on
research methods and cognitive psychology. The course contains 72 lesson questions, 24 fresh recall
cards, twelve concepts and 48 answered visual beats with 100 authored cases. Three separate checks
contribute another 36 problems.

## Sequence

| Module | Lessons |
| --- | --- |
| How we know | Correlation is not a cause; Random assignment; How big, and will it replicate? |
| Perception and attention | Signal and noise; Where attention goes; Perception as inference |
| Memory and learning | Holding it in mind; Forgetting and spaced retrieval; Conditioning and reinforcement |
| Thinking and the social mind | Base rates and Bayes; Anchors and fast thinking; Conformity, obedience and bystanders |

Percentages, square roots and simple algebra are prerequisites. Each lesson asks four visual
questions before releasing the explanation, then two practice questions and two recall cards.
Fifty-four lesson questions are numeric, thirteen are short exact terms (confound, double-blind,
false alarms, chunking, variable ratio and so on) and five are multiple choice (7%).

## Replication stance

Findings that failed large or preregistered replications are taught only as cautionary cases:
ego depletion (multi-lab d = 0.04 against a published d of about 0.6), power posing, and the
slowed walking said to follow elderly-related words. The Open Science Collaboration's 35 of 97
replications is taught as data. The classic social studies are given with their numbers and
their critics: Asch read both ways, Milgram with his proximity variations, Burger's partial
replication and Perry's archival work, and the bystander effect with the Genovese myth corrected
and the 2020 CCTV evidence that someone intervenes in 91% of real conflicts. System 1 and
System 2 are presented as labels for fast and deliberate processing, not as two brain organs.

## Discere's own scheduler

The forgetting lesson uses the FSRS-4 curve R = 1/(1 + t/9S), in which stability S is the
interval at which predicted recall reaches 90%. This was checked against the installed
`ts-fsrs` 5.4.1 source. That version defaults to the FSRS-6 decay (0.1542), whose tail is flatter;
the lesson says so. The progression-engine comment calling stability "the retrievable half-life"
is inaccurate for FSRS (it is the 90% interval) and is noted here for whoever next edits it.

## Models and drawings

Fourteen bounded model kinds feed one explorer: scatter (with a confound colouring toggle),
random assignment (animated, with redraws), effect size (two normal curves, shiftable),
signal detection (draggable criterion with hit and false-alarm shading), task switching
(timed playback), cue combination, working-memory span (timed presentation, chunk boxes and
capacity slots), forgetting curve with reviews, Rescorla–Wagner pairing, reinforcement
schedules (cumulative record), natural-frequency grid, anchors, tallies and bystanders. Models
hold only stated values; all numbers come from `@discere/activity-engine`. Computed readouts
appear only after the learner has answered. Playback is finite; reduced motion removes autoplay
and keeps manual stepping and scrubbing.

## Sources

Facts were checked against OpenStax Psychology 2e (Spielman, Jenkins and Lovett, 2020) sections
2.1, 2.3, 5.1, 6.2, 6.3, 7.3, 8.1, 8.3, 8.4, 12.4 and 12.6. The current web edition states CC BY-NC-SA
4.0 (not CC BY 4.0), so it is recorded as reference-only. Specific figures come from 27 primary
papers, recorded with exact citations as reference-only; two PLOS ONE papers carry a Creative
Commons Attribution licence. All prose, problems, illustrative data and drawings are original;
illustrative numbers are labelled as such in the drawings.

## Verification

`packages/curriculum/tests/psychology-content.test.ts` recomputes every numeric key (54 lesson
questions, 19 numeric recall cards and 33 numeric check items) from first
principles, marks every exact-word answer with the shipped matcher, checks the scatter plots'
correlations against the prose and binds the bundle to its review hash.
`packages/activity-engine/tests/psychology.test.ts` covers the model invariants, and
`apps/web/src/journey/activities/PsychologyDiagram.test.tsx` covers controls, reduced motion and
concealed results. `apps/web/e2e/psychology-course.spec.ts` is written but has not been run.

This is an agent editorial review under delegated authority; there has been no independent human
subject review or learner trial.

Accepted bundle SHA-256:
`163fd8a4c0a0d0b57d5cb2765935af30e13dc32a972e35ee6db8dd50e0eab97b`.

Representative captures from a disposable dev stack:

- [Desktop roadmap](screens/psychology/roadmap-1440.png) and [phone roadmap](screens/psychology/roadmap-390.png)
- [Signal detection after answering](screens/psychology/signal-detection-1440.png) and [on a phone](screens/psychology/signal-detection-390.png)
- [Chess chunks](screens/psychology/chunking-1440.png), [reinforcement schedule](screens/psychology/schedule-1440.png),
  [natural frequencies](screens/psychology/base-rates-1440.png), [anchors on a phone](screens/psychology/anchors-390.png)
