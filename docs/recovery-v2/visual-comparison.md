# Recovery v2 Gates 1–3 — visual comparison

Date: 2026-08-22  
Implementation commit at start: `c6013b6`  
Status: Gates 1–3 are approved by George. Gate 4 is implemented and browser-verified; it awaits
George's visual approval. Gate 5 is not started.

## Shared shell

The implementation keeps the reference proportions: a 72 px black desktop rail, 64 px lesson
header, white canvas, and 74 px black footer. At 390 px, the rail becomes a 52 px icon bar and the
footer remains reachable at the bottom of the viewport. All utilities have accessible names and
at least 40 px targets. The product's existing Discere mark replaces the temporary `D` circle in
the SVGs.

The source button opens an attributed modal with focus management and keyboard dismissal.
Read-aloud uses the browser speech service. The persistent tutor stays in place while the learner
moves through the reference beats and is omitted in Exam mode.

## Course home

| Reference | 1440 × 900 implementation |
| --- | --- |
| ![Course home reference](reference/00-course-home.svg) | ![Course home implementation](implementation-screens/00-course-home-1440x900.png) |

Meaningful deviations:

- The hero uses a deterministic silhouette and territory motif rather than presenting generated
  art as historical evidence.
- The implementation art begins farther right, which keeps the complete title on one line.
- At 390 px the eight-point route becomes two rows; the first four points appear in the initial
  viewport and the rest are available by vertical scrolling.

Known defect: the mobile course route is not fully visible before scrolling. The course promise,
primary action, and hero remain visible without scrolling.

Gate 2 adds course resume: the primary action returns to the saved reference beat without marking
the generic catalogue course complete.

## Opening challenge

| Reference | 1440 × 900 implementation |
| --- | --- |
| ![Opening challenge reference](reference/01-opening-challenge.svg) | ![Opening challenge implementation](implementation-screens/01-opening-challenge-1440x900.png) |

Meaningful deviations:

- Cards expand evenly across the available width instead of retaining a fixed 270 px width.
- The visual motifs are drawn as deterministic SVG and CSS rather than copied from the reference.
- The cards are real sortable items. They support drag, focus, and arrow-key movement; checking a
  wrong order restores and explains the reference sequence without recording mastery.
- At 390 px the cards form a two-by-two grid. The primary action follows the grid and therefore
  requires scrolling on the phone viewport.

Gate 2 persists the learner's draft order and checked or skipped state in isolated SQLite reference
progress. The server owns the correct sequence. This pretest writes no attempt, XP, mastery, review,
or catalogue-completion evidence.

## Augustus

| Reference | 1440 × 900 implementation |
| --- | --- |
| ![Augustus reference](reference/02-augustus-explainer.svg) | ![Augustus implementation](implementation-screens/02-augustus-explainer-1440x900.png) |

Meaningful deviations:

- The implementation uses the exact approved prose from the recovery specification; the SVG's
  shortened line breaks are not treated as different copy.
- A deterministic profile holds the reference composition while avoiding an unlicensed image.
  The source modal records the factual reading source. A production photograph can replace the
  silhouette only with its creator, licence, landing page, retrieval date, and file hash recorded.
- The title remains on one line at 1440 px. It wraps at tablet and phone widths rather than
  shrinking below the mobile type target.

Known defect: the tablet and phone views require scrolling to reach `Continue`; the explanation
and highlight are kept at readable size.

Gate 2 records Augustus completion only inside the isolated reference progress and restores it
across reload and browser navigation.

## Expansion map

| Reference | 1440 × 900 implementation |
| --- | --- |
| ![Expansion map reference](reference/03-expansion-map.svg) | ![Expansion map implementation](implementation-screens/03-expansion-map-1440x900.png) |

Meaningful deviations:

- This is the largest intentional difference. The green reference shape is only a composition
  sketch. The implementation uses the checked-in Tataryn map of Roman territory in 117 CE,
  licensed CC BY-SA 3.0 and already recorded in the Roman bundle's provenance data.
- Selecting 27 BCE, 284 CE, or 476 CE updates the dated explanation but keeps the 117 CE boundary
  explicitly labelled as a fixed comparison. The interface never relabels that map as a boundary
  it does not show.
- `Read the timeline as text` exposes the same four milestones in a table.
- At 1024 px and 390 px the prompt follows below the map and requires scrolling. The map remains
  the dominant object, as required.

Gate 2 persists the selected milestone, answer disclosure, draft, and saved response. Reload,
browser back, and browser forward restore that state. The map remains the truthful fixed 117 CE
comparison; no unreviewed boundary is implied for 27 BCE, 284 CE, or 476 CE.

## Gate 3 — four routed question screens

Gate 3 turns the reference assessment composition into four one-question routes while retaining
the established shell, progress language, source modal, tutor boundary, and saved-return
behaviour.

| Screen | Reference | Captured implementation | Review state |
| --- | --- | --- | --- |
| Turning-point ordering | `reference/04-understanding-check.svg` | `implementation-screens/04a-question-ordering-1440x900.png` | Real sortable cards; the saved Coach capture shows an earned hint and the corrected order. |
| 476 CE continuity | `reference/04-understanding-check.svg` | `implementation-screens/04b-understanding-check-1440x900.png` | Closest match to the reference composition; one of four choices and the required correct feedback. |
| 117 CE map reading | `reference/04-understanding-check.svg` | `implementation-screens/04c-question-map-1440x900.png` | Licensed map, visible server-supplied text equivalent, and the Direct reveal state after its friction step. |
| Two-sentence response | `reference/04-understanding-check.svg` | `implementation-screens/04d-question-response-1440x900.png` | Augustus profile, 117 CE map, exactly two saved sentences, and feedback released only when the Exam assessment finishes. |

The reference SVG is a layout composition, not assessment authority. Public prompts, options,
source IDs, and the map text equivalent come from the server; canonical order, correct selections,
rubric phrase groups, grading, feedback, and hint ladders remain server-side. The ordering and map
options are deliberately scrambled in public content.

Coach and Assisted reveal hints incrementally after an attempt. Direct requires an attempt, a
reason of at least 20 characters, and typing `show answer`; a reveal is recorded as revealed, not
correct. Exam suppresses sources, tutor, hints, and reveal controls, stores no result or feedback
on submission, and releases grading only through `finish_assessment`.

The map authority is the checked-in Tataryn 117 CE Roman Empire map from Wikimedia Commons under
CC BY-SA 3.0; the simplified vector in the reference remains presentation-only. The 395 CE
division is supported by OpenStax, *World History Volume 1*, section 10.1, “The Eastward Shift”
(CC BY 4.0; accessed 2026-08-22), rather than by an inference from the map.

Recovery navigation currently moves from the implemented Stage 3 expansion page directly to the
Stage 7 questions. The 7/8 lesson indicator follows the approved recovery specification; Stages
4–6 are not implemented, and this gate does not imply that they are.

## Gate 2 verification boundary

The maintained `pnpm verify` gate passed, including the full web suite (26 files, 155 tests) and
full server suite (12 files, 115 tests). Full Playwright passed 28/28 and the focused Gate 2 browser
suite passed 8/8. Browser coverage now checks that lesson images loaded, mouse and keyboard ordering,
tutor persistence, Exam suppression, every mobile reference screen, the source dialog, reduced
motion, and 40 px utility targets. George approved Gate 2 after reviewing the twelve responsive
captures.

## Gate 3 browser verification boundary

The maintained browser journey now verifies:

- the focused Gate 3 slice: 3/3 tests;
- the combined Gate 2 and Gate 3 recovery spec: 11/11 tests;
- all 12 Gate 3 captures: four question screens at 1440 × 900, 1024 × 768, and 390 × 844;
- saved progression into and across Q1–Q4, reload, history navigation, and course resume;
- mouse and keyboard ordering, exact server feedback, map loading plus its visible text equivalent,
  and free-response autosave;
- no-write Exam deep links, mixed mode locks, Direct friction, deferred Exam finish, and
  source/tutor/hint/reveal suppression; and
- reduced motion, no horizontal overflow, and 40 px minimum mobile targets.

The maintained `pnpm verify` gate passed with 27 web files/165 tests and 13 server files/129
tests; the focused contracts set passed 34/34. The full Playwright suite passed 31/31.

That full screenshot run also regenerated 42 pre-existing global baseline PNGs outside the Gate 3
approval set. They remain pending an explicit restore-or-accept decision.

## Gate 3 responsive renders

| Question | 1440 × 900 | 1024 × 768 | 390 × 844 |
| --- | --- | --- | --- |
| Turning-point ordering | ![](implementation-screens/04a-question-ordering-1440x900.png) | ![](implementation-screens/04a-question-ordering-1024x768.png) | ![](implementation-screens/04a-question-ordering-390x844.png) |
| 476 CE continuity | ![](implementation-screens/04b-understanding-check-1440x900.png) | ![](implementation-screens/04b-understanding-check-1024x768.png) | ![](implementation-screens/04b-understanding-check-390x844.png) |
| 117 CE map reading | ![](implementation-screens/04c-question-map-1440x900.png) | ![](implementation-screens/04c-question-map-1024x768.png) | ![](implementation-screens/04c-question-map-390x844.png) |
| Two-sentence response | ![](implementation-screens/04d-question-response-1440x900.png) | ![](implementation-screens/04d-question-response-1024x768.png) | ![](implementation-screens/04d-question-response-390x844.png) |

## Responsive renders

These are the refreshed Gate 2 captures at the same desktop, tablet, and mobile viewports used for
the approved Gate 1 baseline.

| Screen | 1024 × 768 | 390 × 844 |
| --- | --- | --- |
| Course home | ![](implementation-screens/00-course-home-1024x768.png) | ![](implementation-screens/00-course-home-390x844.png) |
| Opening challenge | ![](implementation-screens/01-opening-challenge-1024x768.png) | ![](implementation-screens/01-opening-challenge-390x844.png) |
| Augustus | ![](implementation-screens/02-augustus-explainer-1024x768.png) | ![](implementation-screens/02-augustus-explainer-390x844.png) |
| Expansion map | ![](implementation-screens/03-expansion-map-1024x768.png) | ![](implementation-screens/03-expansion-map-390x844.png) |

The full Playwright suite passed 28/28. Its Gate 2 coverage verifies persistence, browser history,
server answer authority, mouse and keyboard ordering, loaded images, sources, tutor focus and
transcript restoration, Exam suppression, reduced motion, minimum utility targets, and no
horizontal overflow across every reference screen at 390 × 844. The focused Gate 2 run passed 8/8.
