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
- structured tutor packets containing the current lesson, mode, source IDs, and response contract
- pasted JSON validation before a tutor reply is shown
- final-answer leakage rejection in Coach and Assisted modes
- unknown-source rejection and response-request matching
- Direct-mode answer support with the same prose and source validation
- host-neutral MCP tool catalogue for a future native host

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
- transfer tables included in explicit database migration
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

## Deliberately deferred

- direct ChatGPT MCP transport, pending host compatibility testing
- automated image retrieval and licence verification
- generated-image return from ChatGPT into the local workspace
- automatic in-app handwriting recognition without the ChatGPT handoff
- persistence of image-review history and formal mastery evidence from reviewed workings
- multiple generated transfer variants and delayed transfer scheduling
- review-state persistence, authorized due-card API, and learner-facing flashcard queues
- FSRS scheduling, which remains deferred behind the deterministic scheduler interface
- NotebookLM handoff automation
- broad curriculum importers
- full Playwright coverage

These are later phases rather than hidden placeholders. The current vertical slice can operate offline after dependencies are installed. ChatGPT tutoring and image review remain explicit user-controlled handoffs and do not require an OpenAI API key.

## Build boundary

The Fastify service and shared packages are source-run TypeScript modules during the local prototype. Their build commands perform strict typechecking. The React application produces the deployable browser bundle. This avoids publishing a server artifact whose workspace imports still point at TypeScript source.

The latest verification record is in [`validation-results-2026-08-17.md`](validation-results-2026-08-17.md).
