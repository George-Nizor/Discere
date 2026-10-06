import { z } from "zod";

const latitude = z.number().min(-80).max(80);
/** Only given quantities belong in these bounded models. Derived results stay out of payloads. */
export const AstronomyModelSchema = z.discriminatedUnion("kind", [
  /** A star's daily circle as seen by an observer at a latitude, over a number of hours. */
  z
    .object({
      kind: z.literal("sky"),
      latitude,
      declination: z.number().min(-89).max(89),
      hours: z.number().min(1).max(24),
    })
    .strict(),
  /** Earth at one of the four key dates, its axial tilt, and an observer's latitude. */
  z
    .object({
      kind: z.literal("seasons"),
      latitude,
      date: z.enum(["march-equinox", "june-solstice", "september-equinox", "december-solstice"]),
      tilt: z.number().min(0).max(60),
    })
    .strict(),
  /** The Moon a number of days after new moon. */
  z.object({ kind: z.literal("moon"), day: z.number().min(0).max(29.5) }).strict(),
  /** A new or full moon and how far the Moon lies north or south of the ecliptic, in degrees. */
  z
    .object({
      kind: z.literal("eclipse"),
      alignment: z.enum(["new", "full"]),
      moonLatitude: z.number().min(-6).max(6),
    })
    .strict(),
  /** A bound orbit: semi-major axis in AU, eccentricity and central mass in solar masses. */
  z
    .object({
      kind: z.literal("orbit"),
      semiMajorAxis: z.number().min(0.2).max(40),
      eccentricity: z.number().min(0).max(0.9),
      starMass: z.number().min(0.1).max(10),
    })
    .strict(),
  /** Two masses and their separation in matching relative units. */
  z
    .object({
      kind: z.literal("gravity"),
      massA: z.number().min(0.1).max(100),
      massB: z.number().min(0.1).max(100),
      separation: z.number().min(0.5).max(10),
    })
    .strict(),
  /** A horizontal launch above a named body: height above the surface in km, speed in km/s. */
  z
    .object({
      kind: z.literal("launch"),
      body: z.enum(["earth", "moon", "mars", "jupiter"]),
      altitude: z.number().min(0).max(40000),
      speed: z.number().min(0.5).max(80),
    })
    .strict(),
  /** The Moon's distance in Earth radii and whether Sun and Moon line up with Earth. */
  z
    .object({
      kind: z.literal("tides"),
      moonDistance: z.number().min(20).max(120),
      sunAligned: z.boolean(),
    })
    .strict(),
  /** A source of luminosity in solar units seen from a stated distance. */
  z
    .object({
      kind: z.literal("light"),
      luminosity: z.number().min(0.0001).max(1000000),
      distance: z.number().min(0.01).max(100000),
      unit: z.enum(["au", "pc", "ly"]),
    })
    .strict(),
  /** A nearby star's parallax angle in arcseconds. */
  z.object({ kind: z.literal("parallax"), parallax: z.number().min(0.005).max(1) }).strict(),
  /** A blackbody's temperature in kelvin. */
  z.object({ kind: z.literal("blackbody"), temperature: z.number().min(2).max(60000) }).strict(),
  /** A spectral line's laboratory wavelength in nm and a radial velocity in km/s (away positive). */
  z
    .object({
      kind: z.literal("doppler"),
      restWavelength: z.number().min(380).max(760),
      velocity: z.number().min(-30000).max(30000),
    })
    .strict(),
  /** A star placed on the H–R diagram by surface temperature (K) and radius (solar radii). */
  z
    .object({
      kind: z.literal("hr"),
      temperature: z.number().min(2000).max(50000),
      radius: z.number().min(0.005).max(1500),
    })
    .strict(),
  /** A star's initial mass in solar masses. */
  z.object({ kind: z.literal("life"), mass: z.number().min(0.1).max(60) }).strict(),
  /** Hubble's constant in km/s per Mpc and a highlighted galaxy's distance in Mpc. */
  z
    .object({
      kind: z.literal("expansion"),
      hubbleConstant: z.number().min(40).max(100),
      distance: z.number().min(1).max(1000),
    })
    .strict(),
]);
export const AstronomyDiagramSchema = z
  .object({
    type: z.literal("astronomy_explorer"),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1),
            label: z.string().min(1).max(70),
            model: AstronomyModelSchema,
          })
          .strict(),
      )
      .min(2)
      .max(3),
    initialCaseId: z.string().min(1),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.cases.map((c) => c.id)).size === v.cases.length &&
      v.cases.some((c) => c.id === v.initialCaseId),
    "Use unique cases and an available initial case.",
  );
export type AstronomyModel = z.infer<typeof AstronomyModelSchema>;
export type AstronomyDiagram = z.infer<typeof AstronomyDiagramSchema>;
