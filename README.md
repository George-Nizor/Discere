![Discere banner](docs/images/discere-banner.png)

<p align="center"><img src="docs/brand/discere-animated.svg" alt="Discere open book" width="96" /></p>

# Discere

Lessons, review scheduling and a notebook that keep working offline.

Discere is a local learning app. It runs as a Fastify service on loopback with a React interface,
keeps learner state in SQLite, and draws its teaching diagrams deterministically. Tutoring is
optional and uses a model the learner already has access to.

Current version: **1.0.0**.

## What it has

The library has 18 courses with 225 lessons, 2,414 questions and 450 recall cards, loaded from
`content/` at start-up:

- **Maths and logic:** Maths Foundations, Geometry, Linear Algebra, Calculus, Probability and
  Statistics, Logic and Reasoning.
- **Computing:** How Computers Solve Problems, Python for Data Analysis, SQL: From Rows to Reports.
- **Science and engineering:** Physics, Chemistry, Biology, Astronomy, Engineering.
- **Humanities and social science:** Economics, Psychology, Philosophy, English.

Lessons are question-first. Each one opens with a question and a diagram, explains after the
learner answers, then moves to skills-check questions and new recall cards. Diagrams include code
and query traces, truth tables, coordinate planes and per-subject explorers. A correct answer gets
a green frame and a short sound; a mistake shows the authored correction and still counts as
assisted. Answer keys stay on the server.

Every course also has three course checks: an optional placement check, a mixed check after the
lessons, and a delayed check a week later. Python for Data Analysis has three coding projects
(22 tasks) and SQL has three query projects (15 tasks), run in isolated child processes.

Recall cards are scheduled with FSRS (fuzz disabled) and the review queue interleaves courses. Each
lesson has a notebook page with pen, eraser, undo, blank, lined or graph paper, typed notes and PNG
export. Attempts run in Coach, Assisted, Direct or Exam mode, and the server enforces what each
mode may reveal.

The main tabs are Home, Courses and You. Practice tracking has a daily goal, streaks with streak
freezes, XP levels, daily quests with a chest, a single-learner weekly league and achievements.
Rewards read saved evidence and never count as mastery. See
[practice, rewards and motion](docs/gamification/README.md) for the rules.

Electronics Foundations and The Rise of the Roman Empire are archived: old links and saved history
still open, but they are out of the catalogue and general review. An unfinished statistics
extension is kept unpublished. Content review is model-assisted with deterministic checks, not an
independent human subject review.

## Requirements

- Git
- Node.js 22.16.0 or newer (24 is pinned in `.nvmrc` and used by CI)
- pnpm 11.17.0
- For SQL projects: Python 3.12+ with SQLite 3.39+
- For Python projects: x86_64 Linux or WSL with Python 3.12, `python3.12-venv`, Bubblewrap 0.9+
  and libseccomp2, then `pnpm python:setup` and `pnpm python:check`. Native Windows reports the
  runtime as unavailable.

## Install and run

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
pnpm run setup
pnpm start
```

`pnpm run setup` creates `.env` from `.env.example`, installs dependencies, migrates and seeds the
database, builds the web app and runs `pnpm run doctor`. It keeps an existing `.env` and database.
If `corepack enable` needs Administrator rights on Windows, use `npm install --global pnpm@11.17.0`.

`pnpm start` serves the app at `http://127.0.0.1:4318` with the API on `127.0.0.1:4317`. `pnpm dev`
runs with automatic reload, and `pnpm stop` stops processes Discere recorded.

Instrumenta runs Discere as a source checkout in WSL, starting `@discere/server` on port `49323`
(falling back to `45023`), as declared in [`instrumenta/product.json`](instrumenta/product.json).
The launcher does not pull or build, so update with `git pull` and `pnpm build`.

## Tutoring

`DISCERE_TUTOR_PROVIDER` picks what drives the tutor, notebook review and authoring. The default,
`auto`, uses the first one available: the local Claude Code CLI, an OpenAI-compatible endpoint
(`DISCERE_AI_BASE_URL`, `DISCERE_AI_API_KEY`), the local Codex CLI, then `companion`, which
prepares a prompt to paste into an existing chat and validates the pasted reply. `mock` is for
tests. Requests are routed to a fast or a capable model by fixed rules (`DISCERE_AI_ROUTING`), and
Settings shows the models in use and session usage.

With a generating provider, the tutor can review an image of the notebook page. When the Codex
CLI is installed and signed in, the tutor can also draw an illustration on request, whatever the
provider (`DISCERE_IMAGE_GENERATION=off` turns this off). Generated replies pass the same writing
gate as the curriculum, and a failed reply is shown as a failure. Lessons, review and the notebook
work without any provider. See [`.env.example`](.env.example) for every setting
and [the companion guide](docs/chatgpt-companion.md) for the copy-and-paste flow.

## Where data lives

| What | Where |
| --- | --- |
| Learner database | `data/discere.sqlite` (`DISCERE_DATABASE_PATH`) |
| Backups from `pnpm backup` | `data/backups/` |
| Python project runtime | `data/python-runtime/` |
| Generated illustrations | `~/.local/share/discere/illustrations/` |
| Codex working folder | `~/.local/share/discere/codex-scratch/` |

These are ignored by Git, as are `.env` and build output. `pnpm restore` recovers a backup to a new
path. Backup, reset and troubleshooting steps are in [the setup guide](docs/setup.md).

## Development

```bash
pnpm verify
```

`pnpm verify` runs the doctor, lint, typecheck, package tests, content validation, the production
build with its Content Security Policy check, and an isolated smoke test. `pnpm check`,
`pnpm build`, `pnpm smoke` and `pnpm e2e` run parts of it.

The workspace has `apps/web`, `apps/server`, shared `packages/`, and `mcp/`, a stdio MCP server
that forwards to the local API. New material goes through `pnpm author` and `pnpm curate`; read
[the authoring pipeline](docs/authoring-pipeline.md) first. [AGENTS.md](AGENTS.md) has the rules
for coding agents.

## Documentation

- [Setup, configuration, backup and troubleshooting](docs/setup.md)
- [Implementation status](docs/implementation-status.md) and [quality pass](docs/quality-pass/README.md)
- [Architecture](docs/architecture.md) and [decision records](docs/adr/)
- [Course checks](docs/course-checks/README.md), [SQL projects](docs/sql-projects/README.md) and [Python projects](docs/python-projects/README.md)
- [Course content format](content/README.md) and [authoring pipeline](docs/authoring-pipeline.md)
- [Writing rules](docs/writing-system.md) and [visual system](docs/visual-system.md)
- [Validation](docs/validation.md)
- [MCP server](mcp/README.md)

There is no licence file yet, so the code is not licensed for redistribution.

## Family

Discere is part of [Instrumenta](https://github.com/George-Nizor/Instrumenta), a suite of local
learning and creative apps made by [Bonehead Labs](https://boneheadlabs.org). It follows the
Instrumenta brand v2: a blue open book, drawn as a freestanding object. The interface type
(Fraunces, Commissioner, Spline Sans Mono) is SIL OFL 1.1, vendored in
`apps/web/src/styles/fonts/brand` with its licences. [`docs/brand/README.md`](docs/brand/README.md)
records what was taken from the brand. Licence: none published yet.
