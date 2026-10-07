![Discere banner](docs/images/discere-banner.png)

<p align="center"><img src="docs/brand/discere-animated.svg" alt="Discere open book" width="96" /></p>

# Discere

Lessons, review scheduling and a notebook that keep working offline.

Discere is a local learning workspace built around explanation, interaction, assessment, and review.
It keeps learner state in SQLite and renders its teaching visuals deterministically. Tutoring can use
the learner's own Claude Code, an OpenAI-compatible endpoint, the local Codex CLI, or an explicit
ChatGPT handoff.

Version 1.0.0 (from `package.json`).

## Run it

Requirements: Git, Node.js 22.16.0 or newer (`.nvmrc` pins 24), and pnpm 11.17.0.

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
pnpm run setup
pnpm start
```

If Corepack needs Administrator access on Windows, use `npm install --global pnpm@11.17.0` instead.

The learner app is at `http://127.0.0.1:4318` and the API at `http://127.0.0.1:4317`. Both bind to
loopback. `pnpm dev` reloads on change. `pnpm stop` cleans up Discere's recorded processes if a
terminal vanished without stopping its children.

Instrumenta starts the built service on its registered loopback port (`49323`, falling back to
`45023`); `instrumenta/product.json` holds the command, health check and environment. Discere is a
source-run product, so the launcher never pulls or builds for you: update a checkout with `git pull`
and `pnpm build`.

Durable learner state is `data/discere.sqlite`. `.env`, databases, builds, uploads and process records
are ignored by Git. Configuration, backup, reset and troubleshooting are in
[the setup guide](docs/setup.md).

## Courses

The checked-in curriculum has 20 courses, 233 lessons, 2,447 questions and 468 recall cards, loaded
from `content/` (every directory with a `bundle.json` is a course; nothing in the server names one):

- **Maths and logic:** Maths Foundations, Geometry, Linear Algebra, Calculus, Probability and
  Statistics, Logic and Reasoning.
- **Computing:** How Computers Solve Problems, Python for Data Analysis, SQL from Rows to Reports.
- **Science and engineering:** Physics, Chemistry, Biology, Astronomy, Electronics Foundations,
  Engineering.
- **Humanities and social science:** Economics, Psychology, Philosophy, English, and The Rise of the
  Roman Empire.

A lesson is a sequence of addressed stages (explainer, interactive visual, questions, optional essay,
review, completion), assembled from the lesson bundle, so a stage appears only when the content
defines it. Image records carry source, creator, licence, attribution, retrieval date and a content
hash. See [the foundation notes](docs/foundations/README.md) and [content/README.md](content/README.md).

Around the lessons there is a course library, a due-review queue, concept progress, a per-lesson
notebook, daily goals, streaks and milestones. Rewards reflect saved work and cannot be farmed by
reopening completed screens. Reduced motion follows system or saved preferences, and sound cues are
off by default. See [practice and motion](docs/gamification/README.md).

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

`DISCERE_TUTOR_PROVIDER` chooses what drives the tutor, workings review and authoring:

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
a failure. One generated tutoring job runs at a time. To add a driver, extend `PipelineTutorProvider`
in `packages/tutor-providers/src/pipeline.ts`; queueing, retries, schema validation and the usage
ledger come with the base class. The companion flow is described in
[the ChatGPT companion notes](docs/chatgpt-companion.md).

Each lesson has a saved drawing page (pen, eraser, undo, paper style, typed notes, PNG export). With a
generating provider that accepts images, Discere can send a temporary copy of the page for a structured
workings review. With the companion, it names the PNG to attach by hand, and the image stays on the
machine until then.

## Authoring

```bash
pnpm author pipeline --course <id> --slug <name> --concepts <a,b> --plan @plan.md --lesson <lessonId>
pnpm curate prompt <course-id>
pnpm curate import <course-id>
pnpm curate publish <course-id>
```

`author` generates, lints, validates, reviews and merges a lesson draft through the local Codex CLI;
`curate` is the topic-map loop that moves prompts and replies through a ChatGPT session. Publication
needs an accepted `review/publication.json` tied to the candidate hash, source and licence records,
claim citations, reviewed artwork and complete teaching beats. Raw output stays in ignored
course-local folders. Read [the authoring guide](docs/authoring-pipeline.md) before adding generated
material.

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

---

<sub>Part of [Instrumenta](https://github.com/George-Nizor/Instrumenta), made by [Bonehead Labs](https://boneheadlabs.org). Brand v2: blue open book, interface type Fraunces, Commissioner and Spline Sans Mono (SIL OFL 1.1, vendored in `apps/web/src/styles/fonts/brand` with its licences). Course art, lesson diagrams and Bonehead stay outside the brand (see `docs/brand/README.md`). Licence: none published yet; this is private workspace software, so check the terms before redistributing.</sub>
