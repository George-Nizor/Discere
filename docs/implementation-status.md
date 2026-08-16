# Implementation Status

## Implemented in the scaffold

- pnpm TypeScript monorepo and CI
- React/Vite visual lesson shell
- Fastify REST server bound to loopback
- SQLite migration and seed path
- electronics seed course and concept map
- deterministic circuit SVG and Ohm's law explorer
- numeric assessment with SI unit aliases
- server-side attempt persistence
- hint event recording
- timed, single-use answer-reveal flow
- XP and mastery separation with per-concept mastery updates
- generated-prose lint rules, including equivalent-unit answer-leak detection
- source-number preservation checks
- visual-brief validation and curriculum referential-integrity checks
- ChatGPT companion packet generation and response validation boundary
- host-neutral MCP tool catalogue
- explicit query parsing that preserves `values=false` for technical visuals
- immutable tutoring mode within an attempt
- prerequisite-cycle and orphan-reference detection for curriculum bundles
- agent operating contract in `AGENTS.md`
- read-aloud through browser speech synthesis

## Deliberately deferred

- direct ChatGPT MCP transport, pending host compatibility testing
- automated image retrieval and licence verification
- generated-image return from ChatGPT into the local workspace
- handwriting recognition and notepad assessment
- FSRS scheduling
- NotebookLM handoff automation
- broad curriculum importers
- full Playwright coverage

These are later phases rather than hidden placeholders. The current vertical slice can operate offline after dependencies are installed.

## Build boundary

The Fastify service and shared packages are source-run TypeScript modules during the local prototype. Their build commands perform strict typechecking. The React application produces the deployable browser bundle. This avoids publishing a server artifact whose workspace imports still point at TypeScript source.

The latest local verification record is in [`validation-results-2026-08-16.md`](validation-results-2026-08-16.md).
