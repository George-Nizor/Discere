# Discere and the Instrumenta brand (v2)

Aligned on 6 October 2026, following Instrumenta `brand/ALIGNMENT.md`. George approved the preview
(`alignment-preview.html`, also published as a Claude artifact) without changes.

## Copied from Instrumenta (commit 80d1864)

| What | From | To |
| --- | --- | --- |
| Fonts (Commissioner, Fraunces, Spline Sans Mono) with OFL licences and `fonts.css` | `brand/fonts/` | `apps/web/src/styles/fonts/brand/` |
| The Discere book icon (full, 24, 16, animated) | `brand/icons/svg/discere*.svg` | `apps/web/src/brand/` |
| Discere palette (`accent #5E9EFD`, `secondary #ADD3FF`, `deep #234C88`, `ink #0C1626`) | `brand/tokens.json` | `--accent*` in `apps/web/src/styles/brilliant.css` |

Regenerate in Instrumenta (`uv run brand/scripts/build-brand.py`) and copy again; never edit the
copied files.

## Discere's own additions

- **Interface icons** (`apps/web/src/brand/discere-icons.ts`): 30 glyphs drawn on the brand's
  48-unit grid and rendered with the brand library's own algorithm (ink outline, stepped extrusion,
  three detail tiers). Each has a meaning colour at the brand's OKLCH lightness and chroma: blue for
  Discere, gold for rewards, ember for heat, violet for memory, teal for leagues and tools, green
  only for done. `apps/web/src/brand/icon-set.tsx` exposes them under the names of the line icons
  they replaced, so a screen switches with one import. Utility glyphs (close, arrows, chevrons)
  stay as lines.
- **Buttons**: the icons' depth made pressable (2px ink outline, 3×4px extrusion that the press
  pushes into). Blue for actions, green only for moving on after a correct answer, gold only for
  rewards.
- **Answer choices** are raised like buttons; maths, code and bare numbers use the mono face.
- **Bonehead**, the Bonehead Labs companion, is the face of the app everywhere except the top bar
  and the title card, which carry the book.

## Where each face is used

| Face | Where |
| --- | --- |
| Fraunces (`SOFT 100`, `WONK 1`) | page and section titles outside lessons, course names, the greeting, the lesson finish and recap, level-up, toasts |
| Commissioner (`FLAR 40`) | everything you read to operate the app, including every question |
| Spline Sans Mono | XP, counts, combos, quest progress, the calculator, notation in answers and code |

## Kept, and why

Course cover art, Bonehead, the aurora, lesson diagrams, KaTeX maths and each course's diagram
colours carry meaning or are content. The dark theme stays. `styles/brand.css` is loaded last and
holds every brand override in one place.
