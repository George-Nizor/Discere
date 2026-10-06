# Companion: mascot concepts (round 1)

Status: **awaiting George's choice.** Nothing here is wired into the app. Open
[`concepts.html`](concepts.html) in a browser: it is self-contained (inline SVG, CSS and JS, no
network) and shows all four candidates side by side, live.

The brief: replace the green blob-with-a-book (`apps/web/src/ui/LearningCompanion.tsx`), use the
companion far more widely as a small interactive pet on every screen, and possibly let it replace the
app's mark (`apps/web/src/ui/DiscereMark.tsx`). The platform may be renamed, so no candidate refers
to the word "Discere", a letter D, Latin or Rome.

## Constraints every concept meets

- **Drawn in code.** Image generation isn't available, so each character is a set of SVG primitives
  with gradients, built by a function. The same approach as LearnChess's rook, but in SVG rather
  than Pillow, so the in-app pet and the logo come from one source and stay identical.
- **One rig, six expressions.** Idle, curious, delighted, encouraging, sleepy and proud all use one
  shared face system (eyes, brows, mouth, blush) plus one species-specific body cue. The face uses
  dark pupils with a white glint and no whites, so it still reads at 16 px.
- **Two levels of detail.** The *full* character (highlights, blush, wing veins, effects) and a *mark*
  variant (heavier strokes, no blush, no effects, no shadow) for 16–48 px, favicons and the logo.
- **Transparent canvas, no container, no lettering**, as the suite brand rules
  (`Instrumenta/brand/README.md`) require of every mark.
- **Colour.** Each concept works on the app canvas (`#141515`), on suite ink (`#0B0E12`) and on
  paper (`#F0EDE6`). None of them uses the app's correctness green as its main body colour, so the
  companion never reads as "you were right" by mistake. Sprig's leaves are the one exception, kept
  small on purpose.
- **Animations:** blink, bob (idle float), react (squash and stretch), celebrate (a hop with a turn
  and confetti), plus a small shake before the encouraging face. All of them are CSS keyframes on
  three nested groups (`rig` › `act` › `pose`), so a one-off reaction never fights the idle loop.

## The four concepts

### 1. Lumen: a firefly with a lantern

- **Personality:** quietly curious, attentive. It notices more than it talks.
- **Colour:** cobalt body `#3E83F8` (Discere's existing suite accent, so the move costs the brand
  nothing), lantern amber `#FFC24D`, ink `#0D1B3D`.
- **Body cue:** the lantern's glow. It brightens on success, warms during encouragement and nearly
  goes out when Lumen sleeps. Antennae perk, tilt or droop; wings flutter quickly when delighted.
- **Why:** light is the oldest metaphor for understanding ("it dawned on me"), and a glow suits a
  dark interface: it is the one concept that *adds light* to the screen. The antennae and lantern
  make it unmistakable at 24 px.
- **Risk:** the round body over a yellow abdomen can read as a bee at a glance. The lantern keeps
  one band only, to lean towards firefly.

### 2. Sprig: a seed that has just sprouted

- **Personality:** patient, steady, unhurried. Growth one day at a time.
- **Colour:** caramel seed `#E6A866`, leaf green `#38CE65`, bloom gold `#FFD23E`.
- **Body cue:** the two leaves are its ears. Up when delighted, one raised when curious, one waving
  when encouraging, drooping when asleep. When proud (and when a skill is mastered) it **flowers**.
- **Why:** the strongest fit with spaced practice and mastery. Growth is the product's promise, and
  a flower that only appears on mastery is a reward that cannot be faked. The warmest silhouette of
  the four, and it reads cleanly as a flat shape.
- **Risk:** the most "cute" of the four; it may feel young for philosophy or linear algebra. Its
  leaf green sits close to the correctness green.

### 3. Nib: a hedgehog with paper quills

- **Personality:** earnest and bookish. Takes your work seriously and is visibly pleased by it.
- **Colour:** paper `#F7F2E6`, ink-tip cobalt `#3E83F8`, deep navy back row `#1F3F86`, sand face
  `#F1CD98`.
- **Body cue:** the quills are pages tipped in ink (a faint ruled line on each). They fan out when
  delighted or proud, bristle on a reaction and fold flat when asleep.
- **Why:** studious without being an owl. The quills are a pen (nib) and a page at once, so it
  carries "writing and notebooks" without holding a book. The spiky silhouette is the most distinctive
  of the four as a flat shape.
- **Risk:** the most detailed character; at 16 px the quills become a blue fringe.

### 4. Orbi: a small planet with a moon

- **Personality:** playful and restless; the one that likes a streak.
- **Colour:** violet `#7D6EF4`, ring gold `#FFC53D`, moon `#F3EEDF`.
- **Body cue:** its moon orbits continuously. It speeds up when you are on a run, sprints during a
  celebration and drifts to a crawl when Orbi sleeps. The ring tilts with the mood.
- **Why:** curiosity at the scale of the universe, and a built-in metronome. The moon's speed can
  express a combo without any extra interface. Fits a library that spans astronomy to economics.
- **Risk:** a ringed planet is a familiar icon, so the silhouette is the least ownable of the four.
  The face does the work.

## Recommendation

**Lumen** first, **Sprig** second. Lumen keeps the suite's cobalt accent, glows on a dark UI, has
the clearest small-size silhouette after Nib, and its body cue (brightness) maps directly onto
understanding without a new symbol. Sprig is the better *story* (mastery = flower) if George wants
warmth over atmosphere. Elements can be combined if wanted: Sprig's mastery bloom works for any
species as a "proud" accessory.

## How the chosen companion propagates

One React component, `Companion`, rendering the chosen species with props
`expression`, `size`, `variant: "full" | "mark"`, `live` (idle loop on/off) and `follow` (eyes follow
the pointer). The logo becomes `<Companion variant="mark" />`, with a pre-rendered PNG/ICO for the
favicon and the Instrumenta launcher tile (same SVG rasterised at 1024 px, transparent, per the brand
rules). `DiscereMark` and `LearningCompanion` become thin wrappers, then disappear.

| Surface | Use |
| --- | --- |
| Lesson feedback | Replaces the current blob. Correct: delighted then proud, once. Incorrect: a small shake, then encouraging, never sad. Hint or reveal used: curious. |
| Home hero | Full size, idle, eyes follow the pointer; greets with curious once per session. After a streak day it sits proud. |
| Roadmap pedestals | Stands on the current node, sleepy on nodes that are due for review ("this one is fading"), proud on mastered ones (Sprig: flowered). |
| Empty states | Sleepy beside the empty list, with the action the learner can take. |
| Loading | The idle loop alone (bob plus blink) in place of a spinner, for waits over 400 ms. Orbi's moon or Lumen's glow pulse doubles as a progress cue. |
| Level-up / quest chest | Celebrate plus confetti, drawn from the game layer's existing celebration engine (`apps/web/src/fx`), not a second particle system. |
| Review session | Curious while a card is shown, delighted on recall, encouraging on a lapse. |
| Tutor panel | Small mark-size head beside tutor messages; curious while the tutor is generating. |
| Errors / offline | Encouraging, with the real error text; it never replaces the message. |

### The pet: behaviour rules

The pet is a 64–72 px companion docked on every learning screen. It should be charming and never in
the way:

1. **Position.** Docked bottom-right, outside the reading column; it never overlaps a choice, an input,
   the Check/Continue button, the workbench or a toast. At 390 px wide it shrinks to 48 px and sits in
   the lesson header instead of floating. It cannot be dragged over content.
2. **Reacts only to what the learner did.** One reaction per answer, per hint and per level-up, then
   it settles back to idle. It never reacts to a page visit or a timer, and nothing it does awards
   XP or counts as evidence. Petting it is a toy, not an action the server hears about.
3. **Speaks rarely.** At most one short bubble per answer (two to five words, British spelling,
   passed through the writing gate), auto-dismissed after about two seconds, `aria-live="polite"`.
   It never repeats the feedback text the lesson already shows. Off by default in exams and
   assessments, where the pet stays visible but silent and does not react to correctness.
4. **Idle and sleep.** Bob plus random blinks while idle. After 45 s without input in the app (7 s in
   the concept sheet, so you can see it), it falls asleep; the next input wakes it with a small
   curious beat. Asleep is also its state on long reading screens, so it never competes with text.
5. **Pointer.** Eyes follow the pointer within its own panel only, with easing; petting (click or
   Enter/Space on the focused pet) gives a squash and two hearts. Four quick pets: a small
   celebration. It is a real button with an accessible name ("Companion").
6. **Reduced motion** (`html[data-motion="reduced"]` or `prefers-reduced-motion`): every expression
   still shows; bob, blink, follow, hops, confetti, the orbit and glow pulses stop. The concept sheet's
   switch demonstrates this.
7. **Settings.** "Show companion" (on by default), "Companion speech" (on by default). Hidden, it
   leaves a small "Show companion" tab at the edge for the rest of the session, then stays hidden.
   Lesson feedback keeps a static mark-size head even when the pet is hidden, because that is
   content, not decoration.
8. **Performance.** Pure SVG plus CSS transforms; one shared `requestAnimationFrame` loop drives every
   pet on the page (pointer follow, Orbi's moon) and pauses when the tab is hidden.

## What George needs to decide

1. Which concept (or which combination).
2. Whether the companion replaces the app mark now, or once a rename is settled.
3. A name for it, if not the working name used here.

After approval, phase 2 builds the `Companion` component and its tests, replaces `LearningCompanion`
and `DiscereMark`, adds the docked pet and the settings toggles, and rasterises the mark for the
favicon and the Instrumenta tile.

---

## Round 2: Bonehead

Status: **awaiting George's approval.** George chose his own brand mascot instead of the four
concepts above: the Bonehead Labs bone, the label he plans to open-source the platform under.
Open [`bonehead.html`](bonehead.html) (self-contained; the original brand image is embedded once,
as a data URI, only for the side-by-side comparison).

### What was kept, what was changed

The character is redrawn, not reinvented. The outline was measured from the brand image
(1024 px, divided by 8 into a 128-unit SVG) and laid over it on the sheet to prove the match.

- **Kept:** the bone's silhouette and proportions (shaft 30 units wide, knobs 47), the ~4.7-unit
  ink outline `#0B1A1C`, the oval eyes and small smile, black headband headphones with teal cups
  `#14A9A9`, and the teal puddle offset to the right.
- **Changed, only where needed:** the bone is mirrored from one half so it animates cleanly (the
  original drifts by a pixel or two); the face can change expression; a *mark* variant thickens the
  outline (6.2) and enlarges the eyes for 48 px and below; a dark-interface rim (below).

### Two treatments

- **Light** (as the original): dark outline on paper `#FBFAF3` or any light surface.
- **Dark** (the app, `#141515`): the ink outline and headband disappear, so an SVG filter dilates
  the whole figure's alpha by 1.6 units and fills it with `#5FD9D2`, plus a faint teal glow. The
  drawing inside is unchanged, and because it is a filter it follows every animation and prop for
  free. The bone body goes to `#F7F8F4` to cut glare; the puddle brightens slightly to `#1DB5B1`.

Teal is the mascot's colour. The app's green `#38ce65` stays reserved for "correct" UI; the bone
is never green.

### Expressions and behaviours

| State | Face | Body and headphones |
| --- | --- | --- |
| Idle | The original face | Gentle bob, random blinks |
| Curious | One eye larger, raised brow, small "o" | Leans left; right cup nudges out |
| Delighted | Closed happy eyes, open smile | Stretches tall; headphones lift |
| Encouraging | Soft lower lids, sympathetic brows, gentle smile | Leans right |
| Sleepy | Closed eyes, small mouth, z's | Squashes; **headphones slip down round its neck** |
| Proud | Smug closed eyes, lopsided smile | Chin up, slight stretch |

Moments: **correct**: ear cups light up teal with sound waves, then delighted → proud.
**Read aloud**: it nods to a 100 bpm beat while notes float from the cups; it never falls asleep
while reading. **Wrong**: a wobble, a brief sweat drop, then encouraging. **Level up**: graduation
cap drops on, cups glow, celebrate. Optional props, each tied to one moment and off by default:
reading glasses (long focus), cap (level up), plaster (a rough patch), sweat drop (just after a
miss). Animations: blink, bob, wobble (squash and stretch with a skew, so it reads as a bendy
bone), celebrate (hop, turn, confetti in teal, gold and ink), shake.

### Sizes, marks, lockups

The sheet shows 16–200 px in both treatments, a browser tab and a flat silhouette. The tall bone
fills about two thirds of a square, so at 16 px the headphones and white body carry it more than
the face. That is acceptable for a favicon but worth knowing. Marks have no wordmark and sit on
a transparent canvas, per the suite brand rules. Two lockups are drafted with the system font stack:
**Bone Up** (proposed platform name: "to bone up on" means to study hard) and **Bonehead Labs**.
A final wordmark should be outlined to SVG paths so it never depends on an installed font.

### Propagation and pet rules

Everything in "How the chosen companion propagates" and "The pet: behaviour rules" above applies
unchanged, with these additions: the in-app pet uses the dark treatment; the lesson's read-aloud
control drives the headphone bob; the correct-answer reaction is the cup glow (never a green
flash on the mascot); and props are a setting the learner can turn off.

### What George needs to decide

1. Approve the redraw as faithful (see the overlay on the sheet).
2. The dark treatment: teal rim as shown, or a paper-white rim.
3. Which props to keep.
4. Whether the platform becomes **Bone Up**, and whether the bone replaces the app mark now.
