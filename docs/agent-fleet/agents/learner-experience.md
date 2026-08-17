## Current objective

Audit where review and additional lessons can enter the existing React workflow without adding clutter or bypassing domain contracts.

## Completed

- `c5e0d7c` — audited the React shell, current lesson coupling, responsive styles, keyboard focus rules, and component-test layout.
- Pending commit — documented the safe UI boundary for the first review slice.

## Validation

- Existing component tests cover answer, transfer, notebook, mode, tutor, and workings-review flows.
- No new UI code was added because the review endpoint and shared response contract are not yet integrated.

## In progress

- Waiting for the Learning Systems/server contract before implementing a learner-facing review queue.

## Blocked

- Review UI implementation depends on a stable review API contract.

## Concerns

- Current web code assumes the only activity is Ohm's-law exploration.
- `App.tsx` fetches `/api/lessons/current` and wires the Ohm's-law activity directly into `CircuitLab`; adding a review card or a second activity now would create a parallel domain contract in the frontend.
- The current narrow-layout styles already collapse the map and stack core controls, so the review UI should reuse those patterns instead of adding a new dashboard shell.

## Proposed next work

- Add a presentational review queue only after the server response includes due state, evidence type, and a safe review-session identifier.
- Keep answer backs out of generic learner-safe lesson responses; render them only after the review session authorizes reveal.
- Add component coverage for keyboard focus, narrow layouts, empty queues, and reduced motion.

## Questions for architect

- None yet.
