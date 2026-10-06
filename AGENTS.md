# Discere Agent Guide

This file is the operating contract for coding agents working in this repository.

## Product rule

Every learning beat should contain one useful visual, one direct explanation, one meaningful interaction, and one learner response. Keep the interface visually focused and keep generated prose natural.

## Current learner-experience authority

George's 1 October 2026 request supersedes the earlier Roman recovery direction. Read `docs/brilliant-experience/README.md` and compare with the three Brilliant screenshots supplied in that request.

Implement illustrated learning paths, dimensional lesson pedestals, a consistent theme, and question-first lessons with correctness sound, a green frame, explanations after mistakes, and fresh recall in review. Archive the Roman and electronics prototypes from active discovery while preserving saved history and routes.

The older `docs/recovery-v2/` references apply to the archived Roman flow. Their earlier approval gate does not limit work George has now explicitly authorized.

George's 2 October homepage request adds Home, Courses and You as the main tabs, with a clear
course resume/start panel and personal learning statistics. Keep leaderboards and the bottom chat
panel out of Home. See `docs/home-redesign/README.md` and the two supplied reference screenshots.

George's later 2 October instruction closes new-material work for now. Prioritise a quality and
feature-verification pass over the existing published library. Preserve the unfinished statistics
extension as unpublished work; do not add courses or lessons during this pass. Record current
coverage, defects, fixes and release evidence in `docs/quality-pass/README.md`.

George's subsequent 2 October motion feedback makes animated navigation a release requirement.
Do not accept reduced-motion screenshots as proof of motion quality. Verify normal-speed transitions,
a stable navigation frame, course/period selection, interrupted navigation, delayed data, browser
history, and reduced-motion behavior. Inspect recorded frames and videos at desktop, tablet and
phone sizes. See `docs/motion-polish/README.md` for the implementation and evidence.

George's final 2 October request adds a critical learner walkthrough before handoff. Use private
learner history, read and answer actual rendered questions, exercise mistakes and recall, and
repair discovered defects. See docs/learner-review/README.md for completed coverage, exact-delta
content preservation and the documented browser-controller/audio limits.

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

- Use one consistent dark neutral and green system across the active catalogue, course roadmap and player, following the latest supplied references.
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

The 2 October second learner pass is recorded in `docs/learner-review/second-pass/README.md`. It preserves the closed content scope, repairs declared chemistry/probability quantities and zero-divisor recall, and checks shared recall, computing layout and companion presentation. Preserve the digest-bound learner-refinement histories when changing these reviewed bundles. Final release verification is 1,468 package tests plus the recorded browser runs; manual tutor handoff, human learning outcomes and heard audio quality remain explicit limitations.

The subsequent 2 October production readiness pass is recorded in `docs/production-readiness/README.md`. It adds no material, preserves the owner database, and verifies a full Maths Foundations course with restarts, recall and a populated recovery drill. The final managed release uses the loopback Fastify web gateway, verified online backups/new-path recovery, and process identity checks; preserve those boundaries. Latest validation is 1,490 package tests plus two lifecycle tests, build/CSP, smoke and recorded Chromium coverage. Native Windows computer use, heard audio, independent subject review and human learning outcomes remain explicit limitations.
