# Interactive Story v1 visual QA screenshots

The deterministic QA fixture is available at:

```text
/qa/roman?stage=0  Explainer
/qa/roman?stage=1  Diagram / visual
/qa/roman?stage=2  Quiz / check
/qa/roman?stage=3  Essay studio
/qa/roman?stage=4  Flashcards / review
```

The intended capture sizes are 1440×900, 1024×768, and 390×844. The fixture test verifies that the five screens are separate, keyboard-operable React states, and the route is included in the built application.

Screenshot capture was attempted during this round with Playwright Chromium. The host image contains Chromium but is missing `libnspr4`, `libnss3`, and `libasound`, and installing machine-level system packages is outside the repository change. No binary screenshot is claimed until those libraries are available in CI or on the review machine.

When the browser libraries are available, capture each stage with:

```bash
pnpm dlx playwright@1.55.0 screenshot --viewport-size="1440,900" \
  "http://127.0.0.1:4318/qa/roman?stage=0" \
  docs/ui-ux/screenshots/interactive-story-v1-explainer-1440.png
```

Repeat for stages `0`–`4` and the other two viewport sizes. The approved reference image remains the comparison board supplied for this redesign; the implementation itself keeps each learner screen separate.
