# Luna Handoff — Discere Interactive Story Redesign v1

Implement the approved redesign defined in:

`docs/ui-ux/interactive-story-v1-spec.md`

Also read:

- `AGENTS.md`
- `docs/learning-experience-redesign-draft.md`
- `docs/architecture.md`
- `docs/implementation-status.md`
- `docs/agent-fleet/STATUS.md`

## Authoritative visual direction

The approved mockup shows five separate screens on one comparison board. Do not recreate it as one dashboard.

The separate stages are:

1. Explainer
2. Interactive visual
3. Quiz / understanding check
4. Essay studio
5. Flashcards / spaced review

The visual language is:

- white primary canvas
- black navigation and typography
- green progress, selected states, feedback, and primary actions
- generous whitespace
- clean sans-serif typography
- one dominant task per screen
- very limited shadows
- very limited nested borders
- no beige/orange theme
- no title cards or dashboard clutter

A useful visual review rule is: if a border can be replaced by spacing, remove the border.

## Product objective

Replace the current long lesson page with a routed, stage-based Interactive Story flow inspired by Brilliant's active-learning rhythm:

```text
attempt or predict
→ inspect a useful visual
→ receive concise explanation and feedback
→ apply the idea
→ explain or write
→ return later through review
```

Preserve Discere's existing server-side accountability, answer boundaries, local-first storage, deterministic visuals, writing-quality gate, notebook, and ChatGPT companion.

## Mandatory implementation order

### Phase 0 — Baseline and guardrails

- Confirm `main` is green.
- Run `pnpm check`, `pnpm build`, and the smoke test.
- Preserve the current experience behind a temporary legacy route or feature flag.
- Do not remove current server guardrails.

### Phase 1 — Generic journey contracts

- Add Zod contracts for lessons, journeys, learner-safe stages, stage state, and stage completion.
- Keep answer keys, hidden flashcard backs, and rubric authority server-side.
- Adapt the current Ohm's-law lesson to the new journey contract.
- Add route and refresh restoration tests.

### Phase 2 — Shared shell

Implement:

- compact black left rail on desktop
- white learning canvas
- green active state and progress
- compact stage header
- black bottom lesson navigator
- responsive mobile top bar and sticky bottom action
- shared design tokens

Do not begin with a generic component-library theme. Use small purpose-built layout primitives and CSS variables.

### Phase 3 — Explainer and interactive visual stages

- Move the current explanation into its own screen.
- Move the current circuit interaction into its own screen.
- Keep prediction-first behaviour.
- Keep the visual and relevant explanation in the same viewport where practical.

### Phase 4 — Quiz and transfer stages

- Render one question at a time.
- Support free response and existing numeric assessment.
- Preserve Coach, Assisted, Direct, and Exam behaviour.
- Preserve reveal friction, immutable attempts, and transfer recovery.

### Phase 5 — Essay studio

- Add essay contracts and draft persistence.
- Add a minimal editor, evidence drawer, success criteria, word count, autosave, rubric preview, and explicit submit flow.
- Keep the editor visually open and uncluttered.

### Phase 6 — Review stage

- Connect the existing deterministic review domain to persistence and authorised reveal.
- Render one item at a time.
- Support standard cards plus mixed retrieval formats.

### Phase 7 — Remove legacy composition

Remove the long-page route only after the new flow passes all functional, visual, accessibility, and browser acceptance criteria.

## Non-negotiable constraints

- Do not put all stages on one page.
- Do not expose answer authority through learner-safe payloads.
- Do not weaken tutoring-mode restrictions.
- Do not add OpenAI API calls.
- Do not generate arbitrary executable React UI from model output.
- Do not replace deterministic technical visuals with generated images.
- Do not fill the interface with nested cards, panels, or borders.
- Do not use generic praise in feedback.
- Do not add placeholder controls.
- Do not delete existing functional systems merely because they are visually awkward; migrate them into the new flow.

## Required reference scenario

Use the existing electronics lesson as the first functional migration.

Also create a non-production Roman Empire visual QA fixture covering:

- explainer
- interactive map/timeline placeholder using deterministic fixture data
- multiple-choice check
- short free response
- essay studio
- review card

The Roman fixture exists to prove that the shell generalises beyond circuits. It does not need to become the first full production course.

## Validation

Before declaring the redesign complete, run:

```bash
pnpm check
pnpm build
pnpm smoke
```

Add Playwright coverage for:

- course → lesson → stage navigation
- refresh restoration
- browser back/forward
- prediction and visual state
- quiz feedback
- Coach/Assisted/Direct/Exam boundaries
- essay autosave
- review reveal
- mobile layout
- reduced motion

Capture visual references at:

- 1440 × 900
- 1024 × 768
- 390 × 844

Visually reject:

- nested bordered boxes
- duplicated headings
- weak primary-action hierarchy
- large empty title areas
- accidental horizontal scrolling
- beige/orange legacy styling
- every tool appearing at once

## Reporting

Update:

- `docs/implementation-status.md`
- `docs/agent-fleet/STATUS.md`
- the relevant specialist reports in `docs/agent-fleet/agents/`
- `README.md`

Report:

- current main commit
- CI result
- stages implemented
- legacy behaviour preserved
- screenshots produced
- remaining UX concerns
- deviations from the approved specification

Stop after a complete, green implementation round so the result can be reviewed before broad course expansion.