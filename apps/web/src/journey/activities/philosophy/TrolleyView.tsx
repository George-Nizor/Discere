import { trolleyLedger } from "@discere/activity-engine";
import { Play, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Controls, Figure, Glows, Segmented, type ViewProps } from "./shared.js";

type Point = [number, number];
const SLEEPERS = Array.from({ length: 30 }, (_, i) => 24 + i * 20);
const MAIN = 180,
  SIDE = 250;

function along(points: Point[], t: number): Point {
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - points[i]![0], p[1] - points[i]![1]));
  let remaining = lengths.reduce((a, b) => a + b, 0) * Math.min(1, Math.max(0, t));
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]! || i === lengths.length - 1) {
      const f = lengths[i] ? Math.min(1, remaining / lengths[i]!) : 0;
      const a = points[i]!,
        b = points[i + 1]!;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    remaining -= lengths[i]!;
  }
  return points[points.length - 1]!;
}

export function TrolleyView({ model, interactive, reduced, label }: ViewProps<"trolley">) {
  const id = useId().replaceAll(":", "");
  const [act, setAct] = useState(false);
  const [lens, setLens] = useState({ ledger: false, duty: false });
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const raf = useRef(0);
  const ledger = trolleyLedger(model);
  const aheadX = Array.from({ length: model.ahead }, (_, i) => 440 + i * 20);
  const sideX = Array.from(
    { length: model.other },
    (_, i) => (model.variant === "loop" ? 410 : 440) + i * 20,
  );
  const route: Point[] = !act
    ? [
        [50, MAIN],
        [aheadX[0]! - 18, MAIN],
      ]
    : model.variant === "footbridge"
      ? [
          [50, MAIN],
          [352, MAIN],
        ]
      : [
          [50, MAIN],
          [200, MAIN],
          [250, 214],
          [300, SIDE],
          [sideX[0]! - 18, SIDE],
        ];
  const [tx, ty] = along(route, t);
  const arrived = t >= 1;
  useEffect(() => {
    if (!running) return;
    if (reduced) {
      setT(1);
      setRunning(false);
      return;
    }
    let start: number | undefined;
    const step = (now: number) => {
      start ??= now;
      const next = Math.min(1, (now - start) / 2400);
      // Ease out so the trolley visibly slows as it reaches the people.
      setT(1 - (1 - next) ** 2);
      if (next < 1) raf.current = requestAnimationFrame(step);
      else setRunning(false);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [running, reduced]);
  const choose = (value: "refrain" | "act") => {
    setRunning(false);
    setT(0);
    setAct(value === "act");
  };
  const struckAhead = arrived && !act;
  const struckOther = arrived && act;
  const fallen = act && model.variant === "footbridge" && t > 0;
  const actLabel = model.variant === "footbridge" ? "Push" : "Pull the lever";
  return (
    <div className="phil-trolley" data-variant={model.variant}>
      <svg viewBox="0 54 640 236" role="img" aria-label={label} className="phil-svg">
        <defs>
          <Glows id={id} />
        </defs>
        <ellipse cx="500" cy={MAIN + 6} rx="120" ry="16" fill={"url(#" + id + "-halo)"} />
        <g className="phil-track">
          <path d={"M20 " + MAIN + "H620"} />
          {model.variant !== "footbridge" ? (
            <path
              d={
                "M200 " +
                MAIN +
                " C240 " +
                MAIN +
                ", 260 " +
                SIDE +
                ", 300 " +
                SIDE +
                (model.variant === "loop"
                  ? " H560 C600 " + SIDE + ", 610 " + (MAIN + 30) + ", 620 " + MAIN
                  : " H620")
              }
              className="phil-track-side"
            />
          ) : null}
          {SLEEPERS.map((sx) => (
            <path key={sx} d={"M" + sx + " " + (MAIN - 5) + "v10"} className="phil-sleeper" />
          ))}
        </g>
        {model.variant === "footbridge" ? (
          <g className="phil-bridge">
            <rect x="320" y="96" width="100" height="10" rx="3" />
            <path d="M326 106V166M414 106V166" />
            <Figure x={398} y={96} className="phil-agent" />
            <g
              style={{
                transition: "transform 700ms cubic-bezier(.5,0,.6,1)",
                transform: fallen ? "translate(0px, 84px)" : "translate(0px, 0px)",
              }}
            >
              <Figure
                x={370}
                y={96}
                scale={1.25}
                className={"phil-other" + (struckOther ? " is-struck" : "")}
              />
            </g>
          </g>
        ) : (
          <g
            className="phil-lever"
            style={{
              transform: "rotate(" + (act ? 32 : -32) + "deg)",
              transformOrigin: "190px 226px",
            }}
          >
            <path d="M190 226V200" />
            <circle cx="190" cy="198" r="5" />
          </g>
        )}
        {aheadX.map((x, i) => (
          <Figure
            key={"a" + x}
            x={x}
            y={MAIN}
            className={"phil-ahead" + (struckAhead ? " is-struck" : "")}
          />
        ))}
        {model.variant !== "footbridge"
          ? sideX.map((x, i) => (
              <Figure
                key={"o" + x}
                x={x}
                y={SIDE}
                className={"phil-other" + (struckOther ? " is-struck" : "")}
              />
            ))
          : null}
        <g
          className="phil-trolley-car"
          style={{ transform: "translate(" + tx + "px, " + ty + "px)" }}
        >
          <circle r="34" fill={"url(#" + id + "-gold)"} className="phil-trolley-glow" />
          <rect x="-26" y="-30" width="52" height="26" rx="6" />
          <rect x="-20" y="-25" width="16" height="10" rx="2" className="phil-trolley-window" />
          <rect x="2" y="-25" width="16" height="10" rx="2" className="phil-trolley-window" />
          <circle cx="-14" cy="-2" r="5" className="phil-wheel" />
          <circle cx="14" cy="-2" r="5" className="phil-wheel" />
        </g>
        {lens.duty ? (
          <g className="phil-duty">
            {model.variant === "footbridge" ? (
              <ellipse cx="370" cy={fallen ? 160 : 74} rx="34" ry="44" />
            ) : (
              <ellipse
                cx={sideX[0]! + (model.other - 1) * 10}
                cy={SIDE - 18}
                rx={30 + model.other * 10}
                ry="34"
              />
            )}
            <text x="320" y="284" textAnchor="middle" className="phil-svg-small phil-duty-text">
              {ledger.usedAsMeans
                ? "Used as a means: this body is what stops the trolley"
                : "A side effect: diverting would work even if no one stood there"}
            </text>
          </g>
        ) : null}
        {lens.ledger ? (
          <g className="phil-ledger">
            <rect x="16" y="62" width="214" height="62" rx="10" />
            <text x="30" y="88" className="phil-svg-small">
              Refrain: {ledger.deathsIfRefrain} {ledger.deathsIfRefrain === 1 ? "death" : "deaths"}
            </text>
            <text x="30" y="110" className="phil-svg-small">
              {actLabel}: {ledger.deathsIfAct} {ledger.deathsIfAct === 1 ? "death" : "deaths"}
            </text>
          </g>
        ) : null}
      </svg>
      {interactive ? (
        <>
          <Controls>
            <Segmented
              label="Your choice"
              value={act ? "act" : "refrain"}
              onChange={choose}
              options={[
                { value: "refrain", label: "Refrain" },
                { value: "act", label: actLabel },
              ]}
            />
            <button
              type="button"
              onClick={() => {
                setT(0);
                setRunning(true);
              }}
              disabled={running}
            >
              <Play aria-hidden="true" size={16} />
              Run
            </button>
            <button
              type="button"
              onClick={() => {
                setRunning(false);
                setT(0);
              }}
            >
              <RotateCcw aria-hidden="true" size={16} />
              Reset
            </button>
          </Controls>
          <Controls>
            <button
              type="button"
              className="phil-chip-button"
              aria-pressed={lens.ledger}
              onClick={() => setLens({ ...lens, ledger: !lens.ledger })}
            >
              Utility ledger
            </button>
            <button
              type="button"
              className="phil-chip-button"
              aria-pressed={lens.duty}
              onClick={() => setLens({ ...lens, duty: !lens.duty })}
            >
              Duty lens
            </button>
          </Controls>
          <p className="phil-status" aria-live="polite">
            {arrived
              ? (act ? ledger.deathsIfAct : ledger.deathsIfRefrain) + " struck on this run."
              : running
                ? "The trolley is moving."
                : "Choose, then run the trolley."}
          </p>
        </>
      ) : null}
    </div>
  );
}
