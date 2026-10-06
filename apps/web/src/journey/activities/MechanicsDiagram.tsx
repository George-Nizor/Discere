import type { MechanicsDiagram as Spec, MechanicsModel } from "@discere/contracts";
import {
  mechanicsBounds,
  mechanicsDuration,
  mechanicsFrame,
  mechanicsGivens,
  mechanicsMeasures,
  mechanicsNumber as n,
  mechanicsTimed,
} from "@discere/activity-engine";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useExperience } from "../../study/experience.js";

function Text({
  x,
  y,
  children,
  small = false,
  scale = false,
}: {
  x: number;
  y: number;
  children: ReactNode;
  small?: boolean;
  /** A clock or position reading that tracks the control, not a computed quantity. */
  scale?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      className={small ? "mech-small" : "mech-label"}
      data-scale={scale ? "" : undefined}
    >
      {children}
    </text>
  );
}
function Cart({
  x,
  y,
  label,
  secondary = false,
}: {
  x: number;
  y: number;
  label?: string | undefined;
  secondary?: boolean;
}) {
  return (
    <g
      transform={"translate(" + x + " " + y + ")"}
      className={secondary ? "mech-cart mech-cart-b" : "mech-cart"}
    >
      <rect x="-29" y="-18" width="58" height="35" rx="9" />
      <path d="M-21 -11H12L22 -2" className="mech-highlight" />
      <circle cx="-17" cy="21" r="7" />
      <circle cx="17" cy="21" r="7" />
      {label ? (
        <Text x={0} y={-32}>
          {label}
        </Text>
      ) : null}
    </g>
  );
}
function Arrow({
  x,
  y,
  dx = 0,
  dy = 0,
  marker,
  label,
  lx,
  ly,
  secondary = false,
}: {
  x: number;
  y: number;
  dx?: number;
  dy?: number;
  marker: string;
  label?: string;
  lx?: number;
  ly?: number;
  secondary?: boolean;
}) {
  if (dx === 0 && dy === 0) return null;
  return (
    <g className={secondary ? "mech-arrow mech-arrow-b" : "mech-arrow"}>
      <path d={"M" + x + " " + y + "l" + dx + " " + dy} markerEnd={"url(#" + marker + ")"} />
      {label ? (
        <Text x={lx ?? x + dx / 2} y={ly ?? y - 16}>
          {label}
        </Text>
      ) : null}
    </g>
  );
}
export function MechanicsDrawing({
  model: m,
  fraction = 0,
  models = [m],
  reveal = false,
}: {
  model: MechanicsModel;
  fraction?: number;
  models?: MechanicsModel[];
  reveal?: boolean;
}) {
  const id = useId().replaceAll(":", ""),
    f = mechanicsFrame(m, fraction);
  const [low, high] = mechanicsBounds(models);
  const sx = (x: number) => 65 + (470 * (x - low)) / (high - low);
  const arrow = id + "-arrow";
  let drawing: ReactNode;
  const ticks = Array.from({ length: 5 }, (_, i) => low + (i * (high - low)) / 4);
  const track = (y = 252) => (
    <g className="mech-track">
      <path d={"M55 " + y + "H550"} />
      {ticks.map((x) => (
        <g key={x} data-scale="">
          <path d={"M" + sx(x) + " " + y + "v7"} />
          <Text x={sx(x)} y={y + 32} small>
            {n(Math.round(x * 10) / 10)}
          </Text>
        </g>
      ))}
      <Text x={300} y={y + 64} small>
        Position (m) · right is positive
      </Text>
    </g>
  );
  const graph =
    (m.kind === "journey" && m.display === "position_graph") ||
    m.kind === "velocity_change" ||
    (m.kind === "motion" && m.display === "velocity_graph");
  if (graph) {
    const duration = mechanicsDuration(m),
      positionGraph = m.kind === "journey";
    const samples = (model: MechanicsModel) =>
      Array.from({ length: 41 }, (_, i) => {
        const frame = mechanicsFrame(model, i / 40);
        return {
          t: frame.time,
          y: positionGraph ? (frame.bodies[0]?.x ?? 0) : (frame.bodies[0]?.velocity ?? 0),
        };
      });
    const all = models.flatMap(samples),
      ys = all.map((p) => p.y);
    const yMin = Math.min(0, ...ys),
      yMax = Math.max(1, ...ys),
      pad = Math.max(0.5, (yMax - yMin) * 0.12);
    const bottom = yMin - pad,
      top = yMax + pad,
      maxT = Math.max(...models.map(mechanicsDuration));
    const gx = (t: number) => 70 + (t / maxT) * 460,
      gy = (y: number) => 250 - ((y - bottom) / (top - bottom)) * 190;
    const points =
      m.kind === "journey" ? m.points.map((point) => ({ t: point.t, y: point.x })) : samples(m);
    drawing = (
      <>
        {Array.from({ length: 5 }, (_, i) => {
          const value = bottom + ((top - bottom) * i) / 4;
          return (
            <g key={value} data-scale="">
              <path d={"M70 " + gy(value) + "H530"} className="mech-grid" />
              <Text x={37} y={gy(value) + 5} small>
                {n(Math.round(value * 10) / 10)}
              </Text>
              <Text x={gx((maxT * i) / 4)} y={278} small>
                {n((maxT * i) / 4)}
              </Text>
            </g>
          );
        })}
        <path d="M70 45V250H545" className="mech-axis" />
        <path d={"M70 " + gy(0) + "H530"} className="mech-zero" />
        <path
          d={points.map((p, i) => (i ? "L" : "M") + gx(p.t) + " " + gy(p.y)).join(" ")}
          className="mech-graph-line"
        />
        {m.kind === "journey"
          ? m.points.map((p) => (
              <circle key={p.t} cx={gx(p.t)} cy={gy(p.x)} r="4" className="mech-observation" />
            ))
          : null}
        <circle
          cx={gx(f.time)}
          cy={gy(positionGraph ? f.bodies[0]!.x : f.bodies[0]!.velocity)}
          r="8"
          className="mech-current"
        />
        <Text x={300} y={25}>
          {positionGraph ? "Position (m)" : "Velocity (m/s)"}
        </Text>
        <Text x={300} y={317} small>
          Time (s)
        </Text>
        <Text x={515} y={345} small scale>
          {n(fraction * duration)} s
        </Text>
      </>
    );
  } else if (m.kind === "support") {
    const weight = m.mass * m.gravity,
      support = m.mass * (m.gravity + m.acceleration),
      scale =
        100 /
        Math.max(
          1,
          ...models.flatMap((other) =>
            other.kind === "support"
              ? [other.mass * other.gravity, other.mass * (other.gravity + other.acceleration)]
              : [],
          ),
        );
    drawing = (
      <>
        <path d="M180 193H420" className="mech-floor" />
        <Cart x={300} y={164} label={m.mass + " kg"} />
        <Arrow
          x={375}
          y={164}
          dy={-support * scale}
          marker={arrow}
          label={reveal ? n(support) + " N" : "Support ?"}
          lx={467}
          ly={100}
        />
        <Arrow
          x={225}
          y={164}
          dy={weight * scale}
          marker={arrow}
          label={reveal ? n(weight) + " N" : "Weight ?"}
          lx={129}
          ly={225}
          secondary
        />
        <Text x={300} y={309} small>
          {"g = " + m.gravity + " m/s² · a = " + m.acceleration + " m/s² upward"}
        </Text>
      </>
    );
  } else if (m.kind === "forces" || m.kind === "friction") {
    const left = m.kind === "forces" ? m.left : f.friction,
      right = m.kind === "forces" ? m.right : m.applied;
    const forceMax = Math.max(
      1,
      ...models.flatMap((other) =>
        other.kind === "forces"
          ? [other.left, other.right]
          : other.kind === "friction"
            ? [other.applied, other.muStatic * other.mass * other.gravity]
            : [],
      ),
    );
    const scale = 160 / forceMax;
    drawing = (
      <>
        <Cart x={300} y={139} label={m.mass + " kg"} />
        <Arrow
          x={262}
          y={146}
          dx={-left * scale}
          marker={arrow}
          secondary
          label={m.kind === "friction" && !reveal ? "Friction ?" : n(left) + " N"}
          ly={126}
        />
        <Arrow x={338} y={177} dx={right * scale} marker={arrow} label={n(right) + " N"} ly={211} />
        {track(268)}
        <circle cx={sx(f.bodies[0]!.x)} cy="261" r="8" className="mech-current" />
        <Text x={300} y={43} small>
          {"Initial velocity " + m.v0 + " m/s · " + m.duration + " s"}
        </Text>
      </>
    );
  } else if (m.kind === "work") {
    const x = sx(m.distance * fraction),
      start = sx(0),
      end = sx(m.distance),
      length =
        (85 * m.force) / Math.max(1, ...models.map((v) => (v.kind === "work" ? v.force : 0))),
      dx = m.alignment === "perpendicular" ? 0 : m.alignment === "with" ? length : -length;
    drawing = (
      <>
        <path d="M75 210H535" className="mech-floor" />
        <Cart x={x} y={180} />
        <Arrow
          x={x}
          y={132}
          dx={dx}
          dy={m.alignment === "perpendicular" ? -length : 0}
          marker={arrow}
          label={m.force + " N"}
          ly={45}
          lx={300}
        />
        <path
          d={"M" + start + " 254H" + end + "M" + start + " 246V262M" + end + " 246V262"}
          className="mech-axis"
        />
        <Text x={(start + end) / 2} y={290}>
          {m.distance + " m right"}
        </Text>
      </>
    );
  } else if (m.kind === "kinetic" || m.kind === "energy_drop") {
    const values = [
      { label: "Motion", value: f.kinetic, color: "#7adf9f" },
      { label: "Height", value: f.potential, color: "#7cb6f5" },
      { label: "Heating", value: f.thermal, color: "#e9b75e" },
    ];
    const max = Math.max(
      1,
      ...models.map((v) => {
        const a = mechanicsFrame(v, 0),
          b = mechanicsFrame(v, 1);
        return Math.max(a.kinetic + a.potential + a.thermal, b.kinetic + b.potential + b.thermal);
      }),
    );
    drawing = (
      <>
        {values.map((v, i) => (
          <g key={v.label}>
            <rect
              x={106 + 155 * i}
              y="55"
              width="65"
              height="195"
              rx="8"
              className="mech-bar-track"
            />
            <rect
              x={106 + 155 * i}
              y={250 - (195 * v.value) / max}
              width="65"
              height={(195 * v.value) / max}
              rx="6"
              fill={v.color}
              className="mech-energy-bar"
              data-energy={v.label}
            />
            <Text x={138 + 155 * i} y={285} small>
              {v.label}
            </Text>
            {reveal ? (
              <Text x={138 + 155 * i} y={33} small>
                {n(v.value) + " J"}
              </Text>
            ) : null}
          </g>
        ))}
        <Text x={300} y={329} small>
          {m.kind === "kinetic"
            ? m.mass + " kg at " + m.speed + " m/s"
            : m.mass + " kg · start " + m.height + " m · g = " + m.gravity + " m/s²"}
        </Text>
      </>
    );
  } else if (m.kind === "lift") {
    const hMax = Math.max(
      1,
      ...models.flatMap((v) => (v.kind === "lift" ? [v.fromHeight, v.toHeight] : [])),
    );
    const y = (height: number) => 278 - (208 * height) / hMax;
    drawing = (
      <>
        <path d="M185 290H445M230 55V290" className="mech-floor" />
        {[...new Set([m.fromHeight, m.toHeight])].map((h) => (
          <g key={h}>
            <path d={"M220 " + y(h) + "H445"} className="mech-grid" />
            <Text x={144} y={y(h) + 6}>
              {h + " m"}
            </Text>
          </g>
        ))}
        <Cart x={325} y={y(f.bodies[0]!.x) - 23} label={m.mass + " kg"} />
        <Text x={300} y={334} small>
          {"g = " + m.gravity + " m/s²"}
        </Text>
      </>
    );
  } else if (m.kind === "power") {
    const max = Math.max(...models.map((v) => (v.kind === "power" ? v.inputEnergy : 1)));
    drawing = (
      <>
        <Text x={300} y={45}>
          {m.duration + " seconds"}
        </Text>
        {[
          { label: "Input", value: m.inputEnergy, color: "#7cb6f5" },
          { label: "Useful", value: m.usefulEnergy, color: "#7adf9f" },
        ].map((v, i) => (
          <g key={v.label}>
            <Text x={100} y={132 + 105 * i} small>
              {v.label}
            </Text>
            <rect
              x="170"
              y={100 + 105 * i}
              width={(335 * v.value) / max}
              height="45"
              rx="8"
              fill={v.color}
            />
            <Text x={337} y={177 + 105 * i}>
              {v.value + " J"}
            </Text>
          </g>
        ))}
      </>
    );
  } else {
    const vertical = m.kind === "motion" && m.axis === "vertical";
    if (vertical) {
      const sy = (x: number) => 270 - (205 * (x - low)) / (high - low);
      drawing = (
        <>
          <path d="M210 40V280" className="mech-axis" />
          {ticks.map((x) => (
            <g key={x} data-scale="">
              <path d={"M204 " + sy(x) + "h12"} className="mech-axis" />
              <Text x={148} y={sy(x) + 6} small>
                {n(Math.round(x * 10) / 10) + " m"}
              </Text>
            </g>
          ))}
          {Array.from({ length: 9 }, (_, i) => mechanicsFrame(m, i / 8))
            .filter((v) => v.time <= f.time + 0.0001)
            .map((v) => (
              <circle key={v.time} cx="307" cy={sy(v.bodies[0]!.x)} r="4" className="mech-trail" />
            ))}
          <circle cx="307" cy={sy(f.bodies[0]!.x)} r="17" className="mech-current" />
          <Text x={442} y={95} small>
            {"v₀ = " + m.v0 + " m/s"}
          </Text>
          <Text x={442} y={135} small>
            {"a = " + m.acceleration + " m/s²"}
          </Text>
          {m.mass !== undefined && (
            <Text x={442} y={175} small>
              {m.mass + " kg"}
            </Text>
          )}
          <Text x={300} y={325} small>
            Up is positive · no air resistance
          </Text>
        </>
      );
    } else {
      drawing = (
        <>
          {track()}
          {m.kind !== "collision"
            ? Array.from({ length: 9 }, (_, i) => mechanicsFrame(m, i / 8))
                .filter((v) => v.time <= f.time + 0.0001)
                .map((v) => (
                  <circle
                    key={v.time}
                    cx={sx(v.bodies[0]?.x ?? 0)}
                    cy="244"
                    r="4"
                    className="mech-trail"
                  />
                ))
            : null}
          {f.bodies.map((b, i) => (
            <g key={b.id} data-body={b.id} data-position={b.x}>
              <Cart
                x={sx(b.x)}
                y={223 - i * (m.kind === "collision" || m.kind === "interaction" ? 88 : 0)}
                secondary={i === 1}
                label={
                  m.kind === "collision" || m.kind === "interaction"
                    ? b.id + ": " + b.mass + " kg"
                    : undefined
                }
              />
            </g>
          ))}
          {m.kind === "collision" ? (
            <>
              <Text x={170} y={55}>
                {"Initial A: " + m.velocityA + " m/s"}
              </Text>
              <Text x={435} y={55}>
                {"Initial B: " + m.velocityB + " m/s"}
              </Text>
              <Text x={300} y={345} small>
                {f.time < 1 ? "Before contact" : "Joined after contact"}
              </Text>
            </>
          ) : m.kind === "interaction" ? (
            <>
              <Arrow
                x={225}
                y={80}
                dx={
                  (-80 * m.force) /
                  Math.max(1, ...models.map((v) => (v.kind === "interaction" ? v.force : 0)))
                }
                marker={arrow}
                label={m.force + " N on A"}
              />
              <Arrow
                x={375}
                y={80}
                dx={
                  (80 * m.force) /
                  Math.max(1, ...models.map((v) => (v.kind === "interaction" ? v.force : 0)))
                }
                marker={arrow}
                label={reveal ? m.force + " N on B" : "? on B"}
              />
            </>
          ) : m.kind === "impulse" ? (
            <>
              <Text x={300} y={70}>
                {m.force + " N for " + m.duration + " s"}
              </Text>
              <Text x={300} y={115} small>
                {m.mass + " kg · initial " + m.v0 + " m/s"}
              </Text>
            </>
          ) : m.kind === "motion" ? (
            <>
              <Text x={300} y={70}>
                {"v₀ = " + m.v0 + " m/s"}
              </Text>
              <Text x={300} y={115} small>
                {"a = " + m.acceleration + " m/s² · " + m.duration + " s"}
              </Text>
            </>
          ) : m.kind === "journey" ? (
            <>
              {m.points.map((point, index) => (
                <g key={point.t}>
                  <Text x={80 + (index * 440) / (m.points.length - 1)} y={55} small>
                    {point.t + " s"}
                  </Text>
                  <Text x={80 + (index * 440) / (m.points.length - 1)} y={90}>
                    {point.x + " m"}
                  </Text>
                </g>
              ))}
            </>
          ) : null}
        </>
      );
    }
  }
  return (
    <svg viewBox="0 0 600 360" role="img" aria-labelledby={id} className="mechanics-drawing">
      <title id={id}>{mechanicsGivens(m).join(". ")}</title>
      <defs>
        <marker
          id={arrow}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0 1L9 5L0 9Z" fill="#8adeac" />
        </marker>
      </defs>
      {drawing}
    </svg>
  );
}
export function MechanicsGivenVisual({ model }: { model: MechanicsModel }) {
  return (
    <div className="mechanics-check">
      <MechanicsDrawing model={model} />
      <ul className="mech-givens">
        {mechanicsGivens(model).map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </div>
  );
}
export function MechanicsDiagram({
  spec,
  showResults = false,
}: {
  spec: Spec;
  showResults?: boolean;
}) {
  const [selected, setSelected] = useState(spec.initialCaseId),
    [fraction, setFraction] = useState(0),
    [playing, setPlaying] = useState(false);
  const from = useRef(0),
    { reduced } = useExperience(),
    controlId = useId();
  const current = spec.cases.find((c) => c.id === selected) ?? spec.cases[0]!;
  const timed = mechanicsTimed(current.model),
    duration = mechanicsDuration(current.model);
  const scrub = timed || ["work", "lift", "energy_drop"].includes(current.model.kind);
  useEffect(() => {
    if (!playing || reduced) {
      if (reduced) setPlaying(false);
      return;
    }
    let request = 0,
      start: number | undefined;
    const advance = (now: number) => {
      start ??= now;
      const next = Math.min(1, from.current + (now - start) / (duration * 1000));
      setFraction(next);
      if (next < 1) request = requestAnimationFrame(advance);
      else setPlaying(false);
    };
    request = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(request);
  }, [playing, reduced, duration, selected]);
  function select(id: string) {
    setPlaying(false);
    setSelected(id);
    setFraction(0);
  }
  return (
    <div className="learning-diagram mechanics-diagram">
      <div className="mech-cases" aria-label="Compare physical cases">
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
      <MechanicsDrawing
        model={current.model}
        models={spec.cases.map((c) => c.model)}
        fraction={fraction}
        reveal={showResults}
      />
      {scrub ? (
        <div className="mech-playback">
          <div className="mech-controls">
            {timed && !reduced ? (
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
                setFraction(Math.min(1, fraction + 1 / 8));
              }}
            >
              <SkipForward aria-hidden="true" size={16} />
              {timed ? "Next instant" : "Next position"}
            </button>
            <button type="button" onClick={() => select(spec.initialCaseId)}>
              <RotateCcw aria-hidden="true" size={16} />
              Reset
            </button>
          </div>
          <label htmlFor={controlId} className="mech-scrubber">
            <span>
              {timed ? "Time" : "Progress"}{" "}
              <output data-scale="">
                {n(fraction * (timed ? duration : 100))}
                {timed ? " s" : "%"}
              </output>
            </span>
            <input
              id={controlId}
              type="range"
              min={0}
              max={100}
              step={1}
              value={fraction * 100}
              aria-label={timed ? "Simulation time" : "Position through the model"}
              onChange={(e) => {
                setPlaying(false);
                setFraction(Number(e.currentTarget.value) / 100);
              }}
            />
          </label>
        </div>
      ) : null}
      <details className="mech-description">
        <summary>Read given values</summary>
        <ul className="mech-givens">
          {mechanicsGivens(current.model).map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      </details>
      {showResults && timed ? (
        <p className="mech-results-label">Results for the full interval</p>
      ) : null}
      {showResults ? (
        <dl className="mech-measures" aria-label="Worked results for the complete case">
          {mechanicsMeasures(current.model).map((value) => (
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
