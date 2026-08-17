# Implementation Status

## Implemented in the current vertical slice

- pnpm TypeScript monorepo and CI
- React/Vite visual lesson shell
- Fastify REST server bound to loopback
- SQLite migration and seed path
- electronics seed course and concept map
- deterministic circuit SVG and Ohm's law explorer
- prediction-first circuit changes with stale-result invalidation
- deterministic current-against-voltage relationship graph
- numeric assessment with SI unit aliases
- server-side attempt persistence
- immutable completed attempts
- hint event recording and closed assistance after completion
- timed, single-use answer-reveal flow
- original-attempt closure after a worked answer is revealed
- duplicate reveal, hint, and resubmission rejection after answer reveal
- immutable tutoring mode within an attempt
- Exam-mode hint, reveal, and source guardrails
- XP and mastery separation with per-concept mastery updates
- Direct-mode evidence classified as assisted
- generated-prose lint rules, including equivalent-unit answer-leak detection
- source-number preservation checks
- visible lesson provenance and licensing outside Exam mode
- visual-brief validation and curriculum referential-integrity checks
- ChatGPT companion packet generation and response validation boundary
- host-neutral MCP tool catalogue
- explicit query parsing that preserves `values=false` for technical visuals
- prerequisite-cycle and orphan-reference detection for curriculum bundles
- persisted digital working page per lesson
- pen and eraser pointer input with undo, redo, and clear
- blank, lined, and graph-paper notebook backgrounds
- typed notebook notes and PNG export
- bounded notebook payloads and unsaved-navigation protection
- agent operating contract in `AGENTS.md`
- read-aloud through browser speech synthesis

## Deliberately deferred

- direct ChatGPT MCP transport, pending host compatibility testing
- automated image retrieval and licence verification
- generated-image return from ChatGPT into the local workspace
- handwriting recognition and assessed notebook-image submissions
- FSRS scheduling
- NotebookLM handoff automation
- broad curriculum importers
- full Playwright coverage

These are later phases rather than hidden placeholders. The current vertical slice can operate offline after dependencies are installed.

## Build boundary

The Fastify service and shared packages are source-run TypeScript modules during the local prototype. Their build commands perform strict typechecking. The React application produces the deployable browser bundle. This avoids publishing a server artifact whose workspace imports still point at TypeScript source.

The latest verification record is in [`validation-results-2026-08-17.md`](validation-results-2026-08-17.md).
