import { useState } from "react";
import type { ExplainerStage, InteractiveVisualStage, LearnerStage } from "@discere/contracts";
import { calculateCurrent } from "@discere/visual-engine";

function Explainer({ stage, onComplete }: { stage: ExplainerStage; onComplete: () => void }) {
  const paragraphs = stage.body.split("\n\n");
  return (
    <section className="story-explainer" aria-labelledby="stage-task-title">
      <div className="story-explainer-copy">
        <div className="story-prose">
          {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <aside className="story-takeaway">
          <span aria-hidden="true">☆</span>
          <div><strong>Key takeaway</strong><p>{stage.takeaway}</p></div>
        </aside>
        <div className="story-actions">
          <button className="story-primary" type="button" onClick={onComplete}>Continue</button>
          <button className="story-secondary" type="button" onClick={onComplete}>Try the question first <span aria-hidden="true">→</span></button>
        </div>
      </div>
      <figure className="story-explainer-visual">
        <img src="/api/visuals/circuit.svg?voltage=5&resistance=100&values=false" alt={stage.visual.alt} />
        <figcaption>Trace the closed loop from the battery, through the resistor, and back again.</figcaption>
      </figure>
    </section>
  );
}

function InteractiveVisual({ stage, onComplete }: { stage: InteractiveVisualStage; onComplete: () => void }) {
  const activity = stage.activity;
  const [voltage, setVoltage] = useState(activity.type === "ohms_law_explorer" ? activity.voltage.value : 5);
  const [resistance, setResistance] = useState(activity.type === "ohms_law_explorer" ? activity.resistance.value : 100);
  const [prediction, setPrediction] = useState<string>();
  const [checked, setChecked] = useState(false);
  const current = calculateCurrent(voltage, resistance);
  const circuitUrl = `/api/visuals/circuit.svg?voltage=${voltage}&resistance=${resistance}&values=${checked ? "true" : "false"}`;

  if (activity.type !== "ohms_law_explorer") {
    return <p>That visual activity is not available in this lesson yet.</p>;
  }

  function updateVoltage(value: number): void { setVoltage(value); setChecked(false); setPrediction(undefined); }
  function updateResistance(value: number): void { setResistance(value); setChecked(false); setPrediction(undefined); }
  function checkPrediction(): void { setChecked(true); }

  return (
    <section className="story-interactive" aria-labelledby="visual-task-title">
      <div className="story-interactive-heading">
        <div><p className="story-kicker">Interactive visual</p><h2 id="visual-task-title">Change the circuit</h2><p>{activity.instructions}</p></div>
        <output className={checked ? "story-reading" : "story-reading concealed"} aria-live="polite"><span>Current</span><strong>{checked ? `${Math.round(current * 1000)} mA` : "Predict first"}</strong></output>
      </div>
      <figure className="story-circuit-figure">
        <img src={circuitUrl} alt="A battery and resistor connected in one closed loop. Component values remain hidden until the prediction is checked." />
        <figcaption>One closed loop. Change a value, predict the effect, then check the calculation.</figcaption>
      </figure>
      <div className="story-controls">
        <label><span>Voltage <output>{voltage} V</output></span><input type="range" min={activity.voltage.min} max={activity.voltage.max} step={activity.voltage.step} value={voltage} onChange={(event) => updateVoltage(Number(event.currentTarget.value))} /></label>
        <label><span>Resistance <output>{resistance} Ω</output></span><input type="range" min={activity.resistance.min} max={activity.resistance.max} step={activity.resistance.step} value={resistance} onChange={(event) => updateResistance(Number(event.currentTarget.value))} /></label>
      </div>
      <fieldset className="story-prediction">
        <legend>{activity.predictionPrompt}</legend>
        <div className="story-choice-row">
          {["increases", "decreases", "stays the same"].map((choice) => <button key={choice} type="button" className={prediction === choice ? "selected" : ""} onClick={() => { setPrediction(choice); setChecked(false); }}>{choice}</button>)}
        </div>
        <div className="story-actions"><button className="story-primary" type="button" disabled={!prediction} onClick={checkPrediction}>Check prediction</button>{checked ? <button className="story-secondary" type="button" onClick={onComplete}>Continue to the quiz <span aria-hidden="true">→</span></button> : null}</div>
        {checked ? <p className={prediction === "decreases" ? "story-feedback correct" : "story-feedback"} role="status">{prediction === "decreases" ? "Resistance increases while voltage stays fixed, so current decreases. I = V / R." : "With voltage fixed, current changes inversely with resistance. Compare the result with I = V / R."}</p> : null}
      </fieldset>
      <details className="story-alt-visual"><summary>Describe the visual</summary><p>The battery supplies voltage. The resistor limits current. Increasing resistance makes the current value smaller when voltage stays fixed.</p></details>
    </section>
  );
}

export function JourneyStage({ stage, onComplete }: { stage: LearnerStage; onComplete: () => void }) {
  if (stage.type === "explainer") return <Explainer stage={stage} onComplete={onComplete} />;
  if (stage.type === "interactive_visual") return <InteractiveVisual stage={stage} onComplete={onComplete} />;
  return <section className="story-stage-placeholder"><p className="story-kicker">{stage.type.replace("_", " ")}</p><h2>{stage.title}</h2><p>The next focused stage is being connected to this journey.</p><button className="story-primary" type="button" onClick={onComplete}>Continue</button></section>;
}
