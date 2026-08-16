import type { ChangeEvent } from "react";
import type { OhmsLawActivity } from "@discere/contracts";
import { calculateCurrent } from "@discere/visual-engine";

export function CircuitLab({ activity, voltage, resistance, onVoltage, onResistance }: { activity: OhmsLawActivity; voltage: number; resistance: number; onVoltage: (value: number) => void; onResistance: (value: number) => void }) {
  const current = calculateCurrent(voltage, resistance);
  const imageUrl = `/api/visuals/circuit.svg?voltage=${encodeURIComponent(voltage)}&resistance=${encodeURIComponent(resistance)}&values=true`;
  const graphUrl = `/api/visuals/graph.svg?resistance=${encodeURIComponent(resistance)}`;
  return <section className="visual-stage" aria-labelledby="visual-title">
    <div className="visual-heading"><div><p className="eyebrow">Interactive model</p><h2 id="visual-title">{activity.title}</h2><p className="visual-instructions">{activity.instructions}</p></div><output className="current-readout" aria-live="polite"><span>Current</span><strong>{current < 1 ? `${Math.round(current * 1000)} mA` : `${current.toFixed(2)} A`}</strong></output></div>
    <div className="visual-grid">
      <figure className="visual-figure"><div className="circuit-canvas"><img src={imageUrl} alt="A battery and resistor connected in one closed loop, with the current calculated from the selected voltage and resistance." /></div><figcaption>One closed path. Change a value and watch the circuit respond.</figcaption></figure>
      <figure className="visual-figure graph-figure"><img src={graphUrl} alt={`A graph of current against voltage for a ${resistance} ohm resistor.`} /><figcaption>For this resistor, current rises in direct proportion to voltage.</figcaption></figure>
    </div>
    <div className="lab-controls"><label><span>Voltage</span><output>{voltage} V</output><input type="range" min={activity.voltage.min} max={activity.voltage.max} step={activity.voltage.step} value={voltage} onChange={(event: ChangeEvent<HTMLInputElement>) => onVoltage(Number(event.currentTarget.value))} /></label><label><span>Resistance</span><output>{resistance} Ω</output><input type="range" min={activity.resistance.min} max={activity.resistance.max} step={activity.resistance.step} value={resistance} onChange={(event: ChangeEvent<HTMLInputElement>) => onResistance(Number(event.currentTarget.value))} /></label></div>
    <p className="prediction-prompt"><strong>Predict before changing it.</strong> {activity.predictionPrompt}</p>
  </section>;
}
