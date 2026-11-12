# Review of Discere, November 2026

A read-only review of the teaching, the marking and review machinery, the web client and the
server, made on 10 November 2026 at commit `69d2729` on `fix/teaching-quality`. Nothing was
built or run, so performance findings are from reading the code and need timing. The web
findings were not confirmed in a browser.

Coverage: 20 lessons read in full across 11 courses with every numeric answer recomputed,
counts over all 9,621 questions and 2,230 cards in 66 bundles, the marking functions run on
copies against real questions, and the server, packages and client read file by file. Items
marked "checked" were confirmed a second time against the code.

## Summary

The accuracy is good: no arithmetic error turned up in the lessons read, and the facts
checked against sources held. The weaknesses are in what gets asked and what the app
concludes from the answers.

1. Progress numbers overstate learning. A lesson and a course can be finished with every
   answer wrong, guessing through the options ends as independent credit, and missed
   questions never come back.
2. Questions fit the marker more than the subject. Over half are numeric, including date
   subtraction in history and word counts in writing courses, and short-text items are
   one-word recall marked by containment.
3. The local API trusts every caller, and an update migrates the only copy of learner data
   with no backup.
4. The client has four separate question implementations and five layers of stylesheet, so
   the same control behaves differently in lessons, review and course checks.

## Teaching and content

### What the questions ask

- Numeric questions in subjects where number is not the skill. History has 41, about 34 of
  them date subtraction or day counting ("How many days are there from 28 June to 4 August
  1914?"). Philosophy's consequentialism lesson spends 5 of 12 screens on expected-value
  sums. First aid's CPR lesson tests "how many seconds do 30 compressions take" and its end
  check asks nothing about hand position or when to start. Writing, debate, drawing,
  psychology and product design have the same pattern (42 to 79 numeric items each).
- Short text is term recall. 896 of 941 short-text questions accept one idea of two words or
  fewer, and 70 carry a hint of the form "It begins with con-". Short text works well where
  the answer is derived (predict the output order, name the interval), and those items lack
  feedback for the predictable wrong answers.
- Multiple choice is often guessable. The correct option is the longest in 44.6% of items
  against about 30% by chance, and 60% in history. Many distractors are throwaway ("purple,
  because both apply", "Higher temperature", "A longer prompt"). Options are shown in authored
  order with no shuffle. Good models exist in the bank: `phys-falling-and-rising-3`,
  `sysd-...-predict-fan-out`, `phil-justified-true-belief-1`.
- One calculation repeated. System-design tails, the agent loop and evaluating agents all
  drill pⁿ or 1 − (1 − p)ⁿ (5, 5 and 8 items). Quorums drill R = N − W + 1 five times. The
  design decision the number informs gets one item or none.
- Software courses never ask for code. The 46 expansion courses hold 8 code questions. The
  web course has 184 questions and none is code; TypeScript is 114 multiple choice of 160.

Fixes: let a course have no numeric questions; write classification, ordering, "which
evidence weakens this" and two-source items for humanities; keep short text for derived
answers; write each distractor from a named misconception and match option length; cap one
calculation shape at two items a lesson; add one write-or-fix item per lesson in software
courses, marked by exact output if nothing else.

### Lesson design

- Faded examples do not fade. 492 of 534 have one blank and it is the last step.
- Transfer is usually the previous problem with new numbers. Real transfers exist (the
  stacked box in physics, the mice after a fire in biology) and show what is wanted.
- The end check does not match the lesson's promise. Friction promises "predict whether a
  given push will move it" and never tests it. The latency lesson argues against the mean and
  then asks for the mean. 220 of 837 lessons use one question type for all three items.
- Humanities lessons describe sources and never show one. History has no extract anywhere;
  the lesson on the Res Gestae and Tacitus quotes neither. Music theory has no sound.
- Some lessons carry too much: `which-rule-wins` (five ideas), `consistency-and-quorums`
  (five ideas).
- Hints are templated. "Write each quantity with its unit, then combine them in the order the
  question describes." appears 109 times, twice in one ladder in mechatronics. The last
  numeric hint is usually the bare sum. 45.5% of questions have fewer than three hints.
- Difficulty is flat: 2,885 of 2,931 questions in the original courses are tagged exactly 1,
  and nothing reaches 3.
- The concept graph is a straight chain in the original courses and has no edges at all in
  the 46 expansion courses, so nothing can use it for scheduling or recommendations.

Fixes: blank the decision step or two steps in a faded example; require a transfer to change
context or direction and lint for a shared template; map each promise clause to an end
question; add a quote block (a 40 to 80 word extract, then "what is this evidence of") and a
two-note player; delete filler hints and let a ladder be two long.

### Scope against the titles

- Biology has no transcription, translation or codons, yet teaches mutation and inheritance.
  No homeostasis or immune system.
- Machine learning has no logistic regression, cross-entropy or softmax, yet teaches
  thresholds and ROC. Nothing on unsupervised learning or embeddings.
- Calculus is polynomials only: no product or quotient rule, no exponential, log or trig, no
  optimisation. Physics: Motion and Forces is one-dimensional: no vectors, projectiles,
  inclines or circular motion.

Add the two missing lessons to biology and machine learning, and state the limits of
calculus and physics in their descriptions.

### Errors found

1. History, `dates-eras-and-periods`: 1453 given as an end of the ancient world. It is a
   conventional end of the Middle Ages.
2. History, `one-war-many-causes`: Britain's declaration of war classed as a cause of the
   war. `...-skill-days` and `...-thirty-seven` are the same question.
3. Calculus, `from-secant-to-tangent`: the tangent "does not cut through it nearby" is false
   at an inflection.
4. Biology, `water-across-a-membrane`: a card uses "water potential", which is never taught.
5. Philosophy, `justified-true-belief`: the recap says Gettier cases show the conditions are
   "necessary but not sufficient"; they show only the second. The claim about most people's
   verdict on the barn case is doubtful.
6. Philosophy, `consequentialism`: Foot's case is given as the bystander with a lever, which
   is Thomson's version.
7. System design, `consistency-and-quorums`: "A quorum of any size does not give a consistent
   read" reads as a false universal. The R + W > N claim needs "for strict quorums".
8. AI agents, `the-agent-loop`: billing for "the whole input of every call" ignores prompt
   caching. `twenty-steps` repeats a step.
9. Web, `which-rule-wins`: the cascade omits `@layer`.
10. Physics, `phys-friction-and-motion-3`: feedback mentions a static coefficient the prompt
    never gives.
11. Tolerances: 8 questions accept their own misconception value (for example
    `sysd-availability-and-redundancy-shared-power`, 99.94 ± 0.011 accepts 99.95). 17 ask
    for "n decimal places" and mark at 1e-9, so 0.8047 is wrong for 0.805.

## Marking, mastery and review

### Credit (checked)

- `POST /api/attempts` reuses the open attempt and `saveAttempt` overwrites its response
  (`apps/server/src/routes.ts:1015`, `db/store.ts:976`). `scoreAttempt` sets `independent`
  from mode, hints and reveal only (`packages/progression-engine/src/scoring.ts:38`). Four
  clicks on a four-option question record one correct, independent attempt at full XP.
- Independence is per attempt row. After two misses the worked answer opens; reopening the
  step and typing it earns full independent credit on a fresh row. Changing mode resets the
  hint count. The miss limit is client state, so a reload gives unlimited tries.
- A stage completes when each question is correct or revealed (`store.ts:366`), and reveal
  is automatic after the last miss. A lesson and a course can be finished with every answer
  wrong, and that pays completion XP, the streak and the progress ring.
- Missed questions never return. The API sends `reviewRequired` and nothing reads it. Review
  holds only the 2 or 3 authored cards per lesson.
- Concept mastery rises on a first correct answer and never falls, decays or feeds anything.
  A correct answer with hints can lower it while a wrong one cannot.
- In Exam mode a missed check question cannot be revealed and the stage cannot complete, so
  the lesson dead-ends (`routes.ts:492`, `routes.ts:1107`).

Fixes: make attempts append-only with a first response and a try count; derive independence
per question; enforce the miss limit on the server; queue a missed or revealed question as a
review card due the next day (`createFlashcardFromReviewedQuestion` already exists, unused);
add a delayed three-item check one to three days later and call a lesson "secure" only after
it; accept a closed Exam miss as stage evidence.

### Text marking

`assessTextAnswer` (`packages/assessment-engine/src/text.ts`) checks that the accepted phrase
appears in the answer. 934 of 941 questions have one accepted idea, so the 60% rule rarely
applies.

- Accepted when wrong: listing every candidate passes on 96% of questions ("recessive or
  dominant" for "dominant"). Pasting the prompt back passes on 10.5% of questions and 9.9% of
  typed cards. "I don't think it's the troposphere" passes.
- Rejected when right: "tracing" for "trace", "dominance" for "dominant", "Greece" for
  "Greek", any typo, "skim" for "survey".
- Symbols are stripped, so `?? two.txt` accepts `two.txt` and `M two.txt`. Case is ignored
  for program output.
- 26 example answers are rejected by their own marking.
- Multiple choice is marked by sending the label through the same matcher. Every question
  has exactly one accepted option today, and nothing enforces it.

Fixes: mark choices by id; add a small stemmer and edit distance 1 for longer words; reject
an answer that also names a sibling term; refuse an accepted idea that is empty after
normalising, a stop word or present in the prompt; mark code output by exact string; add an
"I was right" appeal that records the response for authoring.

### Numeric marking

Authored tolerances are careful and every question accepts its own answer. The parser is
strict: `1,000`, `1.92 × 10^-14`, `$24` and `45°` are unreadable; `2 h` for hours, `20 C`
for °C and `83%` for 0.83 are unit mismatches, and a mismatch counts as a miss. Units are
lower-cased, so `5 mW` is accepted for `MW`.

### Review scheduling

- Assisted recall is capped at Hard, and Hard in the learning phase repeats the step. A
  learner who flips typed cards without typing keeps them due every few minutes for good.
  (Simulated with the repo's FSRS library by the reviewer; the cap is at
  `packages/progression-engine/src/review.ts:146`.)
- A typed miss forces a lapse whatever the learner then rates, with no appeal. 106 typed
  cards have a back that does not contain the expected term.
- Card text is copied into the database once and never refreshed (`store.ts:592`, checked).
  The 1,406 corrections do not reach cards a learner already has, and a card can show the old
  front while being marked against the new answer.
- Cards are rated seconds after the lesson, and that counts as the first review.
- No daily cap and no ordering by overdue-ness; fuzz is off, so a lesson's cards return
  together for good.

### Course checks

Placement, checkpoint and delayed-transfer sets exist in 18 of 65 courses. Placement marks a
lesson known from one item. A checkpoint lists weak lessons and schedules nothing, and cannot
be retaken. The per-question transfer task exists on 1 question of 9,621.

### Modes and rewards

- Assisted gives the same hints as Coach. Direct has no pause in the lesson player and only
  halves XP. Exam's weight is clamped away. Two modes would do: normal and no help.
- The written-reason reveal flow is mounted only in the legacy quiz and the projects. The
  lesson player reveals at no cost.
- Hints unlock only after a wrong submission, so a stuck learner must post a guess.
- The league pays about 20 XP for a new question and 3 to 8 for a review, and drops a league
  for each idle week. A learner who only reviews is demoted.
- Timed XP boosts reward packing new answers into 30 minutes, against spacing. The combo and
  the Spree upgrade make a hard question costly, and break on marking artefacts.
- `celebrateAnswer` ignores the celebrations preference. A wrong answer shakes the question
  and plays a falling tone. Combo banners float over the explanation.
- What is sound: wrong answers earn nothing, help costs XP, chests are deterministic, no
  currency or shop, and a day counts on effort.

## Web client

- No error boundary anywhere. One bad diagram spec blanks the app.
- Keyboard users lose focus on every answer and every screen: the Check button unmounts, the
  Continue button mounts elsewhere, and nothing focuses the new screen. `document.title` is
  never set. Course checks do this properly.
- Going back in a lesson shows the question blank, and by reading, draws the disabled Check
  and the Continue buttons in the same grid cell. After a reload an answered screen must be
  answered again. Once in the skills check there is no way back to the teaching screens.
- Four question implementations (lesson, legacy quiz, review card, course check) differ in
  labels, verdict wording, whether Enter submits, whether drafts survive and whether maths
  renders. Course-check prompts print `$maths$` raw.
- CSS: 40 stylesheets, 609 KB, built as one render-blocking 496 KB file. 1,551 hex colours
  outside tokens, 93 distinct font sizes, 19 font weights, 16 breakpoints, 156 selectors
  declared in more than one sheet with 94 conflicting. Token values are redefined in five
  layers by load order. `font: 600 18px Inter` survives in four diagram sheets and Inter is
  not loaded.
- Light theme: accent text is 4.16:1 on the page background, correct green 3.51:1, gold
  2.22:1. `inference.css` and `review.css` get no light version. In dark, the choice card's
  border is 1.56:1 against its fill.
- Copy rules broken: the splash slogan "Learn something real today"; the three explainer
  cards and the headline with subhead on Home; uppercase kicker lines above the lesson lead
  ("STEP 1 OF 4 · …"), the unit name on the roadmap, and Settings headings; "Courses" in the
  tab against "Learning paths" on the page.
- At 390px: diagram labels scale to 6 to 8px; the explanation sits in a 220px scrolling
  footer; term notes run off the edge; the Home course switcher is 65 unlabelled icons.
- Performance: a 406 KB chunk with every subject's diagrams loads with every lesson; each
  formula paints as raw LaTeX before KaTeX swaps in; a WebGL shader runs at 30 fps behind
  every lesson; the splash holds the app 2.4 to 4.5 s on every launch.
- Lesson sources are in the contract and nothing renders them. The notebook route is linked
  from nowhere. There is no empty-library state and no first-run choice of subject.
- The SQL, Python and Rust project screens are one screen written three times (1,902 lines).

## Server and architecture

- No authentication and no Host or Origin check on 81 routes. `apps/server/src/index.ts`,
  which the launcher runs, takes `HOST` from the environment with no loopback guard
  (checked); the guard is in `web-server.ts`, which the launcher does not run. A web page
  that rebinds DNS to the port reaches the whole API, including code execution, tutor spend
  and illustrations (a shell-capable Codex run with learner text in the prompt). The phone
  plan's Tailscale route would expose all of it to the tailnet.
- Migrations run at start with no snapshot (`db/migrations.ts:43`, checked). A rolled-back
  version starts on a newer schema with no warning. Backup exists only as a dev script.
- `GET /api/home`, `/api/review` and `/api/study` upsert all 2,230 cards and run up to
  9,621 selects per request, with statements prepared again each call.
- Every start validates all 45 MB of bundles through the full authoring gate, and one byte
  of drift in one course stops the service.
- Saved progress has no guard against content id changes. An orphaned stage row keeps a
  lesson unfinished on Home. The scripts that check this are manual.
- The `svg_figure` check reads only quoted attributes (`packages/contracts/src/svg-figure.ts`,
  checked), so `onload=alert(1)` unquoted would pass. No current drawing does this. The
  server sends no Content-Security-Policy of its own.
- Learner payloads are built by removing answer fields, so a new answer field leaks by
  default.
- CI installs without a frozen lockfile, runs Node 24 against a Node 22 release, and never
  runs the 30 Playwright specs. The release workflow runs no tests.
  `scripts/prune-stale-assertions.cjs` deletes failing assertions. Per-course tests cover 19
  courses.
- The release zip ships `.authoring/` (11 MB) and `review/history` (57 MB of old bundles).
  The repository tracks 480 MB of screenshots and video; `.git` is 515 MB.
- This branch says 1.9.4 and `origin/main` says 1.12.0, because release bumps never merge
  back.
- No shutdown handler in `index.ts`; provider processes outlive a killed server; an essay
  assessment left `pending` stays pending for good.
- Unused: `drizzle-orm` and its schema file, the legacy step branch, four activity types and
  their route, `apps/mcp/`, two of three authoring pipelines, 22 one-off `prepare-*.ts`
  scripts, 1,644 questions referenced by no lesson.

### Docs that contradict the code

- `README.md`: version 1.2.0, 20 courses, sound off by default, one tutor job at a time.
- `AGENTS.md`: no model API calls (an OpenAI-compatible provider exists), a green design
  system, `apps/mcp`.
- `docs/phone-plan.md`: says the service refuses non-loopback hosts.
- `content/README.md` and `docs/architecture.md` describe the August shapes.
- The workspace `CLAUDE.md` says the tutor runs on Codex; ADR 0007 says Claude Code.
- `docs/next-session-plan.md`, `rebuild-execution-playbook.md`, the v0.1 and v0.2 specs and
  the August validation results can be archived.

## Suggested order

1. Safety of data and access: a Host and Origin check with a loopback guard in `index.ts`, a
   database snapshot before migrations, and refreshing review card text. All three are small.
2. Honest credit: append-only attempts, per-question independence, a server miss limit, the
   Exam dead end, missed questions into review.
3. Validators that stop new damage: one accepted option per choice, no misconception value
   inside a tolerance, rounding tolerance matching the prompt, no accepted idea in the
   prompt, unique-longest correct option, a faded example with only its last step blank.
4. One question component for lessons, review and checks, with focus handling and an error
   boundary. This is also where the phone pass starts.
5. A content pass by question type: replace numeric filler in humanities and writing
   courses, rework one-word recall, add source extracts and code items. Fix the listed
   errors and the two scope gaps on the way.
6. A delayed check per lesson and course checks for the other 47 courses.
7. Cleanup: CSS tokens and layers, dead code, the release allow-list, CI, stale docs.

The Atlas items are in `docs/atlas-comparison-2026-11.md`. Its item 2 (more question types)
belongs with steps 4 and 5 here, and its item 5 (missed questions in review) is step 2.
