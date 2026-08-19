# Discere → Personal Brilliant — Sequential Execution Playbook

> **For the executing session:** you are a single session executing this plan alone, in order, phase by phase. Do not parallelize with subagents. Do not skip gates. Every instruction here was derived from verified exploration of the actual code — file paths and line references were correct as of 2026-08-19. If a line number has drifted, search for the quoted identifier instead. When this playbook says "verify X", actually run the command and read the output; do not assume.
>
> On approval, the orchestrating session will save this document to `Discere/docs/rebuild-execution-playbook.md` — read it from there.

---

## 0. Context — why this work exists

Discere (`/workspace/dev_projects_master/_PersonalProjects/Instrumenta/Discere`, pnpm monorepo) is the owner's personal AI learning platform, launched from the Instrumenta Electron hub via a WSL bridge (server on port 49323, single origin, SPA served from `apps/web/dist` via `DISCERE_WEB_ROOT`). The owner used it once and rejected it: **no intro screen, no course catalogue presence, no animations, static prose lessons, and the tutor "didn't work at all."** They want their own Brilliant.org: animated step-based lessons, rich catalogue, gamification, powered by their OpenAI subscription through the local codex CLI, with an eventual course library covering "everything Brilliant and Khan Academy have conceptually."

**Verified forensics (do not re-derive; these are facts):**

1. **Tutor root cause.** `codex exec resume` (CLI 0.147.0) rejects `-C` and `--color` (`error: unexpected argument '-C' found`). `packages/tutor-providers/src/codex.ts` `buildArguments` (~line 394-416) puts both flags in a `shared` array used by new-session AND resume branches. Result: the first ask works (a successful 7.1s rollout exists from the owner's session at `~/.codex/sessions/2026/08/19/rollout-2026-08-19T18-46-33-*.jsonl`), **every follow-up dies with exit 2** → `PROVIDER_EXITED` → HTTP 502 → generic "The tutor provider failed and produced no reply." The test fixture `packages/tutor-providers/tests/fixtures/fake-codex.mjs` accepts any argv, so tests never caught it.
2. **No status surface.** `GET /api/health` (`apps/server/src/routes.ts:123-128`) reports only `{status, service, version: "0.1.0" (hardcoded), courses}`. No settings route exists in `apps/web/src/routes.tsx`. Provider stderr diagnostics are attached to error objects but never logged and never shown (`apps/server/src/app.ts:66-81` logs only unknown errors).
3. **Queue hazard.** The codex provider serializes ALL generations (ask/essay/workings) through a module-level promise chain (`codex.ts:46-55`), unbounded, and the timeout timer starts only after dequeue — a second request during a 120s job waits forever with only a spinner.
4. **Codex waste.** Scratch dir defaults to `<repo>/data/codex-scratch` → codex ingests the repo's `AGENTS.md` (~20k input tokens per ask) and boots 4 MCP servers from the owner's `~/.codex/config.toml` on every exec.
5. **Quota.** Owner's OpenAI plan is `prolite`. Weekly window was **93% used, 0 credits** on 2026-08-19; window resets at epoch **1787201789** (~2026-08-20 14:56 AEST) and weekly thereafter. Codex spend must be metered; content generation is Phase 5 only.
6. **Schema landmine.** `z.toJSONSchema` on any Zod union emits `oneOf`, which OpenAI constrained decoding **rejects** (`invalid_json_schema` — this already broke the authoring path once). Every schema passed to codex via `--output-schema` must be union-free AND optional-free (flat objects, both halves present, unused half empty — see `AnswerAuthority` handling in `packages/contracts/src/authoring.ts`).
7. **Writing gate bypass hazard.** `bundleFields`/`draftFields` in `scripts/author.ts` (~lines 108, 216) enumerate every learner-facing string for the lint/answer-leak gate. Any new prose field NOT added there silently bypasses the gate.
8. **Progress-id stability.** `journey_progress` rows are keyed `(user_id, journey_id, stage_id)`; `saveStageProgress` (`apps/server/src/db/store.ts:~304`) rejects stage ids not in the current `stageOrder`. Stage ids are derived strings (`${lesson.id}:explainer`, `:quiz-1`, …) — changing the derivation orphans existing progress. Keep ids stable; store per-step position in the schemaless `interaction_state` JSON blob.
9. **CSP.** The hub enforces `script-src 'self'`; `scripts/check-csp.mjs` runs inside `pnpm build` and fails on CDN/remote anything. Bundled npm packages are fine. Web fonts must be vendored same-origin (KaTeX woff2 files in `dist/assets` are the working example — Inter is named in tokens but never actually shipped today).
10. **Design seed documents exist and were never implemented.** `docs/learning-experience-redesign-draft.md` defines the evidence-based **Beats A–G** lesson architecture, product principles, and required surfaces. `docs/ui-ux/interactive-story-v1-spec.md` §11 sketches step/RichLearningText contracts. Treat these as the product spec; do not invent a competing one.

---

## 1. Session setup (do this first, every session)

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"
export CI=true
cd /workspace/dev_projects_master/_PersonalProjects/Instrumenta/Discere
git status --short   # expect clean, branch main
```

**Chromium libs for Playwright** (this WSL box lacks libnspr4/libnss3/libasound2t64; sudo needs a password). Re-extract without sudo if `$LIBDIR` below is missing:

```bash
LIBROOT=/tmp/discere-browser-libs
if [ ! -d "$LIBROOT/usr/lib/x86_64-linux-gnu" ]; then
  mkdir -p "$LIBROOT/debs" && cd "$LIBROOT/debs" \
  && apt-get download libnspr4 libnss3 libasound2t64 \
  && for d in *.deb; do dpkg -x "$d" "$LIBROOT"; done
  cd - >/dev/null
fi
export LD_LIBRARY_PATH="$LIBROOT/usr/lib/x86_64-linux-gnu"
```

Playwright/e2e commands need `LD_LIBRARY_PATH` set. (Permanent fix the owner can run: `sudo apt-get install -y libnspr4 libnss3 libasound2t64`.)

**Branch/merge discipline:** one branch per phase off `main` (`phase-1/tutor-repair`, `phase-2/platform-shell`, …). Merge to `main` only when the phase gate passes. Commit messages: explain the why; no phase numbers in messages.

**Test env rule:** all automated tests run with the mock provider (`DISCERE_TUTOR_PROVIDER=mock` — the Playwright config already sets this). Live codex calls only where a phase explicitly budget them.

**The verification loop you will run constantly:**

```bash
pnpm verify        # doctor → lint/typecheck/tests/content-validation → build (includes CSP check) → smoke
pnpm --filter @discere/web exec playwright test          # full e2e + screenshots (needs LD_LIBRARY_PATH)
```

Screenshots land in `docs/ui-ux/screenshots/` (19+ screens × 1440x900 and 390x844). After UI phases, **open and actually look at the PNGs** (Read tool renders them). Judge against the bar: "would this screen look at home on brilliant.org?" If no — fix before merging. Re-running rewrites the odd PNG with sub-pixel encoder noise; that alone is not a regression (documented in `docs/ui-ux/screenshots/README.md`).

---

## 2. Phase 1 — Tutor repair, hardening, status/onboarding

Goal: the tutor works across multiple turns, failures explain themselves, and a settings screen proves the OpenAI link is live.

### 2.1 Fix the resume bug

File: `packages/tutor-providers/src/codex.ts`, function `buildArguments` (~394-416).

Current shape: a `shared` array containing `--skip-git-repo-check`, `-C <scratch>`, model/effort `-c` flags, `--output-schema`, `-o`, `--json`, `--color never`, used by both branches; new-session adds `-s read-only`, resume adds `-c sandbox_mode="read-only"` and the session id.

Required change: build the two argv lists separately.
- **New session:** unchanged: `exec --skip-git-repo-check -C <scratch> [-m model] -c model_reasoning_effort="…" [--output-schema f] [--image=f…] -o <out> --json --color never -s read-only -`
- **Resume:** `exec resume --skip-git-repo-check [-m model] -c model_reasoning_effort="…" [--output-schema f] [--image=f…] -o <out> --json -c sandbox_mode="read-only" <uuid> -` — **no `-C`, no `--color`**.
- In `execute`/`spawnCodex` (~483-487), set `cwd: this.scratchDirectory` on the spawn options for BOTH branches (resume inherits cwd instead of `-C`; new-session keeps `-C` too, harmless).
- Keep the existing sessionId UUID validation (it guards flag injection — do not weaken it).

### 2.2 Regression tests with the real CLI contract

File: `packages/tutor-providers/tests/fixtures/fake-codex.mjs` — currently accepts any argv. Make it enforce verified 0.147.0 behavior: if argv starts `exec resume` and contains `-C`, `--cd`, `--color`, `-s`, or `--sandbox`, print `error: unexpected argument '<flag>' found` to stderr and exit 2.

File: `packages/tutor-providers/tests/codex.test.ts` — add:
1. A unit test snapshotting `buildArguments` output for both branches (export the function or test through the provider with a spy fake).
2. An integration test: ask (new session) → follow-up (resume) through the fixed fake; both succeed. This test MUST fail if you revert 2.1 — check that by temporarily reverting once.

### 2.3 Queue deadline + cap

File: `packages/tutor-providers/src/codex.ts` (~46-55, the `enqueue` chain).
- Start the deadline timer when the task is **enqueued** (wrap the queued promise in a timeout that rejects with `PROVIDER_TIMEOUT` if the job hasn't finished `timeoutMs` after enqueue).
- Cap queue depth at 3: reject immediately with a new typed error code `PROVIDER_BUSY` (add to `packages/tutor-providers/src/errors.ts`), map to HTTP 429 + API code `TUTOR_PROVIDER_BUSY` in `apps/server/src/tutor-provider.ts` (the `tutorProviderHttpError` map, ~50-67), and add a sentence to `apps/web/src/tutor/tutor-messages.ts`: "The tutor is finishing another task. Try again in a moment."

### 2.4 Diagnostics that survive

- In `codex.ts`, keep the last ~2KB of stderr on the thrown `TutorProviderError` (a `diagnostics` field mostly exists — verify it is populated on `PROVIDER_EXITED`).
- `apps/server/src/app.ts` `setErrorHandler` (~66-81): currently logs only unknown errors. Change: also `app.log.error({ code, diagnostics }, message)` for every `HttpError` whose status is >= 500.
- `apps/web/src/tutor/tutor-messages.ts`: map `TUTOR_SESSION_INVALID` (currently unmapped → raw server text) to "The tutor conversation expired. Start a new question." Extend the 502 sentence to append a short cause when the server provides one (add an optional `detail` field to the error payload in `app.ts` carrying the first line of diagnostics; render it in `TutorPanel.tsx` under the notice in smaller text).

### 2.5 Scratch relocation + lean codex profile

- `packages/paths/src/index.ts` (~63-67): change default scratch from `<repoRoot>/data/codex-scratch` to `~/.local/share/discere/codex-scratch` (`os.homedir()`); keep `DISCERE_CODEX_SCRATCH` override. Create the directory on first use.
- In `buildArguments`, add for BOTH branches: `-c mcp_servers={}` (disables the owner's 4 global MCP servers per exec — verify the exact override syntax with `codex exec --help` / `codex config`; if `mcp_servers={}` is rejected, use per-server `-c mcp_servers.<name>.enabled=false` for the four names in `~/.codex/config.toml`, read at provider construction).
- Grep the whole repo for `codex-scratch` and update tests/docs that assume the old location. The old `data/codex-scratch` dir can remain on disk; add it to `.gitignore` if not already.

### 2.6 Status endpoint + Settings screen

Server — new route `GET /api/tutor/status` in `apps/server/src/tutor-routes.ts`:
```ts
{
  provider: "codex" | "companion" | "mock",
  model: string,            // "" if account default
  binaryFound: boolean, binaryVersion: string,   // spawnSync `codex --version`, cached 60s
  authPresent: boolean,     // fs.existsSync(join(os.homedir(), ".codex", "auth.json"))
  queueDepth: number,
  lastOutcome: "none" | "ok" | "error",  lastError: string,   // in-memory, set by the provider
  quota: { planType: string, usedPercent: number, resetsAt: number } | null
}
```
Quota source: the newest `~/.codex/sessions/**/rollout-*.jsonl` contains `"rate_limits":{...,"primary":{"used_percent":X,"resets_at":N},...,"plan_type":"prolite"}` lines — parse the last occurrence from the newest file; return null on any failure. Add `TutorStatusSchema` (flat, no unions/optionals — use empty string/0/false, and `quotaKnown: boolean` instead of `| null` if you prefer strict flatness) to `packages/contracts/src/tutor.ts`; parse the response with it in `apps/web/src/api/endpoints.ts`.

Web — new route `/settings` in `apps/web/src/routes.tsx` → `apps/web/src/settings/SettingsScreen.tsx`:
- "OpenAI link" panel: green check (lucide `CheckCircle2`) when `binaryFound && authPresent`, red with remediation text otherwise ("Install the Codex CLI…" / "Run `codex login` in WSL…").
- Show provider, model, binary version, quota bar (used% + reset time rendered as local date), last outcome/error.
- "Test the link" button → sends a trivial ask through `POST /api/tutor/ask` scoped to a hidden probe (reuse the ask endpoint with a canned question against any lesson; render round-trip time). This is a LIVE codex call — label the button with that.
- NavRail entry (lucide `Settings` icon) in `apps/web/src/shell/NavRail.tsx`.
- Unit test with `stubFetch` harness; add `settings` to `e2e/screenshots.spec.ts` (both viewports).

### 2.7 Doctor check

`scripts/doctor.mjs` (or wherever `pnpm doctor` lives — check root `package.json`): add a check that the Playwright chromium deps resolve (attempt `ldd` on the chromium binary or check for `libnss3` via `ldconfig -p`), with the LD_LIBRARY_PATH workaround text and the permanent apt command in the failure message.

### 2.8 Phase 1 gate

```bash
pnpm verify && pnpm --filter @discere/web exec playwright test
```
Then ONE live smoke (counts against quota — keep it to exactly this):
```bash
DISCERE_TUTOR_PROVIDER=codex pnpm --filter @discere/server start   # in background, port free
# ask once via curl, capture sessionId, ask a follow-up with that sessionId, expect both 200
# kill the server
```
Both turns must return validated replies. Check `~/.local/share/discere/codex-scratch/.runs` cleans up. Merge branch to main.

---

## 3. Phase 2 — Design system + platform shell (the visible transformation)

Goal: opening the app looks like a designed product — animated welcome, rich catalogue, motion everywhere it earns its keep, streak/XP.

### 3.1 Vendor Inter

- Download Inter woff2 (variable or 400/500/600/700 static) — the owner's machine may have it via npm: use the `inter-ui` or `@fontsource/inter` npm package as a dependency (CSP-safe since bundled) — prefer `@fontsource/inter` (import the weights in `main.tsx`, e.g. `@fontsource/inter/400.css` etc.). Verify the woff2 files appear in `dist/assets` after build and `check-csp.mjs` stays green.
- `tokens.css`: `--font-sans` already names Inter — it now actually loads. Add `font-display: swap` awareness (fontsource default is fine).

### 3.2 Token expansion

File: `apps/web/src/styles/tokens.css`. Add (keep existing tokens working — extend, don't rename):
- Per-course accents: `--accent-electronics: #0b8f3c; --accent-roman: #a4553a; --accent-logic: #3856c4; --accent-maths: #7c3aa4; --accent-cs: #0b7f8f;` plus `-soft`/`-pale` tints for each (12% and 6% mixes on white). Components read them via `data-course` attribute selectors or an inline `style={{"--course-accent": ...}}` custom property — choose the inline custom-property approach (simpler, no selector explosion): every course card/screen sets `--course-accent`, components use `var(--course-accent, var(--green))`.
- Elevation: `--shadow-sm/-md/-lg` (soft, low-alpha; Brilliant uses very soft large-radius shadows).
- Motion: keep `--motion-fast/base/slow`; add `--motion-page: 320ms` and `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`. `prefers-reduced-motion` block must zero the new tokens too.

### 3.3 Motion infrastructure

- Add dependency `motion` (the Framer Motion successor package, `motion/react` import) to `apps/web/package.json`. Bundled → CSP-safe.
- Route transitions: React Router 7 supports `viewTransition` on `Link`/`useNavigate`. Pass `viewTransition` on the nav links in `NavRail.tsx`, `LessonRows.tsx`, catalogue cards, and programmatic `navigate()` calls in `LessonJourneyScreen.tsx`. Add `::view-transition-old/new(root)` CSS (240–320ms fade+8px slide, `--ease-out-expo`) in a new `apps/web/src/styles/motion.css` (import after shell.css). Guard: `@media (prefers-reduced-motion: reduce)` disables.
- Micro-interactions with `motion/react`: card hover lift, progress-ring draw-in, staggered list entrances (`initial/animate` with 30–60ms stagger), the streak flame pulse. Rule: motion communicates hierarchy/causality; nothing loops forever except the welcome brand moment.

### 3.4 Animated welcome

New `apps/web/src/shell/WelcomeScreen.tsx`:
- Shown at `/` when `sessionStorage["discere:welcomed"]` is unset; sets it and transitions into home (so it appears once per app launch, and the hub launches fresh each time → the owner sees it each open, which is what they asked for; skippable with a click anywhere / Escape).
- Content: the Discere mark drawing in (SVG stroke-dashoffset animation, ~900ms), wordmark fade, then a line like "Learn something real today", then auto-advance (1.6s total) into the home hero via a view transition. Reduced motion: static logo, immediate advance.
- Implement as an overlay inside `AppShell` (not a route) so deep links skip it naturally except `/`.

### 3.5 Catalogue rewrite

File: `apps/web/src/home/CourseScreen.tsx` (`CourseListScreen`).
- Grid of rich cards (min 320px, auto-fill). Each card: cover art, course title, one-line description, progress ring (completed lessons / total), lesson count, per-course accent stripe/tint, whole card clickable, hover lift.
- Cover art: hand-authored deterministic SVG per course at `content/<course-id>/assets/cover.svg` (create for both existing courses in this phase — geometric compositions in the course accent + ink on white; circuit motif for electronics, laurel/timeline motif for roman). Serve via the existing course-asset route (check `apps/server/src/routes.ts` asset handler path shape, reuse it; the symlink-containment fix must keep applying). The API's course summary must expose `coverUrl` — extend `CourseSummarySchema` in `packages/contracts` and `ContentRepository.courseSummary`.
- Support a `status: "available" | "coming_soon"` field on course summaries (default available). Coming-soon cards render desaturated, unclickable, "In production" tag — Phase 5's roadmap uses this. For now no coming-soon entries exist.
- The card grid is also embedded (smaller) on the home screen below the hero.

### 3.6 Home hero + gamification surfaces

- Server: extend the home endpoint (`/api/home` — see `apps/server/src/routes.ts` and `useHome` in `apps/web/src/api/queries.ts`) with `streakDays`, `xpTotal`, `todayMinutes`, `dueReviews` computed in `apps/server/src/db/store.ts` from `journey_progress.updated_at` dates (streak = consecutive days with ≥1 stage completion, computed in SQL or JS over the rows) and `user_profiles.xp`. XP accrual: award on stage completion in the progress PUT handler (+10 explainer/visual, +20 quiz pass, +30 essay submit — constants in `packages/progression-engine`, exported as `XP_AWARDS`).
- `HomeScreen.tsx` hero: greeting + streak flame chip + XP chip + "Continue" card with course accent + progress ring; below, the course card grid; below, "Review due" strip when dueReviews > 0.
- `ProgressScreen.tsx` full rebuild: streak calendar (last 10 weeks, GitHub-style day dots from completion dates — needs a `GET /api/progress/activity` returning `{date, completions}[]`), XP total + level ring (level = floor(sqrt(xp/100)), display only), per-course mastery rings, and the existing concept table restyled as cards below. Keep all data server-computed; schemas in `packages/contracts/src/api.ts`.

### 3.7 Screens polish pass

Apply the new tokens/motion to `CourseScreen` (course home: numbered lesson list → lesson cards with per-lesson progress + lock states), `ReviewScreen` (due-count hero instead of table-first), stage chrome (`StageHeader`, `LessonNavigator` — keep layout, refine with elevation/motion). Do NOT restructure the journey stages here (Phase 3 does).

### 3.8 Tests + gate

- Update/extend unit tests for changed components (stubFetch fixtures gain the new home/progress fields).
- `e2e/screenshots.spec.ts`: add welcome (force by clearing sessionStorage), new catalogue, new progress; update changed screens. Force reduced motion in e2e (`page.emulateMedia({ reducedMotion: "reduce" })` already implied by `animations: "disabled"` — verify view transitions don't flake; if they do, add the emulation in `e2e/fixtures.ts`).
- Gate: `pnpm verify` + full Playwright green; **visually review every changed PNG** against the Brilliant bar; iterate until it genuinely looks designed (expect 2-3 rounds). Merge.

---

## 4. Phase 3 — Step-based lesson schema + player

Goal: lessons play as Brilliant-style beats: short prose + visual + immediate interaction, one dominant task per screen.

### 4.1 Contracts

File: `packages/contracts/src/curriculum.ts`.

```ts
// Block model — internal schemas may use unions freely (never sent to codex directly)
RichTextBlockSchema = z.discriminatedUnion("kind", [
  { kind: "paragraph", text },            // $…$ KaTeX inline supported, as today
  { kind: "heading", text },
  { kind: "definition", term, text },     // renders as disclosure
  { kind: "callout", tone: "info"|"key", text },
  { kind: "equation", latex },            // display math
]);

LessonStepSchema = z.object({
  id: z.string(),                          // stable slug, unique within lesson
  kind: z.enum(["hook","explain","worked_example","check","interact","transfer","teach_back"]),
  blocks: z.array(RichTextBlockSchema).min(1),
  visualStateId: z.string().default(""),   // names a state in the lesson visual sequence ("" = keep current)
  checkQuestionId: z.string().default(""), // kind "check"/"transfer": required question ref
  activityId: z.string().default(""),      // kind "interact": activity ref
}).strict();
```

`LessonBeatSchema` gains `steps: z.array(LessonStepSchema).min(3)` and KEEPS `orientation/explanation/takeaway` as optional-empty legacy fields during conversion (delete them at the end of this phase once both bundles are converted). Multiple visuals: add `visuals: z.array(VisualBriefSchema-with-id)` (library keyed by id) alongside the legacy singular field; steps reference by id + state.

Beats mapping (authoring guidance, enforced as validation warnings not errors): lesson opens with `hook` (question + low-stakes prediction), alternates `explain`/`interact`, ends with `check`/`transfer`. 8–20 steps typical, 40–90 words per explain step.

File: `packages/contracts/src/journey.ts`: the explainer stage payload becomes `{ steps: LearnerStep[] }` where `LearnerStep` strips `checkQuestion` answer authority (question delivered like quiz stages: prompt/choices only). Stage TYPE and ID stay `explainer` / `${lesson.id}:explainer` (progress-row stability — fact #8).

### 4.2 Journey derivation

File: `apps/server/src/content.ts`, `getJourney` (~207-336) — the single choke point.
- Emit the explainer stage with the steps array; strip `answerAuthority`/`transfer` from every embedded check question exactly as done at ~line 217 for quiz stages (same destructuring pattern).
- Inline check answers are submitted through the EXISTING attempts flow (`POST /api/attempts` — check `apps/server/src/routes.ts` for the exact route) with the question id; no new grading path. Verify an embedded question id can't also appear in `questionIds` (validation, 4.4).
- `completionPolicy` for the explainer stage becomes `"interaction"`; completion means the learner reached the last step (client sends progress PUT with `interaction_state: { stepIndex }` per step and marks complete on final advance).
- Quiz/essay/review/completion stages unchanged.

### 4.3 Player

New `apps/web/src/journey/stages/StoryStageView.tsx` replacing `ExplainerStageView` in the `StageCanvas` switch (`LessonJourneyScreen.tsx`, keyed by stage id):
- Vertical step flow like Brilliant: previous steps stay visible (dimmed, compressed) above the active step; the active step animates in (`motion/react`, 200ms rise+fade); a "Continue" button advances; check steps replace Continue with the answer UI (reuse `AnswerInput`, hint ladder, and result notice components from `apps/web/src/journey/stages/QuizStageView.tsx` — extract shared pieces into `apps/web/src/journey/quiz-shared/` first if they're inline) and advance on correct-or-revealed per the guardrail mode (`mode-context.tsx` untouched).
- The visual panel: sticky right column (desktop) / top (mobile) showing the lesson visual in the state named by the active step (state transitions animate in Phase 4; this phase may cut between states).
- Persist `stepIndex` in `interaction_state` on every advance (debounced PUT); on load, resume at saved index. Extend `stage-machine.ts` with pure helpers `stepViewsFor(steps, interactionState)` / `canAdvanceStep(step, answerState)` + vitest.
- Read-aloud (existing SpeechSynthesis util) reads the active step only.

### 4.4 Validation + gates

`packages/curriculum/src/validate.ts` additions: step ids unique; `checkQuestionId`/`activityId`/`visualStateId` resolve; a question referenced by a step is not in `questionIds` too; per-step word-count warnings (explain > 120 words → warning); beats-shape warnings (no hook first, no check in lesson → warning).
`scripts/author.ts`: enumerate every step block text in `bundleFields`/`draftFields` (fact #7). `AuthoredLessonDraftSchema` (`packages/contracts/src/authoring.ts`): flat mirror — steps as array of `{id, kind (plain string), text (single string, blocks joined by \n\n), visualStateId, checkQuestionId, activityId}` all required with ""-defaults; boundary mapper converts to rich blocks (paragraph-only from codex; definitions/callouts are human-authoring edits).

### 4.5 Convert both existing bundles

Hand-convert all 8 lessons in `content/electronics-foundations/bundle.json` and `content/roman-empire/bundle.json` into steps (split existing `explanation` paragraphs into explain steps; move each lesson's activity into an `interact` step; move 1–2 quiz questions into inline `check` steps and OUT of `questionIds`; write a `hook` step per lesson — the redesign draft §7 contains a full Roman mockup to follow). No codex needed — this is editing ~1200 words. Convert the first electronics lesson FIRST and get the player working against it before converting the rest. Then delete the legacy `orientation/explanation` fields and the fallback path.

### 4.6 Gate

- vitest: stage-machine, getJourney (new fixture bundle), validation rules.
- e2e: extend `journey.spec.ts` — walk a full step lesson (advance through steps, answer an inline check, refresh mid-lesson and resume at the same step, complete). Update screenshots (story stage at an early step, at an inline check, near completion).
- Progress compatibility: copy `data/discere.sqlite*` aside, run the server against the copy, confirm the owner's existing `journey_progress` rows still load and the lesson resumes without errors.
- Visual review; merge.

---

## 5. Phase 4 — Animated visual engine + new activity types

Goal: diagrams live in the DOM, morph between validated states, and three new interaction types exist beyond sliders.

### 5.1 Inline SVG visuals

- `packages/visual-engine/src/circuit.ts` `renderCircuitSvg` is a pure string function. In the web app, replace `<img src="/api/visuals/circuit.svg?...">` (`apps/web/src/journey/visual-source.ts` + usages) with a `CircuitVisual` React component that calls the engine directly and injects via `dangerouslySetInnerHTML` (engine output is deterministic/trusted, never user input — add a comment stating that invariant) or, better, a parse-once approach: keep `dangerouslySetInnerHTML`, it's our own generated string. Import the workspace package into `apps/web` (already a dependency pattern — `@discere/visual-engine` may already be listed; verify).
- Keep the server `/api/visuals/*` endpoint (authoring preview + `<img>` fallbacks elsewhere).

### 5.2 State sequences

`packages/contracts/src/visuals.ts`: `VisualStateSchema = { id, params: Record<string, number>, caption }`, `VisualSequenceSchema = { visualId, states: VisualState[] }` attached to the lesson's visual library entries (4.1). Client: `useVisualState(sequence, activeStateId)` hook interpolating numeric params over 400–600ms (rAF or `motion`'s `animate()`), re-rendering the SVG per frame with interpolated params (renderCircuitSvg is fast — memoize; throttle to animation frames). Reduced motion → instant cut. This honors ADR-0002 (`docs/adr/0002-deterministic-technical-visuals.md`): states are reviewable data; interpolation is presentation only. Timeline visuals (`TimelineTrack.tsx`) get the same treatment for year transitions (animate the fill/scrubber).

### 5.3 New activity types

Each fully additive (unknown types already degrade gracefully). Per type: schema in `curriculum.ts` `ActivitySchema` union (internal — unions fine), pure logic module in `packages/activity-engine/src/` (copy the `ohms-law.ts` module + test pattern), React component in `apps/web/src/journey/activities/`, wire into `explorer-state.ts` dispatch:
1. **`diagram_choice`** — tap targets on an inline SVG: `{ visualRef, targets: [{id, label, shape: {cx,cy,r}}], prompt, correctTargetId, feedback: {correct, incorrect} }`. Renders the visual with invisible circular hit areas (visible focus rings for keyboard; each target is a `<button>` overlay positioned absolutely).
2. **`order_sequence`** — drag-to-order: `{ prompt, items: [{id, label}], correctOrder: [ids] }`. Implement with pointer events + keyboard (arrow keys move selected item) — no extra dependency; check answer button; specific feedback names the first misplaced item.
3. **`graph_plot`** — `{ prompt, axes: {x,y,ranges}, mode: "read" | "place", answer: {x,y,tolerance} }` on `packages/visual-engine/src/graph.ts` output; place mode = click to drop a point.
- Generalize `ExplorerControls.tsx` beyond range sliders (control union per activity) and replace the hard-coded increases/decreases/same prediction options with per-activity `predictionChoices` (schema addition, defaulted to the current trio for existing content).

### 5.4 Gate

vitest per module; e2e interaction tests using dispatched pointer events (avoid real drag flake — use `page.mouse` sequences with explicit waits); screenshot each new activity in ≥2 states; a11y pass on new interactions (keyboard operability asserted in tests); `pnpm verify`; visual review; merge.

---

## 6. Phase 5 — Content: rewrite polish + three starter courses + curriculum factory

> **Revised 2026-08-19, owner's decision.** Content is no longer generated by live codex runs.
> Two reasons: a coding-agent CLI carries roughly 18–20k tokens of scaffolding per call that
> teaching never uses, and the owner would rather spend a frontier model's quality on curriculum
> than a cheap model's throughput. The split is now:
>
> - **Tutor (live, automated):** `gpt-5.6-luna` at `xhigh` reasoning through the codex provider.
>   Small model, high effort, short questions. Measured at ~9s and ~14–17k input per turn.
> - **Course content (curated, manual):** open-source curricula (Khan Academy topic structure,
>   OpenStax tables of contents, Wikiversity) assembled into committed topic maps, then authored
>   by the owner prompting ChatGPT Pro (`gpt-5.6-sol`) by hand and pasting structured output back
>   into the repo.
>
> What this changes below: §6.1's `scripts/author.ts` extensions become an **import** pipeline,
> not a generation one. Build (a) a strict, union-free authored-lesson JSON contract, (b) a
> generated prompt file per lesson the owner can paste straight into ChatGPT, and (c) an import
> command that validates a pasted reply against the contract and runs the existing writing and
> answer-leak gates before merging it into the bundle. The companion packet flow in
> `packages/tutor-providers/src/companion.ts` is the working precedent — reuse its shape rather
> than inventing a second one. No quota preflight, ledger, or `--max-runs` budget is needed for
> content any more; keep them only if the tutor path ever batches.

**Quota note (tutor only).** Codex usage is dominated by the owner's own development sessions,
not by Discere — one dev session on 2026-08-19 spent 3.7M input tokens, about 185 tutor questions'
worth. Do not redesign the tutor around quota. Check `GET /api/tutor/status` if a run fails.

### 6.1 Factory tooling — BUILT

Delivered as `pnpm curate` (`scripts/curate.ts`, with the pure logic in
`packages/curriculum/src/authoring-import.ts` and tests beside it):

| Command | What it does |
| --- | --- |
| `pnpm curate plan <id> [subject]` | Writes the prompt that produces a topic map for a course that has none. |
| `pnpm curate scaffold <id>` | Turns a topic map into a `bundle.json` with the course, modules, concepts and sources. |
| `pnpm curate prompt <id> [slug]` | Writes a paste-ready prompt per pending lesson. |
| `pnpm curate import <id>` | Validates, merges and archives everything in the inbox. Writes nothing unless the whole bundle validates. |
| `pnpm curate status <id>` | What is done, what is waiting, what to run next. |

Committed topic maps: `logic-and-reasoning` (8 lessons), `maths-foundations` (6), `cs-basics`
(6). They render on the catalogue as `coming_soon` cards straight away, so the roadmap is
visible before any lesson exists.

The import contract is `ImportedLessonSchema` — flat, union-free, every field required, because
that is the only shape constrained decoding will emit (fact #6). `mergeLesson` fills in what a
writer is never asked for: source attribution, concept links, and the discriminated answer
authority. A re-import keeps hand-wired plumbing (visual brief, circuit spec, explorer, visual
states) and replaces only the written parts.

### 6.1b Original plan (superseded)

- `content/_topic-maps/*.json`: curated topic trees. Create by hand-curating from open sources (Khan Academy topic structure, OpenStax ToCs, Wikiversity) — the maps are committed DATA (title/summary/concept list/lesson outline per course), written by you (the executing model) without codex. Schema: `TopicMapSchema` in `packages/contracts` `{courseId, title, description, accent, modules: [{title, concepts: [{title, summary}], lessons: [{slug, title, outcome, outline: string[]}]}]}`.
- `scripts/curate.ts`: topic map → bundle skeleton (course/modules/concepts/lesson stubs with empty steps, `status: "coming_soon"` in catalogue until lessons land).
- Extend `scripts/author.ts`: per-lesson generation batching; resumable ledger `content/<course>/.authoring/state.json` ({lessonSlug: "pending"|"generated"|"linted"|"merged", runsUsed}); `--max-runs N` hard budget per invocation; preflight reads quota (refuse > 80% used); effort stays low; style-repair max 1 pass. The generation prompt gains the step model (update `prompts/lesson-writer.md`: Beats A–G structure, 8–20 steps, 40–90 words per explain step, inline checks with 3-hint ladders, no answer leaks — the writing-engine gate still enforces).

### 6.2 Courses (in this order)

1. **`logic-and-reasoning`** — most animatable. Module 1: deduction (knights & knaves via `diagram_choice` on character diagrams, truth tables via `order_sequence`/`diagram_choice`), Module 2: arguments (premise ordering, fallacy identification). 5 lessons. Hand-author lesson 1 completely (quality seed); factory-generate 2–5.
2. **`maths-foundations`** — algebra/graphs; `graph_plot` + KaTeX heavy. 5 lessons, lesson 1 hand-authored.
3. **`cs-basics`** — algorithms thinking; `order_sequence` for algorithm steps, `diagram_choice` on flow diagrams. 5 lessons, lesson 1 hand-authored.
- Each course: cover.svg, accent token, sources recorded in bundle `sources` (topic-map origins), images only if Wikimedia adds real value (`scripts/retrieve-images.ts` — extend `COURSE_REQUESTS` if used).
- Rewrite/polish pass on the two existing courses' step conversions (from 4.5) — codex polish ONLY where lint flags prose, else leave.

### 6.3 Gate

`pnpm validate:content` + writing gate green for all 5 courses; e2e smoke: first lesson of each new course completes end-to-end (extend `e2e/fixtures.ts` readJourney-driven walk); catalogue screenshot shows 5 rich cards; ledger shows spend per course; quota after < 80%. Visual + content review: actually READ every generated lesson; reject anything that reads like filler. Merge.

---

## 7. Phase 6 — Self-validation loop + Instrumenta pickup

1. `docs/ui-ux/visual-review-protocol.md`: the checklist used at every gate (hierarchy: one dominant task; motion: entrances staggered, nothing loops; type: Inter loaded, scale consistent; color: course accent + green only; density: no wall-of-text step; a11y: focus visible, reduced-motion clean). Refresh ALL reference PNGs in one final screenshot run.
2. `scripts/release.mjs` (root): runs `pnpm verify` → confirms `apps/web/dist` fresh → bumps version in root + `apps/server` + `apps/web` package.json (patch by default, `--minor` flag) → prints the hub-pickup confirmation checklist. Wire as root script `"release"`.
3. `/api/health` (`apps/server/src/routes.ts:123-128`): read `version` from the root package.json at startup (resolve via `packages/paths` repoRoot) instead of the hardcoded "0.1.0"; add `tutor: { provider, ready: boolean }` summary from the Phase 1 status logic.
4. Doctor: dist-freshness check (newest mtime under `apps/web/src` newer than `dist/index.html` → warn "run pnpm build before hub launch").
5. **Final release**: run `scripts/release.mjs --minor` (→ 0.2.0), rebuild dist, merge everything to `main`.
6. **Hub pickup verification** (the hub launches the server from this checkout over the WSL bridge; a rebuilt dist + restart IS the pickup — no hub changes needed):
```bash
# Simulate the exact hub spawn (mirrors Instrumenta/electron/wsl-bridge.cjs):
cd /workspace/dev_projects_master/_PersonalProjects/Instrumenta/Discere
env DISCERE_WEB_ROOT=apps/web/dist DISCERE_AUTO_MIGRATE=1 DISCERE_TUTOR_PROVIDER=codex \
    PORT=49323 HOST=127.0.0.1 pnpm --filter @discere/server start &
sleep 4
curl -s http://127.0.0.1:49323/api/health   # expect new version + tutor ready:true + courses:5
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:49323/   # 200 (new SPA)
kill %1
```
7. Update the workspace `docs/session-log.md` with a dated entry summarizing the rebuild.

---

## 8. Final acceptance checklist

- [ ] `pnpm verify` green on `main`; full Playwright green.
- [ ] Screenshot set reviewed against `visual-review-protocol.md`; welcome, catalogue (5 cards), story player, progress, settings all pass the "at home on brilliant.org" test.
- [ ] Live tutor: two-turn conversation succeeds (Phase 1 smoke re-run); settings screen shows green OpenAI link + quota bar.
- [ ] A full logic-and-reasoning lesson 1 plays end-to-end with animated steps, an inline check, and an interactive activity.
- [ ] `/api/health` reports the new version; hub-spawn simulation (7.6) serves the new UI on 49323.
- [ ] Existing owner progress rows still load (no orphaned stages).
- [ ] Workspace session log updated.

## 9. Deferred (do not build)

Full dark theme; sound; Lottie; 3D/canvas; SRS algorithm overhaul; essay-grading revamp; notebook enhancements beyond wiring; courses beyond the 3 starters (the factory + topic maps make them repeatable in later quota windows); multi-user; additional viewports; NotebookLM export; Windows packaging of Discere.

## Appendix — quick reference

- Repo: `/workspace/dev_projects_master/_PersonalProjects/Instrumenta/Discere` (own git repo, branch `main`).
- Hub contract: port 49323 (fallback 45023), health `/api/health`, env `DISCERE_WEB_ROOT=apps/web/dist`, `DISCERE_AUTO_MIGRATE=1`, `DISCERE_TUTOR_PROVIDER=codex`; hub spawns `pnpm --filter @discere/server start` inside WSL (`Instrumenta/electron/wsl-bridge.cjs`); closing the window kills the process group.
- Codex CLI: `~/.local/bin/codex` v0.147.0; auth `~/.codex/auth.json`; sessions/rollouts `~/.codex/sessions/`; `exec resume` accepts NO `-C`/`--color`/`-s`.
- Key files: provider `packages/tutor-providers/src/codex.ts`; journey derivation `apps/server/src/content.ts::getJourney`; contracts `packages/contracts/src/{curriculum,journey,tutor,authoring,visuals}.ts`; stage machine `apps/web/src/journey/stage-machine.ts`; validation `packages/curriculum/src/validate.ts`; authoring `scripts/author.ts`; CSP guard `scripts/check-csp.mjs`; screenshots `apps/web/e2e/screenshots.spec.ts` → `docs/ui-ux/screenshots/`.
- Design specs to follow: `docs/learning-experience-redesign-draft.md` (Beats A–G, principles, surfaces, Roman mockup); `docs/ui-ux/interactive-story-v1-spec.md` §5.7 motion + §11 contracts.
- Error mapping table: provider errors → HTTP → UI sentences live in `packages/tutor-providers/src/errors.ts`, `apps/server/src/tutor-provider.ts`, `apps/web/src/tutor/tutor-messages.ts`.
