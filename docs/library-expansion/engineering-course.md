# Engineering: Structures and Machines

Published: 6 October 2026. Course ID: `engineering-structures-and-machines`, version 1.0.0.

Twelve connected lessons take a learner from resolving a force into components to sizing a motor
for a hoist. The course contains 72 lesson questions, 24 recall cards, twelve concepts and 48
answered visual beats with 98 authored cases. Three course checks add 36 further problems.

The audience is an adult comfortable with algebra and basic trigonometry who already knows forces,
Newton's laws, work and energy, as taught in Physics: Motion and Forces. It is an introduction to
statics, strength of materials and machine elements, not a complete engineering curriculum.
Three-dimensional statics, friction in machines, the method of sections, combined and shear stress,
buckling, statically indeterminate structures, fatigue and dynamics remain.

## Sequence

| Module | Lessons |
| --- | --- |
| Loads and equilibrium | Forces as vectors; Turning effect: moments; Reactions of a supported beam |
| Structures | Trusses: the method of joints; Stress, strain and stiffness; Factor of safety and sizing |
| Beams and stiffness | Shear force and bending moment; Bending stress and the I-beam; Deflection and stiffness |
| Machines | Levers and pulleys; Gear trains: speed and torque; Efficiency and power in a drive |

Every lesson asks four visual questions before it releases the matching explanation, then two
practice questions and two fresh recall problems. Of the 72 lesson questions, 60 are numeric, 7 take
a one-word answer (roller, tension, compression, zero, neutral axis, second, same) and 5 are
multiple choice (7%). Numeric questions carry a three-step hint ladder; likely mistakes, such as
using sin for cos, leaving a load in kN when dividing by mm², or forgetting the rpm-to-rad/s
conversion, are named in the worked answers.

The course works in engineering units throughout: kN and kN·m for structures, MPa as N/mm² for
stress, GPa for Young's modulus, 10⁶ mm⁴ for second moments of area, rpm for shaft speeds. Each
prompt states its units and idealisations (pin-jointed trusses loaded at joints, lossless or stated
efficiencies, weightless levers).

## The explorer

`engineering_explorer` has ten bounded model kinds. Models carry only given values; every result is
computed by `packages/activity-engine/src/engineering.ts`.

| Kind | What the learner can do |
| --- | --- |
| `concurrent` | Watch forces slide from a common point into a tip-to-tail polygon; components and angle shown at the start |
| `moment` | Apply forces to a spanner or seesaw and see the line of action, perpendicular arm and turning direction |
| `beam` | Load a simple beam or cantilever (point and uniform loads), see the deflected shape, then the shear or moment diagram with a movable section |
| `truss` | Load a pin-jointed truss and isolate any joint to see its free-body diagram; after answering, members glow red (tension) or blue (compression) with width proportional to force |
| `stress_strain` | Run a tensile test: the specimen stretches, necks and breaks while a marker follows the curve; the elastic range is enlarged on a broken axis |
| `section` | Compare rectangles and I-sections in pseudo-3D with the linear bending-stress profile |
| `cantilever` | Apply a tip load and see deflection on a shared, enlarged scale |
| `lever` | Rotate first-, second- and third-class levers and compare arm lengths |
| `pulley` | Pull the rope of a block and tackle: numbered supporting strands, turning sheaves and rope travel |
| `gears` | Run simple, idler and compound trains whose teeth stay meshed at the true ratio |

Comparisons between a beat's cases share force, length, deflection and stress scales. Before the
learner answers, the drawing hides reactions (drawn as `R_A ?` with a conventional direction), member
forces and their sense, stresses, deflections, effort and output speeds. Four beats were changed
during review because a case's own givens disclosed the answer.

Playback is finite. Play, Pause, Replay, Next step and Reset are buttons; every slider responds to
the keyboard. System reduced motion and the app's reduced-motion setting remove Play and stop
playback immediately, and CSS transitions and the truss load-flow animation are disabled.

## Sources and licences

Licence pages were read on 6 October 2026. All four sources are CC BY-NC-SA 4.0, so every one is
recorded as reference-only. Discere's prose, problems, feedback, drawings and cover are original;
no source text, exercises or figures were imported.

| Source | Sections | Supports |
| --- | --- | --- |
| OpenStax University Physics Volume 1 | 10.3, 10.6, 10.8, 12.1–12.4 | Torque, angular and linear speed, rotational power, equilibrium, stress, strain, modulus, yield |
| OpenStax College Physics 2e | 7.7, 9.5 | Power and efficiency, mechanical advantage of simple machines |
| Engineering Statics: Open and Interactive (Baker and Haynes) | 4.1, 5.3, 6.4, 8.4, 10.2 | Moments, equations of equilibrium, method of joints, shear and moment diagrams, second moments of area |
| MIT OCW 2.001 Mechanics & Materials I (Fall 2006) | Lectures 20–22 | Bending stress and beam deflection |

Accepted bundle SHA-256:
`30059ec395543a930a7ed2a224ab1cea860f368610056c08822b48879474dc84`.

## Verification

- `packages/curriculum/tests/engineering-content.test.ts` recomputes all 120 numeric keys (60 lesson
  answers, 24 recall answers, 36 check answers) from the problem statements with hand-written
  formulas that do not call the explorer engine, and binds the shipped bundle, review and cover hash.
- `packages/activity-engine/tests/engineering.test.ts` (18 tests) checks physical invariants:
  beam equilibrium and dM/dx = V, joint equilibrium of solved trusses, the parallel-axis I-section,
  deflection-curve consistency, conservation of work and power in ideal machines.
- `apps/web/src/journey/activities/EngineeringDiagram.test.tsx` (7 tests) covers keyboard case
  changes, concealed results, the section probe, joint isolation, gear ratio in rotation, check
  visuals without controls, finite playback and reduced motion.
- `apps/web/e2e/engineering-course.spec.ts` is written but has not been run; it uses fixed ports
  and was left for a serial run.

Screenshots from a local stack at 1440×900 and 390×844 were inspected; they led to fixes for
label collisions, gradient strokes that vanished on horizontal members, clipped filters on
rotated gears and CSS variables missing from check visuals. Representative captures:

- [Course page](screens/engineering/roadmap-1440.png) and [on a phone](screens/engineering/roadmap-390.png)
- [Force components](screens/engineering/forces-as-vectors-1440.png)
- [Seesaw moments](screens/engineering/moments-seesaw-1440.png)
- [Beam free-body diagram](screens/engineering/supported-beam-1440.png)
- [Truss after answering](screens/engineering/truss-revealed-1440.png)
- [Shear diagram on a phone](screens/engineering/shear-and-moment-390.png)
- [Tensile test on a phone](screens/engineering/stress-strain-390.png)
- [I-section bending](screens/engineering/bending-stress-ibeam-1440.png)
- [Cantilever deflection](screens/engineering/deflection-1440.png)
- [Block and tackle](screens/engineering/pulley-1440.png)
- [Compound gear train](screens/engineering/compound-gears-1440.png)
- [All twelve placement visuals](screens/engineering/placement-visuals-sheet.png)

The editorial review was carried out by the authoring agent under delegated authority. No
independent human subject review or learner trial has taken place.
