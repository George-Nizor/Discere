# Current-library and app quality pass

Completed and loaded locally: 2026-10-02.

George asked to wrap up new material and bring the existing material and app features to a verified
standard. This release keeps the published scope at twelve courses and 152 lessons. Further
Notion/curriculum expansion is backlog. The unfinished statistics extension remains unpublished.

## Current library

The [content audit](content-audit.json) records each exact course hash and validates its references,
review, source metadata and linked assets. The library contains 912 lesson questions, 304 recall
cards, 153 concepts, 608 answered visual beats, 458 independent check problems, and six SQL/Python
projects with 37 tasks and 111 dataset cases. Roman and Electronics remain archived from discovery;
their saved routes and data remain intact.

The content review is model-assisted, backed by deterministic subject/model checks and reviewed
primary-source records. It is not an independent human subject review.

## Corrected defects

- Replaced generic foundation hints with 120 question-specific hint sets.
- Expanded 63 answer-only feedback messages into useful explanations.
- Made essential givens visible in thirteen existing questions. The question-first player hides
  explanatory paragraphs until submission, so those premises and repair instructions must be in
  the question itself.
- Corrected all four knights-and-knaves diagrams and labelled the speaker variables. Exhaustive
  checks confirm two assignments for Ada alone, one for Ada and Ben, and none for Cara and Drew.
- Fixed text marking that could mistake “isn't valid” for an affirmative answer.
- Fixed misleading Settings availability/connection claims, isolated failed requests from practice
  preferences, added recovery controls, and distinguished live, offline and copy-and-paste tutoring.
- Fixed the connection-test button's empty JSON request, which the actual server rejected.
- Repaired unreadable selected truth-table rows and the Motion selector in the dark theme.
  Browser checks require a text contrast ratio of at least 4.5:1 for both.
- Corrected test timing: the multi-worker Python scenario retains its real runtime limits, while
  its test deadline accommodates six workers; browser preference tests wait for real persistence
  and exercise saved motion settings.

Five existing course bundles were republished through the reviewed curation command. Their
`review/guidance-refinement.json` files preserve exact before/after fields. Reversing only those
documented deltas reconstructs each previous publication hash. IDs, marking keys, choices, cards,
checks, projects, sources and artwork remain unchanged. Historical check-review evidence is retained.

## Verification

[Exact test evidence](verification.json) contains package totals and named browser outcomes.

| Area | Verified behavior |
| --- | --- |
| Home, Courses, You | Three-tab navigation, catalogue filtering, illustrated paths, course selection, saved resumption, honest empty states, calendar periods and real activity statistics |
| Lesson player | All course openings at three sizes; diagram interactions, keyboard input, answer privacy, grading, mistakes, explanations, green frames, earned sound, mute, reduced motion, completion and resumption |
| Review and progress | Fresh recall, reveal permissions, FSRS scheduling, mixed queues, first responses, bounded XP, streaks and idempotent rewards |
| Independent assessments | Placement, mixed and delayed checks, immutable responses/modes, withheld results, missed-lesson suggestions, lesson prerequisites and seven elapsed days |
| SQL and Python projects | Real isolated execution, changing/private datasets, alternative solutions, saved drafts, mistakes, retries, result inspection and Exam behavior |
| Tutor and notebook | Server-enforced Coach/Assisted/Direct/Exam rules, companion packet validation, follow-up sessions, notebook persistence, workings review and archived essay flows |
| Settings and runtime | Failed-request recovery, persisted preferences, actual probe request, offline provider, provider-specific status, loopback startup and CSP |

- `pnpm check`: passed all 1,439 package tests, all package typechecks, lint and content/project
  validation. Lint retains existing non-blocking warnings and suggestions; it is not warning-free.
- Complete Chromium run: 113 passed and two failed. The failures exposed test timing/setup issues;
  subsequent real-service testing also found and fixed the empty probe request.
- Affected-flow run: sixteen passed, with the remaining Settings scenario subsequently resolved.
  Final Settings/logic runs pass both scenarios. Every one of the 115 distinct browser scenarios
  now has a passing latest result. This is combined full-run and targeted evidence, not a claim of
  one entirely green full-suite invocation.
- Final production build, CSP and isolated smoke: passed. Doctor and the actual isolated Python
  runtime check passed. Chromium uses the installed shared libraries via `LD_LIBRARY_PATH`.
- Responsive checks use 1440×900, 1024×768 and 390×844. Captures were visually inspected, including
  the corrected table highlighting, Settings controls, Home and You.
- One real configured Codex tutor round trip succeeded in 9.1 seconds:
  [connection evidence](live-tutor-probe.json). This verifies connectivity and structured response
  delivery; teaching quality is governed by the tested acceptance and permission gates.
- After the controlled restart, all 152 live journey responses concealed private marking fields.
  The preview and API are healthy: [live release](live-release.json).
- Read-only live captures of Home, Courses, You and Settings produced no page errors or attempted
  writes: [browser evidence](live-browser.json), [screens](screens).

## Owner data and release

The SQLite online backup is
`data/backups/discere-before-quality-pass-release-20261002T063133Z.sqlite`.
Backup and live integrity checks passed. Every pre-existing table row and row count, the study
summary and all preferences were unchanged after restart. No test attempts or check sessions were
added to the owner database. [Preservation evidence](owner-preservation.json) records the comparison.

Discere is running at [the local app](http://127.0.0.1:4318). The managed service session remains
running; no commit or remote publication was made.

## Remaining validation limits

The subsequent [agent learner walkthrough](../learner-review/README.md) records five complete modules, real coding tasks, delayed recall and repairs. George’s human learner trial and an independent subject review remain future validation work.
This pass does not claim measured learning outcomes or commercial-platform parity. Browser
automation used Chromium, not every browser/device combination. The build still reports a
1.2 MB minified JavaScript chunk (about 349 KB gzip); route/model splitting is a performance
improvement backlog item. These limits do not reopen the stopped content expansion.

The [second learner pass](../learner-review/second-pass/README.md) completes five more modules and repairs grading, recall flow, computing layout and the companion handoff. All 1,468 tests and the final build pass; recorded coverage and remaining criticisms are explicit. This preserves the closed new-material scope.

### 2 October 2026 — production readiness and full-course trial

The [production readiness report](../production-readiness/README.md) records release serving and caching, verified online backup/new-path recovery, process identity checks, route/math loading, grading robustness and learner-discovered coordinate/completion repairs. This pass adds no new material and preserves all 23 owner tables and study preferences. A private learner completed all six Maths Foundations lessons, 12 fresh recall cards, the eight-question mixed check and a genuinely due recall after two service restarts. The populated recovery drill preserves that history plus a note and preferences.

Final validation is 1,490 package tests plus two lifecycle tests, build/CSP and smoke, the 121-test Chromium suite and focused reruns. Native Windows automation failed to initialize; recorded Chromium is the actual learner evidence. Heard audio, physical-device/cross-browser acceptance, independent subject review and measured learning outcomes remain unverified. This local release hardening does not certify the broader curriculum backlog or Brilliant parity.

The earlier 1.2 MB cold-script performance limitation is superseded by the recorded route/math loading repair: 643,277 cold Home script bytes, approximately 47% lower. See the new report for the scope of the measurements.
