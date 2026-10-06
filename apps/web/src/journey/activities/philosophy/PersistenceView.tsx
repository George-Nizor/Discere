import { persistenceRelations } from "@discere/activity-engine";
import { useId, useState } from "react";
import { Figure, Glows, Segmented, type ViewProps, wrap } from "./shared.js";

export function PersistenceView({
  model,
  showResults,
  interactive,
  label,
}: ViewProps<"persistence">) {
  const id = useId().replaceAll(":", "");
  const [lens, setLens] = useState<"both" | "memory" | "body">("both");
  const lastColumn = Math.max(1, ...model.stages.map((s) => s.column));
  const span = lastColumn === 1 ? 320 : 470;
  const x = (c: number) => 320 - span / 2 + (c * span) / lastColumn;
  const y = (r: number) => 196 + r * 70;
  const at = (sid: string) => model.stages.find((s) => s.id === sid)!;
  const relations = persistenceRelations(model);
  const direct = new Set(relations.directWithOrigin);
  const chain = new Set(relations.continuousWithOrigin);
  const failure = relations.transitivityFailures[0];
  const top = model.stages.some((s) => s.row < 0) ? 0 : 56;
  const showMemory = lens !== "body",
    showBody = lens !== "memory";
  return (
    <div className="phil-persistence" data-scenario={model.scenario} data-lens={lens}>
      <svg
        viewBox={"0 " + top + " 640 " + (310 - top)}
        role="img"
        aria-label={label}
        className="phil-svg"
      >
        <defs>
          <Glows id={id} />
          <marker
            id={id + "-arrow"}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0 1L9 5L0 9Z" className="phil-thread-head" />
          </marker>
        </defs>
        {model.scenario === "teleporter" ? (
          <g className="phil-worlds">
            <circle cx={x(0)} cy="420" r="190" className="phil-earth" />
            <circle cx={x(lastColumn)} cy="430" r="170" className="phil-mars" />
            <text x={x(0)} y="302" textAnchor="middle" className="phil-svg-tiny">
              Earth
            </text>
            <text x={x(lastColumn)} y="302" textAnchor="middle" className="phil-svg-tiny">
              Mars
            </text>
          </g>
        ) : (
          <g className="phil-timeline">
            <path d={"M" + (x(0) - 40) + " 300H" + (x(lastColumn) + 40)} />
            <text x={x(lastColumn) + 40} y="292" textAnchor="end" className="phil-svg-tiny">
              time →
            </text>
          </g>
        )}
        {showBody
          ? model.links
              .filter((l) => l.relation === "body")
              .map((l, i) => {
                const a = at(l.from),
                  b = at(l.to);
                return (
                  <path
                    key={"b" + l.from + l.to}
                    d={
                      "M" +
                      (x(a.column) + 18) +
                      " " +
                      (y(a.row) + 4) +
                      " L" +
                      (x(b.column) - 18) +
                      " " +
                      (y(b.row) + 4)
                    }
                    className="phil-body-link"
                  />
                );
              })
          : null}
        {showMemory
          ? model.links
              .filter((l) => l.relation === "memory")
              .map((l, i) => {
                const a = at(l.from),
                  b = at(l.to);
                const x1 = x(a.column) + 16,
                  y1 = y(a.row) - 66,
                  x2 = x(b.column) - 16,
                  y2 = y(b.row) - 66;
                const top = Math.max(
                  8,
                  Math.min(y1, y2) - Math.min(70, 30 + Math.abs(x2 - x1) / 6),
                );
                return (
                  <path
                    key={"m" + l.from + l.to}
                    d={
                      "M" +
                      x2 +
                      " " +
                      y2 +
                      " C" +
                      (x2 - 30) +
                      " " +
                      top +
                      ", " +
                      (x1 + 30) +
                      " " +
                      top +
                      ", " +
                      x1 +
                      " " +
                      y1
                    }
                    className="phil-memory-link"
                    markerEnd={"url(#" + id + "-arrow)"}
                    style={{ animationDelay: i * 0.35 + "s" }}
                  />
                );
              })
          : null}
        {model.scenario === "teleporter"
          ? model.stages
              .filter((s) => s.column === lastColumn && !relations.bodilyWithOrigin.includes(s.id))
              .map((s) => (
                <path
                  key={"beam" + s.id}
                  d={
                    "M" +
                    (x(0) + 20) +
                    " " +
                    (y(0) - 30) +
                    " L" +
                    (x(s.column) - 20) +
                    " " +
                    (y(s.row) - 30)
                  }
                  className="phil-beam"
                />
              ))
          : null}
        {model.stages.map((s) => {
          const isOrigin = s.id === relations.origin;
          const halo =
            showResults && !isOrigin
              ? direct.has(s.id)
                ? "direct"
                : chain.has(s.id)
                  ? "chain"
                  : "none"
              : "none";
          return (
            <g key={s.id} className="phil-stage" data-halo={halo}>
              <circle
                cx={x(s.column)}
                cy={y(s.row) - 30}
                r="52"
                fill={"url(#" + id + "-halo)"}
                className="phil-stage-glow"
              />
              {halo !== "none" ? (
                <circle cx={x(s.column)} cy={y(s.row) - 30} r="40" className="phil-stage-ring" />
              ) : null}
              <Figure
                x={x(s.column)}
                y={y(s.row)}
                scale={1.7}
                className={isOrigin ? "phil-origin" : ""}
              />
              {wrap(s.label, 14).map((line, i) => (
                <text
                  key={line}
                  x={x(s.column)}
                  y={y(s.row) + 24}
                  dy={i * 1.15 + "em"}
                  textAnchor="middle"
                  className="phil-svg-small"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
        {showResults && failure ? (
          <g className="phil-failure">
            <path
              d={
                "M" +
                x(at(failure[0]).column) +
                " " +
                (y(at(failure[0]).row) + 48) +
                " Q" +
                (x(at(failure[0]).column) + x(at(failure[2]).column)) / 2 +
                " " +
                (y(0) + 96) +
                " " +
                x(at(failure[2]).column) +
                " " +
                (y(at(failure[2]).row) + 48)
              }
            />
            <text
              x={(x(at(failure[0]).column) + x(at(failure[2]).column)) / 2}
              y={y(0) + 88}
              textAnchor="middle"
              className="phil-svg-label"
            >
              no direct memory: ≠
            </text>
          </g>
        ) : null}
      </svg>
      <ul className="phil-persistence-legend">
        <li>
          <span className="phil-key phil-key-memory" /> remembers from the inside
        </li>
        <li>
          <span className="phil-key phil-key-body" /> same living body
        </li>
        {showResults ? (
          <li>
            <span className="phil-key phil-key-ring" /> remembers the first stage directly
            <span className="phil-key phil-key-chain" /> linked only by a chain
          </li>
        ) : null}
      </ul>
      {interactive ? (
        <Segmented
          label="Which relations to show"
          value={lens}
          onChange={setLens}
          options={[
            { value: "both", label: "Both" },
            { value: "memory", label: "Memory" },
            { value: "body", label: "Body" },
          ]}
        />
      ) : null}
    </div>
  );
}
