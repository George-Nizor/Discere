import type { CourseCheckVisual } from "@discere/contracts";
import { useId } from "react";
import { FoundationCheckVisual } from "./FoundationCheckVisual.js";
import { QueryCheckVisual } from "./QueryCheckVisual.js";
import { BiologyGivenVisual } from "../journey/activities/BiologyDiagram.js";
import { ChemistryGivenVisual } from "../journey/activities/ChemistryDiagram.js";
import { GeometryDrawing } from "../journey/activities/GeometryDiagram.js";
import { CalculusGivenVisual } from "../journey/activities/CalculusDiagram.js";
import { LinearAlgebraGivenVisual } from "../journey/activities/LinearAlgebraDiagram.js";
import { InferenceGivenVisual } from "../journey/activities/InferenceDiagram.js";
import { MechanicsGivenVisual } from "../journey/activities/MechanicsDiagram.js";
import { EngineeringGivenVisual } from "../journey/activities/EngineeringDiagram.js";
import { EconomicsGivenVisual } from "../journey/activities/EconomicsDiagram.js";
import { PhilosophyGivenVisual } from "../journey/activities/PhilosophyDiagram.js";
import { LanguageGivenVisual } from "../journey/activities/LanguageDiagram.js";
import { AstronomyGivenVisual } from "../journey/activities/AstronomyDiagram.js";
import { PsychologyGivenVisual } from "../journey/activities/PsychologyDiagram.js";

export function CheckVisual({ visual }: { visual: CourseCheckVisual }) {
  const titleId = useId();
  if (visual.type === "query") return <QueryCheckVisual visual={visual} />;
  if (visual.type === "statements" || visual.type === "program" || visual.type === "data_series")
    return <FoundationCheckVisual visual={visual} />;
  if (visual.type === "biology") return <BiologyGivenVisual model={visual.model} />;
  if (visual.type === "chemistry") return <ChemistryGivenVisual model={visual.model} />;
  if (visual.type === "calculus") return <CalculusGivenVisual model={visual.model} />;
  if (visual.type === "linear_algebra") return <LinearAlgebraGivenVisual model={visual.model} />;
  if (visual.type === "inference") return <InferenceGivenVisual model={visual.model} />;
  if (visual.type === "mechanics") return <MechanicsGivenVisual model={visual.model} />;
  if (visual.type === "engineering") return <EngineeringGivenVisual model={visual.model} />;
  if (visual.type === "economics") return <EconomicsGivenVisual model={visual.model} />;
  if (visual.type === "philosophy") return <PhilosophyGivenVisual model={visual.model} />;
  if (visual.type === "language") return <LanguageGivenVisual model={visual.model} />;
  if (visual.type === "astronomy") return <AstronomyGivenVisual model={visual.model} />;
  if (visual.type === "psychology") return <PsychologyGivenVisual model={visual.model} />;
  if (visual.type === "geometry") return <GeometryDrawing shape={visual.shape} />;
  if (visual.type === "table")
    return (
      <div className="check-data-table">
        <table>
          <caption className="sr-only">Given values</caption>
          <thead>
            <tr>
              {visual.columns.map((c) => (
                <th scope="col" key={c}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visual.rows.map((row, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: A problem has fixed, immutable rows; repeated values are valid.
              <tr key={row.join("|") + i}>
                {row.map((cell, j) => (
                  <td key={visual.columns[j]}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (visual.type === "machine") {
    const entries = [visual.input, ...visual.operations, visual.output],
      width = entries.length * 112;
    return (
      <svg
        className="check-visual check-machine"
        viewBox={"0 0 " + width + " 140"}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>
          {visual.input}, then {visual.operations.join(", then ")}, unknown output
        </title>
        {entries.map((entry, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: A fixed operation chain may repeat an operation and never reorders.
          <g key={i + ":" + entry}>
            {i > 0 ? (
              <path
                d={"M" + (i * 112 - 14) + " 70h22m-7-6 7 6-7 6"}
                stroke="var(--muted)"
                strokeWidth="2"
                fill="none"
              />
            ) : null}
            <rect
              x={i * 112 + 12}
              y="35"
              width="86"
              height="70"
              rx="18"
              fill={i === 0 || i === entries.length - 1 ? "#234533" : "#282d2b"}
              stroke={i === entries.length - 1 ? "#77e39a" : "#56605a"}
              strokeWidth="2"
            />
            <text x={i * 112 + 55} y="77" textAnchor="middle" fill="var(--ink)" fontSize="17">
              {entry}
            </text>
          </g>
        ))}
      </svg>
    );
  }
  if (visual.type === "balance")
    return (
      <svg className="check-visual" viewBox="0 0 500 190" role="img" aria-labelledby={titleId}>
        <title id={titleId}>
          {visual.left} equals {visual.right}
        </title>
        <path
          d="M250 82v82m-40 0h80M84 80h332"
          stroke="#7b9e86"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path d="M110 80v48m280-48v48" stroke="#52675a" strokeWidth="3" />
        <path
          d="M34 124q76 70 152 0ZM314 124q76 70 152 0Z"
          fill="#294434"
          stroke="#7ccc97"
          strokeWidth="2"
        />
        <rect x="25" y="13" width="170" height="53" rx="12" fill="#242a26" />
        <rect x="305" y="13" width="170" height="53" rx="12" fill="#242a26" />
        <text x="110" y="47" textAnchor="middle" fill="var(--ink)" fontSize="23">
          {visual.left}
        </text>
        <text x="390" y="47" textAnchor="middle" fill="var(--ink)" fontSize="23">
          {visual.right}
        </text>
        <text x="250" y="49" textAnchor="middle" fill="#83e6a3" fontSize="28">
          =
        </text>
      </svg>
    );
  const xy = (n: number) => 200 + n * 16;
  const ticks = Array.from({ length: 21 }, (_, i) => i - 10);
  const [a, b] = visual.points;
  return (
    <figure className="check-coordinate-figure">
      <svg
        className="check-visual check-coordinates"
        viewBox="0 0 400 400"
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>
          Coordinate grid.{" "}
          {visual.points.map((p) => p.label + " = (" + p.x + ", " + p.y + ")").join("; ")}
        </title>
        {ticks.map((n) => (
          <g key={n}>
            <path
              d={"M" + xy(n) + " 40v320M40 " + xy(n) + "h320"}
              stroke={n === 0 ? "#a1b1a5" : "#303c33"}
              strokeWidth={n === 0 ? 2 : 1}
            />
            {n !== 0 && n % 2 === 0 ? (
              <>
                <text x={xy(n)} y="216" textAnchor="middle" fontSize="11" fill="#a7b3a9">
                  {n}
                </text>
                <text x="184" y={xy(-n) + 4} textAnchor="end" fontSize="11" fill="#a7b3a9">
                  {n}
                </text>
              </>
            ) : null}
          </g>
        ))}
        {visual.connect && a && b ? (
          <line
            x1={xy(a.x)}
            y1={xy(-a.y)}
            x2={xy(b.x)}
            y2={xy(-b.y)}
            stroke="#7de99f"
            strokeWidth="3"
          />
        ) : null}
        {visual.points.map((p) => (
          <g key={p.label}>
            <circle cx={xy(p.x)} cy={xy(-p.y)} r="6" fill="#f3cf56" />
            <text x={xy(p.x) + 9} y={xy(-p.y) - 10} fill="var(--ink)" fontSize="14">
              {p.label}
            </text>
          </g>
        ))}
        <text x="375" y="204" fill="var(--ink)">
          x
        </text>
        <text x="195" y="25" fill="var(--ink)">
          y
        </text>
      </svg>
      <figcaption className="sr-only">
        {visual.points.map((p) => p.label + " = (" + p.x + ", " + p.y + ")").join(" · ")}
      </figcaption>
    </figure>
  );
}
