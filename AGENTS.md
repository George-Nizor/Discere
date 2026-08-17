# Discere Agent Guide

This file is the operating contract for coding agents working in this repository.

## Product rule

Every learning beat should contain one useful visual, one direct explanation, one meaningful interaction, and one learner response. Keep the interface visually focused and keep generated prose natural.

## Current recovery authority

Before learner-interface work, read:

- `docs/recovery-v2/reference-lesson-recovery-spec-v2.md`
- `docs/recovery-v2/sol-handoff-reference-lesson-v2.md`
- `docs/recovery-v2/reference/README.md`
- the SVG references in `docs/recovery-v2/reference/`

The Roman Empire reference lesson is the current design and pedagogy standard. Do not generalise the learner UI until its first four screens have been rendered, captured at the required viewports, and approved by George.

## Information economy

Every visible word must do work.

- Show the course, lesson, and current idea once each.
- Do not use a stage type such as `Explainer`, `Quiz`, `Essay`, `Flash Cards`, or `Spaced Review` as a large heading when the layout already communicates the mode.
- Do not stack synonymous headings such as `Quiz / Check understanding` and `Check your understanding`.
- Do not expose engineering or product terms such as `learner-safe`, `source-backed card`, `local-first`, `current mastery`, or `recovery task`.
- Use iconography, imagery, layout, and progress for context. Use words for the subject and the learner's action.
- Feedback should state the useful fact or correction once. Avoid automatic praise and repeated correctness language.
- Prefer one primary action per screen.

A reusable test is: **Does the screen say something the interface already makes obvious?** If yes, remove it.

## Visual rules

- Use the approved white, black, and green system in the recovered learner flow.
- Prefer relevant pictures, maps, diagrams, timelines, and artefacts over explanatory labels.
- Use a coherent icon library such as `lucide-react`; Unicode placeholder symbols are not final iconography.
- Replace borders with spacing whenever the border carries no interaction or semantic state.
- Do not create cards inside cards or generic admin-dashboard layouts.
- Do not display disabled placeholder controls.
- A UI round is incomplete without desktop, tablet, and mobile screenshots compared against the approved SVG references.

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

1. Read the recovery spec, `docs/spec-v0.2.md`, and the relevant ADR before changing a boundary.
2. Add or update tests for behaviour changes.
3. Run the narrow package test first, then `pnpm check` and `pnpm build`.
4. Record deliberate scope changes in `docs/implementation-status.md`.
5. Keep commits focused and describe any unvalidated dependency or host assumption.
