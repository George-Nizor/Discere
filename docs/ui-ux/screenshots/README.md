# Interactive Story v1 screens

This directory holds the reference captures for the rebuilt learner interface.

## Status

**No screenshots are stored here yet.** The capture suite exists and runs, but Chromium cannot
launch on this machine.

`apps/web/e2e/screenshots.spec.ts` visits every screen and writes a PNG per screen per viewport.
`pnpm exec playwright install chromium` downloaded the browser successfully, and
`ldd` on the downloaded binary reports four missing system libraries:

```text
libnss3.so
libnssutil3.so
libnspr4.so
libasound.so.2
```

Installing them needs root, and `sudo` on this machine asks for a password, so the capture was
left undone rather than faked. No placeholder or hand-drawn image stands in for a real capture.

## Capturing the screens

Once the libraries are present, from the repository root:

```bash
sudo pnpm --filter @discere/web exec playwright install-deps chromium   # once, needs root
pnpm e2e
```

The suite starts its own API server against a disposable SQLite database, builds and previews
the web bundle, and writes into this directory. Nothing else needs to be running.

To capture only the screenshots:

```bash
pnpm --filter @discere/web exec playwright test screenshots
```

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
| Review home          | `review-home`        | `/review`                                              |
| Flashcard            | `flashcard`          | `/review/session/:sessionId`                           |
| Progress             | `progress`           | `/progress`                                            |
| Tutor drawer         | `tutor-panel`        | explainer stage with the tutor drawer open             |

Stage identifiers are read from the journey API at run time, so the suite keeps working when
content changes the stage list.

## What to look for in review

The spec's visual-regression checklist applies: nested borders, duplicated headings, excessive
containers, weak primary-action hierarchy, low contrast, accidental horizontal scrolling, and
large empty title regions. The 390-wide captures should show no horizontal scrolling; the
browser suite asserts that independently.
