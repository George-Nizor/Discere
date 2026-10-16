# Figure wishlist: Astronomy, From Sky to Cosmos

Figures the story lessons would like and the course's `astronomy_explorer` models cannot draw. Each
screen below teaches without its figure; the text before the figure is in `lead` and the text after
it is in `afterFigure`, so a figure can be dropped in between without rewriting anything. Where a
screen already carries an existing model as a stand-in, the entry says what the stand-in lacks.

The existing `sky` model prints "Latitude", "Star's declination" and "North celestial pole" on every
drawing, and its results panel prints "circumpolar". For that reason it is used only from the
declination screen onward, where those words have been taught.

## Lesson 1, The turning sky (`turning-sky`)

The prototype's figures are in `docs/learning-experience/story-prototype/astronomy-turning-sky.html`.

1. **Opener (`intro`)**. Shows a flat sketch of the sky facing north from Amsterdam, ground at the
   bottom, west on the left and east on the right, stars below the horizon hidden, and every star
   leaving a circular trail about one point. No words on the drawing. The learner presses Play to
   watch a day go by. Caption: "A flat sketch of the sky facing north from Amsterdam. West is on your
   left and east on your right. Press Play to watch a day go by."
2. **`earth-spins`**. Earth seen from above the North Pole, with an observer's dot on the equator and
   a dashed line to one distant star that keeps its direction. An arrow from the dot points straight
   up and sweeps round with Earth. The learner presses Play or moves a slider through the day.
   Caption: "Press Play or move the slider. The arrow on your dot points straight up and sweeps round
   with Earth."
3. **`hub-of-the-wheel`**. Earth in cross-section with its axis extended out to the sky, marking the
   north and south celestial poles, with the zenith of an observer shown as a separate point. The
   learner changes nothing. Caption: "Earth in cross-section, with its axis extended out to the sky.
   The point overhead is a different spot."
4. **`walking-north`**. The northern sky sketch from the opener, with a place chooser: On the equator
   (pole on the horizon, stars rise and set) and At the North Pole (pole overhead, every star circles
   without setting), plus a slider for any latitude between. Play runs a day. The pole is labelled.
   Caption: "Choose a place, then press Play. On the equator the pole sits on the horizon and stars
   rise and set. At the North Pole it stands overhead and every star circles without setting."
5. **`latitude-and-altitude`, first half**. Earth in cross-section with an observer on the surface and
   the angle of latitude drawn at the centre. The learner drags a slider to walk the observer north
   from the equator. Caption: "Move the slider to walk the observer north. The angle at the centre is
   the latitude."
6. **`latitude-and-altitude`, second half**. An observer under the sky with a star whose altitude is
   drawn as an angle above the horizon, with the zenith marked at 90°. The learner drags a slider to
   raise the star. Caption: "Drag the slider to raise the star and watch the angle grow."
   (One screen carries both ideas, so the screen needs two figures, or one figure with two tabs.)
7. **`why-equal`**. Earth in cross-section showing the observer, the radius to the centre, the
   horizon at a right angle to it, the "pole arrow" parallel to the axis, and the angle between the
   horizon and that arrow, built up in four steps and marked with φ. The learner steps through and
   then moves a latitude slider. Caption: "Earth in cross-section. Step through the diagram, then move
   the slider. The text calls the arrow parallel to the axis the pole arrow."
8. **`declination-and-circles`**. Stand-in: the `sky` model at 52° N with stars at +30°, 0° and −30°.
   It shows each star's circle but not what declination measures. Wanted: Earth at the centre of the
   sky with the celestial equator drawn and a star whose declination is the angle above that equator,
   with a slider from −90° to +90°; and a second view of one highlighted star's circle on the north
   sky sketch with its distance from the pole marked (90° − δ). Caption: "Drag the slider to move the
   star north or south of the celestial equator, and press Play to watch the highlighted star go
   round."
9. **`which-stars-never-set`**. Stand-in: the `sky` model with three cases. It lacks the marker at the
   lowest point of the circle that turns green when the point clears the horizon. Wanted: that marker,
   with sliders for latitude and declination. Caption: "The marker on the circle shows its lowest
   point. It turns green when the point is above the horizon."

## Lesson 2, Why the seasons change (`seasons`)

10. **Opener (`intro`)**. A stick standing in level ground with its noon shadow, and a date slider
    that moves the Sun's height and so the shadow's length through the year, with the shadow's tip
    leaving a trail along one line. Caption: "The same stick at noon through the year. Drag the date
    to move the tip of the shadow."
11. **`tilt-and-orbit`**. The existing `seasons` model suits this screen. Wanted in addition: a small
    inset of the lamp-and-pencil demonstration, a pencil held at a fixed slant while the walker circles
    a lamp. Caption: "A pencil held at a fixed slant while you walk round a lamp leans towards the
    lamp, away from it and sideways in turn."
12. **`noon-height`**. Stand-in: the `seasons` model, whose Noon Sun panel draws the altitude. Wanted:
    Earth in cross-section with the observer, the point beneath the Sun, the gap angle between them at
    the centre, and the Sun's altitude marked, with sliders for latitude and for the Sun's
    declination. The learner sees that the gap and the zenith distance are the same angle. Caption:
    "Move your latitude and the Sun's declination. The gap between you and the point beneath the Sun
    is the angle the Sun sits from straight overhead."
13. **`low-sun-weak-sun`**. A torch or sunbeam of fixed width landing on flat ground, with a slider
    for the Sun's altitude. The patch of lit ground lengthens as the Sun sinks, and a readout shows
    1/sin h. Caption: "Lower the Sun and watch the same beam spread over more ground."

## Lesson 3, Phases and eclipses (`moon-and-eclipses`)

14. **`half-lit-ball`**. The existing `moon` model suits this screen. Wanted in addition: a ball under
    a lamp that the learner can walk round, with the half of the ball facing the viewer shown beside
    it. Caption: "Walk round the ball. You always see some of the lit half, but how much depends on
    where you stand."
15. **`lit-fraction`**. A graph of the lit fraction (1 − cos θ) ÷ 2 against θ from 0° to 360°, with a
    marker the learner drags along it and the Moon's disc drawn beside it. Caption: "Drag the marker
    along the curve. The lit fraction rises to a full disc at 180° and falls again."
16. **`synodic-month`**. A strip showing the Sun's and the Moon's positions among the stars day by
    day, with the Moon gaining on the Sun and the 27.3-day and 29.53-day marks. The learner scrubs
    through the days. Caption: "The Moon returns to its place among the stars after 27.3 days, but
    needs about two more days to catch up with the Sun."
17. **`tilted-orbit`**. Stand-in: the `eclipse` model, which draws one side-on view. Wanted: a
    three-dimensional view of the Moon's hoop-shaped orbit tilted 5.1° to the ecliptic sheet, with
    Earth at its centre, the Moon crossing the sheet twice and the shadow cones lying along the sheet.
    The learner turns the view and scrubs the Moon round. Caption: "Turn the view and move the Moon
    round its orbit. It crosses the sheet twice, and eclipses need a new or full moon near a
    crossing."
18. **`moon-and-sun-size`**. Two discs side by side, the Sun and the Moon, drawn at their angular
    sizes as seen from Earth, with a slider for the Moon's distance (356,000 to 407,000 km). The
    learner watches the Moon's disc grow and shrink against the Sun's, and a readout shows each
    angular size in degrees. Caption: "Move the Moon in and out. Close in it covers the Sun, and far
    out it leaves a ring."

## Lesson 4, Kepler's laws (`kepler-laws`)

Every screen below teaches without its figure. The `orbit` model stands in on the screens that carry one.

19. **`the-ellipse`**. Two pins and a loop of string on paper, with a pencil the learner drags to draw the
    curve, and a slider that moves the pins together or apart. The ellipse draws itself and the two foci
    are marked. The existing `orbit` model draws the finished orbit but not how it is made. Caption:
    "Drag the pencil round the loop of string. Move the pins apart and the curve stretches."
20. **`equal-areas`**. An orbit with the Sun at one focus and the line from the Sun to the planet drawn
    in, with a wedge swept out in a chosen time shown at perihelion and again at aphelion, both shaded
    and labelled with equal areas. The learner presses Play to watch the planet speed up and slow down.
    The `orbit` model has no motion. Caption: "Press Play. The shaded wedges cover equal areas in equal
    times, so the planet moves fastest where the line is shortest."
21. **`period-and-size`**. A plot of P² against a³ for the planets, as points on a straight line, with the
    learner moving a marker along it to read a period from a size. Caption: "Each planet sits on one
    straight line. Move the marker to read a period from a semi-major axis."

## Lesson 5, Newton's gravitation (`newton-gravity`)

22. **`apple-and-moon`**. Earth with an apple at its surface and the Moon drawn at 60 Earth radii, each
    with an arrow showing how far it falls in one second, to different scales so both can be seen, and a
    readout of 5 m and 1.4 mm. The learner switches the pull from "fixed" to "falls as the square of the
    distance" and watches the Moon's arrow match. The `gravity` model draws two bodies and arrows but
    not this comparison. Caption: "Switch the rule on and watch the Moon's fall shrink to the observed
    1.4 mm."
23. **`gravity-on-a-world`**. A chooser of worlds (Moon, Mars, Earth) with their GM and radius shown and
    g computed beside each, and a slider to change the radius with the mass fixed. Caption: "Choose a
    world, then change its radius. Surface gravity falls with the square of the radius."

## Lesson 6, Orbits, escape and tides (`orbits-escape-tides`)

24. **`a-ball-that-keeps-missing`**. Newton's mountain and cannon on a round Earth with the curve of the
    ground drawn strongly, and a speed slider from 1 to 12 km/s. The path is traced as the ball falls,
    and a 5 m drop is marked against 8 km of curve. The `launch` model stands in. It draws the paths but
    not the 5 m and 8 km comparison. Caption: "Raise the speed. At one speed the ground curves away as
    fast as the ball falls."
25. **`difference-in-pull`**. Earth in cross-section with three arrows of different length for the pull
    at the near ocean, the centre and the far ocean, and then the same arrows with the centre's arrow
    taken away to show the two bulges. Caption: "Take away the pull at the centre and what is left
    stretches the ocean towards the Moon and away from it."

## Lesson 7, Brightness and distance (`brightness-and-distance`)

26. **`torch-and-wall`**. A torch and a wall with a distance slider from 1 m to 4 m. The lit circle
    grows, and a grid of unit squares shows how many fit inside it, with a readout of the area and the
    light on each square. Caption: "Move the torch back. The same light covers more squares, so each
    gets less."
27. **`parallax`**. Earth at opposite sides of its orbit in January and July, a nearby star, and a field
    of far stars, with two sightlines and the star's position against the far stars shown in each
    season, and a slider for the star's distance. The `parallax` model draws the angle but not the two
    positions against the background. Caption: "Move the star closer and the shift against the distant
    stars grows."

## Lesson 8, Temperature, colour and motion (`colour-and-motion`)

28. **`hot-things-glow`**. A strip of colour for a glowing object, with a temperature slider from 1,000 K
    to 20,000 K. The strip runs through red, orange, yellow-white and blue-white and the peak is marked on
    a wavelength axis in nanometres. The `blackbody` model draws the curve but not the glowing colour.
    Caption: "Raise the temperature and the glow turns from red towards blue as the peak moves left."
29. **`fixed-fingerprints`**. A star's spectrum as a strip of colour with a few dark lines, and a
    velocity slider that slides the whole pattern towards the red or the blue, with a copy of the
    laboratory lines above it for comparison. The `doppler` model is the stand-in. Caption: "Set the
    star moving. Every line slides by the same fraction of its wavelength."

## Lesson 9, The H–R diagram (`hr-diagram`)

30. **`power-from-a-surface`**. Two glowing discs at the same temperature, one three times as wide as the
    other, each tiled with unit squares so the learner can count how many squares glow, with a radius slider
    for the larger disc and a temperature slider that changes the colour of both. A readout shows the number
    of glowing squares and the light from each square. The `hr` model cannot draw this, and it prints the
    whole H–R diagram, which the screen has not yet taught. Caption: "Widen the second disc and count the
    glowing squares. At the same temperature, more squares means more light."

## Lesson 10, How mass sets a star's life (`star-lives`)

31. **`fuel-and-burn-rate`**. Two stars drawn as a tank and a tap: the tank's size shows the fuel and the
    tap's flow shows the burn rate, with a mass slider from 0.5 to 20 solar masses. A bar shows the time
    until the tank is empty. The learner sees the tank grow slowly and the tap open wide. The `life` model
    prints end states, which this screen comes before. Caption: "Raise the mass. The tank grows a little and
    the tap opens a lot, so the tank empties sooner."

## Lesson 11, Galaxies and Hubble's law (`expanding-universe`)

32. **`a-stretching-sheet`**. A row of dots on a rubber sheet with a slider that stretches the sheet evenly,
    and a control to choose which dot is "home". Each gap is labelled before and after, with the gain
    beside it, and arrows show how fast every other dot leaves the home dot. Caption: "Stretch the sheet and
    choose a different home dot. Every other dot moves away, and the farther ones move faster."

## Lesson 12, The age and afterglow of the Big Bang (`big-bang`)

33. **`running-it-backwards`**. A field of galaxies with a time slider that runs from now back to the
    beginning, the galaxies drawing together until they meet, with 1/H₀ marked on the slider. The `expansion`
    model shows the grid growing but not the galaxies converging. Caption: "Run time backwards and watch the
    galaxies draw together. Every one of them arrives at the same moment."
