# Implementation Status

## Implemented in the current vertical slice

### Local runtime and verification

- pnpm TypeScript monorepo
- Node.js 24 pinning for common version managers
- one-command `pnpm run setup` workflow
- cross-platform environment diagnostics through `pnpm doctor`
- coordinated development and built-prototype startup
- targeted process cleanup through `pnpm stop`
- configurable local API and web ports
- loopback-only prototype binding
- temporary full-stack smoke testing on isolated ports and SQLite data
- GitHub Actions coverage for lint, TypeScript, tests, curriculum validation, build, and smoke checks

### Learning experience

- React/Vite visual lesson shell
- Fastify REST server and SQLite persistence
- electronics seed course and concept map
- deterministic circuit SVG and Ohm's law explorer
- prediction-first circuit changes with stale-result invalidation
- deterministic current-against-voltage relationship graph
- numeric assessment with SI unit aliases
- visible lesson provenance and licensing outside Exam mode
- read-aloud through browser speech synthesis

### Accountability and progression

- Coach, Assisted, Direct, and Exam tutoring modes
- immutable tutoring mode within an attempt
- immutable completed attempts
- hint event recording and closed assistance after completion
- timed, single-use answer-reveal flow
- original-attempt closure after a worked answer is revealed
- duplicate reveal, hint, and resubmission rejection after answer reveal
- deterministic transfer challenge unlocked after reveal
- retryable transfer assessment with SI-unit support
- no recovery reward for incorrect transfer attempts
- one-time recovery XP and reduced mastery evidence for a correct transfer
- assisted-attempt recording for recovered concepts
- permanent transfer closure after completion
- Exam-mode hint, reveal, source, tutor, and workings-review guardrails
- XP and mastery separation with per-concept mastery updates
- Direct-mode evidence classified as assisted

### Generated content and ChatGPT companion

- generated-prose lint rules, including equivalent-unit answer-leak detection
- source-number and factual-token preservation checks
- visual-brief validation and curriculum referential-integrity checks
- learner-facing ChatGPT companion handoff using the normal ChatGPT subscription
- structured tutor packets containing the current lesson, mode, source IDs, response contract, and the tutor system prompt read from `prompts/tutor-system.md`
- pasted JSON validation before a tutor reply is shown
- final-answer leakage rejection in Coach and Assisted modes
- unknown-source rejection and response-request matching
- Direct-mode answer support with the same prose and source validation
- host-neutral MCP tool catalogue for a future native host

### Local automatic generation

- selectable tutor provider through `DISCERE_TUTOR_PROVIDER`: `companion`, `codex`, or `mock`
- `CodexTutorProvider` spawning the local Codex CLI as a read-only child process against the owner's own subscription
- JSON Schema constrained replies, derived from the same Zod contracts the API uses
- one targeted style-editor repair pass when the writing gate rejects generated prose, and a typed failure when the repair does not hold
- typed provider failures for spawn, timeout, exit, malformed output, and writing-gate outcomes, surfaced instead of a degraded reply
- wall-clock limits enforced in the parent, with process-group termination and no orphaned CLI processes
- one generation at a time, so a single subscription is never used twice at once
- session capture and resume for multi-turn tutoring
- `POST /api/tutor/ask` for in-journey questions, sharing one validation core with the pasted-companion import path
- `POST /api/essays/:essayId/assess` and `GET /api/essays/:essayId/assessment` for background teach-back assessment with a polled status
- provider-neutral endpoints: the companion provider returns the packet to paste, and the mock provider returns fixed text, so one client flow serves every provider
- assistance events recorded for a tutor exchange linked to an open attempt

### Learner workings

- persisted digital working page per lesson
- pen and eraser pointer input with undo, redo, and clear
- blank, lined, and graph-paper notebook backgrounds
- typed notebook notes and PNG export
- bounded notebook payloads and unsaved-navigation protection
- ChatGPT review packets tied to a saved notebook page
- explicit PNG attachment instructions and expected filenames
- structured transcription, confidence, assessment, feedback, first-error, and next-step results
- rejection when the model did not review a usable image
- low-confidence overclaim detection
- first-error requirements for incorrect and partly correct reviews
- guided-mode answer-leak checks across review feedback and next steps
- source restrictions and request-ID matching for image reviews

### Engineering controls

- explicit query parsing that preserves `values=false` for technical visuals
- prerequisite-cycle and orphan-reference detection for curriculum bundles
- learner-safe lesson lookup by ID
- transfer result persistence in SQLite
- one declared database schema: every table lives in `apps/server/src/db/schema.ts` and an ordered SQL file under `apps/server/drizzle/`, recorded in `schema_migrations`
- server startup that fails with the list of outstanding migrations instead of creating tables during request handling
- repository-root path resolution for the database and the prompt package, so a relative `DISCERE_DATABASE_PATH` means the same file for every workspace command
- versioned prompt files loaded from `prompts/` at runtime, with clause tests guarding against prompt drift
- agent operating contract in `AGENTS.md`
- detailed README, setup guide, ChatGPT workflow, troubleshooting, backup, and reset instructions

## First fleet round additions

- deterministic spaced-review domain functions with fixed, explainable intervals
- independent and assisted review evidence kept separate
- reviewed-question flashcard generation behind an answer-bearing domain boundary
- sourced series-circuit lesson, activity contract, state transitions, and deterministic SVG renderer
- server-side tutor request-ID matching for pasted tutor replies
- adversarial regression coverage rejecting injected answer authority in learner attempt payloads
- fleet coordination reports in `docs/agent-fleet/`

## Interactive Story v1 migration — 17 August 2026

The approved redesign is now the default learner entry point. It is implemented as separate routed screens rather than one comparison-board dashboard or long page.

- course home at `/`, `/courses`, and `/courses/electronics-foundations`
- learner-safe journey and stage contracts in `packages/contracts`
- SQLite-backed journey progress with next-stage activation
- lesson route at `/courses/electronics-foundations/lessons/current-in-one-loop/stages/:stageId`
- explainer screen with visual orientation and key takeaway
- deterministic interactive circuit screen with prediction-first feedback
- focused quiz with mode-aware hints, reveal boundary, and transfer recovery
- essay studio with autosave, minimum-word gate, prose-quality validation, and submission persistence
- authorised review session with concealed card backs, explicit reveal, rating, evidence classification, and fixed scheduling
- completion screen and return-to-course path
- separate `/review` home and `/legacy` preservation route
- Roman Empire five-screen visual QA fixture at `/qa/roman?stage=0..4`
- expanded full-stack smoke test covering the new routes, contracts, persistence, essay, and review flow

The functional migration currently covers the first electronics lesson. The sourced series-circuit lesson remains validated course content but is intentionally marked planned until the learner-safe activity union and navigation are integrated. Full browser screenshots are documented in [`docs/ui-ux/screenshots/README.md`](ui-ux/screenshots/README.md); this environment lacks the host libraries required to execute Chromium.

## Repository hygiene — 18 August 2026

Groundwork for the v1 rebuild. No learner-facing behaviour changed.

- Biome ignores build output again. The previous `!!dist` patterns re-included the directories they named, so a present `apps/web/dist` produced thousands of lint errors. Biome 2 uses a single `!` prefix and no trailing `/**` for a directory.
- Runtime artefacts are untracked: the duplicate `apps/server/data/` SQLite files, `apps/web/tsconfig.tsbuildinfo`, and the `.discere-pids.json` process record.
- One canonical database. `@discere/paths` finds the repository root by walking up to `pnpm-workspace.yaml`, so `DISCERE_DATABASE_PATH=./data/discere.sqlite` no longer resolved against each package directory. The stray `apps/server/data/discere.sqlite` came from that mismatch.
- One schema. The `CREATE TABLE IF NOT EXISTS` statements that lived in the store constructor and in the notebook, transfer, and route modules now exist only as migrations.
- `@discere/prompts` reads the seven prompt files from `prompts/` and supplies the tutor system prompt and the accountability-mode policy to the companion packet builder. Clause tests cover every file, as spec v0.2 section 24 requires.

## Deliberately deferred

- direct ChatGPT MCP transport, pending host compatibility testing
- automated image retrieval and licence verification
- generated-image return from ChatGPT into the local workspace
- automatic in-app handwriting recognition without the ChatGPT handoff
- persistence of image-review history and formal mastery evidence from reviewed workings
- multiple generated transfer variants and delayed transfer scheduling
- FSRS scheduling, which remains deferred behind the deterministic scheduler interface
- NotebookLM handoff automation
- broad curriculum importers
- full Playwright coverage and automated screenshot capture in CI

These are later phases rather than hidden placeholders. The current vertical slice can operate offline after dependencies are installed. ChatGPT tutoring and image review remain explicit user-controlled handoffs and do not require an OpenAI API key.

## Build boundary

The Fastify service and shared packages are source-run TypeScript modules during the local prototype. Their build commands perform strict typechecking. The React application produces the deployable browser bundle. This avoids publishing a server artifact whose workspace imports still point at TypeScript source.

The latest verification record is in [`validation-results-2026-08-17.md`](validation-results-2026-08-17.md).
