import { formatTimelineYear } from "@discere/activity-engine";
import type { Activity } from "@discere/contracts";
import type { ExplorerState } from "./explorer-state.js";

function Slider({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="explorer-slider">
      <span className="explorer-slider-label">
        {label}
        <output>
          {value} {unit}
        </output>
      </span>
      <input
        aria-label={label}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

/** Renders the controls the activity itself declares. Nothing about the ranges is assumed. */
export function ExplorerControls({
  activity,
  state,
  onChange,
}: {
  activity: Activity;
  state: ExplorerState;
  onChange: (next: ExplorerState) => void;
}) {
  if (activity.type === "ohms_law_explorer" && state.type === "ohms_law_explorer") {
    return (
      <div className="explorer-controls">
        <Slider
          label="Voltage"
          max={activity.voltage.max}
          min={activity.voltage.min}
          onChange={(voltage) => onChange({ ...state, voltage })}
          step={activity.voltage.step}
          unit="V"
          value={state.voltage}
        />
        <Slider
          label="Resistance"
          max={activity.resistance.max}
          min={activity.resistance.min}
          onChange={(resistance) => onChange({ ...state, resistance })}
          step={activity.resistance.step}
          unit="Ω"
          value={state.resistance}
        />
      </div>
    );
  }

  if (activity.type === "series_circuit_explorer" && state.type === "series_circuit_explorer") {
    return (
      <div className="explorer-controls">
        <Slider
          label="Voltage"
          max={activity.voltage.max}
          min={activity.voltage.min}
          onChange={(voltage) => onChange({ ...state, voltage })}
          step={activity.voltage.step}
          unit="V"
          value={state.voltage}
        />
        {activity.resistors.map((resistor, index) => (
          <Slider
            key={resistor.id}
            label={resistor.label}
            max={resistor.max}
            min={resistor.min}
            onChange={(value) =>
              onChange({
                ...state,
                resistances: state.resistances.map((current, position) =>
                  position === index ? value : current,
                ),
              })
            }
            step={resistor.step}
            unit="Ω"
            value={state.resistances[index] ?? resistor.value}
          />
        ))}
      </div>
    );
  }

  if (activity.type === "parallel_circuit_explorer" && state.type === "parallel_circuit_explorer") {
    return (
      <div className="explorer-controls">
        <Slider
          label="Voltage"
          max={activity.voltage.max}
          min={activity.voltage.min}
          onChange={(voltage) => onChange({ ...state, voltage })}
          step={activity.voltage.step}
          unit="V"
          value={state.voltage}
        />
        {activity.branches.map((branch, index) => (
          <Slider
            key={branch.id}
            label={branch.label}
            max={branch.max}
            min={branch.min}
            onChange={(value) =>
              onChange({
                ...state,
                resistances: state.resistances.map((current, position) =>
                  position === index ? value : current,
                ),
              })
            }
            step={branch.step}
            unit="Ω"
            value={state.resistances[index] ?? branch.value}
          />
        ))}
      </div>
    );
  }

  if (activity.type === "timeline_explorer" && state.type === "timeline_explorer") {
    return (
      <div className="explorer-controls">
        <label className="explorer-slider explorer-slider-wide">
          <span className="explorer-slider-label">
            Year
            <output>{formatTimelineYear(state.year)}</output>
          </span>
          <input
            aria-label="Year"
            aria-valuetext={formatTimelineYear(state.year)}
            max={activity.endYear}
            min={activity.startYear}
            onChange={(event) => onChange({ ...state, year: Number(event.currentTarget.value) })}
            step={activity.step}
            type="range"
            value={state.year}
          />
        </label>
      </div>
    );
  }

  return null;
}
