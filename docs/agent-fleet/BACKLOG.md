# Discere Fleet Backlog

## Now

- [ ] **Learning Systems — deterministic spaced-review domain slice**
  - Owner: Luna Learning Systems
  - Desired outcome: schedule concept review from independent and assisted evidence with deterministic due dates and no model dependency.
  - Acceptance criteria: pure functions, injected clock, explicit evidence classification, review-queue ordering, and unit tests for correct/incorrect/assisted outcomes.
  - Relevant subsystem: `packages/progression-engine`, `packages/contracts`
  - Dependencies: current attempt and concept contracts remain unchanged.

- [ ] **Curriculum — next electronics lesson**
  - Owner: Luna Curriculum & Visual Learning
  - Desired outcome: add a coherent series-circuit lesson with reviewed provenance and a deterministic technical visual/activity.
  - Acceptance criteria: schema-valid bundle, referential integrity, provenance for factual claims, deterministic visual truth, and curriculum tests.
  - Relevant subsystem: `content`, `packages/curriculum`, `packages/visual-engine`, `packages/activity-engine`
  - Dependencies: activity/visual contract review before learner API exposure.

- [ ] **Tutor reliability audit**
  - Owner: Luna Tutor & Workings Intelligence
  - Desired outcome: make stale or malformed companion responses easier to recover from without changing the provider boundary.
  - Acceptance criteria: narrow validation improvement, request-ID preservation, no answer leakage, and regression tests.
  - Relevant subsystem: `packages/tutor-providers`, `apps/server`, `apps/web`
  - Dependencies: existing companion protocol and mode rules.

- [ ] **Independent regression audit**
  - Owner: Luna Quality Engineer
  - Desired outcome: identify and test high-risk gaps in accountability, persistence, curriculum integrity, and accessibility-sensitive behaviour.
  - Acceptance criteria: reproducible findings, focused tests/fixes where safe, and a report of unresolved concerns.
  - Relevant subsystem: repository-wide
  - Dependencies: specialist diffs when available.

## Next

- [ ] **Server review persistence and queue endpoint**
  - Owner: Luna Coordinator with Luna Learning Systems
  - Desired outcome: persist review state and serve only authorized due cards.
  - Acceptance criteria: migration-safe SQLite tables, independent/assisted evidence fields, stale request protection, and integration tests.
  - Relevant subsystem: `apps/server/src/db`, `apps/server/src/routes.ts`, `packages/contracts`
  - Dependencies: accepted review domain contract.

- [ ] **Review queue UI**
  - Owner: Luna Learner Experience
  - Desired outcome: introduce review as one coherent learner workflow with low clutter and narrow-layout support.
  - Acceptance criteria: keyboard-accessible queue, clear evidence state, reduced-motion support, and component tests.
  - Relevant subsystem: `apps/web`
  - Dependencies: server review endpoint and stable response schema.

- [ ] **Lesson navigation**
  - Owner: Luna Learner Experience with Luna Curriculum & Visual Learning
  - Desired outcome: make validated lessons reachable without changing current answer boundaries.
  - Acceptance criteria: learner-safe lesson lookup, no hidden answer authority, progress context, and component/server coverage.
  - Relevant subsystem: `apps/web`, `apps/server`, `packages/contracts`
  - Dependencies: activity union contract and content repository routing.

## Later

- [ ] FSRS or another richer scheduler behind the deterministic review interface.
  - Owner: Luna Learning Systems
  - Desired outcome: improve retention scheduling after real personal-use data exists.
  - Acceptance criteria: comparison against the simple scheduler, explainable assumptions, and migration-safe state.
  - Relevant subsystem: `packages/progression-engine`
  - Dependencies: review persistence and architect approval.

- [ ] Broader series, parallel, power, and component-reasoning sequence.
  - Owner: Luna Curriculum & Visual Learning
  - Desired outcome: coherent introductory electronics course.
  - Acceptance criteria: each lesson follows visual → interact → predict → explain → answer → review and has reviewed provenance.
  - Relevant subsystem: `content`, `packages/*-engine`, `apps/web`
  - Dependencies: lesson navigation and activity contracts.

- [ ] Browser-level coverage for the complete learner loop.
  - Owner: Luna Quality Engineer
  - Desired outcome: cover interactions that jsdom cannot faithfully represent.
  - Acceptance criteria: repeatable browser suite for narrow layouts, transfer recovery, notebook export, and review handoff.
  - Relevant subsystem: `apps/web`, `scripts`
  - Dependencies: browser test strategy decision.

## Parked

- Direct ChatGPT MCP transport before host compatibility is proven.
- Automated image retrieval, licensing, and generated-illustration import.
- Automatic in-app handwriting recognition.
- NotebookLM handoff automation.
- Large-scale curriculum importers and hypothetical deployment architecture.
