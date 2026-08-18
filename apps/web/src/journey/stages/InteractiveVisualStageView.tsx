import type { InteractiveVisualStage } from "@discere/contracts";
import { ArrowRight, Maximize2, Minimize2 } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrent } from "../../lib/format.js";
import { Notice } from "../../ui/Feedback.js";
import { ExplorerControls } from "../activities/ExplorerControls.js";
import {
  compareValues,
  directionSentence,
  type ExplorerState,
  initialExplorerState,
  isSupportedActivity,
  PREDICTION_CHOICES,
  type PredictionDirection,
  predictionTargetLabel,
  readExplorer,
  readPredictionTarget,
} from "../activities/explorer-state.js";

function UnsupportedActivity({ type, prompt }: { type: string; prompt: string }) {
  return (
    <div className="stage-column">
      <Notice tone="warning" title="This activity is not available">
        <p>
          The lesson asks for a <code>{type}</code> activity. Discere has no interactive control for
          that type yet, so nothing is shown rather than a control that does not work.
        </p>
        <p>The stage still asks: {prompt}</p>
      </Notice>
    </div>
  );
}

export function InteractiveVisualStageView({
  stage,
  onContinue,
}: {
  stage: InteractiveVisualStage;
  onContinue: () => void;
}) {
  const activity = stage.activity;
  const supported = isSupportedActivity(activity);
  const [state, setState] = useState<ExplorerState | null>(() =>
    supported ? initialExplorerState(activity) : null,
  );
  const [prediction, setPrediction] = useState<PredictionDirection | null>(null);
  const [checked, setChecked] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const baseline = useMemo(
    () => (supported ? initialExplorerState(activity) : null),
    [activity, supported],
  );

  if (!supported || !state || !baseline) {
    return <UnsupportedActivity prompt={stage.prompt} type={activity.type} />;
  }

  const reading = readExplorer(activity, state, checked);
  const baselineReading = readExplorer(activity, baseline, true);
  const targetLabel = predictionTargetLabel(activity);
  const observed = compareValues(
    readPredictionTarget(activity, baselineReading),
    readPredictionTarget(activity, reading),
  );
  const correct = checked && prediction === observed;

  function changeState(next: ExplorerState): void {
    setState(next);
    setChecked(false);
  }

  return (
    <div className={fullscreen ? "explorer explorer-fullscreen" : "explorer"}>
      <div className="explorer-heading">
        <div>
          <h1>{stage.title}</h1>
          <p className="deck">{activity.instructions}</p>
        </div>
        <div className="explorer-heading-tools">
          <output aria-live="polite" className="explorer-readout">
            <span>Current</span>
            <strong>{checked ? formatCurrent(reading.current) : "Predict first"}</strong>
          </output>
          <button
            aria-pressed={fullscreen}
            className="button button-secondary"
            onClick={() => setFullscreen((value) => !value)}
            type="button"
          >
            {fullscreen ? (
              <Minimize2 aria-hidden="true" size={16} strokeWidth={1.8} />
            ) : (
              <Maximize2 aria-hidden="true" size={16} strokeWidth={1.8} />
            )}
            {fullscreen ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </div>

      <figure className="explorer-canvas">
        <img alt={reading.visualAlt} src={reading.visualSrc} />
      </figure>

      <ExplorerControls activity={activity} onChange={changeState} state={state} />

      <fieldset className="prediction">
        <legend className="prediction-prompt">{stage.prompt}</legend>
        <div className="prediction-choices">
          {PREDICTION_CHOICES.map((choice) => (
            <button
              aria-pressed={prediction === choice.id}
              className={
                prediction === choice.id ? "choice-button choice-button-selected" : "choice-button"
              }
              key={choice.id}
              onClick={() => {
                setPrediction(choice.id);
                setChecked(false);
              }}
              type="button"
            >
              {choice.label}
            </button>
          ))}
        </div>
        <div className="button-row">
          {prediction ? (
            <button
              className="button button-primary"
              onClick={() => setChecked(true)}
              type="button"
            >
              Check prediction
            </button>
          ) : (
            <p className="muted">Choose a prediction to compare against the circuit.</p>
          )}
          {checked ? (
            <button className="button button-secondary" onClick={onContinue} type="button">
              Continue
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
            </button>
          ) : null}
        </div>
        {checked ? (
          <Notice live tone={correct ? "correct" : "info"} title={correct ? "Matched" : "Compare"}>
            <p>
              Moving from the starting circuit to this one,{" "}
              {directionSentence(observed, targetLabel)}.{" "}
              {correct
                ? "Your prediction matches the measured change."
                : `You predicted that it ${prediction === "same" ? "stays the same" : prediction}.`}
            </p>
          </Notice>
        ) : null}
      </fieldset>

      <details className="visual-alternative">
        <summary>Read the circuit as a table</summary>
        <table>
          <caption className="sr-only">Current values of every circuit control</caption>
          <tbody>
            {reading.rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
