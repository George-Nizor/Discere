# Figures: the brief for the drawing agents

The story lessons are written. Most teaching screens have no picture, and the owner wants them
to. You are drawing the figures that are missing, for the lessons you are given. Each figure is an
SVG written into the lesson (diagram type `svg_figure`), drawn so it reads in the light and the dark
theme, and checked by looking at it.

Read first: `docs/learning-experience/story-brief.md` (the shape and voice of the lessons) and the
course's `content/<course>/.authoring/figure-wishlist.md` (what the lesson writers wished for, screen
by screen). The approved Astronomy prototype, `story-prototype/astronomy-turning-sky.html`, shows what
a good figure does: it is the thing the screen is talking about, labelled with words the learner has
already been taught.

## What to draw

- Every lesson you are given ends with at least two figures, on the opener or on its teaching
  screens, where a picture does real work: showing a layout, a path, a comparison, a quantity to
  scale, a before and after. Start from the wishlist entries for your lessons. Add a figure where a
  teaching screen plainly needs one and the wishlist missed it. Do not add decoration.
- Where a screen already has a working diagram of the course's own type (for example a number
  machine, an equation balance or an explorer model that matches what the text says), leave it. Where
  the wishlist says the existing one is only a stand-in, or where it prints words the learner has not
  met, replace it with yours.
- Figures go only on the opener (`intro.hook.diagram`) and on teaching screens (`explain` steps
  with no check question). Do not put a drawing on a screen that asks a graded question, so a
  drawing can never give an answer away.
- A learner cannot drag anything. The only interaction is **cases**: up to five labelled views the
  learner switches between with buttons (for example "On the equator" and "At the North Pole", or the
  stages of a process). Use cases for before and after, for places, for steps. Make each case
  complete by itself.

## The JSON

```json
"diagram": {
  "type": "svg_figure",
  "alt": "A cross-section of Earth with its axis extended to the sky and the north celestial pole marked at the top.",
  "caption": "Earth in cross-section. The axis points at the same spot in the sky all night.",
  "cases": [
    { "id": "equator", "label": "On the equator", "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 400\">…</svg>" }
  ],
  "initialCaseId": "equator"
}
```

- `alt`: 20 to 400 characters. What the figure shows and what it is for, for a reader who cannot see it.
- `caption`: up to 300 characters, plain, saying what to notice. Never "Press Play", "drag" or
  "move the slider": nothing moves. It may say "Use the buttons to compare the two places."
- Each case `id` is lowercase-with-hyphens; `label` is at most 40 characters.
- Each `svg` is at most 14,000 characters. Write the lesson's text so it still teaches if the figure
  is ignored, and make sure its words match the figure ("the gold arrow" must be an arrow the drawing
  marks). If the lesson text points at something the drawing does not show, fix the text.

## The drawing rules (the lesson will not load if you break them)

- One `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">` (or 640 by 360). Allowed
  elements: `svg g defs title desc path circle ellipse line polyline polygon rect text tspan marker`.
  No `style`, no `script`, no `image`, no gradients, no filters, no `foreignObject`, no links.
- No `style` attributes and no colours. Colour comes only from these classes, which follow the
  theme: stroke `s-ink s-soft s-muted s-line s-accent s-green s-warn s-error`; fill `f-ink f-soft
  f-muted f-canvas f-sunken f-accent f-accent-soft f-green f-green-soft f-warn f-warn-soft f-error
  f-error-soft f-none`; text `t` (16 units) `t-small` (14) `t-big` (20) `t-bold t-accent t-muted
  t-green t-warn t-error`; line `w1 w2 w3 w4 dash dot round`. Put a class on every shape: a shape
  with no class is invisible. Combine them: `class="f-accent-soft s-accent w2"`.
- Meaning of colour: accent for the thing the screen teaches, green for a result or "this is right",
  warn for a caution or a limit, ink and soft for structure, muted for secondary labels.
- Arrowheads: a `<marker id="head" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">`
  with a `<path class="f-ink" d="M0 0 L8 4 L0 8 z"/>` inside `<defs>`, used as `marker-end="url(#head)"`.
  Give markers ids unique to the case.
- Text is at least 14 units tall, 16 where there is room. Keep a 24-unit margin. Labels never overlap
  lines or one another. Words only the learner has been taught.
- Draw to scale when a quantity matters. Compute coordinates with a small script (angles, arcs,
  plots, bar heights) instead of guessing, and keep the numbers in the drawing the same as in the text.
- Keep it simple: a clear drawing with six labelled parts beats a detailed one with twenty.

## Look at what you drew

You must look at every figure before you save it. From the repository root:

```bash
LD_LIBRARY_PATH=/tmp/claude-1000/libs/ex/usr/lib/x86_64-linux-gnu \
  node scripts/render-figures.mjs content/<course>/.authoring/migration/<lesson>.json <your-scratch-dir>/<lesson>
```

It writes one PNG per case, once in the light theme and once in the dark. Open each PNG with the
Read tool. Fix clipped or overlapping text, lines that miss their labels, anything unreadable in
either theme, and any place the drawing disagrees with the lesson's numbers. Do this until every
case is right. Keep PNGs out of the repository.

## Files and commands

- Edit the lesson drafts at `content/<course>/.authoring/migration/<lesson-id>.json` in place: add
  `diagram` to a teaching step or to `intro.hook`. Remove a wishlist entry from the course's
  `figure-wishlist.md` once you have drawn it; add a line saying which are left and why.
- Citations: a figure does not need one of its own; the step's existing citation covers it.
- Apply and validate: `pnpm tsx scripts/lesson-migration/scaffold.ts <course-id> --apply`. Clear
  every error; list warnings in your report. Then run your course's test and
  `pnpm --filter @discere/curriculum typecheck`.
- Other agents are drawing for other courses at the same time. Touch only your course's `.authoring`
  folder (and the one test file only if a count in it must change). Do not run `curate`, do not
  commit, do not edit code.

## Report (under 300 words)

Per lesson: figures drawn (step id, what each shows, number of cases), figures you left out and why,
anything in the drawing rules that got in the way, and the three figures you are least sure about.
