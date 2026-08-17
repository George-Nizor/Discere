import { useState } from "react";

export type PredictionChoice = "increase" | "decrease" | "same";

type CircuitValues = { voltage: number; resistance: number };

const labels: Record<PredictionChoice, string> = {
  increase: "Increase",
  decrease: "Decrease",
  same: "Stay the same",
};

export function PredictionLab({ voltage, resistance, onEvaluated }: { voltage: number; resistance: number; onEvaluated?: (evaluated: boolean) => void }) {
  const [baseline, setBaseline] = useState<CircuitValues>({ voltage, resistance });
  const [prediction, setPrediction] = useState<PredictionChoice>();
  const [checkedValues, setCheckedValues] = useState<CircuitValues>();

  const baselineCurrent = baseline.voltage / baseline.resistance;
  const current = voltage / resistance;
  const epsilon = 1e-9;
  const actual: PredictionChoice = current > baselineCurrent + epsilon ? "increase" : current < baselineCurrent - epsilon ? "decrease" : "same";
  const changed = voltage !== baseline.voltage || resistance !== baseline.resistance;
  const checked = checkedValues?.voltage === voltage && checkedValues.resistance === resistance;
  const correct = checked && prediction === actual;

  function checkPrediction(): void {
    if (!prediction || !changed) return;
    setCheckedValues({ voltage, resistance });
    onEvaluated?.(true);
  }

  function choosePrediction(choice: PredictionChoice): void {
    setPrediction(choice);
    setCheckedValues(undefined);
    onEvaluated?.(false);
  }

  function useCurrentAsBaseline(): void {
    setBaseline({ voltage, resistance });
    setPrediction(undefined);
    setCheckedValues(undefined);
    onEvaluated?.(false);
  }

  return <section className="prediction-lab" aria-labelledby="prediction-title">
    <div>
      <p className="eyebrow">Predict first</p>
      <h3 id="prediction-title">Compared with {baseline.voltage} V and {baseline.resistance} Ω, what happens to current?</h3>
      <p>Move either circuit control, commit to a prediction, then check it against the calculation.</p>
    </div>
    <fieldset className="prediction-choices"><legend className="sr-only">Current prediction</legend>
      {(Object.keys(labels) as PredictionChoice[]).map((choice) => <button key={choice} type="button" className={prediction === choice ? "selected" : ""} aria-pressed={prediction === choice} onClick={() => choosePrediction(choice)}>{labels[choice]}</button>)}
    </fieldset>
    <div className="prediction-actions">
      <button type="button" className="primary-button" disabled={!prediction || !changed} onClick={checkPrediction}>Check prediction</button>
      <button type="button" className="text-button" onClick={useCurrentAsBaseline}>Use current values as baseline</button>
    </div>
    {!changed ? <p className="prediction-note">Change voltage or resistance before checking.</p> : null}
    {checked ? <div className={correct ? "prediction-result correct" : "prediction-result"} role="status">
      <strong>{correct ? "That matches the circuit." : `Current will ${labels[actual].toLocaleLowerCase()}.`}</strong>
      <p>Baseline: {(baselineCurrent * 1000).toFixed(1)} mA. Current setting: {(current * 1000).toFixed(1)} mA.</p>
    </div> : null}
  </section>;
}
