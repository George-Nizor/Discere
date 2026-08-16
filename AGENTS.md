# Discere Agent Guide

This file is the operating contract for coding agents working in this repository.

## Product rule

Every learning beat should contain one useful visual, one direct explanation, one meaningful interaction, and one learner response. Keep the interface visually focused and keep generated prose natural.

## Non-negotiable boundaries

- Keep the learning core independent of any model vendor or chat host.
- Do not add OpenAI API calls. The intended ChatGPT integration is a companion or MCP adapter that uses the user's supported ChatGPT surface.
- Keep authoritative answers on the server. Learner-facing lesson payloads must omit answer keys.
- Enforce Coach, Assisted, Direct, and Exam permissions on the server.
- Run generated prose through `@discere/writing-engine` before accepting it.
- Preserve numbers, equations, units, labels, and citations during style edits.
- Prefer deterministic SVG or simulation-backed visuals for technical facts.
- Treat generated images as reviewed illustrations, never as the authority for a technical diagram.
- Bind local services to loopback by default and avoid paid dependencies.
- Do not add placeholder controls that imply unsupported functionality.

## Repository map

- `apps/web`: React learning workspace.
- `apps/server`: Fastify API and SQLite persistence.
- `apps/mcp`: host-neutral MCP tool catalogue.
- `packages/contracts`: shared runtime schemas and types.
- `packages/writing-engine`: generated-prose quality gate.
- `packages/visual-engine`: deterministic visuals and visual briefs.
- `packages/activity-engine`: interactive activity definitions.
- `packages/assessment-engine`: deterministic response assessment.
- `packages/progression-engine`: XP and mastery evidence.
- `packages/curriculum`: course loading and validation.
- `packages/tutor-providers`: ChatGPT companion/provider boundary.
- `content`: reviewed curriculum bundles.
- `prompts`: model instructions kept under version control.

## Working commands

```bash
corepack enable
pnpm install
pnpm check
pnpm build
pnpm dev
pnpm stop
```

The server runs TypeScript through `tsx`; its build command is a strict typecheck. The web application produces the deployable browser bundle.

## Change discipline

1. Read `docs/spec-v0.2.md` and the relevant ADR before changing a boundary.
2. Add or update tests for behaviour changes.
3. Run the narrow package test first, then `pnpm check` and `pnpm build`.
4. Record deliberate scope changes in `docs/implementation-status.md`.
5. Keep commits focused and describe any unvalidated dependency or host assumption.
