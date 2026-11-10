# Discere Architecture

> **Partly out of date.** This file was written in August 2026 for the first scaffold. The rules below still
> hold, and the package table, the application sections and the journey boundary were corrected in November 2026.
> Not described here: a lesson is now an opener, steps and a recap (see [content/README.md](../content/README.md)),
> and the web routes are listed in `apps/web/src/routes.tsx`. [implementation-status.md](implementation-status.md)
> is the current record.

## Purpose

This document described the scaffold present in the repository in August 2026. The product specification remains authoritative where later phases are concerned.

## Architectural rules

1. Domain packages cannot depend on React, Fastify, SQLite, or a model provider.
2. Tutor providers return drafts. Domain services validate drafts before they become learner-facing content.
3. Hidden answers and reveal timing are owned by the server.
4. Exact technical visuals are rendered from structured data.
5. Generated illustrations require a visual brief and review result.
6. XP records effort. Mastery records evidence of understanding.
7. No provider is allowed to return hidden chain-of-thought. Visible workings and rubric criteria are acceptable.
8. The default server binds to loopback only.

## Packages

| Package | Responsibility |
|---|---|
| `@discere/contracts` | Shared Zod schemas and transport types |
| `@discere/writing-engine` | Generated-prose linting and preservation checks |
| `@discere/visual-engine` | Visual-brief inspection and deterministic SVG rendering |
| `@discere/activity-engine` | Safe state transitions for interactive activities |
| `@discere/assessment-engine` | Deterministic grading and unit conversion |
| `@discere/progression-engine` | XP and mastery evidence calculation |
| `@discere/tutor-providers` | Provider-neutral requests and responses; the Claude Code, OpenAI-compatible, Codex, companion and mock providers |
| `@discere/curriculum` | Content bundle loading, validation and referential-integrity checks |
| `@discere/paths` | Repository root, data directory, prompts directory and CLI path resolution, for a checkout and for a release bundle |
| `@discere/prompts` | Loader for the prompt files in `prompts/` |

## Applications

### `apps/web`

The React interface renders the routed lesson journey. The course home and each stage are separate screens; the app deliberately avoids turning the approved comparison reference into one dashboard or long page. The server assembles a lesson's stages from its bundle: the steps, an interactive visual and an essay only when the lesson names them, one stage per skill-check question, review, the recap and completion. The long-form circuit/notebook/tutor experience that once lived at `/legacy` is gone; `legacy/courses/:courseId` now only redirects to the course.

### `apps/server`

Fastify exposes the standalone REST API, owns SQLite state, reruns the writing gate on commit operations, enforces reveal timing, and serves learner-safe course/journey contracts. Journey progress and essay drafts are persisted server-side. Review cards store answer backs server-side and issue them only through an authorised review-session reveal before rating and scheduling.

### Journey boundary

`packages/contracts/src/journey.ts` defines the stage union and completion policy. `apps/server/src/content.ts` assembles learner-safe lesson journeys from curriculum and question data. `apps/web/src/journey/LessonJourneyScreen.tsx` owns progress restoration and stage navigation, and renders each stage with the matching component in `apps/web/src/journey/stages/`. `stage-machine.ts` works out each stage's state, and routes are declared in `apps/web/src/routes.tsx`. Domain answers remain outside learner-safe stage payloads.

### `mcp`

This package (`@discere/mcp`, in `mcp/`, not `apps/mcp`) is an MCP server that speaks stdio through `@modelcontextprotocol/sdk` and forwards calls to the local HTTP API. It keeps no state and reads no files. See [mcp/README.md](../mcp/README.md).

## Content lifecycle

```text
source material
  → structured tutor request
  → provider draft
  → Zod validation
  → writing gate
  → deterministic checks
  → review state
  → committed lesson content
```

Bundled seed content follows the same schemas and is checked in CI.

## Local process lifecycle

`scripts/dev.mjs` starts only the web and server processes, records their process IDs, and forwards termination signals. `scripts/stop.mjs` kills only those recorded process trees. No tunnel, model server, worker, or container starts implicitly.
