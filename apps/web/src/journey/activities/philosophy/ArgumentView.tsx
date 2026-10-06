import {
  argumentIndicatorSpans,
  auditArgument,
  evaluatePhilosophyFormula,
  philosophyTruthRows,
  type PhilosophyValuation,
} from "@discere/activity-engine";
import { ChevronRight, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Controls, Segmented, type ViewProps } from "./shared.js";

const tf = (v: boolean) => (v ? "T" : "F");
/** Passage pieces keyed by their character offset. */
function spans(passage: string) {
  let offset = 0;
  return argumentIndicatorSpans(passage).map((span) => {
    const at = offset;
    offset += span.text.length;
    return { ...span, at };
  });
}

export function ArgumentView({ model, showResults, interactive }: ViewProps<"argument_map">) {
  const audit = auditArgument(model);
  const hasPassage = Boolean(model.passage);
  const [view, setView] = useState<"passage" | "map">(hasPassage ? "passage" : "map");
  const [marks, setMarks] = useState(false);
  const [row, setRow] = useState(0);
  // The finished map is earned: once the answer is in, it opens by itself.
  useEffect(() => {
    if (showResults && hasPassage) setView("map");
  }, [showResults, hasPassage]);
  const rows = audit.formal ? philosophyTruthRows(audit.atoms) : [];
  const valuation: PhilosophyValuation = rows[row] ?? {};
  const premiseValues = audit.formal
    ? model.premises.map((p) => evaluatePhilosophyFormula(p.formula!, valuation))
    : [];
  const conclusionValue = audit.formal
    ? evaluatePhilosophyFormula(model.conclusion.formula!, valuation)
    : true;
  const allTrue = premiseValues.length > 0 && premiseValues.every(Boolean);
  const broken = interactive && audit.formal && allTrue && !conclusionValue;
  const mapAvailable = !hasPassage || showResults || !interactive;
  const showMap = interactive ? view === "map" && mapAvailable : !hasPassage;
  const flip = (atom: string) => {
    const index = rows.findIndex((r) =>
      audit.atoms.every((a) => (a === atom ? r[a] !== valuation[a] : r[a] === valuation[a])),
    );
    if (index >= 0) setRow(index);
  };

  return (
    <div className="phil-argument" data-broken={broken ? "true" : "false"}>
      {interactive && hasPassage ? (
        <Controls>
          <Segmented
            label="How to show the argument"
            value={showMap ? "map" : "passage"}
            onChange={setView}
            options={[
              { value: "passage", label: "Passage" },
              {
                value: "map",
                label: "Map",
                disabled: !mapAvailable,
                title: mapAvailable ? undefined : "The map opens after you answer",
              },
            ]}
          />
          {!showMap ? (
            <button
              type="button"
              className="phil-chip-button"
              aria-pressed={marks}
              onClick={() => setMarks(!marks)}
            >
              Highlight indicator words
            </button>
          ) : null}
        </Controls>
      ) : null}

      {!showMap && model.passage ? (
        <blockquote className="phil-passage" data-marks={marks || !interactive ? "on" : "off"}>
          {spans(model.passage).map((span) =>
            span.role ? (
              <mark key={span.at} className={"phil-indicator phil-indicator-" + span.role}>
                {span.text}
              </mark>
            ) : (
              <span key={span.at}>{span.text}</span>
            ),
          )}
        </blockquote>
      ) : null}
      {!showMap && interactive && marks ? (
        <p className="phil-legend">
          <span className="phil-key phil-key-premise" /> introduces a reason
          <span className="phil-key phil-key-conclusion" /> introduces what is concluded
        </p>
      ) : null}

      {showMap ? (
        <div className="phil-map">
          <ol className="phil-premises">
            {model.premises.map((p, i) => {
              const hidden = p.unstated && !showResults && interactive;
              const value = premiseValues[i];
              return (
                <li
                  key={p.text}
                  className="phil-claim phil-premise"
                  data-unstated={p.unstated ? "true" : "false"}
                  data-value={audit.formal && interactive ? tf(value!) : undefined}
                  style={{ animationDelay: i * 90 + "ms" }}
                >
                  <span className="phil-claim-tag">
                    {p.unstated ? "Unstated premise" : "Premise " + (i + 1)}
                  </span>
                  <span className="phil-claim-text">
                    {hidden
                      ? "A premise the passage leaves out. Which one would make it work?"
                      : p.text}
                  </span>
                  {p.formula ? <code className="phil-formula">{p.formula}</code> : null}
                  {audit.formal && interactive ? (
                    <span
                      className="phil-truth"
                      aria-label={value ? "true in this row" : "false in this row"}
                    >
                      {tf(value!)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <svg
            className="phil-flow"
            viewBox="0 0 100 36"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {model.premises.map((p, i) => {
              const x = ((i + 0.5) / model.premises.length) * 100;
              return (
                <path
                  key={p.text}
                  d={"M" + x + " 0 C" + x + " 18, 50 16, 50 34"}
                  className="phil-flow-line"
                  style={{ animationDelay: i * 0.4 + "s" }}
                />
              );
            })}
            {broken ? <path d="M44 20 L48 24 L46 27 L52 31 L56 26" className="phil-crack" /> : null}
          </svg>
          <div
            className="phil-claim phil-conclusion"
            data-value={audit.formal && interactive ? tf(conclusionValue) : undefined}
          >
            <span className="phil-claim-tag">Conclusion</span>
            <span className="phil-claim-text">{model.conclusion.text}</span>
            {model.conclusion.formula ? (
              <code className="phil-formula">{model.conclusion.formula}</code>
            ) : null}
            {audit.formal && interactive ? (
              <span
                className="phil-truth"
                aria-label={conclusionValue ? "true in this row" : "false in this row"}
              >
                {tf(conclusionValue)}
              </span>
            ) : null}
          </div>
          {broken ? (
            <p className="phil-broken-note" role="status">
              Every premise is true in this row and the conclusion is false. The link breaks here.
            </p>
          ) : null}
        </div>
      ) : null}

      {showMap && audit.formal && model.atoms ? (
        interactive ? (
          <div className="phil-row-tester">
            <p className="phil-row-title">
              Row {row + 1} of {rows.length}: set each letter true or false
            </p>
            <div className="phil-atoms">
              {model.atoms.map((a) => (
                <button
                  type="button"
                  key={a.symbol}
                  className="phil-atom"
                  aria-pressed={Boolean(valuation[a.symbol])}
                  aria-label={
                    a.symbol + ", " + a.meaning + ": " + (valuation[a.symbol] ? "true" : "false")
                  }
                  onClick={() => flip(a.symbol)}
                >
                  <span className="phil-atom-symbol">{a.symbol}</span>
                  <span className="phil-atom-meaning">{a.meaning}</span>
                  <span className="phil-atom-value">{valuation[a.symbol] ? "true" : "false"}</span>
                </button>
              ))}
            </div>
            <Controls>
              <button type="button" onClick={() => setRow((row + 1) % rows.length)}>
                <ChevronRight aria-hidden="true" size={16} />
                Next row
              </button>
              <button type="button" onClick={() => setRow(0)}>
                <RotateCcw aria-hidden="true" size={16} />
                First row
              </button>
            </Controls>
          </div>
        ) : (
          <ul className="phil-atom-key">
            {model.atoms.map((a) => (
              <li key={a.symbol}>
                <code>{a.symbol}</code> {a.meaning}
              </li>
            ))}
          </ul>
        )
      ) : null}

      {showResults && audit.formal && interactive ? (
        <table className="phil-truth-table" aria-label="Complete truth table">
          <thead>
            <tr>
              {audit.atoms.map((a) => (
                <th key={a} scope="col">
                  {a}
                </th>
              ))}
              {model.premises.map((p) => (
                <th key={p.text} scope="col">
                  {p.formula}
                </th>
              ))}
              <th scope="col">{model.conclusion.formula}</th>
            </tr>
          </thead>
          <tbody>
            {audit.rows.map((r) => {
              const supported = r.premises.every(Boolean);
              return (
                <tr
                  key={audit.atoms.map((a) => tf(Boolean(r.valuation[a]))).join("")}
                  data-supported={supported ? "true" : "false"}
                  data-counterexample={supported && !r.conclusion ? "true" : "false"}
                >
                  {audit.atoms.map((a) => (
                    <td key={a}>{tf(Boolean(r.valuation[a]))}</td>
                  ))}
                  {model.premises.map((p, j) => (
                    <td key={p.text}>{tf(Boolean(r.premises[j]))}</td>
                  ))}
                  <td>{tf(r.conclusion)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
