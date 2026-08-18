# Electronics Foundations

A five-lesson introduction to direct-current circuits, built around diagrams the learner can
change and calculations they can check. Every numeric answer in this bundle has been recomputed
from the physics rather than trusted from the draft it came from.

## Lessons

1. **Current in a single loop** — current, resistance, Ohm's law. Ohm's law explorer.
2. **Resistance in series** — equivalent resistance, shared current, voltage division. Series
   explorer.
3. **When a circuit splits into branches** — shared branch voltage, added conductances, an
   equivalent resistance below the smallest branch. Parallel explorer.
4. **How much energy a circuit moves** — power as a rate of energy transfer, `P = IV`, and the
   distinction from energy. Voltage explorer.
5. **Components that break the pattern** — ohmic behaviour against a diode's forward voltage,
   and the resistor that sets an LED's current. Series explorer.

## Inventory

| Item                  | Count |
| --------------------- | ----- |
| Concepts              | 10    |
| Lessons               | 5     |
| Questions             | 20    |
| — multiple choice     | 4 (20%, limit 35%) |
| — numeric             | 10    |
| — short written       | 6     |
| Authored flashcards   | 10    |
| Essay topics          | 1     |
| Interactive activities| 5     |
| Sources               | 5     |

## Safety boundary

Every example is low-voltage direct current from a battery or a USB supply, as spec v0.2
section 18.2 requires. The bundle contains no mains-wiring, high-current, or stored-charge
material.

## Provenance

Every lesson and question cites an OpenStax *Physics* section under CC BY 4.0, recorded in the
bundle's `sources` array with its access date.

## Generated material

Lesson 3 was drafted by the authoring pipeline (`content/electronics-foundations/generated/`,
ignored by Git) and reviewed in
[`review/parallel-branches.md`](review/parallel-branches.md). The review found two accepted
ideas written as whole sentences, which the validator refused to merge; they were shortened to
matchable phrases and the ohm symbol was made consistent with the rest of the course before the
merge succeeded. Everything else here was authored directly and passes the same gates.

## Working on this bundle

```bash
pnpm author validate --course electronics-foundations
pnpm author lint --course electronics-foundations
```
