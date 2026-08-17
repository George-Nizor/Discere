import type { ChangeEvent } from "react";
import { useState } from "react";
import type { OhmsLawActivity } from "@discere/contracts";
import { calculateCurrent } from "@discere/visual-engine";
import { PredictionLab } from "./PredictionLab";

type VisualView = "circuit" | "graph";

export function CircuitLab({ activity, voltage, resistance, onVoltage, onResistance }: { activity: OhmsLawActivity; voltage: number; resistance: number; onVoltage: (value: number) => void; onResistance: (value: number) => void }) {
  const [view, setView] = useState<VisualView>("circuit");
  const [predictionEvaluated, setPredictionEvaluated] = useState(false);
  const current = calculateCurrent(voltage, resistance);
  const circuitUrl = `/api/visuals/circuit.svg?voltage=${encodeURIComponent(voltage)}&resistance=${encodeURIComponent(resistance)}&values=${predictionEvaluated ? "true" : "false"}`;
  const graphUrl = `/api/visuals/graph.svg?resistance=${encodeURIComponent(resistance)}`;

  function changeVoltage(value: number): void {
    setPredictionEvaluated(false);
    onVoltage(value);
  }

  function changeResistance(value: number): void {
    setPredictionEvaluated(false);
    onResistance(value);
  }

  return <section className="visual-stage" aria-labelledby="visual-title">
    <div className="visual-heading">
      <div><p className="eyebrow">Interactive diagram</p><h2 id="visual-title">{activity.title}</h2><p className="visual-instructions">{activity.instructions}</p></div>
      <div className="visual-tools">
        <fieldset className="visual-tabs"><legend className="sr-only">Visual view</legend>
          <button type="button" className={view === "circuit" ? "active" : ""} onClick={() => setView("circuit")}>Circuit</button>
          <button type="button" className={view === "graph" ? "active" : ""} onClick={() => setView("graph")}>Relationship</button>
        </fieldset>
        <output className={predictionEvaluated ? "current-readout" : "current-readout concealed"} aria-live="polite">
          <span>Current</span>
          <strong>{predictionEvaluated ? (current < 1 ? `${Math.round(current * 1000)} mA` : `${current.toFixed(2)} A`) : "Predict first"}</strong>
        </output>
      </div>
    </div>
    <figure className="circuit-canvas">
      {view === "circuit" ? <img src={circuitUrl} alt="A battery and resistor connected in one closed loop. Component values remain hidden until the prediction is checked." /> : <img src={graphUrl} alt={`A graph of current against voltage for a ${resistance} ohm resistor.`} />}
      <figcaption>{view === "circuit" ? "One closed loop. Change a value, predict the effect, then reveal the calculation." : "The line shows how current changes with voltage at the selected resistance."}</figcaption>
    </figure>
    <div className="lab-controls">
      <label><span>Voltage</span><output>{voltage} V</output><input aria-label="Voltage" type="range" min={activity.voltage.min} max={activity.voltage.max} step={activity.voltage.step} value={voltage} onChange={(event: ChangeEvent<HTMLInputElement>) => changeVoltage(Number(event.currentTarget.value))} /></label>
      <label><span>Resistance</span><output>{resistance} Ω</output><input aria-label="Resistance" type="range" min={activity.resistance.min} max={activity.resistance.max} step={activity.resistance.step} value={resistance} onChange={(event: ChangeEvent<HTMLInputElement>) => changeResistance(Number(event.currentTarget.value))} /></label>
    </div>
    <PredictionLab voltage={voltage} resistance={resistance} onEvaluated={setPredictionEvaluated} />
  </section>;
}
