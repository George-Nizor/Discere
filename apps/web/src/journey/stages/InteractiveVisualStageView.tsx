import type { InteractiveVisualStage } from "@discere/contracts";
import { ArrowRight, Maximize2, Minimize2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Notice } from "../../ui/Feedback.js";
import { ExplorerControls } from "../activities/ExplorerControls.js";
import {
  type ExplorerReading,
  type ExplorerState,
  evaluatePrediction,
  initialExplorerState,
  isSupportedActivity,
  predictionChoices,
  readExplorer,
} from "../activities/explorer-state.js";
import { TimelineTrack } from "../activities/TimelineTrack.js";

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

/** The drawing surface each activity asks for: a rendered circuit, or a dated track. */
function ExplorerCanvas({
  activity,
  reading,
}: {
  activity: InteractiveVisualStage["activity"];
  reading: ExplorerReading;
}) {
  if (activity.type === "timeline_explorer" && reading.kind === "timeline") {
    return <TimelineTrack activity={activity} year={reading.year} />;
  }
  if (reading.kind === "circuit") return <img alt={reading.visualAlt} src={reading.visualSrc} />;
  return null;
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
  const [prediction, setPrediction] = useState<string | null>(null);
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
  const choices = predictionChoices(activity);
  const outcome =
    checked && prediction
      ? evaluatePrediction(activity, baselineReading, reading, prediction)
      : null;

  function changeState(next: ExplorerState): void {
    setState(next);
    // A timeline is read by moving through it, so moving the scrubber is not a new experiment.
    if (activity.type !== "timeline_explorer") setChecked(false);
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
            <span>{reading.readout.label}</span>
            <strong>{reading.readout.value}</strong>
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
        <ExplorerCanvas activity={activity} reading={reading} />
      </figure>

      <ExplorerControls activity={activity} onChange={changeState} state={state} />

      <fieldset className="prediction">
        <legend className="prediction-prompt">{stage.prompt}</legend>
        <div className="prediction-choices">
          {choices.map((choice) => (
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
            <p className="muted">Choose a prediction to compare against the evidence.</p>
          )}
          {checked ? (
            <button className="button button-secondary" onClick={onContinue} type="button">
              Continue
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
            </button>
          ) : null}
        </div>
        {outcome ? (
          <Notice
            live
            tone={outcome.correct ? "correct" : "info"}
            title={outcome.correct ? "Matched" : "Compare"}
          >
            <p>{outcome.explanation}</p>
          </Notice>
        ) : null}
      </fieldset>

      <details className="visual-alternative">
        <summary>Read this as a table</summary>
        <table>
          <caption className="sr-only">Current values of every control in this activity</caption>
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
