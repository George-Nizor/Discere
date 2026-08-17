# Fleet Decisions

## ADR-001 — Keep specialist work isolated until contract review

Date: 2026-08-17
Status: accepted

### Context

The first development round has several specialists whose work may touch shared curriculum, contract, and learner-flow boundaries. Concurrent edits to `main` would make hidden contract drift and review ownership difficult to detect.

### Decision

Each specialist works on a dedicated `fleet/*` branch and worktree. The Coordinator reviews commits, resolves dependencies, and integrates only compatible changes into `main`.

### Consequences

Specialists can make progress independently, while contract changes must be explicitly reviewed before dependent work is integrated. Worktree management adds a small amount of operational overhead.

### Alternatives considered

Editing `main` concurrently was rejected because it creates avoidable race conditions and makes the repository status unreliable.

## ADR-002 — Start spaced review with a deterministic scheduler interface

Date: 2026-08-17
Status: proposed

### Context

Discere is local-first and does not require a model API for core learning behaviour. The next review slice needs explainable behaviour before any optimisation or external scheduling dependency.

### Decision

The Learning Systems agent should isolate a simple deterministic scheduler behind pure functions with an injected clock. Independent and assisted evidence must remain separate inputs and outputs.

### Consequences

The first scheduler will be intentionally simple and can later be compared with FSRS behind the same interface. The prototype will not claim optimal retention scheduling yet.

### Alternatives considered

Immediate FSRS integration was deferred because it would add complexity before persistent review data and personal-use feedback exist.

## ADR-003 — Validate the series activity before exposing it to the learner shell

Date: 2026-08-17
Status: accepted

### Context

The curriculum bundle can now describe a series-circuit activity and render its deterministic visual, but the current learner response and web shell are specialized to the first Ohm's-law activity.

### Decision

Integrate the series lesson, activity union, visual renderer, and content validation now, while deferring learner-facing lesson navigation and activity rendering until a shared response contract is implemented.

### Consequences

The course has a truthful next lesson ready for the next round, and validation can catch content drift immediately. The lesson is not yet reachable from the current web flow, which must be reported rather than hidden.

### Alternatives considered

Keeping the lesson out of the bundle was rejected because it would delay curriculum validation. Reusing the Ohm's-law UI for a series circuit was rejected because it would misrepresent the technical model.

## ADR-004 — Migrate to a routed journey while preserving the legacy experience

Date: 2026-08-17
Status: accepted

### Context

The approved Interactive Story reference describes five separate learner screens and a completion flow. The existing prototype is a single long-form page with valuable accountability, notebook, and tutor behaviour that should remain available while the new journey is proven.

### Decision

Make the routed course home and six-stage first lesson the default experience. Keep the prior experience behind `/legacy` until the redesigned journey has broader browser coverage and all required learning surfaces are migrated. Use shared learner-safe contracts and server-owned progress rather than duplicating domain rules in the UI.

### Consequences

The learner now sees context before the circuit and has one dominant task per screen. The repository carries a temporary legacy route and two UI shells during migration. The first lesson is fully reachable; later curriculum remains explicitly planned until its activity contract is integrated.

### Alternatives considered

Replacing the existing page immediately was rejected because it would remove a known working notebook/tutor path. Building the five reference screens as one dashboard was rejected because it conflicts with the approved comparison-board intent.

## ADR-005 — Expose review answer backs only through an authorised session reveal

Date: 2026-08-17
Status: accepted

### Context

Flashcards need answer-bearing domain data for scheduling, but generic learner-safe lesson and review payloads must not reveal answers before recall. Review ratings also need to preserve independent versus assisted evidence.

### Decision

The review home and session creation endpoints return only card fronts. A dedicated session reveal endpoint returns the back exactly once before a dedicated rating request schedules the next due date and classifies evidence. The stored card back remains server-side.

### Consequences

The review UI must follow the front → recall → reveal → rate sequence. The boundary is explicit and integration-tested. A later scheduler can replace fixed intervals behind the same session contract.

### Alternatives considered

Returning both front and back to simplify the UI was rejected because it makes accidental answer leakage trivial. Letting the client schedule cards was rejected because it would weaken persistence and evidence integrity.
