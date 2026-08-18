# Review: When a Circuit Splits into Parallel Branches

- Course: `electronics-foundations`
- Concepts: `parallel-circuits`, `current`, `resistance`, `ohms-law`
- Generated: 2026-08-18T14:45:34.117Z by codex-cli default

## Pipeline

| Stage | Result | Detail |
| --- | --- | --- |
| generate | pass | Returned a parsed draft in 36 s. |
| lint + one repair pass | pass | The first draft passed the writing gate. |
| semantic preservation | pass | No repair was needed, so nothing could drift. |

## Prose

**Orientation.** Look first at the two junctions in the diagram. Each resistor connects across the same pair of points, so compare the voltage across branches before considering their individual currents.

A parallel circuit divides the path into branches. In the diagram, both resistors connect between the same two points, so each branch spans the same potential difference. With a 12 V supply, the 100 ohm branch carries 0.12 A because I = V/R, while the 300 ohm branch carries 0.04 A. These currents flow at the same time and combine in the supply path.

Adding a branch gives charge another route through the circuit. The supply therefore delivers more total current, and the equivalent resistance becomes smaller than the resistance of the smallest individual branch. Conductances add according to 1 / Rtotal = 1 / R1 + 1 / R2. For 100 ohm beside 300 ohm, the equivalent resistance is 75 ohm, giving a total supply current of 0.16 A from 12 V.

Use the slider explorer to change either branch resistance. Watch how lowering a branch resistance increases that branch's current and changes the total resistance. Two equal 100 ohm branches produce an equivalent resistance of 50 ohm because the available conductance doubles.

**Takeaway.** Parallel branches share the same potential difference, while their currents add and reduce the equivalent resistance.

## Questions

### generated-parallel-equivalent

What is the equivalent resistance of two 100 ohm branches connected in parallel?

- Answer: **50 ohm** — 1 / Rtotal = 1 / 100 + 1 / 100 = 2 / 100, so Rtotal = 50 ohm.
- Hint 1: Start with the parallel conductance equation.
- Hint 2: Substitute 100 ohm for both branch resistances.
- Hint 3: Add the two reciprocal terms, then invert the result to obtain the resistance.

### generated-parallel-total-current

A 100 ohm branch and a 300 ohm branch are connected in parallel across a 12 V supply. What total current does the supply deliver?

- Answer: **0.16 A** — The branch currents are 12 / 100 = 0.12 A and 12 / 300 = 0.04 A. Their sum is 0.16 A.
- Hint 1: Find the current in each branch using I = V / R.
- Hint 2: Calculate the two branch currents using 12 V and their resistances.
- Hint 3: Add the branch currents because they flow together in the supply path.

### generated-parallel-why-smaller

Why is the equivalent resistance of parallel branches smaller than either branch on its own?

- Accepted ideas: Adding a branch gives charge another route, so the total current increases for the same potential difference and the equivalent resistance falls below the smallest branch.; Parallel conductances add, increasing the overall conductance and therefore reducing the equivalent resistance.
- Hint 1: Think about what adding a branch gives charge.
- Hint 2: Relate the extra route to total current and equivalent resistance.

### generated-parallel-branch-voltage

Two parallel lamps are connected across a 6 V battery. What potential difference is across each lamp?

- (a) 3 V across each lamp
- (b) 6 V across each lamp
- (c) 12 V across each lamp
- (d) The lamps have different potential differences

- Accepted ideas: 6 V across each lamp
- Hint 1: Parallel branches connect across the same two points.
- Hint 2: Compare each branch's endpoints with the battery terminals.

## Recall cards

- **What happens to equivalent resistance when branches are connected in parallel?** → It falls below the resistance of the smallest branch because the branch conductances add.
- **What potential difference does each parallel branch have?** → Each branch has the same potential difference because every branch connects across the same two points.

## Repairs

None. The first draft passed the writing gate.

## Remaining lint notes

- `explanation` REP001_REPEATED_TRANSITION (warning): Vary or remove repeated transition phrases.

## Decision

Accept by running `pnpm author merge --course <id> --item <slug>`, which re-validates the whole bundle before writing it.
