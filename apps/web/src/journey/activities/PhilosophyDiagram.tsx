import type { PhilosophyDiagram as Spec, PhilosophyModel } from "@discere/contracts";
import {
  philosophyGivenList,
  philosophyGivens,
  philosophyMeasures,
} from "@discere/activity-engine";
import { useState } from "react";
import { useExperience } from "../../study/experience.js";
import { ArgumentView } from "./philosophy/ArgumentView.js";
import { BayesView } from "./philosophy/BayesView.js";
import { KnowledgeView } from "./philosophy/KnowledgeView.js";
import { MachineView } from "./philosophy/MachineView.js";
import { MeanView } from "./philosophy/MeanView.js";
import { PersistenceView } from "./philosophy/PersistenceView.js";
import { TrolleyView } from "./philosophy/TrolleyView.js";
import { UtilityView } from "./philosophy/UtilityView.js";
import { VeilView } from "./philosophy/VeilView.js";

/** One view per model kind. The same view stays mounted across cases of a kind so changes animate. */
function View({
  model,
  showResults,
  interactive,
  reduced,
}: {
  model: PhilosophyModel;
  showResults: boolean;
  interactive: boolean;
  reduced: boolean;
}) {
  const common = { showResults, interactive, reduced, label: philosophyGivens(model) };
  switch (model.kind) {
    case "argument_map":
      return <ArgumentView model={model} {...common} />;
    case "bayes_grid":
      return <BayesView model={model} {...common} />;
    case "knowledge_case":
      return <KnowledgeView model={model} {...common} />;
    case "machine_table":
      return <MachineView model={model} {...common} />;
    case "persistence":
      return <PersistenceView model={model} {...common} />;
    case "trolley":
      return <TrolleyView model={model} {...common} />;
    case "expected_utility":
      return <UtilityView model={model} {...common} />;
    case "veil":
      return <VeilView model={model} {...common} />;
    case "mean":
      return <MeanView model={model} {...common} />;
  }
}

/** Views whose state belongs to one case remount on a case change; the rest morph. */
const remountPerCase = new Set(["argument_map", "knowledge_case", "machine_table", "trolley"]);

/** Numbers a check problem needs are repeated as text; maps, cases and tables already show theirs. */
const listedInChecks = new Set(["bayes_grid", "trolley", "expected_utility", "veil", "mean"]);

export function PhilosophyGivenVisual({ model }: { model: PhilosophyModel }) {
  return (
    <div className="philosophy-check" data-kind={model.kind}>
      <View model={model} showResults={false} interactive={false} reduced />
      {listedInChecks.has(model.kind) ? (
        <ul className="phil-givens">
          {philosophyGivenList(model).map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function PhilosophyDiagram({
  spec,
  showResults = false,
}: {
  spec: Spec;
  showResults?: boolean;
}) {
  const [selected, setSelected] = useState(spec.initialCaseId);
  const { reduced } = useExperience();
  const current = spec.cases.find((c) => c.id === selected) ?? spec.cases[0]!;
  const measures = showResults ? philosophyMeasures(current.model) : [];
  const key = remountPerCase.has(current.model.kind) ? current.id : current.model.kind;
  return (
    <div className="learning-diagram philosophy-diagram" data-kind={current.model.kind}>
      <div className="phil-cases" role="group" aria-label="Compare cases">
        {spec.cases.map((c) => (
          <button
            type="button"
            key={c.id}
            aria-pressed={selected === c.id}
            onClick={() => setSelected(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="phil-stage-frame" key={key}>
        <View model={current.model} showResults={showResults} interactive reduced={reduced} />
      </div>
      <details className="phil-description">
        <summary>Read given values</summary>
        <ul className="phil-givens">
          {philosophyGivenList(current.model).map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      </details>
      {measures.length ? (
        <dl className="phil-measures" aria-label="Worked results for this case">
          {measures.map((m) => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
