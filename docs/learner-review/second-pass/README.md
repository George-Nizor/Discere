# Second learner review — 2 October 2026

The repairs are running at [Discere](http://127.0.0.1:4318). This pass improves existing material and UI; it adds no course, lesson, question, check or recall card.

## Critical assessment

I would have been dissatisfied paying for the starting version: three correct, ordinary answers were marked wrong. Those failures were discovered by reading and answering rendered questions, rather than by completing the session from an answer key. They are repaired and independently retested.

The sampled experience now handles exploration, wrong answers, explanations, immediate recall and saved progress consistently. The computing trace is substantially easier to use: code and state sit together on larger screens, and the phone answer field fits above the fixed footer. Checking recall immediately shows its explanation and rating choices. Correct recall keeps green feedback; wrong recall has an amber frame and an explicit correction label.

This is ready for George's learner trial. It is not evidence that every lesson has commercial teaching depth, or that the whole product matches Brilliant. The companion tutor still requires a manual copy/import round trip. Some calculus practice repeats the same factorisation with different numbers, which feels thinner than the exploratory teaching. Recall remains largely text-based. Those are remaining product criticisms, not newly verified successes.

## Complete learner coverage in this pass

Each module below was completed through its four teaching questions, two practice questions and two immediate recall cards.

| Course | Module | Actual learner interactions |
| --- | --- | --- |
| Chemistry | What makes an element? | Compared atoms, isotopes and ions; deliberately added all particle counts instead of identifying the element by protons |
| Probability and Statistics | Count what can happen | Changed the outcome threshold; counted ordered pairs; used fractions and a percentage; identified a complement |
| Computer Science | Steps a machine could follow | Ran and scrubbed the trace; deliberately confused operation order; edited and ran the repair |
| Calculus | What happens near the gap? | Moved closer to a gap; distinguished a limit from a point value; deliberately selected the point value |
| Maths | Keeping the balance | Resumed the second module; checked equivalent operations, fractional and negative answers; explained the forbidden divisor |

That is 30 lesson/practice responses and 10 recall responses. The earlier private learner now has 10 finished modules across nine courses. Neither pass completed a whole course. A separate fresh private learner repeated the full probability module to verify first-attempt marking and the new recall flow. Final chemistry and maths recall retests used newly created private review sessions; those fixtures do not count as additional completed lessons.

## Repairs and proof

| Observed defect | Repair | Retest |
| --- | --- | --- |
| “16 electrons” rejected for neutral sulfur | Declare the chemistry quantity explicitly; accept singular/plural particle names and compatible mass, mole and atomic-mass units | The exact phrase now receives Correct, immediately shows the explanation, and saves its rating; a proton answer is rejected |
| “25%” rejected for four-sided dice summing to 5 | Accept percentages for explicitly declared probabilities while preserving fraction/decimal marking | Fresh learner receives green correct feedback; bare 25 is rejected. Probability input has no inappropriate unit box |
| “Zero, because division by zero is undefined.” rejected | Mark this recall as the idea “zero”, with numerical 0 as an alternative | The exact sentence receives Correct; 1, 10, nonzero and not zero fail |
| Recall needed Check, then another Reveal click | Reveal only after a response successfully commits; show explanation and ratings together | Correct and deliberately wrong recall exercised in UI; failed reveal retries without resubmitting; failed response keeps the answer hidden |
| Internal concept identifiers appeared as topic labels | Return public concept titles; omit duplicate topic labels in embedded lesson recall | General recall shows “What makes an element?” and “Balance · Inverse operation” |
| Running the computing trace displaced the answer | Compact editor/state layout, tighter phone spacing and a short state fade | Screens and geometry at 1440×900, 1024×768 and 390×844 show the input above the footer, without horizontal overflow |
| Tutor handoff exposed a long protocol dump and filename | Plain copy button, closed request preview and readable source labels | Actual browser clipboard contains the complete request; a model-written reply imports through the UI; drawer checked at three widths |

All 99 named chemistry quantities and 22 probability authorities have regression coverage. The answer values and teaching material are retained. Exact before/after authority changes are recorded in each affected course's learner-refinement-2.json; the cumulative history restores the original reviewed bundle. See [content audit](content-audit.json).

The tutor's initial irrelevant Ohm's-law reply came from the private walkthrough's mock provider. It is not a production teaching-quality result. Retests used the actual companion provider. I wrote a mode-appropriate reply as the assistant and imported it locally; no message was sent to another chat and no paid API was used. Copying the request, reply acceptance and rendering worked. Reload closes the drawer; the browser persistence tests verify restoration when it is reopened. The remaining manual round trip is still conspicuous in a learner experience.

## Verification and release

- pnpm check passed: lint, strict typechecks, **1,468 package tests**, and content validation.
- pnpm build passed, including the content-security-policy check. The existing large JavaScript chunk warning remains.
- **83 affected browser scenarios passed**, covering course journeys, recall, notebook, permissions, recovery, motion and sound behavior.
- After the final probability presentation and correction-label edits, all **20 focused browser scenarios** passed.
- After the tutor presentation repair, all **13 TutorPanel tests** and both **tutor persistence/accessibility browser scenarios** passed.
- The served final build is index-K2YrTzPL.js. Write-blocked live checks exercised Home → Courses → You → Settings → Home at three widths. All 12 normal-motion transitions completed, with no skipped transitions, page errors, HTTP failures or API writes. See [live verification](live-verification.json).
- An online SQLite backup and integrity check passed. Every existing row and count in **23 owner tables**, the study summary and preferences are unchanged. No test attempt or course-check session was added. See [owner preservation](owner-preservation.json).
- Five private browser runners were closed after saving their recordings. The managed owner app remains running. No commit, PR or remote publication was made.

## Evidence and limits

The second-pass journals contain **253 rendered observations and 134 screenshots**, plus recordings. This includes the initial five-module pass, the saved-progress probe, fresh probability replay, final recall/layout fixtures and tutor retest. No journal contains a browser page error. A few incorrect automation labels/selectors caused controller timeouts; these were retried and are separate from app defects.

- [Initial learner journal](ui-journal.json) and [recording](learner-session.webm)
- [Fresh probability replay](retest-fresh/ui-journal.json)
- [Final recall and layout retest](final-retest/ui-journal.json)
- [Tutor copy/import and responsive retest](tutor-retest/ui-journal.json)
- [Full check](check.log), [build](build.log), [83 browser cases](browser-83.log), [20 final cases](browser-final-20.log), [tutor browser cases](browser-tutor-2.log)

The native computer-use controllers failed during initialization, so these sessions used an isolated, recorded Chromium fallback. I could read, answer and inspect visible states, but could not hear the feedback sound or assess it aesthetically. Sound and mute behavior passed browser tests. This pass does not measure retention, test every browser/device, or replace independent subject review and a beginner's human trial.
