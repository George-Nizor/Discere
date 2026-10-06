import type { GeometryDiagram as Spec, GeometryShape } from "@discere/contracts";
import {
  geometryDescription,
  geometryMeasures,
  geometryVertices,
  geometryUnitScale,
} from "@discere/activity-engine";
import { Layers3, RotateCcw } from "lucide-react";
import { useId, useState } from "react";
const fmt = (v: number) => Number(v.toFixed(2)).toString();
const polar = (angle: number, r: number) => ({
  x: 280 + r * Math.cos((angle * Math.PI) / 180),
  y: 195 - r * Math.sin((angle * Math.PI) / 180),
});
const arc = (start: number, end: number, r: number) => {
  const a = polar(start, r),
    b = polar(end, r);
  return (
    "M" +
    a.x +
    " " +
    a.y +
    " A" +
    r +
    " " +
    r +
    " 0 " +
    (end - start > 180 ? 1 : 0) +
    " 0 " +
    b.x +
    " " +
    b.y
  );
};
function Label({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="geo-label">
      {children}
    </text>
  );
}
function Polygon({
  shape,
  guides,
  unitScale,
}: {
  shape: GeometryShape;
  guides: boolean;
  unitScale?: number | undefined;
}) {
  const points = geometryVertices(shape);
  const minX = Math.min(...points.map((p) => p.x)),
    maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y)),
    maxY = Math.max(...points.map((p) => p.y));
  const scale = unitScale ?? Math.min(365 / (maxX - minX), 185 / (maxY - minY));
  const x = (v: number) => 280 + (v - (minX + maxX) / 2) * scale,
    y = (v: number) => 158 - (v - (minY + maxY) / 2) * scale;
  const path = points.map((p) => x(p.x) + "," + y(p.y)).join(" ");
  const left = x(minX),
    right = x(maxX),
    bottom = y(minY),
    top = y(maxY);
  let labels: React.ReactNode = null;
  if (shape.kind === "triangle_angles") {
    const last = points[2]!;
    labels = (
      <>
        <Label x={x(0) - 12} y={y(0) + 26}>
          {shape.a}°
        </Label>
        <Label x={x(1) + 12} y={y(0) + 26}>
          {shape.b}°
        </Label>
        <Label x={x(last.x)} y={y(last.y) - 24}>
          ?
        </Label>
      </>
    );
  } else if (shape.kind === "distance") {
    labels = (
      <>
        <Label x={x(shape.x1)} y={y(shape.y1) + (shape.y1 < shape.y2 ? 26 : -26)}>
          A ({shape.x1}, {shape.y1})
        </Label>
        <Label x={x(shape.x2)} y={y(shape.y2) + (shape.y1 < shape.y2 ? -26 : 26)}>
          B ({shape.x2}, {shape.y2})
        </Label>
      </>
    );
  } else if (shape.kind === "right_triangle") {
    labels = (
      <>
        <Label x={(left + right) / 2} y={bottom + 27}>
          {shape.a}
        </Label>
        <Label x={left - 29} y={(top + bottom) / 2}>
          {shape.b}
        </Label>
        <Label x={(left + right) / 2 + 22} y={(top + bottom) / 2 - 18}>
          ?
        </Label>
        <path d={"M" + left + " " + (bottom - 16) + " h16 v16"} className="geo-guide" />
      </>
    );
  } else if (shape.kind === "rectangle" || shape.kind === "composite") {
    labels = (
      <>
        <Label x={(left + right) / 2} y={bottom + 27}>
          {shape.width}
        </Label>
        <Label x={left - 28} y={(top + bottom) / 2}>
          {shape.height}
        </Label>
        {shape.kind === "composite" ? (
          <>
            <path
              d={
                "M" +
                x(shape.width - shape.cutWidth) +
                " " +
                top +
                " H" +
                right +
                " V" +
                y(shape.height - shape.cutHeight)
              }
              className="geo-cut"
            />
            <Label x={x(shape.width - shape.cutWidth / 2)} y={top - 22}>
              {shape.cutWidth}
            </Label>
            <Label x={right + 26} y={y(shape.height - shape.cutHeight / 2)}>
              {shape.cutHeight}
            </Label>
          </>
        ) : null}
      </>
    );
  } else if (
    shape.kind === "triangle" ||
    shape.kind === "parallelogram" ||
    shape.kind === "trapezoid"
  ) {
    const base = shape.kind === "trapezoid" ? shape.bottom : shape.base;
    const offset =
      shape.kind === "trapezoid" ? (shape.bottom - shape.top) / 2 : shape.offset * base;
    labels = (
      <>
        <Label x={x(base / 2)} y={bottom + 27}>
          {base}
        </Label>
        <path d={"M" + x(offset) + " " + top + " V" + bottom} className="geo-guide" />
        <path d={"M" + x(offset) + " " + (bottom - 12) + " h12 v12"} className="geo-guide" />
        <Label x={x(offset) - 26} y={(top + bottom) / 2}>
          {shape.height}
        </Label>
        {shape.kind === "trapezoid" ? (
          <Label x={x(offset + shape.top / 2)} y={top - 22}>
            {shape.top}
          </Label>
        ) : null}
      </>
    );
  }
  return (
    <g>
      {shape.kind === "distance" ? (
        <g className="geo-coordinate-grid">
          {Array.from(
            { length: Math.ceil(maxX) - Math.floor(minX) + 1 },
            (_, i) => Math.floor(minX) + i,
          ).map((n) => (
            <line key={"x" + n} x1={x(n)} x2={x(n)} y1={top - 10} y2={bottom + 10} />
          ))}
          {Array.from(
            { length: Math.ceil(maxY) - Math.floor(minY) + 1 },
            (_, i) => Math.floor(minY) + i,
          ).map((n) => (
            <line key={"y" + n} y1={y(n)} y2={y(n)} x1={left - 10} x2={right + 10} />
          ))}
        </g>
      ) : null}
      {guides && shape.kind === "rectangle" ? (
        <g className="geo-unit-grid">
          {Array.from({ length: Math.ceil(shape.width) - 1 }, (_, i) => i + 1).map((n) => (
            <line key={"v" + n} x1={x(n)} y1={top} x2={x(n)} y2={bottom} />
          ))}
          {Array.from({ length: Math.ceil(shape.height) - 1 }, (_, i) => i + 1).map((n) => (
            <line key={"h" + n} x1={left} y1={y(n)} x2={right} y2={y(n)} />
          ))}
        </g>
      ) : null}
      {shape.kind === "distance" ? (
        <>
          <path
            d={
              "M" +
              x(shape.x1) +
              " " +
              y(shape.y1) +
              " L" +
              x(shape.x2) +
              " " +
              y(shape.y1) +
              " L" +
              x(shape.x2) +
              " " +
              y(shape.y2)
            }
            className="geo-guide"
          />
          <path
            d={"M" + x(shape.x1) + " " + y(shape.y1) + " L" + x(shape.x2) + " " + y(shape.y2)}
            className="geo-outline"
          />
          {[points[0]!, points[2]!].map((p) => (
            <circle key={p.x + ":" + p.y} cx={x(p.x)} cy={y(p.y)} r="5" fill="var(--accent)" />
          ))}
        </>
      ) : (
        <polygon points={path} className="geo-shape" />
      )}
      {guides && shape.kind === "triangle" ? (
        <path d={"M" + left + " " + top + " H" + right + " V" + bottom} className="geo-cut" />
      ) : null}
      {labels}
    </g>
  );
}
function Prism({
  shape,
  net,
  unitScale,
}: {
  shape: Extract<GeometryShape, { kind: "prism" }>;
  net: boolean;
  unitScale?: number | undefined;
}) {
  const { length: l, width: w, height: h } = shape;
  if (net) {
    const scale = Math.min(410 / (2 * l + 2 * w), 225 / (h + 2 * w));
    const ox = (560 - (2 * l + 2 * w) * scale) / 2,
      oy = (310 - (h + 2 * w) * scale) / 2;
    const faces = [
      { id: "left", x: 0, y: w, w: w, h },
      { id: "front", x: w, y: w, w: l, h },
      { id: "right", x: w + l, y: w, w, h },
      { id: "back", x: 2 * w + l, y: w, w: l, h },
      { id: "top", x: w, y: 0, w: l, h: w },
      { id: "base", x: w, y: w + h, w: l, h: w },
    ];
    return (
      <g>
        {faces.map((f) => (
          <g key={f.id}>
            <rect
              x={ox + f.x * scale}
              y={oy + f.y * scale}
              width={f.w * scale}
              height={f.h * scale}
              className={"geo-net-face geo-face-" + f.id}
            />
            <Label x={ox + (f.x + f.w / 2) * scale} y={oy + (f.y + f.h / 2) * scale}>
              {fmt(f.w)} × {fmt(f.h)}
            </Label>
          </g>
        ))}
      </g>
    );
  }
  const scale = unitScale ?? Math.min(290 / (l + w * 0.65), 195 / (h + w * 0.42));
  const dx = w * scale * 0.65,
    dy = w * scale * 0.42,
    ww = l * scale,
    hh = h * scale;
  const ox = (560 - ww - dx) / 2,
    oy = (300 - hh - dy) / 2 + dy;
  return (
    <g>
      <path
        d={"M" + ox + " " + oy + " l" + dx + " " + -dy + " h" + ww + " l" + -dx + " " + dy + " Z"}
        className="geo-prism-top"
      />
      <path
        d={
          "M" +
          (ox + ww) +
          " " +
          oy +
          " l" +
          dx +
          " " +
          -dy +
          " v" +
          hh +
          " l" +
          -dx +
          " " +
          dy +
          " Z"
        }
        className="geo-prism-side"
      />
      <rect x={ox} y={oy} width={ww} height={hh} className="geo-shape" />
      <Label x={ox + ww / 2} y={oy + hh + 27}>
        {l}
      </Label>
      <Label x={ox - 28} y={oy + hh / 2}>
        {h}
      </Label>
      <Label x={ox + ww + dx / 2 + 25} y={oy + hh - dy / 2}>
        {w}
      </Label>
    </g>
  );
}
/** Also used by course checks with fixed givens and no controls or worked measurements. */
export function GeometryDrawing({
  shape,
  guides = false,
  net = false,
  unitScale,
}: {
  shape: GeometryShape;
  guides?: boolean;
  net?: boolean;
  unitScale?: number | undefined;
}) {
  const id = useId();
  let content: React.ReactNode;
  if (shape.kind === "angle") {
    const end = polar(shape.degrees, 115),
      limit = polar(shape.total, 125),
      first = polar(shape.degrees / 2, 75),
      unknown = polar((shape.degrees + shape.total) / 2, 78);
    content = (
      <>
        <path d={arc(0, Math.min(shape.total, 359.999), 115)} className="geo-cut" />
        <path d={arc(0, shape.degrees, 115)} className="geo-outline" />
        <path d={"M405 195 H280 L" + end.x + " " + end.y} className="geo-outline" />
        {shape.total !== 360 ? (
          <path d={"M280 195 L" + limit.x + " " + limit.y} className="geo-guide" />
        ) : null}
        <circle cx="280" cy="195" r="5" fill="var(--accent)" />
        <Label x={first.x} y={first.y}>
          {shape.degrees}°
        </Label>
        <Label x={unknown.x} y={unknown.y}>
          ?
        </Label>
        <text x="280" y="294" textAnchor="middle" className="geo-secondary">
          {shape.total}° total
        </text>
      </>
    );
  } else if (shape.kind === "circle") {
    const r = unitScale === undefined ? 106 : shape.radius * unitScale;
    content = (
      <>
        <circle cx="280" cy="154" r={r} className="geo-shape" />
        <line x1="280" y1="154" x2={280 + r} y2="154" className="geo-outline" />
        <circle cx="280" cy="154" r="4" fill="var(--accent)" />
        <Label x={280 + r / 2} y={130}>
          r = {shape.radius}
        </Label>
        {guides ? <line x1={280 - r} y1="154" x2="280" y2="154" className="geo-guide" /> : null}
      </>
    );
  } else if (shape.kind === "similarity") {
    const k = shape.factor,
      scale = Math.min(390 / (shape.width * (1 + k)), 180 / (shape.height * Math.max(1, k)));
    const sw = shape.width * scale,
      sh = shape.height * scale,
      ox = (560 - (sw * (1 + k) + 55)) / 2;
    content = (
      <>
        <rect x={ox} y={170 - sh / 2} width={sw} height={sh} className="geo-shape" />
        <Label x={ox + sw / 2} y={196 + sh / 2}>
          {shape.width}
        </Label>
        <Label x={ox - 23} y={170}>
          {shape.height}
        </Label>
        <rect
          x={ox + sw + 55}
          y={170 - (sh * k) / 2}
          width={sw * k}
          height={sh * k}
          className="geo-scaled-shape"
        />
        <Label x={ox + sw + 55 + (sw * k) / 2} y={170 - (sh * k) / 2 - 24}>
          × {k}
        </Label>
      </>
    );
  } else if (shape.kind === "prism")
    content = <Prism shape={shape} net={net} unitScale={unitScale} />;
  else content = <Polygon shape={shape} guides={guides} unitScale={unitScale} />;
  return (
    <svg viewBox="0 0 560 320" role="img" aria-labelledby={id} className="geometry-drawing">
      <title id={id}>
        {geometryDescription(shape)}
        {net ? " Shown as a six-face net." : ""}
      </title>
      {content}
    </svg>
  );
}
export function GeometryDiagram({
  spec,
  showResults = false,
}: {
  spec: Spec;
  showResults?: boolean;
}) {
  const [selected, setSelected] = useState(spec.initialCaseId),
    [guides, setGuides] = useState(false),
    [net, setNet] = useState(false);
  const current = spec.cases.find((c) => c.id === selected) ?? spec.cases[0]!;
  const canGuide = ["rectangle", "triangle", "circle"].includes(current.shape.kind);
  return (
    <div className="learning-diagram geometry-diagram">
      <div className="geo-case-controls" aria-label="Compare shapes">
        {spec.cases.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={current.id === c.id}
            onClick={() => {
              setSelected(c.id);
              setGuides(false);
              setNet(false);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="geo-scene" key={current.id}>
        <GeometryDrawing
          shape={current.shape}
          guides={guides}
          net={net}
          unitScale={geometryUnitScale(spec.cases.map((c) => c.shape))}
        />
      </div>
      <div className="geo-tools">
        {canGuide ? (
          <button type="button" aria-pressed={guides} onClick={() => setGuides(!guides)}>
            <Layers3 size={16} aria-hidden="true" />
            {current.shape.kind === "circle"
              ? "Show diameter"
              : current.shape.kind === "rectangle"
                ? "Show unit squares"
                : "Show enclosing rectangle"}
          </button>
        ) : null}
        {current.shape.kind === "prism" ? (
          <button type="button" aria-pressed={net} onClick={() => setNet(!net)}>
            <Layers3 size={16} aria-hidden="true" />
            {net ? "Fold box" : "Unfold box"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setSelected(spec.initialCaseId);
            setGuides(false);
            setNet(false);
          }}
          aria-label="Restore original shape"
        >
          <RotateCcw size={15} aria-hidden="true" />
          Reset
        </button>
      </div>
      {showResults ? (
        <dl className="geo-measures" aria-label="Worked measurements">
          {geometryMeasures(current.shape).map((m) => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <details className="geo-description">
        <summary>Read dimensions</summary>
        <p>
          {geometryDescription(current.shape)} All lengths use the same unit. Areas use square
          units; volumes use cubic units.
        </p>
      </details>
    </div>
  );
}
