# Boot.dev gamification: research notes

Research carried out on 2026-10-06 with web search and page fetches. Every claim carries its source
and one of two marks:

- **OBSERVED**: the statement was on a page fetched on 2026-10-06 (the fetch tool returns a model
  summary with quotations, not the raw page, so wording is close but not guaranteed verbatim).
- **REPORTED/INFERRED**: secondhand (a reviewer, a search-engine snippet, a third-party guide) or my
  own inference.

All URLs were accessed on 2026-10-06. Reddit could not be fetched (the fetch tool refuses
`reddit.com`, and site-restricted searches returned no Reddit threads), so learner voices come from
Trustpilot, review sites, and Boot.dev's own patch notes rather than r/learnprogramming or
r/bootdotdev. That gap is real and should be kept in mind.

## Summary

Boot.dev wraps lessons in an RPG economy that has been retuned repeatedly since 2023. The core loop
today is: lessons earn XP; XP raises your level and unlocks roles up to Archmage at level 100;
correct first submissions build a "sharpshooter spree" that pays out chests every 15; chests of
increasing rarity contain gems and consumables; gems buy consumables in a shop. A daily streak
(lesson or GitHub commit) is protected first by earned "embers" and then by a bought "Frozen
Flame". Help is priced: viewing a solution before completing a lesson forfeits that lesson's XP
unless you spend a Seer Stone, and chatting with the AI tutor Boots halves the lesson's XP unless
you spend a Baked Salmon. Social layers are leagues of 25 learners for four weeks (from level 10), a
global leaderboard, guilds, community boss fights, and Discord karma for helping others. A
"Training Grounds" area generates unlimited AI-written practice challenges with spaced repetition.

The pattern of Boot.dev's own changes is instructive: rewards were repeatedly moved away from
things that can be farmed (achievements, role-ups, quiz XP) and towards difficulty-weighted lesson
work, and help was made more expensive (Seer Stones' price raised, gem drops cut) "to only
encourage the best study habits".

## Boot.dev mechanics

### XP and levels

- XP bonuses "are reworked to be more dependent on the difficulty of a lesson" (May 2024).
  OBSERVED, https://www.boot.dev/blog/news/bootdev-beat-2024-05/
- Lessons show a difficulty score "updated dynamically from completion data" (July 2024).
  OBSERVED, https://www.boot.dev/blog/news/bootdev-beat-2024-07
- A lesson page's game panel showed "XP progress (0/3000)" and "Difficulty rating (3 - Easy)".
  OBSERVED, https://www.boot.dev/lessons/142c8a73-5ede-49a6-9460-563890646023 . What 3000 refers
  to (per-level threshold or per-lesson cap) is not stated; I could not verify.
- The platform's level curve is **not verified**. A search snippet claimed "100 XP per level";
  no Boot.dev page I fetched said so. The "Experience Points" lesson
  (https://www.boot.dev/lessons/565dd496-0765-4e10-b074-85931fba340f) describes a curve of
  "current level times 5", but that is a coding exercise about a fictional game character, not the
  platform's own rule. OBSERVED (that the lesson says it), INFERRED (that it is not the real curve).
- Training Grounds quiz XP was "nerfed ... (it was too easy to XP farm)" (August 2026). OBSERVED,
  https://www.boot.dev/blog/news/bootdev-beat-2026-08
- XP and gem rewards were removed "from achievements, role updates, and daily quests" (May 2024).
  OBSERVED, https://www.boot.dev/blog/news/bootdev-beat-2024-05/

### Roles

- Roles every ten levels: Apprentice 10, Pupil 20, Acolyte 30, Disciple 40, Scholar 50, Mage 60,
  Sage 70, Druid 80, Necromancer 90, Archmage 100; shown as profile-picture borders. OBSERVED,
  https://www.boot.dev/blog/news/bootdev-beat-2023-05
- Archmage brings private Discord channels and "a physical archmage coin mailed to you". OBSERVED,
  https://www.boot.dev/lessons/4777c0b2-30fa-48fe-82bf-c9b84e74d92f
- An older third-party write-up lists a different, compressed scheme (Apprentice at level 4, Pupil
  10, ... Sage 60) and says gems came from quests and role unlocks. REPORTED, probably pre-2023,
  https://www.devopschat.co/articles/how-the-bootdev-game-works

### Run, submit, armour and the sharpshooter spree

- "Run" tests without penalty; "Submit" checks against the answer key. On a failed submit, if you
  have armour "you'll lose one. That armor is consumed to protect you from future failures on that
  lesson"; without armour "you'll lose your sharpshooter spree, and it will reset to zero. Each time
  your spree counter hits 15, you'll earn a random chest." The panel shows spree progress "0/15".
  OBSERVED, https://www.boot.dev/lessons/142c8a73-5ede-49a6-9460-563890646023
- How armour is obtained is not stated there; a search snippet says chests contain "gems and items
  (like armor)". REPORTED.

### Streaks, embers and the Frozen Flame

- History: streaks were weekly in March 2024 ("arguably, the most important game feature on
  Boot.dev"); the Frozen Flame was bought with gems and "auto-consumes if you miss a week".
  OBSERVED, https://www.boot.dev/blog/news/bootdev-beat-2024-03
- October 2024: streaks became daily "and frozen flames will only protect you for 3 days instead
  of 7". OBSERVED, https://www.boot.dev/blog/news/bootdev-beat-2024-10/
- November 2024 and January 2025 say a Frozen Flame protects for **4 days** ("a relatively
  expensive item that is used to save your streak for 4 days"). OBSERVED,
  https://www.boot.dev/blog/news/bootdev-beat-2024-11 and
  https://www.boot.dev/blog/news/bootdev-beat-2025-01 . The 3 v 4 discrepancy is in Boot.dev's own
  posts; 4 is the later figure. Current value unverified.
- A streak day counts a completed lesson or a GitHub commit (from December 2024). OBSERVED,
  https://www.boot.dev/blog/news/bootdev-beat-2024-12/
- Embers (January 2025): "charge an ember when you go above and beyond for a day"; when you miss a
  day "the ember is consumed before any frozen flames, and before the streak is lost". Stated aim:
  a healthy habit is "5 days a week", so you "can take weekends off". OBSERVED,
  https://www.boot.dev/blog/news/bootdev-beat-2025-01 and .../bootdev-beat-2024-11
- The lesson panel shows "Daily streak embers (0/2)", which suggests a cap of two embers. OBSERVED
  (the display), INFERRED (that two is the cap). What "above and beyond" means in XP is not stated.

### Chests and rarity

- Chests ("loot boxes") became "the primary reward system" in May 2024, "(don't worry, no
  microtransactions)" (April 2024 preview). OBSERVED,
  https://www.boot.dev/blog/news/bootdev-beat-2024-04
- "The higher the rarity of the chest, the more likely you are to get more valuable items and more
  gems." Sources: daily quests, sharpshooter sprees, boss fights. OBSERVED,
  https://www.boot.dev/blog/news/bootdev-beat-2024-05/
- Gem drops from chests "were nerfed across the board" (July 2024). OBSERVED,
  https://www.boot.dev/blog/news/bootdev-beat-2024-07
- September 2026: "every Mythic chest now guarantees at least one high-value item: a Seer Stone,
  Frozen Flame, or Greater XP Potion"; "higher-tier chests have higher-tier reward floors"; lower
  tiers yield "salmon and some gems". Rarity names seen on the page: Rare and Mythic only. OBSERVED,
  https://www.boot.dev/blog/news/bootdev-beat-2026-09
- A full tier list (common, epic, legendary and so on) and drop rates: **not found**.
- Participating in a boss fight with one of your guilds gives "a bonus Mythic chest". OBSERVED,
  https://www.boot.dev/blog/news/bootdev-beat-2026-08

### Gems and the shop

- Gems are the in-game currency; consumables are bought with them. OBSERVED (March, May 2024 posts).
- Boot.dev states there are no microtransactions for chests (April 2024). OBSERVED. I found no page
  offering gems for money. INFERRED: gems are earn-only.
- Referral: both parties receive gems ("150 gems" at the time of writing). REPORTED (search
  snippet), https://www.boot.dev/blog/news/refer-a-friend , not fetched.
- The founder's earlier essay framed gems as a carrot rather than a stick, originally spendable on
  content. REPORTED (search summary),
  https://www.boot.dev/blog/misc/educations-shameful-state-of-the-art

### Consumables

| Item | Effect | How obtained | Status |
| --- | --- | --- | --- |
| Seer Stone | "Peek a lesson's solution without losing XP" | Shop (gems), chests; guaranteed-pool item in Mythic chests | OBSERVED (May 2024, Sept 2026) |
| Baked Salmon | "Chat with Boots without losing XP" | Shop, chests ("salmon" as lower-tier drop) | OBSERVED (May 2024, Sept 2026) |
| XP Potion | "Grant a temporary XP boost"; from Dec 2024 lasts one hour (was 30 min) at +25% XP (was +50%), pitched as a pomodoro timer | Shop, chests | OBSERVED (May, Dec 2024) |
| Greater XP Potion | Stronger potion; exact multiplier not found | Mythic chest pool | OBSERVED (name), effect unverified |
| Frozen Flame | Auto-consumed on a missed day after embers; protects 4 days (3 per Oct 2024) | Shop (gems, "relatively expensive"), Mythic chest pool | OBSERVED |
| Streak Ember | Charged by an above-average day; consumed first on a miss | Earned by effort, not bought | OBSERVED |
| Armour | Absorbs one failed submit on a lesson, protecting the spree | Chests (reported) | OBSERVED (effect) |

Prices: Seer Stones "now cost quite a bit more (10 gems)" (July 2024). OBSERVED,
https://www.boot.dev/blog/news/bootdev-beat-2024-07 . Baked Salmon "2 gems": REPORTED (search
snippet only). Frozen Flame and potion prices: not found. Potion expiry notifications exist
(August 2026, OBSERVED).

### Hints, solutions and Boots (how help interacts with reward)

- Viewing the instructor solution **before** completing a lesson forfeits all that lesson's XP,
  unless a Seer Stone is spent. Viewing it **after** completion is free and encouraged ("there's
  something to learn from the differences"). Needing solutions more than once per chapter is
  flagged as a sign to slow down. OBSERVED,
  https://www.boot.dev/lessons/6b3ce0b8-b323-4685-bf50-48cfd1c9959d
- A search snippet said "a seer stone (10 gems) or 75% of the lesson's XP". The 75% figure was not
  on any page I fetched; the lesson page says all XP. REPORTED, unverified.
- A warning before XP loss on solution viewing was added in March 2024. OBSERVED,
  https://www.boot.dev/blog/news/bootdev-beat-2024-03
- Boots: "Contacting him requires an offering of Baked Salmon or he will reduce the amount of XP you
  will be awarded on that specific assignment by 50%." OBSERVED,
  https://www.boot.dev/blog/wiki/boots
- Boots is a paid-membership feature ("Personalized help from Boots if you're stuck") and
  instructor solutions are paid too. OBSERVED, https://www.boot.dev/pricing
- Boots also runs "interview" lessons: an open question and a back-and-forth "until he's satisfied".
  OBSERVED, https://www.boot.dev/blog/news/bootdev-beat-2025-09/

Net effect: help is never blocked, only priced, and the price is paid in XP or in an earned item.
Help after success is free.

### Quests

- June 2023: weekly quests existed; daily quests were added as "smaller, more bite-sized tasks";
  dailies earned XP that fed the weekly quest, weeklies earned gems. OBSERVED,
  https://www.boot.dev/blog/news/bootdev-beat-2023-06/
- May 2024: daily quests reward chests, not XP or gems. OBSERVED, .../bootdev-beat-2024-05/
- Quests and potions are shown "front-and-center" on the dashboard "for session planning" (May
  2025). OBSERVED, https://www.boot.dev/blog/news/bootdev-beat-2025-05
- A snippet said a daily quest means earning a set amount of XP in 24 hours. REPORTED.
- Note: a search result about "a weekly seal goal ... 60 gems" came from an unrelated GitHub
  project, not Boot.dev, and is excluded.

### Achievements

- Boss-fight achievements changed from competitive to "based on the total number of bosses you've
  helped to defeat" (April 2024). OBSERVED, .../bootdev-beat-2024-04
- The achievement modal was reworked to show the full list, not just the next target (July 2025).
  OBSERVED, https://www.boot.dev/blog/news/bootdev-beat-2025-07/
- Achievements no longer give XP or gems (May 2024). OBSERVED.

### Leaderboards and leagues

- Leagues (June 2025): at level 10 "you'll join a new league for the next 4 weeks. Your league only
  has 25 learners in it", so you compete with peers "and not just the top 10% of the platform".
  OBSERVED, https://www.boot.dev/blog/news/bootdev-beat-2025-05 (and July 2025 follow-up).
- Placing first, second or third when a league ends gives a permanent profile badge (December
  2025). OBSERVED, https://www.boot.dev/blog/news/bootdev-beat-2025-12
- **No promotion or demotion tiers** were found; Boot.dev leagues appear to be fresh peer cohorts
  rather than Duolingo-style divisions. INFERRED from absence.
- A global leaderboard with a live feed of lesson completions remains (April 2024, Dec 2025).
  OBSERVED. A public GitHub-style activity heatmap is on profiles (April 2024). OBSERVED.

### Boss fights and guilds

- Community-wide events "every 4-8 weeks"; "bosses are defeated as the community gains XP", with a
  static XP bonus as the event goes on. OBSERVED, .../bootdev-beat-2024-04
- Example: the September 2024 boss needed 90,000,000 community XP and got 88,297,514, so it
  survived. OBSERVED, .../bootdev-beat-2024-10/ . An aura XP boost reached 2x during the October
  2024 fight. OBSERVED, .../bootdev-beat-2024-11
- August 2026 rework: rewards now come from "your own personal reward thresholds, so you earn loot
  and achievements based only on your own effort"; the shared timing, duration and global XP
  multiplier stay; guild participation adds a bonus Mythic chest. OBSERVED,
  https://www.boot.dev/blog/news/bootdev-beat-2026-08

### Karma and community

- Discord karma: "Removed karma rewards for simply posting" and "Added a significant karma reward
  for helping others" (July 2024). OBSERVED, .../bootdev-beat-2024-07
- Karma counts toward "fellowship achievements". OBSERVED,
  https://www.boot.dev/lessons/0f4fa755-1ce7-468b-bf34-c1460e97bf28
- A "share" button links helpers to your current code. OBSERVED, same lesson.

### Training Grounds

- "Infinite" AI-generated challenges: the generator weighs completed courses, recent topics, what
  you struggled with and spaced repetition, then picks topic, difficulty and type (write code, fix
  bugs, practise interviews); the challenge is generated (GPT-5 / Claude Sonnet 4 at time of
  writing), run on the backend to confirm a valid solution, and takes "about 45 seconds". You can
  skip with a reason. OBSERVED, https://www.boot.dev/blog/news/training-grounds-launch
- Bookmarking lessons makes their topics more likely; free users get 25 challenges, paid
  unlimited. OBSERVED, https://www.boot.dev/lessons/c6956acb-a130-4aef-9907-c4a5eb601f36
- Over 21,000 challenges generated by September 2025; search of existing ones added later.
  OBSERVED, .../bootdev-beat-2025-09/ and .../bootdev-beat-2025-10

### Paywall

- Free users can "demo the first few chapters of each course with full interactivity"; after that,
  "free mode" or read-only: no completing lessons, quizzes or interactive parts. OBSERVED,
  https://www.boot.dev/pricing (shown to me as AU$379/year, regional pricing).
- Reported prices vary: "$59 a month, or $399 a year" (CodingPhase, REPORTED,
  https://codingphase.com/blog/is-boot-dev-worth-it ); "roughly $40/month" (Coddy, REPORTED,
  https://coddy.tech/vs/boot-dev ). Not reconciled.

## What works and what backfires

What learners and reviewers say works:

- "The gamified mechanics are not only charming and fun, but also give incentives to keep
  studying." Trustpilot, Sep 2026. REPORTED, https://ca.trustpilot.com/review/www.boot.dev
- "gameification really works for my ADHD"; Archmage gives "the satisfaction of having made it all
  the way". Trustpilot, Aug–Sep 2026. REPORTED, same URL.
- Boots praised for explaining without handing over answers. REPORTED (Trustpilot summary).
- A reviewer with "300-plus hours on the platform". REPORTED, CodingPhase.

What backfires or draws criticism:

- Farming: Boot.dev itself removed rewards from achievements, role-ups and quests, nerfed gem drops,
  raised Seer Stone prices and nerfed Training Grounds quiz XP because they were being gamed.
  OBSERVED (patch notes above). This is the strongest evidence available, because it is the
  operator's own admission.
- Competition favours veterans: leagues were introduced because the global board was dominated by
  the top performers. OBSERVED (May 2025 post). Boss-fight achievements were made non-competitive
  for similar reasons. OBSERVED.
- Streak rigidity: embers were introduced so learners could miss weekends without buying
  protection. OBSERVED.
- "Twelve months is a long time to stay motivated by XP." REPORTED, CodingPhase.
- "interface is cluttered, distracting, and SUPER SLOW." Trustpilot, Aug 2026. REPORTED.
  "Gamification won't suit everyone" as some find it distracting. REPORTED, Coddy.
- Paywall: interactivity stops after the first chapters; reviewers note certificates carry little
  weight with employers. REPORTED, CodingPhase. I found no direct complaints that gems or items are
  pay-to-win, consistent with gems not being sold.
- Addictiveness: one search summary quoted Boot.dev's marketing as "addictive"; I could not open a
  page confirming the wording. REPORTED, unverified.

## Duolingo and Brilliant additions

Duolingo (official help pages render empty without JavaScript, so these are from third-party
guides; all REPORTED):

- Ten leagues, Bronze to Diamond, about 30 learners each, weekly reset Sunday night/Monday;
  promotion zones narrow by tier (top 20 in Bronze to top 5 in Obsidian, none in Diamond); 24th or
  lower is demoted; no double promotion. https://duoplanet.com/duolingo-leagues-the-essential-guide-everything-you-need-to-know/ ,
  https://duolingo.deconstructoroffun.com/mechanics/leagues . The latter's headline claim of "+25%
  lesson completion" has no cited source.
- The duoplanet author warns that XP does not track proficiency and competition causes "pressure and
  burn-out". REPORTED, duoplanet leagues guide.
- Streak Freeze: 200 gems, two equipped at once (five for Streak Society), consumed automatically,
  no expiry. https://duoplanet.com/duolingo-streak-freeze/
- XP Boosts double XP for 15–30 minutes. Daily Quests: three a day unlocking bronze, silver and gold
  chests (a few gems, ~10, ~15 gems or a 15-minute boost), a bonus chest for all three; monthly
  challenge badge for 25–50 quests. Gems can be bought with money. Search snippets via
  https://cherishstudy.com/duolingo-daily-quests/ and https://duolingoguides.com/what-is-a-quest-in-duolingo/ ,
  not fetched.

Brilliant (official help pages, OBSERVED):

- XP comes from lessons and problems and "corresponds to the time and effort required"; "Repeating
  the same lesson on the same day does not earn additional XP", but redoing it on a later day can.
  https://brilliant.org/help/using-brilliant/what-is-xp/
- Leagues of 30, ten tiers named after elements (Hydrogen to Einsteinium), weekly from Monday 03:00
  UTC, advance, drop or stay by rank. https://brilliant.org/help/using-brilliant/what-are-leagues-and-leaderboards/
- Streak: three problems or a lesson a day. Streak Charges are earned by completing lessons or
  practice, at most two held, applied automatically on a missed day, never expire.
  https://brilliant.org/help/using-brilliant/what-is-a-streak-charge/ . Brilliant thus earns its
  streak protection rather than selling it, like Boot.dev's embers.

## Implications for Discere

Discere's constraint: XP and rewards are motivation only; they never create evidence of mastery,
and every hint, reveal or tutor turn is recorded as assistance on the attempt.

Transfers well:

1. **Price help, never block it, and record it.** Boot.dev's rule (solution before success costs the
   lesson's reward; after success it is free) maps cleanly: a reveal before a correct attempt
   reduces XP and is logged as assistance; reviewing a worked solution after success is free and
   logged as review. The XP penalty is cosmetic; the assistance record is what assessment reads.
2. **Run v submit.** A free "check" that is not an attempt, and a scored submit, keeps evidence
   clean and lowers anxiety.
3. **Difficulty-weighted XP** and no XP for same-day repeats (Brilliant), so grinding easy items
   does not pay.
4. **Earned streak protection** (embers, Brilliant charges), capped at two, and a weekly target of
   about five days rather than seven. No purchasable freezes.
5. **Timed boost as study timer.** A potion-style one-hour session marker can frame a pomodoro;
   if it scales XP it must never touch evidence.
6. **Spaced-repetition practice generation** (Training Grounds) fits Discere's review scheduler; the
   validation step (run the generated item, confirm a correct solution) is worth copying.
7. **Spree with armour** as a small, local accuracy reward, provided it rewards first-try
   correctness without discouraging honest attempts.
8. **Personal thresholds over competition**, as in Boot.dev's 2026 boss rework: rewards tied to
   your own effort.

Does not transfer:

1. **Gems, a shop and paid currency.** With one learner and no business model, a currency adds
   bookkeeping without a decision worth making. If chests exist at all, their contents should be
   cosmetic or the earned items above.
2. **Leagues and leaderboards.** With a single learner there is nobody to rank against; a
   "league" against past weeks of oneself is the only honest version.
3. **Boss fights, guilds and karma**, which depend on a crowd.
4. **Random loot as the main reward.** Variable rewards drive engagement but Boot.dev spent two
   years nerfing what people farmed; Discere should not create the incentive in the first place.
5. **Physical tokens and roles** are harmless but optional; level milestones can stand alone.

## Sources

All accessed 2026-10-06.

Boot.dev (OBSERVED unless noted):
- https://www.boot.dev/faq (no gamification details found)
- https://www.boot.dev/pricing
- https://www.boot.dev/blog/wiki/boots
- https://www.boot.dev/blog/news/bootdev-beat-2023-05
- https://www.boot.dev/blog/news/bootdev-beat-2023-06/
- https://www.boot.dev/blog/news/bootdev-beat-2024-03
- https://www.boot.dev/blog/news/bootdev-beat-2024-04
- https://www.boot.dev/blog/news/bootdev-beat-2024-05/
- https://www.boot.dev/blog/news/bootdev-beat-2024-07
- https://www.boot.dev/blog/news/bootdev-beat-2024-10/
- https://www.boot.dev/blog/news/bootdev-beat-2024-11
- https://www.boot.dev/blog/news/bootdev-beat-2024-12/
- https://www.boot.dev/blog/news/bootdev-beat-2025-01
- https://www.boot.dev/blog/news/bootdev-beat-2025-05
- https://www.boot.dev/blog/news/bootdev-beat-2025-07/
- https://www.boot.dev/blog/news/bootdev-beat-2025-09/
- https://www.boot.dev/blog/news/bootdev-beat-2025-10
- https://www.boot.dev/blog/news/bootdev-beat-2025-12
- https://www.boot.dev/blog/news/bootdev-beat-2026-08
- https://www.boot.dev/blog/news/bootdev-beat-2026-09
- https://www.boot.dev/blog/news/training-grounds-launch
- https://www.boot.dev/lessons/6b3ce0b8-b323-4685-bf50-48cfd1c9959d (Solutions)
- https://www.boot.dev/lessons/142c8a73-5ede-49a6-9460-563890646023 (Lesson Failure)
- https://www.boot.dev/lessons/565dd496-0765-4e10-b074-85931fba340f (Experience Points exercise)
- https://www.boot.dev/lessons/0f4fa755-1ce7-468b-bf34-c1460e97bf28 (Community)
- https://www.boot.dev/lessons/c6956acb-a130-4aef-9907-c4a5eb601f36 (Training Grounds)
- https://www.boot.dev/lessons/4777c0b2-30fa-48fe-82bf-c9b84e74d92f (Archmage)
- https://www.boot.dev/blog/news/refer-a-friend (REPORTED via snippet, not fetched)
- https://www.boot.dev/blog/misc/educations-shameful-state-of-the-art (REPORTED via snippet)

Third party:
- https://www.devopschat.co/articles/how-the-bootdev-game-works (REPORTED, older)
- https://codingphase.com/blog/is-boot-dev-worth-it (REPORTED)
- https://coddy.tech/vs/boot-dev (REPORTED)
- https://ca.trustpilot.com/review/www.boot.dev (REPORTED)
- https://www.classcentral.com/report/review-boot-dev/ (403, not read)
- https://medium.com/@3R1Dev/diving-in-backend-development-with-boot-dev-c662662e1165 (403, not read)
- https://www.tristan-davis.com/about/bootdev_archmage.html (certificate error, not read)
- Reddit r/learnprogramming, r/bootdotdev: not reachable with the tools available.

Duolingo and Brilliant:
- https://duoplanet.com/duolingo-leagues-the-essential-guide-everything-you-need-to-know/ (REPORTED)
- https://duoplanet.com/duolingo-streak-freeze/ (REPORTED)
- https://duolingo.deconstructoroffun.com/mechanics/leagues (REPORTED)
- https://www.duolingo.com/help/leaderboards-and-league (fetched, rendered empty)
- https://brilliant.org/help/using-brilliant/what-is-xp/ (OBSERVED)
- https://brilliant.org/help/using-brilliant/what-are-leagues-and-leaderboards/ (OBSERVED)
- https://brilliant.org/help/using-brilliant/what-is-a-streak-charge/ (OBSERVED)
