![Discere banner](docs/images/discere-banner.png)

<p align="center"><img src="docs/brand/discere-animated.svg" alt="Discere open book" width="96" /></p>

# Discere

Lessons, review scheduling and a notebook that keep working offline.

Discere is a local learning workspace built around explanation, interaction, assessment, and review.
It keeps learner state in SQLite, renders deterministic teaching visuals, and can use the learner's
own Claude Code, an OpenAI-compatible endpoint, the local Codex CLI, or an explicit ChatGPT handoff
for tutoring.

Current version: **1.0.0**.

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

Instrumenta starts the built web service through WSL on its registered loopback port (`49323`,
falling back to `45023`). The product manifest handles the service command, health check, and
launcher-owned window. Discere is a source-run product: the launcher never pulls or builds for you, so
update a checkout with `git pull` and `pnpm build`.

## Current courses

The checked-in curriculum has twenty courses, 233 lessons, 2,447 questions and 468 recall cards, loaded
from `content/` rather than hard-coded into the server:

- **Maths and logic:** Maths Foundations, Geometry, Linear Algebra, Calculus, Probability and
  Statistics, Logic and Reasoning.
- **Computing:** How Computers Solve Problems, Python for Data Analysis, SQL from Rows to Reports.
- **Science and engineering:** Physics, Chemistry, Biology, Astronomy, Electronics Foundations,
  Engineering.
- **Humanities and social science:** Economics, Psychology, Philosophy, English, and The Rise of the
  Roman Empire.

Every lesson is a sequence of questions with interactive visuals (number machines, truth tables,
editable code traces, deterministic circuit, map and timeline activities), plus recall cards,
teach-back work and, for some courses, an essay. Image records include source, creator, licence,
attribution, retrieval date, and a content hash. See [foundation notes](docs/foundations/README.md)
for the first sequences, their sources and publication reviews.

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

Daily goals, local-calendar streaks, earned protection, course paths, and milestones reflect saved
work. Lesson finishes show actual XP and recall, with a short SVG celebration. Reduced motion
follows system or saved preferences; optional sound cues are off by default. Rewards cannot be
farmed by reopening completed screens or duplicating review sessions. See
[practice and motion notes](docs/gamification/README.md) for policy, screenshots, and a recording.

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
the scheduler is graded. First responses are marked on the server before reveal; blank, wrong,
ungraded, and Direct recall stay assisted regardless of the learner's chosen rating. The queue
interleaves courses using stored review history, so one subject
does not sit on the entire pile.

## Tutor options: bring your own AI

`DISCERE_TUTOR_PROVIDER` chooses what drives the tutor, workings review and authoring:

- `auto` (default) uses the first driver this machine has: Claude Code, an OpenAI-compatible API,
  Codex, then the companion;
- `claude` runs the local Claude Code CLI on the learner's own Claude plan; no key is stored;
- `openai-compatible` calls any OpenAI-style endpoint — OpenAI, OpenRouter, a local Ollama or
  LM Studio — set `DISCERE_AI_BASE_URL`, `DISCERE_AI_API_KEY` and the model names;
- `codex` runs the local Codex CLI against the user's existing authentication;
- `companion` prepares a packet for an ordinary chat conversation and validates the pasted reply;
- `mock` returns fixed local material for testing.

Each request is routed to a fast or a capable model without asking a model to decide
(`DISCERE_AI_ROUTING=auto|fast|smart`). Short tutoring turns and style repairs use the fast model
(Haiku 4.5 by default, thinking off); workings review, assessment, authoring, images, questions
that ask for a proof or an explanation of why, long context, and any retry after unusable output
use the capable model (Sonnet 5.5 at low effort by default). Settings shows the models in use and
the calls and cost so far this session.

Adding a driver means extending `PipelineTutorProvider` in `packages/tutor-providers/src/pipeline.ts`
and implementing one method that sends a prompt and returns text. Queueing, deadlines, retries,
schema validation, the writing gate and the usage ledger come with the base class.

Only one generated tutoring job runs at a time. Replies must match the request ID, allowed source IDs,
mode boundary, and JSON contract. Generated prose passes the same writing gate used by the curriculum.
A failed provider or rejected reply is shown as a failure instead of being dressed up as advice.

The companion flow sends nothing by itself. The learner copies the prepared prompt into a chat and
pastes the structured reply back into Discere.

## Notebook and workings review

Each lesson has a saved drawing page with pen, eraser, undo, paper style, typed notes, and PNG export.

With a generating provider (Claude Code, an OpenAI-compatible model with vision, or Codex), Discere
can send a temporary copy of that page to the model for a structured review. The result shows the transcription, reading confidence, first meaningful error,
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

Raw output and merged candidates stay in ignored course-local working folders. The maintained
topic-map workflow separates import from publication:

```bash
pnpm curate prompt <course-id>
pnpm curate import <course-id>
pnpm curate publish <course-id>
```

Publication requires an accepted `review/publication.json` tied to the exact candidate hash,
precise source and licence records, claim citations, resolved uncertainty, reviewed artwork, and
complete teaching beats. Writing repairs preserve numbers, units, equations, and citations.

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
pnpm run doctor
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
- [Maths, Logic, and Computer Science library](docs/foundations/README.md)
- [Practice, rewards, and motion](docs/gamification/README.md)
- [Architecture](docs/architecture.md)
- [ChatGPT companion and workings review](docs/chatgpt-companion.md)
- [Authoring pipeline](docs/authoring-pipeline.md)
- [Writing rules](docs/writing-system.md)
- [Visual system](docs/visual-system.md)
- [Validation approach](docs/validation.md)
- [Product overview](docs/product-overview.md)

Discere is private workspace software at its current stage. The repository's licence and publication
terms should be checked before redistribution.

## Family

Discere is part of [Instrumenta](https://github.com/George-Nizor/Instrumenta), made by
[Bonehead Labs](https://boneheadlabs.org), and follows the Instrumenta brand v2: a blue open book,
drawn as a freestanding object. The interface type (Fraunces, Commissioner, Spline Sans Mono) is SIL
OFL 1.1, vendored in `apps/web/src/styles/fonts/brand` with its licences. `docs/brand/README.md` records
what was taken from the brand and what was kept. Licence: none published yet (see above).
