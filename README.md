# Discere

[![CI](https://github.com/George-Nizor/discere/actions/workflows/ci.yml/badge.svg)](https://github.com/George-Nizor/discere/actions/workflows/ci.yml)

Discere is a local-first learning workspace built around one useful visual, a direct explanation, a meaningful interaction, and a response from the learner.

The current prototype teaches an introductory electronics lesson through an interactive circuit, prediction, calculation, governed help, and a persistent digital notebook. It runs without paid model APIs.

## What currently works

- React learning workspace with a light, visual-first interface
- interactive Ohm's law circuit with concealed results
- prediction-first voltage and resistance experiments
- deterministic circuit SVGs and current/voltage graphs
- open numeric responses with unit conversion
- Coach, Assisted, Direct, and Exam modes
- incremental hints and a timed answer-reveal flow
- separate XP, assistance, and concept-mastery records
- source provenance hidden during Exam mode
- persistent SQLite learning state
- digital notebook with pen, eraser, undo, redo, and paper grids
- typed notebook notes and PNG export
- prose-quality checks for recognisable generated-writing habits
- ChatGPT companion packets with validated structured return data
- full-stack smoke tests and GitHub Actions validation

## Quick start

### Requirements

- Git
- Node.js **22.16.0 or newer**; Node.js 24 is used in CI
- pnpm **11.17.0**

### 1. Clone the repository

```bash
git clone https://github.com/George-Nizor/discere.git
cd discere
```

### 2. Enable pnpm

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
```

When `corepack enable` requires Administrator access on Windows, use:

```bash
npm install --global pnpm@11.17.0
```

### 3. Prepare the complete prototype

```bash
pnpm run setup
```

This command:

- validates Node.js and pnpm
- creates `.env` when it is missing
- installs the monorepo dependencies
- creates and seeds the SQLite database
- builds the web interface
- runs local environment diagnostics

Existing configuration and learning data are preserved.

### 4. Start Discere

Run the built prototype:

```bash
pnpm start
```

Open the URL printed in the terminal. The default is:

```text
http://127.0.0.1:4318
```

Press `Ctrl+C` to stop the web and API services together.

For development with automatic reload:

```bash
pnpm dev
```

When the original terminal was closed unexpectedly:

```bash
pnpm stop
```

The detailed platform notes, configuration table, backups, reset commands, and troubleshooting steps are in [docs/setup.md](docs/setup.md).

## Verify the installation

```bash
pnpm verify
```

The verification sequence runs environment diagnostics, linting, strict TypeScript checks, tests, curriculum validation, a production build, and a temporary full-stack smoke test.

The smoke test verifies:

- web preview and API proxying
- learner-safe lesson delivery
- deterministic visual rendering
- generated-prose rejection rules
- notebook persistence
- numeric assessment

It uses an isolated temporary database and removes it when finished.

## Main commands

| Command | Purpose |
| --- | --- |
| `pnpm run setup` | Install, configure, migrate, seed, build, and diagnose the project. |
| `pnpm dev` | Start API and web development servers with automatic reload. |
| `pnpm start` | Start the built prototype. Run `pnpm build` first after source changes. |
| `pnpm stop` | Stop processes recorded by Discere after a terminal was lost. |
| `pnpm doctor` | Check Node, pnpm, ports, SQLite, configuration, and build readiness. |
| `pnpm verify` | Run every local quality and runtime verification step. |
| `pnpm check` | Run lint, TypeScript, tests, and curriculum validation. |
| `pnpm build` | Typecheck packages and create the production web bundle. |
| `pnpm smoke` | Start an isolated built stack and exercise its core routes. |
| `pnpm db:migrate` | Create the local database schema. |
| `pnpm db:seed` | Seed the initial concept graph. |

## Current lesson flow

```text
Inspect the circuit
        ↓
Change voltage or resistance
        ↓
Predict what happens to current
        ↓
Reveal the deterministic result
        ↓
Read the explanation and equation
        ↓
Answer an open calculation
        ↓
Use a hint or deliberate answer reveal when needed
        ↓
Save handwritten or typed workings
        ↓
Record XP, assistance, and mastery separately
```

A correct attempt is immutable. A revealed worked answer closes the original attempt and requires a new attempt for clean mastery evidence. Direct mode always records assisted evidence. Exam mode removes hints, answer reveal, and source access.

## Local data and privacy

Discere binds to loopback addresses during the prototype phase. Its default services are:

```text
Web: http://127.0.0.1:4318
API: http://127.0.0.1:4317
```

Durable state is stored at:

```text
data/discere.sqlite
```

The database holds the learner profile, attempts, XP, concept mastery, assistance events, reveal records, prose-gate runs, and notebook pages. `.env`, database files, builds, uploaded data, and process records are ignored by Git.

The prototype does not send this state to an external model service by itself.

## ChatGPT integration

Discere does not call the OpenAI API. The current companion adapter creates a structured Tutor Packet for use in a normal ChatGPT conversation. A returned JSON envelope can be pasted back into Discere, where schemas, prose rules, answer boundaries, and visual requirements are checked before content is accepted.

A ChatGPT-native MCP host remains scaffolded behind a provider boundary. The core learning application does not depend on that host being available.

## Architecture

```text
React / Vite workspace
          │ REST
Fastify local server
    ├── curriculum and lesson services
    ├── deterministic visual engine
    ├── prose quality gate
    ├── assessment and accountability controls
    ├── progression engine
    ├── notebook persistence
    └── provider adapters
             ├── offline seed content
             ├── ChatGPT companion packets
             └── future MCP host
          │
       SQLite
```

The repository is a pnpm TypeScript monorepo:

```text
apps/web                 learner interface
apps/server              local API and SQLite ownership
apps/mcp                 host-neutral MCP catalogue
packages/contracts       shared validated data contracts
packages/curriculum      course loading and integrity checks
packages/visual-engine   SVGs, graphs, and image briefs
packages/writing-engine  generated-prose rules
packages/assessment-engine
packages/progression-engine
packages/tutor-providers
content/                 reviewed seed curriculum
docs/                    product and implementation specifications
prompts/                 tutor, assessor, writer, and visual prompts
```

## Prototype boundary

The current vertical slice is deliberately narrow. It proves the visual, writing, accountability, assessment, notebook, persistence, and local-runtime systems with one electronics lesson.

Planned work includes:

- notebook-image assessment through the provider-neutral tutor boundary
- assessable transfer questions
- spaced review and flashcards
- additional electronics lessons and interactive activity types
- retrieved reference images with licence records
- generated illustration review and import
- broader course creation and curriculum adapters
- ChatGPT-native host integration when supported

See [docs/implementation-status.md](docs/implementation-status.md) for the exact implemented/deferred boundary.

## Documentation

- [Local setup and troubleshooting](docs/setup.md)
- [Prototype specification v0.2](docs/spec-v0.2.md)
- [Architecture](docs/architecture.md)
- [Writing system](docs/writing-system.md)
- [Visual system](docs/visual-system.md)
- [Implementation status](docs/implementation-status.md)
- [ChatGPT compatibility report](docs/compatibility-report.md)
- [Validation approach](docs/validation.md)
- [Latest recorded validation](docs/validation-results-2026-08-17.md)
- [Luna handoff](docs/luna-handoff.md)
