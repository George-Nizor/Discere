# Discere Fleet Backlog

## Now

- [ ] **Reach the validated series-circuit lesson**
  - Owner: Luna Coordinator with Luna Curriculum & Visual Learning and Luna Learner Experience
  - Desired outcome: make lesson two selectable from the course home with a truthful deterministic activity.
  - Acceptance criteria: learner-safe activity union, server journey, stage progress, responsive screen, provenance, and integration tests.
  - Relevant subsystem: `apps/server`, `packages/contracts`, `packages/activity-engine`, `apps/web`, `content/`
  - Dependencies: current first-lesson journey contracts and activity response review.

- [ ] **Browser visual QA capture**
  - Owner: Luna Quality Engineer
  - Desired outcome: verify the five separate screens at 1440×900, 1024×768, and 390×844.
  - Acceptance criteria: repeatable Playwright run, committed screenshot evidence or CI artifact, keyboard/reduced-motion checks, and no horizontal overflow.
  - Relevant subsystem: `apps/web`, `docs/ui-ux/screenshots/`, CI
  - Dependencies: browser-enabled CI image with Chromium system libraries.

## Next

- [ ] **Formal learning evidence for essay and review**
  - Owner: Luna Learning Systems with Luna Tutor & Workings Intelligence
  - Desired outcome: connect submitted teach-backs and review ratings to explicit mastery/evidence records without exposing rubric authority.
  - Acceptance criteria: independent versus assisted classification, persistence, safe learner responses, and server tests.
  - Relevant subsystem: `apps/server/src/db`, `packages/assessment-engine`, `packages/progression-engine`, `packages/contracts`
  - Dependencies: architect decision on evidence weights.

- [ ] **Redesigned notebook and workings entry**
  - Owner: Luna Learner Experience with Luna Tutor & Workings Intelligence
  - Desired outcome: make the existing notebook and ChatGPT workings handoff discoverable from the new journey while preserving explicit user handoff.
  - Acceptance criteria: no duplicate domain behaviour, mobile-safe entry, Exam restrictions, and component/smoke coverage.
  - Relevant subsystem: `apps/web`, `apps/server`, `packages/tutor-providers`
  - Dependencies: journey completion and notebook navigation decision.

- [ ] **Repository lint baseline cleanup**
  - Owner: Luna Quality Engineer
  - Desired outcome: reduce existing Biome diagnostics without weakening rules or changing product behaviour.
  - Acceptance criteria: clean `pnpm lint`, focused commits, no unrelated architectural changes.
  - Relevant subsystem: repository-wide
  - Dependencies: separate maintenance round after product integration.

## Later

- [ ] **Coherent electronics sequence: parallel circuits, power, and component reasoning**
  - Owner: Luna Curriculum & Visual Learning
  - Desired outcome: extend the course only when each lesson follows visual → interact → predict → explain → answer → review.
  - Acceptance criteria: reviewed provenance, deterministic visuals, activity contracts, and end-to-end learner reachability.
  - Relevant subsystem: `content/`, `packages/*-engine`, `apps/server`, `apps/web`
  - Dependencies: series-circuit lesson reachability.

- [ ] **FSRS or richer scheduler behind the deterministic interface**
  - Owner: Luna Learning Systems
  - Desired outcome: improve retention scheduling after personal-use data exists.
  - Acceptance criteria: explainable comparison with current fixed intervals, migration-safe state, and tests.
  - Relevant subsystem: `packages/progression-engine`
  - Dependencies: evidence persistence and architect approval.

## Parked

- Direct ChatGPT MCP transport before host compatibility is proven.
- Automated image retrieval, licensing, and generated-illustration import.
- Automatic in-app handwriting recognition.
- NotebookLM handoff automation.
- Large-scale curriculum importers and hypothetical deployment architecture.
