# Validation Results — 17 August 2026

## Authoritative run

GitHub Actions CI run 153 completed successfully against commit `7b9efd9a54cbfb35efa18fda0e4714087cb69d3f` on `main`.

The workflow completed:

- pnpm workspace dependency installation, including approved native builds
- Biome lint
- strict TypeScript checks across the workspace
- the complete Vitest server, package, and component suite
- bundled curriculum validation
- the production web build
- the isolated full-stack smoke test

Later commits in this checkpoint update documentation for the same validated behaviour.

## Runtime and setup coverage

- Node.js and pnpm version checks
- `.env` creation without overwriting existing configuration
- database migration and electronics seed workflow
- notebook and transfer tables included in explicit migration
- coordinated API and web startup
- loopback-only host validation
- explicit port availability checks
- recorded-process shutdown and stale-record cleanup
- built-prototype readiness checks
- native `better-sqlite3` load test
- production preview and API proxy startup on isolated ports
- temporary smoke-test database removal

## Full-stack smoke coverage

The built application was started through the same package commands used by the prototype. The smoke test verified:

- web preview availability
- API health through the Vite proxy
- learner-safe lesson delivery without answer authority
- deterministic circuit SVG output with concealed values
- rejection of prohibited generated-writing patterns
- ChatGPT tutor packet generation
- Direct-mode tutor reply acceptance
- Coach-mode final-answer leakage rejection
- notebook creation, save, and reload
- numeric assessment and independent evidence

## Learning-loop integrity

- circuit results remain concealed until a changed setup is predicted and checked
- prediction feedback is invalidated when voltage or resistance changes again
- mode changes start a clean attempt state
- Exam mode blocks hints, answer reveal, source access, ChatGPT tutoring, and workings review
- Direct-mode evidence is recorded as assisted
- correct attempts cannot be overwritten or receive later hints
- revealing the worked answer closes the original attempt
- duplicate reveal tokens, later hints, and resubmission are rejected after reveal
- completed and revealed answer panels disable invalid controls

## Transfer recovery

Server and component tests cover:

- transfer challenge locking before answer reveal
- deterministic challenge delivery after reveal
- equivalent current units such as amperes and milliamperes
- retry after an incorrect transfer answer
- zero recovery XP and unchanged mastery after an incorrect retry
- one-time recovery XP after the first correct transfer response
- reduced mastery evidence after answer reveal
- assisted-attempt recording on every concept attached to the original question
- transfer-result persistence and completed-state restoration
- rejection of repeated completion attempts
- rejection of mismatched transfer identifiers
- closed UI controls after transfer completion

## ChatGPT tutor companion

Server and component tests cover:

- learner-safe packet generation
- exact response payload instructions
- copied request identifiers
- Coach and Assisted answer boundaries
- Direct-mode answers
- anti-AI-writing validation
- approved-source restrictions
- request-ID matching
- rejected replies hidden from the learner-facing result panel
- companion removal during Exam mode

## Working notebook

- an unsaved lesson receives an empty notebook page
- pen strokes and typed notes persist through the notebook API and SQLite
- saved pages reload with paper type, normalized points, note, and update timestamp
- unknown lesson identifiers are rejected
- undo, redo, erasing, clearing, and paper selection are component tested
- notebook payloads are schema validated before storage
- stroke and point limits keep requests below the local server body limit
- unsaved workings activate a browser navigation warning
- `pnpm db:migrate` prepares notebook storage

## Handwritten workings review

Server and component tests cover:

- requiring saved notebook content before packet generation
- explicit PNG filename and attachment instructions
- learner-safe lesson context without answer authority
- structured transcription and confidence results
- `correct`, `partly_correct`, `incorrect`, and `unclear` assessment states
- required first-error identification for incorrect and partly correct work
- image-review confirmation
- low-confidence overclaim rejection
- guided-mode final-answer leakage rejection
- unknown-source rejection
- stale request-ID rejection
- accepted review display and rejected-review suppression

## Remaining manual checks

The following checks require a physical browser or input device:

- drawing feel with mouse, trackpad, touch, and stylus input
- PNG export in Chromium and Firefox
- image attachment and response quality in a live ChatGPT conversation
- transfer challenge flow in a live browser after the reveal timer
- narrow-screen drawing and review ergonomics
- browser wording for unsaved-navigation warnings
- read-aloud voice availability and pronunciation

These checks cover device and external-product behaviour that jsdom and isolated server tests cannot represent faithfully.

## Interactive Story v1 round

The redesigned journey was validated locally on the integrated implementation baseline `1b76f77`.

Passed:

- workspace production build, including strict server and web TypeScript checks
- all package, server, and web test suites; the web suite now contains 24 tests
- curriculum validation: 2 lessons and 2 questions, with the existing two content-style warnings
- expanded smoke test on an isolated temporary SQLite database
- built route checks for `/`, `/courses`, the course route, `/legacy`, and `/qa/roman`
- learner-safe six-stage journey contract with no answer authority
- journey progress persistence and next-stage activation
- essay autosave response, minimum-word gate, writing-quality validation, and submission
- review home, concealed card front, explicit reveal, independent evidence classification, and due scheduling
- Roman five-screen fixture navigation and targeted accessibility lint

The smoke run verified the redesigned flow in addition to the existing circuit, tutor, notebook, visual, and assessment checks. The current functional migration covers the first electronics lesson; the series-circuit lesson remains planned until its activity union is reachable.

Browser screenshot capture was attempted with Playwright Chromium. The downloaded browser could not start because the host is missing `libnspr4`, `libnss3`, and `libasound`; system-level dependency installation was not authorised. The fixture route and exact capture commands are recorded in [`docs/ui-ux/screenshots/README.md`](ui-ux/screenshots/README.md). No manual browser screenshot result is claimed.
