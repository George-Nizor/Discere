![Discere banner](docs/images/discere-banner.png)

# Discere

Discere is a local learning workspace built around explanation, interaction, assessment, and review.
It keeps learner state in SQLite, renders deterministic teaching visuals, and can use the local Codex
CLI or an explicit ChatGPT handoff for tutoring.

Current development version: **0.1.0**.

## Run it

Requirements:

- Git
- Node.js 22.16.0 or newer; Node 24 is pinned in `.nvmrc` and `.node-version`
- pnpm 11.17.0

Prepare a checkout:

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
pnpm run setup
```

When Corepack needs Administrator access on Windows, install pnpm directly:

```bash
npm install --global pnpm@11.17.0
```

Start the built application:

```bash
pnpm start
```

The default learner address is `http://127.0.0.1:4318`. Use `pnpm dev` for automatic reload. If a
previous terminal vanished without stopping its children, `pnpm stop` cleans up Discere's recorded
processes.

Instrumenta starts the built web service through WSL on its registered loopback port. The product
manifest handles the service command, health check, and launcher-owned window.

## Current courses

The checked-in curriculum contains:

- **Electronics Foundations:** five lessons, deterministic circuit activities, numeric and written
  questions, flashcards, and teach-back work.
- **The Rise of the Roman Empire:** three lessons, sourced images, timeline activities, multiple
  choice and written questions, flashcards, and essay topics.

Course content is loaded from `content/` rather than hard-coded into the server. Image records include
source, creator, licence, attribution, retrieval date, and a content hash. The app no longer assumes
every human question is Ohm's law. This was progress.

## The learning flow

A lesson is split into addressed stages:

```text
explainer
→ interactive visual
→ question
→ essay studio
→ review
→ completion
```

Some lessons carry several question stages. The journey is assembled from the lesson bundle, so a
stage appears only when the content defines it.

The interface also includes a course library, a due-review queue, concept progress, and a lesson
notebook. Browser refresh, back/forward, and deep links preserve the current route.

Main routes:

```text
/                                                     course home
/courses                                              library
/courses/:courseId                                    course detail
/courses/:courseId/lessons/:lessonId/stages/:stageId  lesson stage
/courses/:courseId/lessons/:lessonId/notebook         working page
/review                                               due cards
/review/session/:sessionId                            one review
/progress                                             concept evidence
```

## Assessment and accountability

Tutoring mode belongs to an attempt:

- **Coach** gives a next step without exposing the answer.
- **Assisted** gives more structure and records help.
- **Direct** may state the answer and records assisted evidence.
- **Exam** removes hints, answer reveal, sources, tutoring, and workings review.

A completed attempt does not mutate. Revealing a worked answer closes the original attempt and can
open a different transfer problem. A correct transfer earns reduced recovery evidence once. XP,
assistance, independent mastery, and assisted mastery remain separate.

Spaced review uses deterministic FSRS scheduling with fuzz disabled. Assisted recall is capped before
the scheduler is graded. The queue interleaves courses using stored review history, so one subject
does not sit on the entire pile.

## Tutor options

`DISCERE_TUTOR_PROVIDER` selects the provider:

- `codex` runs the local Codex CLI against the user's existing authentication;
- `companion` prepares a packet for a normal ChatGPT conversation and validates the pasted reply;
- `mock` returns fixed local material for testing.

Only one generated tutoring job runs at a time. Replies must match the request ID, allowed source IDs,
mode boundary, and JSON contract. Generated prose passes the same writing gate used by the curriculum.
A failed provider or rejected reply is shown as a failure instead of being dressed up as advice.

The companion flow sends nothing by itself. The learner copies the prepared prompt into ChatGPT and
pastes the structured reply back into Discere.

## Notebook and workings review

Each lesson has a saved drawing page with pen, eraser, undo, paper style, typed notes, and PNG export.

With the Codex provider, Discere can send a temporary copy of that page to the local Codex CLI for a
structured review. The result shows the transcription, reading confidence, first meaningful error,
next step, uncertainty, and approved sources. Coach and Assisted modes still block answer leakage.

With the companion provider, Discere prepares the review request and names the PNG to attach manually.
The image does not leave the machine until the learner attaches it.

## Local data

The default services bind to loopback:

```text
Web  http://127.0.0.1:4318
API  http://127.0.0.1:4317
```

Durable learner state is stored at `data/discere.sqlite`. It includes the profile, attempts, progress,
review state, tutoring events, transfer results, essays, and notebook pages.

`.env`, databases, generated builds, uploads, and process records are ignored by Git. Backups, port
configuration, reset commands, and troubleshooting live in [the setup guide](docs/setup.md).

## Authoring

The content pipeline can generate, lint, validate, review, and merge a lesson draft:

```bash
pnpm author -- pipeline <course-id>
```

Raw generated output stays in ignored course-local working folders. A merge requires a committed
human-readable review record and a bundle that passes curriculum validation. Writing repairs are
checked for changes to numbers, units, equations, and citations.

See [the authoring guide](docs/authoring-pipeline.md) before adding generated material.

## Verify a change

```bash
pnpm verify
```

That command runs diagnostics, lint, strict TypeScript checks, package tests, curriculum validation,
the production build, the Content Security Policy check, and an isolated full-stack smoke.

Useful narrower commands:

```bash
pnpm check
pnpm build
pnpm smoke
pnpm e2e
pnpm doctor
pnpm db:migrate
pnpm db:seed
```

## Architecture

```text
React / Vite learner app
          │
          │ REST
          ▼
Fastify loopback service
    ├── curriculum and journey services
    ├── deterministic activity engine
    ├── assessment and prose gates
    ├── progression and FSRS review
    ├── notebook persistence
    └── tutor providers
          │
          ▼
        SQLite
```

The pnpm workspace keeps shared contracts and domain rules under `packages/`. The server owns the
database. `mcp/` exposes a learner-safe local stdio surface for compatible agent hosts.

## Documentation

- [Setup, configuration, backup, reset, and troubleshooting](docs/setup.md)
- [Current implementation boundary](docs/implementation-status.md)
- [Architecture](docs/architecture.md)
- [ChatGPT companion and workings review](docs/chatgpt-companion.md)
- [Authoring pipeline](docs/authoring-pipeline.md)
- [Writing rules](docs/writing-system.md)
- [Visual system](docs/visual-system.md)
- [Validation approach](docs/validation.md)
- [Product overview](docs/product-overview.md)

Discere is private workspace software at its current stage. The repository's licence and publication
terms should be checked before redistribution.
