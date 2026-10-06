# Practice, rewards, and motion

Updated: 2026-10-06

George requested a substantial refinement of gamification and animation, using Brilliant and
Duolingo as quality references. This round implements and tests the core experience. It does not
claim measured retention gains or parity with their complete products. All changes stay in Discere;
the Instrumenta wrapper and the vendor-independent tutoring boundary are preserved.

## What the learner sees

Home shows today's goal, the current streak, and a week of actual study. After a lesson, the main
action moves to the next unfinished lesson. Course pages connect completed lessons and the next
idea with a simple path; every available lesson remains accessible.

Answers receive one useful fact or correction, plus any XP actually earned. A verified finish
shows lesson XP, questions answered without help, recall cards, level progress, today's goal, and
the next lesson. Seven milestones recognise lesson completion, independent answers, due recall,
self-correction, transfer, seven real study days, and five lessons. Their counts and dates come
from server records. Untouched concepts do not fill the progress page. (On 6 October the
milestones became the first ranks of achievement families, and wrong answers stopped earning XP;
see the game layer section below.)

## Reward rules

| Action | Result |
| --- | --- |
| Visit or advance a teaching screen | No XP |
| Submit a marked answer | Existing scoring and assistance policy; per-question cumulative rewards are bounded across attempts |
| Correct an earlier response | Only the remaining reward difference; first correct evidence is recorded once |
| Respond to a genuinely due card | 8 XP for correct independent recall; 3 for another meaningful response |
| Review early or reveal without responding | No review XP |
| Rate another tab's already-reviewed card | Rejected before a second schedule or evidence update |
| Finish a verified lesson | 20 XP once, after required work and recall |
| Reopen a completed lesson | Static result; no additional completion XP |
| Solve a changed-case transfer | Existing reduced recovery reward, once per challenge |

XP is separate from correctness and mastery. A repeated correct question cannot repeatedly
increase concept evidence. Coach, Assisted, Direct, and Exam permissions and server-owned answer
keys remain enforced. Wrong, blank, ungraded, or Direct recall cannot become independent evidence
through an Easy rating.

## Goals and streaks

The default daily goal is five meaningful responses; settings offer three or ten. Different
questions and different genuinely due cards count once per local day. Finishing a lesson also
completes the goal, without inventing additional responses.

A streak day needs one meaningful lesson answer, transfer, or verified completion, or three
different due-card responses. Participation can qualify a study day without claiming correctness.
The goal and streak are deliberately separate. Merely opening Discere does not qualify.

Study dates use the saved IANA timezone, initially the host timezone or `DISCERE_TIME_ZONE`.
Calendar arithmetic uses date labels rather than subtracting local instants across daylight-saving
changes. Before today's practice, yesterday's continuing streak remains visible. Study queries
refresh on focus and every minute so the day changes in an open browser.

Every seven real study days earn one protection, with at most two held. Protection automatically
bridges a recent complete gap when the wallet covers it. It never spends on today or repairs an
ancient break using newly earned charges. Protected dates have a shield, do not claim practice,
and do not earn more protection. The wallet and protected dates persist on the server.

## Motion and audio

Answer feedback enters in 180 ms, teaching beats in 220 ms, and earned XP counts up in 520 ms.
Progress rings and deterministic visual transitions show a change without interrupting a response.
Recall reveal keeps context and uses a short crossfade after server authorisation.

The original SVG completion award draws its check and emits fourteen small, deterministic green
particles. Particles disappear within one second. Celebration is claimed once per earned lesson
in browser storage and memory, including React StrictMode. Refresh, bookmarks, and revisits show
the same static result. The next action is usable throughout.

Operating-system reduced motion always wins; a saved Reduced setting also applies immediately.
CSS animation, transitions, scrolling, and animated SVG state honour the preference. Cached
preferences prevent an unwanted animation on reload. Celebrations can be disabled separately.

The 1 October experience request enables quiet original sound for fresh preferences, while
preserving saved mute. Locally generated sine tones use Web Audio prepared during a learner
gesture. Each new correct lesson response sounds even when its bounded XP has already been
earned; due review rewards and fresh finishes retain their cues. The lesson has a real mute.
Audio failure does not affect feedback or navigation; nodes disconnect after playing.
No sound assets, network service or paid dependency are required.
The current verification checkpoint is recorded in [experience notes](../brilliant-experience/README.md);
the migration and original 30 September checks below remain historical evidence.

## Data migration and verification

`0005_study_rewards.sql` adds the learning/reward ledger, preferences, protection wallet, protected
dates, and the due timestamp captured when a review session opens. Existing XP remains intact.
Historical records receive conservative zero-XP events; no historical XP timestamps are invented.
Older review sessions without a captured due timestamp can still be rated but cannot earn review XP.
Older review history is incomplete, so it cannot reconstruct every past practice day.

Before migration, the owner database passed an online SQLite backup and integrity check:
`data/backups/discere-before-study-rewards-20260930T143904Z.sqlite`. After migration and restart,
integrity, owner XP, and saved record counts were unchanged. Live health and study endpoints passed,
with Australia/Sydney dates, goal five, and sound off. Browser tests use disposable databases.

`pnpm verify` passed with 596 package tests, five validated bundles, strict typechecks, production
build/CSP, and full-stack smoke. All 44 Chromium browser tests passed. New tests include local
midnight and DST, repeat XP, self-correction, terminal stages, due/early/blank/duplicate review,
protection persistence, preference validation, next-lesson routing, rapid submissions and retry,
StrictMode, completion reload, live reduced-motion changes, and actual opt-in Web Audio.
Physical mobile devices and retention outcomes were not tested. The pre-existing large main-bundle
warning remains a performance task.

## Screens and recording

The eight screens below were captured at 1440 × 900, 1024 × 768, and 390 × 844. Overflow checks
pass at every viewport. The Roman SVG references remain the learner-flow standard: a focused
white canvas, black framing, green response/action states, subject-led headings, and one primary
action. The completion now centres on desktop and keeps its level bar and action within the mobile
layout. The home rhythm and progress milestones extend the existing workspace composition.
Review was performed under George's delegated design decision; these are not claimed as screenshots
personally approved by him.

| Screen | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Retry | [View](implementation-screens/answer-retry-1440x900.png) | [View](implementation-screens/answer-retry-1024x768.png) | [View](implementation-screens/answer-retry-390x844.png) |
| Earned answer | [View](implementation-screens/answer-earned-1440x900.png) | [View](implementation-screens/answer-earned-1024x768.png) | [View](implementation-screens/answer-earned-390x844.png) |
| Recall reveal | [View](implementation-screens/recall-reveal-1440x900.png) | [View](implementation-screens/recall-reveal-1024x768.png) | [View](implementation-screens/recall-reveal-390x844.png) |
| Lesson finish | [View](implementation-screens/lesson-finish-1440x900.png) | [View](implementation-screens/lesson-finish-1024x768.png) | [View](implementation-screens/lesson-finish-390x844.png) |
| Preferences | [View](implementation-screens/practice-settings-1440x900.png) | [View](implementation-screens/practice-settings-1024x768.png) | [View](implementation-screens/practice-settings-390x844.png) |
| Home rhythm | [View](implementation-screens/home-rhythm-1440x900.png) | [View](implementation-screens/home-rhythm-1024x768.png) | [View](implementation-screens/home-rhythm-390x844.png) |
| Course path | [View](implementation-screens/course-path-1440x900.png) | [View](implementation-screens/course-path-1024x768.png) | [View](implementation-screens/course-path-390x844.png) |
| Progress and milestones | [View](implementation-screens/progress-milestones-1440x900.png) | [View](implementation-screens/progress-milestones-1024x768.png) | [View](implementation-screens/progress-milestones-390x844.png) |

[Normal-motion browser recording](earned-lesson-motion.webm) shows the response-to-finish flow,
including correction, recall, earned celebration, viewport changes, and reload. Screenshots suppress
animation for stable comparison; the browser test separately verifies normal animation and its
absence under reduced motion.

## Design references

These primary sources informed the separation of daily goals, streaks, earned rewards, and brief
celebrations. Discere's exact reward and protection policies are its own:

- [Brilliant: streaks](https://brilliant.org/help/features/what-is-a-streak/)
- [Brilliant: XP](https://brilliant.org/help/features/what-is-xp/)
- [Duolingo: separating streaks from daily goals](https://blog.duolingo.com/improving-the-streak/)
- [Duolingo: designing streak milestone animation](https://blog.duolingo.com/streak-milestone-design-animation/)
- [Duolingo: streaks and habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)

No brand artwork, mascot, sound, or lesson content was copied.

## The game layer (6 October, revised)

George asked for game mechanics that make study compelling, and for boot.dev's to be studied and
copied where they fit. The research is in [boot-dev-research.md](boot-dev-research.md). The rule
from 30 September still holds and governs every choice below: rewards read the evidence ledger and
never create evidence. XP, chests, items, leagues and achievements never change what counts as
correct, mastered or done on your own. The goals are the course topics themselves; there is no
separate goal-setting feature.

### What changed and why

The first version of the game layer (earlier on 6 October) worked but contradicted itself. The
app audit and the lesson audit found: badges and milestones counting the same things twice; the
streak shown three times on Home, the level twice and the league card twice; "Level" meaning both a
roadmap module and the XP level; league tiers and the weekly reset never explained, and an
unlabelled history; quests that felt brittle; a quest toast and confetti over a *wrong* answer; a
0/6 lesson finishing with a star, confetti and 62 XP; and a brand-new learner greeted "Welcome
back" and nudged towards a league before anything else. The revision fixes each of these, and adds
three boot.dev ideas that fit an honest single-learner app: chests with rarity, items earned by
work, and a league with weekly promotion and relegation.

| Audit finding | Resolution |
| --- | --- |
| app M6, badges and milestones duplicate | One achievement system; each 30 September milestone is now the first rank of a family |
| app p1, streak ×3, level ×2, league ×2 on Home | One home for each stat (table below); the hero flame and level ring are gone |
| app p3, unexplained pill icons | Each pill has a hover/focus tip and a full accessible name |
| app p4, new learner greeted "Welcome back" | First run says "Welcome to Discere", shows three cards on how progress works, and hides the league until there is XP |
| app p5, Home's empty right column | Items and "Almost there" sit under the course card |
| app p7, unexplained league and unlabelled history | The league card states the target, the safety line, the dates, labels every week and explains the rules in place |
| app m11, level-up overlay | No auto-close; focus returns to where it was |
| app terminology, "Level" means two things | Roadmap modules are now "Unit 1 · …"; "Level" is only the XP level |
| lesson M5 (effects), toast and confetti on a wrong answer | Wrong answers earn no XP; inside a lesson every announcement is held for the finish screen |
| lesson m4 (effects), 0/6 celebrated | Stars run 0–3; no star, no confetti and an honest line when the lesson was done with help |

### One home for each stat

| Stat | Glance | Explained in full |
| --- | --- | --- |
| Streak, freezes | Navigation pill (flame) | Home, "Today" card, with the week and the rule |
| Level, total XP, running boost | Navigation pill (ring) | You, level card, with "How XP and levels work" |
| League, weekly XP | Navigation pill (gem), hidden on first run | You, league card, with "How leagues work" |
| Quests and chest | — | Home; a compact copy on the lesson finish |
| Items | — | Home, "Your items" |
| Achievements | Home, "Almost there" (two closest) | You, achievement wall |

### XP

| Action | XP |
| --- | --- |
| Correct answer, on your own | 20 × difficulty (0.5–2) |
| Each hint taken | a quarter off, down to 40% |
| Answer revealed | 25% |
| Direct mode | 50% |
| Wrong answer | 0 (was 6) |
| Due recall card | 8 on your own, 3 otherwise (unchanged) |
| Finished lesson | 20, once (unchanged) |
| Daily chest | 20 / 30 / 45 / 70 by rarity |
| XP boost running | +50% on every learning reward |

Rationale. The earlier formula added 2 XP per hint, so taking help was the most rewarding route
through a question, and a wrong answer paid 6 XP, which is how "XP hunter" completed on a miss.
Boot.dev prices help the same way (a solution viewed early costs that lesson's XP; the AI tutor
halves it) but sells items that waive the cost. Discere keeps help free and always available,
lets it pay less, and sells nothing: no item restores XP lost to help, because that would make XP
say "on your own" about assisted work. Per-question totals are still bounded across attempts, so a
correction pays only the difference.

Levels are unchanged (level *n* starts at (*n*−1)² × 100 XP) and now carry a title per band:
Newcomer 1, Apprentice 3, Student 6, Adept 10, Expert 15, Sage 20, Luminary 30 (after boot.dev's
roles every ten levels, compressed because Discere's levels are fewer).

### Daily quests and the chest

Three quests a day from six (Sharp mind, On your own, In the zone, XP hunter, Memory keeper,
Finisher), chosen from the date and the daily goal and fixed for the day on first sight
(`daily_quest_sets`, migration 0009). The board says when they reset. Chest XP never counts towards
the XP quest.

Finishing all three unlocks the chest, opened by hand once per study day. Its rarity is earned, not
rolled: each of three conditions met *today* raises it one step, and the board lists them with
progress so the learner can see how to raise it.

| Upgrade | Condition |
| --- | --- |
| On your own | Twice the daily goal (at least six) different questions solved without help |
| Spree | A run of ten right first time, without help (after boot.dev's 15-answer "sharpshooter spree") |
| Streak | A streak of seven days or more |

| Rarity | Contents |
| --- | --- |
| Common | 20 XP |
| Rare | 30 XP, 1 XP boost |
| Epic | 45 XP, 1 XP boost, 1 quest swap |
| Legendary | 70 XP, 2 XP boosts, 1 quest swap, 1 streak freeze (left out when two are already held) |

The contents are shown before opening. Boot.dev's chests are random; Discere's are deterministic,
because a variable reward schedule is the part of loot boxes most likely to drive compulsive
play rather than study, and because the learner can always see exactly what earned what. The
rarity is fixed when the chest opens and recorded in the item ledger.

### Items

| Item | Effect | Earned from | Use |
| --- | --- | --- | --- |
| Streak freeze | Covers a missed day so the streak survives (hold at most two) | Every seven real study days; Legendary chests | Automatic, never on today |
| XP boost | +50% on learning rewards for 30 minutes | One per new level; Rare chests and up | "Start" in Your items; one at a time |
| Quest swap | Replaces one unfinished quest for today | Epic chests and up | Swap button on the quest, before the chest is opened |

The boost bonus is its own reward row on the same reference, so a lesson's result includes it and
the ledger shows exactly what the boost added. Level rewards start from the level held when this
feature first ran, so an existing learner is not paid for old levels all at once. Boot.dev's
boost (XP Potion) was cut to +25% for an hour in December 2024; Discere's half-hour +50% is a
deliberate study-session timer and only multiplies real work. Considered and rejected: gems or any
currency (nothing to buy, and boot.dev's own notes show currencies get farmed), Seer Stone and Baked
Salmon equivalents (they waive the cost of help), and armour that hides a failed answer (it would
hide evidence).

### League

Ten leagues, Bronze to Diamond, held for a whole Monday-to-Sunday week in the learner's time zone.
When the week closes, weekly XP at or above the promotion target moves up one league; below the
safety line moves down one; anything between stays. Bronze never drops; Diamond never promotes.
The ladder is replayed from the ledger every time, so it is never stored and cannot drift.

| League | Promote at | Safety line |
| --- | --- | --- |
| Bronze | 100 | — |
| Silver | 175 | 40 |
| Gold | 250 | 80 |
| Sapphire | 350 | 120 |
| Ruby | 450 | 160 |
| Emerald | 575 | 200 |
| Amethyst | 700 | 250 |
| Pearl | 850 | 300 |
| Obsidian | 1000 | 375 |
| Diamond | — | 450 |

The default goal earns about 100 XP on a study day, so the lower half climbs one league a week and
the upper half asks for most days. There are no invented opponents: boot.dev and Duolingo rank
learners against each other, which cannot be honest with one learner. The card still shows last
week at the same point and the best week. The previous version re-ranked the league live from this
week's XP, so it fell back to Bronze every Monday without saying why.

### Achievements

Eleven families, each with up to five numbered ranks (I–V; numbers rather than metal names, so
an achievement rank is never confused with a league). Every rank is read from the ledger with the
date of the event that crossed it, so earned history survives the merge.

| Family | Counts | Ranks | Was |
| --- | --- | --- | --- |
| Scholar | Lessons finished | 1, 5, 15, 40, 100 | First lesson, Building a foundation |
| Sharpshooter | Different questions solved without help | 5, 25, 100, 250, 600 | Five without hints |
| Memory Palace | Due recall responses | 10, 50, 150, 400, 1000 | Recall practice |
| Second Wind | Wrong answers corrected without a hint | 1, 10, 30, 75, 150 | A better answer |
| Bridge Builder | Changed problems solved after a worked answer | 1, 5, 15, 40, 100 | Try a new case |
| Regular | Real study days (freezes excluded) | 7, 30, 100, 200, 365 | Seven study days |
| Unbroken | Longest streak | 3, 7, 14, 30, 100 | — |
| In the Zone | Longest run right first time | 3, 5, 10, 15, 25 | — |
| Polymath | Courses with a finished lesson | 2, 4, 6, 9, 12 | — |
| Treasure Hunter | Chests opened | 1, 5, 15, 40, 100 | — |
| Climber | Highest league reached | Silver, Sapphire, Emerald, Pearl, Diamond | — |

### Announcements and the lesson finish

Quest completions, a ready chest, new achievement ranks, a new level and a league change are
announced by comparing one study summary with the next. Outside a lesson they arrive as toasts
(and a level-up dialogue). Inside a lesson they are held, so nothing celebrates over a question,
and the finish screen lists them under "Earned in this lesson". Leaving a lesson without reaching
its finish releases them as toasts.

The finish screen is the payoff, in this order: stars for independence (90%, 60% and 30% of the
lesson's questions solved without help for three, two and one; none below that, and none shown
for a lesson without questions); a verdict line ("Perfect lesson · every answer on your own" down to
"Finished with help. These ideas come back in review, where you can try them alone."); lesson XP
counting up; best run; "Today counts · *n*-day streak"; the level bar filling from where the lesson
began, with "Level *n* reached" when it crosses; what the lesson earned; today's quests with the
chest, which can be opened right there. Confetti scales with the stars and is absent at zero. A
fresh finish animates once; reloads and revisits are static.

### First run

Until the first recorded piece of work, Home says "Welcome to Discere, George.", points at the first
lesson and shows three cards: answer on your own (XP, level, runs), come back each day (streak and
freezes), finish three quests (chest and rarity). The league pill, items and "Almost there" stay
hidden until there is something in them.

### Rules and storage

| Mechanic | Source of truth |
| --- | --- |
| XP per answer | `attemptXp` in `@discere/progression-engine` `scoring.ts` |
| Quests, chest rarity and contents, swaps, league ladder, achievements, titles | `gamification.ts`, from `learning_events` |
| Chest | `POST /api/study/chest`; once per local day; a `reward` event `chest:<date>` and an item-ledger row `chest:<date>:opened` holding the rarity |
| Items | `inventory_ledger` (keyed grants and spends; balance is the sum), streak freezes in `streak_wallet` |
| Boost | `POST /api/study/boost`; `xp_boosts`; bonus rows keyed `boost:<id>` |
| Quest swap | `POST /api/study/quests/:questId/swap`; rewrites that day's `daily_quest_sets` row |
| Level rewards | `game_state.level_rewarded` |

Migration `0010_game_inventory.sql` adds `inventory_ledger`, `xp_boosts` and `game_state`. It
changes no existing row. Reduced motion keeps every state and drops movement (stars, chest,
tips, level bar, confetti); celebrations can be switched off separately.

### Verification

Engine tests cover chest rarity and contents, swaps, the ladder (promotion, staying, dropping,
the Bronze floor), achievements and their dates, titles and attempt XP. Server tests cover the
summary for a new learner, the chest's rarity and items, one-off level rewards, the boost window
and its bonus rows, refusals, and quest swaps. Web tests cover the quest board, swaps, the league
card, the achievement wall, announcements, lesson phases, stars and the nudge. In a scratch
database, lessons were answered through the real API (right, with hints, and wrong then
revealed), weeks of study were backdated to produce a 14-day streak and a four-week climb to Ruby,
and the chest was opened by clicking it. The screens are in [game-layer/](game-layer/):
first run, Home at three sizes, You, the finish after a perfect lesson (with what it earned) and
after a lesson answered wrongly, the chest opening and a pill tip.

### Code

`apps/web/src/game` (HUD, combo, quest board, chest, items, league, achievements, level card,
hero and first-run primer, announcements), `apps/web/src/fx`, `apps/web/src/study/StudyRhythm.tsx`,
`apps/web/src/journey/stages/CompletionStageView.tsx`, `apps/web/src/styles/game.css` and
`game-layer.css`, `packages/progression-engine/src/{gamification,scoring,xp}.ts`,
`packages/contracts/src/study.ts`, `apps/server/src/db/study-store.ts`.
