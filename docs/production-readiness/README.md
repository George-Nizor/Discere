# Discere production readiness — 2 October 2026

This pass closes release hardening and another complete learner trial for the existing local product. No courses, lessons, or paid provider calls were added. It preserves the stopped content expansion and all owner study data.

## Repairs made

- Replaced Vite preview in the managed release stack with a local Fastify web server. The existing browser origin remains `http://127.0.0.1:4318`; the gateway preserves API bytes, errors, queries and downloadable responses.
- HTML now refreshes on every load, unversioned artwork revalidates, and only hashed assets receive immutable caching. Missing asset URLs return a real 404 rather than the application HTML. Static responses include MIME sniffing protection.
- Added verified SQLite online backups and recovery to a new path. Backups include committed WAL writes. Existing destinations and the configured live restore target are refused. Setup documents `pnpm backup`, `pnpm restore`, and `pnpm run doctor`.
- Managed shutdown now checks recorded process start identity. A stale PID record cannot terminate an unrelated process. Old unverified markers require the original terminal to stop the process.
- Split lesson, review, notebook, settings, course-check and coding screens into route modules; load KaTeX when mathematical text actually needs it. The browser theme color is consistently dark.
- Strengthened text grading for negation and contradictory claims. Added millimetres, seconds/minutes, kilojoules, kilonewtons and millimoles as equivalent declared quantities while preserving dimension checks.
- Removed the repeated question read-aloud control. Given coordinate points are now visible blue markers, distinguished from the green exploratory point; accessible descriptions include their given coordinates.
- The final lesson offers the server-unlocked mixed check directly, including resuming an unfinished check. Recently cached locked data refreshes on entry. Earlier lesson requirements still gate the action.

## Learner trial and criticism

I read and answered every question in **Maths Foundations**, in normal motion, on an isolated learner account. Six lessons produced 36 teaching/practice responses, 12 fresh recall responses, an 8/8 mixed course check, and one genuinely due recall response after the waiting interval. The final lesson was completed at a 390 × 844 mobile viewport. Enter submission, feedback, recap, recall rating and navigation worked without page errors.

One deliberately incorrect coordinate sign received an explanation tied to point B and allowed progress. The original dark coordinate markers made the evidence needlessly difficult to read; this was repaired and visually rechecked. The original final completion action also made me find the mixed check myself; it now points there directly.

Two browser/service restarts preserved four completed lessons, then an unfinished mixed check at question eight. Results survived reload; expanding a result showed the saved answer, confidence, given table and explanation. The delayed recall remained hidden before submission and scheduled its next appearance after a Good rating.

The question-first progression, worked feedback and saved review loop are coherent for this course. Completing it does not establish the factual quality of every other course or measured learning outcomes. The mixed check clearly explains its final-answer policy and delays explanations until completion. Returning to Review after a partial session leaves the remaining cards available.

Recordings and readable journals:

| Run | Evidence | Observations |
| --- | --- | --- |
| First four lessons | [Video](learner/learner-session.webm), [journal](learner/ui-journal.json) | 114 |
| Last two lessons, mobile and first seven check answers | [Video](learner-resume/learner-session.webm), [journal](learner-resume/ui-journal.json) | 83 |
| Restart, final handoff, result and due recall | [Video](learner-final/learner-session.webm), [journal](learner-final/ui-journal.json) | 18 |

Locator mistakes in the command console were corrected by selecting the actual disclosure or link. They are not application exceptions; all three journals record zero page errors. The note and preference values used for recovery below were separately seeded fixtures, not claimed as manual notebook work.

## Verification

| Check | Result / evidence |
| --- | --- |
| Full lint, strict types, package tests and content validation | 1,490 package tests plus two process-lifecycle tests; [log](check-final.log) |
| Final build and browser CSP | Passed; [log](build-final.log) |
| Full Chromium suite | 121 passed; [log](browser.log) |
| Focused journey/foundations/motion after coordinate repair | 20 passed; [log](browser-final.log) |
| Journey, experience and motion after completion handoff | 22 passed; [log](browser-release-final.log) |
| Exact final build: lesson completion and resume after cache repair | 3 passed; [log](browser-cache-final.log) |
| Final built service smoke | Passed; [log](smoke-final.log) |
| Host doctor | Usable; [log](doctor.log). Browser libraries were supplied explicitly for this host's Chromium runs. |
| Grading consistency audit | 1,204 numeric and 470 text authorities, 9,202 variants, zero failures; [audit](grading-audit.json) |

The grading audit covers lesson, recall and course-check numeric/text authorities across all 12 active bundles. It checks format equivalence, rejected malformed values and rubric contradictions; it is not an independent subject-matter review. Reproduce with `node --import tsx scripts/audit-assessment.mjs`.

The final running release was checked in normal motion at widths 1440, 1024 and 390. All twelve Home/Courses/You/Settings transitions completed without skips, page errors, failed responses, horizontal overflow, or API writes. [Live evidence](live-verification.json).

Cold Home script bodies fell from 1,212,384 to 643,277 bytes, approximately 47%. Six fresh Chromium contexts recorded readiness of 257–318 ms normally and 902–946 ms at 4× CPU throttling. These are local headless measurements with warm OS files, not real-device/network performance claims. [Measurements](performance.json).

## Preservation and recovery

All 23 owner database tables retain identical rows and counts; the study summary and preferences are unchanged. No test attempts or course checks were added. [Owner preservation](owner-preservation.json).

The documented backup and restore commands were exercised against a copy of the owner database. The recovered copy booted without migrations and retained all table rows. [Owner recovery drill](restore-drill.json).

A second recovery rehearsal used the populated private account: 36 attempts, six completed lessons, the completed mixed check, 13 review sessions, a note with a pen stroke, preferences and 150 learning events. All 23 restored tables match exactly, and the restored APIs serve the completed history, note and preferences. [Populated recovery drill](populated-restore-drill.json).

Snapshots and separate recovery databases remain under `data/`. Recovery never replaced the live owner database. SQLite backup does not include browser-only drafts/preferences; keep the browser profile and original database during recovery. Private browser/server runners were closed after saving recordings. [Cleanup proof](private-runner-cleanup.json).

## Practical limits

Native Windows computer-use initialization failed in the host sandbox, including the available browser-control entry point. The learner trial therefore used recorded Playwright Chromium against private local instances. This pass does not claim a successful native Windows trial, heard sound quality, physical-device testing, Firefox/WebKit coverage, commercial-platform parity, or independent factual review of every subject.

The earlier [second learner pass](../learner-review/second-pass/README.md) supplies breadth across courses and real SQL/Python projects. Tutor handoff still depends on the external host and manual companion exchange; this pass made no paid calls. George's own learner trial remains the final human acceptance check. The broader curriculum backlog stays closed for new material in this pass.

The managed local release remains running at [Discere](http://127.0.0.1:4318). No commit or remote publication was made.
