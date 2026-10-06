import type { EngineeringDiagram as Spec, EngineeringModel } from "@discere/contracts";
import {
  axial,
  barMoments,
  beamMoment,
  beamReactions,
  beamShear,
  cantileverDeflection,
  cantileverShape,
  engineeringGivenList,
  engineeringGivens,
  engineeringMeasures,
  engineeringNumber as n,
  forceComponents,
  gearResult,
  gearWheelSpeeds,
  leverResult,
  netMoment,
  pulleyResult,
  resultant,
  sectionProperties,
  solveTruss,
  stressStrainCurve,
  type BeamModel,
  type CantileverModel,
  type ConcurrentModel,
  type GearsModel,
  type LeverModel,
  type MomentModel,
  type PulleyModel,
  type SectionModel,
  type StressStrainModel,
  type TrussModel,
} from "@discere/activity-engine";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useExperience } from "../../study/experience.js";

type Kind = EngineeringModel["kind"];
type Of<K extends Kind> = Extract<EngineeringModel, { kind: K }>;

/** How each model is driven: the slider's meaning, playback length and where it rests. */
const DRIVE: Record<Kind, { label: string; step: string; seconds: number; rest: number }> = {
  concurrent: { label: "Tip to tail", step: "Next step", seconds: 2.4, rest: 0 },
  moment: { label: "Apply forces", step: "Next step", seconds: 1.6, rest: 1 },
  beam: { label: "Load applied", step: "Next step", seconds: 1.8, rest: 1 },
  truss: { label: "Load applied", step: "Next step", seconds: 1.8, rest: 1 },
  stress_strain: { label: "Tensile test", step: "Next step", seconds: 6, rest: 0 },
  section: { label: "Moment applied", step: "Next step", seconds: 1.6, rest: 1 },
  cantilever: { label: "Tip load applied", step: "Next step", seconds: 1.8, rest: 1 },
  lever: { label: "Lever travel", step: "Next step", seconds: 2, rest: 0 },
  pulley: { label: "Rope pulled", step: "Next step", seconds: 3, rest: 0 },
  gears: { label: "Running time", step: "Next step", seconds: 6, rest: 0 },
};
const W = 640,
  H = 360;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pts = (list: Array<[number, number]>) =>
  list.map(([x, y]) => x.toFixed(2) + " " + y.toFixed(2)).join(" L");

function T({
  x,
  y,
  children,
  size = "label",
  anchor = "middle",
  className = "",
  style,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: "label" | "small" | "value" | "title";
  anchor?: "start" | "middle" | "end";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      style={style}
      className={"engr-" + size + (className ? " " + className : "")}
    >
      {children}
    </text>
  );
}

/** An arrow from (x1, y1) to (x2, y2) with a drawn head, so it can glow and animate. */
function Arrow({
  x1,
  y1,
  x2,
  y2,
  tone = "load",
  width = 4,
  dashed = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone?: "load" | "reaction" | "tension" | "compression" | "neutral" | "result" | "effort";
  width?: number;
  dashed?: boolean;
}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 0.5) return null;
  const ux = (x2 - x1) / len,
    uy = (y2 - y1) / len;
  const head = Math.min(16, len * 0.55),
    half = head * 0.48;
  const bx = x2 - ux * head,
    by = y2 - uy * head;
  return (
    <g className={"engr-arrow engr-tone-" + tone}>
      <path
        d={"M" + x1 + " " + y1 + "L" + bx + " " + by}
        strokeWidth={width}
        strokeDasharray={dashed ? "7 6" : undefined}
      />
      <path
        d={
          "M" +
          x2 +
          " " +
          y2 +
          "L" +
          (bx - uy * half) +
          " " +
          (by + ux * half) +
          "L" +
          (bx + uy * half) +
          " " +
          (by - ux * half) +
          "Z"
        }
        className="engr-head"
      />
    </g>
  );
}

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id + "-bg"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1a1f26" />
        <stop offset="1" stopColor="#11151a" />
      </linearGradient>
      <pattern id={id + "-grid"} width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M20 0H0V20" fill="none" stroke="#ffffff" strokeOpacity="0.035" strokeWidth="1" />
      </pattern>
      <radialGradient id={id + "-vignette"} cx="0.5" cy="0.45" r="0.75">
        <stop offset="0.55" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.45" />
      </radialGradient>
      <linearGradient id={id + "-steel"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: "var(--engr-steel-highlight)" }} />
        <stop offset="0.45" stopColor="#8d9aa8" />
        <stop offset="1" stopColor="#4c5866" />
      </linearGradient>
      <linearGradient id={id + "-steel-side"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6c7988" />
        <stop offset="1" stopColor="#38424e" />
      </linearGradient>
      <linearGradient id={id + "-accent"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffb37a" />
        <stop offset="1" stopColor="#ff7a24" />
      </linearGradient>
      <linearGradient id={id + "-shear"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4fd8c8" stopOpacity="0.75" />
        <stop offset="1" stopColor="#4fd8c8" stopOpacity="0.12" />
      </linearGradient>
      <linearGradient id={id + "-moment"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff8a3d" stopOpacity="0.12" />
        <stop offset="1" stopColor="#ff8a3d" stopOpacity="0.7" />
      </linearGradient>
      <linearGradient id={id + "-tension"} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ff6b6b" stopOpacity="0.15" />
        <stop offset="1" stopColor="#ff6b6b" stopOpacity="0.85" />
      </linearGradient>
      <linearGradient id={id + "-compression"} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#5aa9ff" stopOpacity="0.15" />
        <stop offset="1" stopColor="#5aa9ff" stopOpacity="0.85" />
      </linearGradient>
      <radialGradient id={id + "-gear"} cx="0.4" cy="0.35" r="0.8">
        <stop offset="0" stopColor="#d9e2ea" />
        <stop offset="0.6" stopColor="#8794a3" />
        <stop offset="1" stopColor="#4a5563" />
      </radialGradient>
      <radialGradient id={id + "-gear-accent"} cx="0.4" cy="0.35" r="0.8">
        <stop offset="0" stopColor="#ffd1ad" />
        <stop offset="0.6" stopColor="#ff8a3d" />
        <stop offset="1" stopColor="#b54c0e" />
      </radialGradient>
      <linearGradient id={id + "-crate"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffb37a" />
        <stop offset="1" stopColor="#c45a14" />
      </linearGradient>
      <filter
        id={id + "-glow"}
        filterUnits="userSpaceOnUse"
        x="-700"
        y="-700"
        width="2040"
        height="1760"
      >
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter
        id={id + "-shadow"}
        filterUnits="userSpaceOnUse"
        x="-700"
        y="-700"
        width="2040"
        height="1760"
      >
        <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000" floodOpacity="0.45" />
      </filter>
      <marker
        id={id + "-arc-head"}
        viewBox="0 0 10 10"
        refX="6"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto-start-reverse"
      >
        <path d="M0 0L10 5L0 10Z" fill="#ffb37a" />
      </marker>
      <pattern
        id={id + "-hatch"}
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <path d="M0 0V8" stroke="#7f8c99" strokeWidth="2" />
      </pattern>
    </defs>
  );
}

// ---------------------------------------------------------------------------
// Supports and small parts
// ---------------------------------------------------------------------------

function Pin({ x, y, id, roller = false }: { x: number; y: number; id: string; roller?: boolean }) {
  return (
    <g className="engr-support" filter={"url(#" + id + "-shadow)"}>
      <path d={"M" + x + " " + y + "l-15 24h30z"} fill={"url(#" + id + "-steel)"} />
      <circle cx={x} cy={y} r="4.5" className="engr-joint-dot" />
      {roller ? (
        <>
          <circle cx={x - 8} cy={y + 29} r="5" fill="#8d9aa8" />
          <circle cx={x + 8} cy={y + 29} r="5" fill="#8d9aa8" />
          <rect x={x - 24} y={y + 34} width="48" height="8" fill={"url(#" + id + "-hatch)"} />
        </>
      ) : (
        <rect x={x - 24} y={y + 24} width="48" height="9" fill={"url(#" + id + "-hatch)"} />
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// 1. Forces at a point
// ---------------------------------------------------------------------------

function ConcurrentDrawing({
  m,
  models,
  p,
  reveal,
  id,
}: {
  m: ConcurrentModel;
  models: ConcurrentModel[];
  p: number;
  reveal: boolean;
  id: string;
}) {
  const layout = (model: ConcurrentModel) => {
    const parts = forceComponents(model);
    let cx = 0,
      cy = 0;
    const chain = parts.map((c) => {
      const tail = [cx, cy] as const;
      cx += c.x;
      cy += c.y;
      return tail;
    });
    return { parts, chain, end: [cx, cy] as const };
  };
  // A shared scale for every case, fitted to both arrangements.
  const extents = models.flatMap((model) => {
    const l = layout(model);
    return [
      [0, 0],
      [l.end[0], l.end[1]],
      ...l.parts.map((c) => [c.x, c.y]),
      ...l.chain.map((c, i) => [c[0] + l.parts[i]!.x, c[1] + l.parts[i]!.y]),
    ];
  });
  const xs = extents.map((e) => e[0]!),
    ys = extents.map((e) => e[1]!);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const scale = Math.min(420 / Math.max(1e-6, maxX - minX), 230 / Math.max(1e-6, maxY - minY), 60);
  const ox = W / 2 - ((minX + maxX) / 2) * scale,
    oy = 190 + ((minY + maxY) / 2) * scale;
  const X = (x: number) => ox + x * scale,
    Y = (y: number) => oy - y * scale;
  const { parts, chain, end } = layout(m);
  const r = resultant(m);
  const ease = p * p * (3 - 2 * p);
  return (
    <>
      <path d={"M" + (X(minX) - 40) + " " + oy + "H" + (X(maxX) + 40)} className="engr-axis" />
      <path d={"M" + ox + " " + (Y(maxY) - 30) + "V" + (Y(minY) + 30)} className="engr-axis" />
      <T x={X(maxX) + 46} y={oy + 5} size="small" anchor="start">
        +x
      </T>
      <T x={ox} y={Y(maxY) - 38} size="small">
        +y
      </T>
      {parts.map((c, i) => {
        const tx = lerp(0, chain[i]![0], ease),
          ty = lerp(0, chain[i]![1], ease);
        const f = m.forces[i]!;
        const x1 = X(tx),
          y1 = Y(ty),
          x2 = X(tx + c.x),
          y2 = Y(ty + c.y);
        return (
          <g key={"force-" + f.label + "-" + f.angle} className="engr-force" data-force={f.label}>
            <g style={{ opacity: 1 - ease }}>
              <path d={"M" + x2 + " " + y2 + "V" + oy} className="engr-projection" />
              <path d={"M" + x2 + " " + y2 + "H" + ox} className="engr-projection" />
              {m.forces.length === 1 ? (
                <>
                  <path d={"M" + ox + " " + oy + "H" + x2} className="engr-component" />
                  <path d={"M" + ox + " " + oy + "V" + y2} className="engr-component" />
                  <T
                    x={(ox + x2) / 2}
                    y={oy + (c.y >= 0 ? 26 : -12)}
                    size="small"
                    className="engr-component-label"
                  >
                    {reveal ? "Fx = " + n(c.x, 2) + " " + m.unit : "Fx"}
                  </T>
                  <T
                    x={ox + (c.x >= 0 ? -12 : 12)}
                    y={(oy + y2) / 2 + 5}
                    size="small"
                    anchor={c.x >= 0 ? "end" : "start"}
                    className="engr-component-label"
                  >
                    {reveal ? "Fy = " + n(c.y, 2) + " " + m.unit : "Fy"}
                  </T>
                </>
              ) : null}
              {!f.slope && i === 0 && Math.abs(c.x) > 1e-9
                ? (() => {
                    const a = (Math.atan2(c.y, c.x) * 180) / Math.PI;
                    const r = 46;
                    const ex = ox + r * Math.cos((a * Math.PI) / 180),
                      ey = oy - r * Math.sin((a * Math.PI) / 180);
                    return (
                      <path
                        d={
                          "M" +
                          (ox + r) +
                          " " +
                          oy +
                          "A" +
                          r +
                          " " +
                          r +
                          " 0 0 " +
                          (a >= 0 ? 0 : 1) +
                          " " +
                          ex +
                          " " +
                          ey
                        }
                        className="engr-angle-arc"
                      />
                    );
                  })()
                : null}
            </g>
            <Arrow
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              tone={i === 0 ? "load" : i === 1 ? "effort" : i === 2 ? "reaction" : "neutral"}
              width={5}
            />
            <T
              x={x2 + (c.x >= 0 ? 10 : -10)}
              y={y2 + (c.y >= 0 ? -10 : 22)}
              anchor={c.x >= 0 ? "start" : "end"}
            >
              {f.label + " " + n(f.magnitude) + " " + m.unit}
            </T>
            {f.slope ? (
              <g style={{ opacity: 1 - ease }} className="engr-slope">
                {(() => {
                  const s = 22 / Math.hypot(f.slope.run, f.slope.rise);
                  const sx = x1 + (x2 - x1) * 0.55,
                    sy = y1 + (y2 - y1) * 0.55;
                  const run = f.slope.run * s,
                    rise = f.slope.rise * s;
                  return (
                    <>
                      <path d={"M" + sx + " " + sy + "h" + run + "v" + -rise} />
                      <T x={sx + run / 2} y={sy + (rise >= 0 ? 16 : -6)} size="small">
                        {n(Math.abs(f.slope.run))}
                      </T>
                      <T
                        x={sx + run + (run >= 0 ? 6 : -6)}
                        y={sy - rise / 2 + 5}
                        size="small"
                        anchor={run >= 0 ? "start" : "end"}
                      >
                        {n(Math.abs(f.slope.rise))}
                      </T>
                    </>
                  );
                })()}
              </g>
            ) : (
              <T
                x={x1 + (x2 - x1) * 0.5 + (c.y >= 0 ? 14 : -14)}
                y={y1 + (y2 - y1) * 0.5 + (c.x >= 0 ? 18 : -10)}
                size="small"
                anchor={c.y >= 0 ? "start" : "end"}
                className="engr-faint"
                style={{ opacity: 1 - ease }}
              >
                {n(((f.angle % 360) + 360) % 360, 1) + "°"}
              </T>
            )}
          </g>
        );
      })}
      {m.forces.length > 1 ? (
        <g
          className={"engr-resultant" + (r.magnitude === 0 ? " engr-closed" : "")}
          style={{ opacity: ease }}
        >
          {r.magnitude > 1e-9 ? (
            <Arrow
              x1={X(0)}
              y1={Y(0)}
              x2={X(end[0])}
              y2={Y(end[1])}
              tone="result"
              width={3}
              dashed
            />
          ) : (
            <circle cx={X(0)} cy={Y(0)} r="13" className="engr-closure" />
          )}
          <T x={X(end[0] / 2) - 14} y={Y(end[1] / 2) - 12} size="small" anchor="end">
            {r.magnitude > 1e-9
              ? reveal
                ? "R = " + n(r.magnitude, 2) + " " + m.unit
                : "Resultant R"
              : "Polygon closes"}
          </T>
        </g>
      ) : null}
      <circle cx={ox} cy={oy} r="7" className="engr-origin" filter={"url(#" + id + "-glow)"} />
    </>
  );
}

// ---------------------------------------------------------------------------
// 2. Moments on a bar
// ---------------------------------------------------------------------------

function MomentDrawing({
  m,
  models,
  p,
  reveal,
  id,
}: {
  m: MomentModel;
  models: MomentModel[];
  p: number;
  reveal: boolean;
  id: string;
}) {
  const positions = models.flatMap((model) => model.forces.map((f) => f.position));
  const lo = Math.min(0, ...positions),
    hi = Math.max(0, ...positions);
  const span = Math.max(0.1, hi - lo);
  const scale = 400 / span;
  const X = (x: number) => W / 2 + (x - (lo + hi) / 2) * scale;
  const pivotX = X(0),
    barY = 176;
  const maxF = Math.max(1, ...models.flatMap((model) => model.forces.map((f) => f.magnitude)));
  const net = netMoment(m);
  const maxNet = Math.max(1e-9, ...models.map((model) => Math.abs(netMoment(model))));
  const tilt = net === 0 ? 0 : -Math.sign(net) * (1.5 + (2.5 * Math.abs(net)) / maxNet) * p;
  const spanner = models.every((model) => model.forces.every((f) => f.position >= 0));
  const moments = barMoments(m);
  const own = m.forces.map((f) => f.position);
  const left = X(Math.min(0, ...own)) - 22,
    right = X(Math.max(0, ...own)) + 22;
  return (
    <>
      <g
        className="engr-tilt"
        style={{
          transform: "rotate(" + tilt + "deg)",
          transformOrigin: pivotX + "px " + barY + "px",
        }}
      >
        <rect
          x={left}
          y={barY - 9}
          width={right - left}
          height="18"
          rx="9"
          fill={"url(#" + id + "-steel)"}
          filter={"url(#" + id + "-shadow)"}
        />
        <path
          d={"M" + (left + 10) + " " + (barY - 5) + "H" + (right - 10)}
          className="engr-highlight"
        />
        {m.forces.map((f, i) => {
          const len = 40 + (60 * f.magnitude) / maxF;
          const a = (f.angle * Math.PI) / 180;
          const x = X(f.position);
          const dx = Math.cos(a) * len,
            dy = -Math.sin(a) * len;
          // Pushes end at the bar; pulls along the bar start at it.
          const pull = Math.abs(Math.sin(a)) < 1e-6;
          const [x1, y1, x2, y2] = pull
            ? [x, barY, x + dx, barY + dy]
            : [x - dx, barY - dy, x, barY];
          const arm = moments[i]!;
          // Foot of the perpendicular from the pivot to the line of action.
          const ux = Math.cos(a),
            uy = -Math.sin(a);
          const t = (pivotX - x) * ux;
          const fx = x + ux * t,
            fy = barY + uy * t;
          return (
            <g
              key={"force-" + f.label + "-" + f.position}
              className="engr-force"
              data-force={f.label}
            >
              <path
                d={
                  "M" +
                  (x - dx * 1.6) +
                  " " +
                  (barY - dy * 1.6) +
                  "L" +
                  (x + dx * 1.6) +
                  " " +
                  (barY + dy * 1.6)
                }
                className="engr-line-of-action"
              />
              {arm.arm > 1e-9 && Math.abs(Math.sin(a)) < 0.999 ? (
                <g className="engr-arm">
                  <path d={"M" + pivotX + " " + barY + "L" + fx + " " + fy} />
                  <T x={(pivotX + fx) / 2 - 8} y={(barY + fy) / 2 - 8} size="small" anchor="end">
                    d⊥
                  </T>
                </g>
              ) : null}
              <Arrow x1={x1} y1={y1} x2={x2} y2={y2} tone="load" width={5} />
              <T
                x={(pull ? x2 + ux * 16 : x1 - ux * 16) + (Math.abs(ux) < 0.2 ? 0 : 0)}
                y={
                  (pull ? y2 + uy * 16 : y1 - uy * 16) +
                  6 +
                  (Math.abs(uy) > 0.5 ? (pull ? uy : -uy) * 8 : 0)
                }
                anchor={Math.abs(ux) < 0.3 ? "middle" : (pull ? ux : -ux) > 0 ? "start" : "end"}
              >
                {f.label + " " + n(f.magnitude) + " " + m.unit}
              </T>
              {Math.abs(f.angle % 180) > 1e-6 &&
              Math.abs((f.angle % 180) - 90) > 1e-6 &&
              Math.abs((f.angle % 180) + 90) > 1e-6 ? (
                <T x={x + 34} y={barY + 34} size="small" anchor="start">
                  {n(((f.angle % 360) + 360) % 360) + "°"}
                </T>
              ) : null}
              <path d={"M" + x + " " + (barY + 14) + "v10"} className="engr-tick" />
            </g>
          );
        })}
      </g>
      {spanner ? (
        <g filter={"url(#" + id + "-glow)"}>
          <path
            d={
              Array.from({ length: 6 }, (_, k) => {
                const a = (k * Math.PI) / 3 + Math.PI / 6;
                return (
                  (k ? "L" : "M") +
                  (pivotX + 22 * Math.cos(a)).toFixed(1) +
                  " " +
                  (barY + 22 * Math.sin(a)).toFixed(1)
                );
              }).join("") + "Z"
            }
            fill={"url(#" + id + "-accent)"}
          />
          <circle cx={pivotX} cy={barY} r="9" className="engr-joint-dot" />
        </g>
      ) : (
        <>
          <g filter={"url(#" + id + "-glow)"}>
            <path d={"M" + pivotX + " " + barY + "l-18 34h36z"} fill={"url(#" + id + "-accent)"} />
            <circle cx={pivotX} cy={barY} r="6" className="engr-joint-dot" />
          </g>
          <rect
            x={pivotX - 34}
            y={barY + 34}
            width="68"
            height="9"
            fill={"url(#" + id + "-hatch)"}
          />
        </>
      )}
      {(() => {
        const ticks = [...new Set([0, ...own])].sort((a, b) => a - b);
        return (
          <g className="engr-dimension">
            <path d={"M" + X(ticks[0]!) + " 318H" + X(ticks[ticks.length - 1]!)} />
            {ticks.map((x) => (
              <g key={x}>
                <path d={"M" + X(x) + " 311v14"} />
                <T x={X(x)} y={344} size="small">
                  {x === 0 ? (spanner ? "bolt" : "pivot") : n(x) + " m"}
                </T>
              </g>
            ))}
          </g>
        );
      })()}
      <g className="engr-spin" style={{ opacity: p }}>
        {net !== 0 ? (
          <path
            d={
              net > 0
                ? "M" +
                  (pivotX + 46) +
                  " " +
                  (barY - 64) +
                  "A70 70 0 0 0 " +
                  (pivotX - 46) +
                  " " +
                  (barY - 64)
                : "M" +
                  (pivotX - 46) +
                  " " +
                  (barY - 64) +
                  "A70 70 0 0 1 " +
                  (pivotX + 46) +
                  " " +
                  (barY - 64)
            }
            className="engr-moment-arc"
            markerEnd={"url(#" + id + "-arc-head)"}
          />
        ) : null}
        <T x={pivotX} y={barY - 86} size="small">
          {reveal
            ? "Net moment " + n(net, 2) + " " + m.unit + "·m"
            : net === 0
              ? "No net turning"
              : net > 0
                ? "Turns anticlockwise"
                : "Turns clockwise"}
        </T>
      </g>
    </>
  );
}

// ---------------------------------------------------------------------------
// 3. Beams: loads, reactions, shear and moment
// ---------------------------------------------------------------------------

function beamShape(m: BeamModel, samples: number[]): number[] {
  // Integrate curvature (∝ M) twice, then impose the supports. EI is arbitrary: the shape only.
  const dx = samples[1]! - samples[0]!;
  const slope: number[] = [0],
    y: number[] = [0];
  for (let i = 1; i < samples.length; i++) {
    const k = (beamMoment(m, samples[i - 1]!) + beamMoment(m, samples[i]!)) / 2;
    slope.push(slope[i - 1]! + k * dx);
    y.push(y[i - 1]! + ((slope[i - 1]! + slope[i]!) / 2) * dx);
  }
  if (m.support === "cantilever") return y.map((v) => -v);
  const [a, b] = m.supports!;
  const at = (x: number) => {
    const i = clamp(Math.round((x - samples[0]!) / dx), 0, samples.length - 1);
    return y[i]!;
  };
  const ya = at(a),
    yb = at(b);
  return samples.map((x, i) => -(y[i]! - (ya + ((yb - ya) * (x - a)) / (b - a))));
}

function BeamDrawing({
  m,
  models,
  p,
  probe,
  reveal,
  id,
}: {
  m: BeamModel;
  models: BeamModel[];
  p: number;
  probe: number;
  reveal: boolean;
  id: string;
}) {
  const maxL = Math.max(...models.map((v) => v.length));
  const x0 = 80,
    scale = 480 / maxL;
  const X = (x: number) => x0 + x * scale;
  const beamY = 150;
  const samples = Array.from({ length: 161 }, (_, i) => (i / 160) * m.length);
  const shape = beamShape(m, samples);
  const shapeMax = Math.max(
    1e-9,
    ...models.map((v) =>
      Math.max(
        ...beamShape(
          v,
          Array.from({ length: 81 }, (_, i) => (i / 80) * v.length),
        ).map(Math.abs),
      ),
    ),
  );
  const sag = (i: number) => (shape[i]! / shapeMax) * 12 * p;
  const deflected = samples.map((x, i) => [X(x), beamY + sag(i)] as [number, number]);
  const loadMax = Math.max(
    1,
    ...models.flatMap((v) => [
      ...v.pointLoads.map((q) => q.magnitude),
      ...v.spreadLoads.map((w) => w.intensity * 3),
    ]),
  );
  const r = beamReactions(m);
  const showDiagram = m.display !== "reactions";
  const probeX = probe * m.length;
  const display = m.display;
  // Diagram band.
  const values = (v: BeamModel, f: (x: number) => number) =>
    Array.from({ length: 161 }, (_, i) => f((i / 160) * v.length));
  const shearAt = (v: BeamModel, x: number) => beamShear(v, x, "right");
  const scaleMax = Math.max(
    1e-9,
    ...models.flatMap((v) =>
      (display === "moment"
        ? values(v, (x) => beamMoment(v, x))
        : values(v, (x) => shearAt(v, x))
      ).map(Math.abs),
    ),
  );
  const bandY = 278,
    bandH = 52;
  const dY = (value: number) => bandY - (value / scaleMax) * bandH * p;
  const diagram =
    display === "moment"
      ? samples.map((x) => beamMoment(m, x))
      : samples.map((x, i) => (i === samples.length - 1 ? beamShear(m, x, "left") : shearAt(m, x)));
  // Draw shear as true steps by inserting the left value just before each jump.
  const diagramPts: Array<[number, number]> = [];
  samples.forEach((x, i) => {
    if (display === "shear" && i > 0) {
      const left = beamShear(m, x, "left");
      if (Math.abs(left - diagram[i - 1]!) > 1e-9 && Math.abs(left - diagram[i]!) > 1e-9)
        diagramPts.push([X(x), dY(left)]);
    }
    diagramPts.push([X(x), dY(diagram[i]!)]);
  });
  const area =
    "M" + X(0) + " " + bandY + "L" + pts(diagramPts) + "L" + X(m.length) + " " + bandY + "Z";
  const probeV = beamShear(m, probeX, "right"),
    probeM = beamMoment(m, probeX);
  const probeY = display === "moment" ? dY(probeM) : dY(probeV);
  const marks = [
    ...new Set([
      0,
      m.length,
      ...(m.supports ?? []),
      ...m.pointLoads.map((q) => q.position),
      ...m.spreadLoads.flatMap((w) => [w.start, w.end]),
    ]),
  ].sort((a, b) => a - b);
  const sagAt = (x: number) => sag(clamp(Math.round((x / m.length) * 160), 0, 160));
  return (
    <>
      {m.support === "cantilever" ? (
        <g>
          <rect
            x={X(0) - 22}
            y={beamY - 46}
            width="22"
            height="92"
            fill={"url(#" + id + "-hatch)"}
          />
          <path d={"M" + X(0) + " " + (beamY - 46) + "V" + (beamY + 46)} className="engr-wall" />
        </g>
      ) : null}
      <g filter={"url(#" + id + "-shadow)"}>
        <path d={"M" + pts(deflected)} className="engr-beam-body" />
        <path d={"M" + pts(deflected.map(([x, y]) => [x, y + 5]))} className="engr-beam-under" />
        <path d={"M" + pts(deflected.map(([x, y]) => [x, y - 4.5]))} className="engr-highlight" />
      </g>
      {m.support === "simple"
        ? m.supports!.map((s, i) => (
            <Pin key={"support-" + s} x={X(s)} y={beamY + 9 + sagAt(s)} id={id} roller={i === 1} />
          ))
        : null}
      {m.spreadLoads.map((w, i) => {
        const h = 18 + ((showDiagram ? 30 : 42) * w.intensity * 3) / loadMax;
        const count = Math.max(3, Math.round(((w.end - w.start) * scale) / 34));
        return (
          <g
            key={"w-" + w.start + "-" + w.end}
            className="engr-udl"
            style={{ opacity: Math.min(1, p * 1.5) }}
          >
            <path
              d={"M" + X(w.start) + " " + (beamY - 12 - h) + "H" + X(w.end)}
              className="engr-udl-top"
            />
            {Array.from({ length: count + 1 }, (_, k) => {
              const x = w.start + ((w.end - w.start) * k) / count;
              return (
                <Arrow
                  key={"udl-" + x}
                  x1={X(x)}
                  y1={beamY - 12 - h}
                  x2={X(x)}
                  y2={beamY - 11 + sagAt(x)}
                  tone="load"
                  width={2.5}
                />
              );
            })}
            <T x={(X(w.start) + X(w.end)) / 2} y={beamY - 22 - h}>
              {n(w.intensity) + " kN/m"}
            </T>
          </g>
        );
      })}
      {m.pointLoads.map((q, i) => {
        const len = (34 + ((showDiagram ? 40 : 52) * q.magnitude) / loadMax) * (0.35 + 0.65 * p);
        const y2 = beamY - 11 + sagAt(q.position);
        return (
          <g key={"p-" + q.position + "-" + q.magnitude}>
            <Arrow
              x1={X(q.position)}
              y1={y2 - len}
              x2={X(q.position)}
              y2={y2}
              tone="load"
              width={5}
            />
            <T x={X(q.position)} y={y2 - len - 10}>
              {n(q.magnitude) + " kN"}
            </T>
          </g>
        );
      })}
      {display === "reactions"
        ? r.forces.map((f, i) => {
            const x = X(f.position);
            const top = beamY + (m.support === "cantilever" ? 14 : 52);
            const len = reveal
              ? (Math.sign(f.value) || 1) *
                (24 + (40 * Math.abs(f.value)) / Math.max(1, r.totalLoad))
              : 40;
            const name = m.support === "cantilever" ? "R" : i ? "R_B" : "R_A";
            return (
              <g key={"r-" + f.position} className="engr-reaction">
                {len >= 0 ? (
                  <Arrow x1={x} y1={top + len} x2={x} y2={top} tone="reaction" width={4} />
                ) : (
                  <Arrow x1={x} y1={top} x2={x} y2={top - len} tone="reaction" width={4} />
                )}
                <T x={x} y={top + Math.abs(len) + 22}>
                  {reveal ? name + " = " + n(f.value, 2) + " kN" : name + " ?"}
                </T>
              </g>
            );
          })
        : null}
      {display === "reactions" ? (
        <g className="engr-dimension">
          <path d={"M" + X(0) + " 318H" + X(m.length)} />
          {marks.map((x) => (
            <g key={x}>
              <path d={"M" + X(x) + " 311v14"} />
              <T x={X(x)} y={343} size="small">
                {n(x) + " m"}
              </T>
            </g>
          ))}
        </g>
      ) : (
        <g className="engr-diagram-band">
          <path d={"M" + X(0) + " " + bandY + "H" + X(m.length)} className="engr-zero" />
          <path
            d={area}
            fill={"url(#" + id + "-" + (display === "moment" ? "moment" : "shear") + ")"}
            className="engr-diagram-fill"
          />
          <path d={"M" + pts(diagramPts)} className={"engr-diagram-line engr-diagram-" + display} />
          <T x={X(0) - 12} y={bandY - bandH + 4} size="small" anchor="end">
            {display === "moment" ? "M" : "V"}
          </T>
          {marks.map((x) => (
            <T key={x} x={X(x)} y={bandY + bandH + 22} size="small" className="engr-faint">
              {n(x)}
            </T>
          ))}
          <T
            x={X(m.length) + 14}
            y={bandY + bandH + 22}
            size="small"
            anchor="start"
            className="engr-faint"
          >
            m
          </T>
        </g>
      )}
      {display !== "reactions" ? (
        <g className="engr-probe">
          <path d={"M" + X(probeX) + " " + (beamY - 40) + "V" + (bandY + bandH + 4)} />
          <circle cx={X(probeX)} cy={probeY} r="6" filter={"url(#" + id + "-glow)"} />
          <circle cx={X(probeX)} cy={beamY + sagAt(probeX)} r="4" />
        </g>
      ) : null}
      <T x={22} y={30} size="small" anchor="start" className="engr-faint">
        {display === "reactions"
          ? "Free-body diagram"
          : display === "moment"
            ? "Bending moment · sagging plotted down"
            : "Shear force · upward on the left is positive"}
      </T>
    </>
  );
}

// ---------------------------------------------------------------------------
// 4. Trusses
// ---------------------------------------------------------------------------

function TrussDrawing({
  m,
  models,
  p,
  joint,
  reveal,
  id,
}: {
  m: TrussModel;
  models: TrussModel[];
  p: number;
  joint: string | null;
  reveal: boolean;
  id: string;
}) {
  const all = models.flatMap((v) => v.nodes);
  const maxX = Math.max(...all.map((v) => v.x)),
    maxY = Math.max(...all.map((v) => v.y));
  const scale = Math.min(440 / Math.max(1e-6, maxX), 135 / Math.max(1e-6, maxY));
  const ox = W / 2 - (maxX * scale) / 2,
    oy = 276;
  const P = (id: string) => {
    const node = m.nodes.find((v) => v.id === id)!;
    return [ox + node.x * scale, oy - node.y * scale] as const;
  };
  const s = solveTruss(m);
  const maxF = Math.max(
    1e-9,
    ...models.flatMap((v) => solveTruss(v).members.map((x) => Math.abs(x.force))),
  );
  const loadMax = Math.max(1, ...models.flatMap((v) => v.loads.map((l) => Math.hypot(l.fx, l.fy))));
  return (
    <>
      {m.members.map(([a, b], j) => {
        const [x1, y1] = P(a),
          [x2, y2] = P(b);
        const f = s.members[j]!.force;
        const tone = !reveal
          ? "neutral"
          : Math.abs(f) < 1e-9
            ? "zero"
            : f > 0
              ? "tension"
              : "compression";
        const width = reveal ? 5 + ((9 * Math.abs(f)) / maxF) * p : 8;
        return (
          <g key={a + b} className={"engr-member engr-member-" + tone} data-member={a + b}>
            <path
              d={"M" + x1 + " " + y1 + "L" + x2 + " " + y2}
              className="engr-member-shadow"
              strokeWidth={width + 5}
            />
            <path
              d={"M" + x1 + " " + y1 + "L" + x2 + " " + y2}
              className="engr-member-body"
              strokeWidth={width}
              filter={
                tone === "tension" || tone === "compression" ? "url(#" + id + "-glow)" : undefined
              }
              style={{ opacity: tone === "neutral" || tone === "zero" ? 1 : 0.35 + 0.65 * p }}
            />
            {reveal && tone !== "zero" ? (
              <path
                d={
                  f > 0
                    ? "M" + x1 + " " + y1 + "L" + x2 + " " + y2
                    : "M" + x2 + " " + y2 + "L" + x1 + " " + y1
                }
                className="engr-flow"
              />
            ) : null}
            {reveal ? (
              <T
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 10}
                size="small"
                className="engr-member-label"
              >
                {Math.abs(f) < 1e-9 ? "0" : n(Math.abs(f), 2) + (f > 0 ? " T" : " C")}
              </T>
            ) : (
              <T x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 10} size="small" className="engr-faint">
                {a + b}
              </T>
            )}
          </g>
        );
      })}
      <Pin x={P(m.pin)[0]} y={P(m.pin)[1] + 8} id={id} />
      <Pin x={P(m.roller)[0]} y={P(m.roller)[1] + 8} id={id} roller />
      {m.loads.map((l, i) => {
        const [x, y] = P(l.node);
        const mag = Math.hypot(l.fx, l.fy);
        const len = (36 + (46 * mag) / loadMax) * (0.3 + 0.7 * p);
        const ux = l.fx / mag,
          uy = -l.fy / mag;
        const start = l.fy < 0 ? [x - ux * len, y - uy * len - 12] : [x, y];
        const end = l.fy < 0 ? [x, y - 12] : [x + ux * len, y + uy * len];
        return (
          <g key={"load-" + l.node + "-" + l.fx + "-" + l.fy}>
            <Arrow x1={start[0]!} y1={start[1]!} x2={end[0]!} y2={end[1]!} tone="load" width={5} />
            <T x={start[0]! - 12} y={start[1]! + 14} anchor="end">
              {n(mag) + " kN"}
            </T>
          </g>
        );
      })}
      {joint ? (
        <g className="engr-joint-focus">
          {(() => {
            const [x, y] = P(joint);
            return (
              <>
                <circle cx={x} cy={y} r="46" className="engr-cut" />
                {m.members.map(([a, b], j) => {
                  if (a !== joint && b !== joint) return null;
                  const [ox2, oy2] = P(a === joint ? b : a);
                  const L = Math.hypot(ox2 - x, oy2 - y);
                  const ux = (ox2 - x) / L,
                    uy = (oy2 - y) / L;
                  const f = s.members[j]!.force;
                  const tension = f >= 0;
                  // On the joint, tension pulls toward the member; compression pushes back on it.
                  const [ax1, ay1, ax2, ay2] =
                    !reveal || tension
                      ? [x + ux * 12, y + uy * 12, x + ux * 46, y + uy * 46]
                      : [x + ux * 46, y + uy * 46, x + ux * 12, y + uy * 12];
                  return (
                    <g key={a + b}>
                      <Arrow
                        x1={ax1}
                        y1={ay1}
                        x2={ax2}
                        y2={ay2}
                        tone={
                          !reveal
                            ? "result"
                            : Math.abs(f) < 1e-9
                              ? "neutral"
                              : tension
                                ? "tension"
                                : "compression"
                        }
                        width={3}
                      />
                      <T x={x + ux * 64} y={y + uy * 64 + 5} size="small">
                        {"F" + (a + b)}
                      </T>
                    </g>
                  );
                })}
              </>
            );
          })()}
        </g>
      ) : null}
      {m.nodes.map((v) => {
        const [x, y] = P(v.id);
        const cx = m.nodes.reduce((a, b) => a + b.x, 0) / m.nodes.length,
          cy = m.nodes.reduce((a, b) => a + b.y, 0) / m.nodes.length;
        // Labels sit outside the frame, away from the centroid and clear of loads and supports.
        let dx = v.x - cx,
          dy = -(v.y - cy);
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
        if (v.y === 0) dy = Math.min(dy, 0.2);
        const side = Math.abs(dx) < 0.3 ? 1 : Math.sign(dx);
        return (
          <g key={v.id} className={"engr-node" + (joint === v.id ? " engr-node-active" : "")}>
            <circle cx={x} cy={y} r="9" />
            <T
              x={x + side * 26}
              y={y + (v.y === 0 ? -10 : 6)}
              anchor={side > 0 ? "start" : "end"}
              className="engr-node-label"
            >
              {v.id}
            </T>
          </g>
        );
      })}
      <g className="engr-legend">
        {reveal ? (
          <>
            <rect x="24" y="22" width="16" height="6" rx="3" className="engr-key-tension" />
            <T x={46} y={30} size="small" anchor="start">
              Tension
            </T>
            <rect x="124" y="22" width="16" height="6" rx="3" className="engr-key-compression" />
            <T x={146} y={30} size="small" anchor="start">
              Compression
            </T>
          </>
        ) : null}
      </g>
    </>
  );
}

// ---------------------------------------------------------------------------
// 5. Stress–strain test
// ---------------------------------------------------------------------------

function StressStrainDrawing({
  m,
  models,
  p,
  reveal,
  id,
}: {
  m: StressStrainModel;
  models: StressStrainModel[];
  p: number;
  reveal: boolean;
  id: string;
}) {
  const curves = models.map((v) => stressStrainCurve(v));
  const curve = stressStrainCurve(m);
  const sMax = Math.max(...models.map((v) => v.ultimateStress)) * 1.12;
  const eyMax = Math.max(...models.map((v) => v.yieldStress / (v.modulus * 1000)));
  const eEnd = Math.max(...curves.map((c) => c[c.length - 1]!.strain));
  // A broken strain axis: the elastic range is enlarged into the first 28% of the width.
  const zoom = eyMax * 2.2;
  const gx0 = 92,
    gx1 = 600,
    gy0 = 314,
    gy1 = 124;
  const split = gx0 + (gx1 - gx0) * 0.28;
  const X = (e: number) =>
    e <= zoom
      ? gx0 + ((split - gx0) * e) / zoom
      : split + ((gx1 - split) * (e - zoom)) / (eEnd - zoom);
  const Y = (s: number) => gy0 - ((gy0 - gy1) * s) / sMax;
  // Move along the curve by drawn length so playback is even across both scales.
  const drawn = curve.map((c) => [X(c.strain), Y(c.stress)] as [number, number]);
  const lengths = [0];
  for (let i = 1; i < drawn.length; i++)
    lengths.push(
      lengths[i - 1]! +
        Math.hypot(drawn[i]![0] - drawn[i - 1]![0], drawn[i]![1] - drawn[i - 1]![1]),
    );
  const target = lengths[lengths.length - 1]! * p;
  let k = lengths.findIndex((l) => l >= target);
  if (k < 1) k = p >= 1 ? lengths.length - 1 : 1;
  const t =
    lengths[k] === lengths[k - 1]
      ? 0
      : (target - lengths[k - 1]!) / (lengths[k]! - lengths[k - 1]!);
  const here = {
    strain: lerp(curve[k - 1]!.strain, curve[k]!.strain, t),
    stress: lerp(curve[k - 1]!.stress, curve[k]!.stress, t),
  };
  const peakIndex = curve.reduce((best, c, i) => (c.stress > curve[best]!.stress ? i : best), 0);
  const necking =
    k > peakIndex
      ? (here.strain - curve[peakIndex]!.strain) /
        (curve[curve.length - 1]!.strain - curve[peakIndex]!.strain)
      : 0;
  const broken = p >= 1;
  const stretch = 1 + Math.min(0.3, (here.strain / eEnd) * 0.3);
  const a = axial(m);
  // Specimen.
  const cx = W / 2,
    half = 128 * stretch,
    grip = 30;
  const neck = 13 * (1 - 0.55 * necking);
  const specimen = (side: -1 | 1) =>
    "M" +
    (cx + side * (half + grip)) +
    " 38V82H" +
    (cx + side * half) +
    "L" +
    (cx + side * (half - 22)) +
    " " +
    (60 + 12) +
    "Q" +
    (cx + side * 20) +
    " " +
    (60 + 12) +
    " " +
    cx +
    " " +
    (60 + neck) +
    "V" +
    (60 - neck) +
    "Q" +
    (cx + side * 20) +
    " " +
    (60 - 12) +
    " " +
    (cx + side * (half - 22)) +
    " " +
    (60 - 12) +
    "L" +
    (cx + side * half) +
    " 38Z";
  const operating = Math.min(a.stress, m.ultimateStress);
  return (
    <>
      <g filter={"url(#" + id + "-shadow)"}>
        <g
          style={{ transform: broken ? "translateX(-8px)" : undefined }}
          className="engr-specimen-half"
        >
          <path d={specimen(-1)} fill={"url(#" + id + "-steel)"} />
        </g>
        <g
          style={{ transform: broken ? "translateX(8px)" : undefined }}
          className="engr-specimen-half"
        >
          <path d={specimen(1)} fill={"url(#" + id + "-steel)"} />
        </g>
      </g>
      <Arrow
        x1={cx - half - grip - 6}
        y1={60}
        x2={cx - half - grip - 48}
        y2={60}
        tone="load"
        width={4}
      />
      <Arrow
        x1={cx + half + grip + 6}
        y1={60}
        x2={cx + half + grip + 48}
        y2={60}
        tone="load"
        width={4}
      />
      <path d={"M" + gx0 + " " + gy1 + "V" + gy0 + "H" + gx1} className="engr-axis-strong" />
      <path
        d={"M" + split + " " + (gy0 - 6) + "l-5 12M" + (split + 6) + " " + (gy0 - 6) + "l-5 12"}
        className="engr-axis-strong"
      />
      <rect x={gx0} y={gy1} width={split - gx0} height={gy0 - gy1} className="engr-elastic-zone" />
      <T x={(gx0 + split) / 2} y={gy0 + 20} size="small" className="engr-faint">
        elastic, enlarged
      </T>
      <T x={(split + gx1) / 2} y={gy0 + 20} size="small" className="engr-faint">
        plastic
      </T>
      <T x={gx1} y={gy0 + 38} size="small" anchor="end">
        Strain
      </T>
      <T x={gx0 - 8} y={gy1 + 4} size="small" anchor="end">
        MPa
      </T>
      {models.map((v, i) =>
        v === m ? null : (
          <path
            key={"ghost-" + v.material + "-" + v.modulus + "-" + v.yieldStress}
            d={"M" + pts(curves[i]!.map((c) => [X(c.strain), Y(c.stress)]))}
            className="engr-curve-ghost"
          />
        ),
      )}
      {[m.yieldStress, m.ultimateStress].map((s, i) => (
        <g key={s}>
          <path d={"M" + gx0 + " " + Y(s) + "H" + gx1} className="engr-guide" />
          <T x={gx0 - 8} y={Y(s) + 5} size="small" anchor="end">
            {n(s)}
          </T>
          <T x={gx1} y={Y(s) - 7} size="small" anchor="end" className="engr-faint">
            {i ? "ultimate" : "yield"}
          </T>
        </g>
      ))}
      <path d={"M" + pts(drawn)} className="engr-curve" />
      <path
        d={"M" + pts(drawn.slice(0, k).concat([[X(here.strain), Y(here.stress)]]))}
        className="engr-curve-live"
        filter={"url(#" + id + "-glow)"}
      />
      <circle
        cx={X(here.strain)}
        cy={Y(here.stress)}
        r="7"
        className="engr-marker"
        filter={"url(#" + id + "-glow)"}
      />
      {reveal ? (
        <g className="engr-operating">
          <path d={"M" + gx0 + " " + Y(operating) + "H" + X(operating / (m.modulus * 1000))} />
          <circle
            cx={X(Math.min(a.strain, m.yieldStress / (m.modulus * 1000)))}
            cy={Y(Math.min(operating, m.yieldStress))}
            r="6"
          />
          <T x={X(Math.min(a.strain, zoom)) + 12} y={Y(operating) + 20} size="small" anchor="start">
            {n(m.load) + " kN → " + n(a.stress, 1) + " MPa"}
          </T>
        </g>
      ) : null}
      <T x={gx1} y={gy0 - 44} size="small" anchor="end">
        {m.material}
      </T>
      <T x={gx1} y={gy0 - 24} size="small" anchor="end" className="engr-faint">
        {"E = " + n(m.modulus) + " GPa"}
      </T>
    </>
  );
}

// ---------------------------------------------------------------------------
// 6. Bending of a section
// ---------------------------------------------------------------------------

function SectionDrawing({
  m,
  models,
  p,
  reveal,
  id,
}: {
  m: SectionModel;
  models: SectionModel[];
  p: number;
  reveal: boolean;
  id: string;
}) {
  const maxDim = Math.max(...models.flatMap((v) => [v.width, v.depth]));
  const s = 190 / maxDim;
  const cx = 190,
    cy = 190;
  const w = m.width * s,
    h = m.depth * s;
  const ex = 26,
    ey = -18;
  const outline =
    m.shape === "rectangle"
      ? [
          [-w / 2, -h / 2],
          [w / 2, -h / 2],
          [w / 2, h / 2],
          [-w / 2, h / 2],
        ]
      : (() => {
          const tf = m.flange! * s,
            tw = m.web! * s;
          return [
            [-w / 2, -h / 2],
            [w / 2, -h / 2],
            [w / 2, -h / 2 + tf],
            [tw / 2, -h / 2 + tf],
            [tw / 2, h / 2 - tf],
            [w / 2, h / 2 - tf],
            [w / 2, h / 2],
            [-w / 2, h / 2],
            [-w / 2, h / 2 - tf],
            [-tw / 2, h / 2 - tf],
            [-tw / 2, -h / 2 + tf],
            [-w / 2, -h / 2 + tf],
          ];
        })();
  const poly = (dx: number, dy: number) =>
    outline.map(([x, y]) => cx + x! + dx + "," + (cy + y! + dy)).join(" ");
  const props = sectionProperties(m);
  const sMax = Math.max(1e-9, ...models.map((v) => sectionProperties(v).stress));
  const px0 = 470,
    pw = 120 * (props.stress / sMax) * p;
  const top = cy - h / 2,
    bottom = cy + h / 2;
  return (
    <>
      <g filter={"url(#" + id + "-shadow)"}>
        <polygon points={poly(ex, ey)} fill={"url(#" + id + "-steel-side)"} />
        {outline.map(([x, y], i) => {
          const [x2, y2] = outline[(i + 1) % outline.length]!;
          return (
            <polygon
              key={"face-" + x + "-" + y}
              points={[
                [x!, y!],
                [x2!, y2!],
                [x2! + ex, y2! + ey],
                [x! + ex, y! + ey],
              ]
                .map(([a, b]) => cx + a! + "," + (cy + b!))
                .join(" ")}
              fill={"url(#" + id + "-steel-side)"}
              className="engr-extrude"
            />
          );
        })}
        <polygon
          points={poly(0, 0)}
          fill={"url(#" + id + "-steel)"}
          className="engr-section-face"
        />
      </g>
      <rect
        x={cx - w / 2}
        y={top}
        width={w}
        height={h / 2}
        className="engr-zone-compression"
        style={{ opacity: 0.4 * p }}
        clipPath={"url(#" + id + "-clip)"}
      />
      <clipPath id={id + "-clip"}>
        <polygon points={poly(0, 0)} />
      </clipPath>
      <rect
        x={cx - w / 2}
        y={cy}
        width={w}
        height={h / 2}
        className="engr-zone-tension"
        style={{ opacity: 0.4 * p }}
        clipPath={"url(#" + id + "-clip)"}
      />
      <path
        d={"M" + (cx - w / 2 - 30) + " " + cy + "H" + (px0 + 140)}
        className="engr-neutral-axis"
      />
      <T x={cx - w / 2 - 34} y={cy + 5} size="small" anchor="end">
        N.A.
      </T>
      <g className="engr-dimension">
        <path d={"M" + (cx - w / 2) + " " + (bottom + 22) + "H" + (cx + w / 2)} />
        <T x={cx} y={bottom + 44} size="small">
          {n(m.width) + " mm"}
        </T>
        <path d={"M" + (cx - w / 2 - 18) + " " + top + "V" + bottom} />
        <T x={cx - w / 2 - 24} y={top + 14} size="small" anchor="end">
          {n(m.depth) + " mm"}
        </T>
      </g>
      {m.shape === "i_beam" ? (
        <T x={cx + w / 2 + ex + 8} y={top + 4} size="small" anchor="start" className="engr-faint">
          {"flange " + n(m.flange!) + " · web " + n(m.web!)}
        </T>
      ) : null}
      <path d={"M" + px0 + " " + top + "V" + bottom} className="engr-axis-strong" />
      <path
        d={"M" + px0 + " " + top + "H" + (px0 + pw) + "L" + px0 + " " + cy + "Z"}
        fill={"url(#" + id + "-compression)"}
        className="engr-profile"
      />
      <path
        d={"M" + px0 + " " + bottom + "H" + (px0 + pw) + "L" + px0 + " " + cy + "Z"}
        fill={"url(#" + id + "-tension)"}
        className="engr-profile"
      />
      <T x={px0 + 6} y={top - 12} size="small" anchor="start">
        Compression
      </T>
      <T x={px0 + 6} y={bottom + 24} size="small" anchor="start">
        Tension
      </T>
      <T x={px0 + 60} y={42} size="small">
        Bending stress
      </T>
      {reveal ? (
        <>
          <T x={px0 + pw + 8} y={top + 5} size="small" anchor="start" className="engr-value-inline">
            {"−" + n(props.stress, 1) + " MPa"}
          </T>
          <T
            x={px0 + pw + 8}
            y={bottom + 5}
            size="small"
            anchor="start"
            className="engr-value-inline"
          >
            {"+" + n(props.stress, 1) + " MPa"}
          </T>
          <T x={cx} y={36} size="small">
            {"I = " + n(props.secondMoment / 1e6, 2) + " × 10⁶ mm⁴"}
          </T>
        </>
      ) : (
        <T x={cx} y={36} size="small">
          {"M = " + n(m.moment) + " kN·m"}
        </T>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 7. Cantilever deflection
// ---------------------------------------------------------------------------

function CantileverDrawing({
  m,
  models,
  p,
  reveal,
  id,
}: {
  m: CantileverModel;
  models: CantileverModel[];
  p: number;
  reveal: boolean;
  id: string;
}) {
  const maxL = Math.max(...models.map((v) => v.length));
  const x0 = 96,
    scale = 440 / maxL,
    y0 = 140;
  const tipMax = Math.max(1e-12, ...models.map((v) => cantileverDeflection(v).tipMetres));
  const k = (120 / tipMax) * p;
  const xs = Array.from({ length: 81 }, (_, i) => (i / 80) * m.length);
  const line = xs.map((x) => [x0 + x * scale, y0 + cantileverShape(m, x) * k] as [number, number]);
  const tip = line[line.length - 1]!;
  const c = cantileverDeflection(m);
  const thickness =
    8 + 10 * Math.cbrt(m.secondMoment / Math.max(...models.map((v) => v.secondMoment)));
  return (
    <>
      <rect x={x0 - 26} y={y0 - 70} width="26" height="150" fill={"url(#" + id + "-hatch)"} />
      <path d={"M" + x0 + " " + (y0 - 70) + "V" + (y0 + 80)} className="engr-wall" />
      <path
        d={"M" + x0 + " " + y0 + "H" + (x0 + m.length * scale)}
        className="engr-ghost-beam"
        strokeWidth={thickness}
      />
      <g filter={"url(#" + id + "-shadow)"}>
        <path d={"M" + pts(line)} className="engr-beam-body" strokeWidth={thickness} />
      </g>
      <path
        d={"M" + pts(line.map(([x, y]) => [x, y - thickness * 0.3]))}
        className="engr-highlight"
      />
      <Arrow
        x1={tip[0]}
        y1={tip[1] - 80}
        x2={tip[0]}
        y2={tip[1] - thickness / 2 - 2}
        tone="load"
        width={5}
      />
      <T x={tip[0]} y={tip[1] - 90}>
        {n(m.load) + " kN"}
      </T>
      <g className="engr-deflection" style={{ opacity: p }}>
        <path d={"M" + (tip[0] + 26) + " " + y0 + "V" + tip[1]} />
        <path d={"M" + (tip[0] + 18) + " " + y0 + "h16M" + (tip[0] + 18) + " " + tip[1] + "h16"} />
        <T x={tip[0] + 40} y={(y0 + tip[1]) / 2 + 5} anchor="start">
          {reveal ? "δ = " + n(c.tipMillimetres, 2) + " mm" : "δ ?"}
        </T>
      </g>
      <g className="engr-dimension">
        <path d={"M" + x0 + " 320H" + (x0 + m.length * scale)} />
        <path d={"M" + x0 + " 313v14M" + (x0 + m.length * scale) + " 313v14"} />
        <T x={x0 + (m.length * scale) / 2} y={312} size="small">
          {"L = " + n(m.length) + " m"}
        </T>
      </g>
      <T x={W - 24} y={290} size="small" anchor="end">
        {"E = " + n(m.modulus) + " GPa · I = " + n(m.secondMoment) + " × 10⁶ mm⁴"}
      </T>
      <T x={W - 24} y={346} size="small" anchor="end" className="engr-faint">
        deflection enlarged, shared scale
      </T>
    </>
  );
}

// ---------------------------------------------------------------------------
// 8. Levers
// ---------------------------------------------------------------------------

function LeverDrawing({
  m,
  models,
  p,
  reveal,
  id,
}: {
  m: LeverModel;
  models: LeverModel[];
  p: number;
  reveal: boolean;
  id: string;
}) {
  const span = Math.max(
    ...models.map((v) =>
      v.leverClass === "first" ? v.effortArm + v.loadArm : Math.max(v.effortArm, v.loadArm),
    ),
  );
  const scale = 470 / span;
  const pivotY = 200;
  const total =
    m.leverClass === "first" ? m.effortArm + m.loadArm : Math.max(m.effortArm, m.loadArm);
  const left = W / 2 - (total * scale) / 2;
  // Positions along the bar measured from the fulcrum: load to the left for a first-class lever.
  const fulcrum = m.leverClass === "first" ? left + m.loadArm * scale : left;
  const loadX =
    m.leverClass === "first" ? fulcrum - m.loadArm * scale : fulcrum + m.loadArm * scale;
  const effortX = fulcrum + m.effortArm * scale;
  const angle = -11 * p * (m.leverClass === "first" ? -1 : 1);
  const rot = (x: number) => {
    const a = (angle * Math.PI) / 180;
    return [fulcrum + (x - fulcrum) * Math.cos(a), pivotY + (x - fulcrum) * Math.sin(a)] as const;
  };
  const [lx, ly] = rot(loadX),
    [ex, ey] = rot(effortX);
  const barStart = Math.min(loadX, effortX, fulcrum) - 14,
    barEnd = Math.max(loadX, effortX, fulcrum) + 14;
  const r = leverResult(m);
  const effortUp = m.leverClass !== "first";
  return (
    <>
      <g
        style={{
          transform: "rotate(" + angle + "deg)",
          transformOrigin: fulcrum + "px " + pivotY + "px",
        }}
      >
        <rect
          x={barStart}
          y={pivotY - 8}
          width={barEnd - barStart}
          height="16"
          rx="8"
          fill={"url(#" + id + "-steel)"}
          filter={"url(#" + id + "-shadow)"}
        />
        <path
          d={"M" + (barStart + 10) + " " + (pivotY - 4) + "H" + (barEnd - 10)}
          className="engr-highlight"
        />
      </g>
      <g filter={"url(#" + id + "-shadow)"}>
        <rect
          x={lx - 30}
          y={ly - 8 - 48}
          width="60"
          height="48"
          rx="6"
          fill={"url(#" + id + "-crate)"}
        />
        <path d={"M" + (lx - 30) + " " + (ly - 32) + "H" + (lx + 30)} className="engr-crate-line" />
      </g>
      <T x={lx} y={ly - 66}>
        {n(m.load) + " N"}
      </T>
      <g filter={"url(#" + id + "-glow)"}>
        <path
          d={"M" + fulcrum + " " + (pivotY + 8) + "l-18 34h36z"}
          fill={"url(#" + id + "-accent)"}
        />
      </g>
      <rect
        x={fulcrum - 40}
        y={pivotY + 42}
        width="80"
        height="9"
        fill={"url(#" + id + "-hatch)"}
      />
      {effortUp ? (
        <Arrow x1={ex} y1={ey + 74} x2={ex} y2={ey + 10} tone="effort" width={5} />
      ) : (
        <Arrow x1={ex} y1={ey - 74} x2={ex} y2={ey - 10} tone="effort" width={5} />
      )}
      <T x={ex} y={effortUp ? ey + 96 : ey - 84}>
        {reveal ? "Effort " + n(r.effort, 1) + " N" : "Effort ?"}
      </T>
      {(() => {
        const one = m.leverClass === "first";
        const ye = one ? 318 : 300,
          yl = one ? 318 : 336;
        return (
          <g className="engr-dimension">
            <path
              d={"M" + fulcrum + " " + ye + "H" + effortX + "M" + effortX + " " + (ye - 6) + "v12"}
            />
            <path
              d={
                "M" +
                fulcrum +
                " " +
                yl +
                "H" +
                loadX +
                "M" +
                loadX +
                " " +
                (yl - 6) +
                "v12M" +
                fulcrum +
                " " +
                (Math.min(ye, yl) - 6) +
                "V" +
                (Math.max(ye, yl) + 6)
              }
            />
            <T x={(fulcrum + effortX) / 2} y={ye - 8} size="small">
              {"effort arm " + n(m.effortArm) + " m"}
            </T>
            <T x={(fulcrum + loadX) / 2} y={one ? yl - 8 : yl + 20} size="small">
              {"load arm " + n(m.loadArm) + " m"}
            </T>
          </g>
        );
      })()}
      <T x={24} y={34} size="small" anchor="start" className="engr-faint">
        {{ first: "First class", second: "Second class", third: "Third class" }[m.leverClass]}
      </T>
      {reveal ? (
        <T x={W - 24} y={34} size="small" anchor="end">
          {"MA = " + n(r.mechanicalAdvantage, 2)}
        </T>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// 9. Pulley systems
// ---------------------------------------------------------------------------

function PulleyDrawing({
  m,
  models,
  p,
  reveal,
  id,
}: {
  m: PulleyModel;
  models: PulleyModel[];
  p: number;
  reveal: boolean;
  id: string;
}) {
  const nMax = Math.max(...models.map((v) => v.strands));
  const liftPx = Math.min(56, 130 / nMax) * p;
  const topY = 74,
    blockY0 = 232;
  const blockY = blockY0 - liftPx;
  const spacing = 20;
  const cx = 250;
  const strands = Array.from(
    { length: m.strands },
    (_, i) => cx - ((m.strands - 1) * spacing) / 2 + i * spacing,
  );
  const freeX = cx + (Math.max(2, m.strands) * spacing) / 2 + 66;
  const handY = 128 + m.strands * liftPx;
  const r = pulleyResult(m);
  const spin = (m.strands * liftPx * 360) / (2 * Math.PI * 26);
  const sheave = (x: number, y: number, rad: number, key: string) => (
    <g
      key={key}
      style={{ transform: "rotate(" + spin + "deg)", transformOrigin: x + "px " + y + "px" }}
    >
      <circle cx={x} cy={y} r={rad} fill={"url(#" + id + "-gear)"} />
      <circle cx={x} cy={y} r={rad - 6} className="engr-sheave-groove" />
      <path
        d={
          "M" +
          (x - rad + 7) +
          " " +
          y +
          "H" +
          (x + rad - 7) +
          "M" +
          x +
          " " +
          (y - rad + 7) +
          "V" +
          (y + rad - 7)
        }
        className="engr-spoke"
      />
      <circle cx={x} cy={y} r="4" className="engr-joint-dot" />
    </g>
  );
  return (
    <>
      <rect x="120" y="18" width="400" height="14" fill={"url(#" + id + "-hatch)"} />
      <path d={"M120 32H520"} className="engr-wall" />
      <path d={"M" + cx + " 32V" + (topY - 14)} className="engr-hook" />
      <rect
        x={cx - (m.strands * spacing) / 2 - 18}
        y={topY - 14}
        width={m.strands * spacing + 36}
        height="44"
        rx="12"
        className="engr-block"
      />
      {sheave(cx, topY + 8, Math.max(26, (m.strands * spacing) / 2 + 8), "top")}
      {strands.map((x, i) => (
        <g key={"strand-" + x} className="engr-strand">
          <path
            d={"M" + x + " " + (topY + 26) + "V" + (blockY - 14)}
            strokeDashoffset={-m.strands * liftPx}
          />
          <T
            x={x}
            y={(topY + blockY) / 2 + (i % 2) * 14}
            size="small"
            className="engr-strand-number"
          >
            {String(i + 1)}
          </T>
        </g>
      ))}
      <path
        d={
          "M" +
          (strands[strands.length - 1]! + 12) +
          " " +
          (topY + 8) +
          "Q" +
          freeX +
          " " +
          (topY - 14) +
          " " +
          freeX +
          " " +
          (topY + 30) +
          "V" +
          handY
        }
        className="engr-free-rope"
        strokeDashoffset={-m.strands * liftPx}
      />
      <Arrow x1={freeX} y1={handY} x2={freeX} y2={handY + 46} tone="effort" width={5} />
      <T x={freeX + 14} y={handY + 34} anchor="start">
        {reveal ? n(r.effort, 1) + " N" : "Effort ?"}
      </T>
      <g filter={"url(#" + id + "-shadow)"}>
        <rect
          x={cx - (m.strands * spacing) / 2 - 18}
          y={blockY - 18}
          width={m.strands * spacing + 36}
          height="34"
          rx="12"
          className="engr-block"
        />
        {sheave(cx, blockY - 2, Math.max(22, (m.strands * spacing) / 2 + 4), "moving")}
        <path d={"M" + cx + " " + (blockY + 16) + "V" + (blockY + 30)} className="engr-hook" />
        <rect
          x={cx - 44}
          y={blockY + 30}
          width="88"
          height="64"
          rx="8"
          fill={"url(#" + id + "-crate)"}
        />
        <path
          d={"M" + (cx - 44) + " " + (blockY + 62) + "H" + (cx + 44)}
          className="engr-crate-line"
        />
      </g>
      <T x={cx} y={blockY + 70} className="engr-on-crate">
        {n(m.load) + " N"}
      </T>
      <g className="engr-dimension">
        <path d={"M" + (cx - 120) + " " + (blockY0 + 94) + "V" + (blockY + 94)} />
        <T x={cx - 128} y={blockY0 + 98} size="small" anchor="end">
          {"lift " + n(m.lift) + " m"}
        </T>
      </g>
      <T x={W - 24} y={66} size="small" anchor="end">
        {n(m.strands) + " supporting strands"}
      </T>
      <T x={W - 24} y={86} size="small" anchor="end" className="engr-faint">
        {"efficiency " +
          n(m.efficiency * 100) +
          "%" +
          (m.liftSpeed === undefined ? "" : " · " + n(m.liftSpeed) + " m/s")}
      </T>
      {reveal ? (
        <T x={W - 24} y={106} size="small" anchor="end">
          {"rope pulled " + n(r.ropePulled, 2) + " m"}
        </T>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// 10. Gear trains
// ---------------------------------------------------------------------------

function gearPath(teeth: number, r: number) {
  const mod = (2 * r) / teeth;
  const outer = r + mod * 0.95,
    root = r - mod * 1.15;
  const step = (2 * Math.PI) / teeth;
  const parts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pt = (rad: number, ang: number) =>
      (rad * Math.cos(ang)).toFixed(2) + " " + (rad * Math.sin(ang)).toFixed(2);
    parts.push(
      (i ? "L" : "M") + pt(root, a - step * 0.5),
      "L" + pt(root, a - step * 0.28),
      "L" + pt(outer, a - step * 0.15),
      "L" + pt(outer, a + step * 0.15),
      "L" + pt(root, a + step * 0.28),
    );
  }
  return parts.join("") + "Z";
}

function GearsDrawing({
  m,
  models,
  p,
  reveal,
  id,
}: {
  m: GearsModel;
  models: GearsModel[];
  p: number;
  reveal: boolean;
  id: string;
}) {
  const wheels = gearWheelSpeeds(m);
  // Unit layout: pitch radius = teeth / 2. Stage 2 drops diagonally to keep the box compact.
  const layoutOf = (model: GearsModel) => {
    const ws = gearWheelSpeeds(model);
    const placed: Array<{ x: number; y: number; r: number; dir: number }> = [];
    ws.forEach((w, i) => {
      const r = w.teeth / 2;
      if (i === 0) placed.push({ x: 0, y: 0, r, dir: 0 });
      else if (w.shaft === ws[i - 1]!.shaft)
        placed.push({ ...placed[i - 1]!, r, dir: placed[i - 1]!.dir });
      else {
        const prev = placed[i - 1]!;
        const dir = model.idler === undefined && w.shaft === 2 ? 1.05 : 0;
        placed.push({
          x: prev.x + (prev.r + r) * Math.cos(dir),
          y: prev.y + (prev.r + r) * Math.sin(dir),
          r,
          dir,
        });
      }
    });
    return placed;
  };
  const allPlaced = models.flatMap(layoutOf);
  const minX = Math.min(...allPlaced.map((g) => g.x - g.r * 1.12)),
    maxX = Math.max(...allPlaced.map((g) => g.x + g.r * 1.12)),
    minY = Math.min(...allPlaced.map((g) => g.y - g.r * 1.12)),
    maxY = Math.max(...allPlaced.map((g) => g.y + g.r * 1.12));
  const scale = Math.min(540 / (maxX - minX), 220 / (maxY - minY));
  const placed = layoutOf(m);
  const ox = W / 2 - ((minX + maxX) / 2) * scale,
    oy = 190 - ((minY + maxY) / 2) * scale;
  // Phases so that teeth interlock at the start; rolling keeps them meshed.
  const phases: number[] = [];
  placed.forEach((g, i) => {
    if (i === 0) {
      phases.push(0);
      return;
    }
    const prev = placed[i - 1]!;
    if (wheels[i]!.shaft === wheels[i - 1]!.shaft) {
      phases.push(phases[i - 1]! + Math.PI / wheels[i]!.teeth);
      return;
    }
    const phi = Math.atan2(g.y - prev.y, g.x - prev.x);
    const pitch = (2 * Math.PI * prev.r) / wheels[i - 1]!.teeth;
    const si = (((prev.r * (phi - phases[i - 1]!)) % pitch) + pitch) % pitch;
    phases.push(phi + Math.PI - (pitch / 2 - si) / g.r);
  });
  const turn = p * Math.PI * 2 * 1.5;
  const g = gearResult(m);
  return (
    <>
      {placed.map((gp, i) => {
        const w = wheels[i]!;
        const angle = phases[i]! + (turn * w.rpm) / m.inputSpeed;
        const x = ox + gp.x * scale,
          y = oy + gp.y * scale,
          r = gp.r * scale;
        const isInput = i === 0,
          isOutput = i === wheels.length - 1;
        const coaxialFront = i > 0 && w.shaft === wheels[i - 1]!.shaft;
        return (
          <g
            key={"gear-" + w.shaft + "-" + w.teeth + (coaxialFront ? "-front" : "")}
            className={
              "engr-gear" +
              (coaxialFront ? " engr-gear-front" : "") +
              (i + 1 < wheels.length && wheels[i + 1]!.shaft === w.shaft ? " engr-gear-back" : "")
            }
            data-teeth={w.teeth}
          >
            <g
              style={{
                transform:
                  "translate(" + x + "px," + y + "px) rotate(" + (angle * 180) / Math.PI + "deg)",
              }}
            >
              <path
                d={gearPath(w.teeth, r)}
                fill={"url(#" + id + (isInput ? "-gear-accent" : "-gear") + ")"}
                filter={"url(#" + id + "-shadow)"}
                className="engr-gear-body"
              />
              <circle r={r * 0.62} className="engr-gear-web" />
              {[0, 72, 144, 216, 288].map((deg) => (
                <circle
                  key={"hole-" + deg}
                  cx={r * 0.4 * Math.cos((deg * Math.PI) / 180)}
                  cy={r * 0.4 * Math.sin((deg * Math.PI) / 180)}
                  r={Math.max(2, r * 0.09)}
                  className="engr-gear-hole"
                />
              ))}
              <path d={"M0 0L" + r * 0.82 + " 0"} className="engr-gear-mark" />
            </g>
            <circle cx={x} cy={y} r={Math.max(5, r * 0.16)} className="engr-hub" />
            {coaxialFront ? (
              <T x={x} y={y + 5} size="small" className="engr-gear-teeth">
                {w.teeth + "T"}
              </T>
            ) : (
              <T
                x={
                  i > 0 && i + 1 < wheels.length && wheels[i + 1]!.shaft === w.shaft
                    ? x - r * 0.75
                    : x
                }
                y={y + r * 1.1 + 22}
                size="small"
                className="engr-gear-teeth"
              >
                {w.teeth + "T" + (m.idler !== undefined && i === 1 ? " idler" : "")}
              </T>
            )}
            {isInput ? (
              <T x={x + r * 0.4} y={y + r * 1.1 + 46} anchor="end" className="engr-gear-speed">
                {n(m.inputSpeed) + " rpm in"}
              </T>
            ) : isOutput ? (
              <T x={x + r * 1.1 + 12} y={y + 6} anchor="start" className="engr-gear-speed">
                {reveal ? n(Math.abs(w.rpm), 1) + " rpm out" : "? rpm out"}
              </T>
            ) : null}
          </g>
        );
      })}
      <T x={24} y={34} size="small" anchor="start">
        {n(m.inputTorque) + " N·m input"}
      </T>
      <T x={24} y={54} size="small" anchor="start" className="engr-faint">
        {"each mesh " + n(m.efficiency * 100) + "% efficient"}
      </T>
      {m.stages.length > 1 ? (
        <T x={24} y={340} size="small" anchor="start" className="engr-faint">
          {m.stages
            .map((st, k) => "stage " + (k + 1) + ": " + st.driver + "T → " + st.driven + "T")
            .join(" · ") + " (shared shaft)"}
        </T>
      ) : null}
      {reveal ? (
        <T x={W - 24} y={34} size="small" anchor="end">
          {"ratio " + n(g.ratio, 2) + " : 1 · " + n(g.outputTorque, 1) + " N·m out"}
        </T>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// The drawing and the explorer
// ---------------------------------------------------------------------------

export function EngineeringDrawing({
  model: m,
  models = [m],
  progress = DRIVE[m.kind].rest,
  probe = 0.5,
  joint = null,
  reveal = false,
}: {
  model: EngineeringModel;
  models?: EngineeringModel[];
  progress?: number;
  probe?: number;
  joint?: string | null;
  reveal?: boolean;
}) {
  const id = "engr" + useId().replace(/[^a-zA-Z0-9]/gu, "");
  const titleId = id + "-title";
  const same = <K extends Kind>(kind: K) => models.filter((v): v is Of<K> => v.kind === kind);
  const p = clamp(progress, 0, 1);
  let body: ReactNode = null;
  switch (m.kind) {
    case "concurrent":
      body = <ConcurrentDrawing m={m} models={same("concurrent")} p={p} reveal={reveal} id={id} />;
      break;
    case "moment":
      body = <MomentDrawing m={m} models={same("moment")} p={p} reveal={reveal} id={id} />;
      break;
    case "beam":
      body = (
        <BeamDrawing m={m} models={same("beam")} p={p} probe={probe} reveal={reveal} id={id} />
      );
      break;
    case "truss":
      body = (
        <TrussDrawing m={m} models={same("truss")} p={p} joint={joint} reveal={reveal} id={id} />
      );
      break;
    case "stress_strain":
      body = (
        <StressStrainDrawing m={m} models={same("stress_strain")} p={p} reveal={reveal} id={id} />
      );
      break;
    case "section":
      body = <SectionDrawing m={m} models={same("section")} p={p} reveal={reveal} id={id} />;
      break;
    case "cantilever":
      body = <CantileverDrawing m={m} models={same("cantilever")} p={p} reveal={reveal} id={id} />;
      break;
    case "lever":
      body = <LeverDrawing m={m} models={same("lever")} p={p} reveal={reveal} id={id} />;
      break;
    case "pulley":
      body = <PulleyDrawing m={m} models={same("pulley")} p={p} reveal={reveal} id={id} />;
      break;
    case "gears":
      body = <GearsDrawing m={m} models={same("gears")} p={p} reveal={reveal} id={id} />;
      break;
  }
  return (
    <svg
      viewBox={"0 0 " + W + " " + H}
      role="img"
      aria-labelledby={titleId}
      className="engineering-drawing"
      data-kind={m.kind}
    >
      <title id={titleId}>{engineeringGivens(m)}</title>
      <Defs id={id} />
      <rect width={W} height={H} rx="18" fill={"url(#" + id + "-bg)"} />
      <rect width={W} height={H} rx="18" fill={"url(#" + id + "-grid)"} />
      {body}
      <rect width={W} height={H} rx="18" fill={"url(#" + id + "-vignette)"} pointerEvents="none" />
    </svg>
  );
}

export function EngineeringGivenVisual({ model }: { model: EngineeringModel }) {
  return (
    <div className="engineering-check">
      <EngineeringDrawing model={model} />
      <ul className="engr-givens">
        {engineeringGivenList(model).map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </div>
  );
}

export function EngineeringDiagram({
  spec,
  showResults = false,
}: {
  spec: Spec;
  showResults?: boolean;
}) {
  const first = spec.cases.find((c) => c.id === spec.initialCaseId) ?? spec.cases[0]!;
  const [selected, setSelected] = useState(first.id);
  const [progress, setProgress] = useState(DRIVE[first.model.kind].rest);
  const [playing, setPlaying] = useState(false);
  const [probe, setProbe] = useState(0.5);
  const [joint, setJoint] = useState<string | null>(null);
  const from = useRef(0),
    to = useRef(1),
    seconds = useRef(DRIVE[first.model.kind].seconds);
  const { reduced } = useExperience();
  const progressId = useId(),
    probeId = useId();
  const current = spec.cases.find((c) => c.id === selected) ?? first;
  const kind = current.model.kind;
  const drive = DRIVE[kind];
  useEffect(() => {
    if (!playing || reduced) {
      if (reduced) setPlaying(false);
      return;
    }
    let request = 0,
      start: number | undefined;
    const advance = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / (seconds.current * 1000));
      setProgress(lerp(from.current, to.current, t));
      if (t < 1) request = requestAnimationFrame(advance);
      else setPlaying(false);
    };
    request = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(request);
  }, [playing, reduced, selected]);
  function run(start: number, end: number, duration: number) {
    from.current = start;
    to.current = end;
    seconds.current = duration;
    setProgress(start);
    setPlaying(true);
  }
  function select(id: string) {
    const next = spec.cases.find((c) => c.id === id)!;
    const rest = DRIVE[next.model.kind].rest;
    setSelected(id);
    setJoint(null);
    setPlaying(false);
    // A loaded state re-applies its load briefly so the change of case is seen, not jumped.
    if (rest === 1 && !reduced) run(0, 1, 0.7);
    else setProgress(rest);
  }
  const jointIds = current.model.kind === "truss" ? current.model.nodes.map((v) => v.id) : [];
  const beam = current.model.kind === "beam" ? current.model : undefined;
  const probeX = beam ? probe * beam.length : 0;
  return (
    <div className="learning-diagram engineering-diagram" data-kind={kind}>
      <div className="engr-cases" role="group" aria-label="Compare cases">
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
      <div className="engr-stage">
        <EngineeringDrawing
          model={current.model}
          models={spec.cases.map((c) => c.model)}
          progress={progress}
          probe={probe}
          joint={joint}
          reveal={showResults}
        />
      </div>
      <div className="engr-playback">
        <div className="engr-controls">
          {!reduced ? (
            <button
              type="button"
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                  return;
                }
                const start = progress >= 1 ? 0 : progress;
                run(start, 1, drive.seconds * (1 - start) || drive.seconds);
              }}
            >
              {playing ? (
                <Pause aria-hidden="true" size={16} />
              ) : (
                <Play aria-hidden="true" size={16} />
              )}
              {playing ? "Pause" : progress >= 1 ? "Replay" : "Play"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setProgress(Math.min(1, Math.round((progress + 0.125) * 1000) / 1000));
            }}
          >
            <SkipForward aria-hidden="true" size={16} />
            {drive.step}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setSelected(spec.initialCaseId);
              setJoint(null);
              setProbe(0.5);
              setProgress(DRIVE[first.model.kind].rest);
            }}
          >
            <RotateCcw aria-hidden="true" size={16} />
            Reset
          </button>
        </div>
        <label htmlFor={progressId} className="engr-slider">
          <span>
            {drive.label} <output>{Math.round(progress * 100)}%</output>
          </span>
          <input
            id={progressId}
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(progress * 100)}
            aria-label={drive.label}
            onChange={(e) => {
              setPlaying(false);
              setProgress(Number(e.currentTarget.value) / 100);
            }}
          />
        </label>
        {beam && beam.display !== "reactions" ? (
          <label htmlFor={probeId} className="engr-slider">
            <span>
              Section at <output>{n(probeX, 2)} m</output>
            </span>
            <input
              id={probeId}
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(probe * 100)}
              aria-label="Section position along the beam"
              onChange={(e) => setProbe(Number(e.currentTarget.value) / 100)}
            />
          </label>
        ) : null}
        {jointIds.length ? (
          <div className="engr-joints" role="group" aria-label="Inspect a joint">
            <span>Isolate a joint</span>
            {jointIds.map((j) => (
              <button
                type="button"
                key={j}
                aria-pressed={joint === j}
                onClick={() => setJoint(joint === j ? null : j)}
              >
                {j}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {showResults && beam && beam.display !== "reactions" ? (
        <p className="engr-probe-readout">
          {"At x = " +
            n(probeX, 2) +
            " m: V = " +
            n(beamShear(beam, probeX, "right"), 2) +
            " kN, M = " +
            n(beamMoment(beam, probeX), 2) +
            " kN·m"}
        </p>
      ) : null}
      <details className="engr-description">
        <summary>Read given values</summary>
        <ul className="engr-givens">
          {engineeringGivenList(current.model).map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      </details>
      {showResults ? (
        <dl className="engr-measures" aria-label="Worked results for this case">
          {engineeringMeasures(current.model).map((value) => (
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
