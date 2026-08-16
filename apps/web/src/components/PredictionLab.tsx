import { useEffect, useState } from "react";

export type PredictionChoice = "increase" | "decrease" | "same";

const labels: Record<PredictionChoice, string> = {
  increase: "Increase",
  decrease: "Decrease",
  same: "Stay the same",
};

export function PredictionLab({ voltage, resistance, onEvaluated }: { voltage: number; resistance: number; onEvaluated?: (evaluated: boolean) => void }) {
  const [baseline, setBaseline] = useState({ voltage, resistance });
  const [prediction, setPrediction] = useState<PredictionChoice>();
  const [checked, setChecked] = useState(false);

  const baselineCurrent = baseline.voltage / baseline.resistance;
  const current = voltage / resistance;
  const epsilon = 1e-9;
  const actual: PredictionChoice = current > baselineCurrent + epsilon ? "increase" : current < baselineCurrent - epsilon ? "decrease" : "same";
  const changed = voltage !== baseline.voltage || resistance !== baseline.resistance;
  const correct = checked && prediction === actual;

  useEffect(() => {
    if (checked) {
      setChecked(false);
      onEvaluated?.(false);
    }
  }, [voltage, resistance]);

  function checkPrediction(): void {
    if (!prediction || !changed) return;
    setChecked(true);
    onEvaluated?.(true);
  }

  function useCurrentAsBaseline(): void {
    setBaseline({ voltage, resistance });
    setPrediction(undefined);
    setChecked(false);
    onEvaluated?.(false);
  }

  return <section className="prediction-lab" aria-labelledby="prediction-title">
    <div>
      <p className="eyebrow">Predict first</p>
      <h3 id="prediction-title">Compared with {baseline.voltage} V and {baseline.resistance} Ω, what happens to current?</h3>
      <p>Move either circuit control, commit to a prediction, then check it against the calculation.</p>
    </div>
    <div className="prediction-choices" role="group" aria-label="Current prediction">
      {(Object.keys(labels) as PredictionChoice[]).map((choice) => <button key={choice} type="button" className={prediction === choice ? "selected" : ""} onClick={() => { setPrediction(choice); setChecked(false); onEvaluated?.(false); }}>{labels[choice]}</button>)}
    </div>
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
