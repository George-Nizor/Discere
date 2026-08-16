# Validation Guide

Discere separates checks that can run without the application stack from the full repository suite.

## Full validation

After installing dependencies, run:

```bash
pnpm check
pnpm build
```

`pnpm check` runs Biome lint checks, strict TypeScript checks, Vitest, and curriculum validation. Run `pnpm format:check` separately when enforcing repository formatting. `pnpm build` creates the web bundle and typechecks source-run services and shared packages.

## Runtime checks

Start the application with:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Then verify:

- `GET http://127.0.0.1:4317/api/health` returns an OK response.
- the current lesson renders at `http://127.0.0.1:4318`.
- changing voltage or resistance redraws the circuit and graph.
- `values=false` hides circuit value labels.
- hints are blocked in Exam mode.
- answer reveal requires the reflection delay and confirmation phrase.
- the writing endpoint rejects negative parallelism and hidden-answer leakage.
- stopping Discere leaves no recorded application processes running.

## Content checks

Each curriculum bundle must pass its runtime schema and cross-reference validation. Generated lesson drafts also pass the writing gate and visual-brief review before they can become curated content.
