# Browser test suite: status (6 October 2026)

The e2e specs in `apps/web/e2e/` drive the real app in headless Chromium: lessons answered right
and wrong, finishes, the chest, course checks, SQL and Python projects, phone widths. They guard
against "this used to work" before a release.

## Where it is up to

The October overhaul deliberately changed a lot of behaviour (a wrong answer now gives a hint and a
retry, not the answer; green became blue except for correct; new eyebrows and names; the
workbench toolbar; Bonehead), so the first full run was **92 passed, 63 failed**. A repair pass
went through the failures one by one, updating specs that asserted the old behaviour and fixing the
app where a spec had found a real bug (the archived-notice layout in `shell.css`).

The last complete run was **150 passed, 5 failed**. The pass was stopped before a final run, so
the numbers below are the best known state, not a fresh one.

| Spec | Status | Likely cause |
| --- | --- | --- |
| `home-redesign.spec.ts:60` Home tabs and illustrated courses | failing | Asserts the old welcome heading and course switcher; Home now leads with Bonehead and "Welcome back" |
| `screenshots.spec.ts:42` every screen at 1440, 1024, 390 (3 tests) | failing | Screen walk expects pre-overhaul landmarks; also rewrites tracked PNGs in `docs/ui-ux/screenshots` |
| `momentum.spec.ts:136` preferences persist, reduced motion | failing (click timeout) | Settings gained Theme and Background above Motion, and the finish screen changed; the selectors need updating |
| `foundations.spec.ts` gold lesson finish | fixed after the last full run (passes alone) | Waits for completion before reading the result |

## What will be done

1. Update the three specs above to the current screens and rerun the whole suite once.
2. Add specs for what is new and untested in a browser: light theme and calm background, the
   draggable pet, the calculator's "Use in answer", the Claude tutor route (with the mock provider).
3. Decide whether `screenshots.spec.ts` should keep writing into tracked `docs/` images or write to
   an ignored folder.

## How to run it

    pnpm --filter @discere/web e2e                     # everything, about 18 minutes
    pnpm --filter @discere/web e2e e2e/momentum.spec.ts  # one spec

`playwright.config.ts` starts its own API and web servers. In WSL, Chromium needs the
`LD_LIBRARY_PATH` libraries described in the WSL notes.
