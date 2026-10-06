# Navigation and motion — 2 October 2026

George's latest feedback makes motion an explicit release criterion. The previous quality pass
primarily exercised navigation with reduced motion enabled. Those functional results did not
establish that menu changes looked or felt finished.

## Changes

- Navigation uses one transition policy across main tabs, Settings, review, shortcuts, course
  links, programmatic lesson moves, and recorded browser history.
- The navigation frame stays opaque while the active underline travels between tabs. Outgoing
  content fades quickly; incoming content settles over 480 ms, with a 35 ms offset. Recorded
  frames exposed excessive text overlap in the first pass, so the outgoing fade was refined.
- Home course selection fades only its panel, and its icon strip scrolls smoothly into position.
  Period changes fade the statistics; course filters fade their results. Typing in search stays
  immediate and keeps the text caret.
- Original cover artwork settles into place with finite motion. Cards, utility icons, course
  selectors and pedestals respond to hover or keyboard focus. Content enters in small groups.
- Destination reading data is prepared in the existing query cache before the route commits.
  The previous screen remains visible during brief waits, with a delayed progress line. After
  one second, a stalled service yields to that screen's own loading/error controls. Navigation
  remains interruptible; no lesson answer, review rating or project save is sent by preloading.
- Browser-back restores the previous page's scroll position. Browsers without the View Transitions
  API receive an animated content entrance. Both the device and saved reduced-motion settings
  stop motion; sound and learning preferences remain separate.
- Lesson entry resolves its saved stage before showing the destination, avoiding a second redirect
  that cancelled the fade. Snapshot names exist only during transitions, preserving dialog stacking
  and close controls. Query-only filtering avoids a native snapshot race that lost search characters.

No course material, marking rules or owner learning data was edited in this change.

## Motion evidence

The new browser coverage explicitly enables normal motion. It samples intermediate opacity,
checks that the navigation stays fully opaque, records normal-speed desktop/tablet/phone videos,
and exercises rapid clicks, delayed data, browser history, search typing, manual/device reduced
motion and the fallback without View Transitions. Tests run against disposable SQLite databases.

- [Desktop recording](navigation-1440.webm)
- [Tablet recording](navigation-1024.webm)
- [Phone recording](navigation-390.webm)
- [Consecutive desktop frames](navigation-contact-sheet.png)
- [Desktop transition data](navigation-1440.json)
- [Tablet transition data](navigation-1024.json)
- [Phone transition data](navigation-390.json)

Captured Home, catalogue transitions, roadmaps and lesson entry are compared at 1440×900,
1024×768 and 390×844. The reference remains the supplied Brilliant compositions; the artwork
and companion remain original Discere assets. Videos and intermediate frames, rather than
still screenshots alone, are required evidence for future motion changes.

## Verification

The motion release is complete and running at `http://127.0.0.1:4318/` from the final production
bundle `index-CxHfYGEZ.js`. Refresh an already-open tab to load the updated JavaScript.

- `pnpm check` passed: lint, typechecks, 1,439 package tests and all content validation.
- `pnpm build` and the built-bundle CSP check passed. Existing writing/lint warnings and the
  JavaScript bundle-size warning remain; these results do not claim a warning-free build.
- The first full browser run had 114 passes and seven failures out of 121 scenarios. Its failures
  exposed lesson redirects, filter typing, scroll timing, modal stacking and an outdated motion
  preference setup in a test. After repairs, the final affected-route regression passed all 53
  scenarios, including every previously failing case and all six dedicated motion scenarios.
  This is a full run followed by a focused replay, not a claim that one final 121-scenario run passed.
- Normal-speed recordings at 1440×900, 1024×768 and 390×844 contain no skipped transitions or
  browser errors. The sampled desktop incoming page opacity was 0.606 while navigation remained
  at 1; the tab marker travelled over 480 ms. Consecutive frames were inspected as well as final
  layouts. Slow services, rapid clicks, search input, browser-back scroll, reduced motion and the
  browser fallback passed.
- `pnpm run doctor` and the isolated `pnpm smoke` passed. Doctor reports browser libraries missing
  from the default system search path; Chromium verification used the existing extracted libraries
  through `LD_LIBRARY_PATH=/tmp/discere-browser-libs/usr/lib/x86_64-linux-gnu`.
- Read-only Chromium checks against the restarted owner app passed Home → Courses → You → Settings
  → Home at all three sizes: four native transitions per viewport, no overflow, no request failures,
  no browser errors and zero API writes. [Live verification](live-verification.json) records the
  served bundle and results. The desktop app's browser controller failed to initialize twice, so
  this verifies the production service in isolated Chromium, not the user's already-open browser tab.
- SQLite's online backup completed before restart. Afterwards every existing row across all tables,
  the study summary and every saved preference matched the pre-release snapshot. Integrity is `ok`;
  the active catalogue remains 12 courses. [Preservation evidence](owner-preservation.json) records
  counts and table fingerprints without copying lesson attempts into the report.

The final regression covers navigation, home, library filtering, journey completion, feedback and
sound, biology lessons, Settings recovery, source dialogs and archived compatibility routes. All
learning attempts in tests used disposable databases. No new material was published.

Implementation uses the supported [React Router view transition option](https://reactrouter.com/how-to/view-transitions)
and the [browser View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition).
