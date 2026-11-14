# Discere Agent Guide

This file is the operating contract for coding agents working in this repository.

## Product rule

Every learning beat should contain one useful visual, one direct explanation, one meaningful interaction, and one learner response. Keep the interface visually focused and keep generated prose natural.

Learner-facing prose follows the `discere-lesson-voice` skill (`.claude/skills/`), and the tutor follows `discere-tutor-voice`. Read the skill and its reference examples before writing or rewriting any lesson text.

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

- Follow the Instrumenta brand v2 in `docs/brand/README.md` across the catalogue, course roadmap and player: a blue accent, Fraunces, Commissioner and Spline Sans Mono, and a Dark and a Light theme (Settings also offers Follow device). Green marks finished work and moving on after a correct answer.
- Prefer relevant pictures, maps, diagrams, timelines, and artefacts over explanatory labels.
- Use the brand icon set in `apps/web/src/brand` for interface icons and `lucide-react` for utility glyphs such as close and arrows. Unicode placeholder symbols are not final iconography.
- Replace borders with spacing whenever the border carries no interaction or semantic state.
- Do not create cards inside cards or generic admin-dashboard layouts.
- Do not display disabled placeholder controls.
- A UI round is incomplete without desktop, tablet, and mobile screenshots compared against the approved SVG references.

## Non-negotiable boundaries

- Keep the learning core independent of any model vendor or chat host.
- Do not add model API calls beyond the optional `openai-compatible` tutor provider (`packages/tutor-providers/src/openai-compatible.ts`). It calls an OpenAI-style endpoint only when `DISCERE_TUTOR_PROVIDER` selects it, or when `auto` finds `DISCERE_AI_BASE_URL` or `DISCERE_AI_API_KEY` set and no Claude Code. Claude Code, Codex and the ChatGPT companion packet need no API key.
- Keep authoritative answers on the server. Learner-facing lesson payloads must omit answer keys.
- Enforce Coach, Assisted, Direct, and Exam permissions on the server.
- Write learner prose to `.claude/skills/discere-lesson-voice`. `@discere/writing-engine` still protects facts and hidden answers, but its style rules do not override the skill.
- Preserve numbers, equations, units, labels, and citations during style edits.
- Prefer deterministic SVG or simulation-backed visuals for technical facts.
- Treat generated images as reviewed illustrations, never as the authority for a technical diagram.
- Bind local services to loopback by default and avoid paid dependencies.
- Do not add placeholder controls that imply unsupported functionality.

## Course content

Read `docs/platform-overview.md` first for what Discere offers and how good each part of the
library is.

- `content/<course>/bundle.json` is the only source of a course. Edit it directly; nothing
  regenerates it from other files.
- Every course has been through many passes. Before proposing or starting content work, read
  `docs/content-history.md`, the course's entry in `docs/content-ledger.json` and its row in
  `docs/library.md`. A proposal to rewrite a course names the problem as measured on the current
  bundle and which earlier pass missed it.
- Ask George before choosing a new subject or course.
- Record every pass in `docs/content-ledger.json`, run `node scripts/library-report.mjs`, and add
  a release paragraph to `docs/implementation-status.md`.
- How to write and check content: `docs/authoring/README.md`. Open work: `docs/backlog.md`.
- Once a pass ships, delete its brief and any hand-off note. Open items go in `docs/backlog.md`,
  not in new plan files.

## Repository map

- `apps/web`: React learning workspace.
- `apps/server`: Fastify API and SQLite persistence. `src/rust` is the sandboxed Rust playground and projects (ADR 0006). `src/typescript` runs the TypeScript exercises (ADR 0008).
- `mcp`: MCP server over stdio that forwards to the local API.
- `packages/contracts`: shared runtime schemas and types.
- `packages/writing-engine`: generated-prose quality gate.
- `packages/visual-engine`: deterministic visuals and visual briefs.
- `packages/activity-engine`: interactive activity definitions.
- `packages/assessment-engine`: deterministic response assessment.
- `packages/progression-engine`: XP and mastery evidence.
- `packages/curriculum`: course loading and validation.
- `packages/tutor-providers`: tutor provider boundary (Claude Code, OpenAI-compatible, Codex, ChatGPT companion, mock).
- `packages/paths`: repository, data and CLI path resolution.
- `packages/prompts`: loader for the prompts in `prompts/`.
- `content`: the course bundles (`content/README.md`).
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

From a checkout the server runs TypeScript through `tsx`, and its build command is a strict typecheck. The web application produces the deployable browser bundle. `pnpm package:release` bundles the server with esbuild into the Windows release.

## Change discipline

1. Read the relevant ADR in `docs/adr/` before changing a boundary.
2. Add or update tests for behaviour changes.
3. Run the narrow package test first, then `pnpm check` and `pnpm build`.
4. Record deliberate scope changes in `docs/implementation-status.md`, and content passes in
   `docs/content-ledger.json`.
5. Keep commits focused and describe any unvalidated dependency or host assumption.
