import type { ChangeEvent } from "react";
import type { OhmsLawActivity } from "@discere/contracts";
import { calculateCurrent } from "@discere/visual-engine";

function formatCurrent(current: number): string {
  return current < 1 ? `${Math.round(current * 1000)} mA` : `${current.toFixed(2)} A`;
}

export function CircuitLab({ activity, voltage, resistance, onVoltage, onResistance }: { activity: OhmsLawActivity; voltage: number; resistance: number; onVoltage: (value: number) => void; onResistance: (value: number) => void }) {
  const current = calculateCurrent(voltage, resistance);
  const baselineCurrent = calculateCurrent(activity.voltage.value, activity.resistance.value);
  const changed = voltage !== activity.voltage.value || resistance !== activity.resistance.value;
  const imageUrl = `/api/visuals/circuit.svg?voltage=${encodeURIComponent(voltage)}&resistance=${encodeURIComponent(resistance)}&values=false`;
  const graphUrl = `/api/visuals/graph.svg?resistance=${encodeURIComponent(resistance)}`;
  return <section className="visual-stage" aria-labelledby="visual-title"><div className="visual-heading"><div><p className="eyebrow">Interactive diagram</p><h2 id="visual-title">{activity.title}</h2><p>{activity.instructions}</p></div><output className="current-readout" aria-live="polite"><span>Calculated current</span><strong>{formatCurrent(current)}</strong></output></div><div className="visual-grid"><figure className="circuit-canvas"><img src={imageUrl} alt="A battery and resistor connected in one closed loop. Component values are controlled below the diagram." /><figcaption>One closed path. Change the controls and watch the current respond.</figcaption></figure><figure className="graph-canvas"><img src={graphUrl} alt={`A graph of current against voltage for a ${resistance} ohm resistor.`} /><figcaption>For a fixed resistor, current changes linearly with voltage.</figcaption></figure></div><div className="lab-controls"><label><span>Voltage</span><output>{voltage} V</output><input type="range" min={activity.voltage.min} max={activity.voltage.max} step={activity.voltage.step} value={voltage} onChange={(event: ChangeEvent<HTMLInputElement>) => onVoltage(Number(event.currentTarget.value))} /></label><label><span>Resistance</span><output>{resistance} Ω</output><input type="range" min={activity.resistance.min} max={activity.resistance.max} step={activity.resistance.step} value={resistance} onChange={(event: ChangeEvent<HTMLInputElement>) => onResistance(Number(event.currentTarget.value))} /></label></div><div className="prediction-card"><p className="eyebrow">Predict, then test</p><p>{activity.predictionPrompt}</p>{changed ? <p className="observation">At the starting values the current is <strong>{formatCurrent(baselineCurrent)}</strong>. With your settings it is <strong>{formatCurrent(current)}</strong>.</p> : <p className="observation muted">Move one control after making a prediction.</p>}</div></section>;
}
