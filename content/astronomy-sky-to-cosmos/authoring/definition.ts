import type {
  AstronomyDiagram,
  AstronomyModel,
  CourseBundle,
  Question,
} from "../../../packages/contracts/src/index.js";

export type DraftQuestion = Omit<Question, "id" | "conceptIds" | "sourceIds">;
export interface TeachingLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceIds: string[];
  beats: Array<{ title: string; text: string; diagram: AstronomyDiagram }>;
  questions: DraftQuestion[];
  cards: Array<{ front: string; back: string; answerAuthority: Question["answerAuthority"] }>;
}

/**
 * A calculated answer. `tolerance` is the absolute tolerance the prompt's rounding allows; an
 * exact answer keeps the default.
 */
export function numeric(
  prompt: string,
  value: number,
  workedAnswer: string,
  hints: [string, string, string],
  unit: string,
  tolerance = 1e-6,
): DraftQuestion {
  return {
    prompt,
    responseType: "numeric",
    difficulty: 1,
    hints,
    answerAuthority: {
      kind: "numeric",
      value,
      unit,
      absoluteTolerance: tolerance,
      relativeTolerance: 0,
      workedAnswer,
    },
  };
}
export function choose(
  prompt: string,
  labels: string[],
  correct: number,
  reason: string,
  hint: string,
): DraftQuestion {
  return {
    prompt,
    responseType: "short_text",
    difficulty: 1,
    hints: [hint],
    choices: labels.map((label, i) => ({ id: String(i + 1), label })),
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [labels[correct]!],
      rejectedIdeas: [],
      exampleAnswer: reason,
    },
  };
}
/** A short exact term: the first accepted form is canonical, the rest are alternatives. */
export function term(
  prompt: string,
  accepted: string[],
  exampleAnswer: string,
  hint: string,
): DraftQuestion {
  return {
    prompt,
    responseType: "short_text",
    difficulty: 1,
    hints: [hint],
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [accepted[0]!],
      ...(accepted.length > 1 ? { acceptedAlternatives: accepted.slice(1) } : {}),
      rejectedIdeas: [],
      exampleAnswer,
    },
  };
}
export function card(front: string, value: number, back: string, unit: string, tolerance = 1e-6) {
  return {
    front,
    back,
    answerAuthority: {
      kind: "numeric" as const,
      value,
      unit,
      absoluteTolerance: tolerance,
      relativeTolerance: 0,
      workedAnswer: back,
    },
  };
}
type Case = [string, AstronomyModel];
export function beat(title: string, text: string, ...cases: [Case, Case] | [Case, Case, Case]) {
  const ids = ["first", "second", "third"];
  return {
    title,
    text,
    diagram: {
      type: "astronomy_explorer" as const,
      cases: cases.map(([label, model], i) => ({ id: ids[i]!, label, model })),
      initialCaseId: "first",
    },
  };
}

export const sky = (latitude: number, declination: number, hours = 12): AstronomyModel => ({
  kind: "sky",
  latitude,
  declination,
  hours,
});
export const seasons = (
  latitude: number,
  date: "march-equinox" | "june-solstice" | "september-equinox" | "december-solstice",
  tilt = 23.4,
): AstronomyModel => ({ kind: "seasons", latitude, date, tilt });
export const moon = (day: number): AstronomyModel => ({ kind: "moon", day });
export const eclipse = (alignment: "new" | "full", moonLatitude: number): AstronomyModel => ({
  kind: "eclipse",
  alignment,
  moonLatitude,
});
export const orbit = (semiMajorAxis: number, eccentricity = 0, starMass = 1): AstronomyModel => ({
  kind: "orbit",
  semiMajorAxis,
  eccentricity,
  starMass,
});
export const gravity = (massA: number, massB: number, separation: number): AstronomyModel => ({
  kind: "gravity",
  massA,
  massB,
  separation,
});
export const launch = (
  body: "earth" | "moon" | "mars" | "jupiter",
  altitude: number,
  speed: number,
): AstronomyModel => ({ kind: "launch", body, altitude, speed });
export const tides = (moonDistance: number, sunAligned: boolean): AstronomyModel => ({
  kind: "tides",
  moonDistance,
  sunAligned,
});
export const light = (
  luminosity: number,
  distance: number,
  unit: "au" | "pc" | "ly" = "au",
): AstronomyModel => ({ kind: "light", luminosity, distance, unit });
export const parallax = (p: number): AstronomyModel => ({ kind: "parallax", parallax: p });
export const blackbody = (temperature: number): AstronomyModel => ({
  kind: "blackbody",
  temperature,
});
export const doppler = (restWavelength: number, velocity: number): AstronomyModel => ({
  kind: "doppler",
  restWavelength,
  velocity,
});
export const hr = (temperature: number, radius: number): AstronomyModel => ({
  kind: "hr",
  temperature,
  radius,
});
export const life = (mass: number): AstronomyModel => ({ kind: "life", mass });
export const expansion = (hubbleConstant: number, distance: number): AstronomyModel => ({
  kind: "expansion",
  hubbleConstant,
  distance,
});

const openstax = [
  ["astro-sky", "2.1", "The Sky Above", "2-1-the-sky-above"],
  ["astro-earth-sky", "4.1", "Earth and Sky", "4-1-earth-and-sky"],
  ["astro-seasons", "4.2", "The Seasons", "4-2-the-seasons"],
  ["astro-moon", "4.5", "Phases and Motions of the Moon", "4-5-phases-and-motions-of-the-moon"],
  ["astro-tides", "4.6", "Ocean Tides and the Moon", "4-6-ocean-tides-and-the-moon"],
  ["astro-eclipses", "4.7", "Eclipses of the Sun and Moon", "4-7-eclipses-of-the-sun-and-moon"],
  ["astro-kepler", "3.1", "The Laws of Planetary Motion", "3-1-the-laws-of-planetary-motion"],
  [
    "astro-gravitation",
    "3.3",
    "Newton's Universal Law of Gravitation",
    "3-3-newtons-universal-law-of-gravitation",
  ],
  ["astro-orbits", "3.4", "Orbits in the Solar System", "3-4-orbits-in-the-solar-system"],
  [
    "astro-satellites",
    "3.5",
    "Motions of Satellites and Spacecraft",
    "3-5-motions-of-satellites-and-spacecraft",
  ],
  ["astro-spectrum", "5.2", "The Electromagnetic Spectrum", "5-2-the-electromagnetic-spectrum"],
  ["astro-doppler", "5.6", "The Doppler Effect", "5-6-the-doppler-effect"],
  ["astro-brightness", "17.1", "The Brightness of Stars", "17-1-the-brightness-of-stars"],
  ["astro-colours", "17.2", "Colors of Stars", "17-2-colors-of-stars"],
  ["astro-parallax", "19.2", "Surveying the Stars", "19-2-surveying-the-stars"],
  ["astro-hr", "18.4", "The H–R Diagram", "18-4-the-h-r-diagram"],
  [
    "astro-lifetimes",
    "22.1",
    "Evolution from the Main Sequence to Red Giants",
    "22-1-evolution-from-the-main-sequence-to-red-giants",
  ],
  [
    "astro-massive",
    "23.2",
    "Evolution of Massive Stars: An Explosive Finish",
    "23-2-evolution-of-massive-stars-an-explosive-finish",
  ],
  ["astro-galaxies", "26.1", "The Discovery of Galaxies", "26-1-the-discovery-of-galaxies"],
  ["astro-expanding", "26.5", "The Expanding Universe", "26-5-the-expanding-universe"],
  ["astro-age", "29.1", "The Age of the Universe", "29-1-the-age-of-the-universe"],
  ["astro-cmb", "29.4", "The Cosmic Microwave Background", "29-4-the-cosmic-microwave-background"],
] as const;
const nasa = [
  [
    "nasa-earth",
    "Earth Fact Sheet",
    "https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html",
    "Earth: GM 0.39860 × 10⁶ km³/s², mean radius 6,371 km, obliquity 23.44°, mean orbital velocity 29.78 km/s, escape velocity 11.186 km/s",
  ],
  [
    "nasa-sun",
    "Sun Fact Sheet",
    "https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html",
    "Sun: GM 132,712 × 10⁶ km³/s², luminosity 382.8 × 10²⁴ W, effective temperature 5,772 K, radius 695,700 km",
  ],
  [
    "nasa-moon",
    "Moon Fact Sheet",
    "https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html",
    "Moon: GM 0.00490 × 10⁶ km³/s², mean radius 1,737.4 km, semi-major axis 384,400 km, synodic period 29.53 days, inclination 5.145°",
  ],
  [
    "nasa-planets",
    "Planetary Fact Sheet, with the Mars and Jupiter sheets",
    "https://nssdc.gsfc.nasa.gov/planetary/factsheet/",
    "Planets: distances, periods and eccentricities; Mars GM 0.042828 × 10⁶ km³/s² and radius 3,389.5 km; Jupiter GM 126.687 × 10⁶ km³/s² and 11.862-year period",
  ],
] as const;
export const sources: CourseBundle["sources"] = [
  ...openstax.map(([id, section, title, slug]) => ({
    id,
    title,
    publisher: "OpenStax, Rice University",
    url: "https://openstax.org/books/astronomy-2e/pages/" + slug,
    section: section + ", " + title,
    edition: "Astronomy, second edition (2022)",
    accessedAt: "2026-10-06",
    reuse: "reference_only" as const,
    licence: "CC BY-NC-SA 4.0 (current web edition); reference only",
    licenceUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    attribution:
      "Andrew Fraknoi, David Morrison and Sidney C. Wolff, OpenStax, Astronomy 2e, " +
      section +
      ".",
    notes:
      "Standard astronomical relationships and values checked against this section. Discere prose, examples, problems and SVG models are original. No publisher exercises, figures or prose are redistributed.",
  })),
  ...nasa.map(([id, title, url, section]) => ({
    id,
    title,
    publisher: "NASA Space Science Data Coordinated Archive",
    url,
    section,
    edition: "NSSDCA planetary fact sheets, web edition",
    accessedAt: "2026-10-06",
    reuse: "reference_only" as const,
    licence: "Public domain (United States government work)",
    licenceUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
    attribution: "Dr David R. Williams, NASA Goddard Space Flight Center, " + title + ".",
    notes:
      "Physical constants and orbital values only. Numbers are rounded as each problem states; nothing else is copied.",
  })),
];
