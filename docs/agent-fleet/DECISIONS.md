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
