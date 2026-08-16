# Luna Handoff — Discere v0.2

Build the application described in `docs/spec-v0.2.md`.

Treat `docs/spec-v0.2.md` as authoritative. Use `docs/writing-system.md` and `docs/visual-system.md` as normative supporting specifications. The older `docs/spec-v0.1-chatgpt-native.md` is retained for useful detail, but it must not override v0.2.

## Product intent

Discere is a visual-first personal learning environment. Its defining lesson unit is:

> one useful visual, one human-sounding explanation, one meaningful interaction, and one response from the learner

The two highest-quality requirements are:

1. Learner-facing generated text must avoid recognisable AI-writing habits, especially negative parallelisms and forced groups of three. Implement this through prompts, a deterministic linter, a server-side commit gate, targeted editing, preservation checks, and evaluation fixtures.
2. Every core lesson must use a relevant image, diagram, or interactive visual. Prefer interactive and deterministic visuals for exact content, retrieved real images when reality matters, and generated illustrations only when they add something unavailable.

## Architecture constraints

- Build a host-agnostic local core with a React interface, TypeScript service, and SQLite.
- Implement a ChatGPT-native adapter only after a compatibility spike proves the required host capabilities in George’s account.
- Implement companion mode regardless of the spike result.
- Do not use paid model APIs by default.
- Do not scrape or automate the ChatGPT website.
- Do not generate arbitrary executable UI code at runtime.
- Do not ship placeholder controls or present mocked behaviour as complete.
- Ensure all processes stop cleanly.

## Build order

Follow the phases in section 30 of the main specification. Do not begin by building every curriculum or secondary feature.

Start with:

1. repository and lifecycle foundation
2. visual-first lesson shell using the mock provider
3. writing engine and commit gate
4. visual engine and seed electronics visuals
5. core lesson, question, hint, reveal, and assessment flow
6. progression and gamification
7. complete electronics seed content
8. provider integration
9. notebook and exports
10. custom-topic proof

Run each phase gate before proceeding.

## Design requirements

- Default to a light interface.
- Keep the lesson visual dominant.
- Avoid card soup, nested rounded containers, decorative dashboards, gradients, and generic AI-product styling.
- Keep one obvious primary action visible.
- Use simple layered SVG for workshop progression rather than 3D.
- Support keyboard and reduced-motion use.

## Writing requirements

Implement every hard rule and warning in `docs/writing-system.md` with stable rule IDs and tests.

The final seed course must contain:

- zero unexcepted hard-rule violations
- no changed facts, values, units, equations, citations, or answer boundaries caused by style editing
- no hidden-answer leakage in Coach or Assisted mode

Do not rely on a prompt alone.

## Visual requirements

Implement the Visual Brief, deterministic renderers, provenance, generated-image registration, label overlays, and review state machine from `docs/visual-system.md`.

The generated-image path must have an honest fallback. Do not imply that ChatGPT-generated assets can return automatically to the application until the compatibility spike proves it.

## Content requirement

Build the complete **Foundations of Electronics and Circuits** seed course at the quantities listed in the specification. Use safe low-voltage material only.

## Decision rule

When a minor choice is unspecified, choose the smallest maintainable implementation that preserves:

1. visual-first learning
2. human-sounding prose
3. factual correctness
4. local-first operation
5. deterministic validation
6. host independence

Document deviations rather than weakening requirements silently.

## Completion report

At completion, provide:

1. exact setup, start, stop, test, and validation instructions
2. compatibility report
3. test results
4. writing evaluation report
5. visual review report
6. requirement-by-requirement completion table
7. known defects and host limitations
8. list of any manual steps George must perform
9. screenshots of the Workshop, Knowledge Map, Lesson, Writing Lab, and Visual Authoring Lab
