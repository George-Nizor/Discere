# Next session — plan

Written at the end of the session of 2026-08-19. Everything below came out of the owner using
the app rather than from the original playbook, so it takes precedence over what remains of
`rebuild-execution-playbook.md` §7 (Phase 6, still unstarted).

## 0. Session setup

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"
export CI=true
export LD_LIBRARY_PATH=/tmp/discere-browser-libs/usr/lib/x86_64-linux-gnu   # Playwright
cd /workspace/dev_projects_master/_PersonalProjects/Instrumenta/Discere
```

Preview the app the way the hub launches it (demo data, live tutor):

```bash
pnpm build
env DISCERE_WEB_ROOT=apps/web/dist DISCERE_AUTO_MIGRATE=1 DISCERE_TUTOR_PROVIDER=codex \
    DISCERE_CODEX_MODEL=gpt-5.6-luna DISCERE_CODEX_EFFORT=xhigh \
    DISCERE_DATABASE_PATH=/tmp/discere-demo.sqlite DISCERE_LEARNER_NAME=George \
    PORT=49323 HOST=127.0.0.1 pnpm --filter @discere/server start
```

Then http://localhost:49323. The demo database is seeded; the owner's real progress is in
`data/discere.sqlite` and is untouched by that command. **The server caches `index.html` at
boot, so rebuild *then* restart, or the page loads a bundle hash that no longer exists.**

---

## 1. PRIORITY — content prompts ready to paste

This is the first job of the session. The tooling and the three topic maps are already
committed; nothing here needs designing, only running.

```bash
pnpm curate scaffold logic-and-reasoning && pnpm curate prompt logic-and-reasoning
pnpm curate scaffold maths-foundations   && pnpm curate prompt maths-foundations
pnpm curate scaffold cs-basics           && pnpm curate prompt cs-basics
pnpm curate status logic-and-reasoning
```

That writes one paste-ready prompt per lesson to
`content/<course>/.authoring/prompts/<slug>.md` (20 lessons across the three courses). The
owner pastes each into ChatGPT Pro, saves the JSON reply to
`content/<course>/.authoring/inbox/<slug>.json`, and runs `pnpm curate import <course>`.

Before handing them over, **read two or three generated prompts end to end** and check they
still match the contract — `ImportedLessonSchema` and the seven-field `answerAuthority` in
particular, because a wrong prompt costs the owner a round trip per lesson. There is a test
guarding this (`packages/curriculum/tests/authoring-import.test.ts`) but read them anyway.

Also worth doing while the owner authors: the scaffolded courses are `coming_soon`, so flip a
course to `available` only once it has lessons a learner can start.

---

## 2. Bugs and behaviour the owner hit

### 2.1 The tutor refuses ordinary questions

Asked "what is a battery", the tutor declines rather than explaining. Coach mode is meant to
withhold **the answer to the lesson's current question**, not general knowledge. The guardrail
is over-applied.

Look at `prompts/tutor-system.md` (§ Accountability behaviour) and `answerBoundaryFor` in
`apps/server/src/tutor-routes.ts`. The distinction to encode: a definition, a mechanism, or a
worked *analogous* example is always allowed; what is withheld is the value or conclusion the
active question is asking for. Add a case to the prompt and a test that asks a definitional
question in coach mode and expects a real explanation.

### 2.2 The tutor's conversation is lost on close

Closing and reopening the drawer empties the thread. The thread lives in `TutorPanel` component
state, so unmounting discards it — and the `sessionId` that keeps the codex conversation going
goes with it, which means the next question starts a fresh, more expensive session.

Lift the thread and session id out of the panel: either into `LessonJourneyScreen`, or into a
small context keyed by lesson. Persisting to `sessionStorage` per lesson would also survive a
refresh. Worth a test: open, ask, close, reopen, thread still there.

### 2.3 Illustration route — FIXED, verify it

`/api/illustrations/:key.png` collided with `/api/illustrations/:key` and the handler read a
parameter that never existed, so every picture 404'd and the panel showed a broken image. It is
now `/api/illustrations/:key/image` and verified serving. Confirm in the browser.

Also fixed: the generator's "if nothing was saved, adopt the newest stray PNG" fallback could
serve one illustration's image under another's key. It now fails cleanly. One orphaned record
was removed from the cache.

---

## 3. Layout — panes, not drawers

The owner's framing: the tutor and the notebook should **split the page**, not float over it.

- The tutor panel becomes a pane taking roughly half the width, so a long conversation and a
  generated picture are both properly visible.
- The notebook opens as a pane from anywhere, not only from its own route.
- Two things open → split in two. Three (lesson, tutor, notebook) → split in three.

This is a shell change rather than a screen change: a pane manager in `AppShell` or
`LessonJourneyScreen` holding which panes are open, with the stage always present. Keep
`/…/notebook` working as a real route for deep links, rendering the same component.

Watch out for: the sticky stage header and bottom navigator assume full width; the story
player's `story-split` already splits internally and will need to collapse to one column inside
a narrow pane; and the reduced-motion/mobile paths need the same treatment as the desktop one.

---

## 4. Dark mode

The owner reads at night and the white canvas is hurting. The token file is already the single
source of colour (`apps/web/src/styles/tokens.css`), so this is mostly a second palette plus an
audit of the places that hard-code white.

- Add `:root[data-theme="dark"]` and a `prefers-color-scheme: dark` block that does not fight an
  explicit choice, plus a toggle in Settings persisted to `localStorage`.
- Known hard-coded whites to fix: `#ffffff` in `--course-accent-soft` / `-pale` mixes, the
  button `color`, `.course-card-tag`, `.illustration img` background, the notebook's paper and
  ruling, and `renderCircuitSvg`'s `.component` fill in `packages/visual-engine/src/circuit.ts`
  (the engine draws with `currentColor` for strokes but a literal cream for component fills).
- The generated cover images are opaque and light; check they do not glare against a dark card.
- Add a dark screenshot pass to `e2e/screenshots.spec.ts` so it stays honest.

---

## 5. Mascot, favicon, avatar

The current mark is an open book with a spark (`apps/web/src/ui/DiscereMark.tsx`) — better than
the no-entry circle it replaced, but the owner wants something closer to a **mascot**: a
character with a face, in the Duolingo sense, that can carry personality across the welcome, the
tutor, empty states, and celebration moments.

Now that image generation is available (§7), draft candidates with it, then redraw the chosen one
as SVG so it stays crisp and themeable. Also needed:

- A real favicon (there is none; the browser tab is blank).
- The nav-rail avatar is currently the learner's initial on a dark circle — decide whether the
  mascot takes that slot or the learner keeps it.
- A tutor face, so the drawer has someone in it rather than a heading.

---

## 6. Faster illustrations

The first drawing took a couple of minutes for a mediocre result. Things to try, in order of
likely payoff:

1. **Size and quality knobs.** Read `~/.codex/skills/.system/imagegen/SKILL.md` — it is the skill
   the CLI used and will document whatever it accepts. A smaller output would be both faster and
   entirely sufficient at the ~600px the panel displays.
2. **Effort.** The runner already pins `model_reasoning_effort="low"`; confirm that is actually
   reaching the image path and is not being overridden by `~/.codex/config.toml`'s `xhigh`.
3. **Warm the session.** Each run pays ~150k input tokens, most of it the skill preamble. A
   resumed session would cache it. `requestIllustration` spawns a fresh `codex exec` every time.
4. **Prompt for speed.** The tutor's subject is currently its whole answer; a short noun phrase
   would draw faster and better than a paragraph of prose.

Quality was also poor because the subject was the raw answer text. Consider asking the tutor for
a one-line `illustrationSubject` in its reply schema (flat string, defaults to "") and drawing
that instead.

---

## 7. Image generation is available — write this down

**The local Codex CLI can generate images.** `codex features list` reports
`image_generation  stable  true`, and the CLI carries an `imagegen` skill at
`~/.codex/skills/.system/imagegen/SKILL.md`. Run `codex exec` with `-s workspace-write` and ask
for an image at a path; it writes to `~/.codex/generated_images/…` and copies to the destination.

This is the platform's route to **official artwork**: course covers, mascot studies, lesson
illustrations, empty-state art, marketing images. It is not only a tutor feature.

Already used for: the five course covers now in
`content/*/assets/cover.webp` and `content/_topic-maps/assets/*.webp`.

House style that produced good results, worth reusing verbatim:

> Flat vector editorial illustration, in the manner of a Brilliant.org course card. Landscape
> 16:9, composed to read at 340 pixels wide. One hue only plus tints and shades of it; linework
> in white or near-white. Geometric and precise, generous negative space. Not photorealistic, not
> 3D, no neon, no glow. Absolutely no text, letters, numbers, logos or watermarks.

Always re-encode before committing: the generator emits ~1 MB PNGs, and 900px WebP at quality 88
lands at 14–70 kB with no visible loss at display size.

---

## 8. Still outstanding from the original playbook

Phase 6 (§7 of `rebuild-execution-playbook.md`) has not been started:

- `scripts/release.mjs` and a root `release` script.
- `/api/health` still reports a hardcoded `version: "0.1.0"` and no tutor-readiness summary.
- Doctor check for a stale `apps/web/dist`.
- `docs/ui-ux/visual-review-protocol.md` — worth rewriting against the v2 system rather than v1.
- The hub-pickup simulation, and a dated entry in the workspace `docs/session-log.md`.

## 9. State of the tree

`main` is green: `pnpm verify` passes with two long-standing lint warnings, 20/20 Playwright,
130 web unit tests. Quota was still reading 93% used on `prolite` and every call succeeded.
