![Discere banner](docs/images/discere-banner.png)

<p align="center"><img src="docs/brand/discere-animated.svg" alt="Discere open book" width="96" /></p>

# Discere

A private learning app with 67 courses, from maths, science and engineering to programming, data,
AI, the humanities and writing. Each course teaches through short lessons with figures, questions
marked on your own computer, code and writing practice, and spaced review, with a tutor that runs
on your own Claude Code.

## What it offers

- **The library:** 67 courses, 848 lessons and 8,812 questions, in ten groups: mathematics and
  logic, programming and computer science, building software, data and AI, science, engineering
  and making, mind and society, history, language and writing, music and sound, and first aid.
  [The library](docs/library.md) lists every course with its numbers.
- **Lessons** that open on a concrete case, teach one idea per screen, ask as they go, end with a
  three-question check and a recap, and list their sources.
- **Questions:** multiple choice with feedback on every wrong option, numbers with units, typed
  answers, putting steps in order, sorting into groups, quoted sources side by side, and code. All
  are marked by the server, with help recorded separately from independent answers.
- **Practice:** code exercises run in a sandbox (Python, SQL, Rust, TypeScript), projects in
  Python, SQL and Rust, writing tasks in the writing courses, and placement, mixed and delayed
  course checks in 18 courses.
- **Review:** spaced repetition (FSRS) of each lesson's cards and of every question you missed,
  with XP, goals, streaks, leagues and achievements tied to real work.
- **A tutor** that coaches without giving answers away, walks through a similar problem, and
  reviews workings from a drawing page.

[The platform overview](docs/platform-overview.md) describes all of it and says how good each
part of the library is.

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
loopback, and the service answers only requests addressed to a loopback name unless
`DISCERE_ALLOWED_HOSTS` lists another. `pnpm dev` reloads on change. `pnpm stop` cleans up Discere's recorded processes if a
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

Every directory in `content/` with a `bundle.json` is a course, and nothing in the server names
one, so adding a directory adds a course. `pnpm validate:content` prints each course with its
lesson and question counts. A course whose `catalogueVisibility` is `archived` leaves the library
but keeps its saved history reachable; `hidden` keeps a course out of the library, search, Home
and review while it is reworked (`DISCERE_SHOW_HIDDEN_COURSES=1` lists it again).

What each course holds and which passes it has had are in [the library](docs/library.md),
[the content ledger](docs/content-ledger.json) and [the content history](docs/content-history.md).

A lesson is an opener, a run of short steps (explain, predict, worked example, faded example, try and
transfer), a skill check of three questions and a recap. The server turns that into addressed stages:
the steps, an interactive visual only when the lesson names an activity, one stage for each
skill-check question, an essay only when the lesson names one, review of the lesson's cards, the
recap and completion. Image records carry source, creator, licence, attribution, retrieval date and a
content hash. See [content/README.md](content/README.md).

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

Read [the authoring guide](docs/authoring/README.md) before changing content. It covers writing a
new course, rewriting a course's questions and a targeted question pass, with the briefs the
writing agents follow and the checks every change runs:

```bash
node scripts/question-check.mjs <course-id>       # option lengths, feedback, hints
npx tsx scripts/voice-check.ts <course-id>        # the lesson voice
pnpm validate:content
node scripts/library-report.mjs                   # regenerate docs/library.md
```

`content/<course>/bundle.json` is the only source of a course. Every pass is recorded in
`docs/content-ledger.json`.

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

- [Platform overview](docs/platform-overview.md): what Discere offers and how good the library is
- [The library](docs/library.md), [content history](docs/content-history.md) and
  [backlog](docs/backlog.md)
- [Authoring guide](docs/authoring/README.md) and [question writing guide](docs/question-writing-guide.md)
- [Setup, configuration, backup, reset, and troubleshooting](docs/setup.md)
- [Release notes and how each feature works](docs/implementation-status.md)
- [Lesson design](docs/learning-experience/README.md)
- [Architecture](docs/architecture.md) and [decision records](docs/adr/)
- [Visual system](docs/visual-system.md) and [Instrumenta brand alignment](docs/brand/README.md)
- [Archive of superseded plans and reports](docs/archive/README.md)

---

<sub>Part of [Instrumenta](https://github.com/George-Nizor/Instrumenta), made by [Bonehead Labs](https://boneheadlabs.org). Brand v2: blue open book, interface type Fraunces, Commissioner and Spline Sans Mono (SIL OFL 1.1, vendored in `apps/web/src/styles/fonts/brand` with its licences). Course art, lesson diagrams and Bonehead stay outside the brand (see `docs/brand/README.md`). Licence: none published yet; this is private workspace software, so check the terms before redistributing.</sub>
