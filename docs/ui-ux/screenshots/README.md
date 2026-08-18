# Interactive Story v1 screens

This directory holds the reference captures for the rebuilt learner interface.

## Status

Captured from the running application on 19 August 2026. Every PNG here came out of
`apps/web/e2e/screenshots.spec.ts` driving a real Chromium against a real API server. Nothing is
mocked up, drawn by hand, or stood in for.

## Running the browser here

Chromium downloads cleanly with `pnpm --filter @discere/web exec playwright install chromium`,
but the machine is missing four shared libraries:

```text
libnss3.so
libnssutil3.so
libnspr4.so
libasound.so.2
```

The recommended fix is the system-wide install, which needs root once:

```bash
sudo pnpm --filter @discere/web exec playwright install-deps chromium
```

Without root, the libraries can be extracted from their `.deb` packages into a scratch directory
and put on the loader path for the run. That is how these screenshots were produced:

```bash
LD_LIBRARY_PATH=/path/to/extracted/usr/lib/x86_64-linux-gnu pnpm e2e
```

The extraction is per-machine scratch, not part of the repository, so the sudo install remains
the supported route for CI and for a fresh checkout.

## Capturing the screens

From the repository root:

```bash
pnpm e2e
```

The suite starts its own API server against a disposable SQLite database, builds and previews
the web bundle, and writes into this directory. Nothing else needs to be running.

To capture only the screenshots:

```bash
pnpm --filter @discere/web exec playwright test screenshots
```

Captures are viewport-sized rather than full-page stitches, with animations disabled and the
page scrolled to the top. A full-page capture paints the sticky stage header and the sticky
bottom navigator at their scroll positions in the middle of the image, which misrepresents what
a learner sees.

## Expected files

Each screen is captured at 1440×900 and 390×844. The file name is `<screen>-<width>.png`:

| Screen               | File stem            | Route                                                  |
| -------------------- | -------------------- | ------------------------------------------------------ |
| Home                 | `home`               | `/`                                                    |
| Course library       | `courses`            | `/courses`                                             |
| Course               | `course`             | `/courses/:courseId`                                   |
| Explainer            | `explainer`          | `…/lessons/:lessonId/stages/:explainerStageId`         |
| Interactive visual   | `interactive-visual` | `…/stages/:visualStageId`, after a checked prediction  |
| Quiz                 | `quiz`               | `…/stages/:quizStageId`                                |
| Essay studio         | `essay`              | `…/stages/:essayStageId`                               |
| In-lesson review     | `lesson-review`      | `…/stages/:reviewStageId`                              |
| Completion           | `completion`         | `…/stages/:completionStageId`                          |
| Working notebook     | `notebook`           | `…/lessons/:lessonId/notebook`, with a drawn page       |
| Review home          | `review-home`        | `/review`                                              |
| Flashcard            | `flashcard`          | `/review/session/:sessionId`                           |
| Progress             | `progress`           | `/progress`                                            |
| Tutor drawer         | `tutor-panel`        | explainer stage with the tutor drawer open             |
| Roman course         | `roman-course`       | `/courses/roman-empire`                                |
| Roman explainer      | `roman-explainer`    | Roman lesson 1 explainer, with the retrieved map        |
| Roman timeline       | `roman-timeline`     | Roman lesson 1 activity, after a checked prediction     |
| Roman quiz           | `roman-quiz`         | Roman lesson 1 first question, a selection              |

Stage identifiers are read from the journey API at run time, so the suite keeps working when
content changes the stage list.

The interactive-visual capture moves the resistance slider before predicting, so the feedback it
shows is a real comparison rather than a circuit that never changed. The Roman timeline capture
drags the scrubber to 27 BCE and checks an ordering prediction, for the same reason. The notebook
capture draws a line and types a note first, because an empty sheet says nothing about how the
page behaves.

The map and the timeline belong to two consecutive stages of the same lesson, so they appear in
`roman-explainer` and `roman-timeline` rather than in one image. There is no screen in the
approved design that shows both at once.

## What to look for in review

The spec's visual-regression checklist applies: nested borders, duplicated headings, excessive
containers, weak primary-action hierarchy, low contrast, accidental horizontal scrolling, and
large empty title regions. The 390-wide captures should show no horizontal scrolling; the
browser suite asserts that independently.
