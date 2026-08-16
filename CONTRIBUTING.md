# Contributing

## Local workflow

1. Install Node.js 22.16 or newer and pnpm 11.
2. Run `pnpm install`.
3. Run `pnpm check` before committing.
4. Start the local stack with `pnpm dev` and stop it with `pnpm stop`.

## Code rules

- Keep domain logic in packages. Route handlers and React components should coordinate those packages rather than duplicate them.
- Parse external input with Zod at the boundary.
- Keep hidden answers out of learner-facing contracts.
- Add a test for every new writing rule, assessment rule, or guardrail.
- Render exact technical visuals from structured data.
- Do not add model API calls without an explicit architecture decision and cost review.
- Do not weaken an accountability mode in the interface without matching server enforcement.

## Content rules

Course changes must pass `pnpm validate:content`. A reviewed course needs source metadata, a visual brief, answer authority, hints that do not leak the answer, and prose that passes the hard writing checks.
