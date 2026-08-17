## Current objective

Own deterministic review scheduling, flashcard generation, review persistence, and independent versus assisted evidence classification.

## Completed

- `793a7fc` — added deterministic spaced-review functions and reviewed-question flashcard generation.
- `1c6e709` — added SQLite review cards/sessions, safe front responses, explicit reveal, rating, evidence classification, and due scheduling.
- `edec352` — added the review home entry point and completion integration.

## Validation

- progression-engine tests passed
- server tests cover card creation, concealed backs, reveal authorization, rating, evidence type, and scheduling
- web component tests cover the one-card-at-a-time recall → reveal → rate flow
- smoke test passed review home, safe session, reveal, independent rating, and due-date response

## In progress

Coordinator closeout complete for this round.

## Blocked

No implementation blocker.

## Concerns

- fixed intervals are intentionally simpler than FSRS
- review ratings are not yet formal mastery evidence
- the default review card is seeded from the current question until broader course content is reachable

## Proposed next work

- connect review outcomes to explicit mastery/evidence records
- add browser coverage for keyboard and narrow-layout review ergonomics
- evaluate FSRS only after personal-use review data exists

## Questions for architect

- What evidence weight should a recalled card receive after a prior assisted answer reveal?
