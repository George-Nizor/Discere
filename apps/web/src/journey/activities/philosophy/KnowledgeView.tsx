import { knowledgeVerdict } from "@discere/activity-engine";
import { useState } from "react";
import { Controls, type ViewProps } from "./shared.js";

export function KnowledgeView({ model, showResults, interactive }: ViewProps<"knowledge_case">) {
  const [traced, setTraced] = useState(false);
  const [compared, setCompared] = useState(false);
  const verdict = knowledgeVerdict(model);
  const lamps = [
    ["Justified", model.justified],
    ["True", model.beliefTrue],
    ["Believed", model.believes],
  ] as const;
  return (
    <div
      className="phil-knowledge"
      data-traced={traced || !interactive ? "true" : "false"}
      data-compared={compared || !interactive ? "true" : "false"}
      data-results={showResults ? "true" : "false"}
      data-connected={model.evidenceConnected ? "true" : "false"}
    >
      <div className="phil-k-stage">
        <section className="phil-k-card phil-k-evidence" aria-label="Evidence">
          <h4>Evidence</h4>
          <p>{model.evidence}</p>
        </section>
        <div className="phil-k-link phil-k-reason" aria-hidden="true">
          <span />
        </div>
        <section className="phil-k-card phil-k-mind" aria-label={model.subject + "'s belief"}>
          <h4>{model.subject} believes</h4>
          <p className="phil-k-belief">“{model.belief}”</p>
        </section>
        <div className="phil-k-link phil-k-match" aria-hidden="true">
          <span />
        </div>
        <section className="phil-k-card phil-k-world" aria-label="What is actually so">
          <h4>In the world</h4>
          <p>{model.fact}</p>
        </section>
      </div>
      {showResults ? (
        <div className="phil-k-thread" data-connected={model.evidenceConnected ? "true" : "false"}>
          <span className="phil-k-thread-line" aria-hidden="true" />
          <span className="phil-k-thread-label">
            {model.evidenceConnected
              ? "The evidence is connected to what makes the belief true"
              : "The evidence and the truth-maker come apart: the match is luck"}
          </span>
        </div>
      ) : null}
      {interactive ? (
        <Controls>
          <button type="button" aria-pressed={traced} onClick={() => setTraced(!traced)}>
            Trace the reasons
          </button>
          <button type="button" aria-pressed={compared} onClick={() => setCompared(!compared)}>
            Compare with the world
          </button>
        </Controls>
      ) : null}
      {showResults ? (
        <ul className="phil-lamps" aria-label="Conditions of the traditional analysis">
          {lamps.map(([name, on]) => (
            <li key={name} data-on={on ? "true" : "false"}>
              <span className="phil-lamp" aria-hidden="true" />
              {name}: {on ? "yes" : "no"}
            </li>
          ))}
          <li
            data-on={verdict.gettiered ? "false" : verdict.jtb ? "true" : "false"}
            className="phil-lamp-verdict"
          >
            {verdict.gettiered ? "Gettier case" : verdict.jtb ? "Knowledge" : "Not knowledge"}
          </li>
        </ul>
      ) : null}
    </div>
  );
}
