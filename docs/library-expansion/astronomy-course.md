# Astronomy: From Sky to Cosmos

Published: 6 October 2026. Course ID: `astronomy-sky-to-cosmos`, version 1.0.0.

Twelve connected lessons run from the turning night sky to the age of the universe. The course has
72 lesson questions, 24 fresh recall cards, twelve concepts and 48 answered visual beats with 108
authored cases. Three separate checks add another 36 problems.

## Sequence

| Module | Lessons |
| --- | --- |
| The sky in motion | The turning sky; Why the seasons change; Phases and eclipses |
| Gravity and orbits | Kepler's laws; Newton's gravitation; Orbits, escape and tides |
| Reading starlight | Brightness and distance; Temperature, colour and motion; The H–R diagram |
| Stars and the cosmos | How mass sets a star's life; Galaxies and Hubble's law; The age and afterglow of the Big Bang |

The audience is an adult comfortable with algebra, powers of ten and ratios. Physics: Motion and
Forces helps but is not required. Each lesson asks four visual questions before revealing the
explanation, then two practice questions and two new recall problems. Of the 72 questions, 58 are
calculations, 7 take a single term (circumpolar, perihelion, parsec, radius, neutron star, full,
blackbody) and 7 are multiple choice (10%). Every prompt states its constants and rounding.

The checks each cover all twelve lessons: optional placement, a mixed checkpoint after all lessons,
and a transfer set seven days after the checkpoint.

## The explorer

`astronomy_explorer` draws fifteen bounded model kinds as layered SVG on a deep-space field with a
seeded twinkling starfield:

- `sky`: a horizon dome seen from the east, with the celestial pole, the star's daily circle and the
  arc watched;
- `seasons`: a tilted Earth on its orbit with a noon-Sun gauge and a stick's shadow;
- `moon`: a top-down phase wheel beside the disc as seen from Earth;
- `eclipse`: a side view with Earth's shadow and an exaggerated lunar latitude;
- `orbit`: an ellipse solved from Kepler's equation, shaded into twelve equal-time sectors;
- `gravity`: two bodies with equal and opposite force arrows on a shared scale;
- `launch`: velocity-Verlet paths that fall back, close or escape, against a speed gauge;
- `tides`: two ocean bulges and a coastal town turning through a lunar day;
- `light`: the inverse-square spread across a grid of squares;
- `parallax`: Earth's orbit, a nearby star and a telescope view through the year;
- `blackbody`: Planck curves that recolour the glowing star;
- `doppler`: compressed and stretched wavefronts above a shifted spectral line;
- `hr`: an H–R diagram with named stars, the main sequence and lines of constant radius;
- `life`: a star's main-sequence point, giant phase and end state;
- `expansion`: a stretching grid of galaxies beside a velocity–distance plot.

Models carry only givens. Worked results (`astronomyMeasures`) and any on-drawing values appear only
after grading; a star's end state stays hidden until then. Timed kinds play once in six or seven
seconds, pause, step and scrub by keyboard. Reduced motion, from the system or the app's
`data-motion="reduced"`, removes playback, twinkle and transitions while keeping the manual steps.

## Sources

Facts and formulas were checked against OpenStax *Astronomy 2e* (Fraknoi, Morrison and Wolff),
sections 2.1, 3.1, 3.3, 3.4, 3.5, 4.1, 4.2, 4.5, 4.6, 4.7, 5.2, 5.6, 17.1, 17.2, 18.4, 19.2, 22.1,
23.2, 26.1, 26.5, 29.1 and 29.4. The book's preface, read on 6 October 2026, states that the current
web edition is licensed CC BY-NC-SA 4.0, not CC BY. All sections are therefore recorded as
reference only, and no OpenStax prose, exercises or figures are reused. Constants come from the NASA
NSSDCA Earth, Sun, Moon and planetary fact sheets, which are US government works.

Stated approximations: 15° per hour for the sky; a 23.4° tilt; t ≈ 10 billion years × M⁻²·⁵ and
L ∝ M³·⁵ (the lifetime rule reproduces OpenStax's 500 million years at 3.3 M☉); end states from
OpenStax Table 23.1 (white dwarf below about 10 M☉, neutron star to about 40 M☉, black hole above);
eclipse limits of 1.0° and 1.5° of lunar latitude; a solar tide of 0.46 of the lunar tide;
H₀ = 70 km/s/Mpc with the 67–73 range named.

Accepted bundle SHA-256:
`b9cea2417c2e36519c3c4e76b8176fbd0bc4d6a5e9abdde49cf00b6fc889bfc0`.

Cover SHA-256 (original CC0 SVG):
`69a20c5815ffac52a6b838aee4ac8e423f013a51fc9cf08be46e287b8ac50e02`.

## Verification

- `packages/curriculum/tests/astronomy-content.test.ts` recomputes all 118 numeric keys from the
  problem statements (58 lesson, 24 recall, 36 check) and limits every tolerance to the stated
  rounding. It also binds the shipped bundle to the review record.
- `packages/activity-engine/tests/astronomy.test.ts` checks physical invariants: zenith and pole
  altitudes, equal areas in equal times, NASA's orbital and escape speeds, 1,361 W/m² at 1 AU,
  Wien peaks, L = R²T⁴ and lifetimes.
- `AstronomyDiagram.test.tsx` covers keyboard case switching, scrubbing, finite playback, reduced
  motion and concealed results.
- `apps/web/e2e/astronomy-course.spec.ts` is written but has not yet been run.

Screens were inspected at 1440×900 and 390×844 on a disposable stack. That led to a new sky-dome
camera, the removal of overlapping H–R labels, a smaller launch scale and a new seasons layout. Course-check
items whose givens exposed the answer were rewritten.

This review was carried out by the authoring agent under delegated authority. There has been no
independent human subject review and no documented learner trial.
