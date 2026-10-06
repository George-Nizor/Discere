import { machineStep, realiserNames } from "@discere/activity-engine";
import { RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { Controls, Glows, type Of, type ViewProps } from "./shared.js";

function RealiserIcon({ kind }: { kind: Of<"machine_table">["realiser"] }) {
  switch (kind) {
    case "mechanism":
      return (
        <g className="phil-icon">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <rect
              key={angle}
              x="-3"
              y="-17"
              width="6"
              height="7"
              rx="1.5"
              transform={"rotate(" + angle + ")"}
            />
          ))}
          <circle r="11" />
          <circle r="4" className="phil-icon-hole" />
        </g>
      );
    case "neurons":
      return (
        <g className="phil-icon phil-icon-neuron">
          <path d="M0 0L-14 -10M0 0L-15 6M0 0L-4 -16M0 0L13 -9M0 0L16 9M0 0L3 16M-14 -10L-19 -9M13 -9L17 -14M16 9L20 7" />
          <circle r="6" />
        </g>
      );
    case "silicon":
      return (
        <g className="phil-icon">
          {[-8, 0, 8].map((p) => (
            <g key={p}>
              <path
                d={"M" + p + " -16V-11M" + p + " 11V16M-16 " + p + "H-11M11 " + p + "H16"}
                className="phil-icon-pin"
              />
            </g>
          ))}
          <rect x="-11" y="-11" width="22" height="22" rx="3" />
          <rect x="-5" y="-5" width="10" height="10" rx="1" className="phil-icon-hole" />
        </g>
      );
    case "rulebook":
      return (
        <g className="phil-icon">
          <path d="M0 -9C-6 -13 -12 -13 -16 -11V11C-12 9 -6 9 0 13C6 9 12 9 16 11V-11C12 -13 6 -13 0 -9Z" />
          <path d="M0 -9V13" className="phil-icon-pin" />
        </g>
      );
  }
}

export function MachineView({ model, interactive, label }: ViewProps<"machine_table">) {
  const id = useId().replaceAll(":", "");
  const [state, setState] = useState(model.start);
  const [log, setLog] = useState<
    Array<{ n: number; input: string; output: string; from: string; to: string }>
  >([]);
  const n = model.states.length;
  const x = (i: number) => (n === 1 ? 320 : 130 + (i * 380) / (n - 1));
  const y = 150;
  const index = (sid: string) => model.states.findIndex((s) => s.id === sid);
  const last = log[log.length - 1];
  const pairs = new Map<string, typeof model.transitions>();
  for (const t of model.transitions) {
    const key = t.from + ">" + t.to;
    pairs.set(key, [...(pairs.get(key) ?? []), t]);
  }
  const press = (input: string) => {
    const next = machineStep(model, state, input);
    setLog([...log, { n: log.length, input, output: next.output, from: state, to: next.state }]);
    setState(next.state);
  };
  const reset = () => {
    setState(model.start);
    setLog([]);
  };
  return (
    <div className="phil-machine" data-realiser={model.realiser}>
      <p className="phil-caption">
        {model.title} · realised in {realiserNames[model.realiser]}
      </p>
      <svg viewBox="0 20 640 270" role="img" aria-label={label} className="phil-svg">
        <defs>
          <Glows id={id} />
          <marker
            id={id + "-arrow"}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 1L9 5L0 9Z" className="phil-arrowhead" />
          </marker>
        </defs>
        {[...pairs.entries()].map(([key, ts]) => {
          const a = index(ts[0]!.from),
            b = index(ts[0]!.to);
          const active = Boolean(last && last.from === ts[0]!.from && last.to === ts[0]!.to);
          const text = ts.map((t) => t.input + " → " + (t.output || "nothing"));
          if (a === b) {
            const cx = x(a);
            const up = a % 2 === 0;
            const s = up ? -1 : 1;
            return (
              <g
                key={key + log.length}
                className="phil-transition"
                data-active={active ? "true" : "false"}
              >
                <path
                  d={
                    "M" +
                    (cx - 16) +
                    " " +
                    (y + s * 36) +
                    " C" +
                    (cx - 48) +
                    " " +
                    (y + s * 104) +
                    ", " +
                    (cx + 48) +
                    " " +
                    (y + s * 104) +
                    ", " +
                    (cx + 16) +
                    " " +
                    (y + s * 38)
                  }
                  markerEnd={"url(#" + id + "-arrow)"}
                />
                {text.map((t, i) => (
                  <text
                    key={t}
                    x={cx}
                    y={y + s * (up ? 112 : 118)}
                    dy={(up ? -i : i) * 1.2 + "em"}
                    textAnchor="middle"
                    className="phil-svg-small"
                  >
                    {t}
                  </text>
                ))}
              </g>
            );
          }
          const forward = a < b;
          const x1 = x(a) + (forward ? 34 : -34),
            x2 = x(b) + (forward ? -38 : 38);
          const bend = forward ? -70 : 70;
          const mx = (x1 + x2) / 2;
          return (
            <g
              key={key + log.length}
              className="phil-transition"
              data-active={active ? "true" : "false"}
            >
              <path
                d={
                  "M" +
                  x1 +
                  " " +
                  (y + (forward ? -12 : 12)) +
                  " Q" +
                  mx +
                  " " +
                  (y + bend) +
                  " " +
                  x2 +
                  " " +
                  (y + (forward ? -12 : 12))
                }
                markerEnd={"url(#" + id + "-arrow)"}
              />
              {text.map((t, i) => (
                <text
                  key={t}
                  x={mx}
                  y={forward ? y + bend / 2 - 12 : y + bend / 2 + 22}
                  dy={(forward ? -(text.length - 1 - i) : i) * 1.2 + "em"}
                  textAnchor="middle"
                  className="phil-svg-small"
                >
                  {t}
                </text>
              ))}
            </g>
          );
        })}
        {model.states.map((s, i) => {
          const current = interactive && s.id === state;
          return (
            <g key={s.id} className="phil-state" data-current={current ? "true" : "false"}>
              <circle
                cx={x(i)}
                cy={y}
                r="56"
                fill={"url(#" + id + "-halo)"}
                className="phil-state-halo"
              />
              <circle cx={x(i)} cy={y} r="32" className="phil-state-node" />
              <g transform={"translate(" + x(i) + " " + y + ")"}>
                <RealiserIcon kind={model.realiser} />
              </g>
              <text
                x={x(i)}
                y={y + (i % 2 === 0 ? 54 : -46)}
                textAnchor="middle"
                className="phil-svg-label"
              >
                {s.id}
              </text>
              <text
                x={x(i)}
                y={y + (i % 2 === 0 ? 54 : -46)}
                dy={i % 2 === 0 ? "1.25em" : "-1.4em"}
                textAnchor="middle"
                className="phil-svg-small"
              >
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
      {interactive ? (
        <>
          <Controls>
            {model.inputs.map((input) => (
              <button type="button" key={input} className="phil-input" onClick={() => press(input)}>
                Input {input}
              </button>
            ))}
            <button type="button" onClick={reset}>
              <RotateCcw aria-hidden="true" size={16} />
              Reset
            </button>
          </Controls>
          <div className="phil-tray" aria-live="polite">
            <span className="phil-tray-label">
              Now in {state}: {model.states.find((s) => s.id === state)!.label}
            </span>
            <ol aria-label="Outputs so far">
              {log.map((entry) => (
                <li key={entry.n} data-empty={entry.output ? "false" : "true"}>
                  <span>{entry.input}</span>
                  {entry.output || "nothing"}
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : null}
      <details className="phil-table-details" open={!interactive}>
        <summary>Machine table</summary>
        <table className="phil-machine-table">
          <thead>
            <tr>
              <th scope="col">State</th>
              <th scope="col">Input</th>
              <th scope="col">Next state</th>
              <th scope="col">Output</th>
            </tr>
          </thead>
          <tbody>
            {model.transitions.map((t) => (
              <tr
                key={t.from + t.input}
                data-current={
                  interactive && last && last.from === t.from && last.input === t.input
                    ? "true"
                    : "false"
                }
              >
                <td>{t.from}</td>
                <td>{t.input}</td>
                <td>{t.to}</td>
                <td>{t.output || "nothing"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
