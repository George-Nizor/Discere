![Discere banner](docs/images/discere-banner.png)

<p align="center"><img src="docs/brand/discere-animated.svg" alt="Discere open book" width="96" /></p>

# Discere

Lessons, review scheduling and a notebook that keep working offline.

Discere is a local learning workspace built around explanation, interaction, assessment, and review.
It keeps learner state in SQLite and renders its teaching visuals deterministically. Tutoring can use
the learner's own Claude Code, an OpenAI-compatible endpoint, the local Codex CLI, or an explicit
ChatGPT handoff.

## Install it

On Windows, install Discere from Instrumenta (0.15.0 or later): open Add apps and choose Discere.
Instrumenta downloads the latest release, checks it, keeps it up to date and can roll it back. Your
learning data lives in `%LOCALAPPDATA%\Discere`, so updates and uninstalls leave it alone.

Rust, Python and SQL practice need a toolchain the release does not carry. The first lesson or
project that runs code offers a one-time download (about 131 MB for Rust, 34 MB for Python), kept in
the same data folder. The tutor uses Claude Code installed and signed in on Windows, if you have it,
and otherwise falls back as described under Tutor options. An Instrumenta install runs every tutor
turn on Haiku (`DISCERE_CLAUDE_SMART_MODEL` in `instrumenta/product.json`) and turns drawn
illustrations off, because those need the Codex CLI.

## Run it from source

Requirements: Git, Node.js 22.16.0 or newer (`.nvmrc` pins 24), and pnpm 11.17.0.

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
pnpm run setup
pnpm start
```

The learner app is at `http://127.0.0.1:4318` and the API at `http://127.0.0.1:4317`. Both bind to
loopback. `pnpm dev` reloads on change. `pnpm stop` cleans up Discere's recorded processes if a
terminal vanished without stopping its children.

A checkout keeps learner state in `data/discere.sqlite`. Code practice from a checkout runs on Linux
(WSL on Windows): `pnpm rust:setup` and `pnpm python:setup` install its toolchains. When no release
is installed, Instrumenta runs a workspace checkout instead, on its registered loopback port
(`49323`, falling back to `45023`); `instrumenta/product.json` holds the command, health check and
environment. `.env`, databases, builds, uploads and process records are ignored by Git.
Configuration, backup, reset and troubleshooting are in [the setup guide](docs/setup.md).

## Release it

Bump `version` in `package.json`, commit, and push a matching `v<version>` tag. The release workflow
builds the Windows sandbox helper, packages the bundle (`pnpm package:release`), starts it as a smoke
test and publishes it for Instrumenta. [ADR 0007](docs/adr/0007-windows-release.md) explains the
bundle.

## Courses

The library in `content/` covers mathematics, the sciences, engineering, computing and data, the
humanities and social sciences, and writing, music and design. Every directory with a `bundle.json`
is a course, and nothing in the server names one, so adding a directory adds a course.
`pnpm validate:content` prints each course with its lesson and question counts. A course whose
`catalogueVisibility` is `archived` leaves the library but keeps its saved history reachable.

A lesson is an opener, a run of short steps (explain, predict, worked example, faded example, try and
transfer), a skill check of three questions and a recap. The server turns that into addressed stages:
the steps, an interactive visual only when the lesson names an activity, one stage for each
skill-check question, an essay only when the lesson names one, review of the lesson's cards, the
recap and completion. Image records carry source, creator, licence, attribution, retrieval date and a
content hash. See [the foundation notes](docs/foundations/README.md) and
[content/README.md](content/README.md).

Around the lessons there is a course library, a due-review queue, concept progress, a per-lesson
notebook, daily goals, streaks and achievements. Rewards reflect saved work and cannot be farmed by
reopening completed screens. Reduced motion follows system or saved preferences. Sound cues are on
for a new profile and can be muted in a lesson or in Settings. See
[practice and motion](docs/gamification/README.md).

Main routes: `/` (home), `/courses`, `/courses/:courseId`, `/courses/:courseId/lessons/:lessonId/stages/:stageId`,
`/courses/:courseId/lessons/:lessonId/notebook`, `/review`, `/you` and `/settings`.

## Assessment

Tutoring mode belongs to an attempt:

- **Coach** gives a next step without exposing the answer.
- **Assisted** gives more structure and records help.
- **Direct** may state the answer and records assisted evidence.
- **Exam** removes hints, answer reveal, sources, tutoring, and workings review.

A completed attempt does not mutate. Revealing a worked answer closes the attempt and can open a
different transfer problem, and a correct transfer earns reduced recovery evidence once. XP,
assistance, independent mastery, and assisted mastery stay separate.

Review uses deterministic FSRS scheduling with fuzz disabled. First responses are marked on the server
before reveal. Blank, wrong, ungraded and Direct recall stay assisted whatever rating the learner
picks, and assisted recall is capped before the scheduler is graded. The queue interleaves courses
from stored review history.

## Tutor options

`DISCERE_TUTOR_PROVIDER` chooses what drives the tutor and workings review:

- `auto` (default) takes the first driver the machine has: Claude Code, an OpenAI-compatible API,
  Codex, then the companion.
- `claude` runs the local Claude Code CLI on the learner's own plan; no key is stored.
- `openai-compatible` calls any OpenAI-style endpoint (OpenAI, OpenRouter, a local Ollama or LM
  Studio). Set `DISCERE_AI_BASE_URL`, `DISCERE_AI_API_KEY` and the model names.
- `codex` runs the local Codex CLI with the user's existing sign-in.
- `companion` prepares a packet for an ordinary chat and validates the pasted reply. It sends nothing
  by itself.
- `mock` returns fixed local material for tests.

With Claude Code, each request is routed to a fast or a capable model by rule, not by asking a model
(`DISCERE_AI_ROUTING=auto|fast|smart`). Short turns and style repairs use Haiku 4.5; workings review,
assessment, authoring, proofs and explanations of why, long context and retries use Sonnet 5.5 at low
effort. Settings shows the models in use and this session's calls and cost.

Replies must match the request ID, allowed source IDs, mode boundary and JSON contract, and generated
prose passes the same writing gate as the curriculum. A failed provider or rejected reply is shown as
a failure. The Claude Code and OpenAI-compatible drivers share one queue in `pipeline.ts` and the
Codex driver has its own in `codex.ts`, so each runs one generated job at a time and refuses a request
that would be fourth in line as busy. The companion provider generates nothing and the mock returns
a fixed reply, so neither queues. To add a driver, extend `PipelineTutorProvider` in
`packages/tutor-providers/src/pipeline.ts`; queueing, retries, schema validation and the usage ledger
come with the base class. The companion flow is described in
[the ChatGPT companion notes](docs/chatgpt-companion.md).

Each lesson has a saved drawing page (pen, eraser, undo, paper style, typed notes, PNG export). With a
generating provider that accepts images, Discere can send a temporary copy of the page for a structured
workings review. With the companion, it names the PNG to attach by hand, and the image stays on the
machine until then.

## Authoring

```bash
node scripts/scaffold-course.mjs <course-id>
node scripts/author-lesson.mjs brief <course-id> <lesson-id>
node scripts/author-lesson.mjs apply <course-id> <lesson-id>
npx tsx scripts/voice-check.ts <course-id>
```

This is the current route, and the courses of the November 2026 expansion were written this way
([the plan](docs/expansion-plan-2026-11.md)). `scaffold-course.mjs` turns a curriculum in
`docs/curricula/` into a bundle of lesson stubs. For each lesson, `brief` writes the lesson's plan,
figures and question pool to `.author/<course-id>/<lesson-id>/input.json`, a Claude agent following
[the new-course brief](docs/writing-calibration/new-course/brief.md) writes `output.json` beside it,
and `apply` validates the result and merges it into the bundle. `voice-check.ts` checks the prose
against the lesson voice. [The authoring brief](docs/writing-calibration/authoring-brief.md) covers
rewriting a course that already has questions.

Two older routes still run. Both write the legacy lesson shape, with no opener or recap, so neither
produces a v2 lesson:

```bash
pnpm author pipeline --course <id> --slug <name> --concepts <a,b> --plan @plan.md --lesson <lessonId>
pnpm curate prompt <course-id>
pnpm curate import <course-id>
pnpm curate publish <course-id>
```

`author` generates, lints, validates, reviews and merges a lesson draft through the local Codex CLI,
whatever `DISCERE_TUTOR_PROVIDER` says; [the authoring pipeline](docs/authoring-pipeline.md) describes
it. `curate` is the topic-map loop that moves prompts and replies through a ChatGPT session. Its
`publish` step needs an accepted `review/publication.json` tied to the candidate hash, source and
licence records, claim citations, reviewed artwork and complete teaching beats. Raw output stays in
ignored course-local folders.

## Verify a change

```bash
pnpm verify
```

That runs the environment doctor, lint, TypeScript checks, package tests, content validation, the
production build with its Content Security Policy check, and an isolated full-stack smoke. Narrower
commands: `pnpm check`, `pnpm build`, `pnpm smoke`, `pnpm e2e`, `pnpm run doctor`, `pnpm db:migrate`,
`pnpm db:seed`.

## Architecture

A React and Vite learner app talks over REST to a Fastify loopback service that owns SQLite. The
service holds the curriculum and journey services, the activity engine, assessment and prose gates,
progression and FSRS review, notebook persistence and the tutor providers. Shared contracts and domain
rules live in `packages/`, and `mcp/` exposes a learner-safe stdio server for compatible agent hosts.

## Documentation

- [Setup, configuration, backup, reset, and troubleshooting](docs/setup.md)
- [Current implementation boundary](docs/implementation-status.md)
- [Architecture](docs/architecture.md)
- [Product overview](docs/product-overview.md)
- [Authoring pipeline](docs/authoring-pipeline.md) and [writing rules](docs/writing-system.md)
- [Visual system](docs/visual-system.md)
- [Validation approach](docs/validation.md)
- [Instrumenta brand alignment](docs/brand/README.md)
- [Archive of superseded plans and reports](docs/archive/README.md)

---

<sub>Part of [Instrumenta](https://github.com/George-Nizor/Instrumenta), made by [Bonehead Labs](https://boneheadlabs.org). Brand v2: blue open book, interface type Fraunces, Commissioner and Spline Sans Mono (SIL OFL 1.1, vendored in `apps/web/src/styles/fonts/brand` with its licences). Course art, lesson diagrams and Bonehead stay outside the brand (see `docs/brand/README.md`). Licence: none published yet; this is private workspace software, so check the terms before redistributing.</sub>
