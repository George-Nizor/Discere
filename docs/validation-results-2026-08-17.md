# Validation Results — 17 August 2026

## Authoritative run

GitHub Actions CI run 70 completed successfully against commit `70f29001e1477945633a6437525d780c0c29c5e9` on `agent/course-learning-loop`.

The workflow completed:

- pnpm workspace dependency installation, including approved native builds
- Biome lint
- strict TypeScript checks across the workspace
- the complete Vitest suite
- bundled curriculum validation
- the production web build

## Behaviour covered in this slice

### Learning loop integrity

- circuit results remain concealed until a changed setup is predicted and checked
- feedback is invalidated when voltage or resistance changes again
- mode changes start a clean attempt state
- Exam mode blocks hints, answer reveal, and source access
- Direct-mode evidence is recorded as assisted
- correct attempts cannot be overwritten or receive later hints

### Working notebook

- a lesson receives an empty notebook page when no saved page exists
- pen strokes and typed notes persist through the notebook API and SQLite
- saved pages reload with their paper type, normalized points, note, and update timestamp
- unknown lesson identifiers are rejected
- the drawing interface supports undo, redo, erasing, and paper selection
- notebook payloads are schema validated before storage
- `pnpm db:migrate` prepares notebook storage as well as the existing learning tables

## Remaining manual checks

The following browser-level checks remain useful before a release build:

- draw with a mouse, trackpad, and touch or stylus device
- inspect PNG output in Chromium and Firefox
- verify drawing comfort at narrow viewport sizes
- deliberately close the tab with unsaved workings and decide whether a navigation warning is desirable

These checks do not replace CI. They cover device ergonomics that jsdom component tests cannot represent faithfully.
