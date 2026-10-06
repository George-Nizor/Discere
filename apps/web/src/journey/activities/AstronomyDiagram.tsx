import type { AstronomyDiagram as Spec, AstronomyModel } from "@discere/contracts";
import {
  ASTRO,
  ASTRO_BODIES,
  HR_STARS,
  MAIN_SEQUENCE,
  astroNumber as n,
  astronomyClock,
  astronomyGivens,
  astronomyMeasures,
  astronomyStart,
  astronomyTimed,
  blackbodyColour,
  dateOrbitAngle,
  distanceInMetres,
  dopplerWavelength,
  eclipseOccurs,
  hubbleVelocity,
  launchPath,
  launchSpeeds,
  lunarTide,
  mainSequenceLifetime,
  mainSequenceLuminosity,
  meridianAltitude,
  moonElongation,
  noonSunAltitude,
  orbitPosition,
  planckShape,
  relativeGravity,
  skyHourAngle,
  skyVector,
  stellarFate,
  stellarLuminosity,
  sunDeclination,
  wienPeak,
} from "@discere/activity-engine";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useExperience } from "../../study/experience.js";

const W = 640,
  H = 360;
type Pt = { x: number; y: number };
const path = (points: Pt[], close = false) =>
  points.map((p, i) => (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ") +
  (close ? "Z" : "");
const rad = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function T({
  x,
  y,
  children,
  kind = "label",
  anchor = "middle",
}: {
  x: number;
  y: number;
  children: ReactNode;
  kind?: "label" | "small" | "value" | "title";
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={"astro-" + kind}>
      {children}
    </text>
  );
}

/** A small seeded generator so the starfield is identical on every render and in tests. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const FIELD = (() => {
  const r = seeded(7);
  return Array.from({ length: 70 }, (_, i) => ({
    x: r() * W,
    y: r() * H,
    r: 0.4 + r() * r() * 1.5,
    o: 0.25 + r() * 0.6,
    d: (i % 9) * 0.45,
    id: "star" + i,
    twinkle: i % 3 === 0,
  }));
})();

function Starfield() {
  return (
    <g className="astro-field">
      {FIELD.map((s) => (
        <circle
          key={s.id}
          cx={s.x}
          cy={s.y}
          r={s.r}
          opacity={s.o}
          className={s.twinkle ? "astro-twinkle" : undefined}
          style={s.twinkle ? { animationDelay: s.d + "s" } : undefined}
        />
      ))}
    </g>
  );
}

function Glow({
  x,
  y,
  r,
  colour,
  id,
}: {
  x: number;
  y: number;
  r: number;
  colour: string;
  id: string;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 2.6} fill={"url(#" + id + "-halo)"} style={{ color: colour }} />
      <circle cx={x} cy={y} r={r} fill={colour} filter={"url(#" + id + "-soft)"} />
      <circle cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.45} fill="#fff" opacity="0.55" />
    </g>
  );
}

/* ---------------- The sky dome ---------------- */
function SkyView({
  m,
  f,
  reveal,
}: {
  m: Extract<AstronomyModel, { kind: "sky" }>;
  f: number;
  reveal: boolean;
}) {
  const cx = 320,
    cy = 236,
    R = 178,
    el = 20 * rad,
    turn = 24 * rad;
  // Seen from the east and a little above: north to the right, east nearest the viewer.
  const project = (v: { east: number; north: number; up: number }) => ({
    x: cx + R * (v.north * Math.cos(turn) - v.east * Math.sin(turn)),
    y:
      cy -
      R *
        (v.up * Math.cos(el) - (v.east * Math.cos(turn) + v.north * Math.sin(turn)) * Math.sin(el)),
  });
  const compass = (east: number, north: number) => project({ east, north, up: 0 });
  const full = Array.from({ length: 145 }, (_, i) => {
    const v = skyVector(m.latitude, m.declination, i * 2.5);
    return { ...project(v), up: v.up };
  });
  const segments: Array<{ points: Pt[]; above: boolean; id: string }> = [];
  for (const p of full) {
    const above = p.up >= 0,
      last = segments[segments.length - 1];
    if (last && last.above === above) last.points.push(p);
    else
      segments.push({
        points: last ? [last.points[last.points.length - 1]!, p] : [p],
        above,
        id: "arc" + segments.length,
      });
  }
  const watched = Array.from({ length: 61 }, (_, i) => {
    const v = skyVector(m.latitude, m.declination, skyHourAngle(m, (i / 60) * f));
    return project(v);
  });
  const now = skyVector(m.latitude, m.declination, skyHourAngle(m, f));
  const star = project(now);
  const north = m.latitude >= 0;
  const pole = project({
    east: 0,
    north: north ? Math.cos(m.latitude * rad) : -Math.cos(m.latitude * rad),
    up: Math.sin(Math.abs(m.latitude) * rad),
  });
  const equator = Array.from({ length: 73 }, (_, i) => project(skyVector(m.latitude, 0, i * 5)));
  const horizon = (side: number) =>
    Array.from({ length: 37 }, (_, i) => {
      const a = (side * Math.PI * i) / 36;
      return project({ east: Math.cos(a), north: Math.sin(a), up: 0 });
    });
  const high = meridianAltitude(m.latitude, m.declination);
  return (
    <g>
      <path d={path(horizon(1)) + path(horizon(-1)).replace("M", "L")} className="astro-ground" />
      <ellipse cx={cx} cy={cy} rx={R} ry={R * Math.sin(el)} className="astro-horizon" />
      <path
        d={
          "M" +
          (cx - R) +
          " " +
          cy +
          "A" +
          R +
          " " +
          R * Math.cos(el) +
          " 0 0 1 " +
          (cx + R) +
          " " +
          cy
        }
        className="astro-dome"
      />
      <path d={path(equator)} className="astro-equator" />
      {segments.map((s) => (
        <path
          key={s.id}
          d={path(s.points)}
          className={s.above ? "astro-circle" : "astro-circle-hidden"}
        />
      ))}
      <path d={path(watched)} className="astro-trail" />
      <line x1={cx} y1={cy} x2={pole.x} y2={pole.y} className="astro-axis" />
      <circle cx={pole.x} cy={pole.y} r="4" className="astro-pole" />
      <T
        x={pole.x + (pole.x > cx ? 14 : -14)}
        y={pole.y + 4}
        kind="small"
        anchor={pole.x > cx ? "start" : "end"}
      >
        {north ? "North celestial pole" : "South celestial pole"}
      </T>
      <g className="astro-observer">
        <circle cx={cx} cy={cy - 10} r="4" />
        <path d={"M" + cx + " " + (cy - 6) + "v10m-6 4l6-4 6 4"} />
      </g>
      {(
        [
          ["N", 0, 1.1],
          ["S", 0, -1.1],
          ["E", 1.12, 0],
          ["W", -1.12, 0],
        ] as const
      ).map(([label, e, nn]) => (
        <T key={label} x={compass(e, nn).x} y={compass(e, nn).y + 5} kind="small">
          {label}
        </T>
      ))}
      <g opacity={now.up >= 0 ? 1 : 0.35} data-altitude={(Math.asin(now.up) / rad).toFixed(3)}>
        <circle cx={star.x} cy={star.y} r="16" className="astro-star-halo" />
        <circle cx={star.x} cy={star.y} r="5.5" className="astro-star" />
      </g>
      <T x={22} y={30} kind="label" anchor="start">
        {"Latitude " + n(Math.abs(m.latitude)) + "° " + (m.latitude >= 0 ? "N" : "S")}
      </T>
      <T x={22} y={50} kind="small" anchor="start">
        {"Star's declination " + (m.declination < 0 ? "−" : "+") + n(Math.abs(m.declination)) + "°"}
      </T>
      {reveal ? (
        <T x={618} y={30} kind="value" anchor="end">
          {high > 0 ? "Highest " + n(high, 1) + "°" : "Never rises"}
        </T>
      ) : null}
    </g>
  );
}

/* ---------------- Seasons ---------------- */
function SeasonsView({
  m,
  reveal,
  id,
}: {
  m: Extract<AstronomyModel, { kind: "seasons" }>;
  reveal: boolean;
  id: string;
}) {
  const sx = 186,
    sy = 186,
    rx = 124,
    ry = 58;
  // June is drawn to the left of the Sun, where the north pole (leaning right) faces the Sun.
  const psi = (dateOrbitAngle[m.date] + 90) * rad;
  const ex = sx + rx * Math.cos(psi),
    ey = sy + ry * Math.sin(psi);
  const toSun = Math.atan2(sy - ey, sx - ex);
  const dec = sunDeclination(m),
    alt = noonSunAltitude(m.latitude, dec);
  const gx = 440,
    gy = 290,
    gr = 120;
  const sunAngle = clamp(alt, -10, 90) * rad;
  const ray = { x: gx + gr * Math.cos(sunAngle), y: gy - gr * Math.sin(sunAngle) };
  const pole = m.tilt * rad;
  const er = 24;
  const latAngle = m.latitude * rad;
  // The observer's dot sits on the meridian facing the Sun, measured from the tilted equator.
  const facing = Math.cos(toSun) >= 0 ? 1 : -1;
  const obs = {
    x: er * (facing * Math.cos(latAngle) * Math.cos(pole) + Math.sin(latAngle) * Math.sin(pole)),
    y: er * (facing * Math.cos(latAngle) * Math.sin(pole) - Math.sin(latAngle) * Math.cos(pole)),
  };
  return (
    <g>
      <ellipse cx={sx} cy={sy} rx={rx} ry={ry} className="astro-orbit-path" />
      <Glow x={sx} y={sy} r={26} colour="#ffcf6b" id={id} />
      {(["march-equinox", "june-solstice", "september-equinox", "december-solstice"] as const).map(
        (d) => {
          const a = (dateOrbitAngle[d] + 90) * rad;
          const x = sx + rx * Math.cos(a),
            y = sy + ry * Math.sin(a);
          return (
            <g key={d}>
              <circle cx={x} cy={y} r="3" className="astro-marker" />
              <T x={x} y={y + (Math.sin(a) > 0 ? 50 : -32)} kind="small">
                {d === "june-solstice"
                  ? "June"
                  : d === "december-solstice"
                    ? "December"
                    : d === "march-equinox"
                      ? "March"
                      : "September"}
              </T>
            </g>
          );
        },
      )}
      <g className="astro-move" style={{ transform: "translate(" + ex + "px," + ey + "px)" }}>
        <circle r={er} fill={"url(#" + id + "-earth)"} />
        <path
          d={
            "M" +
            (Math.cos(toSun + Math.PI / 2) * er).toFixed(1) +
            " " +
            (Math.sin(toSun + Math.PI / 2) * er).toFixed(1) +
            "A" +
            er +
            " " +
            er +
            " 0 0 1 " +
            (Math.cos(toSun - Math.PI / 2) * er).toFixed(1) +
            " " +
            (Math.sin(toSun - Math.PI / 2) * er).toFixed(1) +
            "Z"
          }
          className="astro-night"
        />
        <line
          x1={-Math.sin(pole) * 38}
          y1={Math.cos(pole) * 38}
          x2={Math.sin(pole) * 38}
          y2={-Math.cos(pole) * 38}
          className="astro-axis"
        />
        <line
          x1={-Math.cos(pole) * er}
          y1={-Math.sin(pole) * er}
          x2={Math.cos(pole) * er}
          y2={Math.sin(pole) * er}
          className="astro-earth-equator"
        />
        <circle cx={obs.x} cy={obs.y} r="3.5" className="astro-you" />
      </g>
      <T x={sx} y={30} kind="label">
        {"Tilt " + n(m.tilt) + "°"}
      </T>
      <g>
        <rect x={gx - 92} y={gy - 150} width={232} height={178} rx="18" className="astro-panel" />
        <T x={gx + 24} y={gy - 126} kind="label">
          Noon Sun
        </T>
        <path d={"M" + (gx - 80) + " " + gy + "H" + (gx + 128)} className="astro-horizon-line" />
        <path d={"M" + gx + " " + gy + "V" + (gy - gr)} className="astro-zenith" />
        <path
          d={
            "M" +
            (gx + 46) +
            " " +
            gy +
            "A46 46 0 0 0 " +
            (gx + 46 * Math.cos(sunAngle)) +
            " " +
            (gy - 46 * Math.sin(sunAngle))
          }
          className="astro-angle"
        />
        {alt > 0 ? (
          <>
            <line x1={gx} y1={gy} x2={ray.x} y2={ray.y} className="astro-ray" />
            <g
              className="astro-move"
              style={{ transform: "translate(" + ray.x + "px," + ray.y + "px)" }}
            >
              <circle r="11" fill="#ffd36e" filter={"url(#" + id + "-soft)"} />
            </g>
            <line x1={gx} y1={gy} x2={gx} y2={gy - 22} className="astro-gnomon" />
            <line
              x1={gx}
              y1={gy}
              x2={gx - Math.min(110, 22 / Math.tan(sunAngle))}
              y2={gy}
              className="astro-shadow"
            />
          </>
        ) : (
          <T x={gx + 24} y={gy - 60} kind="small">
            Sun below the horizon at noon
          </T>
        )}
        <T x={gx + 24} y={gy + 20} kind="small">
          {"Latitude " + n(Math.abs(m.latitude)) + "° " + (m.latitude >= 0 ? "N" : "S")}
        </T>
        {reveal && alt > 0 ? (
          <T x={gx + 60} y={gy - 12} kind="value" anchor="start">
            {n(alt, 1) + "°"}
          </T>
        ) : null}
      </g>
    </g>
  );
}

/* ---------------- Moon phases ---------------- */
function moonDiscPath(cx: number, cy: number, R: number, elongation: number) {
  const e = ((elongation % 360) + 360) % 360;
  const waxing = e <= 180;
  const c = Math.cos(e * rad);
  const rx = Math.abs(c) * R;
  const first = waxing ? 1 : 0;
  const second = waxing ? (c > 0 ? 0 : 1) : c > 0 ? 1 : 0;
  return (
    "M" +
    cx +
    " " +
    (cy - R) +
    "A" +
    R +
    " " +
    R +
    " 0 0 " +
    first +
    " " +
    cx +
    " " +
    (cy + R) +
    "A" +
    rx.toFixed(2) +
    " " +
    R +
    " 0 0 " +
    second +
    " " +
    cx +
    " " +
    (cy - R) +
    "Z"
  );
}
function MoonView({ day, reveal, id }: { day: number; reveal: boolean; id: string }) {
  const e = moonElongation(day);
  const cx = 200,
    cy = 186,
    r = 118;
  const mx = cx + r * Math.cos(e * rad),
    my = cy - r * Math.sin(e * rad);
  return (
    <g>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={"ray" + i}
          d={"M630 " + (60 + i * 50) + "H" + (cx + r + 46)}
          className="astro-sunlight"
          markerEnd={"url(#" + id + "-arrow)"}
        />
      ))}
      <T x={612} y={44} kind="small" anchor="end">
        Sunlight
      </T>
      <circle cx={cx} cy={cy} r={r} className="astro-orbit-path" />
      <circle cx={cx} cy={cy} r="20" fill={"url(#" + id + "-earth)"} />
      <path
        d={"M" + cx + " " + (cy - 20) + "A20 20 0 0 0 " + cx + " " + (cy + 20) + "Z"}
        className="astro-night"
      />
      <g data-elongation={e.toFixed(3)}>
        <circle cx={mx} cy={my} r="11" fill="#2a2f3d" />
        <path
          d={"M" + mx + " " + (my - 11) + "A11 11 0 0 1 " + mx + " " + (my + 11) + "Z"}
          style={{ fill: "var(--astro-moon-lit)" }}
        />
      </g>
      <line x1={cx} y1={cy} x2={mx} y2={my} className="astro-sightline" />
      <T x={cx} y={34} kind="small">
        Looking down on the north pole
      </T>
      <g>
        <rect x={418} y={92} width={190} height={196} rx="20" className="astro-panel" />
        <T x={513} y={118} kind="small">
          Seen from Earth
        </T>
        <circle cx={513} cy={198} r="64" className="astro-moon-dark" />
        <path d={moonDiscPath(513, 198, 64, e)} fill={"url(#" + id + "-moon)"} />
        <g clipPath={"url(#" + id + "-moonclip)"} className="astro-craters">
          <circle cx={495} cy={180} r="9" />
          <circle cx={530} cy={215} r="12" />
          <circle cx={520} cy={170} r="5" />
          <circle cx={488} cy={222} r="6" />
        </g>
        {reveal ? (
          <T x={513} y={278} kind="value">
            {n(100 * ((1 - Math.cos(e * rad)) / 2), 1) + "% lit"}
          </T>
        ) : null}
      </g>
    </g>
  );
}

/* ---------------- Eclipses ---------------- */
function EclipseView({
  m,
  reveal,
  id,
}: {
  m: Extract<AstronomyModel, { kind: "eclipse" }>;
  reveal: boolean;
  id: string;
}) {
  const ey = 186,
    ex = 340;
  const scale = 16; // pixels per degree of lunar latitude (exaggerated)
  const moonX = m.alignment === "full" ? 548 : 214;
  const moonY = ey - m.moonLatitude * scale;
  const hit = eclipseOccurs(m);
  return (
    <g>
      <Glow x={46} y={ey} r={40} colour="#ffcf6b" id={id} />
      <path d={"M20 " + ey + "H624"} className="astro-ecliptic" />
      <T x={200} y={ey + 18} kind="small">
        Ecliptic plane
      </T>
      <path
        d={
          "M" +
          (ex - 260) +
          " " +
          (ey +
            260 *
              Math.tan(ASTRO.moonInclination * 3 * rad) *
              (m.moonLatitude >= 0 ? 1 : -1) *
              0.5) +
          "L" +
          (ex + 260) +
          " " +
          (ey -
            260 * Math.tan(ASTRO.moonInclination * 3 * rad) * (m.moonLatitude >= 0 ? 1 : -1) * 0.5)
        }
        className="astro-moon-orbit"
      />
      {m.alignment === "full" ? (
        <>
          <path
            d={
              "M" +
              ex +
              " " +
              (ey - 30) +
              "L620 " +
              (ey - 54) +
              "L620 " +
              (ey + 54) +
              "L" +
              ex +
              " " +
              (ey + 30) +
              "Z"
            }
            className="astro-penumbra"
          />
          <path
            d={
              "M" +
              ex +
              " " +
              (ey - 30) +
              "L620 " +
              (ey - 12) +
              "L620 " +
              (ey + 12) +
              "L" +
              ex +
              " " +
              (ey + 30) +
              "Z"
            }
            className="astro-umbra"
          />
        </>
      ) : (
        <path
          d={
            "M" +
            moonX +
            " " +
            (moonY - 10) +
            "L" +
            (ex - 30) +
            " " +
            (moonY + (ey - moonY) * 0.15 - 3) +
            "L" +
            (ex - 30) +
            " " +
            (moonY + (ey - moonY) * 0.15 + 3) +
            "L" +
            moonX +
            " " +
            (moonY + 10) +
            "Z"
          }
          className="astro-umbra"
        />
      )}
      <circle cx={ex} cy={ey} r="30" fill={"url(#" + id + "-earth)"} />
      <path
        d={"M" + ex + " " + (ey - 30) + "A30 30 0 0 1 " + ex + " " + (ey + 30) + "Z"}
        className="astro-night"
      />
      <g className="astro-move" style={{ transform: "translate(" + moonX + "px," + moonY + "px)" }}>
        <circle
          r="10"
          className={m.alignment === "full" && hit ? "astro-moon-eclipsed" : "astro-moon-lit"}
        />
      </g>
      <T x={moonX} y={moonY + (m.moonLatitude >= 0 ? -20 : 30)} kind="small">
        {(m.alignment === "full" ? "Full" : "New") + " moon"}
      </T>
      <T x={22} y={30} kind="small" anchor="start">
        Vertical offsets exaggerated sixteenfold
      </T>
      {reveal ? (
        <T x={618} y={30} kind="value" anchor="end">
          {hit ? (m.alignment === "full" ? "Lunar eclipse" : "Solar eclipse") : "No eclipse"}
        </T>
      ) : null}
    </g>
  );
}

/* ---------------- Orbits and equal areas ---------------- */
function OrbitView({
  m,
  models,
  f,
  reveal,
  id,
}: {
  m: Extract<AstronomyModel, { kind: "orbit" }>;
  models: AstronomyModel[];
  f: number;
  reveal: boolean;
  id: string;
}) {
  const orbits = models.filter((x): x is typeof m => x.kind === "orbit");
  const maxA = Math.max(...orbits.map((o) => o.semiMajorAxis));
  const maxB = Math.max(...orbits.map((o) => o.semiMajorAxis * Math.sqrt(1 - o.eccentricity ** 2)));
  const s = Math.min(270 / maxA, 140 / maxB);
  const a = m.semiMajorAxis,
    e = m.eccentricity;
  const focusX = 320 + a * e * s,
    cy = 190;
  const to = (p: { x: number; y: number }) => ({ x: focusX + p.x * s, y: cy - p.y * s });
  const sectors = Array.from({ length: 12 }, (_, k) => {
    const pts = Array.from({ length: 21 }, (_, i) => to(orbitPosition(m, (k + i / 20) / 12)));
    return { k, d: path([{ x: focusX, y: cy }, ...pts], true) };
  });
  const current = Math.min(11, Math.floor(f * 12));
  const planet = to(orbitPosition(m, f));
  const ahead = to(orbitPosition(m, f + 0.004));
  const speedScale = Math.hypot(ahead.x - planet.x, ahead.y - planet.y);
  const dir = { x: (ahead.x - planet.x) / speedScale, y: (ahead.y - planet.y) / speedScale };
  const vLen = clamp(speedScale * 5, 10, 60);
  const bar = s;
  return (
    <g>
      {sectors.map((sec) => (
        <path
          key={sec.k}
          d={sec.d}
          className={
            "astro-sector" +
            (sec.k % 2 ? " astro-sector-alt" : "") +
            (sec.k === current ? " astro-sector-now" : "")
          }
        />
      ))}
      <ellipse
        cx={320}
        cy={cy}
        rx={a * s}
        ry={a * Math.sqrt(1 - e * e) * s}
        className="astro-orbit-line"
      />
      <Glow x={focusX} y={cy} r={14} colour="#ffcf6b" id={id} />
      <circle cx={320 - a * e * s} cy={cy} r="2.5" className="astro-marker" />
      <g>
        <line
          x1={planet.x}
          y1={planet.y}
          x2={planet.x + dir.x * vLen}
          y2={planet.y + dir.y * vLen}
          className="astro-velocity"
          markerEnd={"url(#" + id + "-arrow)"}
        />
        <circle cx={planet.x} cy={planet.y} r="12" className="astro-planet-halo" />
        <circle
          cx={planet.x}
          cy={planet.y}
          r="6.5"
          fill={"url(#" + id + "-planet)"}
          data-r={orbitPosition(m, f).r.toFixed(4)}
        />
      </g>
      <T x={to({ x: a * (1 - e), y: 0 }).x + 10} y={cy + 24} kind="small" anchor="start">
        closest
      </T>
      <T x={to({ x: -a * (1 + e), y: 0 }).x - 10} y={cy + 24} kind="small" anchor="end">
        farthest
      </T>
      <g>
        <path d={"M24 330H" + (24 + bar)} className="astro-scalebar" />
        <T x={24 + bar / 2} y={322} kind="small">
          1 AU
        </T>
      </g>
      <T x={22} y={30} kind="small" anchor="start">
        Twelve sectors, each swept in one twelfth of the period
      </T>
      {reveal ? (
        <T x={618} y={30} kind="value" anchor="end">
          {"Period " + n(Math.sqrt(a ** 3 / m.starMass), 3) + " yr"}
        </T>
      ) : null}
    </g>
  );
}

/* ---------------- Gravity between two bodies ---------------- */
function GravityView({
  m,
  models,
  reveal,
  id,
}: {
  m: Extract<AstronomyModel, { kind: "gravity" }>;
  models: AstronomyModel[];
  reveal: boolean;
  id: string;
}) {
  const all = models.filter((x): x is typeof m => x.kind === "gravity");
  const maxSep = Math.max(...all.map((g) => g.separation));
  const maxF = Math.max(...all.map(relativeGravity));
  const sep = (m.separation / maxSep) * 380;
  const ax = 320 - sep / 2,
    bx = 320 + sep / 2,
    y = 190;
  const size = (mass: number) => 10 + 8 * Math.cbrt(mass);
  const len = 20 + 120 * Math.sqrt(relativeGravity(m) / maxF);
  return (
    <g>
      <circle cx={ax} cy={y} r={size(m.massA) * 3.2} fill={"url(#" + id + "-well)"} />
      <circle cx={bx} cy={y} r={size(m.massB) * 3.2} fill={"url(#" + id + "-well)"} />
      <g className="astro-move" style={{ transform: "translate(" + ax + "px," + y + "px)" }}>
        <circle r={size(m.massA)} fill={"url(#" + id + "-planet)"} />
      </g>
      <g className="astro-move" style={{ transform: "translate(" + bx + "px," + y + "px)" }}>
        <circle r={size(m.massB)} fill={"url(#" + id + "-planet-b)"} />
      </g>
      <line
        x1={ax}
        y1={y - 70}
        x2={ax + len}
        y2={y - 70}
        className="astro-force"
        markerEnd={"url(#" + id + "-arrow)"}
      />
      <line
        x1={bx}
        y1={y + 70}
        x2={bx - len}
        y2={y + 70}
        className="astro-force"
        markerEnd={"url(#" + id + "-arrow)"}
      />
      <T x={ax} y={y - 84} kind="small" anchor="start">
        pull on A
      </T>
      <T x={bx} y={y + 94} kind="small" anchor="end">
        pull on B
      </T>
      <path d={"M" + ax + " " + (y + 130) + "H" + bx} className="astro-scalebar" />
      <T x={320} y={y + 150} kind="small">
        {"separation " + n(m.separation)}
      </T>
      <T x={ax} y={y + 4 + size(m.massA) + 18} kind="label">
        {"A: " + n(m.massA)}
      </T>
      <T x={bx} y={y + 4 + size(m.massB) + 18} kind="label">
        {"B: " + n(m.massB)}
      </T>
      <T x={22} y={30} kind="small" anchor="start">
        Arrows share one scale across the cases
      </T>
      {reveal ? (
        <T x={618} y={30} kind="value" anchor="end">
          {"Force " + n(relativeGravity(m), 4) + " units"}
        </T>
      ) : null}
    </g>
  );
}

/* ---------------- Launches: fall, orbit or escape ---------------- */
const bodyColours = {
  earth: ["#8fd3ff", "#2a6fb8", "#123a66"],
  moon: ["var(--astro-moon-surface)", "#9a9893", "#4d4c4a"],
  mars: ["#ffb38a", "#c4532e", "#5c2414"],
  jupiter: ["#f3dcb8", "#c79a6a", "#6d4a2f"],
} as const;
function LaunchView({
  m,
  f,
  reveal,
  id,
}: {
  m: Extract<AstronomyModel, { kind: "launch" }>;
  f: number;
  reveal: boolean;
  id: string;
}) {
  const body = ASTRO_BODIES[m.body],
    speeds = launchSpeeds(m);
  const points = useMemo(() => launchPath(m), [m]);
  const cx = 250,
    cy = 190,
    s = 118 / speeds.r;
  const to = (p: Pt) => ({ x: cx + p.x * s, y: cy - p.y * s });
  const index = Math.round(f * (points.length - 1));
  const craft = to(points[index]!);
  const flown = points.slice(0, index + 1).map(to);
  const colours = bodyColours[m.body];
  const top = Math.max(speeds.escape * 1.25, m.speed * 1.05);
  const gauge = (v: number) => 320 - (v / top) * 250;
  return (
    <g>
      <defs>
        <radialGradient id={id + "-body"} cx=".35" cy=".3" r=".8">
          <stop offset="0" style={{ stopColor: colours[0] }} />
          <stop offset=".6" stopColor={colours[1]} />
          <stop offset="1" stopColor={colours[2]} />
        </radialGradient>
        <clipPath id={id + "-launchclip"}>
          <rect x="0" y="0" width="500" height={H} />
        </clipPath>
      </defs>
      <g clipPath={"url(#" + id + "-launchclip)"}>
        {m.body === "earth" ? (
          <circle cx={cx} cy={cy} r={body.radius * s + 8} className="astro-atmosphere" />
        ) : null}
        <circle cx={cx} cy={cy} r={body.radius * s} fill={"url(#" + id + "-body)"} />
        {m.body === "jupiter"
          ? [-0.5, -0.15, 0.25, 0.55].map((b) => (
              <path
                key={b}
                d={
                  "M" +
                  (cx - body.radius * s * Math.sqrt(1 - b * b)) +
                  " " +
                  (cy + b * body.radius * s) +
                  "H" +
                  (cx + body.radius * s * Math.sqrt(1 - b * b))
                }
                className="astro-band"
              />
            ))
          : null}
        <circle cx={cx} cy={cy} r={speeds.r * s} className="astro-reference-orbit" />
        <path d={path(points.map(to))} className="astro-path-ghost" />
        <path d={path(flown)} className="astro-trail" />
        <g data-progress={index}>
          <circle cx={craft.x} cy={craft.y} r="11" className="astro-star-halo" />
          <circle cx={craft.x} cy={craft.y} r="4.5" className="astro-craft" />
        </g>
      </g>
      <g>
        <path d={"M560 70V320"} className="astro-gauge" />
        <line
          x1={548}
          x2={572}
          y1={gauge(speeds.circular)}
          y2={gauge(speeds.circular)}
          className="astro-tick"
        />
        <line
          x1={548}
          x2={572}
          y1={gauge(speeds.escape)}
          y2={gauge(speeds.escape)}
          className="astro-tick astro-tick-escape"
        />
        <T x={544} y={gauge(speeds.circular) + 4} kind="small" anchor="end">
          circular
        </T>
        <T x={544} y={gauge(speeds.escape) + 4} kind="small" anchor="end">
          escape
        </T>
        <circle cx={560} cy={gauge(m.speed)} r="7" className="astro-gauge-marker" />
        <T x={576} y={gauge(m.speed) + 4} kind="small" anchor="start">
          {n(m.speed) + " km/s"}
        </T>
        <T x={560} y={52} kind="small">
          Speed
        </T>
      </g>
      <T x={22} y={30} kind="small" anchor="start">
        {"Launch " + n(m.altitude) + " km above " + body.name}
      </T>
      {reveal ? (
        <T x={22} y={52} kind="value" anchor="start">
          {"Circular " + n(speeds.circular, 2) + " · escape " + n(speeds.escape, 2) + " km/s"}
        </T>
      ) : null}
    </g>
  );
}

/* ---------------- Tides ---------------- */
function TidesView({
  m,
  f,
  reveal,
  id,
}: {
  m: Extract<AstronomyModel, { kind: "tides" }>;
  f: number;
  reveal: boolean;
  id: string;
}) {
  const cx = 210,
    cy = 190,
    R = 66;
  const lunar = lunarTide(m.moonDistance),
    solar = ASTRO.solarTideRatio;
  const k = 16;
  const ocean = (th: number) =>
    R +
    6 +
    k * lunar * Math.cos(th) ** 2 +
    k * solar * Math.cos(th - (m.sunAligned ? 0 : Math.PI / 2)) ** 2;
  const shape = Array.from({ length: 121 }, (_, i) => {
    const th = (i / 120) * 2 * Math.PI;
    return { x: cx + ocean(th) * Math.cos(th), y: cy - ocean(th) * Math.sin(th) };
  });
  const town = f * 2 * Math.PI + Math.PI / 2;
  const tx = cx + R * Math.cos(town),
    ty = cy - R * Math.sin(town);
  const moonX = 300 + ((m.moonDistance - 20) / 100) * 300;
  return (
    <g>
      {m.sunAligned ? (
        <T x={22} y={30} kind="small" anchor="start">
          Sunlight from the far left, along the Earth–Moon line
        </T>
      ) : (
        <T x={22} y={30} kind="small" anchor="start">
          Sunlight from the top of the frame, square to the Earth–Moon line
        </T>
      )}
      <path d={path(shape, true)} className="astro-ocean" />
      <circle cx={cx} cy={cy} r={R} fill={"url(#" + id + "-earth)"} />
      <circle cx={tx} cy={ty} r="5" className="astro-you" />
      <path d={"M" + (cx + R + 30) + " " + cy + "H" + (moonX - 18)} className="astro-sightline" />
      <g className="astro-move" style={{ transform: "translate(" + moonX + "px," + cy + "px)" }}>
        <circle r="14" className="astro-moon-lit" />
      </g>
      <T x={moonX} y={cy + 36} kind="small">
        {"Moon at " + n(m.moonDistance) + " Earth radii"}
      </T>
      <T x={cx} y={cy + R + 60} kind="small">
        Ocean bulges exaggerated; the dot is a coastal town
      </T>
      {reveal ? (
        <T x={618} y={30} kind="value" anchor="end">
          {"Lunar tide " + n(lunar, 3) + "× today's"}
        </T>
      ) : null}
    </g>
  );
}

/* ---------------- The inverse-square law ---------------- */
function LightView({
  m,
  models,
  reveal,
  id,
}: {
  m: Extract<AstronomyModel, { kind: "light" }>;
  models: AstronomyModel[];
  reveal: boolean;
  id: string;
}) {
  const all = models.filter((x): x is typeof m => x.kind === "light");
  const metres = (x: typeof m) => distanceInMetres(x.distance, x.unit);
  const dmax = Math.max(...all.map(metres)),
    dmin = Math.min(...all.map(metres));
  const ratio = metres(m) / dmin;
  const linear = dmax / dmin <= 6;
  const px = linear
    ? 120 + (440 * metres(m)) / dmax
    : 120 + 440 * (0.25 + (0.75 * Math.log(metres(m) / dmin)) / Math.log(dmax / dmin || 2));
  const side = linear ? Math.max(24, (170 * metres(m)) / dmax) : 90;
  const cells = linear && Math.abs(ratio - Math.round(ratio)) < 1e-9 ? Math.round(ratio) : 0;
  const fluxes = all.map((x) => (x.luminosity / metres(x) ** 2) * dmin ** 2);
  const bright = m.luminosity / ratio ** 2 / Math.max(...fluxes);
  const starR = 10 + 5 * Math.log10(1 + m.luminosity);
  const top = 190 - side / 2;
  return (
    <g>
      <Glow x={70} y={190} r={starR} colour="#ffe2a3" id={id} />
      <path
        d={"M70 190L" + px + " " + top + "L" + px + " " + (top + side) + "Z"}
        className="astro-beam"
      />
      <path
        d={
          "M70 190L" +
          (px - side * 0.25) +
          " " +
          top +
          "M70 190L" +
          (px + side * 0.25) +
          " " +
          (top + side) +
          "M70 190L" +
          (px + side * 0.25) +
          " " +
          top +
          "M70 190L" +
          (px - side * 0.25) +
          " " +
          (top + side)
        }
        className="astro-ray-thin"
      />
      <g className="astro-move" style={{ transform: "translate(" + px + "px," + 190 + "px)" }}>
        <path
          d={
            "M" +
            -side * 0.25 +
            " " +
            -side / 2 +
            "L" +
            side * 0.25 +
            " " +
            -side / 2 +
            "L" +
            side * 0.25 +
            " " +
            side / 2 +
            "L" +
            -side * 0.25 +
            " " +
            side / 2 +
            "Z"
          }
          className="astro-screen"
          style={{ fillOpacity: 0.15 + 0.7 * clamp(bright, 0, 1) }}
        />
        {cells > 1
          ? Array.from({ length: cells - 1 }, (_, k) => k + 1).map((i) => (
              <g key={"cell" + i}>
                <line
                  x1={-side * 0.25}
                  x2={side * 0.25}
                  y1={-side / 2 + (i * side) / cells}
                  y2={-side / 2 + (i * side) / cells}
                  className="astro-grid"
                />
                <line
                  x1={-side * 0.25 + (i * side * 0.5) / cells}
                  x2={-side * 0.25 + (i * side * 0.5) / cells}
                  y1={-side / 2}
                  y2={side / 2}
                  className="astro-grid"
                />
              </g>
            ))
          : null}
      </g>
      <path d={"M70 330H" + px} className="astro-scalebar" />
      <T x={(70 + px) / 2} y={322} kind="small">
        {n(m.distance) + " " + (m.unit === "au" ? "AU" : m.unit === "pc" ? "pc" : "ly")}
      </T>
      <T x={70} y={190 + starR + 30} kind="label">
        {n(m.luminosity) + " L☉"}
      </T>
      <T x={22} y={30} kind="small" anchor="start">
        {cells > 1
          ? "The same light now covers " + cells + " × " + cells + " squares"
          : linear
            ? "Screen brightness shows energy per square metre"
            : "Distances drawn on a logarithmic scale"}
      </T>
      {reveal ? (
        <T x={618} y={30} kind="value" anchor="end">
          {astronomyMeasures(m)[0]!.value}
        </T>
      ) : null}
    </g>
  );
}

/* ---------------- Parallax ---------------- */
function ParallaxView({
  m,
  models,
  f,
  reveal,
}: {
  m: Extract<AstronomyModel, { kind: "parallax" }>;
  models: AstronomyModel[];
  f: number;
  reveal: boolean;
}) {
  const all = models.filter((x): x is typeof m => x.kind === "parallax");
  const pMax = Math.max(...all.map((x) => x.parallax)),
    pMin = Math.min(...all.map((x) => x.parallax));
  const sunX = 230,
    sunY = 296;
  const spread = pMax === pMin ? 0.5 : (1 / m.parallax - 1 / pMax) / (1 / pMin - 1 / pMax);
  const starY = sunY - 110 - 120 * spread;
  const a = f * 2 * Math.PI;
  const earth = { x: sunX + 100 * Math.cos(a), y: sunY + 24 * Math.sin(a) };
  const t = (40 - earth.y) / (starY - earth.y);
  const hit = { x: earth.x + (sunX - earth.x) * t, y: 40 };
  const shift = 58 * (m.parallax / pMax) * -Math.cos(a);
  return (
    <g>
      <rect x={20} y={28} width={420} height={22} rx="8" className="astro-background-strip" />
      <T x={430} y={44} kind="small" anchor="end">
        Distant background stars
      </T>
      <ellipse cx={sunX} cy={sunY} rx="100" ry="24" className="astro-orbit-path" />
      <circle cx={sunX} cy={sunY} r="9" fill="#ffd36e" />
      <line x1={earth.x} y1={earth.y} x2={hit.x} y2={hit.y} className="astro-sightline-strong" />
      <circle cx={earth.x} cy={earth.y} r="6" fill="#5fb4ff" />
      <g data-shift={shift.toFixed(3)}>
        <circle cx={sunX} cy={starY} r="13" className="astro-star-halo" />
        <circle cx={sunX} cy={starY} r="5" className="astro-star" />
      </g>
      <T x={sunX + 16} y={starY + 4} kind="small" anchor="start">
        Nearby star
      </T>
      <T x={sunX} y={sunY + 46} kind="small">
        Earth's orbit, radius 1 AU
      </T>
      <g>
        <rect x={462} y={86} width={160} height={150} rx="18" className="astro-panel" />
        <T x={542} y={110} kind="small">
          Telescope view
        </T>
        {[
          [480, 140],
          [600, 150],
          [520, 216],
          [590, 205],
          [500, 180],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="1.6" className="astro-faint" />
        ))}
        <line x1={542 - 58} x2={542 + 58} y1={170} y2={170} className="astro-grid" />
        <circle cx={542 + shift} cy={170} r="5" className="astro-star" />
      </g>
      <T x={542} y={258} kind="small">
        {"Parallax " + n(m.parallax) + "″"}
      </T>
      <T x={542} y={278} kind="small">
        Shift exaggerated
      </T>
      {reveal ? (
        <T x={618} y={36} kind="value" anchor="end">
          {n(1 / m.parallax, 3) + " pc"}
        </T>
      ) : null}
    </g>
  );
}

/* ---------------- Blackbody spectra ---------------- */
function BlackbodyView({
  m,
  models,
  reveal,
  id,
}: {
  m: Extract<AstronomyModel, { kind: "blackbody" }>;
  models: AstronomyModel[];
  reveal: boolean;
  id: string;
}) {
  const all = models.filter((x): x is typeof m => x.kind === "blackbody");
  const peaks = all.map((x) => wienPeak(x.temperature));
  const log = Math.max(...peaks) > 5000;
  const lo = log ? Math.min(...peaks) / 6 : 0,
    hi = log ? Math.max(...peaks) * 12 : Math.min(6000, Math.max(2000, 3 * Math.max(...peaks)));
  const x0 = 240,
    x1 = 616,
    y0 = 300,
    y1 = 60;
  const gx = (l: number) =>
    log ? x0 + ((x1 - x0) * Math.log(l / lo)) / Math.log(hi / lo) : x0 + ((x1 - x0) * l) / hi;
  const gy = (v: number) => y0 - (y0 - y1) * v;
  const curve = (temperature: number) =>
    Array.from({ length: 160 }, (_, i) => {
      const l = log ? lo * (hi / lo) ** (i / 159) : Math.max(20, (hi * (i + 1)) / 160);
      return { x: gx(l), y: gy(planckShape(l, temperature)) };
    });
  const visible = m.temperature >= 1000;
  const colour = blackbodyColour(m.temperature);
  const ticks = log
    ? Array.from({ length: 12 }, (_, i) => 10 ** (Math.floor(Math.log10(lo)) + i)).filter(
        (l) => l >= lo && l <= hi,
      )
    : Array.from({ length: 7 }, (_, i) => i * 1000).filter((l) => l <= hi);
  const label = (l: number) =>
    l >= 1e6 ? n(l / 1e6) + " mm" : l >= 1000 ? n(l / 1000) + " µm" : n(l) + " nm";
  const peak = wienPeak(m.temperature);
  return (
    <g>
      {visible ? (
        <g className="astro-move" style={{ color: colour }}>
          <circle cx={120} cy={180} r="88" fill={"url(#" + id + "-halo)"} />
          <circle cx={120} cy={180} r="48" fill={colour} filter={"url(#" + id + "-soft)"} />
          <circle cx={108} cy={166} r="18" fill="#fff" opacity=".35" />
        </g>
      ) : (
        <g>
          <circle cx={120} cy={180} r="48" className="astro-cold" />
          <T x={120} y={252} kind="small">
            Too cold to glow visibly
          </T>
        </g>
      )}
      <T x={120} y={60} kind="label">
        {n(m.temperature) + " K"}
      </T>
      <rect
        x={gx(380)}
        y={y1 - 6}
        width={Math.max(2, gx(750) - gx(380))}
        height={y0 - y1 + 6}
        fill={"url(#" + id + "-rainbow)"}
        opacity=".22"
      />
      <path d={"M" + x0 + " " + y1 + "V" + y0 + "H" + x1} className="astro-axis-line" />
      {all
        .filter((x) => x !== m)
        .map((x) => (
          <path
            key={"t" + x.temperature}
            d={path(curve(x.temperature))}
            className="astro-curve-ghost"
          />
        ))}
      <path
        d={path([{ x: x0, y: y0 }, ...curve(m.temperature), { x: x1, y: y0 }], true)}
        className="astro-curve-fill"
        style={{ fill: visible ? colour : "#7c8cff" }}
      />
      <path d={path(curve(m.temperature))} className="astro-curve" />
      {ticks.map((l) => (
        <g key={l}>
          <path d={"M" + gx(l) + " " + y0 + "v6"} className="astro-axis-line" />
          <T x={gx(l)} y={y0 + 22} kind="small">
            {label(l)}
          </T>
        </g>
      ))}
      <T x={(x0 + x1) / 2} y={y0 + 46} kind="small">
        {"Wavelength" + (log ? " (logarithmic)" : "") + " · each curve scaled to its own peak"}
      </T>
      {reveal ? (
        <>
          <path d={"M" + gx(peak) + " " + y1 + "V" + y0} className="astro-peak" />
          <T x={gx(peak) + 8} y={y1 + 4} kind="value" anchor="start">
            {"peak " + label(Number(peak.toPrecision(4)))}
          </T>
        </>
      ) : null}
    </g>
  );
}

/* ---------------- Doppler shift ---------------- */
function DopplerView({
  m,
  reveal,
  id,
}: {
  m: Extract<AstronomyModel, { kind: "doppler" }>;
  reveal: boolean;
  id: string;
}) {
  const observed = dopplerWavelength(m.restWavelength, m.velocity);
  const sx = (l: number) => 60 + ((l - 380) / 380) * 520;
  const away = m.velocity >= 0;
  const step = clamp(Math.abs(m.velocity) / 3000, 0, 4) * 4 * (away ? -1 : 1);
  return (
    <g>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle
          key={"wave" + i}
          cx={260 + step * (5 - i)}
          cy={150}
          r={18 + i * 22}
          className="astro-wavefront"
        />
      ))}
      <Glow x={260} y={150} r={13} colour="#ffe2a3" id={id} />
      <line
        x1={260}
        y1={150}
        x2={260 + (away ? -1 : 1) * clamp(Math.abs(m.velocity) / 200, 8, 70)}
        y2={150}
        className="astro-velocity"
        markerEnd={"url(#" + id + "-arrow)"}
      />
      <T x={260} y={42} kind="small">
        {away ? "Source moving away from the telescope" : "Source moving towards the telescope"}
      </T>
      <g className="astro-telescope">
        <path d="M560 136l40-10v48l-40-10z" />
        <circle cx={606} cy={150} r="6" />
      </g>
      <rect x={60} y={268} width={520} height={34} rx="6" fill={"url(#" + id + "-spectrum)"} />
      <line
        x1={sx(m.restWavelength)}
        x2={sx(m.restWavelength)}
        y1={262}
        y2={308}
        className="astro-lab-line"
      />
      <g className="astro-move" style={{ transform: "translateX(" + sx(observed) + "px)" }}>
        <line x1={0} x2={0} y1={268} y2={302} className="astro-line" />
      </g>
      <T x={sx(m.restWavelength)} y={256} kind="small">
        {"laboratory " + n(m.restWavelength) + " nm"}
      </T>
      <T x={60} y={326} kind="small" anchor="start">
        380 nm
      </T>
      <T x={580} y={326} kind="small" anchor="end">
        760 nm
      </T>
      {reveal ? (
        <T x={618} y={30} kind="value" anchor="end">
          {"observed " + n(observed, 2) + " nm"}
        </T>
      ) : null}
    </g>
  );
}

/* ---------------- The H–R diagram ---------------- */
const HR_LABEL: Record<string, [number, number, "start" | "end"]> = {
  "Sirius A": [-8, 16, "end"],
  Vega: [-8, -6, "end"],
  Arcturus: [8, 14, "start"],
  Aldebaran: [8, -6, "start"],
  Betelgeuse: [-8, -6, "end"],
  "Proxima Centauri": [-8, 4, "end"],
};
const hrX = (t: number) =>
  80 + ((Math.log10(50000) - Math.log10(t)) / (Math.log10(50000) - Math.log10(2000))) * 500;
const hrY = (l: number) => 320 - ((Math.log10(l) + 4) / 10) * 290;
function HrBackdrop({ id }: { id: string }) {
  const ms = MAIN_SEQUENCE.map(([t, l]) => ({ x: hrX(t), y: hrY(l) }));
  return (
    <g>
      <clipPath id={id + "-plotclip"}>
        <rect x={80} y={30} width={500} height={290} rx="10" />
      </clipPath>
      <rect x={80} y={30} width={500} height={290} rx="10" className="astro-plot" />
      <path d={path(ms)} className="astro-main-sequence" filter={"url(#" + id + "-soft)"} />
      {[0.01, 1, 100].map((r) => {
        const a = { x: hrX(40000), y: hrY(r * r * (40000 / 5772) ** 4) },
          b = { x: hrX(2500), y: hrY(r * r * (2500 / 5772) ** 4) };
        return (
          <g key={r} clipPath={"url(#" + id + "-plotclip)"}>
            <path d={"M" + a.x + " " + a.y + "L" + b.x + " " + b.y} className="astro-radius-line" />
          </g>
        );
      })}
      <T x={hrX(9000)} y={hrY(0.0001 * (9000 / 5772) ** 4) + 16} kind="small">
        0.01 R☉
      </T>
      <T x={hrX(3300)} y={hrY(1 * (3300 / 5772) ** 4) + 18} kind="small">
        1 R☉
      </T>
      <T x={hrX(4800)} y={hrY(1e4 * (4800 / 5772) ** 4) - 8} kind="small">
        100 R☉
      </T>
      {HR_STARS.map((s) => {
        const [dx, dy, anchor] = HR_LABEL[s.name] ?? [7, -6, "start"];
        return (
          <g key={s.name}>
            <circle
              cx={hrX(s.temperature)}
              cy={hrY(s.luminosity)}
              r="4"
              fill={blackbodyColour(s.temperature)}
            />
            <T x={hrX(s.temperature) + dx} y={hrY(s.luminosity) + dy} kind="small" anchor={anchor}>
              {s.name}
            </T>
          </g>
        );
      })}
      {[30000, 10000, 5000, 3000].map((t) => (
        <T key={t} x={hrX(t)} y={340} kind="small">
          {n(t)}
        </T>
      ))}
      {(
        [
          [1e-4, "10⁻⁴"],
          [0.01, "0.01"],
          [1, "1"],
          [100, "100"],
          [1e4, "10⁴"],
          [1e6, "10⁶"],
        ] as const
      ).map(([l, label]) => (
        <T key={l} x={72} y={hrY(l) + 4} kind="small" anchor="end">
          {label}
        </T>
      ))}
      <T x={330} y={358} kind="small">
        Surface temperature (K), hotter to the left
      </T>
      <T x={92} y={22} kind="small" anchor="start">
        Luminosity (Sun = 1)
      </T>
    </g>
  );
}
function HrView({
  m,
  reveal,
  id,
}: {
  m: Extract<AstronomyModel, { kind: "hr" }>;
  reveal: boolean;
  id: string;
}) {
  const L = stellarLuminosity(m.radius, m.temperature);
  const x = hrX(m.temperature),
    y = hrY(clamp(L, 1.2e-4, 9e5));
  return (
    <g>
      <HrBackdrop id={id} />
      <g className="astro-move" style={{ transform: "translate(" + x + "px," + y + "px)" }}>
        <circle r="18" className="astro-target-ring" />
        <circle r="8" fill={blackbodyColour(m.temperature)} filter={"url(#" + id + "-soft)"} />
      </g>
      <T x={92} y={300} kind="label" anchor="start">
        {n(m.temperature) + " K · " + n(m.radius) + " R☉"}
      </T>
      {reveal ? (
        <T x={92} y={278} kind="value" anchor="start">
          {"L = " + n(L, 3) + " L☉"}
        </T>
      ) : null}
    </g>
  );
}

/* ---------------- A star's life ---------------- */
function LifeView({
  m,
  f,
  reveal,
  id,
}: {
  m: Extract<AstronomyModel, { kind: "life" }>;
  f: number;
  reveal: boolean;
  id: string;
}) {
  const L = mainSequenceLuminosity(m.mass),
    R = m.mass ** 0.8;
  const Tms = 5772 * (L / (R * R)) ** 0.25;
  const fate = stellarFate(m.mass);
  const giant =
    m.mass < 10 ? { t: 4200, l: Math.max(120, 60 * L ** 0.6) } : { t: 3600, l: L * 1.4 };
  const stage =
    f < 0.6 ? "main sequence" : f < 0.85 ? (m.mass < 10 ? "red giant" : "red supergiant") : fate;
  const g = f < 0.6 ? 0 : Math.min(1, (f - 0.6) / 0.25);
  const pos = { t: Tms * (giant.t / Tms) ** g, l: L * (giant.l / L) ** g };
  const end = fate === "white dwarf" ? { t: 30000, l: 0.01 } : null;
  const h = (1 - Math.min(1, f / 0.6)) * 100;
  const life = mainSequenceLifetime(m.mass);
  return (
    <g>
      <HrBackdrop id={id} />
      <path
        d={path([
          { x: hrX(Tms), y: hrY(L) },
          { x: hrX(giant.t), y: hrY(giant.l) },
        ])}
        className="astro-track"
      />
      {f >= 0.85 && !reveal ? (
        <g>
          <circle cx={hrX(giant.t)} cy={hrY(giant.l)} r="16" className="astro-target-ring" />
          <T x={hrX(giant.t)} y={hrY(giant.l) + 36} kind="small">
            end state revealed after you answer
          </T>
        </g>
      ) : null}
      {f >= 0.85 && reveal && end ? (
        <g>
          <path
            d={"M" + hrX(giant.t) + " " + hrY(giant.l) + "L" + hrX(end.t) + " " + hrY(end.l)}
            className="astro-track"
          />
          <circle
            cx={hrX(end.t)}
            cy={hrY(end.l)}
            r="6"
            style={{ fill: "var(--astro-star-white)" }}
            filter={"url(#" + id + "-soft)"}
          />
        </g>
      ) : null}
      {f >= 0.85 && (!reveal || end) ? null : f >= 0.85 ? (
        <g className="astro-burst">
          <circle
            cx={hrX(giant.t)}
            cy={hrY(giant.l)}
            r={14 + 60 * (f - 0.85)}
            fill={"url(#" + id + "-burst)"}
          />
        </g>
      ) : (
        <g data-stage={stage}>
          <circle
            cx={hrX(pos.t)}
            cy={hrY(pos.l)}
            r={8 + 10 * g}
            fill={blackbodyColour(pos.t)}
            filter={"url(#" + id + "-soft)"}
          />
        </g>
      )}
      <T x={92} y={284} kind="label" anchor="start">
        {n(m.mass) +
          " M☉ at birth · " +
          (f >= 0.85 ? (reveal ? "ends as a " + fate : "after the giant stage") : stage)}
      </T>
      <g>
        <rect x={92} y={296} width={110} height={8} rx="4" className="astro-fuel-track" />
        <rect x={92} y={296} width={1.1 * h} height={8} rx="4" className="astro-fuel" />
        <T x={208} y={304} kind="small" anchor="start">
          core hydrogen
        </T>
      </g>
      {reveal ? (
        <T x={92} y={262} kind="value" anchor="start">
          {"main sequence " + n(life, 3) + " Gyr"}
        </T>
      ) : null}
    </g>
  );
}

/* ---------------- The expanding universe ---------------- */
const GALAXIES = (() => {
  const r = seeded(41);
  return Array.from({ length: 26 }, () => {
    const a = r() * 2 * Math.PI,
      d = 0.25 + r() * 0.75;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.62, tilt: r() * 180, s: 0.6 + r() * 0.8 };
  }).map((g, i) => ({ ...g, id: "gal" + i }));
})();
function ExpansionView({
  m,
  models,
  f,
  reveal,
  id,
}: {
  m: Extract<AstronomyModel, { kind: "expansion" }>;
  models: AstronomyModel[];
  f: number;
  reveal: boolean;
  id: string;
}) {
  const all = models.filter((x): x is typeof m => x.kind === "expansion");
  const dMax = Math.max(...all.map((x) => x.distance));
  const vMax = Math.max(...all.map(hubbleVelocity));
  const cx = 230,
    cy = 190,
    scale = 1 + 0.45 * f,
    R = 150;
  const gridLines = Array.from({ length: 9 }, (_, i) => (i - 4) * 40 * scale);
  const target = { x: cx + (m.distance / dMax) * R * 0.78 * scale, y: cy - 20 * scale };
  const arrow = 18 + 60 * (hubbleVelocity(m) / vMax);
  const px = (d: number) => 430 + (d / dMax) * 180,
    py = (v: number) => 300 - (v / vMax) * 200;
  return (
    <g>
      <clipPath id={id + "-gridclip"}>
        <rect x={20} y={20} width={400} height={322} rx="14" />
      </clipPath>
      <g clipPath={"url(#" + id + "-gridclip)"}>
        {gridLines.map((o) => (
          <g key={o}>
            <path d={"M" + (cx + o) + " 0V" + H} className="astro-grid" />
            <path d={"M0 " + (cy + o) + "H440"} className="astro-grid" />
          </g>
        ))}
        {GALAXIES.map((g) => (
          <ellipse
            key={g.id}
            cx={cx + g.x * R * scale}
            cy={cy + g.y * R * scale}
            rx={7 * g.s}
            ry={3 * g.s}
            transform={
              "rotate(" + g.tilt + " " + (cx + g.x * R * scale) + " " + (cy + g.y * R * scale) + ")"
            }
            fill={"url(#" + id + "-galaxy)"}
          />
        ))}
        <ellipse cx={cx} cy={cy} rx="10" ry="4" fill={"url(#" + id + "-galaxy)"} />
        <line x1={cx} y1={cy} x2={target.x} y2={target.y} className="astro-sightline" />
        <ellipse
          cx={target.x}
          cy={target.y}
          rx="9"
          ry="4"
          fill={"url(#" + id + "-galaxy)"}
          className="astro-target-galaxy"
        />
        <line
          x1={target.x + 12}
          y1={target.y}
          x2={target.x + 12 + arrow}
          y2={target.y}
          className="astro-velocity"
          markerEnd={"url(#" + id + "-arrow)"}
        />
      </g>
      <T x={cx} y={348} kind="small">
        Milky Way at the centre; every spacing grows by the same factor
      </T>
      <g>
        <path d="M430 100V300H612" className="astro-axis-line" />
        {GALAXIES.slice(0, 12).map((g) => {
          const d = Math.hypot(g.x, g.y) * dMax;
          return (
            <circle
              key={"p" + g.id}
              cx={px(d)}
              cy={py(m.hubbleConstant * d)}
              r="2.2"
              className="astro-faint"
            />
          );
        })}
        {all.map((x) => (
          <circle
            key={"d" + x.distance + "h" + x.hubbleConstant}
            cx={px(x.distance)}
            cy={py(hubbleVelocity(x))}
            r={x === m ? 6 : 3.5}
            className={x === m ? "astro-point-now" : "astro-point"}
          />
        ))}
        <path
          d={"M430 300L" + px(dMax) + " " + py(m.hubbleConstant * dMax)}
          className="astro-curve"
        />
        <T x={521} y={326} kind="small">
          {"distance (Mpc), max " + n(dMax)}
        </T>
        <T x={430} y={88} kind="small" anchor="start">
          recession velocity
        </T>
      </g>
      <T x={618} y={30} kind="label" anchor="end">
        {"H₀ = " + n(m.hubbleConstant) + " km/s/Mpc"}
      </T>
      {reveal ? (
        <T x={618} y={52} kind="value" anchor="end">
          {"v = " + n(hubbleVelocity(m), 1) + " km/s"}
        </T>
      ) : null}
    </g>
  );
}

export function AstronomyDrawing({
  model: m,
  models = [m],
  fraction = astronomyStart(m),
  reveal = false,
}: {
  model: AstronomyModel;
  models?: AstronomyModel[];
  fraction?: number;
  reveal?: boolean;
}) {
  const id = "astro" + useId().replaceAll(":", "");
  const f = clamp(fraction, 0, 1);
  let drawing: ReactNode = null;
  switch (m.kind) {
    case "sky":
      drawing = <SkyView m={m} f={f} reveal={reveal} />;
      break;
    case "seasons":
      drawing = <SeasonsView m={m} reveal={reveal} id={id} />;
      break;
    case "moon":
      drawing = <MoonView day={f * ASTRO.synodicMonth} reveal={reveal} id={id} />;
      break;
    case "eclipse":
      drawing = <EclipseView m={m} reveal={reveal} id={id} />;
      break;
    case "orbit":
      drawing = <OrbitView m={m} models={models} f={f} reveal={reveal} id={id} />;
      break;
    case "gravity":
      drawing = <GravityView m={m} models={models} reveal={reveal} id={id} />;
      break;
    case "launch":
      drawing = <LaunchView m={m} f={f} reveal={reveal} id={id} />;
      break;
    case "tides":
      drawing = <TidesView m={m} f={f} reveal={reveal} id={id} />;
      break;
    case "light":
      drawing = <LightView m={m} models={models} reveal={reveal} id={id} />;
      break;
    case "parallax":
      drawing = <ParallaxView m={m} models={models} f={f} reveal={reveal} />;
      break;
    case "blackbody":
      drawing = <BlackbodyView m={m} models={models} reveal={reveal} id={id} />;
      break;
    case "doppler":
      drawing = <DopplerView m={m} reveal={reveal} id={id} />;
      break;
    case "hr":
      drawing = <HrView m={m} reveal={reveal} id={id} />;
      break;
    case "life":
      drawing = <LifeView m={m} f={f} reveal={reveal} id={id} />;
      break;
    case "expansion":
      drawing = <ExpansionView m={m} models={models} f={f} reveal={reveal} id={id} />;
      break;
  }
  return (
    <svg
      viewBox={"0 0 " + W + " " + H}
      role="img"
      aria-labelledby={id + "-title"}
      className="astronomy-drawing"
      data-kind={m.kind}
    >
      <title id={id + "-title"}>{astronomyGivens(m)}</title>
      <defs>
        <radialGradient id={id + "-space"} cx=".5" cy=".38" r=".8">
          <stop offset="0" stopColor="#1b2150" />
          <stop offset=".55" stopColor="#0d1030" />
          <stop offset="1" stopColor="#05060f" />
        </radialGradient>
        <radialGradient id={id + "-nebula"} cx=".78" cy=".2" r=".5">
          <stop offset="0" stopColor="#7c8cff" stopOpacity=".22" />
          <stop offset="1" stopColor="#7c8cff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id + "-halo"}>
          <stop offset="0" stopColor="currentColor" stopOpacity=".55" />
          <stop offset=".4" stopColor="currentColor" stopOpacity=".18" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id + "-earth"} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#9fe0ff" />
          <stop offset=".5" stopColor="#2f7fd0" />
          <stop offset="1" stopColor="#0f2c57" />
        </radialGradient>
        <radialGradient id={id + "-moon"} cx=".4" cy=".35" r=".8">
          <stop offset="0" style={{ stopColor: "var(--astro-moon-highlight)" }} />
          <stop offset="1" stopColor="#b9b4a6" />
        </radialGradient>
        <radialGradient id={id + "-planet"} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#d6dcff" />
          <stop offset=".55" stopColor="#7c8cff" />
          <stop offset="1" stopColor="#2b3080" />
        </radialGradient>
        <radialGradient id={id + "-planet-b"} cx=".35" cy=".3" r=".8">
          <stop offset="0" style={{ stopColor: "var(--astro-planet-highlight)" }} />
          <stop offset=".55" stopColor="#f0a35e" />
          <stop offset="1" stopColor="#6e3a14" />
        </radialGradient>
        <radialGradient id={id + "-well"}>
          <stop offset="0" stopColor="#7c8cff" stopOpacity=".35" />
          <stop offset="1" stopColor="#7c8cff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id + "-galaxy"}>
          <stop offset="0" style={{ stopColor: "var(--astro-galaxy-core)" }} />
          <stop offset=".5" stopColor="#b9c2ff" stopOpacity=".8" />
          <stop offset="1" stopColor="#7c8cff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id + "-burst"}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".3" stopColor="#ffd27a" />
          <stop offset=".7" stopColor="#ff6b5a" stopOpacity=".5" />
          <stop offset="1" stopColor="#7c8cff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id + "-rainbow"} x2="1">
          <stop offset="0" stopColor="#7b3fe4" />
          <stop offset=".2" stopColor="#3f6bff" />
          <stop offset=".4" stopColor="#2fd0b0" />
          <stop offset=".55" stopColor="#c8e83a" />
          <stop offset=".75" stopColor="#ffb02e" />
          <stop offset="1" stopColor="#e3262f" />
        </linearGradient>
        <linearGradient id={id + "-spectrum"} x2="1">
          <stop offset="0" stopColor="#4b1d8f" />
          <stop offset=".1" stopColor="#5a2fe0" />
          <stop offset=".28" stopColor="#2f6bff" />
          <stop offset=".4" stopColor="#21c3d6" />
          <stop offset=".5" stopColor="#3fd06a" />
          <stop offset=".62" stopColor="#e8e83a" />
          <stop offset=".72" stopColor="#ffa52e" />
          <stop offset=".85" stopColor="#ef3a2a" />
          <stop offset="1" stopColor="#6e0f14" />
        </linearGradient>
        <filter id={id + "-soft"} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <clipPath id={id + "-moonclip"}>
          <path
            d={
              m.kind === "moon"
                ? moonDiscPath(513, 198, 64, moonElongation(f * ASTRO.synodicMonth))
                : "M0 0"
            }
          />
        </clipPath>
        <marker
          id={id + "-arrow"}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0 1L9 5L0 9Z" className="astro-arrowhead" />
        </marker>
      </defs>
      <rect width={W} height={H} rx="22" fill={"url(#" + id + "-space)"} />
      <rect width={W} height={H} rx="22" fill={"url(#" + id + "-nebula)"} />
      <Starfield />
      {drawing}
    </svg>
  );
}

export function AstronomyGivenVisual({ model }: { model: AstronomyModel }) {
  return (
    <div className="astronomy-check">
      <AstronomyDrawing model={model} />
      <p className="astronomy-givens">{astronomyGivens(model)}</p>
    </div>
  );
}

export function AstronomyDiagram({
  spec,
  showResults = false,
}: {
  spec: Spec;
  showResults?: boolean;
}) {
  const initial = spec.cases.find((c) => c.id === spec.initialCaseId) ?? spec.cases[0]!;
  const [selected, setSelected] = useState(initial.id),
    [fraction, setFraction] = useState(astronomyStart(initial.model)),
    [playing, setPlaying] = useState(false);
  const from = useRef(0),
    { reduced } = useExperience(),
    controlId = useId();
  const current = spec.cases.find((c) => c.id === selected) ?? initial;
  const timed = astronomyTimed(current.model),
    clock = astronomyClock(current.model);
  const seconds = current.model.kind === "orbit" || current.model.kind === "launch" ? 7 : 6;
  useEffect(() => {
    if (!playing || reduced) {
      if (reduced) setPlaying(false);
      return;
    }
    let request = 0,
      start: number | undefined;
    const advance = (now: number) => {
      start ??= now;
      const next = Math.min(1, from.current + (now - start) / (seconds * 1000));
      setFraction(next);
      if (next < 1) request = requestAnimationFrame(advance);
      else setPlaying(false);
    };
    request = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(request);
  }, [playing, reduced, seconds, selected]);
  function select(caseId: string) {
    const next = spec.cases.find((c) => c.id === caseId)!;
    setPlaying(false);
    setSelected(caseId);
    setFraction(astronomyStart(next.model));
  }
  const shown = fraction * clock.span;
  return (
    <div className="learning-diagram astronomy-diagram" data-playing={playing ? "true" : "false"}>
      <div className="astro-cases" role="group" aria-label="Compare astronomical cases">
        {spec.cases.map((c) => (
          <button
            type="button"
            key={c.id}
            aria-pressed={selected === c.id}
            onClick={() => select(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <AstronomyDrawing
        model={current.model}
        models={spec.cases.map((c) => c.model)}
        fraction={fraction}
        reveal={showResults}
      />
      {timed ? (
        <div className="astro-playback">
          <div className="astro-controls">
            {!reduced ? (
              <button
                type="button"
                onClick={() => {
                  from.current = fraction >= 1 ? 0 : fraction;
                  if (fraction >= 1) setFraction(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? (
                  <Pause aria-hidden="true" size={16} />
                ) : (
                  <Play aria-hidden="true" size={16} />
                )}
                {playing ? "Pause" : fraction >= 1 ? "Replay" : "Play"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setFraction(Math.min(1, fraction + 1 / 12));
              }}
            >
              <SkipForward aria-hidden="true" size={16} />
              Step
            </button>
            <button type="button" onClick={() => select(spec.initialCaseId)}>
              <RotateCcw aria-hidden="true" size={16} />
              Reset
            </button>
          </div>
          <label htmlFor={controlId} className="astro-scrubber">
            <span>
              {clock.label}{" "}
              <output>
                {n(shown, clock.unit === "%" ? 0 : 1)}
                {clock.unit === "%" ? "%" : " " + clock.unit}
              </output>
            </span>
            <input
              id={controlId}
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(fraction * 100)}
              aria-label={clock.label}
              onChange={(e) => {
                setPlaying(false);
                setFraction(Number(e.currentTarget.value) / 100);
              }}
            />
          </label>
        </div>
      ) : null}
      <details className="astro-description">
        <summary>Read given values</summary>
        <p>{astronomyGivens(current.model)}</p>
      </details>
      {showResults ? (
        <dl className="astro-measures" aria-label="Worked results for this case">
          {astronomyMeasures(current.model).map((value) => (
            <div key={value.label}>
              <dt>{value.label}</dt>
              <dd>{value.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
