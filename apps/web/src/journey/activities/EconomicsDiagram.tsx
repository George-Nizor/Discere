import {
  costsAnalysis,
  costsAt,
  costsScale,
  demandPrice,
  type EconomicsMarket,
  economicsGivenList,
  economicsMeasures,
  economicsMoney,
  economicsNumber,
  economicsSingular,
  elasticityAnalysis,
  gameAnalysis,
  marketCurves,
  marketEquilibrium,
  marketOutcome,
  marketScale,
  monopolyAnalysis,
  niceCeiling,
  quantityDemanded,
  quantitySupplied,
  repeatedPlay,
  repeatedStrategyNames,
  supplyPrice,
  tradeAnalysis,
} from "@discere/activity-engine";
import type { EconomicsModel, EconomicsDiagram as Spec } from "@discere/contracts";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useExperience } from "../../study/experience.js";

type Of<K extends EconomicsModel["kind"]> = Extract<EconomicsModel, { kind: K }>;
const n = economicsNumber,
  money = economicsMoney;

/* ---------- Geometry ---------- */

const W = 640,
  H = 400,
  L = 74,
  R = 604,
  T = 34,
  B = 336;
interface Frame {
  sx: (v: number) => number;
  sy: (v: number) => number;
  maxX: number;
  maxY: number;
  stepX: number;
  stepY: number;
}
/** A round axis maximum with three to six evenly spaced, readable ticks. */
function niceAxis(raw: number) {
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9) / 3));
  for (const unit of [1, 2, 2.5, 5, 10, 20, 25, 50]) {
    const step = unit * power;
    if (raw / step <= 6) return { max: Math.ceil(raw / step - 1e-9) * step, step };
  }
  return { max: raw, step: raw / 5 };
}
function frame(rawX: number, rawY: number): Frame {
  const x = niceAxis(rawX),
    y = niceAxis(rawY);
  return {
    sx: (v) => L + ((R - L) * v) / x.max,
    sy: (v) => B - ((B - T) * v) / y.max,
    maxX: x.max,
    maxY: y.max,
    stepX: x.step,
    stepY: y.step,
  };
}
const path = (points: Array<[number, number]>) =>
  points.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1)).join(" ");
const area = (points: Array<[number, number]>) => path(points) + " Z";
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ticks = (max: number, step: number) =>
  Array.from({ length: Math.round(max / step) + 1 }, (_, i) => Math.round(i * step * 1e6) / 1e6);
/** Moves stacked end labels apart so none overlaps its neighbour. */
function spread(ys: number[], gap = 18): number[] {
  const order = ys.map((y, i) => [y, i] as const).sort((a, b) => a[0] - b[0]);
  const out = [...ys];
  let last = Number.NEGATIVE_INFINITY;
  for (const [y, i] of order) {
    const placed = Math.max(y, last + gap);
    out[i] = placed;
    last = placed;
  }
  return out;
}

function Axes({
  f,
  xLabel,
  yLabel,
  yMoney = false,
}: {
  f: Frame;
  xLabel: string;
  yLabel: string;
  yMoney?: boolean;
}) {
  return (
    <g className="econ-axes" data-scale="">
      {ticks(f.maxY, f.stepY).map((v) => (
        <g key={"y" + v}>
          <path d={"M" + L + " " + f.sy(v) + "H" + R} className="econ-grid" />
          <text x={L - 10} y={f.sy(v) + 4} textAnchor="end" className="econ-tick">
            {yMoney ? money(v) : n(v)}
          </text>
        </g>
      ))}
      {ticks(f.maxX, f.stepX).map((v) => (
        <g key={"x" + v}>
          <path d={"M" + f.sx(v) + " " + B + "v6"} className="econ-axis" />
          <text x={f.sx(v)} y={B + 22} textAnchor="middle" className="econ-tick">
            {n(v)}
          </text>
        </g>
      ))}
      <path d={"M" + L + " " + (T - 8) + "V" + B + "H" + (R + 10)} className="econ-axis" />
      <text x={L - 4} y={T - 16} className="econ-axis-label">
        {yLabel}
      </text>
      <text x={R + 8} y={B + 44} textAnchor="end" className="econ-axis-label">
        {xLabel}
      </text>
    </g>
  );
}
function Tag({
  x,
  y,
  children,
  tone = "neutral",
  anchor = "start",
}: {
  x: number;
  y: number;
  children: ReactNode;
  tone?: string;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={"econ-tag econ-tag-" + tone}>
      {children}
    </text>
  );
}
function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id + "-panel"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1a1f2b" />
        <stop offset="1" stopColor="#0e1117" />
      </linearGradient>
      <radialGradient id={id + "-halo"} cx=".78" cy=".1" r=".9">
        <stop offset="0" stopColor="#f5c542" stopOpacity=".14" />
        <stop offset="1" stopColor="#f5c542" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={id + "-cs"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5ec8ff" stopOpacity=".55" />
        <stop offset="1" stopColor="#5ec8ff" stopOpacity=".16" />
      </linearGradient>
      <linearGradient id={id + "-ps"} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#f5c542" stopOpacity=".5" />
        <stop offset="1" stopColor="#f5c542" stopOpacity=".14" />
      </linearGradient>
      <linearGradient id={id + "-rev"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#b69cff" stopOpacity=".62" />
        <stop offset="1" stopColor="#7c5cf0" stopOpacity=".34" />
      </linearGradient>
      <linearGradient id={id + "-gain"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5fe0a0" stopOpacity=".6" />
        <stop offset="1" stopColor="#5fe0a0" stopOpacity=".18" />
      </linearGradient>
      <pattern
        id={id + "-dwl"}
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="8" height="8" fill="#ff5c7a" fillOpacity=".22" />
        <path d="M0 0V8" stroke="#ff5c7a" strokeOpacity=".75" strokeWidth="2.4" />
      </pattern>
      <filter id={id + "-glow"} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <marker
        id={id + "-arrow"}
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M0 1L9 5L0 9Z" fill="#f5c542" />
      </marker>
    </defs>
  );
}
function Panel({ id, children, label }: { id: string; children: ReactNode; label: string }) {
  return (
    <svg
      viewBox={"0 0 " + W + " " + H}
      className="econ-drawing"
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs id={id} />
      <rect x="0" y="0" width={W} height={H} rx="18" fill={"url(#" + id + "-panel)"} />
      <rect x="0" y="0" width={W} height={H} rx="18" fill={"url(#" + id + "-halo)"} />
      {children}
    </svg>
  );
}

/* ---------- Tweening between cases ---------- */

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
function vectorOf(m: EconomicsModel): number[] {
  const opt = (v: number | undefined) => (v === undefined ? Number.NaN : v);
  switch (m.kind) {
    case "market":
      return [
        m.demand.intercept,
        m.demand.slope,
        m.supply.intercept,
        m.supply.slope,
        m.demandShift ?? 0,
        m.supplyShift ?? 0,
        opt(m.tax),
        opt(m.externalCost),
        opt(m.control?.price),
        opt(m.quota),
        opt(m.marker),
      ];
    case "elasticity":
      return [m.demand.intercept, m.demand.slope, ...m.prices];
    case "ppf":
      return [...m.points.flatMap((p) => [p.x, p.y]), opt(m.marker?.x), opt(m.marker?.y)];
    case "trade":
      return [...m.producers.flatMap((p) => [p.maxX, p.maxY]), opt(m.terms)];
    case "margin":
      return [...m.benefits, ...m.costs];
    case "costs":
      return [m.fixedCost, m.linearCost, m.quadraticCost, opt(m.price)];
    case "monopoly":
      return [m.demandIntercept, m.demandSlope, m.marginalCost];
    case "game":
      return m.payoffs.flat(2);
    case "repeated":
      return [];
  }
}
function withVector(m: EconomicsModel, v: number[]): EconomicsModel {
  const opt = (x: number | undefined) => (x === undefined || Number.isNaN(x) ? undefined : x);
  switch (m.kind) {
    case "market": {
      const tax = opt(v[6]),
        externalCost = opt(v[7]),
        control = opt(v[8]),
        quota = opt(v[9]),
        marker = opt(v[10]);
      return {
        ...m,
        demand: { intercept: v[0]!, slope: v[1]! },
        supply: { intercept: v[2]!, slope: v[3]! },
        demandShift: v[4]!,
        supplyShift: v[5]!,
        ...(m.tax !== undefined && tax !== undefined ? { tax } : {}),
        ...(m.externalCost !== undefined && externalCost !== undefined ? { externalCost } : {}),
        ...(m.control && control !== undefined
          ? { control: { kind: m.control.kind, price: control } }
          : {}),
        ...(m.quota !== undefined && quota !== undefined ? { quota } : {}),
        ...(m.marker !== undefined && marker !== undefined ? { marker } : {}),
      };
    }
    case "elasticity":
      return {
        ...m,
        demand: { intercept: v[0]!, slope: v[1]! },
        prices: [v[2]!, v[3]!],
      };
    case "ppf": {
      const points = m.points.map((_, i) => ({ x: v[2 * i]!, y: v[2 * i + 1]! }));
      const mx = opt(v[2 * m.points.length]),
        my = opt(v[2 * m.points.length + 1]);
      return {
        ...m,
        points,
        ...(m.marker && mx !== undefined && my !== undefined ? { marker: { x: mx, y: my } } : {}),
      };
    }
    case "trade":
      return {
        ...m,
        producers: m.producers.map((p, i) => ({ ...p, maxX: v[2 * i]!, maxY: v[2 * i + 1]! })),
        ...(m.terms !== undefined && opt(v[4]) !== undefined ? { terms: v[4]! } : {}),
      };
    case "margin":
      return {
        ...m,
        benefits: m.benefits.map((_, i) => v[i]!),
        costs: m.costs.map((_, i) => v[m.benefits.length + i]!),
      };
    case "costs":
      return {
        ...m,
        fixedCost: v[0]!,
        linearCost: v[1]!,
        quadraticCost: v[2]!,
        ...(m.price !== undefined && opt(v[3]) !== undefined ? { price: v[3]! } : {}),
      };
    case "monopoly":
      return { ...m, demandIntercept: v[0]!, demandSlope: v[1]!, marginalCost: v[2]! };
    case "game": {
      let k = 0;
      return {
        ...m,
        payoffs: m.payoffs.map((row) => row.map((): [number, number] => [v[k++]!, v[k++]!])),
      };
    }
    case "repeated":
      return m;
  }
}
/** The opening state for a model whose policy layer should animate in. */
function introOf(m: EconomicsModel): EconomicsModel {
  if (m.kind === "market" && (m.tax !== undefined || m.externalCost !== undefined))
    return {
      ...m,
      ...(m.tax !== undefined ? { tax: 0 } : {}),
      ...(m.externalCost !== undefined ? { externalCost: 0 } : {}),
    };
  return m;
}
/** Animates a model's numbers from the case on screen to the selected case. */
function useTweenedModel(target: EconomicsModel, reduced: boolean): EconomicsModel {
  const [shown, setShown] = useState<EconomicsModel>(() => (reduced ? target : introOf(target)));
  const current = useRef(shown);
  current.current = shown;
  const key = JSON.stringify(target);
  useEffect(() => {
    const from = current.current;
    const a = vectorOf(from),
      b = vectorOf(target);
    const compatible =
      from.kind === target.kind &&
      a.length === b.length &&
      b.length > 0 &&
      (from.kind !== "game" ||
        (target.kind === "game" &&
          from.payoffs.length === target.payoffs.length &&
          from.payoffs[0]!.length === target.payoffs[0]!.length));
    if (reduced || !compatible || typeof requestAnimationFrame !== "function") {
      setShown(target);
      return;
    }
    let frameId = 0,
      start: number | undefined;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / 720),
        e = ease(t);
      const mixed = b.map((to, i) => {
        const fromValue = a[i]!;
        return Number.isNaN(to) || Number.isNaN(fromValue) ? to : fromValue + (to - fromValue) * e;
      });
      setShown(t >= 1 ? target : withVector(target, mixed));
      if (t < 1) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
    // The serialised target is the dependency; the object identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced]);
  return shown;
}

/* ---------- Drawings ---------- */

interface DrawProps {
  id: string;
  label: string;
  reveal: boolean;
  /** Interactive probe value, in model units, or undefined for a static drawing. */
  probe?: number | undefined;
  onProbe?: ((value: number) => void) | undefined;
}
function usePointerProbe(
  f: Frame,
  axis: "x" | "y",
  onProbe: ((v: number) => void) | undefined,
  step: number,
) {
  const dragging = useRef(false);
  const toValue = (e: ReactPointerEvent<SVGRectElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return undefined;
    const box = svg.getBoundingClientRect();
    if (!box.width || !box.height) return undefined;
    const scale = Math.min(box.width / W, box.height / H);
    const offsetX = (box.width - W * scale) / 2,
      offsetY = (box.height - H * scale) / 2;
    const x = (e.clientX - box.left - offsetX) / scale,
      y = (e.clientY - box.top - offsetY) / scale;
    const raw = axis === "x" ? ((x - L) / (R - L)) * f.maxX : ((B - y) / (B - T)) * f.maxY;
    const max = axis === "x" ? f.maxX : f.maxY;
    return clamp(Math.round(raw / step) * step, 0, max);
  };
  if (!onProbe) return {};
  return {
    onPointerDown: (e: ReactPointerEvent<SVGRectElement>) => {
      dragging.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const v = toValue(e);
      if (v !== undefined) onProbe(v);
    },
    onPointerMove: (e: ReactPointerEvent<SVGRectElement>) => {
      if (!dragging.current) return;
      const v = toValue(e);
      if (v !== undefined) onProbe(v);
    },
    onPointerUp: () => {
      dragging.current = false;
    },
    onPointerCancel: () => {
      dragging.current = false;
    },
  };
}

function MarketDrawing({
  m,
  scale,
  id,
  label,
  reveal,
  probe,
  onProbe,
}: DrawProps & { m: EconomicsMarket; scale: { maxP: number; maxQ: number } }) {
  const f = frame(scale.maxQ, scale.maxP);
  const { a, b, c, d } = marketCurves(m);
  const base = marketCurves(m, false);
  const shifted = (m.demandShift ?? 0) !== 0 || (m.supplyShift ?? 0) !== 0;
  const eq = marketEquilibrium(m);
  const o = marketOutcome(m);
  const pointer = usePointerProbe(f, "y", onProbe, priceStep(scale.maxP));
  const demandLine = (aa: number, bb: number, lift = 0): Array<[number, number]> => {
    const pTop = Math.min(f.maxY, aa / bb + lift),
      pBottom = Math.max(lift, (aa - f.maxX) / bb + lift);
    return [
      [f.sx(aa - bb * (pTop - lift)), f.sy(pTop)],
      [f.sx(aa - bb * (pBottom - lift)), f.sy(pBottom)],
    ];
  };
  const supplyLine = (cc: number, dd: number, lift = 0): Array<[number, number]> => {
    const pLow = Math.max(0, -cc / dd) + lift,
      pHigh = Math.min(f.maxY, (f.maxX - cc) / dd + lift);
    return [
      [f.sx(Math.max(0, cc + dd * (pLow - lift))), f.sy(pLow)],
      [f.sx(cc + dd * (pHigh - lift)), f.sy(pHigh)],
    ];
  };
  const samples = (from: number, to: number, fn: (q: number) => number) =>
    Array.from({ length: 33 }, (_, i): [number, number] => {
      const q = from + ((to - from) * i) / 32;
      return [f.sx(q), f.sy(clamp(fn(q), 0, f.maxY))];
    });
  const dP = (q: number) => demandPrice(m, q),
    sP = (q: number) => supplyPrice(m, q);
  const layers: ReactNode[] = [];
  const surplusView = m.view === "surplus";
  if (surplusView && m.quota === undefined) {
    layers.push(
      <path
        key="cs"
        className="econ-fill econ-fill-cs"
        fill={"url(#" + id + "-cs)"}
        d={area([[f.sx(0), f.sy(eq.price)], ...samples(0, eq.quantity, dP)])}
      />,
      <path
        key="ps"
        className="econ-fill econ-fill-ps"
        fill={"url(#" + id + "-ps)"}
        d={area([[f.sx(0), f.sy(eq.price)], ...samples(0, eq.quantity, sP)])}
      />,
    );
  }
  if (m.quota !== undefined && o.quota) {
    const q = o.quota.traded;
    layers.push(
      <path
        key="kept"
        className="econ-fill econ-fill-kept"
        fill={"url(#" + id + "-gain)"}
        d={area([...samples(0, q, dP), ...samples(q, 0, sP)])}
      />,
    );
    if (o.quota.binding)
      layers.push(
        <path
          key="dwl"
          className="econ-fill econ-fill-dwl"
          fill={"url(#" + id + "-dwl)"}
          d={area([...samples(q, eq.quantity, dP), ...samples(eq.quantity, q, sP)])}
        />,
        <path key="cap" className="econ-cap" d={"M" + f.sx(q) + " " + T + "V" + B} />,
        <Tag key="cap-tag" x={f.sx(q) + 6} y={T + 14} tone="rose">
          {"Cap " + n(m.quota)}
        </Tag>,
      );
  }
  if (m.tax !== undefined && o.tax && m.tax > 0.001) {
    const t = o.tax;
    layers.push(
      <path
        key="rev"
        className="econ-fill econ-fill-rev"
        fill={"url(#" + id + "-rev)"}
        d={area([
          [f.sx(0), f.sy(t.buyerPrice)],
          [f.sx(t.quantity), f.sy(t.buyerPrice)],
          [f.sx(t.quantity), f.sy(t.sellerPrice)],
          [f.sx(0), f.sy(t.sellerPrice)],
        ])}
      />,
      <path
        key="dwl"
        className="econ-fill econ-fill-dwl"
        fill={"url(#" + id + "-dwl)"}
        d={area([
          [f.sx(t.quantity), f.sy(t.buyerPrice)],
          [f.sx(eq.quantity), f.sy(eq.price)],
          [f.sx(t.quantity), f.sy(t.sellerPrice)],
        ])}
      />,
      <path
        key="wedge"
        className="econ-wedge"
        d={"M" + f.sx(t.quantity) + " " + f.sy(t.buyerPrice) + "V" + f.sy(t.sellerPrice)}
        markerStart={"url(#" + id + "-arrow)"}
        markerEnd={"url(#" + id + "-arrow)"}
      />,
      <path
        key="pb"
        className="econ-guide"
        d={"M" + L + " " + f.sy(t.buyerPrice) + "H" + f.sx(t.quantity)}
      />,
      <path
        key="ps-line"
        className="econ-guide"
        d={"M" + L + " " + f.sy(t.sellerPrice) + "H" + f.sx(t.quantity)}
      />,
      <Tag
        key="wedge-tag"
        x={f.sx(t.quantity) - 10}
        y={(f.sy(t.buyerPrice) + f.sy(t.sellerPrice)) / 2 + 4}
        tone="gold"
        anchor="end"
      >
        {"Tax " + money(m.tax)}
      </Tag>,
    );
  }
  if (m.externalCost !== undefined && o.externality && m.externalCost > 0.001) {
    const x = o.externality;
    layers.push(
      <path
        key="dwl"
        className="econ-fill econ-fill-dwl"
        fill={"url(#" + id + "-dwl)"}
        d={area([
          [f.sx(x.quantity), f.sy(x.price)],
          ...samples(x.quantity, eq.quantity, (q) => sP(q) + (m.externalCost ?? 0)),
          [f.sx(eq.quantity), f.sy(eq.price)],
        ])}
      />,
    );
  }
  const control = m.control;
  return (
    <Panel id={id} label={label}>
      <Axes f={f} xLabel={"Quantity of " + m.good.toLowerCase()} yLabel="Price" yMoney />
      <g className="econ-layers" key={m.view}>
        {layers}
      </g>
      {shifted ? (
        <g className="econ-ghost">
          {(m.demandShift ?? 0) !== 0 ? <path d={path(demandLine(base.a, base.b))} /> : null}
          {(m.supplyShift ?? 0) !== 0 ? <path d={path(supplyLine(base.c, base.d))} /> : null}
        </g>
      ) : null}
      {m.tax !== undefined && m.tax > 0.001 ? (
        <>
          <path className="econ-curve econ-supply econ-dashed" d={path(supplyLine(c, d, m.tax))} />
          <Tag
            x={supplyLine(c, d, m.tax)[1]![0] - 8}
            y={supplyLine(c, d, m.tax)[1]![1] - 10}
            tone="gold"
            anchor="end"
          >
            Supply + tax
          </Tag>
        </>
      ) : null}
      {m.externalCost !== undefined && m.externalCost > 0.001 ? (
        <>
          <path className="econ-curve econ-social" d={path(supplyLine(c, d, m.externalCost))} />
          <Tag
            x={supplyLine(c, d, m.externalCost)[1]![0] - 6}
            y={supplyLine(c, d, m.externalCost)[1]![1] - 10}
            tone="rose"
            anchor="end"
          >
            Social cost
          </Tag>
        </>
      ) : null}
      <path className="econ-curve econ-demand" d={path(demandLine(a, b))} />
      <path className="econ-curve econ-supply" d={path(supplyLine(c, d))} />
      <Tag
        x={demandLine(a, b)[1]![0] - 4}
        y={demandLine(a, b)[1]![1] - 12}
        tone="blue"
        anchor="end"
      >
        Demand
      </Tag>
      <Tag x={supplyLine(c, d)[1]![0] - 8} y={supplyLine(c, d)[1]![1] + 6} tone="gold" anchor="end">
        Supply
      </Tag>
      {control ? (
        <g className={"econ-control econ-control-" + control.kind}>
          <path d={"M" + L + " " + f.sy(control.price) + "H" + R} />
          <Tag x={R - 4} y={f.sy(control.price) - 8} tone="rose" anchor="end">
            {(control.kind === "ceiling" ? "Ceiling " : "Floor ") + money(control.price)}
          </Tag>
          <GapBracket m={m} price={control.price} f={f} reveal={reveal} />
        </g>
      ) : null}
      {m.marker !== undefined ? (
        <g className="econ-control econ-marker">
          <path d={"M" + L + " " + f.sy(m.marker) + "H" + R} />
          <Tag x={R - 4} y={f.sy(m.marker) - 8} tone="neutral" anchor="end">
            {"Price " + money(m.marker)}
          </Tag>
          <GapBracket m={m} price={m.marker} f={f} reveal={reveal} />
        </g>
      ) : null}
      <circle
        className="econ-point"
        cx={f.sx(eq.quantity)}
        cy={f.sy(eq.price)}
        r="7"
        filter={"url(#" + id + "-glow)"}
      />
      {m.externalCost !== undefined && o.externality && m.externalCost > 0.001 ? (
        <circle
          className="econ-point econ-point-social"
          cx={f.sx(o.externality.quantity)}
          cy={f.sy(o.externality.price)}
          r="6"
        />
      ) : null}
      {reveal ? (
        <g className="econ-reveal">
          <path
            className="econ-guide"
            d={"M" + L + " " + f.sy(eq.price) + "H" + f.sx(eq.quantity) + "V" + B}
          />
          <Tag x={f.sx(eq.quantity) + 10} y={f.sy(eq.price) - 10} tone="gold">
            {money(eq.price) + ", " + n(eq.quantity)}
          </Tag>
        </g>
      ) : null}
      {probe !== undefined ? (
        <g className="econ-probe" data-price={probe}>
          <path d={"M" + L + " " + f.sy(probe) + "H" + R} />
          <circle
            cx={f.sx(Math.min(f.maxX, quantityDemanded(m, probe)))}
            cy={f.sy(probe)}
            r="6"
            className="econ-probe-d"
          />
          <circle
            cx={f.sx(Math.min(f.maxX, quantitySupplied(m, probe)))}
            cy={f.sy(probe)}
            r="6"
            className="econ-probe-s"
          />
          <GapBracket m={m} price={probe} f={f} reveal={reveal} probe />
        </g>
      ) : null}
      {onProbe ? (
        <rect x={L} y={T} width={R - L} height={B - T} className="econ-hit" {...pointer} />
      ) : null}
    </Panel>
  );
}
function priceStep(maxP: number) {
  return maxP > 200 ? 5 : maxP > 60 ? 1 : 0.5;
}
function GapBracket({
  m,
  price,
  f,
  reveal,
  probe = false,
}: {
  m: EconomicsMarket;
  price: number;
  f: Frame;
  reveal: boolean;
  probe?: boolean;
}) {
  const rawD = quantityDemanded(m, price),
    rawS = quantitySupplied(m, price);
  if (Math.abs(rawD - rawS) < 1e-6) return null;
  const qd = Math.min(rawD, f.maxX),
    qs = Math.min(rawS, f.maxX);
  const y = f.sy(price) + (probe ? 18 : 16);
  const word = qd > qs ? "Shortage" : "Surplus";
  return (
    <g className={"econ-gap econ-gap-" + (qd > qs ? "short" : "excess")}>
      <path d={"M" + f.sx(Math.min(qd, qs)) + " " + y + "H" + f.sx(Math.max(qd, qs))} />
      <path d={"M" + f.sx(qd) + " " + (y - 5) + "v10M" + f.sx(qs) + " " + (y - 5) + "v10"} />
      <Tag
        x={(f.sx(qd) + f.sx(qs)) / 2}
        y={y + 16}
        anchor="middle"
        tone={qd > qs ? "rose" : "violet"}
      >
        {reveal ? word + " " + n(Math.abs(rawD - rawS)) : word}
      </Tag>
    </g>
  );
}

function ElasticityDrawing({
  m,
  scale,
  id,
  label,
  reveal,
  probe = 0,
}: DrawProps & { m: Of<"elasticity">; scale: { maxP: number; maxQ: number } }) {
  const f = frame(scale.maxQ, scale.maxP);
  const e = elasticityAnalysis(m);
  const [p1, p2] = m.prices;
  const p = p1 + (p2 - p1) * probe,
    q = m.demand.intercept - m.demand.slope * p;
  const top = Math.min(f.maxY, m.demand.intercept / m.demand.slope),
    bottom = Math.max(0, (m.demand.intercept - f.maxX) / m.demand.slope);
  const rect = (pp: number, qq: number) =>
    area([
      [f.sx(0), f.sy(pp)],
      [f.sx(qq), f.sy(pp)],
      [f.sx(qq), f.sy(0)],
      [f.sx(0), f.sy(0)],
    ]);
  return (
    <Panel id={id} label={label}>
      <Axes f={f} xLabel={"Quantity of " + m.good.toLowerCase()} yLabel="Price" yMoney />
      <path className="econ-ghost-rect" d={rect(p1, e.q1)} />
      <path className="econ-ghost-rect econ-ghost-rect-b" d={rect(p2, e.q2)} />
      <path
        className="econ-fill econ-fill-rev econ-live"
        fill={"url(#" + id + "-rev)"}
        d={rect(p, q)}
      />
      {probe > 0.98 ? (
        <g className="econ-strips">
          <path
            className="econ-strip-lost"
            d={area([
              [f.sx(0), f.sy(Math.max(p1, p2))],
              [f.sx(Math.min(e.q1, e.q2)), f.sy(Math.max(p1, p2))],
              [f.sx(Math.min(e.q1, e.q2)), f.sy(Math.min(p1, p2))],
              [f.sx(0), f.sy(Math.min(p1, p2))],
            ])}
          />
          <path
            className="econ-strip-gained"
            d={area([
              [f.sx(Math.min(e.q1, e.q2)), f.sy(Math.min(p1, p2))],
              [f.sx(Math.max(e.q1, e.q2)), f.sy(Math.min(p1, p2))],
              [f.sx(Math.max(e.q1, e.q2)), f.sy(0)],
              [f.sx(Math.min(e.q1, e.q2)), f.sy(0)],
            ])}
          />
        </g>
      ) : null}
      <path
        className="econ-curve econ-demand"
        d={path([
          [f.sx(m.demand.intercept - m.demand.slope * top), f.sy(top)],
          [f.sx(m.demand.intercept - m.demand.slope * bottom), f.sy(bottom)],
        ])}
      />
      {[
        [p1, e.q1, "A"],
        [p2, e.q2, "B"],
      ].map(([pp, qq, name]) => (
        <g key={String(name)}>
          <path
            className="econ-guide"
            d={"M" + L + " " + f.sy(Number(pp)) + "H" + f.sx(Number(qq)) + "V" + B}
          />
          <circle className="econ-point" cx={f.sx(Number(qq))} cy={f.sy(Number(pp))} r="6" />
          <Tag x={f.sx(Number(qq)) + 10} y={f.sy(Number(pp)) - 8} tone="gold">
            {name + "  " + money(Number(pp)) + ", " + n(Number(qq))}
          </Tag>
        </g>
      ))}
      <circle
        className="econ-point econ-point-live"
        cx={f.sx(q)}
        cy={f.sy(p)}
        r="8"
        filter={"url(#" + id + "-glow)"}
      />
      <Tag x={f.sx(q / 2)} y={f.sy(p / 2)} anchor="middle" tone="light">
        {reveal ? "Revenue " + money(p * q) : "Revenue"}
      </Tag>
    </Panel>
  );
}

function PpfDrawing({
  m,
  scale,
  id,
  label,
  reveal,
  probe,
}: DrawProps & { m: Of<"ppf">; scale: { maxX: number; maxY: number } }) {
  const f = frame(scale.maxX, scale.maxY);
  const pts = m.points.map((p): [number, number] => [f.sx(p.x), f.sy(p.y)]);
  const segs = m.points.slice(1).map((p, i) => [m.points[i]!, p] as const);
  const x = probe === undefined ? undefined : clamp(probe, 0, m.points.at(-1)!.x);
  const seg = x === undefined ? undefined : (segs.find(([, b]) => x <= b.x + 1e-9) ?? segs.at(-1)!);
  const y =
    x === undefined || !seg
      ? 0
      : seg[0].y + ((seg[1].y - seg[0].y) * (x - seg[0].x)) / (seg[1].x - seg[0].x);
  return (
    <Panel id={id} label={label}>
      <Axes f={f} xLabel={m.goodX} yLabel={m.goodY} />
      <path
        className="econ-attainable"
        fill={"url(#" + id + "-gain)"}
        d={area([[f.sx(0), f.sy(0)], ...pts])}
      />
      <path className="econ-curve econ-frontier" d={path(pts)} filter={"url(#" + id + "-glow)"} />
      {m.points.map((p) => (
        <circle key={p.x + "-" + p.y} className="econ-node" cx={f.sx(p.x)} cy={f.sy(p.y)} r="4.5" />
      ))}
      {seg ? (
        <g className="econ-slope">
          <path
            d={
              "M" +
              f.sx(seg[0].x) +
              " " +
              f.sy(seg[0].y) +
              "H" +
              f.sx(seg[1].x) +
              "V" +
              f.sy(seg[1].y)
            }
          />
          <Tag
            x={(f.sx(seg[0].x) + f.sx(seg[1].x)) / 2}
            y={f.sy(seg[0].y) - 8}
            anchor="middle"
            tone="green"
          >
            {"+" + n(seg[1].x - seg[0].x) + " " + m.goodX.toLowerCase()}
          </Tag>
          <Tag x={f.sx(seg[1].x) + 8} y={(f.sy(seg[0].y) + f.sy(seg[1].y)) / 2 + 4} tone="rose">
            {reveal ? "−" + n(seg[0].y - seg[1].y) + " " + m.goodY.toLowerCase() : "given up"}
          </Tag>
        </g>
      ) : null}
      {m.marker ? (
        <g className="econ-marker-point">
          <circle
            className="econ-point econ-point-marker"
            cx={f.sx(m.marker.x)}
            cy={f.sy(m.marker.y)}
            r="8"
            filter={"url(#" + id + "-glow)"}
          />
          <Tag x={f.sx(m.marker.x) + 12} y={f.sy(m.marker.y) - 10} tone="light">
            {"(" + n(m.marker.x) + ", " + n(m.marker.y) + ")"}
          </Tag>
        </g>
      ) : null}
      {x !== undefined ? (
        <circle className="econ-point econ-point-live" cx={f.sx(x)} cy={f.sy(y)} r="7" data-x={x} />
      ) : null}
    </Panel>
  );
}

function TradeDrawing({
  m,
  scale,
  id,
  label,
  reveal,
  probe = 0.5,
}: DrawProps & { m: Of<"trade">; scale: { maxX: number; maxY: number } }) {
  const f = frame(scale.maxX, scale.maxY);
  const t = tradeAnalysis(m);
  const tones = ["blue", "gold"];
  const specialist = t.producers.find((p) => p.name === t.xSpecialist);
  return (
    <Panel id={id} label={label}>
      <Axes f={f} xLabel={m.goodX} yLabel={m.goodY} />
      {t.producers.map((p, i) => (
        <g key={p.name} className={"econ-producer econ-producer-" + tones[i]}>
          <path
            className="econ-producer-area"
            d={area([
              [f.sx(0), f.sy(0)],
              [f.sx(0), f.sy(p.maxY)],
              [f.sx(p.maxX), f.sy(0)],
            ])}
          />
          <path
            className="econ-curve"
            d={path([
              [f.sx(0), f.sy(p.maxY)],
              [f.sx(p.maxX), f.sy(0)],
            ])}
          />
          <circle
            className="econ-point"
            cx={f.sx(p.maxX * probe)}
            cy={f.sy(p.maxY * (1 - probe))}
            r="6.5"
          />
          <circle cx={R - 14} cy={T + 6 + 26 * i - 5} r="6" className="econ-legend-dot" />
          <Tag x={R - 28} y={T + 6 + 26 * i} anchor="end" tone={tones[i] ?? "blue"}>
            {reveal
              ? p.name +
                ": 1 " +
                economicsSingular(m.goodX) +
                " costs " +
                n(p.costOfX) +
                " " +
                m.goodY.toLowerCase()
              : p.name}
          </Tag>
        </g>
      ))}
      {m.terms !== undefined && specialist ? (
        <g className="econ-trade-line">
          <path
            d={path([
              [f.sx(specialist.maxX), f.sy(0)],
              [f.sx(0), f.sy(Math.min(f.maxY, specialist.maxX * m.terms))],
            ])}
          />
          <Tag
            x={f.sx(specialist.maxX * 0.7) + 12}
            y={f.sy(specialist.maxX * m.terms * 0.3) + 4}
            tone="green"
          >
            {"Trade at " + n(m.terms) + " " + m.goodY.toLowerCase() + " each"}
          </Tag>
        </g>
      ) : null}
    </Panel>
  );
}

function MarginDrawing({
  m,
  id,
  label,
  reveal,
  probe = 0,
  scaleMax,
}: DrawProps & { m: Of<"margin">; scaleMax: number }) {
  const count = m.benefits.length;
  const f = frame(count, scaleMax);
  const slot = (R - L) / count;
  const chosen = Math.round(probe);
  return (
    <Panel id={id} label={label}>
      <g className="econ-axes" data-scale="">
        {ticks(f.maxY, f.stepY).map((v) => (
          <g key={v}>
            <path d={"M" + L + " " + f.sy(v) + "H" + R} className="econ-grid" />
            <text x={L - 10} y={f.sy(v) + 4} textAnchor="end" className="econ-tick">
              {money(v)}
            </text>
          </g>
        ))}
        <path d={"M" + L + " " + (T - 8) + "V" + B + "H" + (R + 10)} className="econ-axis" />
        <text x={L - 4} y={T - 16} className="econ-axis-label">
          £ per {m.unit.toLowerCase()}
        </text>
      </g>
      {m.benefits.map((benefit, i) => {
        const cost = m.costs[i]!,
          x0 = L + slot * i,
          on = i < chosen;
        const gain = benefit >= cost;
        return (
          <g
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed marks in an immutable authored model are identified by position.
            key={i}
            className={"econ-unit" + (on ? " econ-unit-on" : "")}
            data-unit={i + 1}
          >
            {on ? (
              <rect
                x={x0 + slot * 0.1}
                y={f.sy(Math.max(benefit, cost))}
                width={slot * 0.8}
                height={Math.abs(f.sy(cost) - f.sy(benefit))}
                className={gain ? "econ-net-gain" : "econ-net-loss"}
              />
            ) : null}
            <rect
              className="econ-bar econ-bar-benefit"
              x={x0 + slot * 0.16}
              y={f.sy(benefit)}
              width={slot * 0.3}
              height={B - f.sy(benefit)}
              rx="4"
            />
            <rect
              className="econ-bar econ-bar-cost"
              x={x0 + slot * 0.54}
              y={f.sy(cost)}
              width={slot * 0.3}
              height={B - f.sy(cost)}
              rx="4"
            />
            <text x={x0 + slot / 2} y={B + 22} textAnchor="middle" className="econ-tick">
              {m.unit + " " + (i + 1)}
            </text>
          </g>
        );
      })}
      <path
        className="econ-curve econ-demand econ-step"
        d={path(
          m.benefits.flatMap(
            (v, i): Array<[number, number]> => [
              [L + slot * i, f.sy(v)],
              [L + slot * (i + 1), f.sy(v)],
            ],
          ),
        )}
      />
      <path
        className="econ-curve econ-supply econ-step"
        d={path(
          m.costs.flatMap(
            (v, i): Array<[number, number]> => [
              [L + slot * i, f.sy(v)],
              [L + slot * (i + 1), f.sy(v)],
            ],
          ),
        )}
      />
      <g className="econ-legend">
        <rect x={L + 130} y={T - 4} width="12" height="12" rx="3" className="econ-bar-benefit" />
        <Tag x={L + 148} y={T + 6}>
          Marginal benefit
        </Tag>
        <rect x={L + 360} y={T - 4} width="12" height="12" rx="3" className="econ-bar-cost" />
        <Tag x={L + 378} y={T + 6}>
          Marginal cost
        </Tag>
      </g>
      {reveal ? (
        <path
          className="econ-best"
          d={"M" + (L + slot * marginBest(m)) + " " + T + "V" + B}
          filter={"url(#" + id + "-glow)"}
        />
      ) : null}
    </Panel>
  );
}
function marginBest(m: Of<"margin">) {
  let best = 0,
    total = 0,
    bestTotal = 0;
  m.benefits.forEach((b, i) => {
    total += b - m.costs[i]!;
    if (total >= bestTotal - 1e-12) {
      best = i + 1;
      bestTotal = total;
    }
  });
  return best;
}

function CostsDrawing({
  m,
  scale,
  id,
  label,
  reveal,
  probe,
}: DrawProps & { m: Of<"costs">; scale: { maxQ: number; maxC: number } }) {
  const f = frame(scale.maxQ, scale.maxC);
  const a = costsAnalysis(m);
  const curve = (fn: (q: number) => number, from = 0.2) =>
    path(
      Array.from({ length: 80 }, (_, i): [number, number] => {
        const q = from + ((f.maxX - from) * i) / 79;
        return [f.sx(q), f.sy(clamp(fn(q), 0, f.maxY * 1.05))];
      }).filter(([, y]) => y >= T - 6),
    );
  const q = probe;
  const at = q === undefined ? undefined : costsAt(m, Math.max(q, 0.01));
  return (
    <Panel id={id} label={label}>
      <Axes f={f} xLabel="Output, q" yLabel="£ per unit" yMoney />
      {m.price !== undefined && at && q !== undefined && q > 0 ? (
        <path
          className={
            "econ-fill " + (m.price >= at.averageTotal ? "econ-fill-profit" : "econ-fill-loss")
          }
          d={area([
            [f.sx(0), f.sy(m.price)],
            [f.sx(q), f.sy(m.price)],
            [f.sx(q), f.sy(Math.min(at.averageTotal, f.maxY))],
            [f.sx(0), f.sy(Math.min(at.averageTotal, f.maxY))],
          ])}
        />
      ) : null}
      <path className="econ-curve econ-avc" d={curve((x) => costsAt(m, x).averageVariable, 0)} />
      <path
        className="econ-curve econ-atc"
        d={curve((x) => costsAt(m, x).averageTotal, Math.max(0.2, m.fixedCost / (f.maxY * 1.05)))}
      />
      <path className="econ-curve econ-mc" d={curve((x) => costsAt(m, x).marginal, 0)} />
      {m.price !== undefined ? (
        <g className="econ-price-line">
          <path d={"M" + L + " " + f.sy(m.price) + "H" + R} />
          <Tag x={R - 4} y={f.sy(m.price) - 8} anchor="end" tone="green">
            {"Price = MR " + money(m.price)}
          </Tag>
        </g>
      ) : null}
      {(() => {
        const end = costsAt(m, f.maxX);
        const [mcY, atcY, avcY] = spread(
          [end.marginal, end.averageTotal, end.averageVariable].map(
            (v) => f.sy(Math.min(v, f.maxY)) + 18,
          ),
        );
        return (
          <>
            <Tag x={R - 6} y={mcY!} anchor="end" tone="orange">
              MC
            </Tag>
            <Tag x={R - 6} y={atcY!} anchor="end" tone="teal">
              ATC
            </Tag>
            <Tag x={R - 6} y={avcY!} anchor="end" tone="muted">
              AVC
            </Tag>
          </>
        );
      })()}
      {q !== undefined && at ? (
        <g className="econ-probe">
          <path d={"M" + f.sx(q) + " " + T + "V" + B} />
          <circle
            cx={f.sx(q)}
            cy={f.sy(Math.min(at.marginal, f.maxY))}
            r="6"
            className="econ-probe-mc"
          />
          {q > 0.01 ? (
            <circle
              cx={f.sx(q)}
              cy={f.sy(Math.min(at.averageTotal, f.maxY))}
              r="6"
              className="econ-probe-atc"
            />
          ) : null}
        </g>
      ) : null}
      {reveal ? (
        <g className="econ-reveal">
          <circle
            className="econ-point"
            cx={f.sx(a.efficientScale)}
            cy={f.sy(a.minimumAverage)}
            r="7"
            filter={"url(#" + id + "-glow)"}
          />
          <Tag x={f.sx(a.efficientScale) + 10} y={f.sy(a.minimumAverage) + 22} tone="teal">
            {"Lowest ATC " + money(a.minimumAverage)}
          </Tag>
          {a.decision ? (
            <path
              className="econ-guide"
              d={"M" + f.sx(a.decision.quantity) + " " + f.sy(m.price ?? 0) + "V" + B}
            />
          ) : null}
        </g>
      ) : null}
    </Panel>
  );
}

function MonopolyDrawing({
  m,
  scale,
  id,
  label,
  reveal,
  probe,
}: DrawProps & { m: Of<"monopoly">; scale: { maxQ: number; maxP: number } }) {
  const f = frame(scale.maxQ, scale.maxP);
  const A = m.demandIntercept,
    Bs = m.demandSlope;
  const a = monopolyAnalysis(m);
  const qEnd = Math.min(f.maxX, A / Bs);
  return (
    <Panel id={id} label={label}>
      <Axes f={f} xLabel="Quantity" yLabel="Price" yMoney />
      {reveal ? (
        <g className="econ-reveal">
          <path
            className="econ-fill econ-fill-ps"
            fill={"url(#" + id + "-ps)"}
            d={area([
              [f.sx(0), f.sy(a.price)],
              [f.sx(a.quantity), f.sy(a.price)],
              [f.sx(a.quantity), f.sy(m.marginalCost)],
              [f.sx(0), f.sy(m.marginalCost)],
            ])}
          />
          <path
            className="econ-fill econ-fill-dwl"
            fill={"url(#" + id + "-dwl)"}
            d={area([
              [f.sx(a.quantity), f.sy(a.price)],
              [f.sx(a.competitiveQuantity), f.sy(m.marginalCost)],
              [f.sx(a.quantity), f.sy(m.marginalCost)],
            ])}
          />
        </g>
      ) : null}
      <path
        className="econ-curve econ-demand"
        d={path([
          [f.sx(0), f.sy(A)],
          [f.sx(qEnd), f.sy(A - Bs * qEnd)],
        ])}
      />
      <path
        className="econ-curve econ-mr"
        d={path([
          [f.sx(0), f.sy(A)],
          [
            f.sx(Math.min(f.maxX, A / (2 * Bs))),
            f.sy(Math.max(0, A - 2 * Bs * Math.min(f.maxX, A / (2 * Bs)))),
          ],
        ])}
      />
      <path className="econ-curve econ-supply" d={"M" + L + " " + f.sy(m.marginalCost) + "H" + R} />
      <Tag x={f.sx(qEnd) - 6} y={f.sy(A - Bs * qEnd) - 12} anchor="end" tone="blue">
        Demand
      </Tag>
      <Tag x={f.sx(A / (2 * Bs)) + 8} y={B - 10} tone="pink">
        MR
      </Tag>
      <Tag x={R - 4} y={f.sy(m.marginalCost) - 8} anchor="end" tone="gold">
        {"MC " + money(m.marginalCost)}
      </Tag>
      {probe !== undefined ? (
        <g className="econ-probe" data-quantity={probe}>
          <path d={"M" + f.sx(probe) + " " + T + "V" + B} />
          <circle
            cx={f.sx(probe)}
            cy={f.sy(clamp(A - Bs * probe, 0, f.maxY))}
            r="6"
            className="econ-probe-d"
          />
          <circle
            cx={f.sx(probe)}
            cy={f.sy(clamp(A - 2 * Bs * probe, 0, f.maxY))}
            r="6"
            className="econ-probe-mr"
          />
        </g>
      ) : null}
      {reveal ? (
        <g className="econ-reveal">
          <circle
            className="econ-point"
            cx={f.sx(a.quantity)}
            cy={f.sy(a.price)}
            r="7"
            filter={"url(#" + id + "-glow)"}
          />
          <Tag x={f.sx(a.quantity) + 10} y={f.sy(a.price) - 10} tone="gold">
            {"Monopoly " + money(a.price) + ", " + n(a.quantity)}
          </Tag>
          <circle
            className="econ-point econ-point-social"
            cx={f.sx(a.competitiveQuantity)}
            cy={f.sy(m.marginalCost)}
            r="6"
          />
        </g>
      ) : null}
    </Panel>
  );
}

function GameDrawing({
  m,
  id,
  label,
  reveal,
  fixed,
}: DrawProps & { m: Of<"game">; fixed?: { side: "row" | "column"; index: number } | undefined }) {
  const rows = m.rowStrategies.length,
    cols = m.columnStrategies.length;
  const left = 190,
    top = 92,
    cw = (W - left - 30) / cols,
    ch = (H - top - 26) / rows;
  const g = gameAnalysis(m);
  const isNash = (r: number, c: number) => g.nash.some(([a, b]) => a === r && b === c);
  return (
    <Panel id={id} label={label}>
      <Tag x={left + (cw * cols) / 2} y={30} anchor="middle" tone="gold">
        {m.columnPlayer}
      </Tag>
      <Tag x={24} y={top + (ch * rows) / 2} tone="blue">
        {m.rowPlayer}
      </Tag>
      {m.columnStrategies.map((s, c) => (
        <text
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed marks in an immutable authored model are identified by position.
          key={s + c}
          x={left + cw * c + cw / 2}
          y={top - 16}
          textAnchor="middle"
          className="econ-strategy"
        >
          {s}
        </text>
      ))}
      {m.rowStrategies.map((s, r) => (
        <text
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed marks in an immutable authored model are identified by position.
          key={s + r}
          x={left - 14}
          y={top + ch * r + ch / 2 + 5}
          textAnchor="end"
          className="econ-strategy"
        >
          {s}
        </text>
      ))}
      {m.payoffs.map((row, r) =>
        row.map(([pr, pc], c) => {
          const x = left + cw * c,
            y = top + ch * r;
          const lit =
            fixed &&
            ((fixed.side === "column" && fixed.index === c) ||
              (fixed.side === "row" && fixed.index === r));
          const dim = fixed && !lit;
          const nash = reveal && isNash(r, c);
          return (
            <g
              // biome-ignore lint/suspicious/noArrayIndexKey: Fixed marks in an immutable authored model are identified by position.
              key={r + "-" + c}
              className={
                "econ-cell" +
                (lit ? " econ-cell-lit" : "") +
                (dim ? " econ-cell-dim" : "") +
                (nash ? " econ-cell-nash" : "")
              }
              data-cell={r + "-" + c}
            >
              <rect x={x + 5} y={y + 5} width={cw - 10} height={ch - 10} rx="14" />
              {nash ? (
                <rect
                  x={x + 5}
                  y={y + 5}
                  width={cw - 10}
                  height={ch - 10}
                  rx="14"
                  className="econ-nash-ring"
                  filter={"url(#" + id + "-glow)"}
                />
              ) : null}
              <path
                d={"M" + (x + cw - 16) + " " + (y + 16) + "L" + (x + 16) + " " + (y + ch - 16)}
                className="econ-cell-split"
              />
              <text
                x={x + cw * 0.3}
                y={y + ch * 0.7}
                textAnchor="middle"
                className={
                  "econ-payoff econ-payoff-row" +
                  (fixed?.side === "column" && lit ? " econ-payoff-focus" : "")
                }
              >
                {n(Math.round(pr * 10) / 10)}
              </text>
              <text
                x={x + cw * 0.7}
                y={y + ch * 0.38}
                textAnchor="middle"
                className={
                  "econ-payoff econ-payoff-col" +
                  (fixed?.side === "row" && lit ? " econ-payoff-focus" : "")
                }
              >
                {n(Math.round(pc * 10) / 10)}
              </text>
            </g>
          );
        }),
      )}
      {reveal ? (
        <g className="econ-best-responses">
          {g.rowBest.flatMap((best, c) =>
            best.map((r) => (
              <path
                // biome-ignore lint/suspicious/noArrayIndexKey: Fixed marks in an immutable authored model are identified by position.
                key={"r" + r + c}
                className="econ-br econ-br-row"
                style={{ animationDelay: 120 * c + "ms" }}
                d={"M" + (left + cw * c + 22) + " " + (top + ch * r + ch - 30) + "l18 0"}
                markerEnd={"url(#" + id + "-arrow)"}
              />
            )),
          )}
          {g.columnBest.flatMap((best, r) =>
            best.map((c) => (
              <path
                // biome-ignore lint/suspicious/noArrayIndexKey: Fixed marks in an immutable authored model are identified by position.
                key={"c" + r + c}
                className="econ-br econ-br-col"
                style={{ animationDelay: 300 + 120 * r + "ms" }}
                d={"M" + (left + cw * c + cw - 30) + " " + (top + ch * r + 40) + "l0 -18"}
                markerEnd={"url(#" + id + "-arrow)"}
              />
            )),
          )}
        </g>
      ) : null}
    </Panel>
  );
}

function RepeatedDrawing({ m, id, label, reveal, probe = 0 }: DrawProps & { m: Of<"repeated"> }) {
  const play = repeatedPlay(m);
  const shown = Math.round(probe);
  const left = 40,
    slot = (W - left - 26) / m.rounds;
  const lanes = [162, 276];
  return (
    <Panel id={id} label={label}>
      <Tag x={W / 2} y={36} anchor="middle" tone="light">
        Round by round
      </Tag>
      {m.strategies.map((s, p) => (
        <g
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed marks in an immutable authored model are identified by position.
          key={p}
        >
          <text x={left} y={lanes[p]! - 36} className="econ-strategy">
            {(p ? "Beta: " : "Alpha: ") + repeatedStrategyNames[s]}
          </text>
          <path d={"M" + left + " " + lanes[p]! + "H" + (W - 22)} className="econ-lane" />
        </g>
      ))}
      {Array.from({ length: m.rounds }, (_, i) => {
        const x = left + slot * i + slot / 2;
        const h = play.history[i]!;
        const visible = i < shown;
        return (
          <g
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed marks in an immutable authored model are identified by position.
            key={i}
            className={"econ-round" + (visible ? " econ-round-on" : "")}
            data-round={i + 1}
          >
            <text x={x} y={84} textAnchor="middle" className="econ-tick">
              {"Round " + (i + 1)}
            </text>
            {h.moves.map((cooperated, p) => (
              <g
                // biome-ignore lint/suspicious/noArrayIndexKey: Fixed marks in an immutable authored model are identified by position.
                key={p}
              >
                <circle
                  cx={x}
                  cy={lanes[p]!}
                  r={Math.min(22, slot * 0.34)}
                  className={
                    visible ? (cooperated ? "econ-chip-c" : "econ-chip-d") : "econ-chip-empty"
                  }
                />
                {visible ? (
                  <text x={x} y={lanes[p]! + 5} textAnchor="middle" className="econ-chip-text">
                    {cooperated ? "C" : "D"}
                  </text>
                ) : null}
                {visible && reveal ? (
                  <text x={x} y={lanes[p]! + 44} textAnchor="middle" className="econ-tick">
                    {n(h.payoffs[p]!)}
                  </text>
                ) : null}
              </g>
            ))}
          </g>
        );
      })}
      <g className="econ-legend">
        <circle cx={left + 8} cy={H - 34} r="8" className="econ-chip-c" />
        <Tag x={left + 22} y={H - 29}>
          {"C = " + m.cooperate}
        </Tag>
        <circle cx={left + 250} cy={H - 34} r="8" className="econ-chip-d" />
        <Tag x={left + 264} y={H - 29}>
          {"D = " + m.defect}
        </Tag>
      </g>
      {reveal ? (
        <Tag x={W - 26} y={H - 29} anchor="end" tone="gold">
          {"Totals " + n(play.totals[0]) + " and " + n(play.totals[1])}
        </Tag>
      ) : null}
    </Panel>
  );
}

/* ---------- Shared scales ---------- */

function scales(models: EconomicsModel[]) {
  const markets = models.filter((m): m is EconomicsMarket => m.kind === "market");
  const elastic = models.filter((m): m is Of<"elasticity"> => m.kind === "elasticity");
  const ppfs = models.filter((m): m is Of<"ppf"> => m.kind === "ppf");
  const trades = models.filter((m): m is Of<"trade"> => m.kind === "trade");
  const costModels = models.filter((m): m is Of<"costs"> => m.kind === "costs");
  const monopolies = models.filter((m): m is Of<"monopoly"> => m.kind === "monopoly");
  const margins = models.filter((m): m is Of<"margin"> => m.kind === "margin");
  return {
    market: markets.length ? marketScale(markets) : { maxP: 1, maxQ: 1 },
    elasticity: {
      maxP: niceCeiling(Math.max(1, ...elastic.map((m) => Math.max(...m.prices) * 1.5))),
      maxQ: niceCeiling(
        Math.max(
          1,
          ...elastic.map(
            (m) => (m.demand.intercept - m.demand.slope * Math.min(...m.prices)) * 1.35,
          ),
        ),
      ),
    },
    ppf: {
      maxX: niceCeiling(
        Math.max(1, ...ppfs.flatMap((m) => [...m.points.map((p) => p.x), m.marker?.x ?? 0])) * 1.12,
      ),
      maxY: niceCeiling(
        Math.max(1, ...ppfs.flatMap((m) => [...m.points.map((p) => p.y), m.marker?.y ?? 0])) * 1.12,
      ),
    },
    trade: {
      maxX: niceCeiling(
        Math.max(1, ...trades.flatMap((m) => m.producers.map((p) => p.maxX))) * 1.15,
      ),
      maxY: niceCeiling(
        Math.max(
          1,
          ...trades.flatMap((m) => [
            ...m.producers.map((p) => p.maxY),
            ...(m.terms === undefined ? [] : m.producers.map((p) => p.maxX * m.terms! * 0.6)),
          ]),
        ) * 1.15,
      ),
    },
    costs: costModels.length ? costsScale(costModels) : { maxQ: 1, maxC: 1 },
    monopoly: {
      maxQ: niceCeiling(
        Math.max(1, ...monopolies.map((m) => (m.demandIntercept / m.demandSlope) * 1.05)),
      ),
      maxP: niceCeiling(Math.max(1, ...monopolies.map((m) => m.demandIntercept * 1.1))),
    },
    margin: niceCeiling(Math.max(1, ...margins.flatMap((m) => [...m.benefits, ...m.costs])) * 1.15),
  };
}

/* ---------- Public components ---------- */

export function EconomicsDrawing({
  model,
  models = [model],
  reveal = false,
  probe,
  onProbe,
  fixed,
}: {
  model: EconomicsModel;
  models?: EconomicsModel[];
  reveal?: boolean;
  probe?: number | undefined;
  onProbe?: ((value: number) => void) | undefined;
  fixed?: { side: "row" | "column"; index: number } | undefined;
}) {
  const id = "econ" + useId().replaceAll(":", "");
  const s = scales(models);
  const label = economicsGivenList(model).join(". ");
  const common = { id, label, reveal, probe, onProbe };
  switch (model.kind) {
    case "market":
      return <MarketDrawing {...common} m={model} scale={s.market} />;
    case "elasticity":
      return <ElasticityDrawing {...common} m={model} scale={s.elasticity} />;
    case "ppf":
      return <PpfDrawing {...common} m={model} scale={s.ppf} />;
    case "trade":
      return <TradeDrawing {...common} m={model} scale={s.trade} />;
    case "margin":
      return <MarginDrawing {...common} m={model} scaleMax={s.margin} />;
    case "costs":
      return <CostsDrawing {...common} m={model} scale={s.costs} />;
    case "monopoly":
      return <MonopolyDrawing {...common} m={model} scale={s.monopoly} />;
    case "game":
      return <GameDrawing {...common} m={model} fixed={fixed} />;
    case "repeated":
      return <RepeatedDrawing {...common} m={model} />;
  }
}

export function EconomicsGivenVisual({ model }: { model: EconomicsModel }) {
  return (
    <div className="economics-check">
      <EconomicsDrawing model={model} />
      <ul className="econ-givens">
        {economicsGivenList(model).map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </div>
  );
}

interface ProbeSpec {
  label: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  format: (v: number) => string;
  play?: boolean;
}
function probeSpec(m: EconomicsModel, models: EconomicsModel[]): ProbeSpec | undefined {
  const s = scales(models);
  switch (m.kind) {
    case "market": {
      if (m.view === "tax" && m.tax !== undefined) {
        const top = niceCeiling(
          Math.max(
            1,
            ...models.map((x) => (x.kind === "market" && x.tax !== undefined ? x.tax * 2 : 0)),
          ),
        );
        return {
          label: "Tax per unit",
          min: 0,
          max: top,
          step: top > 40 ? 1 : 0.5,
          initial: m.tax,
          format: money,
        };
      }
      if (m.view !== "equilibrium" || m.marker !== undefined) return undefined;
      const step = priceStep(s.market.maxP);
      return {
        label: "Try a price",
        min: 0,
        max: s.market.maxP,
        step,
        initial: Math.round((s.market.maxP * 0.82) / step) * step,
        format: money,
      };
    }
    case "elasticity":
      return {
        label: "Move from price A to price B",
        min: 0,
        max: 1,
        step: 0.01,
        initial: 0,
        format: (v) => n(Math.round(v * 100)) + "%",
        play: true,
      };
    case "ppf": {
      const maxX = m.points.at(-1)!.x;
      return {
        label: "Move along the frontier: " + m.goodX.toLowerCase(),
        min: 0,
        max: maxX,
        step: maxX / 40,
        initial: m.points[1]!.x / 2,
        format: (v) => n(v),
      };
    }
    case "trade":
      return {
        label: "Share of each day spent on " + m.goodX.toLowerCase(),
        min: 0,
        max: 1,
        step: 0.05,
        initial: 0.5,
        format: (v) => n(Math.round(v * 100)) + "%",
      };
    case "margin":
      return {
        label: "Units chosen",
        min: 0,
        max: m.benefits.length,
        step: 1,
        initial: 0,
        format: (v) => n(v),
      };
    case "costs":
      return {
        label: "Output, q",
        min: 0,
        max: s.costs.maxQ,
        step: s.costs.maxQ / 60,
        initial: s.costs.maxQ / 6,
        format: (v) => n(v),
      };
    case "monopoly":
      return {
        label: "Quantity offered",
        min: 0,
        max: s.monopoly.maxQ,
        step: s.monopoly.maxQ / 100,
        initial: s.monopoly.maxQ / 4,
        format: (v) => n(v),
      };
    case "repeated":
      return {
        label: "Rounds played",
        min: 0,
        max: m.rounds,
        step: 1,
        initial: 0,
        format: (v) => n(v) + " of " + m.rounds,
        play: true,
      };
    case "game":
      return undefined;
  }
}

export function EconomicsDiagram({
  spec,
  showResults = false,
}: {
  spec: Spec;
  showResults?: boolean;
}) {
  const { reduced } = useExperience();
  const [selected, setSelected] = useState(spec.initialCaseId);
  const current = spec.cases.find((c) => c.id === selected) ?? spec.cases[0]!;
  const models = spec.cases.map((c) => c.model);
  const probeInfo = probeSpec(current.model, models);
  const [probe, setProbe] = useState<number | undefined>(probeInfo?.initial);
  const [playing, setPlaying] = useState(false);
  const [fixed, setFixed] = useState<{ side: "row" | "column"; index: number } | undefined>();
  const shown = useTweenedModel(current.model, reduced);
  const controlId = useId();
  const from = useRef(0);

  useEffect(() => {
    if (!playing || reduced || !probeInfo) {
      if (reduced && playing) setPlaying(false);
      return;
    }
    let frameId = 0,
      start: number | undefined;
    const span = probeInfo.max - probeInfo.min;
    const duration = current.model.kind === "repeated" ? current.model.rounds * 650 : 2200;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, from.current + (now - start) / duration);
      const raw = probeInfo.min + span * t;
      setProbe(current.model.kind === "repeated" ? Math.floor(raw + 1e-9) : raw);
      if (t < 1) frameId = requestAnimationFrame(step);
      else setPlaying(false);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
    // probeInfo is derived from the selected case, which `selected` already tracks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, reduced, selected]);

  function select(id: string) {
    const next = spec.cases.find((c) => c.id === id) ?? spec.cases[0]!;
    setPlaying(false);
    setSelected(id);
    setFixed(undefined);
    const info = probeSpec(next.model, models);
    // Keep a learner's probe across comparable cases so the comparison is like for like.
    const comparable =
      current.model.kind === next.model.kind &&
      probe !== undefined &&
      !info?.play &&
      !(next.model.kind === "market" && next.model.view === "tax") &&
      ["market", "costs", "monopoly", "ppf"].includes(next.model.kind);
    if (!comparable) setProbe(info?.initial);
  }
  const value = probe ?? probeInfo?.initial ?? 0;
  const atEnd = probeInfo ? value >= probeInfo.max - 1e-9 : false;
  const game = current.model.kind === "game" ? current.model : undefined;
  const taxProbe =
    current.model.kind === "market" && current.model.view === "tax" && probeInfo !== undefined;

  return (
    <div
      className={"learning-diagram economics-diagram econ-kind-" + current.model.kind}
      data-case={current.id}
    >
      <div className="econ-cases" role="group" aria-label="Compare economic cases">
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
      <figure className="econ-stage">
        <EconomicsDrawing
          model={taxProbe && shown.kind === "market" ? { ...shown, tax: value } : shown}
          models={models}
          reveal={showResults}
          probe={probeInfo && !taxProbe ? value : undefined}
          onProbe={
            (current.model.kind === "market" && !taxProbe) ||
            current.model.kind === "monopoly" ||
            current.model.kind === "costs"
              ? (v) => {
                  setPlaying(false);
                  setProbe(v);
                }
              : undefined
          }
          fixed={fixed}
        />
      </figure>
      {game ? (
        <div className="econ-fix" role="group" aria-label="Fix one player's choice">
          {game.columnStrategies.map((s, i) => (
            <button
              type="button"
              // biome-ignore lint/suspicious/noArrayIndexKey: Fixed marks in an immutable authored model are identified by position.
              key={"c" + i}
              aria-pressed={fixed?.side === "column" && fixed.index === i}
              onClick={() =>
                setFixed(
                  fixed?.side === "column" && fixed.index === i
                    ? undefined
                    : { side: "column", index: i },
                )
              }
            >
              {game.columnPlayer + " plays " + s}
            </button>
          ))}
          {game.rowStrategies.map((s, i) => (
            <button
              type="button"
              // biome-ignore lint/suspicious/noArrayIndexKey: Fixed marks in an immutable authored model are identified by position.
              key={"r" + i}
              aria-pressed={fixed?.side === "row" && fixed.index === i}
              onClick={() =>
                setFixed(
                  fixed?.side === "row" && fixed.index === i
                    ? undefined
                    : { side: "row", index: i },
                )
              }
            >
              {game.rowPlayer + " plays " + s}
            </button>
          ))}
        </div>
      ) : null}
      {probeInfo ? (
        <div className="econ-playback">
          {probeInfo.play ? (
            <div className="econ-controls">
              {!reduced ? (
                <button
                  type="button"
                  onClick={() => {
                    const span = probeInfo.max - probeInfo.min;
                    from.current = atEnd ? 0 : (value - probeInfo.min) / span;
                    if (atEnd) setProbe(probeInfo.min);
                    setPlaying(!playing);
                  }}
                >
                  {playing ? (
                    <Pause aria-hidden="true" size={16} />
                  ) : (
                    <Play aria-hidden="true" size={16} />
                  )}
                  {playing ? "Pause" : atEnd ? "Replay" : "Play"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  const stepSize =
                    current.model.kind === "repeated" ? 1 : (probeInfo.max - probeInfo.min) / 4;
                  setProbe(Math.min(probeInfo.max, value + stepSize));
                }}
              >
                <SkipForward aria-hidden="true" size={16} />
                {current.model.kind === "repeated" ? "Next round" : "Step"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setProbe(probeInfo.initial);
                }}
              >
                <RotateCcw aria-hidden="true" size={16} />
                Reset
              </button>
            </div>
          ) : null}
          <label htmlFor={controlId} className="econ-slider">
            <span>
              {probeInfo.label} <output>{probeInfo.format(value)}</output>
            </span>
            <input
              id={controlId}
              type="range"
              min={probeInfo.min}
              max={probeInfo.max}
              step={probeInfo.step}
              value={value}
              aria-label={probeInfo.label}
              aria-valuetext={probeInfo.format(value)}
              onChange={(e) => {
                setPlaying(false);
                setProbe(Number(e.currentTarget.value));
              }}
            />
          </label>
        </div>
      ) : null}
      <details className="econ-description">
        <summary>Read given values</summary>
        <ul className="econ-givens">
          {economicsGivenList(current.model).map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      </details>
      {showResults ? (
        <dl className="econ-measures" aria-label="Worked results for this case">
          {economicsMeasures(current.model).map((m) => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
