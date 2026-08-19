import type { GraphPlotActivity } from "@discere/contracts";
import { evaluateGraphPlot, type GraphPoint, pointFromFraction } from "@discere/activity-engine";
import { useRef, useState } from "react";
import { Notice } from "../../ui/Feedback.js";

const WIDTH = 420;
const HEIGHT = 300;
const PAD = { left: 52, right: 16, top: 16, bottom: 44 };
const PLOT = {
  width: WIDTH - PAD.left - PAD.right,
  height: HEIGHT - PAD.top - PAD.bottom,
};

function ticksFor(min: number, max: number, step: number): number[] {
  const count = Math.floor((max - min) / step);
  // A dense axis is unreadable, so tick labels thin out rather than overlapping.
  const stride = Math.max(1, Math.ceil(count / 6));
  return Array.from({ length: count + 1 }, (_, index) => min + index * step).filter(
    (_value, index) => index % stride === 0,
  );
}

function formatTick(value: number, step: number): string {
  const decimals = step < 1 ? Math.min(3, Math.ceil(-Math.log10(step))) : 0;
  return value.toFixed(decimals);
}

/**
 * Read a value off a graph, or place a point on one.
 *
 * Placing is a click inside the plot area, snapped to the gridlines so the learner is choosing a
 * value rather than aiming a pixel. The same task is reachable from the keyboard through the
 * number inputs beneath, which are the point's coordinates and not a separate answer box.
 */
export function GraphPlot({
  activity,
  onAnswered,
}: {
  activity: GraphPlotActivity;
  onAnswered?: (correct: boolean) => void;
}) {
  const plotRef = useRef<SVGRectElement>(null);
  const [point, setPoint] = useState<GraphPoint | null>(null);
  const [checked, setChecked] = useState(false);
  const outcome = checked && point ? evaluateGraphPlot(activity, point) : null;

  const xAt = (value: number): number =>
    PAD.left + ((value - activity.x.min) / (activity.x.max - activity.x.min)) * PLOT.width;
  const yAt = (value: number): number =>
    PAD.top + PLOT.height - ((value - activity.y.min) / (activity.y.max - activity.y.min)) * PLOT.height;

  function place(event: React.MouseEvent<SVGRectElement>): void {
    if (outcome?.correct) return;
    const box = plotRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    setPoint(
      pointFromFraction(
        activity,
        (event.clientX - box.left) / box.width,
        (event.clientY - box.top) / box.height,
      ),
    );
    setChecked(false);
  }

  const xTicks = ticksFor(activity.x.min, activity.x.max, activity.x.step);
  const yTicks = ticksFor(activity.y.min, activity.y.max, activity.y.step);

  return (
    <div className="graph-plot">
      <p className="graph-plot-prompt">{activity.prompt}</p>
      <svg
        className="graph-plot-canvas"
        role="img"
        aria-label={`${activity.y.label} against ${activity.x.label}`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        <g className="graph-grid">
          {xTicks.map((value) => (
            <line key={`x${value}`} x1={xAt(value)} x2={xAt(value)} y1={PAD.top} y2={PAD.top + PLOT.height} />
          ))}
          {yTicks.map((value) => (
            <line key={`y${value}`} x1={PAD.left} x2={PAD.left + PLOT.width} y1={yAt(value)} y2={yAt(value)} />
          ))}
        </g>
        {activity.series.length > 1 ? (
          <polyline
            className="graph-series"
            points={activity.series.map((entry) => `${xAt(entry.x)},${yAt(entry.y)}`).join(" ")}
          />
        ) : null}
        <g className="graph-axis">
          <line x1={PAD.left} x2={PAD.left + PLOT.width} y1={PAD.top + PLOT.height} y2={PAD.top + PLOT.height} />
          <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + PLOT.height} />
        </g>
        <g className="graph-tick">
          {xTicks.map((value) => (
            <text key={`xt${value}`} x={xAt(value)} y={PAD.top + PLOT.height + 18} textAnchor="middle">
              {formatTick(value, activity.x.step)}
            </text>
          ))}
          {yTicks.map((value) => (
            <text key={`yt${value}`} x={PAD.left - 8} y={yAt(value) + 4} textAnchor="end">
              {formatTick(value, activity.y.step)}
            </text>
          ))}
        </g>
        <text className="graph-label" x={PAD.left + PLOT.width / 2} y={HEIGHT - 6} textAnchor="middle">
          {activity.x.label}
          {activity.x.unit ? ` (${activity.x.unit})` : ""}
        </text>
        <text
          className="graph-label"
          x={12}
          y={PAD.top + PLOT.height / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${PAD.top + PLOT.height / 2})`}
        >
          {activity.y.label}
          {activity.y.unit ? ` (${activity.y.unit})` : ""}
        </text>
        {/*
          A pointer shortcut, not the only way in: the labelled number inputs below are the
          keyboard path and carry the same answer. The surrounding `svg` is `role="img"`, so
          nothing inside it is exposed to assistive technology in the first place.
        */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer convenience only; the number inputs below are the equivalent keyboard control. */}
        <rect
          className="graph-surface"
          height={PLOT.height}
          onClick={place}
          ref={plotRef}
          width={PLOT.width}
          x={PAD.left}
          y={PAD.top}
        />
        {point ? (
          <circle
            className={outcome ? (outcome.correct ? "graph-point is-correct" : "graph-point is-wrong") : "graph-point"}
            cx={xAt(point.x)}
            cy={yAt(point.y)}
            r={7}
          />
        ) : null}
      </svg>

      <div className="graph-plot-controls">
        <label>
          <span>{activity.x.label}</span>
          <input
            max={activity.x.max}
            min={activity.x.min}
            onChange={(event) => {
              setPoint((current) => ({ x: Number(event.target.value), y: current?.y ?? activity.y.min }));
              setChecked(false);
            }}
            step={activity.x.step}
            type="number"
            value={point?.x ?? ""}
          />
        </label>
        <label>
          <span>{activity.y.label}</span>
          <input
            max={activity.y.max}
            min={activity.y.min}
            onChange={(event) => {
              setPoint((current) => ({ x: current?.x ?? activity.x.min, y: Number(event.target.value) }));
              setChecked(false);
            }}
            step={activity.y.step}
            type="number"
            value={point?.y ?? ""}
          />
        </label>
        {outcome?.correct ? null : (
          <button
            className="button button-primary"
            disabled={point === null}
            onClick={() => {
              setChecked(true);
              if (point) onAnswered?.(evaluateGraphPlot(activity, point).correct);
            }}
            type="button"
          >
            Check the point
          </button>
        )}
      </div>

      {outcome ? (
        <Notice
          live
          tone={outcome.correct ? "correct" : "info"}
          title={outcome.correct ? "Correct" : "Not there"}
        >
          <p>{outcome.explanation}</p>
        </Notice>
      ) : null}
    </div>
  );
}
