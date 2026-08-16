import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { OhmsLawActivity } from "@discere/contracts";
import { calculateCurrent } from "@discere/visual-engine";

type Prediction = "increase" | "decrease" | "same";

function formatCurrent(current: number): string {
  return current < 1 ? `${Math.round(current * 1000)} mA` : `${current.toFixed(2)} A`;
}

export function CircuitLab({ activity, voltage, resistance, onVoltage, onResistance }: { activity: OhmsLawActivity; voltage: number; resistance: number; onVoltage: (value: number) => void; onResistance: (value: number) => void }) {
  const current = calculateCurrent(voltage, resistance);
  const imageUrl = `/api/visuals/circuit.svg?voltage=${encodeURIComponent(voltage)}&resistance=${encodeURIComponent(resistance)}&values=true`;
  const graphUrl = `/api/visuals/graph.svg?resistance=${encodeURIComponent(resistance)}`;
  const [prediction, setPrediction] = useState<Prediction>();
  const [checkedPrediction, setCheckedPrediction] = useState(false);
  const [baselineResistance, setBaselineResistance] = useState(resistance);

  useEffect(() => {
    setBaselineResistance(resistance);
    setPrediction(undefined);
    setCheckedPrediction(false);
  }, [activity.id]);

  const predictionResult = useMemo(() => {
    if (!prediction || !checkedPrediction) return undefined;
    return prediction === "decrease";
  }, [prediction, checkedPrediction]);

  function beginExperiment(): void {
    setBaselineResistance(resistance);
    setCheckedPrediction(true);
    const nextResistance = Math.min(activity.resistance.max, resistance + Math.max(activity.resistance.step, Math.round(resistance * 0.5 / activity.resistance.step) * activity.resistance.step));
    onResistance(nextResistance === resistance ? Math.max(activity.resistance.min, resistance - activity.resistance.step) : nextResistance);
  }

  function resetExperiment(): void {
    onResistance(baselineResistance);
    setPrediction(undefined);
    setCheckedPrediction(false);
  }

  return <section className="visual-stage" aria-labelledby="visual-title">
    <div className="visual-heading">
      <div><p className="eyebrow">Interactive diagram</p><h2 id="visual-title">{activity.title}</h2><p className="visual-instructions">{activity.instructions}</p></div>
      <output className="current-readout" aria-live="polite"><span>Current</span><strong>{formatCurrent(current)}</strong></output>
    </div>
    <div className="visual-grid">
      <figure className="circuit-canvas"><img src={imageUrl} alt="A battery and resistor connected in one closed loop, with the current value calculated from the selected voltage and resistance." /><figcaption>One closed loop. Change a value and watch the circuit calculation respond.</figcaption></figure>
      <figure className="graph-canvas"><img src={graphUrl} alt={`A graph of current against voltage for a ${resistance} ohm resistor.`} /><figcaption>The graph shows how current changes with voltage at the selected resistance.</figcaption></figure>
    </div>
    <div className="lab-controls">
      <label><span>Voltage</span><output>{voltage} V</output><input type="range" min={activity.voltage.min} max={activity.voltage.max} step={activity.voltage.step} value={voltage} onChange={(event: ChangeEvent<HTMLInputElement>) => onVoltage(Number(event.currentTarget.value))} /></label>
      <label><span>Resistance</span><output>{resistance} Ω</output><input type="range" min={activity.resistance.min} max={activity.resistance.max} step={activity.resistance.step} value={resistance} onChange={(event: ChangeEvent<HTMLInputElement>) => onResistance(Number(event.currentTarget.value))} /></label>
    </div>
    <div className="prediction-card">
      <div><p className="eyebrow">Predict before changing it</p><p>{activity.predictionPrompt}</p></div>
      <div className="prediction-options" role="group" aria-label="Prediction">
        {(["increase", "decrease", "same"] as const).map((value) => <button key={value} type="button" className={prediction === value ? "selected" : ""} aria-pressed={prediction === value} disabled={checkedPrediction} onClick={() => setPrediction(value)}>{value === "same" ? "Stay the same" : `${value[0]?.toUpperCase()}${value.slice(1)}`}</button>)}
      </div>
      {!checkedPrediction ? <button className="experiment-button" type="button" disabled={!prediction} onClick={beginExperiment}>Test my prediction</button> : <div className={predictionResult ? "prediction-feedback correct" : "prediction-feedback"} aria-live="polite"><strong>{predictionResult ? "Your prediction matches the circuit." : "The circuit moved the other way."}</strong><p>At fixed voltage, increasing resistance reduces current because I = V / R.</p><button type="button" className="text-button" onClick={resetExperiment}>Try another value</button></div>}
    </div>
  </section>;
}
