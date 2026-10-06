# Learner experience review — 2 October 2026

This records the first pass. The subsequent [second learner pass](second-pass/README.md) adds five complete modules, further repairs and final release evidence.

Completed and loaded at [Discere](http://127.0.0.1:4318).

## Assessment

The sampled lessons are usable and substantially more coherent after this pass. I could explore a diagram, answer, understand a correction, continue, finish a lesson and return for fresh recall. The Python and SQL tasks execute real code and allow a failed solution to be corrected. Resume, saved code, progress and delayed review worked.

I would have been dissatisfied paying for the version at the start of this walkthrough: a correct “13 m” answer was rejected, maths pictures could contradict the answer feedback, and review never conveyed reliable progress. Those concrete defects are repaired and retested.

I would now hand the sampled experience back for George’s learner trial. I would not describe this as a complete commercial-readiness assessment of all 152 lessons. The review cards are still mainly text, and the first Python module moves quickly from variable assignment to notebook state. Later modules and a beginner’s reactions remain important checks of teaching depth and pacing.

## What I actually did

I read the rendered questions and chose or wrote answers myself. I did not use an answer-key script to complete this learner session. Source inspection and automated answer/model tests happened separately while diagnosing and verifying repairs.

| Course | Completed learner work | Interaction and mistake checks |
| --- | --- | --- |
| Maths Foundations | **What a letter stands for**: all six lesson questions and both recall cards | Number machine, balance, substitution, candidate checking; deliberately chose a false reason |
| Biology: Cells to Ecosystems | **A world inside a cell**: all six questions and both recall cards | Compared animal, plant and bacterial cells; inspected a chloroplast; deliberately confused lack of a nucleus with lack of DNA |
| Physics: Motion and Forces | **Where did it go?**: all six questions and both recall cards | Played motion, changed the origin, compared distance and displacement; deliberately answered zero distance on a return trip |
| Logic and Reasoning | **What logic operates on**: all six questions and both recall cards | Claims, truth values, negation and subjective statements |
| Python for Data Analysis | **Follow a value through a program**: all six questions and both recall cards | Stepped through execution and tracked assignment |
| Python projects | **Build a labour estimate** | Ran a misspelled variable to get a real NameError; corrected the program; verified three datasets; reloaded the saved code and result |
| SQL projects | **Keep every repair** | Ran a query that incorrectly filtered out a job; corrected and resubmitted it; verified three datasets and advanced to the next task |

This is five complete lesson modules across five courses, plus executable tasks in a sixth subject. It is **not one complete course**, and the coding projects were not completed in full.

I also completed two naturally delayed maths cards, then retested an eight-response review batch and its remaining due card. Review advanced from **1 / 8** to **8 / 8**, finished, survived reload and eventually showed zero cards due. A failed card returned after its short interval within the batch; a batch bounds responses rather than freezing the identities of the initial queue.

The four manual journals contain **293 rendered observations and 92 selected screenshots**, with no browser page errors:

- [Original walkthrough](ui-journal.json): 209 observations.
- [Delayed-review retest](retest/ui-journal.json): 51 observations.
- [Fresh learner retest](fresh-retest/ui-journal.json): 16 observations.
- [Final units and responsive retest](final-retest/ui-journal.json): 17 observations.

## Defects repaired

| Finding | Repair and evidence |
| --- | --- |
| Physics rejected correct answers with units | All **162 existing numeric physics authorities** now declare the output units stated by their prompts, including recall and course checks. The parser accepts SI quantities, equivalent length units, compound units and a final full stop after a unit. Incompatible dimensions and units on dimensionless factors still fail. Answer values were preserved. [Original defect retested](final-retest/016-original-thirteen-metres-defect-fixed.png), [punctuated answer](final-retest/006-punctuated-metres-accepted.png) |
| Review counter reset to 1, changed its total and kept offering further cards | A review now has a saved position and fixed length, with a clear finish, retryable errors and rated-card recovery after reload. The query cache also records confirmed ratings so browser Back cannot briefly reopen a completed card. The backend’s separate transaction URL for each card remains intentional. [Second card](retest/008-review-second-card.png), [finished batch](retest/042-bounded-review-complete.png), [reload](retest/043-review-finish-survives-reload.png) |
| Maths diagram disagreed with givens or a typed candidate | The opening diagram starts at the given x = 2. Eight explicitly authored candidate diagrams now follow the response; their sliders update the answer too. Fixed-given examples remain independent of answer entry. [Balanced candidate](fresh-retest/009-candidate-correct-balanced.png) |
| Physics answer fields were initially clipped on short screens | Compact short-screen diagrams and footer spacing, with value and unit fields sharing a row on phones. Inspected the final layout at 1440×900, 1024×768 and 390×844. [Tablet](final-retest/002-final-tablet-physics.png), [phone](final-retest/003-final-phone-physics.png) |
| Recall layout and feedback lacked polish | Centred recall; a correct response earns a green frame and uses the existing correctness cue. Replaced marking-rule language with “Correct.” [Correct recall](retest/004-recall-correct-feedback.png) |
| Completion and correction copy overstated what happened | “Correct without hints” accurately names the completion count. Maths and Logic first-lesson summaries stay within what was taught. Removed an unconditional promise to revisit the exact mistake. Review returns main lesson ideas; it does not construct a personalized misconception sequence. |
| SQL correction was misleading for a filtered query | Feedback now asks to return every job, including repeated item names. Failed queries remain editable and resubmittable. Successful work after assistance is labelled “Completed with help.” |

A hint that exposed a signed physics answer was also replaced with a reasoning step. Each curriculum repair has a reversible, hash-bound record in the course’s review/learner-refinement.json. Preservation tests reconstruct the preceding publication and prove every other field stayed unchanged. No courses, lessons, questions or project tasks were added.

The completion XP number animates into place. Intermediate screenshots caught the number during that animation; I found no basis for reporting those transient values as incorrect XP.

## Verification and release

- **pnpm check passed:** lint, types, **1,454 package tests** and reviewed-content validation.
- **pnpm build passed**, including the content-security-policy check. The existing large JavaScript chunk warning remains.
- **27 affected browser scenarios passed** across Physics, Foundations, Journey, SQL projects and Python projects.
- After the final punctuation and layout correction, **all nine Physics and Foundations browser scenarios passed again**. The other eighteen scenarios passed on the preceding build; their project and journey logic did not change afterward. The final review-cache repair then passed all five focused review regressions, the full package checks and the served-app checks.
- New regressions cover equivalent and incompatible units, fixed versus candidate diagrams, review completion, rated-card reload, browser-history recovery with a fresh query cache, a drained due queue and next-card request failure.
- [Current library audit](content-audit.json) verifies the exact publication hashes and assets for the unchanged twelve-course, 152-lesson library.
- [Served-app checks](live-verification.json): Home, Courses, You and Settings at all three sizes; twelve completed native transitions, no errors, no skipped transitions and **zero API writes**.
- [Owner preservation](owner-preservation.json): all **23 tables**, every prior row and row count, study statistics and preferences unchanged. Backup and live SQLite integrity checks passed. Owner attempts and course-check sessions remain zero.

The production app serves bundle index-CI2K0hIe.js. The managed owner app remains running. Private walkthrough servers and their owned processes were closed; learner databases and evidence remain separate from owner history.

## Computer-use and assessment limits

The computer-use skill was applied, but both supplied controllers failed before browser control initialized: one reported an unexpected trusted-process exit and the other a sandbox setup error. The fallback was a separate headless Chromium browser, controlled step by step through observed rendered text, screenshots and UI actions. This is not a claim that the desktop computer-use controller worked or that I used George’s open browser.

Normal-motion recordings are saved in [the original session](learner-session.webm), [review retest](retest/learner-session.webm), [fresh retest](fresh-retest/learner-session.webm) and [final retest](final-retest/learner-session.webm). They include thinking and idle time; the screenshots and journals are quicker to inspect.

I could verify the sound wiring and saved-mute behavior through the existing tests, but I could **not hear the audio** in this headless session. Audio quality should be included in George’s trial. This pass does not constitute independent human subject review, measured learning outcomes, a full-course learner completion or testing on every physical device/browser.

For the handoff trial, start with Maths’s first lesson, Physics’s first lesson and a coding-project task, deliberately make a mistake, then complete the lesson’s recall and inspect You. These paths expose the interaction, explanation, motion and saved-progress behavior I reviewed.
