import { describe, expect, it } from "vitest";
import { AstronomyModelSchema, type AstronomyModel } from "@discere/contracts";
import {
  ASTRO,
  ASTRO_BODIES,
  angularDiameter,
  astronomyGivens,
  astronomyMeasures,
  blackbodyColour,
  circularSpeed,
  daylightHours,
  dopplerWavelength,
  eclipseOccurs,
  escapeSpeed,
  fieldStrength,
  flux,
  hubbleTime,
  isCircumpolar,
  launchOutcome,
  launchPath,
  mainSequenceLifetime,
  meridianAltitude,
  moonIllumination,
  moonPhaseName,
  noonSunAltitude,
  orbitPosition,
  orbitalPeriod,
  planckShape,
  skyVector,
  starAltitude,
  stellarFate,
  stellarLuminosity,
  sunDeclination,
  wienPeak,
} from "../src/astronomy.js";

describe("astronomy models agree with physical constraints", () => {
  it("places stars consistently on the sky", () => {
    // A star at declination equal to the latitude passes through the zenith.
    expect(starAltitude(40, 40, 0)).toBeCloseTo(90, 5);
    // The celestial pole sits at an altitude equal to the latitude.
    expect(starAltitude(52, 89.999999, 37)).toBeCloseTo(52, 4);
    for (const h of [-120, -30, 0, 45, 170]) {
      const v = skyVector(33, -12, h);
      expect(Math.hypot(v.east, v.north, v.up)).toBeCloseTo(1, 12);
    }
    // Westward hour angle moves a southern-sky star towards the west.
    expect(skyVector(50, 0, 30).east).toBeLessThan(0);
    expect(meridianAltitude(52, 10)).toBe(48);
    expect(isCircumpolar(52, 50)).toBe(true);
    expect(isCircumpolar(52, 30)).toBe(false);
  });
  it("derives noon altitude and daylight from tilt and latitude", () => {
    const june = { kind: "seasons", latitude: 51.5, date: "june-solstice", tilt: 23.4 } as const;
    expect(sunDeclination(june)).toBe(23.4);
    expect(noonSunAltitude(51.5, 23.4)).toBeCloseTo(61.9, 9);
    expect(daylightHours(0, 23.4)).toBeCloseTo(12, 9);
    expect(daylightHours(40, 0)).toBeCloseTo(12, 9);
    expect(daylightHours(51.5, 23.4)).toBeGreaterThan(16);
    expect(daylightHours(80, -23.4)).toBe(0);
    expect(sunDeclination({ ...june, tilt: 0 })).toBe(0);
  });
  it("lights the Moon by the angle between Sun and Moon", () => {
    expect(moonIllumination(0)).toBeCloseTo(0, 12);
    expect(moonIllumination(ASTRO.synodicMonth / 2)).toBeCloseTo(1, 12);
    expect(moonIllumination(ASTRO.synodicMonth / 4)).toBeCloseTo(0.5, 12);
    expect(moonPhaseName(ASTRO.synodicMonth / 4)).toBe("first quarter");
    expect(moonPhaseName((3 * ASTRO.synodicMonth) / 4)).toBe("third quarter");
    expect(angularDiameter(3474.8, 384400)).toBeCloseTo(0.518, 3);
    expect(angularDiameter(1391400, 149.6e6)).toBeCloseTo(0.533, 3);
    expect(eclipseOccurs({ kind: "eclipse", alignment: "full", moonLatitude: 0.3 })).toBe(true);
    expect(eclipseOccurs({ kind: "eclipse", alignment: "full", moonLatitude: 4 })).toBe(false);
  });
  it("solves Kepler's equation and sweeps equal areas in equal times", () => {
    const m = { kind: "orbit", semiMajorAxis: 2, eccentricity: 0.6, starMass: 1 } as const;
    expect(orbitalPeriod(4)).toBe(8);
    expect(orbitalPeriod(1, 4)).toBe(0.5);
    expect(orbitPosition(m, 0).r).toBeCloseTo(0.8, 12);
    expect(orbitPosition(m, 0.5).r).toBeCloseTo(3.2, 12);
    // Shoelace areas of twelve equal-time sectors are equal.
    const areas = Array.from({ length: 12 }, (_, k) => {
      let area = 0;
      for (let i = 0; i < 400; i++) {
        const a = orbitPosition(m, (k + i / 400) / 12),
          b = orbitPosition(m, (k + (i + 1) / 400) / 12);
        area += (a.x * b.y - b.x * a.y) / 2;
      }
      return area;
    });
    const total = Math.PI * 2 * 2 * Math.sqrt(1 - 0.36);
    for (const area of areas) expect(area).toBeCloseTo(total / 12, 3);
  });
  it("reproduces Earth's orbital, circular and escape speeds", () => {
    expect(Math.sqrt(ASTRO.sunGM / ASTRO.AU) / 1000).toBeCloseTo(ASTRO.earthOrbitalSpeed, 1);
    expect(escapeSpeed(ASTRO_BODIES.earth.gm, 6371)).toBeCloseTo(11.186, 2);
    expect(circularSpeed(ASTRO_BODIES.earth.gm, 6371 + 400)).toBeCloseTo(7.67, 2);
    expect(fieldStrength(ASTRO_BODIES.earth.gm, 6371)).toBeCloseTo(9.82, 2);
    // G × Earth's mass agrees with the fact-sheet GM.
    expect((ASTRO.G * 5.9722e24) / ASTRO_BODIES.earth.gm).toBeCloseTo(1, 3);
  });
  it("integrates launch paths that crash, orbit and escape", () => {
    const base = { kind: "launch", body: "earth", altitude: 400 } as const;
    expect(launchOutcome({ ...base, speed: 5 })).toBe("crash");
    expect(launchOutcome({ ...base, speed: 7.67 })).toBe("orbit");
    expect(launchOutcome({ ...base, speed: 11 })).toBe("escape");
    const circle = launchPath({ ...base, speed: circularSpeed(ASTRO_BODIES.earth.gm, 6771) });
    for (const p of circle) expect(Math.hypot(p.x, p.y)).toBeCloseTo(6771, -1);
    const crash = launchPath({ ...base, speed: 3 });
    const last = crash[crash.length - 1]!;
    expect(Math.hypot(last.x, last.y)).toBeCloseTo(6371, 3);
    const away = launchPath({ ...base, speed: 12 });
    const end = away[away.length - 1]!;
    expect(Math.hypot(end.x, end.y)).toBeGreaterThan(6 * 6771);
  });
  it("spreads light by the inverse square and reads parallax", () => {
    const earth = { kind: "light", luminosity: 1, distance: 1, unit: "au" } as const;
    expect(flux(earth)).toBeCloseTo(1361, -1);
    expect(flux({ ...earth, distance: 3 }) / flux(earth)).toBeCloseTo(1 / 9, 12);
    const pc = { kind: "light", luminosity: 1, distance: 1, unit: "pc" } as const;
    expect(flux(earth) / flux(pc)).toBeCloseTo(ASTRO.pcInAu ** 2, -3);
  });
  it("matches Wien's law, Planck's peak and stellar colours", () => {
    expect(wienPeak(5772)).toBeCloseTo(502.1, 1);
    expect(wienPeak(2.725) / 1e6).toBeCloseTo(1.063, 3);
    expect(planckShape(wienPeak(8000), 8000)).toBeCloseTo(1, 12);
    expect(planckShape(wienPeak(8000) * 1.01, 8000)).toBeLessThan(1);
    expect(planckShape(wienPeak(8000) * 0.99, 8000)).toBeLessThan(1);
    const hot = blackbodyColour(30000),
      cool = blackbodyColour(3000);
    expect(parseInt(hot.slice(5, 7), 16)).toBeGreaterThan(parseInt(hot.slice(1, 3), 16));
    expect(parseInt(cool.slice(1, 3), 16)).toBeGreaterThan(parseInt(cool.slice(5, 7), 16));
    expect(dopplerWavelength(656.28, 3000)).toBeCloseTo(656.28 * (1 + 3000 / 299792.458), 12);
    expect(dopplerWavelength(500, -30000)).toBeLessThan(500);
  });
  it("relates luminosity, radius, temperature, lifetime and fate", () => {
    expect(stellarLuminosity(1, 5772)).toBe(1);
    expect(stellarLuminosity(2, 5772 * 2)).toBeCloseTo(64, 12);
    expect(mainSequenceLifetime(1)).toBe(10);
    expect(mainSequenceLifetime(4)).toBeCloseTo(10 / 32, 12);
    // OpenStax Table 22.1 lists about 500 million years for 3.3 solar masses.
    expect(mainSequenceLifetime(3.3)).toBeCloseTo(0.5, 1);
    expect(stellarFate(1)).toBe("white dwarf");
    expect(stellarFate(15)).toBe("neutron star");
    expect(stellarFate(50)).toBe("black hole");
    expect(hubbleTime(70)).toBeCloseTo(13.97, 2);
  });
  it("keeps results out of the givens for every kind", () => {
    const models: AstronomyModel[] = [
      { kind: "sky", latitude: 52, declination: 20, hours: 6 },
      { kind: "seasons", latitude: 51.5, date: "june-solstice", tilt: 23.4 },
      { kind: "moon", day: 7 },
      { kind: "eclipse", alignment: "new", moonLatitude: 3 },
      { kind: "orbit", semiMajorAxis: 4, eccentricity: 0.2, starMass: 1 },
      { kind: "gravity", massA: 2, massB: 3, separation: 2 },
      { kind: "launch", body: "earth", altitude: 400, speed: 7 },
      { kind: "tides", moonDistance: 60.3, sunAligned: true },
      { kind: "light", luminosity: 1, distance: 3, unit: "au" },
      { kind: "parallax", parallax: 0.25 },
      { kind: "blackbody", temperature: 5800 },
      { kind: "doppler", restWavelength: 656.28, velocity: 3000 },
      { kind: "hr", temperature: 11544, radius: 1 },
      { kind: "life", mass: 4 },
      { kind: "expansion", hubbleConstant: 70, distance: 100 },
    ];
    for (const m of models) {
      expect(AstronomyModelSchema.parse(m)).toEqual(m);
      expect(astronomyGivens(m).length).toBeGreaterThan(10);
      expect(astronomyMeasures(m).length).toBeGreaterThan(0);
    }
    expect(astronomyGivens(models[4]!)).not.toMatch(/\b8\b/);
    expect(astronomyGivens(models[9]!)).not.toMatch(/\b4\b/);
    expect(astronomyGivens(models[14]!)).not.toMatch(/7,?000/);
  });
});
