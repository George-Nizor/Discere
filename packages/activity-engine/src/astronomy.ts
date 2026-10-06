import type { AstronomyModel } from "@discere/contracts";

/**
 * Deterministic astronomy for the explorer. Constants follow the NASA planetary fact sheets
 * (accessed 6 October 2026) and OpenStax Astronomy 2e; every result here is derived from the
 * model's givens, never stored in it.
 */
export const ASTRO = {
  /** Gravitational constant, m³ kg⁻¹ s⁻². */
  G: 6.674e-11,
  /** Astronomical unit, m. */
  AU: 1.495978707e11,
  /** Parsec in AU and in light-years. */
  pcInAu: 206264.806,
  lyPerPc: 3.26156,
  /** Light-year, m. */
  ly: 9.4607e15,
  /** Sun: GM (m³/s²), luminosity (W), effective temperature (K), mass (kg). */
  sunGM: 1.32712e20,
  sunLuminosity: 3.828e26,
  sunTemperature: 5772,
  sunMass: 1.9884e30,
  /** Earth's mean orbital speed, km/s, which is √(GM☉/1 AU). */
  earthOrbitalSpeed: 29.78,
  /** Wien's displacement constant in nm·K. */
  wien: 2.898e6,
  /** Second radiation constant hc/k in nm·K. */
  planck2: 1.4388e7,
  /** Speed of light, km/s. */
  c: 299792.458,
  /** Synodic month, days. */
  synodicMonth: 29.530589,
  /** Moon's orbital inclination to the ecliptic, degrees. */
  moonInclination: 5.1,
  /** Mean Earth–Moon distance in Earth radii (384,400 km / 6,371 km). */
  moonDistanceEarthRadii: 60.3,
  /** Solar tide as a fraction of today's lunar tide. */
  solarTideRatio: 0.46,
  /** 1/H₀ in billions of years when H₀ = 1 km/s/Mpc. */
  hubbleTimeGyr: 977.8,
} as const;

export const ASTRO_BODIES = {
  earth: { name: "Earth", gm: 3.986004e14, radius: 6371 },
  moon: { name: "the Moon", gm: 4.9028e12, radius: 1737.4 },
  mars: { name: "Mars", gm: 4.2828e13, radius: 3389.5 },
  jupiter: { name: "Jupiter", gm: 1.26687e17, radius: 69911 },
} as const;

const rad = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Plain number formatting: up to four significant decimals, with thin scientific notation for extremes. */
export function astroNumber(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "∞";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) {
    const exponent = Math.floor(Math.log10(abs));
    const mantissa = value / 10 ** exponent;
    return Number(mantissa.toFixed(2)) + " × 10^" + exponent;
  }
  return Number(value.toFixed(digits)).toLocaleString("en-GB", { maximumFractionDigits: digits });
}

/* ---------- The sky ---------- */

/** Local east/north/up unit vector of a star at hour angle H (degrees, west positive). */
export function skyVector(latitude: number, declination: number, hourAngle: number) {
  const f = latitude * rad,
    d = declination * rad,
    h = hourAngle * rad;
  return {
    east: -Math.cos(d) * Math.sin(h),
    north: Math.sin(d) * Math.cos(f) - Math.cos(d) * Math.cos(h) * Math.sin(f),
    up: Math.sin(d) * Math.sin(f) + Math.cos(d) * Math.cos(h) * Math.cos(f),
  };
}
export function starAltitude(latitude: number, declination: number, hourAngle: number) {
  return Math.asin(clamp(skyVector(latitude, declination, hourAngle).up, -1, 1)) / rad;
}
/** Highest altitude of a star, on the meridian: 90° − |φ − δ|. */
export const meridianAltitude = (latitude: number, declination: number) =>
  90 - Math.abs(latitude - declination);
/** Lowest altitude of a star, on the meridian below the pole: |φ + δ| − 90°. */
export const lowestAltitude = (latitude: number, declination: number) =>
  Math.abs(latitude + declination) - 90;
export const isCircumpolar = (latitude: number, declination: number) =>
  lowestAltitude(latitude, declination) > 0;
/** Hour angle at the given playback fraction: the arc is centred on the meridian crossing. */
export function skyHourAngle(m: Extract<AstronomyModel, { kind: "sky" }>, fraction: number) {
  return (clamp(fraction, 0, 1) - 0.5) * m.hours * 15;
}

/* ---------- Seasons ---------- */

const dateSign = {
  "march-equinox": 0,
  "june-solstice": 1,
  "september-equinox": 0,
  "december-solstice": -1,
} as const;
export const dateNames = {
  "march-equinox": "March equinox",
  "june-solstice": "June solstice",
  "september-equinox": "September equinox",
  "december-solstice": "December solstice",
} as const;
/** Orbital position of Earth in degrees, measured anticlockwise from the March equinox. */
export const dateOrbitAngle = {
  "march-equinox": 0,
  "june-solstice": 90,
  "september-equinox": 180,
  "december-solstice": 270,
} as const;
export const sunDeclination = (m: Extract<AstronomyModel, { kind: "seasons" }>) =>
  m.tilt * dateSign[m.date];
export const noonSunAltitude = (latitude: number, declination: number) =>
  90 - Math.abs(latitude - declination);
/** Hours of daylight for the Sun's centre, ignoring refraction. */
export function daylightHours(latitude: number, declination: number) {
  const x = -Math.tan(latitude * rad) * Math.tan(declination * rad);
  if (x <= -1) return 24;
  if (x >= 1) return 0;
  return (2 * Math.acos(x)) / rad / 15;
}

/* ---------- The Moon ---------- */

export const moonElongation = (day: number) => (360 * day) / ASTRO.synodicMonth;
export const moonIllumination = (day: number) => (1 - Math.cos(moonElongation(day) * rad)) / 2;
const phaseNames = [
  "new moon",
  "waxing crescent",
  "first quarter",
  "waxing gibbous",
  "full moon",
  "waning gibbous",
  "third quarter",
  "waning crescent",
];
export function moonPhaseName(day: number) {
  const e = ((moonElongation(day) % 360) + 360) % 360;
  return phaseNames[Math.round(e / 45) % 8]!;
}
/** Approximate local solar time (hours) when the Moon crosses the meridian. */
export const moonTransitHour = (day: number) => (12 + moonElongation(day) / 15) % 24;
/** Approximate geocentric limits used by the eclipse model, in degrees of lunar latitude. */
export const ECLIPSE_LIMIT = { new: 1.5, full: 1.0 } as const;
export const eclipseOccurs = (m: Extract<AstronomyModel, { kind: "eclipse" }>) =>
  Math.abs(m.moonLatitude) < ECLIPSE_LIMIT[m.alignment];
/** Angular diameter in degrees of a body of diameter D at distance d (same units). */
export const angularDiameter = (diameter: number, distance: number) =>
  (2 * Math.atan(diameter / 2 / distance)) / rad;

/* ---------- Orbits ---------- */

type Orbit = Extract<AstronomyModel, { kind: "orbit" }>;
/** Kepler's third law in Newton's form: P² = a³/M, with P in years, a in AU, M in solar masses. */
export const orbitalPeriod = (a: number, starMass = 1) => Math.sqrt(a ** 3 / starMass);
export const perihelion = (m: Orbit) => m.semiMajorAxis * (1 - m.eccentricity);
export const aphelion = (m: Orbit) => m.semiMajorAxis * (1 + m.eccentricity);
/** Vis-viva speed in km/s at distance r (AU). */
export const orbitSpeed = (m: Orbit, r: number) =>
  ASTRO.earthOrbitalSpeed * Math.sqrt(m.starMass * (2 / r - 1 / m.semiMajorAxis));
/** Solve Kepler's equation E − e sin E = M by Newton's method. */
export function eccentricAnomaly(meanAnomaly: number, e: number) {
  let E = e < 0.8 ? meanAnomaly : Math.PI;
  for (let i = 0; i < 30; i++) {
    const step = (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
    E -= step;
    if (Math.abs(step) < 1e-12) break;
  }
  return E;
}
/** Position (AU, star at origin, perihelion on +x) after a fraction of one period. */
export function orbitPosition(m: Orbit, fraction: number) {
  const E = eccentricAnomaly(2 * Math.PI * fraction, m.eccentricity),
    a = m.semiMajorAxis,
    e = m.eccentricity;
  const x = a * (Math.cos(E) - e),
    y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  return { x, y, r: Math.hypot(x, y) };
}

/* ---------- Gravity ---------- */

export const relativeGravity = (m: Extract<AstronomyModel, { kind: "gravity" }>) =>
  (m.massA * m.massB) / m.separation ** 2;
/** Surface (or any radius) gravitational field in m/s² from GM (m³/s²) and r (km). */
export const fieldStrength = (gm: number, rKm: number) => gm / (rKm * 1000) ** 2;

type Launch = Extract<AstronomyModel, { kind: "launch" }>;
export const circularSpeed = (gm: number, rKm: number) => Math.sqrt(gm / (rKm * 1000)) / 1000;
export const escapeSpeed = (gm: number, rKm: number) => Math.sqrt((2 * gm) / (rKm * 1000)) / 1000;
export function launchSpeeds(m: Launch) {
  const body = ASTRO_BODIES[m.body],
    r = body.radius + m.altitude;
  return { r, circular: circularSpeed(body.gm, r), escape: escapeSpeed(body.gm, r) };
}
export type LaunchOutcome = "crash" | "orbit" | "escape";
export function launchOutcome(m: Launch): LaunchOutcome {
  if (m.speed >= launchSpeeds(m).escape) return "escape";
  const body = ASTRO_BODIES[m.body],
    r0 = body.radius + m.altitude;
  // A horizontal launch below circular speed is at apoapsis; it clears the body if periapsis does.
  const mu = body.gm / 1e9,
    a = 1 / (2 / r0 - (m.speed * m.speed) / mu);
  const periapsis = Math.min(r0, 2 * a - r0);
  return periapsis > body.radius ? "orbit" : "crash";
}
/**
 * The launched path in km, integrated with velocity Verlet. Bound paths run one period,
 * unbound paths until they leave the frame, and both stop at the surface.
 */
export function launchPath(m: Launch, steps = 720) {
  const body = ASTRO_BODIES[m.body],
    mu = body.gm / 1e9,
    r0 = body.radius + m.altitude;
  const energy = (m.speed * m.speed) / 2 - mu / r0;
  const span =
    energy < 0
      ? 2 * Math.PI * Math.sqrt((-mu / (2 * energy)) ** 3 / mu)
      : (20 * r0) / Math.max(m.speed, 0.1);
  const dt = span / steps;
  let x = 0,
    y = r0,
    vx = m.speed,
    vy = 0;
  const accel = (px: number, py: number) => {
    const r = Math.hypot(px, py);
    return [(-mu * px) / r ** 3, (-mu * py) / r ** 3] as const;
  };
  let [ax, ay] = accel(x, y);
  const points = [{ x, y }];
  for (let i = 0; i < steps; i++) {
    x += vx * dt + 0.5 * ax * dt * dt;
    y += vy * dt + 0.5 * ay * dt * dt;
    const [nx, ny] = accel(x, y);
    vx += 0.5 * (ax + nx) * dt;
    vy += 0.5 * (ay + ny) * dt;
    ax = nx;
    ay = ny;
    const r = Math.hypot(x, y);
    if (r <= body.radius) {
      const s = body.radius / r;
      points.push({ x: x * s, y: y * s });
      break;
    }
    points.push({ x, y });
    if (r > 7 * r0) break;
  }
  return points;
}

/** Tidal stretch of the Moon relative to today's (inverse cube of distance). */
export const lunarTide = (moonDistance: number) =>
  (ASTRO.moonDistanceEarthRadii / moonDistance) ** 3;
export function tideRange(m: Extract<AstronomyModel, { kind: "tides" }>) {
  const lunar = lunarTide(m.moonDistance);
  return m.sunAligned ? lunar + ASTRO.solarTideRatio : lunar - ASTRO.solarTideRatio;
}

/* ---------- Light ---------- */

type Light = Extract<AstronomyModel, { kind: "light" }>;
export const distanceInMetres = (distance: number, unit: Light["unit"]) =>
  distance * (unit === "au" ? ASTRO.AU : unit === "pc" ? ASTRO.AU * ASTRO.pcInAu : ASTRO.ly);
/** Energy flux in W/m²: F = L/(4πd²). */
export const flux = (m: Light) =>
  (m.luminosity * ASTRO.sunLuminosity) / (4 * Math.PI * distanceInMetres(m.distance, m.unit) ** 2);
export const parallaxDistance = (p: number) => 1 / p;

/** Peak wavelength in nm by Wien's law. */
export const wienPeak = (temperature: number) => ASTRO.wien / temperature;
/** Planck spectrum shape B_λ(T), normalised so its peak is 1 at that temperature. */
export function planckShape(wavelengthNm: number, temperature: number) {
  const b = (l: number) => l ** -5 / Math.expm1(ASTRO.planck2 / (l * temperature));
  return b(wavelengthNm) / b(wienPeak(temperature));
}
/** Approximate sRGB colour of a blackbody as seen by eye (Tanner Helland's fit, 1,000–40,000 K). */
export function blackbodyColour(temperature: number) {
  const t = clamp(temperature, 1000, 40000) / 100;
  const r = t <= 66 ? 255 : 329.7 * (t - 60) ** -0.1332;
  const g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * (t - 60) ** -0.0755;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  const hex = (v: number) =>
    Math.round(clamp(v, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return "#" + hex(r) + hex(g) + hex(b);
}
/** Observed wavelength for a radial velocity (non-relativistic Doppler): λ = λ₀(1 + v/c). */
export const dopplerWavelength = (rest: number, velocity: number) =>
  rest * (1 + velocity / ASTRO.c);

/* ---------- Stars ---------- */

/** Luminosity in solar units from radius and temperature: L = R²(T/T☉)⁴. */
export const stellarLuminosity = (radius: number, temperature: number) =>
  radius ** 2 * (temperature / ASTRO.sunTemperature) ** 4;
export const radiusForLuminosity = (luminosity: number, temperature: number) =>
  Math.sqrt(luminosity) / (temperature / ASTRO.sunTemperature) ** 2;
/** Named reference stars: temperature (K) and luminosity (L☉), rounded catalogue values. */
export const HR_STARS = [
  { name: "Sun", temperature: 5772, luminosity: 1 },
  { name: "Sirius A", temperature: 9940, luminosity: 25 },
  { name: "Vega", temperature: 9600, luminosity: 40 },
  { name: "Spica", temperature: 25300, luminosity: 20000 },
  { name: "Rigel", temperature: 12100, luminosity: 120000 },
  { name: "Betelgeuse", temperature: 3600, luminosity: 100000 },
  { name: "Aldebaran", temperature: 3900, luminosity: 440 },
  { name: "Arcturus", temperature: 4290, luminosity: 170 },
  { name: "Proxima Centauri", temperature: 3040, luminosity: 0.0017 },
  { name: "Sirius B", temperature: 25000, luminosity: 0.056 },
] as const;
/** A rough main-sequence ridge (temperature K, luminosity L☉) for drawing only. */
export const MAIN_SEQUENCE = [
  [40000, 300000],
  [30000, 50000],
  [20000, 5000],
  [10000, 40],
  [7500, 5],
  [5772, 1],
  [4500, 0.2],
  [3500, 0.03],
  [3000, 0.002],
] as const;

/** Main-sequence lifetime in billions of years, scaled from the Sun's 10 billion: t ∝ M^−2.5. */
export const mainSequenceLifetime = (mass: number) => 10 * mass ** -2.5;
/** Main-sequence luminosity approximation L ∝ M^3.5. */
export const mainSequenceLuminosity = (mass: number) => mass ** 3.5;
export type StellarFate = "white dwarf" | "neutron star" | "black hole";
/** End states by initial mass following OpenStax Astronomy 2e Table 23.1. */
export const stellarFate = (mass: number): StellarFate =>
  mass < 10 ? "white dwarf" : mass <= 40 ? "neutron star" : "black hole";

/* ---------- Cosmos ---------- */

type Expansion = Extract<AstronomyModel, { kind: "expansion" }>;
export const hubbleVelocity = (m: Expansion) => m.hubbleConstant * m.distance;
export const hubbleTime = (hubbleConstant: number) => ASTRO.hubbleTimeGyr / hubbleConstant;

/* ---------- Shared views ---------- */

export function astronomyTimed(m: AstronomyModel) {
  return ["sky", "moon", "orbit", "launch", "tides", "parallax", "life", "expansion"].includes(
    m.kind,
  );
}
/** Starting playback fraction for a case. The Moon starts at its given day. */
export const astronomyStart = (m: AstronomyModel) =>
  m.kind === "moon" ? m.day / ASTRO.synodicMonth : 0;
/** What the playback slider measures, with its full span. */
export function astronomyClock(m: AstronomyModel): { label: string; unit: string; span: number } {
  switch (m.kind) {
    case "sky":
      return { label: "Hours watched", unit: "h", span: m.hours };
    case "moon":
      return { label: "Days after new moon", unit: "d", span: ASTRO.synodicMonth };
    case "orbit":
      return { label: "Fraction of one orbit", unit: "%", span: 100 };
    case "launch":
      return { label: "Flight progress", unit: "%", span: 100 };
    case "tides":
      return { label: "Hours of Earth's rotation", unit: "h", span: 24.8 };
    case "parallax":
      return { label: "Months through the year", unit: "mo", span: 12 };
    case "life":
      return { label: "Progress through the star's life", unit: "%", span: 100 };
    case "expansion":
      return { label: "Expansion progress", unit: "%", span: 100 };
    default:
      return { label: "Progress", unit: "%", span: 100 };
  }
}

const signed = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + astroNumber(Math.abs(v));
const deg = (v: number) => signed(v) + "°";

/** A plain-language statement of the model's given values, for tutors and screen readers. */
export function astronomyGivens(m: AstronomyModel): string {
  switch (m.kind) {
    case "sky":
      return `Observer at latitude ${deg(m.latitude)}; star at declination ${deg(m.declination)}; the sky is watched for ${astroNumber(m.hours)} hours`;
    case "seasons":
      return `Observer at latitude ${deg(m.latitude)} on the ${dateNames[m.date]}; axial tilt ${astroNumber(m.tilt)}°`;
    case "moon":
      return `The Moon ${astroNumber(m.day)} days after new moon; synodic month ${ASTRO.synodicMonth} days`;
    case "eclipse":
      return `A ${m.alignment} moon lying ${astroNumber(Math.abs(m.moonLatitude))}° ${m.moonLatitude >= 0 ? "north" : "south"} of the ecliptic`;
    case "orbit":
      return `Orbit with semi-major axis ${astroNumber(m.semiMajorAxis)} AU and eccentricity ${astroNumber(m.eccentricity)} around a star of ${astroNumber(m.starMass)} solar masses`;
    case "gravity":
      return `Masses of ${astroNumber(m.massA)} and ${astroNumber(m.massB)} units separated by ${astroNumber(m.separation)} distance units`;
    case "launch":
      return `Horizontal launch at ${astroNumber(m.speed)} km/s from ${astroNumber(m.altitude)} km above ${ASTRO_BODIES[m.body].name} (radius ${astroNumber(ASTRO_BODIES[m.body].radius)} km)`;
    case "tides":
      return `Moon at ${astroNumber(m.moonDistance)} Earth radii; Sun ${m.sunAligned ? "in line with" : "at right angles to"} the Earth–Moon line`;
    case "light":
      return `Source of ${astroNumber(m.luminosity)} solar luminosities seen from ${astroNumber(m.distance)} ${m.unit === "au" ? "AU" : m.unit === "pc" ? "parsecs" : "light-years"}`;
    case "parallax":
      return `Star with a parallax of ${astroNumber(m.parallax)} arcseconds, measured from Earth's orbit of radius 1 AU`;
    case "blackbody":
      return `Blackbody at ${astroNumber(m.temperature)} K`;
    case "doppler":
      return `Spectral line with laboratory wavelength ${astroNumber(m.restWavelength)} nm from a source moving ${m.velocity >= 0 ? "away" : "towards us"} at ${astroNumber(Math.abs(m.velocity))} km/s`;
    case "hr":
      return `Star with surface temperature ${astroNumber(m.temperature)} K and radius ${astroNumber(m.radius)} solar radii`;
    case "life":
      return `Star of initial mass ${astroNumber(m.mass)} solar masses`;
    case "expansion":
      return `Hubble constant ${astroNumber(m.hubbleConstant)} km/s per Mpc; galaxy at ${astroNumber(m.distance)} Mpc`;
  }
}

export interface AstronomyMeasure {
  label: string;
  value: string;
}
/** Worked results for the case's givens. Shown only after the learner has answered. */
export function astronomyMeasures(m: AstronomyModel): AstronomyMeasure[] {
  switch (m.kind) {
    case "sky": {
      const high = meridianAltitude(m.latitude, m.declination);
      return [
        { label: "Celestial pole altitude", value: astroNumber(Math.abs(m.latitude)) + "°" },
        { label: "Highest altitude", value: astroNumber(high) + "°" },
        {
          label: "Behaviour",
          value: isCircumpolar(m.latitude, m.declination)
            ? "circumpolar: never sets"
            : high <= 0
              ? "never rises"
              : "rises and sets",
        },
        { label: "Turn in this time", value: astroNumber(15 * m.hours) + "° (at 15° per hour)" },
      ];
    }
    case "seasons": {
      const d = sunDeclination(m),
        noon = noonSunAltitude(m.latitude, d);
      return [
        { label: "Sun's declination", value: deg(d) },
        {
          label: "Noon Sun altitude",
          value: noon > 0 ? astroNumber(noon) + "°" : "below the horizon",
        },
        { label: "Daylight", value: astroNumber(daylightHours(m.latitude, d), 1) + " h" },
      ];
    }
    case "moon":
      return [
        { label: "Phase", value: moonPhaseName(m.day) },
        { label: "Sun–Earth–Moon angle", value: astroNumber(moonElongation(m.day), 1) + "°" },
        { label: "Disc lit", value: astroNumber(100 * moonIllumination(m.day), 1) + "%" },
        {
          label: "Highest at about",
          value: astroNumber(moonTransitHour(m.day), 1) + " h local time",
        },
      ];
    case "eclipse":
      return [
        {
          label: "Result",
          value: eclipseOccurs(m)
            ? m.alignment === "new"
              ? "solar eclipse somewhere on Earth"
              : "lunar eclipse"
            : "no eclipse: the Moon passes " + (m.moonLatitude > 0 ? "north" : "south"),
        },
        { label: "Model limit", value: "|latitude| < " + ECLIPSE_LIMIT[m.alignment] + "°" },
      ];
    case "orbit":
      return [
        {
          label: "Period",
          value: astroNumber(orbitalPeriod(m.semiMajorAxis, m.starMass), 3) + " yr",
        },
        { label: "Closest approach", value: astroNumber(perihelion(m), 3) + " AU" },
        { label: "Farthest point", value: astroNumber(aphelion(m), 3) + " AU" },
        {
          label: "Speed at closest ÷ farthest",
          value: astroNumber((1 + m.eccentricity) / (1 - m.eccentricity), 3),
        },
      ];
    case "gravity":
      return [{ label: "Force (relative units)", value: astroNumber(relativeGravity(m), 4) }];
    case "launch": {
      const s = launchSpeeds(m);
      return [
        { label: "Circular speed here", value: astroNumber(s.circular, 2) + " km/s" },
        { label: "Escape speed here", value: astroNumber(s.escape, 2) + " km/s" },
        {
          label: "Outcome",
          value: {
            crash: "falls back to the surface",
            orbit: "closed orbit",
            escape: "escapes",
          }[launchOutcome(m)],
        },
      ];
    }
    case "tides":
      return [
        { label: "Lunar tide vs today", value: astroNumber(lunarTide(m.moonDistance), 3) + "×" },
        {
          label: m.sunAligned ? "Spring-tide stretch" : "Neap-tide stretch",
          value: astroNumber(tideRange(m), 3) + "× today's lunar tide",
        },
      ];
    case "light": {
      const f = flux(m);
      return [
        { label: "Flux", value: astroNumber(f, 3) + " W/m²" },
        { label: "Compared with sunlight at Earth", value: astroNumber(f / 1361, 3) + "×" },
      ];
    }
    case "parallax": {
      const d = parallaxDistance(m.parallax);
      return [
        { label: "Distance", value: astroNumber(d, 3) + " pc" },
        { label: "In light-years", value: astroNumber(d * ASTRO.lyPerPc, 3) + " ly" },
      ];
    }
    case "blackbody":
      return [{ label: "Peak wavelength", value: astroNumber(wienPeak(m.temperature), 1) + " nm" }];
    case "doppler": {
      const l = dopplerWavelength(m.restWavelength, m.velocity);
      return [
        { label: "Observed wavelength", value: astroNumber(l, 2) + " nm" },
        { label: "Shift", value: signed(l - m.restWavelength) + " nm" },
      ];
    }
    case "hr":
      return [
        {
          label: "Luminosity",
          value: astroNumber(stellarLuminosity(m.radius, m.temperature), 3) + " L☉",
        },
      ];
    case "life":
      return [
        {
          label: "Main-sequence lifetime",
          value: astroNumber(mainSequenceLifetime(m.mass), 3) + " billion years",
        },
        {
          label: "Main-sequence luminosity",
          value: astroNumber(mainSequenceLuminosity(m.mass), 3) + " L☉",
        },
        { label: "End state", value: stellarFate(m.mass) },
      ];
    case "expansion":
      return [
        { label: "Recession velocity", value: astroNumber(hubbleVelocity(m), 1) + " km/s" },
        { label: "1/H₀", value: astroNumber(hubbleTime(m.hubbleConstant), 2) + " billion years" },
      ];
  }
}
