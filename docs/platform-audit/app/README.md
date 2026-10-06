# Discere platform audit: everything outside the lesson player

Audited 2026-10-06 against the working tree as it stood that day, with other agents editing code in
parallel (the API restarted three times during the run). Scope: welcome, Home, Courses library,
course roadmaps, course checks, SQL and Python projects, Review, the standalone notebook, You,
Settings, navigation, the game layer, keyboard use, console errors and API failure. The lesson
player itself is audited separately.

**Method.** Fresh scratch database, `DISCERE_TUTOR_PROVIDER=mock`, `DISCERE_IMAGE_GENERATION=off`.
Playwright (Chromium, SwiftShader) at 1440×900, 1024×768 and 390×844. History was generated for real:
answers through `POST /api/attempts`, one lesson completed through the journey API, cards reviewed and
the chest claimed through the UI, one placement check taken through the UI, and older activity
backdated in the scratch `learning_events` table to produce a 10-day streak and an all-time chart.
The API was killed mid-session to see how the UI degrades. Screenshots are in [`shots/`](shots/).

## Counts

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 8 |
| Minor | 20 |
| Polish | 15 |

Nothing stops a learner from using the app. The eight majors either lose a learner's work or credit
without telling them, leave them stuck, or make the game layer contradict itself.

## Severity-ranked table

| ID | Sev | Screen | Finding |
| --- | --- | --- | --- |
| M1 | Major | Home, quests | The third daily quest changes identity during the day. Finishing "Finisher" swaps it for "Memory keeper" |
| M2 | Major | Review | Typing an answer and pressing **Reveal answer** throws the answer away: no XP, no quest progress, no daily-goal credit, no message |
| M3 | Major | Notebook | Typed working is nearly invisible: light text on the white ruled page |
| M4 | Major | All screens, API down | Error screens show "The request failed with status 502." with no retry on Home, Courses, Review or Course. The top bar shows zeros as if they were real |
| M5 | Major | Courses | "Search an idea or subject" does not search ideas. `bayes` and `entropy` return nothing |
| M6 | Major | You | Trophy room badges and Milestones measure the same things twice under different names |
| M7 | Major | SQL project | After a wrong **Check query**, the primary button becomes **Continue**, which skips the task. Python keeps **Check program** |
| M8 | Major | Course checks | A placement result of 0/12 gets a green success tick, earns 24 XP, recommends all 12 lessons and changes nothing on the roadmap |
| m1 | Minor | Launch | Two splashes in a row: an "Opening Discere…" loader (about 2 s on dev), then the 1.6 s welcome |
| m2 | Minor | Courses | The "Foundations for thinking" row overflows at 1440 and 1024 with no scroll affordance, so the last card is cut off |
| m3 | Minor | Courses (phone) | 20 subject chips take about 5 rows, roughly 300 px, before the first course. Subject levels are mixed (Mathematics, Calculus, Linear Algebra, Science) |
| m4 | Minor | Roadmap | Course checks pop in late with no placeholder, so the layout shifts. On phone the fixed launch panel covers the checks list |
| m5 | Minor | Roadmap / checks | One checkpoint has four names: "Bring it together", "Bring the ideas together", "Put the ideas together", "Use every idea together". "Use it a week later" is captioned "After 12 more lessons" |
| m6 | Minor | Review | A wrong recall shows "Not quite. Here's the explanation." in success green, and both result notices use the green "correct" tone |
| m7 | Minor | Review | The "Next" column and "Next review" both say "October 6, 2026" for a card due in 1–6 minutes. "Return October 6, 2026 (1 minute)." |
| m8 | Minor | Review | A session ends with "You've finished this review." and nothing else: no count, accuracy or XP summary. "Practise again" appears without explaining that nothing is due |
| m9 | Minor | Review | The session counter is fixed from the starting due count. Cards that come back within the session show as "3 / 4" while the same card repeats |
| m10 | Minor | You | Chart month labels such as "Oct 26" and "Sep 25" read as dates, not months of 2026 and 2025. The rotated labels overlap at 390 |
| m11 | Minor | Level-up | The overlay is a modal that closes itself after 6 s. Focus is not returned (it lands on `<body>`). The text overlaps the ring artwork, and the close × sits on the sparkle |
| m12 | Minor | Settings | Under "Available tools", the illustrations reason renders as broken highlighted fragments |
| m13 | Minor | Settings | The time zone is free text. An invalid zone answers "The request did not match the expected shape."; `australia/sydney` is stored in lower case |
| m14 | Minor | Python project | A missing `result` reports "ValueError. Check the operation's inputs…", though the learner raised no ValueError |
| m15 | Minor | Deep links | `/courses/roman-empire` opens a completely different white UI with its own rail. `/legacy/courses/:id` duplicates the course screen. `/health` reports 20 courses while the library shows 18 |
| m16 | Minor | Errors | Raw or validation wording reaches learners: "Check unavailable / The request did not match the expected shape.", "Course not found." with no way back, and a notebook for an unknown lesson that offers "Back to the lesson" (a dead link) |
| m17 | Minor | Console | `/progress` → `/you` logs "flushSync was called from inside a lifecycle method" twice. Each failing request is fetched 3 times |
| m18 | Minor | Navigation | Every course-switcher click on Home pushes a history entry, so Back steps through switcher picks. Back to `/courses` restored scroll to 2704 instead of 1800 |
| m19 | Minor | Home (keyboard) | Resume is the 33rd Tab stop: 18 switcher buttons come before it. The switcher has no arrow-key roving |
| m20 | Minor | Notebook | The typed-working placeholder is an electricity example (`I = V / R`) shown in a maths lesson |
| p1 | Polish | Home | On one screen, the streak appears 3 times (top pill, hero flame, rhythm card), level twice, and "XP to Silver" twice |
| p2 | Polish | Home | The course switcher is about 18 unlabelled icons, clipped at both edges at 1024. Names exist only as `title` tooltips |
| p3 | Polish | Top bar | The icons are unexplained: a layers glyph for Review, a gem with weekly XP, a ring and spark with "1 ✱0", and two shields above the hero flame (streak protections) |
| p4 | Polish | Home | A brand-new learner is greeted "Welcome back, George!" and nudged to "60 XP to reach the Silver league" before any daily goal |
| p5 | Polish | Home | At 1024 and 1440 the right column ends at the course card, leaving a tall empty area beside quests, practice and league |
| p6 | Polish | Home (phone) | Resume sits under the bottom bar on first view at 390×844 |
| p7 | Polish | League | The 8-week history is an unlabelled row of dashes. The league tier resets weekly with no explanation |
| p8 | Polish | Review | The question is set small and grey while the answer is huge, so the hierarchy inverts after reveal. The button row is left-aligned under a centred card |
| p9 | Polish | Review | There is no suggested rating after a wrong answer; "Good" is accepted after "no idea" |
| p10 | Polish | Checks | "Look through your answers" uses `<details>` with no visible disclosure marker, so explanations look absent |
| p11 | Polish | Projects | The SQL and Python editors are plain textareas with no line numbers or highlighting |
| p12 | Polish | Settings | "Your practice" is narrower than the cards below it. Switches look like checkboxes. "Test offline tutor" and "Course authoring: Available" are developer facing. No name, reset, export or theme controls |
| p13 | Polish | Settings | "Celebrations" says it covers finishing a lesson, but it also governs the chest and level-up effects, and the level-up overlay still shows when it is off |
| p14 | Polish | 404 | "Nothing here" with one button and no explanation or search |
| p15 | Polish | Tutor | No tutor exists outside lessons (Review, checks, projects), where Brilliant and Duolingo offer an explanation on demand |

---

## Major findings in detail

### M1. The daily quest you just finished gets replaced

- **Screen:** Home → Daily quests (`/`).
- **Steps:** On a fresh day the quests were No hints needed, XP hunter and **Finisher** ("Finish a lesson and its recall"). Complete one lesson (I used the journey API for *What a letter stands for*). Reload Home.
- **Actual:** The third quest is now **Memory keeper** ("Recall 3 cards that are due", 0/3). The finished "Finisher" has vanished, and the chest moved further away. No toast fires, because the quest id changed.
- **Expected:** Quests fixed for the day at first sight. A learner should never see a quest they just completed taken back.
- **Cause:** In `packages/progression-engine/src/gamification.ts` (around lines 124–133), the third quest depends on `context.reviewableToday >= reviewTarget`. `reviewableToday` comes from `apps/server/src/db/study-store.ts` (`reviewableToday`, about lines 140–153) and grows as soon as a finished lesson registers its cards. Freeze the chosen quest ids per study day, for example by persisting them on first read.
- **Screenshots:** `shots/01-home-fresh-1440.png` (Finisher) and `shots/19-quest-chest-flow.png` (Memory keeper).

### M2. Reveal throws away a typed recall

- **Screen:** Review session (`/review/session/:id`).
- **Steps:** Start review, type an answer into **Your answer**, press **Reveal answer** rather than **Check**, then rate.
- **Actual:** The typed text is discarded and the rating saves. XP stays the same (246 → 246), the review quest stays at 2/3, the daily goal is unchanged, and nothing says why. Four cards rated this way earned nothing.
- **Expected:** Either Reveal records the typed response first, or Reveal is disabled or relabelled while text is present ("Check first to earn credit").
- **Cause:** `apps/server/src/db/store.ts` (around lines 822–828) qualifies a review only when `session.response` is set. `apps/web/src/review/Flashcard.tsx` (around line 208) shows Reveal next to Check whether or not the draft is empty.
- **Screenshot:** `shots/18-review-reveal-no-credit.png`.

### M3. Typed working in the notebook cannot be read

- **Screen:** `/courses/maths-foundations/lessons/keeping-the-balance/notebook`, and any lesson that uses the same component.
- **Steps:** Type into **Typed working**.
- **Actual:** The text is a very pale grey on a white page, effectively invisible (`shots/26-notebook-typed-invisible.png`). The exported PNG is fine.
- **Expected:** Dark ink on the white paper.
- **Cause:** `apps/web/src/styles/notebook.css:136-158`. `.notebook-typed-field` sets `background: … #ffffff` with `color: var(--ink)`, and `--ink` is the light foreground in the dark theme.

### M4. With the API down, every screen is a dead end

- **Steps:** Open the app, kill the API process, then navigate and reload.
- **Actual:** "Discere could not start / The request failed with status 502." The same happens for Courses unavailable, Review unavailable and Course unavailable, with **no retry button** (only You has "Try again"). After a reload, the top bar shows 0 streak, 0 XP and level 0 as if they were real. Settings rolls back the goal change and prints the raw status. There is no app-level "Discere's local service stopped" banner. See `shots/27-server-down.png`.
- **Expected:** One plain-language offline state ("Discere's local service isn't answering"), a Retry on every error screen, and placeholders rather than zeros in the top bar.
- **Location:** `apps/web/src/ui/Feedback.tsx` (`ErrorScreen` has no action slot in use), `apps/web/src/api/client.ts` (the message falls back to the status), and `apps/web/src/shell/NavRail.tsx` (`?? 0`).

### M5. Library search does not find ideas

- **Screen:** `/courses`, whose placeholder reads "Search an idea or subject".
- **Steps:** Search `bayes` (Psychology has a lesson "Base rates and Bayes"), `entropy`, `Kepler`.
- **Actual:** "No courses match". Only words in a course title, description or subject match: `sql` and `shakespeare` work, lesson ideas do not. See `shots/08-courses-search-bayes-empty.png`.
- **Expected:** Lesson titles and concepts are searchable, which is what the placeholder promises, with results pointing to the lesson.
- **Location:** `apps/web/src/home/library.ts:17-25` (`filterCourses` matches course text only).

### M6. Two achievement systems count the same things

- **Screen:** `/you`.
- **Actual:** The Trophy room badges and Milestones overlap almost one-to-one. Scholar ≈ First lesson and Building a foundation. Sharpshooter ≈ Five without hints. Memory Palace ≈ Recall practice. Bridge Builder ≈ Try a new case. Unbroken ≈ Seven study days. Each has its own progress numbers (for example "Memory Palace 5/10" beside "Recall practice 5/10"). The league card also appears on Home and again in the Trophy room. See `shots/11-you-fresh-1440.png` and `shots/12-you-history-1440.png`.
- **Expected:** One achievement ladder. Duolingo has a single Achievements list, and Brilliant does not split the two.
- **Location:** `apps/web/src/game/BadgeWall.tsx`, `apps/web/src/study/Milestones.tsx`, and the milestone definitions in `apps/server/src/db/study-store.ts` (about lines 310–365).

### M7. A wrong SQL check offers to skip

- **Screen:** `/sql-projects/:session`, task "Keep every repair", Coach mode.
- **Steps:** Enter `SELECT 1`, then **Check query**.
- **Actual:** The feedback says "Check the result" and the green primary button becomes **Continue →**, which moves to the next task. Check disappears until the query is edited. Python in the same situation keeps **Check program** (`shots/24-python-project.png`).
- **Expected:** Retry is primary after a wrong check, and skipping is a deliberate secondary action. The two project types should follow one rule.
- **Location:** `apps/server/src/sql-projects/service.ts:173,244` (`canContinue` is true once any check ran) and `apps/web/src/sql-projects/SqlProjectScreen.tsx:487`.
- **Screenshot:** `shots/23-sql-project.png`.

### M8. Placement results reward failure and change nothing

- **Screen:** `/courses/psychology-how-minds-work/checks/starting-point` → session → results.
- **Steps:** Answer all 12 wrongly, rating each "Fairly sure".
- **Actual:**
  - The results show a big green ✓ over "0 / 12 correct · 24 XP earned" (2 XP per wrong answer).
  - "Start with these ideas" lists all 12 lessons.
  - The roadmap afterwards is unchanged, and the course-checks list shows a ✓ "complete" icon beside "0 / 12 correct".
  - A strong result also skips nothing, because every lesson is already open. Placement is advisory only.
- **Expected:** Neutral or encouraging art for a low score. Recommend the first few lessons rather than all of them. A high score should mark or skip lessons, as in Duolingo's placement.
- **Location:** `apps/web/src/checks/CheckScreen.tsx` (`CheckResults`, about lines 290–350), `apps/web/src/checks/CourseChecks.tsx` (`CheckLink` uses the Check icon for `complete`), and `apps/server/src/course-checks.ts:283` (`award = correct ? 8 : 2`).
- **Screenshots:** `shots/21-course-check-flow.png` and `shots/22-check-results-list.png`.

---

## Minor and polish details

- **m1. Launch.** `shots/04-welcome-loader-first.png` and then `shots/05-welcome-splash-second.png`. The welcome only mounts once Home's data has loaded, so the learner sees a spinner, then a splash, then Home. Either show the mark during the load or drop the separate hold. `shell/AppShell.tsx`, `shell/WelcomeScreen.tsx`, `routes.tsx` (hydrate fallback).
- **m2. Overflowing row.** At 1440, Foundations has a `scrollWidth` of 1284 against a `clientWidth` of 1224, and at 1024 "Logic and Reasoning" is cut in half. Nothing signals that the row scrolls. `home/CourseLibrary.tsx` and the path-row CSS. `shots/06-courses-1440.png`, `shots/30-1024-and-phone-roadmap.png`.
- **m3. Subject chips.** `shots/07-courses-390.png`. Consider a "Subject" select on phone, and one level of taxonomy.
- **m4. Late checks and fixed panel.** `checks/CourseChecks.tsx` returns `null` while loading. `.roadmap-launch` is `position: fixed` on phone (`styles/brilliant.css:1276`) and sits over the checks list and the first nodes. `shots/30-1024-and-phone-roadmap.png`.
- **m5. Checkpoint naming.** The names come from each course's `bundle.json` → `courseChecks`, so content needs one convention. The locked-status text comes from `CourseChecks.tsx` `CheckLink`.
- **m6–m9. Review session.** `review/Flashcard.tsx` (`recall-feedback`, `Notice tone="correct"`), `lib/format.ts` (`formatDueDate` gives a date only), and `review/ReviewScreen.tsx` (`saveReviewRun` total, "Practise again"). `shots/15`–`17`.
- **m10. Chart labels.** `home/activity.ts:63` uses `{month:"short", year:"2-digit"}`. Use `Oct ’26` or `Oct 2026`. `shots/12-you-history-1440.png`, `shots/29-phone-home-settings-you.png`.
- **m11. Level-up overlay.** `game/GameWatcher.tsx` (`LevelUpOverlay`: no focus restore, auto-close timer) and `styles/game.css:869+`. `shots/20-level-up-overlay.png`.
- **m12. Capabilities text.** `settings/SettingsScreen.tsx` `CapabilityPanel` puts a block-styled `.settings-remedy` span inside the `dd` text. `shots/13-settings-1440.png`.
- **m13. Time zone.** `study/StudyPreferences.tsx` uses a free-text input. Use a searchable list from `Intl.supportedValuesOf('timeZone')`, and canonicalise on the server.
- **m14. Misleading Python error.** `apps/server/src/python-projects/bootstrap.py`. The runner's own `ValueError("Assign your answer to result.")` falls into the generic `BaseException` mapping, which replaces its message.
- **m15. Orphan routes.** `routes.tsx` (the Roman reference routes and `legacy/courses/:courseId`). `shots/28-deep-links-roman-legacy-errors.png`.
- **m16. Raw error wording.** `checks/CheckScreen.tsx` (`CheckSessionScreen` shows the server's Zod message for a malformed id), `home/CourseScreen.tsx` (no link back), and `notebook/NotebookScreen.tsx` (the back link is shown when the lesson does not exist).
- **m17. Console errors.** `routes.tsx` `ProgressRedirect` (`<Navigate>`) combined with the `flushSync: true` wrapper in `shell/navigation.ts` `installNavigationMotion`. Duplicate fetches come from the `ensureQueryData` loader plus the component query with `retry: 1`.
- **m18. History and scroll.** `home/HomeScreen.tsx` calls `setParams` without `{replace: true}`. Scroll positions are saved in `shell/navigation.ts`, which recorded a later position than the one I left from.
- **m19. Tab order on Home.** `HomeCourseSelector`: make it a single tab stop with arrow keys (`role="listbox"` or `radiogroup`).
- **m20. Notebook placeholder.** `notebook/NotebookCanvas.tsx:357`.

---

## Dead ends, duplicates, unexplained icons, terminology

**Dead ends**
- Course unavailable has no link back to the library.
- The notebook for an unknown lesson offers "Back to the lesson", which leads nowhere.
- Error screens have no retry (M4).
- 404 shows "Nothing here".
- After a review session, "Finish the session" returns to a queue of "0 cards due" with "Practise again" and no explanation.

**Duplicated controls and data**
- Streak ×3, level ×2 and league ×2 on Home. The league card appears on Home and on You.
- Badges and milestones (M6).
- Review is reachable from the top-bar icon, the Home "cards are ready" link and Review's own course table. Fine in itself, but Review is not in the main nav or the phone bottom bar.
- Sound has a Settings switch and a separate in-lesson toggle (`study/LessonSoundToggle.tsx`).
- The course screen exists at both `/courses/:id` and `/legacy/courses/:id`.

**Unexplained icons**
- Layers glyph = Review.
- Gem with a number = weekly XP and league.
- Ring plus spark = level and total XP.
- Shields over the hero flame = streak protections, explained only on the practice card as "2 protections".
- "◎ 5 a day" link.
- The unlabelled 8-dash league history.
- Course-switcher artwork with no names.

**Terminology**
- Learning paths, Courses and library are all used for the same thing.
- "Find your starting point", "Bring it together" and "course check" all name checks.
- "Cards", "recall cards" and "Review" are mixed.
- "Exercises" (course header) against "questions" and "tasks".
- "Celebrations" covers more than its description says.
- "Practise again" (British) beside "Practice mode" (noun). Correct, but worth keeping in mind.
- "Level" means both a roadmap module ("LEVEL 1 · Rearranging") and the XP level ("Level 3"). Two meanings on one Home card.

## Next to Brilliant and Duolingo, what feels unfinished

- **No end-of-session summary** for Review or checks. Both apps close a session with what you did, your accuracy and XP, and what comes next.
- **The quests and chest work but feel brittle** (M1). The league is a race against yourself with no explanation of tiers or the weekly reset.
- **Placement does not place** (M8).
- **Search finds courses only** (M5). Brilliant lets you search concepts.
- **Code projects use bare textareas** (p11).
- **No offline state** (M4).
- **Two visual languages.** The Roman reference flow is a separate white design (m15).
- **No account basics.** There is nowhere to change the learner name, reset progress or export data (p12).

## What worked well

- No page errors or React errors anywhere except the `/progress` warning.
- The chest claim, confetti, XP fly-in and level-up all fire from real data. The level-up came from the background 60 s poll.
- The skip link is the first Tab stop, every control showed a 2 px focus ring, and the chart supports arrow keys.
- Reduced motion is honoured by the effect engine, tilt and backdrop (`reducedMotionEnabled()` checks).
- Back from a course returns to the library, and typing in search replaces history rather than pushing entries.
- The check, SQL and Python flows save progress and resume ("Continue check", "Continue project").
- There is no horizontal page scroll at 390 on any route tested.

---

## Resolved (reliability pass, 2026-10-06)

Fixed in the working tree and checked in the browser at 1440×900, 1024×768 and 390×844. The
game-layer findings (M6, m11, p1, p3, p4, p7, and the level-up half of p13) belong to the
game pass. M1 and M3 were fixed earlier by the lead.

| ID | Fix |
| --- | --- |
| M2 | **Reveal answer** with a typed answer now records it as the recall first, exactly as **Check** does (same verdict, same credit); a line under the buttons says so. `review/Flashcard.tsx`. |
| M4 | A stopped engine is named as one: "Discere’s engine isn’t responding. Reopen Discere from Instrumenta". Gateway failures with no Discere body and network failures map to it (`api/client.ts`); every error screen in this pass has **Try again** and, where it is a dead end, a way back (`ui/Feedback.tsx` `ErrorScreen`); an app-wide banner with **Try again** appears when a screen does not already explain it, probes `/api/health` every 5 s and clears itself when the engine returns (`api/engine-status.ts`, `shell/EngineBanner.tsx`). The top bar shows "–" instead of zeros (`shell/NavRail.tsx`). Unreachable and refused requests are no longer retried. |
| M5 | Library search finds lessons by title, concept and teaching text through a small in-memory index (`apps/server/src/search.ts`, `GET /api/search`). Results open the lesson and say why they matched; `bayes` finds "Base rates and Bayes". `entropy` honestly finds nothing: no course teaches it. |
| M7 | After a wrong check, SQL and Python both keep **Check again** as the primary action (disabled until the code changes) with **Skip this task** as a quieter secondary choice. |
| M8 | Placement is honest and adapts the roadmap. A wrong placement answer earns no XP (evidence is recorded as before); a low score gets a compass, not a tick, and "Start from the beginning"; recommendations are the first three lessons the placement did not show as known. Lessons answered correctly and not as a guess are marked **Known** (optional, still open) on the roadmap, and the suggested next lesson moves past them. `course-checks.ts`, `checks/check-model.ts`, `home/CourseRoadmap.tsx`. |
| m1 | The loading fallback is the welcome artwork itself, and time spent loading counts towards the welcome's hold: one opening moment, not a spinner then a splash. |
| m2 | Path rows wrap into a grid below 1360 px and fit on one line above it; no card is cut off. |
| m3 | On phone, subject chips become one **Subject** select. (The mixed subject levels are content.) |
| m4 | Course checks hold their space while loading; the phone launch panel is one compact row and the page leaves room beneath it. |
| m5 | One name per kind of check in every course: Find your starting point, Bring the ideas together, Use it a week later. The transfer check says "Opens a week after “Bring the ideas together”". |
| m6 | A wrong recall's feedback is amber, and the rating notice is neutral ("Saved"). |
| m7 | Due times read at the right precision: "This card comes back in 6 minutes", "Tomorrow", "14 October" (`lib/format.ts` `formatReturn`). |
| m8 | A review ends with a summary (cards reviewed, typed answers right, XP) and when the next card is due. With nothing due, Review says so and offers **Practise early** with an explanation. |
| m9 | The run's total is cards reviewed plus cards due now, so a returning card lengthens the run visibly, and is labelled "Back again". |
| m10 | Month labels read "Oct ’26". |
| m12 | "Available tools" shows each tool as a card with its state, reason and "Still works:" as separate sentences; course authoring is no longer shown to the learner. |
| m13 | The time zone is a searchable list (`Intl.supportedValuesOf`), accepts any case or a lone city, and says what is wrong ("“Mars/Base” is not in the list…"). The server stores the canonical spelling and refuses an unknown zone by name. |
| m14 | The Python runner's own messages ("Assign your answer to result.") are passed through instead of being reported as a ValueError. |
| m15 | `/legacy/courses/:id` redirects to `/courses/:id`. Archived courses (Roman Empire, Electronics) show an "Archived course" notice with a link to current courses on every screen. `/api/health` reports 18 courses and 2 archived. |
| m16 | Schema refusals never reach the learner; a bad check link says so and offers the way back; unknown courses say "Course not found" with **Browse courses**. |
| m17 | `/progress` redirects in a loader, so no `flushSync` warning; failing requests are fetched once. |
| m18 | Choosing a course on Home replaces the history entry. (The scroll-restoration offset was not reproduced and is not changed.) |
| m19 | The Home course switcher is one Tab stop: a radio group with arrow, Home and End keys. |
| p2 | Switcher items are named by the course title alone. |
| p8 | After reveal the question stays readable and the answer is smaller; the card's buttons are centred. |
| p9 | The checked answer suggests a rating (Again after a wrong answer, Good after a right one); the learner still chooses. |
| p10 | Answer explanations have a visible chevron and a line saying they open. |
| p11 | SQL and Python editors have line numbers and light syntax colouring over a native textarea. |
| p12 | All Settings cards share one width, switches look like switches, and the offline tutor no longer offers a developer test. Tutor routing (models) and usage (requests, tokens, cost) are shown when the provider reports them. |
| p13 | The Celebrations description now names the chest and level-up effects. |
| p14 | The 404 page names the address, explains it, and offers search, Home and Courses. |

Not done here: p5, p6 (Home layout), p12's name, reset and export controls, p15 (a tutor outside lessons), m20 and the notebook half of m16 (notebook files), and the 390 px chart label overlap in m10.
