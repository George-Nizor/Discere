import type { PsychologyDiagram as Spec, PsychologyModel } from "@discere/contracts";
import {
  psychAnchoringIndex,
  psychAnyoneHelps,
  psychAssignGroups,
  psychBaseRateCounts,
  psychCombineCues,
  psychDetectionRates,
  psychForgettingCurve,
  psychPairingStrengths,
  psychPearson,
  psychRecallAt,
  psychRegressionLine,
  psychScheduleEvents,
  psychScheduleNames,
  psychSpanSummary,
  psychSwitchingSummary,
  psychSwitchingTrials,
  psychologyGivens,
  psychologyMeasures,
  psychologyNumber as num,
} from "@discere/activity-engine";
import { Pause, Play, RotateCcw, Shuffle, SkipForward } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useExperience } from "../../study/experience.js";

type Of<K extends PsychologyModel["kind"]> = Extract<PsychologyModel, { kind: K }>;
const W = 640,
  H = 340;
const PAD = { l: 66, r: 26, t: 30, b: 56 };
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const pdf = (x: number, mean: number, sd: number) =>
  Math.exp(-(((x - mean) / sd) ** 2) / 2) / (sd * Math.sqrt(2 * Math.PI));
const pct = (v: number, places = 1) => num(v * 100, places) + "%";

/** Eases numeric targets towards new values; jumps when motion is reduced. */
function useTween(target: number[], reduced: boolean, ms = 650): number[] {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  const key = target.map((v) => v.toFixed(4)).join(",");
  useEffect(() => {
    const from = current.current;
    if (reduced || from.length !== target.length || typeof requestAnimationFrame !== "function") {
      current.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    let start: number | undefined;
    const step = (now: number) => {
      start ??= now;
      const k = clamp((now - start) / ms);
      const e = 1 - (1 - k) ** 3;
      const next = target.map((t, i) => from[i]! + (t - from[i]!) * e);
      current.current = next;
      setValue(next);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [key, reduced, ms]);
  return value;
}

/** Finite playback from 0 to 1. Reduced motion stops it at once and keeps manual steps. */
function usePlayback(durationMs: number, reduced: boolean, resetKey: string) {
  const [fraction, setFraction] = useState(1);
  const [playing, setPlaying] = useState(false);
  const from = useRef(0);
  useEffect(() => {
    setPlaying(false);
    setFraction(1);
  }, [resetKey]);
  useEffect(() => {
    if (!playing || reduced || typeof requestAnimationFrame !== "function") {
      if (reduced) setPlaying(false);
      return;
    }
    let frame = 0;
    let start: number | undefined;
    const advance = (now: number) => {
      start ??= now;
      const next = Math.min(1, from.current + (now - start) / durationMs);
      setFraction(next);
      if (next < 1) frame = requestAnimationFrame(advance);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduced, durationMs]);
  return {
    fraction,
    playing,
    toggle() {
      if (playing) return setPlaying(false);
      from.current = fraction >= 1 ? 0 : fraction;
      if (fraction >= 1) setFraction(0);
      setPlaying(true);
    },
    start() {
      from.current = 0;
      setFraction(0);
      if (reduced) setFraction(1);
      else setPlaying(true);
    },
    set(v: number) {
      setPlaying(false);
      setFraction(clamp(v));
    },
  };
}

function Playback({
  playback,
  reduced,
  label,
  readout,
  stepLabel,
  steps,
  onReset,
}: {
  playback: ReturnType<typeof usePlayback>;
  reduced: boolean;
  label: string;
  readout: string;
  stepLabel: string;
  steps: number;
  onReset: () => void;
}) {
  const id = useId();
  const { fraction, playing } = playback;
  return (
    <div className="psych-playback">
      <div className="psych-controls">
        {!reduced ? (
          <button type="button" onClick={playback.toggle}>
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
          onClick={() => playback.set(fraction >= 1 ? 1 / steps : fraction + 1 / steps)}
        >
          <SkipForward aria-hidden="true" size={16} />
          {stepLabel}
        </button>
        <button type="button" onClick={onReset}>
          <RotateCcw aria-hidden="true" size={16} />
          Reset
        </button>
      </div>
      <label htmlFor={id} className="psych-scrubber">
        <span>
          {label} <output>{readout}</output>
        </span>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(fraction * 100)}
          aria-label={label}
          onChange={(e) => playback.set(Number(e.currentTarget.value) / 100)}
        />
      </label>
    </div>
  );
}

/** Shared gradients and glow filter. Ids are made unique per drawing. */
function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id + "teal"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5ff0e2" stopOpacity="0.75" />
        <stop offset="1" stopColor="#2fd3c4" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id={id + "lilac"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b9a4ff" stopOpacity="0.7" />
        <stop offset="1" stopColor="#8b6cf0" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id={id + "amber"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffd48a" stopOpacity="0.7" />
        <stop offset="1" stopColor="#f2a541" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id={id + "coral"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff9d8f" stopOpacity="0.85" />
        <stop offset="1" stopColor="#ff6f73" stopOpacity="0.15" />
      </linearGradient>
      <radialGradient id={id + "dot"} cx="0.35" cy="0.3" r="0.75">
        <stop offset="0" style={{ stopColor: "var(--psych-dot-highlight)" }} />
        <stop offset="0.55" stopColor="#2fd3c4" />
        <stop offset="1" stopColor="#13867c" />
      </radialGradient>
      <radialGradient id={id + "halo"}>
        <stop offset="0" stopColor="#2fd3c4" stopOpacity="0.55" />
        <stop offset="1" stopColor="#2fd3c4" stopOpacity="0" />
      </radialGradient>
      <filter id={id + "glow"} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.2" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

function niceTicks(lo: number, hi: number, count = 5): number[] {
  const span = hi - lo || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count + 1)!;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(+v.toFixed(10));
  return ticks;
}

function Axes({
  x,
  y,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  xFormat = (v) => num(v),
  yFormat = (v) => num(v),
}: {
  x: (v: number) => number;
  y: (v: number) => number;
  xTicks: number[];
  yTicks: number[];
  xLabel: string;
  yLabel: string;
  xFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
}) {
  return (
    <g className="psych-axes" data-scale="">
      {yTicks.map((t) => (
        <g key={"y" + t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="psych-grid" />
          <text x={PAD.l - 10} y={y(t) + 5} textAnchor="end" className="psych-tick">
            {yFormat(t)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text key={"x" + t} x={x(t)} y={H - PAD.b + 22} textAnchor="middle" className="psych-tick">
          {xFormat(t)}
        </text>
      ))}
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="psych-axis" />
      <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} className="psych-axis" />
      <text x={(PAD.l + W - PAD.r) / 2} y={H - 10} textAnchor="middle" className="psych-axis-label">
        {xLabel}
      </text>
      <text
        x={18}
        y={(PAD.t + H - PAD.b) / 2}
        textAnchor="middle"
        className="psych-axis-label"
        transform={`rotate(-90 18 ${(PAD.t + H - PAD.b) / 2})`}
      >
        {yLabel}
      </text>
    </g>
  );
}

function Person({
  x,
  y,
  scale = 1,
  className,
}: {
  x: number;
  y: number;
  scale?: number;
  className: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className={className}>
      <circle cx="0" cy="-11" r="5.5" />
      <path d="M-8 8 Q-8 -3 0 -3 Q8 -3 8 8 Z" />
    </g>
  );
}

function Badge({
  x,
  y,
  children,
  anchor = "middle",
}: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} className="psych-badge">
      {children}
    </text>
  );
}

/* ----------------------------------------------------------------------------------------- */

function ScatterDrawing({
  m,
  id,
  reveal,
  colour,
  reduced,
}: {
  m: Of<"scatter">;
  id: string;
  reveal: boolean;
  colour: boolean;
  reduced: boolean;
}) {
  const xs = m.points.map((p) => p.x),
    ys = m.points.map((p) => p.y);
  const pad = (lo: number, hi: number) => [lo - (hi - lo) * 0.08, hi + (hi - lo) * 0.08] as const;
  const [x0, x1] = pad(Math.min(...xs), Math.max(...xs));
  const [y0, y1] = pad(Math.min(...ys), Math.max(...ys));
  const X = (v: number) => PAD.l + ((v - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const Y = (v: number) => H - PAD.b - ((v - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);
  const target = m.points.flatMap((p) => [X(p.x), Y(p.y)]);
  const pos = useTween(target, reduced);
  const line = psychRegressionLine(m.points);
  const zs = m.points.map((p) => p.z ?? 0);
  const [z0, z1] = [Math.min(...zs), Math.max(...zs)];
  const warmth = (z: number) => (z1 > z0 ? (z - z0) / (z1 - z0) : 0.5);
  const hue = (t: number) => `hsl(${200 - 190 * t} 85% ${58 + 6 * t}%)`;
  return (
    <>
      <Axes
        x={X}
        y={Y}
        xTicks={niceTicks(x0, x1)}
        yTicks={niceTicks(y0, y1)}
        xLabel={m.xLabel}
        yLabel={m.yLabel}
      />
      <line
        x1={X(x0)}
        x2={X(x1)}
        y1={Y(line.intercept + line.slope * x0)}
        y2={Y(line.intercept + line.slope * x1)}
        className="psych-trend"
        clipPath={`url(#${id}clip)`}
      />
      <clipPath id={id + "clip"}>
        <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} />
      </clipPath>
      {m.points.map((p, i) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
          key={i}
          cx={pos[2 * i] ?? X(p.x)}
          cy={pos[2 * i + 1] ?? Y(p.y)}
          r={6.5}
          className="psych-point"
          fill={colour && m.zLabel ? hue(warmth(p.z ?? 0)) : `url(#${id}dot)`}
        />
      ))}
      {colour && m.zLabel ? (
        <g transform={`translate(${W - PAD.r - 168} ${PAD.t - 4})`} className="psych-legend">
          <linearGradient id={id + "heat"}>
            <stop offset="0" stopColor={hue(0)} />
            <stop offset="1" stopColor={hue(1)} />
          </linearGradient>
          <rect width="120" height="9" rx="4.5" fill={`url(#${id}heat)`} />
          <text x="0" y="24" className="psych-tick">
            {num(z0, 0)}
          </text>
          <text x="120" y="24" textAnchor="end" className="psych-tick">
            {num(z1, 0)}
          </text>
          <text x="60" y="24" textAnchor="middle" className="psych-tick">
            {m.zLabel}
          </text>
        </g>
      ) : null}
      {reveal ? (
        <Badge x={PAD.l + 14} y={PAD.t + 18} anchor="start">
          r = {num(psychPearson(m.points))}
        </Badge>
      ) : null}
    </>
  );
}

function AssignmentDrawing({
  m,
  fraction,
  seed,
  reveal,
}: {
  m: Of<"assignment">;
  fraction: number;
  seed: number;
  reveal: boolean;
}) {
  const groups = psychAssignGroups(m, seed);
  const n = m.traits.length;
  const max = Math.max(...m.traits),
    min = Math.min(...m.traits);
  const r = n > 16 ? 13 : 16;
  const pool = (i: number) => ({ x: 40 + ((W - 80) * (i + 0.5)) / n, y: 62 });
  const slot = (i: number) => {
    const inT = groups.treatment.indexOf(i);
    const k = inT >= 0 ? inT : groups.control.indexOf(i);
    const perRow = Math.ceil(n / 2 / 2);
    const left = inT >= 0 ? 40 : W / 2 + 20;
    const width = W / 2 - 60;
    return {
      x: left + (width * ((k % perRow) + 0.5)) / perRow,
      y: 196 + Math.floor(k / perRow) * (r * 2 + 18),
    };
  };
  const meanY = 300;
  return (
    <>
      <text x={W / 2} y={24} textAnchor="middle" className="psych-axis-label">
        {m.traitLabel} · {m.method === "random" ? "random assignment" : "volunteers choose"}
      </text>
      <rect
        x={28}
        y={140}
        width={W / 2 - 40}
        height={180}
        rx={18}
        className="psych-box psych-box-a"
      />
      <rect
        x={W / 2 + 12}
        y={140}
        width={W / 2 - 40}
        height={180}
        rx={18}
        className="psych-box psych-box-b"
      />
      <text x={40} y={164} className="psych-box-title">
        {m.method === "random" ? "Treatment" : "Chose the programme"}
      </text>
      <text x={W / 2 + 24} y={164} className="psych-box-title">
        {m.method === "random" ? "Control" : "Did not choose it"}
      </text>
      {m.traits.map((t, i) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
          key={"ghost" + i}
          cx={pool(i).x}
          cy={pool(i).y}
          r={r}
          className="psych-ghost"
        />
      ))}
      <text x={W / 2} y={104} textAnchor="middle" className="psych-tick">
        Arrival order
      </text>
      {m.traits.map((t, i) => {
        const a = pool(i),
          b = slot(i);
        const k = clamp(fraction * (n + 3) - i * 0.9, 0, 1);
        const e = k * k * (3 - 2 * k);
        const x = a.x + (b.x - a.x) * e,
          y = a.y + (b.y - a.y) * e - Math.sin(Math.PI * e) * 26;
        const light = max > min ? (t - min) / (max - min) : 0.5;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
          <g key={i} transform={`translate(${x} ${y})`} className="psych-participant">
            <circle r={r} style={{ fill: `hsl(174 ${40 + 45 * light}% ${24 + 34 * light}%)` }} />
            <text y={5} textAnchor="middle">
              {num(t)}
            </text>
          </g>
        );
      })}
      {reveal && fraction >= 1 ? (
        <>
          <Badge x={40 + (W / 2 - 60) / 2} y={meanY + 8}>
            mean {num(groups.treatmentMean)}
          </Badge>
          <Badge x={W / 2 + 20 + (W / 2 - 60) / 2} y={meanY + 8}>
            mean {num(groups.controlMean)}
          </Badge>
        </>
      ) : null}
    </>
  );
}

function curvePath(
  xs: number[],
  f: (x: number) => number,
  X: (v: number) => number,
  Y: (v: number) => number,
  close = true,
) {
  const pts = xs.map((x) => `${X(x).toFixed(1)},${Y(f(x)).toFixed(1)}`);
  return close
    ? `M${X(xs[0]!).toFixed(1)},${Y(0).toFixed(1)}L${pts.join("L")}L${X(xs.at(-1)!).toFixed(1)},${Y(0).toFixed(1)}Z`
    : `M${pts.join("L")}`;
}
const range = (lo: number, hi: number, n = 140) =>
  Array.from({ length: n + 1 }, (_, i) => lo + ((hi - lo) * i) / n);

function EffectDrawing({
  m,
  id,
  shift,
  reveal,
  reduced,
}: {
  m: Of<"effect">;
  id: string;
  shift: number;
  reveal: boolean;
  reduced: boolean;
}) {
  const pooled = Math.sqrt((m.sdA ** 2 + m.sdB ** 2) / 2);
  const [meanA, meanB, sdA, sdB] = useTween(
    [m.meanA, m.meanB + shift * pooled, m.sdA, m.sdB],
    reduced,
  );
  const lo = Math.min(meanA! - 3.4 * sdA!, meanB! - 3.4 * sdB!),
    hi = Math.max(meanA! + 3.4 * sdA!, meanB! + 3.4 * sdB!);
  const peak = Math.max(pdf(0, 0, Math.min(sdA!, sdB!)), 1e-9);
  const X = (v: number) => PAD.l + ((v - lo) / (hi - lo)) * (W - PAD.l - PAD.r);
  const Y = (v: number) => H - PAD.b - (v / peak) * (H - PAD.t - PAD.b - 30);
  const xs = range(lo, hi);
  const fa = (x: number) => pdf(x, meanA!, sdA!),
    fb = (x: number) => pdf(x, meanB!, sdB!);
  const d = (meanB! - meanA!) / pooled;
  return (
    <>
      <Axes
        x={X}
        y={Y}
        xTicks={niceTicks(lo, hi, 6)}
        yTicks={[]}
        xLabel={"Score" + (m.unit ? ` (${m.unit})` : "")}
        yLabel="How common"
      />
      <path
        d={curvePath(xs, fa, X, Y)}
        fill={`url(#${id}lilac)`}
        className="psych-curve psych-curve-a"
      />
      <path
        d={curvePath(xs, fb, X, Y)}
        fill={`url(#${id}teal)`}
        className="psych-curve psych-curve-b"
      />
      <path d={curvePath(xs, (x) => Math.min(fa(x), fb(x)), X, Y)} className="psych-overlap" />
      {[
        [meanA!, m.labelA, "a"],
        [meanB!, m.labelB, "b"],
      ].map(([mean, label, k]) => (
        <g key={k as string}>
          <line
            x1={X(mean as number)}
            x2={X(mean as number)}
            y1={H - PAD.b}
            y2={PAD.t + 6}
            className={"psych-mean psych-mean-" + k}
          />
          <text
            x={X(mean as number)}
            y={PAD.t}
            textAnchor={k === "a" ? "end" : "start"}
            dx={k === "a" ? -6 : 6}
            className="psych-curve-label"
          >
            {label as string} · {num(mean as number, 1)}
          </text>
        </g>
      ))}
      {reveal ? (
        <Badge x={W - PAD.r - 6} y={PAD.t + 40} anchor="end">
          d = {num(d)}
        </Badge>
      ) : null}
    </>
  );
}

function DetectionDrawing({
  m,
  id,
  criterion,
  reveal,
  reduced,
  onDrag,
}: {
  m: Of<"detection">;
  id: string;
  criterion: number;
  reveal: boolean;
  reduced: boolean;
  onDrag: (c: number) => void;
}) {
  const [sep] = useTween([m.separation], reduced);
  const lo = -3.4,
    hi = Math.max(sep! + 3.4, 4.2);
  const X = (v: number) => PAD.l + ((v - lo) / (hi - lo)) * (W - PAD.l - PAD.r);
  const peak = pdf(0, 0, 1);
  const Y = (v: number) => H - PAD.b - (v / peak) * (H - PAD.t - PAD.b - 34);
  const xs = range(lo, hi);
  const noise = (x: number) => pdf(x, 0, 1),
    signal = (x: number) => pdf(x, sep!, 1);
  const right = range(Math.max(lo, criterion), hi, 80);
  const svgRef = useRef<SVGGElement>(null);
  const dragging = useRef(false);
  const toValue = (clientX: number) => {
    const svg = svgRef.current?.ownerSVGElement;
    if (!svg) return criterion;
    const box = svg.getBoundingClientRect();
    const sx = ((clientX - box.left) / box.width) * W;
    return clamp(lo + ((sx - PAD.l) / (W - PAD.l - PAD.r)) * (hi - lo), -2.5, 5);
  };
  const rates = psychDetectionRates({ ...m, separation: sep! }, criterion);
  return (
    <g ref={svgRef}>
      <Axes
        x={X}
        y={Y}
        xTicks={niceTicks(lo, hi, 7)}
        yTicks={[]}
        xLabel="Internal evidence (standard deviations of noise)"
        yLabel="How often"
      />
      <path d={curvePath(xs, noise, X, Y)} className="psych-noise" fill={`url(#${id}lilac)`} />
      <path d={curvePath(xs, signal, X, Y)} className="psych-signal" fill={`url(#${id}teal)`} />
      {right.length > 1 ? (
        <>
          <path d={curvePath(right, signal, X, Y)} className="psych-hit" />
          <path
            d={curvePath(right, noise, X, Y)}
            className="psych-false-alarm"
            fill={`url(#${id}coral)`}
          />
        </>
      ) : null}
      <text x={X(0)} y={Y(peak) - 8} textAnchor="middle" className="psych-curve-label">
        Noise
      </text>
      <text
        x={X(sep!)}
        y={Y(peak) - 8}
        textAnchor="middle"
        className="psych-curve-label psych-teal"
      >
        {m.signalLabel}
      </text>
      <g
        className="psych-criterion"
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (dragging.current) onDrag(toValue(e.clientX));
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        <rect
          x={X(criterion) - 16}
          y={PAD.t - 8}
          width={32}
          height={H - PAD.b - PAD.t + 8}
          className="psych-hit-area"
        />
        <line x1={X(criterion)} x2={X(criterion)} y1={PAD.t + 2} y2={H - PAD.b} />
        <circle cx={X(criterion)} cy={PAD.t + 6} r={9} filter={`url(#${id}glow)`} />
        <text x={X(criterion)} y={PAD.t - 12} textAnchor="middle" className="psych-tick">
          Say “yes” →
        </text>
      </g>
      <g className="psych-key" transform={`translate(${PAD.l + 8} ${PAD.t + 6})`}>
        <rect width="12" height="12" rx="3" className="psych-key-hit" />
        <text x="18" y="11">
          Hits
        </text>
        <rect y="20" width="12" height="12" rx="3" className="psych-key-fa" />
        <text x="18" y="31">
          False alarms
        </text>
      </g>
      {reveal ? (
        <Badge x={PAD.l + 8} y={H - PAD.b - 12} anchor="start">
          H {pct(rates.hit)} · FA {pct(rates.falseAlarm)} · d′ {num(sep!)}
        </Badge>
      ) : null}
    </g>
  );
}

function SwitchingDrawing({
  m,
  fraction,
  reveal,
}: {
  m: Of<"switching">;
  fraction: number;
  reveal: boolean;
}) {
  const trials = psychSwitchingTrials(m);
  const summary = psychSwitchingSummary(m);
  const n = trials.length;
  const left = 40,
    width = W - 80,
    w = width / n;
  const maxMs = m.baseMs + m.switchCostMs;
  const scale = (ms: number) => (ms / Math.max(maxMs, 1)) * 126;
  const now = fraction * summary.totalMs;
  const base = 226;
  return (
    <>
      <text x={W / 2} y={24} textAnchor="middle" className="psych-axis-label">
        A = {m.labelA} · B = {m.labelB}
      </text>
      {trials.map((t, i) => {
        const done = clamp((now - t.start) / t.ms);
        const x = left + i * w + 4;
        return (
          <g
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
            key={i}
            className={"psych-trial psych-trial-" + t.task.toLowerCase()}
            data-active={done > 0 && done < 1 ? "true" : undefined}
          >
            <rect
              x={x}
              y={base - scale(m.baseMs)}
              width={w - 8}
              height={scale(m.baseMs)}
              rx={6}
              className="psych-trial-base"
              opacity={0.25 + 0.75 * clamp(done * 2)}
            />
            {t.switched ? (
              <rect
                x={x}
                y={base - scale(t.ms)}
                width={w - 8}
                height={scale(m.switchCostMs)}
                rx={6}
                className="psych-trial-cost"
                opacity={0.2 + 0.8 * clamp(done * 2 - 1)}
              />
            ) : null}
            <text
              x={x + (w - 8) / 2}
              y={base + 26}
              textAnchor="middle"
              className="psych-trial-letter"
            >
              {t.task}
            </text>
            {t.switched ? (
              <text
                x={left + i * w}
                y={base + 26}
                textAnchor="middle"
                className="psych-switch-mark"
              >
                ⇄
              </text>
            ) : null}
          </g>
        );
      })}
      <g className="psych-ribbon">
        {trials.map((t, i) => (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
            key={i}
            x={left + (t.start / summary.totalMs) * width}
            y={276}
            width={Math.max(1, (t.ms / summary.totalMs) * width - 2)}
            height={14}
            rx={4}
            className={t.switched ? "psych-ribbon-cost" : "psych-ribbon-base"}
          />
        ))}
        <rect
          x={left}
          y={276}
          width={fraction * width}
          height={14}
          rx={4}
          className="psych-ribbon-progress"
        />
        <text x={left} y={310} className="psych-tick">
          Time elapsed
        </text>
        {reveal ? (
          <text x={left + width} y={310} textAnchor="end" className="psych-badge">
            {num(summary.totalMs, 0)} ms
          </text>
        ) : null}
      </g>
      <g className="psych-key" transform={`translate(${W - 210} 36)`}>
        <rect width="12" height="12" rx="3" className="psych-trial-base" />
        <text x="18" y="11">
          {m.baseMs} ms per trial
        </text>
        <rect y="20" width="12" height="12" rx="3" className="psych-trial-cost" />
        <text x="18" y="31">
          +{m.switchCostMs} ms per switch
        </text>
      </g>
    </>
  );
}

function CueDrawing({
  m,
  id,
  reveal,
  reduced,
}: {
  m: Of<"cues">;
  id: string;
  reveal: boolean;
  reduced: boolean;
}) {
  const [mA, sA, mB, sB] = useTween([m.meanA, m.sdA, m.meanB, m.sdB], reduced);
  const c = psychCombineCues({ ...m, meanA: mA!, sdA: sA!, meanB: mB!, sdB: sB! });
  const lo = Math.min(mA! - 3.2 * sA!, mB! - 3.2 * sB!),
    hi = Math.max(mA! + 3.2 * sA!, mB! + 3.2 * sB!);
  const peak = pdf(0, 0, reveal ? c.sd : Math.min(sA!, sB!));
  const X = (v: number) => PAD.l + ((v - lo) / (hi - lo)) * (W - PAD.l - PAD.r);
  const Y = (v: number) => H - PAD.b - (v / peak) * (H - PAD.t - PAD.b - 30);
  const xs = range(lo, hi);
  return (
    <>
      <Axes
        x={X}
        y={Y}
        xTicks={niceTicks(lo, hi, 6)}
        yTicks={[]}
        xLabel={"Estimate" + (m.unit ? ` (${m.unit})` : "")}
        yLabel="Belief"
      />
      <path
        d={curvePath(xs, (x) => pdf(x, mA!, sA!), X, Y)}
        fill={`url(#${id}amber)`}
        className="psych-cue-a"
      />
      <path
        d={curvePath(xs, (x) => pdf(x, mB!, sB!), X, Y)}
        fill={`url(#${id}lilac)`}
        className="psych-cue-b"
      />
      <text
        x={X(mA!)}
        y={Y(pdf(mA!, mA!, sA!)) - 10}
        textAnchor="middle"
        className="psych-curve-label psych-amber"
      >
        {m.labelA}
      </text>
      <text
        x={X(mB!)}
        y={Y(pdf(mB!, mB!, sB!)) - 10}
        textAnchor="middle"
        className="psych-curve-label psych-lilac"
      >
        {m.labelB}
      </text>
      {reveal ? (
        <>
          <path
            d={curvePath(xs, (x) => pdf(x, c.mean, c.sd), X, Y)}
            fill={`url(#${id}teal)`}
            className="psych-combined"
            filter={`url(#${id}glow)`}
          />
          <line
            x1={X(c.mean)}
            x2={X(c.mean)}
            y1={H - PAD.b}
            y2={Y(pdf(c.mean, c.mean, c.sd))}
            className="psych-mean psych-mean-b"
          />
          <Badge x={X(c.mean)} y={Y(pdf(c.mean, c.mean, c.sd)) - 12}>
            Combined {num(c.mean)}
          </Badge>
        </>
      ) : (
        <text x={(PAD.l + W - PAD.r) / 2} y={PAD.t + 4} textAnchor="middle" className="psych-tick">
          Where should the combined estimate sit?
        </text>
      )}
    </>
  );
}

function SpanDrawing({ m, fraction }: { m: Of<"span">; fraction: number }) {
  const s = psychSpanSummary(m);
  const n = m.items.length;
  const shown = Math.floor(clamp(fraction / 0.75) * n + 1e-9);
  const grouped = fraction >= 0.8;
  const perRow = n > 12 ? Math.ceil(n / 2) : n;
  const cell = Math.min(46, (W - 120) / perRow - 10);
  const gap = 6 + (grouped ? 4 : 0);
  const pos = (i: number) => {
    const row = Math.floor(i / perRow),
      col = i % perRow;
    const rowCount = Math.min(perRow, n - row * perRow);
    const total = rowCount * (cell + gap);
    return { x: (W - total) / 2 + col * (cell + gap), y: 82 + row * (cell + 34) };
  };
  let at = 0;
  const boxes = m.chunks.flatMap((size, k) => {
    const segments: Array<{
      key: string;
      first: { x: number; y: number };
      last: { x: number; y: number };
    }> = [];
    for (let i = at; i < at + size; i++) {
      const p = pos(i);
      const open = segments.at(-1);
      if (open && open.first.y === p.y) open.last = p;
      else segments.push({ key: k + "-" + i, first: p, last: p });
    }
    at += size;
    return segments;
  });
  const slotsY = 248;
  const slots = Math.max(m.capacity, s.chunks);
  const slotW = Math.min(64, (W - 80) / slots - 8);
  const filled = grouped ? s.chunks : Math.min(shown, s.items);
  return (
    <>
      <text x={W / 2} y={30} textAnchor="middle" className="psych-axis-label">
        {grouped ? "Grouped into chunks" : "Items arriving one at a time"}
      </text>
      {grouped
        ? boxes.map((b) => (
            <rect
              key={b.key}
              x={b.first.x - 4}
              y={b.first.y - 4}
              width={b.last.x - b.first.x + cell + 8}
              height={cell + 8}
              rx={12}
              className="psych-chunk"
            />
          ))
        : null}
      {m.items.map((item, i) => {
        const p = pos(i);
        return (
          <g
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
            key={i}
            className="psych-item"
            data-shown={i < shown ? "true" : "false"}
            transform={`translate(${p.x} ${p.y})`}
          >
            <rect width={cell} height={cell} rx={9} />
            <text x={cell / 2} y={cell / 2 + 6} textAnchor="middle">
              {item}
            </text>
          </g>
        );
      })}
      <text x={40} y={slotsY - 14} className="psych-tick">
        Working-memory slots (about {m.capacity})
      </text>
      {Array.from({ length: slots }, (_, k) => {
        const x = 40 + k * (slotW + 8);
        const over = k >= m.capacity;
        const used = k < filled;
        return (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
            key={k}
            x={x}
            y={slotsY}
            width={slotW}
            height={30}
            rx={8}
            className={
              "psych-slot" + (over ? " psych-slot-over" : "") + (used ? " psych-slot-used" : "")
            }
          />
        );
      })}
    </>
  );
}

function ForgettingDrawing({
  m,
  id,
  fraction,
  reveal,
}: {
  m: Of<"forgetting">;
  id: string;
  fraction: number;
  reveal: boolean;
}) {
  const X = (d: number) => PAD.l + (d / m.horizon) * (W - PAD.l - PAD.r);
  const Y = (r: number) => H - PAD.b - r * (H - PAD.t - PAD.b);
  const day = fraction * m.horizon;
  const curve = psychForgettingCurve(m).filter((p) => p.day <= day + 1e-9);
  const line = curve.map((p) => `${X(p.day).toFixed(1)},${Y(p.recall).toFixed(1)}`).join("L");
  const area =
    curve.length > 1 ? `M${X(0)},${Y(0)}L${line}L${X(curve.at(-1)!.day).toFixed(1)},${Y(0)}Z` : "";
  const r = psychRecallAt(m, day);
  return (
    <>
      <Axes
        x={X}
        y={Y}
        xTicks={niceTicks(0, m.horizon, 6)}
        yTicks={[0, 0.25, 0.5, 0.75, 1]}
        xLabel="Days since first learning"
        yLabel="Predicted recall"
        yFormat={(v) => num(v * 100, 0) + "%"}
      />
      <line x1={PAD.l} x2={W - PAD.r} y1={Y(0.9)} y2={Y(0.9)} className="psych-target" />
      <text x={W - PAD.r - 4} y={Y(0.9) - 6} textAnchor="end" className="psych-tick">
        90% target
      </text>
      {area ? <path d={area} fill={`url(#${id}teal)`} className="psych-forget-area" /> : null}
      {curve.length > 1 ? (
        <path d={"M" + line} className="psych-forget-line" filter={`url(#${id}glow)`} />
      ) : null}
      {m.reviews.map((d, k) => (
        <g key={d} className="psych-review" data-done={d <= day ? "true" : "false"}>
          <line x1={X(d)} x2={X(d)} y1={Y(0)} y2={Y(1) - 4} />
          <circle cx={X(d)} cy={Y(1)} r={6} />
          {k === 0 ? (
            <text x={X(d)} y={Y(1) - 12} textAnchor="start" dx={-8}>
              {m.reviews.length > 1 ? "Reviews" : "Review"}
            </text>
          ) : null}
        </g>
      ))}
      <circle cx={X(day)} cy={Y(r)} r={7} className="psych-cursor" filter={`url(#${id}glow)`} />
      {reveal ? (
        <Badge x={X(day)} y={Y(r) - 16} anchor={day > m.horizon * 0.8 ? "end" : "middle"}>
          {pct(r, 0)}
        </Badge>
      ) : null}
    </>
  );
}

function PairingDrawing({
  m,
  fraction,
  reveal,
}: {
  m: Of<"pairing">;
  fraction: number;
  reveal: boolean;
}) {
  const v = psychPairingStrengths(m);
  const n = m.trials.length;
  const shown = fraction * n;
  const X = (i: number) => PAD.l + ((i + 0.5) / n) * (W - PAD.l - PAD.r);
  const Y = (s: number) => H - PAD.b - 18 - s * (H - PAD.t - PAD.b - 40);
  const bw = Math.min(42, ((W - PAD.l - PAD.r) / n) * 0.6);
  return (
    <>
      <Axes
        x={() => 0}
        y={Y}
        xTicks={[]}
        yTicks={[0, 0.25, 0.5, 0.75, 1]}
        xLabel=""
        yLabel="Associative strength V"
      />
      <text x={PAD.l - 10} y={H - PAD.b + 30} textAnchor="end" className="psych-tick">
        Trial
      </text>
      <line
        x1={PAD.l}
        x2={W - PAD.r}
        y1={Y(m.asymptote)}
        y2={Y(m.asymptote)}
        className="psych-target"
      />
      <text x={W - PAD.r - 4} y={Y(m.asymptote) - 6} textAnchor="end" className="psych-tick">
        Maximum λ = {num(m.asymptote)}
      </text>
      {m.trials.map((t, i) => {
        const grow = clamp(shown - i);
        const value = v[i]! + (v[i + 1]! - v[i]!) * grow;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
          <g key={i} className={"psych-bar psych-bar-" + t}>
            <rect
              x={X(i) - bw / 2}
              y={Y(value)}
              width={bw}
              height={Math.max(0, Y(0) - Y(value))}
              rx={6}
              opacity={grow > 0 ? 1 : 0.15}
            />
            <circle cx={X(i) - 7} cy={H - PAD.b + 8} r={6} className="psych-cue-dot" />
            {t === "paired" ? (
              <circle cx={X(i) + 7} cy={H - PAD.b + 8} r={6} className="psych-outcome-dot" />
            ) : null}
            <text x={X(i)} y={H - PAD.b + 30} textAnchor="middle" className="psych-tick">
              {i + 1}
            </text>
            {reveal && grow >= 1 ? (
              <text x={X(i)} y={Y(value) - 6} textAnchor="middle" className="psych-bar-value">
                {num(v[i + 1]!, 3)}
              </text>
            ) : null}
          </g>
        );
      })}
      <g className="psych-key" transform={`translate(${PAD.l + 8} ${PAD.t + 4})`}>
        <circle cx="6" cy="6" r="6" className="psych-cue-dot" />
        <text x="18" y="11">
          {m.cueLabel}
        </text>
        <circle cx="6" cy="26" r="6" className="psych-outcome-dot" />
        <text x="18" y="31">
          {m.outcomeLabel}
        </text>
      </g>
    </>
  );
}

function ScheduleDrawing({
  m,
  id,
  fraction,
  reveal,
}: {
  m: Of<"schedule">;
  id: string;
  fraction: number;
  reveal: boolean;
}) {
  const e = psychScheduleEvents(m);
  const total = e.responses.length;
  const X = (t: number) => PAD.l + (t / m.duration) * (W - PAD.l - PAD.r);
  const Y = (c: number) => H - PAD.b - (c / Math.max(total, 1)) * (H - PAD.t - PAD.b - 20);
  const now = fraction * m.duration;
  let path = `M${X(0)},${Y(0)}`;
  let count = 0;
  for (const t of e.responses) {
    if (t > now + 1e-9) break;
    path += `H${X(t).toFixed(1)}V${Y(++count).toFixed(1)}`;
  }
  path += `H${X(now).toFixed(1)}`;
  const ratio = m.rule.endsWith("ratio");
  return (
    <>
      <Axes
        x={X}
        y={Y}
        xTicks={niceTicks(0, m.duration, 6)}
        yTicks={niceTicks(0, total, 4)}
        xLabel="Time (s)"
        yLabel="Total responses"
      />
      <text
        x={(PAD.l + W - PAD.r) / 2}
        y={PAD.t - 8}
        textAnchor="middle"
        className="psych-axis-label"
      >
        {psychScheduleNames[m.rule]} · {ratio ? "responses needed" : "seconds to wait"}:{" "}
        {m.requirements.join(", ")}
      </text>
      <path d={path} className="psych-record" filter={`url(#${id}glow)`} />
      {e.reinforced
        .filter((t) => t <= now + 1e-9)
        .map((t) => {
          const c = e.responses.indexOf(t) + 1;
          return (
            <g key={t} className="psych-reward">
              <line x1={X(t)} y1={Y(c)} x2={X(t) + 9} y2={Y(c) + 11} />
              <circle cx={X(t)} cy={Y(c)} r={5.5} />
            </g>
          );
        })}
      {reveal && fraction >= 1 ? (
        <Badge x={W - PAD.r - 6} y={H - PAD.b - 14} anchor="end">
          {e.reinforced.length} rewards
        </Badge>
      ) : null}
    </>
  );
}

function BaseRateDrawing({
  m,
  positivesOnly,
  reveal,
}: {
  m: Of<"base_rate">;
  positivesOnly: boolean;
  reveal: boolean;
}) {
  const c = psychBaseRateCounts(m);
  const per = m.population > 1000 ? m.population / 1000 : 1;
  const cells = Math.round(m.population / per);
  const cols = cells > 500 ? 50 : cells > 200 ? 40 : 20;
  const rows = Math.ceil(cells / cols);
  const size = Math.min((W - 60) / cols, 236 / rows);
  const left = (W - cols * size) / 2;
  const tp = Math.round(c.truePositives / per),
    fn = Math.round((c.withCondition - c.truePositives) / per),
    fp = Math.round(c.falsePositives / per);
  const kind = (i: number) => (i < tp ? "tp" : i < tp + fn ? "fn" : i < tp + fn + fp ? "fp" : "tn");
  return (
    <>
      <text x={W / 2} y={24} textAnchor="middle" className="psych-axis-label">
        {num(m.population, 0)} people{per > 1 ? ` · each square is ${num(per, 0)} people` : ""}
      </text>
      <g data-positives-only={positivesOnly ? "true" : "false"} className="psych-grid-people">
        {Array.from({ length: cells }, (_, i) => (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
            key={i}
            x={left + (i % cols) * size + 0.8}
            y={40 + Math.floor(i / cols) * size + 0.8}
            width={size - 1.6}
            height={size - 1.6}
            rx={size / 4}
            className={"psych-cell psych-cell-" + kind(i)}
          />
        ))}
      </g>
      <g className="psych-key" transform={`translate(${left} ${40 + rows * size + 18})`}>
        <rect width="12" height="12" rx="3" className="psych-cell-tp" />
        <text x="18" y="11">
          {m.conditionLabel}, flagged{reveal ? ` (${c.truePositives})` : ""}
        </text>
        <rect x="0" y="20" width="12" height="12" rx="3" className="psych-cell-fp" />
        <text x="18" y="31">
          No {m.conditionLabel.toLowerCase().replace(/^the /u, "")}, flagged
          {reveal ? ` (${c.falsePositives})` : ""}
        </text>
        <rect x={Math.min(300, W / 2)} width="12" height="12" rx="3" className="psych-cell-fn" />
        <text x={Math.min(300, W / 2) + 18} y="11">
          {m.conditionLabel}, missed
        </text>
        <rect
          x={Math.min(300, W / 2)}
          y="20"
          width="12"
          height="12"
          rx="3"
          className="psych-cell-tn"
        />
        <text x={Math.min(300, W / 2) + 18} y="31">
          Correctly cleared
        </text>
      </g>
      {reveal ? (
        <Badge x={W - 20} y={24} anchor="end">
          {pct(c.positivePredictiveValue)} of flags are right
        </Badge>
      ) : null}
    </>
  );
}

function AnchorDrawing({
  m,
  id,
  reveal,
  reduced,
}: {
  m: Of<"anchor">;
  id: string;
  reveal: boolean;
  reduced: boolean;
}) {
  const [la, le, ha, he, lo, hi] = useTween(
    [m.lowAnchor, m.lowEstimate, m.highAnchor, m.highEstimate, m.min, m.max],
    reduced,
  );
  const X = (v: number) => 50 + ((v - lo!) / (hi! - lo!)) * (W - 100);
  const lineY = 236;
  const arc = (from: number, to: number, up: number) =>
    `M${X(from)},${lineY - 128} C${X(from)},${lineY - 128 + up} ${X(to)},${lineY - 30 - up} ${X(to)},${lineY - 14}`;
  return (
    <>
      <text x={W / 2} y={28} textAnchor="middle" className="psych-axis-label">
        {m.quantity}
      </text>
      <line x1={50} x2={W - 50} y1={lineY} y2={lineY} className="psych-axis" />
      {niceTicks(lo!, hi!, 5).map((t) => (
        <g key={t}>
          <line x1={X(t)} x2={X(t)} y1={lineY - 5} y2={lineY + 5} className="psych-axis" />
          <text x={X(t)} y={lineY + 24} textAnchor="middle" className="psych-tick">
            {num(t)}
          </text>
        </g>
      ))}
      {[
        [la!, le!, "low", 40],
        [ha!, he!, "high", 70],
      ].map(([a, e, k, up]) => (
        <g key={k as string} className={"psych-anchor psych-anchor-" + k}>
          <path
            d={arc(a as number, e as number, up as number)}
            className="psych-anchor-arc"
            filter={`url(#${id}glow)`}
          />
          <rect
            x={X(a as number) - 30}
            y={lineY - 154}
            width={60}
            height={26}
            rx={13}
            className="psych-anchor-chip"
          />
          <text
            x={X(a as number)}
            y={lineY - 136}
            textAnchor="middle"
            className="psych-anchor-text"
          >
            {num(a as number)}
          </text>
          <circle cx={X(e as number)} cy={lineY} r={9} className="psych-estimate" />
          <text x={X(e as number)} y={lineY + 46} textAnchor="middle" className="psych-curve-label">
            median {num(e as number)}
          </text>
        </g>
      ))}
      <text x={50} y={lineY - 166} className="psych-tick">
        Anchor shown first
      </text>
      {reveal ? (
        <Badge x={W - 50} y={lineY - 166} anchor="end">
          anchoring index {num(psychAnchoringIndex(m))}
        </Badge>
      ) : null}
    </>
  );
}

function TallyDrawing({ m, reveal }: { m: Of<"tally">; reveal: boolean }) {
  const scaled = m.total > 120;
  const icons = scaled ? 100 : m.total;
  const lit = scaled ? Math.round((m.count / m.total) * 100) : m.count;
  const cols = icons > 60 ? 20 : icons > 30 ? 15 : 10;
  const rows = Math.ceil(icons / cols);
  const step = Math.min(52, (W - 80) / cols, 200 / rows);
  const left = (W - cols * step) / 2 + step / 2;
  const top = 60 + Math.max(0, (200 - rows * step) / 2);
  return (
    <>
      <text x={W / 2} y={28} textAnchor="middle" className="psych-axis-label">
        {m.setting}
      </text>
      {Array.from({ length: icons }, (_, i) => (
        <Person
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
          key={i}
          x={left + (i % cols) * step}
          y={top + step * 0.45 + Math.floor(i / cols) * step}
          scale={step / 26}
          className={"psych-person" + (i < lit ? " psych-person-lit" : "")}
        />
      ))}
      <g
        className="psych-key"
        transform={`translate(${left - step / 2} ${top + 12 + rows * step})`}
      >
        <rect width="12" height="12" rx="3" className="psych-key-hit" />
        <text x="18" y="11">
          {m.countLabel}: {m.count}
        </text>
        <rect x="230" width="12" height="12" rx="3" className="psych-key-rest" />
        <text x="248" y="11">
          {m.restLabel}: {m.total - m.count}
        </text>
        {scaled ? (
          <text y="34" className="psych-tick">
            Each figure is {num(m.total / 100)} people
          </text>
        ) : null}
      </g>
      {reveal ? (
        <Badge x={W - 30} y={58} anchor="end">
          {pct(m.count / m.total)}
        </Badge>
      ) : null}
    </>
  );
}

function BystanderDrawing({
  m,
  id,
  reveal,
  reduced,
}: {
  m: Of<"bystander">;
  id: string;
  reveal: boolean;
  reduced: boolean;
}) {
  const cx = W / 2,
    cy = 182;
  const slots = 12;
  const target = Array.from({ length: slots }, (_, i) => {
    const on = i < m.bystanders;
    const a = Math.PI * (1.08 + (0.84 * (i + 0.5)) / Math.max(m.bystanders, 1));
    return on ? [cx + Math.cos(a) * 200, cy + Math.sin(a) * 120 + 40, 1] : [cx, cy + 40, 0];
  }).flat();
  const pos = useTween(target, reduced, 800);
  const p = psychAnyoneHelps(m);
  return (
    <>
      <circle cx={cx} cy={cy + 40} r={70} fill={`url(#${id}halo)`} className="psych-pulse" />
      <Person x={cx} y={cy + 52} scale={2.3} className="psych-person psych-person-victim" />
      <text x={cx} y={cy + 96} textAnchor="middle" className="psych-tick">
        Someone needs help
      </text>
      {Array.from({ length: slots }, (_, i) => {
        const x = pos[3 * i]!,
          y = pos[3 * i + 1]!,
          o = pos[3 * i + 2]!;
        if (o < 0.02) return null;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
          <g key={i} opacity={o}>
            <circle cx={x} cy={y - 6} r={10 + 22 * m.helpProbability} className="psych-intent" />
            <Person x={x} y={y + 4} scale={1.6} className="psych-person psych-person-lit" />
          </g>
        );
      })}
      <text x={W / 2} y={26} textAnchor="middle" className="psych-axis-label">
        {m.bystanders} {m.bystanders === 1 ? "witness" : "witnesses"} · each acts with probability{" "}
        {num(m.helpProbability, 3)}
      </text>
      {reveal ? (
        <Badge x={W / 2} y={318}>
          At least one acts: {pct(p)}
        </Badge>
      ) : null}
    </>
  );
}

/* ----------------------------------------------------------------------------------------- */

function title(m: PsychologyModel): string {
  const names: Record<PsychologyModel["kind"], string> = {
    scatter: "Scatter plot",
    assignment: "Assignment of participants to groups",
    effect: "Two overlapping score distributions",
    detection: "Signal detection distributions",
    switching: "Task-switching trial sequence",
    cues: "Two cues to be combined",
    span: "Items held in working memory",
    forgetting: "Forgetting curve",
    pairing: "Associative strength across trials",
    schedule: "Cumulative record of responses",
    base_rate: "Natural-frequency grid",
    anchor: "Anchors and estimates on a number line",
    tally: "Count of people",
    bystander: "Witnesses around an emergency",
  };
  return names[m.kind] + ". " + psychologyGivens(m);
}

function timing(
  m: PsychologyModel,
  reveal: boolean,
): {
  ms: number;
  steps: number;
  label: string;
  step: string;
  readout: (f: number) => string;
} | null {
  switch (m.kind) {
    case "assignment":
      return {
        ms: 2600,
        steps: 4,
        label: "Assignment progress",
        step: "Next step",
        readout: (f) => num(f * 100, 0) + "%",
      };
    case "switching": {
      const total = psychSwitchingSummary(m).totalMs;
      return {
        ms: Math.min(total, 9000),
        steps: m.sequence.length,
        label: reveal ? "Elapsed time" : "Trials run",
        step: "Next trial",
        // The total time is what the learner is asked to work out, so before answering the
        // scrubber counts trials instead of milliseconds.
        readout: (f) =>
          reveal
            ? num(f * total, 0) + " ms"
            : Math.round(f * m.sequence.length) + " of " + m.sequence.length,
      };
    }
    case "span":
      return {
        ms: 650 * m.items.length + 900,
        steps: m.items.length + 2,
        label: "Presentation",
        step: "Next item",
        readout: (f) =>
          f >= 0.8 ? "grouped" : Math.floor(clamp(f / 0.75) * m.items.length) + " shown",
      };
    case "forgetting":
      return {
        ms: 4200,
        steps: 10,
        label: "Day",
        step: "Next stretch",
        readout: (f) => num(f * m.horizon, 1),
      };
    case "pairing":
      return {
        ms: 650 * m.trials.length,
        steps: m.trials.length,
        label: "Trials run",
        step: "Next trial",
        readout: (f) => String(Math.floor(f * m.trials.length + 1e-9)),
      };
    case "schedule":
      return {
        ms: 5200,
        steps: 12,
        label: "Time",
        step: "Next stretch",
        readout: (f) => num(f * m.duration, 0) + " s",
      };
    default:
      return null;
  }
}

export function PsychologyDrawing({
  model,
  fraction = 1,
  reveal = false,
  criterion,
  onCriterion,
  shift = 0,
  colour = false,
  seed,
  positivesOnly = false,
}: {
  model: PsychologyModel;
  fraction?: number;
  reveal?: boolean;
  criterion?: number | undefined;
  onCriterion?: (c: number) => void;
  shift?: number;
  colour?: boolean;
  seed?: number | undefined;
  positivesOnly?: boolean;
}) {
  const raw = useId();
  const id = "psy" + raw.replace(/[^a-zA-Z0-9]/gu, "");
  const { reduced } = useExperience();
  const m = model;
  let body: ReactNode;
  switch (m.kind) {
    case "scatter":
      body = <ScatterDrawing m={m} id={id} reveal={reveal} colour={colour} reduced={reduced} />;
      break;
    case "assignment":
      body = <AssignmentDrawing m={m} fraction={fraction} seed={seed ?? m.seed} reveal={reveal} />;
      break;
    case "effect":
      body = <EffectDrawing m={m} id={id} shift={shift} reveal={reveal} reduced={reduced} />;
      break;
    case "detection":
      body = (
        <DetectionDrawing
          m={m}
          id={id}
          criterion={criterion ?? m.criterion}
          reveal={reveal}
          reduced={reduced}
          onDrag={onCriterion ?? (() => {})}
        />
      );
      break;
    case "switching":
      body = <SwitchingDrawing m={m} fraction={fraction} reveal={reveal} />;
      break;
    case "cues":
      body = <CueDrawing m={m} id={id} reveal={reveal} reduced={reduced} />;
      break;
    case "span":
      body = <SpanDrawing m={m} fraction={fraction} />;
      break;
    case "forgetting":
      body = <ForgettingDrawing m={m} id={id} fraction={fraction} reveal={reveal} />;
      break;
    case "pairing":
      body = <PairingDrawing m={m} fraction={fraction} reveal={reveal} />;
      break;
    case "schedule":
      body = <ScheduleDrawing m={m} id={id} fraction={fraction} reveal={reveal} />;
      break;
    case "base_rate":
      body = <BaseRateDrawing m={m} positivesOnly={positivesOnly} reveal={reveal} />;
      break;
    case "anchor":
      body = <AnchorDrawing m={m} id={id} reveal={reveal} reduced={reduced} />;
      break;
    case "tally":
      body = <TallyDrawing m={m} reveal={reveal} />;
      break;
    case "bystander":
      body = <BystanderDrawing m={m} id={id} reveal={reveal} reduced={reduced} />;
      break;
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="psychology-drawing"
      data-kind={m.kind}
      role="img"
      aria-label={title(m)}
    >
      <Defs id={id} />
      <rect x="0" y="0" width={W} height={H} rx="22" className="psych-backdrop" />
      {body}
    </svg>
  );
}

/** Static drawing for a course-check problem: the stated values only, no results. */
export function PsychologyGivenVisual({ model }: { model: PsychologyModel }) {
  return (
    <figure className="psychology-diagram psychology-given">
      <PsychologyDrawing model={model} />
      <figcaption className="psych-givens-caption">{psychologyGivens(model)}</figcaption>
    </figure>
  );
}

export function PsychologyDiagram({
  spec,
  showResults = false,
}: {
  spec: Spec;
  showResults?: boolean;
}) {
  const [selected, setSelected] = useState(spec.initialCaseId);
  const current = spec.cases.find((c) => c.id === selected) ?? spec.cases[0]!;
  const m = current.model;
  const { reduced } = useExperience();
  const time = timing(m, showResults);
  const playback = usePlayback(time?.ms ?? 1000, reduced, current.id);
  const [criterion, setCriterion] = useState(m.kind === "detection" ? m.criterion : 0);
  const [shift, setShift] = useState(0);
  const [colour, setColour] = useState(false);
  const [seedOffset, setSeedOffset] = useState(0);
  const [positivesOnly, setPositivesOnly] = useState(false);
  const criterionId = useId(),
    shiftId = useId();
  useEffect(() => {
    if (m.kind === "detection") setCriterion(m.criterion);
    setShift(0);
    setSeedOffset(0);
  }, [current.id, m]);
  function select(id: string) {
    setSelected(id);
  }
  function reset() {
    setSelected(spec.initialCaseId);
    const first = spec.cases.find((c) => c.id === spec.initialCaseId)!.model;
    if (first.kind === "detection") setCriterion(first.criterion);
    setShift(0);
    setSeedOffset(0);
    setColour(false);
    setPositivesOnly(false);
    playback.set(0);
  }
  return (
    <div className="learning-diagram psychology-diagram">
      <div className="psych-cases" role="group" aria-label="Compare cases">
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
      <div className="psych-stage">
        <PsychologyDrawing
          model={m}
          fraction={time ? playback.fraction : 1}
          reveal={showResults}
          criterion={criterion}
          onCriterion={setCriterion}
          shift={shift}
          colour={colour}
          seed={m.kind === "assignment" ? m.seed + seedOffset * 7919 : undefined}
          positivesOnly={positivesOnly}
        />
      </div>
      {time ? (
        <Playback
          playback={playback}
          reduced={reduced}
          label={time.label}
          readout={time.readout(playback.fraction)}
          stepLabel={time.step}
          steps={time.steps}
          onReset={reset}
        />
      ) : null}
      {m.kind === "detection" ? (
        <div className="psych-tools">
          <label htmlFor={criterionId} className="psych-scrubber">
            <span>
              Criterion <output>{num(criterion)}</output>
            </span>
            <input
              id={criterionId}
              type="range"
              min={-2.5}
              max={5}
              step={0.02}
              value={criterion}
              aria-label="Criterion position"
              onChange={(e) => setCriterion(Number(e.currentTarget.value))}
            />
          </label>
          <button type="button" onClick={reset}>
            <RotateCcw aria-hidden="true" size={16} />
            Reset
          </button>
        </div>
      ) : null}
      {m.kind === "effect" ? (
        <div className="psych-tools">
          <label htmlFor={shiftId} className="psych-scrubber">
            <span>
              Shift {m.labelB} <output>{(shift >= 0 ? "+" : "") + num(shift)} SD</output>
            </span>
            <input
              id={shiftId}
              type="range"
              min={-2}
              max={2}
              step={0.05}
              value={shift}
              aria-label={"Shift the mean of " + m.labelB}
              onChange={(e) => setShift(Number(e.currentTarget.value))}
            />
          </label>
          <button type="button" onClick={reset}>
            <RotateCcw aria-hidden="true" size={16} />
            Reset
          </button>
        </div>
      ) : null}
      {m.kind === "assignment" && m.method === "random" ? (
        <div className="psych-tools">
          <button
            type="button"
            onClick={() => {
              setSeedOffset(seedOffset + 1);
              playback.start();
            }}
          >
            <Shuffle aria-hidden="true" size={16} />
            Draw again
          </button>
        </div>
      ) : null}
      {m.kind === "scatter" && m.zLabel ? (
        <div className="psych-tools">
          <button type="button" aria-pressed={colour} onClick={() => setColour(!colour)}>
            Colour by {m.zLabel}
          </button>
        </div>
      ) : null}
      {m.kind === "base_rate" ? (
        <div className="psych-tools">
          <button
            type="button"
            aria-pressed={positivesOnly}
            onClick={() => setPositivesOnly(!positivesOnly)}
          >
            Show only positive results
          </button>
        </div>
      ) : null}
      <details className="psych-description">
        <summary>Read given values</summary>
        <p>{psychologyGivens(m)}</p>
      </details>
      {showResults ? (
        <dl className="psych-measures" aria-label="Worked results for this case">
          {psychologyMeasures(m).map((v) => (
            <div key={v.label}>
              <dt>{v.label}</dt>
              <dd>{v.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
