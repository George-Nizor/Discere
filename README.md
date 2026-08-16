# Discere

Discere is a local-first learning workspace built around one useful visual, one direct explanation, one meaningful interaction, and one response from the learner.

This repository contains the first functional scaffold. It already implements the boundaries that matter most to the product:

- a React learning workspace with an interactive Ohm's law lesson
- deterministic circuit SVGs and visual-brief validation
- a server-enforced prose quality gate for common generated-writing habits
- Coach, Assisted, Direct, and Exam tutoring modes
- numeric assessment with unit conversion
- answer-reveal friction and assistance records
- separate XP and mastery evidence
- a provider-neutral tutor contract with a ChatGPT companion packet
- SQLite persistence and committed migrations
- an offline electronics seed course

## Architecture

```text
React workspace
    │ REST
Fastify application server
    ├── curriculum and lesson services
    ├── writing gate
    ├── visual renderer
    ├── assessment and reveal controls
    ├── progression engine
    └── provider adapters
             ├── offline seed content
             ├── ChatGPT companion packets
             └── future ChatGPT MCP host
```

The application does not call the OpenAI API. The companion adapter prepares a structured packet for a ChatGPT conversation and can validate the returned JSON before content is accepted. A thin MCP host adapter is scaffolded separately so host-specific code cannot leak into the learning domain.

## Requirements

- Node.js 22.16 or newer
- Corepack or pnpm 11

## Run locally

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://127.0.0.1:4318`. The API listens on `http://127.0.0.1:4317` and is proxied by Vite during development.

Stop the foreground processes with Ctrl+C. `pnpm stop` is available if the terminal was closed unexpectedly and only targets PIDs recorded by Discere.

## Quality checks

```bash
pnpm check
```

This runs Biome, TypeScript, Vitest, and bundled-content validation.

## Current scope

The first vertical slice teaches current and Ohm's law. It is intentionally small enough to verify the writing, visual, accountability, and progress systems before adding broad subject coverage. See [`docs/implementation-status.md`](docs/implementation-status.md) for the exact boundary.

## Documentation

- [`docs/spec-v0.2.md`](docs/spec-v0.2.md): authoritative prototype specification
- [`docs/architecture.md`](docs/architecture.md): implemented architecture and extension rules
- [`docs/writing-system.md`](docs/writing-system.md): human-sounding prose requirements
- [`docs/visual-system.md`](docs/visual-system.md): visual selection and review system
- [`docs/compatibility-report.md`](docs/compatibility-report.md): ChatGPT host compatibility checklist
- [`docs/validation.md`](docs/validation.md): complete validation and runtime checks
- [`docs/luna-handoff.md`](docs/luna-handoff.md): continuation instructions for Luna
