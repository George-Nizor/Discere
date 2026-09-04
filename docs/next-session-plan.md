# Next session — plan

Updated: 2026-08-26

## Stop condition

Gates 1–4 are implemented and verified. **Gate 4 is waiting on George's visual approval.**

Do not begin Gate 5, and do not generalise the lesson grammar or the assessment system, until the
essay screens have been looked at and accepted.

## What is ready to review

The essay lives at:

```text
/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/essay
```

Reachable by finishing the four questions, or by opening the course home and pressing Continue —
a finished assessment now resumes into the essay rather than back into Q4.

Six captures at the three required viewports:

```text
docs/recovery-v2/implementation-screens/05a-essay-studio-{1440x900,1024x768,390x844}.png
docs/recovery-v2/implementation-screens/05b-essay-feedback-{1440x900,1024x768,390x844}.png
```

Review the composition, the evidence rail and its closed state, the rubric, the planning
disclosure, the word counter, the feedback rows and their quoted excerpts, the revise loop, and the
mobile compromises.

## Gate 4 functional boundary

- Progress schema v3, with an in-memory upgrade from v1 and v2 that preserves Gates 2–3 state and
  adds a blank essay. A stored row that contradicts itself falls back to a clean default.
- The server owns the prompt, the evidence pack, the five-part rubric, and deterministic feedback
  tied to exact learner excerpts. The evidence pack is withheld until the learner opens it, and
  opening it locks the learning mode.
- Essay drafts, plans, submissions, revisions, and completion persist in the isolated reference
  progress row. The row awards no XP, records no attempt, and creates no catalogue completion.
- Word bounds, revision-before-resubmission, and the read-only final essay are enforced on the
  server, not in the browser.
- The tutor and the companion import bind to the essay through
  `resolveRomanReferenceTutorEssay`, which reads the mode from the server's own row. A reply that
  supplies wording the learner is meant to write is rejected as a hard issue
  (`ANS007_REFERENCE_ESSAY_WRITTEN`); explanation of history, evidence, and the rubric is not.
- Generated rubric feedback passes `@discere/writing-engine` at submission, and the run is retained
  as `recovery-v2:roman-reference-essay-feedback` in `writing_gate_runs`.
- Exam mode suppresses the evidence pack, the sources dialog, and the tutor, on the server as well
  as in the interface.

Two defects were found and fixed while closing the gate: rubric rows quoted the same sentence
several times (each row now takes a distinct sentence, and quotes nothing rather than repeating),
and the complication row matched "while" inside an unrelated clause (a leading concession now
wins). A row's status is decided over the whole essay, independent of which quote was still free.

## Gate 4 verification boundary

- `pnpm verify` passed: doctor, lint, typecheck, 185 web tests over 29 files, 164 server tests over
  15 files, content validation, build, and smoke.
- Full Playwright suite: 34/34, including three new Gate 4 browser tests covering the write →
  submit → revise → finish journey against server-held authority, Exam suppression, and 390 px
  usability with no horizontal overflow.
- All six Gate 4 captures have the required dimensions.

Four stale assertions left over from the v2 → v3 schema bump were corrected rather than worked
around: three server tests and one browser test still expected `version: 2`, and one browser test
expected a finished assessment to resume into Q4.

## Source note

`content/roman-empire/README.md` now names the four claims OpenStax 10.1, "The Eastward Shift"
(CC BY 4.0, accessed 2026-08-22) supports — 235–284, 284, 330, and 395 CE — with what the section
supports for each, because all four are evidence a learner may cite on either side of the essay
question. The bundle's source record says the same.

## Generation is gated

Image generation and the Codex tutor need a subscription that is currently unavailable. Rather than
leaving controls that fail, `GET /api/capabilities` reports `tutor_generation`, `illustrations`, and
`authoring` with a reason and a fallback; the interface removes what it cannot honour and the
settings screen explains it once. `DISCERE_IMAGE_GENERATION=off` forces drawing off regardless of
what the CLI reports. Nothing in the learning core depends on any of it.

## Work already completed beside the recovery flow

- Tutor conversations persist per lesson across close, reopen, refresh, and reference-beat
  navigation.
- Invalid provider sessions restart without erasing visible history.
- Coach can answer definitions, mechanisms, relationships, and analogous examples while still
  withholding the active question's requested conclusion.
- The full product and course-library target is now explicit in
  [`product-goal-and-library-roadmap.md`](product-goal-and-library-roadmap.md).

## After the Roman recovery gates

Follow the roadmap rather than the 2026-08-19 bulk-import instruction:

1. generalise the accepted Roman lesson grammar;
2. make Maths Foundations the six-lesson gold course;
3. repair claim-level provenance, licence capture, uncertainty retention, final editorial records,
   cover manifests, and missing writing rules;
4. convert Logic and Computer Science Foundations;
5. add learner-owned flashcard collections, flexible panes, deeper workings/essay review, restrained
   gamification, and then the broader library.

The topic-map prompts can still be inspected, but importing twenty lessons before those controls
would multiply weak provenance and editorial records.

## Setup and validation

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"
export CI=true
export LD_LIBRARY_PATH=/tmp/discere-browser-libs/usr/lib/x86_64-linux-gnu
cd /workspace/dev_projects_master/_PersonalProjects/Instrumenta/Discere
pnpm verify
pnpm e2e
```

For the 2026-08-22 run, Chromium needed `libnspr4`, `libnss3`, and `libasound2t64` unpacked beneath
`/tmp/discere-browser-libs`; no system package installation was made.

Preview with disposable learner data, not `data/discere.sqlite`. The server caches `index.html` at
boot, so rebuild before restarting a preview.
