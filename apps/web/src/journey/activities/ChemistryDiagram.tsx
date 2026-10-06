import { useId, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { ChemistryDiagram as Spec, ChemistryModel, ChemicalSpecies } from "@discere/contracts";
import {
  speciesAtoms,
  chemicalEntity,
  elements,
  shellCounts,
  chemistryGivens,
  chemistryResults,
  chemicalLabel,
  ionCharges,
  signed,
  lewisData,
  reactions,
  batchResult,
} from "@discere/activity-engine";
const colours: Record<string, string> = {
  H: "var(--chem-atom-hydrogen)",
  C: "#7890b4",
  N: "#84a5ff",
  O: "#f58b8b",
  Na: "#d5a4fa",
  Mg: "#80d5b7",
  Al: "#c5c5dd",
  Cl: "#c5db69",
  Ca: "#f1c279",
};
const positions = (count: number) => Array.from({ length: count }, (_, position) => position);
function Atom({ element, x, y, r = 16 }: { element: string; x: number; y: number; r?: number }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        style={{ fill: colours[element] || "#93aff3", stroke: "var(--chem-atom-rim)" }}
        strokeWidth="1"
      />
      <text
        x={x}
        y={y + 5}
        textAnchor="middle"
        className="chem-atom-label"
        fontSize={r < 14 ? 10 : 15}
        fontWeight="700"
      >
        {element}
      </text>
    </g>
  );
}
function Particle({
  species,
  x,
  y,
  scale = 1,
}: {
  species: ChemicalSpecies;
  x: number;
  y: number;
  scale?: number;
}) {
  const atoms = Object.entries(speciesAtoms[species]).flatMap(([e, n]) =>
    Array.from({ length: n }, (_, i) => ({ e, key: e + i })),
  );
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      {atoms.map((a, i) => (
        <Atom
          key={a.key}
          element={a.e}
          x={((i % 3) - 1) * 31}
          y={Math.floor(i / 3) * 30 - 15}
          r={14}
        />
      ))}
    </g>
  );
}
export function ChemistryDrawing({
  model: m,
  progress = 0,
  dots = false,
  shells = true,
}: {
  model: ChemistryModel;
  progress?: number;
  dots?: boolean;
  shells?: boolean;
}) {
  const id = useId();
  let drawing: React.ReactNode;
  if (m.kind === "atom") {
    const counts = shellCounts(m.electrons);
    drawing = (
      <>
        <circle cx="190" cy="120" r="27" fill="#415879" />
        <text x="190" y="126" textAnchor="middle" className="chem-symbol">
          {elements[m.protons]}
        </text>
        {counts.map((count, s) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
          <g key={s}>
            {shells && count > 0 && (
              <circle cx="190" cy="120" r={48 + s * 30} className="chem-shell" />
            )}
            {positions(count).map((i) => {
              const a = (i / Math.max(count, 1)) * Math.PI * 2;
              return (
                <circle
                  key={i}
                  cx={190 + (48 + s * 30) * Math.cos(a)}
                  cy={120 + (48 + s * 30) * Math.sin(a)}
                  r="5"
                  fill="#ffd269"
                />
              );
            })}
          </g>
        ))}
        <text x="365" y="83" className="chem-label">
          {m.protons} protons
        </text>
        <text x="365" y="122" className="chem-label">
          {m.neutrons} neutrons
        </text>
        <text x="365" y="161" className="chem-label">
          {m.electrons} electrons
        </text>
      </>
    );
  } else if (m.kind === "formula") {
    drawing = (
      <>
        {Array.from({ length: m.copies }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
          <g key={i}>
            <rect
              x={60 + (i % 3) * 165}
              y={25 + Math.floor(i / 3) * 108}
              width="150"
              height="93"
              rx="16"
              className="chem-unit"
            />
            <Particle
              species={m.species}
              x={135 + (i % 3) * 165}
              y={67 + Math.floor(i / 3) * 108}
            />
          </g>
        ))}
      </>
    );
  } else if (m.kind === "ionic") {
    drawing = (
      <>
        {[
          [m.cation, m.positive, 185],
          [m.anion, m.negative, 405],
        ].map(([element, count, x]) => (
          <g key={element}>
            {Array.from({ length: Number(count) }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
              <g key={i}>
                <Atom element={String(element)} x={Number(x)} y={35 + i * 53} r={19} />
                <text x={Number(x) + 27} y={40 + i * 53} className="chem-label">
                  {signed(ionCharges[String(element)]!)}
                </text>
              </g>
            ))}
          </g>
        ))}
      </>
    );
  } else if (m.kind === "lewis") {
    const d = lewisData[m.species],
      coords =
        d.atoms.length === 2
          ? [
              [225, 120],
              [375, 120],
            ]
          : m.species === "H2O"
            ? [
                [300, 80],
                [205, 170],
                [395, 170],
              ]
            : m.species === "NH3"
              ? [
                  [300, 95],
                  [190, 165],
                  [300, 205],
                  [410, 165],
                ]
              : [
                  [300, 120],
                  [195, 120],
                  [405, 120],
                  [300, 32],
                  [300, 208],
                ];
    drawing = (
      <>
        {d.bonds.map(([a, b, n], i) => {
          const A = coords[a]!,
            B = coords[b]!,
            dx = B[0]! - A[0]!,
            dy = B[1]! - A[1]!,
            len = Math.hypot(dx, dy),
            px = -dy / len,
            py = dx / len;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
            <g key={i}>
              {positions(n).map((j) => {
                const offset = (j - (n - 1) / 2) * 8;
                return dots ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
                  <g key={j}>
                    {[-1, 1].map((k) => (
                      <circle
                        key={k}
                        cx={(A[0]! + B[0]!) / 2 + px * offset + (dx / len) * k * 6}
                        cy={(A[1]! + B[1]!) / 2 + py * offset + (dy / len) * k * 6}
                        r="3"
                        fill="#ffd269"
                      />
                    ))}
                  </g>
                ) : (
                  <line
                    key={j}
                    x1={A[0]! + (dx / len) * 24 + px * offset}
                    y1={A[1]! + (dy / len) * 24 + py * offset}
                    x2={B[0]! - (dx / len) * 24 + px * offset}
                    y2={B[1]! - (dy / len) * 24 + py * offset}
                    stroke="#ffd269"
                    strokeWidth="3"
                  />
                );
              })}
            </g>
          );
        })}
        {d.atoms.map((e, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
          <g key={i}>
            <Atom element={e} x={coords[i]![0]!} y={coords[i]![1]!} r={21} />
            {positions(d.lonePairs[i]!).map((p) =>
              [-1, 1].map((k) => (
                <circle
                  key={p + ":" + k}
                  cx={coords[i]![0]! + k * 5}
                  cy={coords[i]![1]! + (p === 0 ? -33 : 33)}
                  r="3"
                  fill="#8eafff"
                />
              )),
            )}
          </g>
        ))}
      </>
    );
  } else if (m.kind === "amount") {
    drawing = (
      <>
        <path
          d="M 100 38 V 211 Q 100 224 116 224 H 484 Q 500 224 500 211 V 38"
          fill="#253840"
          stroke="#8eb4c7"
          strokeWidth="3"
        />
        {positions(Math.round(m.moles * 4)).map((i) => (
          <rect
            key={i}
            x={119 + (i % 12) * 29}
            y={183 - Math.floor(i / 12) * 50}
            width="23"
            height="34"
            rx="5"
            fill="#74caaa"
          />
        ))}
        <text x="300" y="72" textAnchor="middle" className="chem-symbol">
          {chemicalLabel(m.species)}
        </text>
        <text x="300" y="103" textAnchor="middle" className="chem-label">
          Each block represents 0.25 mol
        </text>
      </>
    );
  } else if (m.kind === "reaction") {
    const r = reactions[m.reaction],
      all = [...r.left, ...r.right],
      gap = 540 / all.length;
    drawing = (
      <>
        {all.map((s, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
          <g key={s}>
            <text x={45 + gap * (i + 0.5)} y="42" textAnchor="middle" className="chem-label">
              {i < 2 ? "Reactant" : "Product"}
            </text>
            {positions(m.coefficients[i]!).map((position) => (
              <g className="chem-reaction-unit" key={position}>
                <Particle
                  species={s}
                  x={
                    45 +
                    gap * (i + 0.5) +
                    (m.coefficients[i] === 1 ? 0 : position % 2 === 0 ? -29 : 29)
                  }
                  y={73 + Math.floor(position / 2) * 43}
                  scale={0.65}
                />
              </g>
            ))}
            <text x={45 + gap * (i + 0.5)} y="195" textAnchor="middle" className="chem-symbol">
              {m.coefficients[i]} {chemicalLabel(s)}
            </text>
          </g>
        ))}
        <line x1={45 + gap * 2 - 5} x2={45 + gap * 2 - 5} y1="30" y2="210" className="chem-shell" />
      </>
    );
  } else {
    const r = reactions[m.reaction],
      v = batchResult(m.reaction, m.supplies),
      all = [...r.left, ...r.right],
      values = [
        ...m.supplies.map((n, i) => n - (n - v.leftovers[i]!) * progress),
        ...v.products.map((n) => n * progress),
      ];
    drawing = (
      <>
        {all.map((s, i) => {
          const x = 65 + i * (480 / all.length),
            height = (values[i]! / 12) * 135;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
            <g key={s}>
              <rect x={x} y="35" width="85" height="145" rx="8" className="chem-unit" />
              <rect
                x={x + 8}
                y={174 - height}
                width="69"
                height={height}
                rx="4"
                fill={i < 2 ? "#91b6ff" : "#73dca6"}
              />
              <text x={x + 42} y="208" textAnchor="middle" className="chem-label">
                {chemicalLabel(s)}
              </text>
            </g>
          );
        })}
        <text x="300" y="24" textAnchor="middle" className="chem-label">
          Common scale: 0 to 12 mol
        </text>
      </>
    );
  }
  return (
    <svg className="chemistry-drawing" viewBox="0 0 600 240" role="img" aria-labelledby={id}>
      <title id={id}>{chemistryGivens(m)}</title>
      {drawing}
    </svg>
  );
}
export function ChemistryGivenVisual({ model }: { model: ChemistryModel }) {
  return (
    <div className="chemistry-check">
      <p className="chem-givens">{chemistryGivens(model)}</p>
      <ChemistryDrawing model={model} />
    </div>
  );
}
export function ChemistryDiagram({
  spec,
  showResults = false,
}: {
  spec: Spec;
  showResults?: boolean;
}) {
  const [selected, setSelected] = useState(spec.initialCaseId),
    [delta, setDelta] = useState(0),
    [index, setIndex] = useState(0),
    [dots, setDots] = useState(false),
    [overrides, setOverrides] = useState<number[] | null>(null),
    id = useId();
  const base = spec.cases.find((c) => c.id === selected)!.model;
  let m: ChemistryModel = base,
    min = 0,
    max = 1,
    step = 1,
    label = "";
  if (base.kind === "formula") {
    m = { ...base, copies: base.copies + delta };
    min = 1 - base.copies;
    max = 6 - base.copies;
    label = "Number of " + chemicalEntity(base.species) + "s";
  }
  if (base.kind === "ionic") {
    m = { ...base, negative: base.negative + delta };
    min = 1 - base.negative;
    max = 4 - base.negative;
    label = "Negative ions";
  }
  if (base.kind === "amount") {
    m = { ...base, moles: base.moles + delta };
    min = 0.25 - base.moles;
    max = 6 - base.moles;
    step = 0.25;
    label = "Amount in mol";
  }
  if (base.kind === "reaction") {
    const coefficients = overrides ?? base.coefficients;
    m = { ...base, coefficients };
    min = 1 - base.coefficients[index]!;
    max = 6 - base.coefficients[index]!;
    label =
      "Coefficient of " +
      chemicalLabel([...reactions[base.reaction].left, ...reactions[base.reaction].right][index]!);
  }
  if (base.kind === "batch") {
    max = 100;
    label = "Reaction progress";
  }
  const reset = () => {
    setDelta(0);
    setIndex(0);
    setDots(false);
    setOverrides(null);
  };
  return (
    <div className="learning-diagram chemistry-diagram">
      <div className="chem-cases" role="group" aria-label="Compare chemistry cases">
        {spec.cases.map((c) => (
          <button
            type="button"
            key={c.id}
            aria-pressed={c.id === selected}
            onClick={() => {
              setSelected(c.id);
              reset();
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      {m.kind !== "atom" && <p className="chem-givens">{chemistryGivens(m)}</p>}
      <ChemistryDrawing model={m} dots={dots} shells={!dots} progress={delta / 100} />
      {base.kind === "reaction" && (
        <div className="chem-coefficients" role="group" aria-label="Choose a coefficient">
          {[...reactions[base.reaction].left, ...reactions[base.reaction].right].map((s, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed SVG marks have indexed positions and no reordered component state.
            <button
              type="button"
              key={s}
              aria-pressed={index === i}
              onClick={() => {
                setIndex(i);
                setDelta((overrides ?? base.coefficients)[i]! - base.coefficients[i]!);
              }}
            >
              {chemicalLabel(s)}
            </button>
          ))}
        </div>
      )}
      <div className="chem-tools">
        {label ? (
          <label htmlFor={id}>
            {label}
            <input
              id={id}
              type="range"
              aria-label={label}
              min={min}
              max={max}
              step={step}
              value={delta}
              onChange={(e) => {
                const next = Number(e.currentTarget.value);
                setDelta(next);
                if (base.kind === "reaction") {
                  const values = [...(overrides ?? base.coefficients)];
                  values[index] = base.coefficients[index]! + next;
                  setOverrides(values);
                }
              }}
            />
          </label>
        ) : (
          <button type="button" aria-pressed={dots} onClick={() => setDots(!dots)}>
            {base.kind === "atom" ? "Hide shell guides" : "Show shared electron dots"}
          </button>
        )}
        <button type="button" aria-label="Reset chemistry model" onClick={reset}>
          <RotateCcw size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="chem-legend">
        {base.kind === "atom"
          ? "Shell groups are a counting model, not electron orbits."
          : base.kind === "lewis"
            ? "Gold: shared pairs · Blue dots: lone pairs · Layout is schematic."
            : base.kind === "formula"
              ? "Each outlined group represents one " + chemicalEntity(base.species) + "."
              : base.kind === "batch"
                ? "Ideal complete reaction; amounts are moles, not individual particles."
                : base.kind === "reaction"
                  ? "Change coefficients; the substances keep their formulas."
                  : base.kind === "ionic"
                    ? "An ionic formula describes a neutral ratio in a lattice."
                    : "Blocks represent equal amounts, not individual molecules."}
      </p>
      {showResults && (
        <div className="chem-results" aria-label="Chemistry results">
          {chemistryResults(m).map((r) => (
            <p key={r}>{r}</p>
          ))}
        </div>
      )}
    </div>
  );
}
