# Sol Handoff — Discere Reference Lesson Recovery v2

Read these files first:

- `AGENTS.md`
- `docs/recovery-v2/reference-lesson-recovery-spec-v2.md`
- `docs/recovery-v2/reference/README.md`
- every SVG in `docs/recovery-v2/reference/`
- `docs/architecture.md`
- `docs/implementation-status.md`

## Mission

Recover Discere by building one excellent Roman Empire reference lesson.

The current backend contains useful contracts and persistence. The current learner UI and mechanically generated lesson flow are not the quality target.

## Most important rule

Do not implement the entire specification in one round.

Complete **Gate 0 and Gate 1 only**:

1. audit the repository and preserve the current implementation
2. build the shared shell
3. build the course home
4. build the opening ordering challenge
5. build the Augustus explainer
6. build the expansion map
7. capture screenshots at all required viewports
8. compare them with the committed SVG references
9. stop for George's approval

## Exact references

- `00-course-home.svg`
- `01-opening-challenge.svg`
- `02-augustus-explainer.svg`
- `03-expansion-map.svg`

These are separate full screens. They define layout, density, hierarchy, colour, icon placement, and word economy.

## UI constraints

- white canvas
- black rail and lesson footer
- green active states and primary actions
- Lucide iconography
- images and diagrams carry the subject context
- one dominant task per screen
- no generic dashboard cards
- no nested border stacks
- no Unicode placeholder icons
- no disabled placeholder controls
- no stage-type heading such as `Explainer` or `Interactive visual`
- no repeated course, lesson, and stage titles
- no internal labels such as `spaced review`, `source-backed card`, or `local-first`

Apply this pattern everywhere:

Bad:

```text
FLASH CARDS / SPACED REVIEW
Review
Why did Rome...?
```

Good:

```text
Why did Rome...?
```

The surrounding UI already communicates the mode.

## Content constraints

Use the exact approved copy from the recovery specification for the opening challenge and Augustus screen.

Use accurate reviewed map data for the expansion screen. The committed vector map is a composition reference, not historical map authority.

Every learner-facing generated sentence must pass the writing-quality gate.

## Engineering constraints

- preserve server-owned answer authority
- preserve all tutoring-mode restrictions
- preserve local-first storage
- do not add an OpenAI API dependency
- do not generate arbitrary React from model output
- use real routes
- refresh and browser navigation must work
- make the ordering challenge keyboard accessible
- provide a text/table equivalent to the map

## Required screenshots

For each implemented screen:

- 1440 × 900
- 1024 × 768
- 390 × 844

Commit screenshots to:

```text
docs/recovery-v2/implementation-screens/
```

Create:

```text
docs/recovery-v2/visual-comparison.md
```

For each screen, record:

- reference image
- implementation screenshot
- meaningful deviations
- known visual defects
- responsive compromises

## Validation

Run:

```bash
pnpm check
pnpm build
pnpm smoke
```

Add Playwright coverage for:

- course home → opening challenge
- ordering with keyboard
- next/back navigation
- refresh restoration
- Augustus stage rendering
- expansion-map milestone selection
- mobile navigation
- reduced-motion mode

## Stop condition

Stop after Gate 1 even when more work is straightforward.

Report:

- current commit
- CI result
- screenshots
- deviations
- unresolved visual issues
- files reused from the old implementation
- files replaced

Do not build quiz, essay, review, or additional lessons until George approves the first four screens.
