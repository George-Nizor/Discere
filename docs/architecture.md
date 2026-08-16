# Discere Architecture

## Purpose

This document describes the scaffold currently present in the repository. The product specification remains authoritative where later phases are concerned.

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
| `@discere/tutor-providers` | Provider-neutral requests, responses, and companion packets |
| `@discere/curriculum` | Content bundle validation and referential-integrity checks |

## Applications

### `apps/web`

The React interface renders the first complete lesson loop. It deliberately avoids a dashboard made from nested cards. The main visual remains the dominant object, with controls and explanation placed around it.

### `apps/server`

Fastify exposes the standalone REST API, owns SQLite state, reruns the writing gate on commit operations, and enforces reveal timing.

### `apps/mcp`

This package contains the host-neutral MCP tool catalogue and service adapter boundary. A transport dependency is deliberately absent until the target ChatGPT account passes the compatibility checklist. This prevents an unstable SDK or unavailable host surface from becoming a core dependency.

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
